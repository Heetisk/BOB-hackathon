import json
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False


FEATURE_COLUMNS = [
    "event_count",
    "avg_risk_delta",
    "max_risk_delta",
    "device_changes",
    "geo_changes",
    "failed_logins",
    "high_value_transfers",
    "beneficiary_adds",
    "session_duration_sec",
    "typing_speed_std",
    "time_between_actions_std",
]


class TrustEngine:
    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_forest = IsolationForest(
            n_estimators=100,
            contamination=0.15,
            random_state=42,
        )
        self.rf_classifier = RandomForestClassifier(
            n_estimators=100,
            random_state=42,
        )
        self.xgb_classifier = None
        if HAS_XGB:
            self.xgb_classifier = xgb.XGBClassifier(
                n_estimators=100,
                eval_metric="logloss",
                random_state=42,
            )
        self.shap_explainer = None
        self._trained = False
        self._train_initial()

    def _train_initial(self):
        np.random.seed(42)
        n_samples = 500

        X_safe = np.column_stack([
            np.random.poisson(3, n_samples),
            np.random.uniform(-5, 0, n_samples),
            np.random.uniform(-10, 0, n_samples),
            np.random.poisson(0, n_samples),
            np.random.poisson(0, n_samples),
            np.random.poisson(0, n_samples),
            np.random.poisson(0, n_samples),
            np.random.poisson(0, n_samples),
            np.random.uniform(30, 300, n_samples),
            np.random.uniform(0, 5, n_samples),
            np.random.uniform(0, 10, n_samples),
        ])

        X_risky = np.column_stack([
            np.random.poisson(7, n_samples),
            np.random.uniform(5, 25, n_samples),
            np.random.uniform(15, 40, n_samples),
            np.random.poisson(2, n_samples),
            np.random.poisson(2, n_samples),
            np.random.poisson(3, n_samples),
            np.random.poisson(1, n_samples),
            np.random.poisson(1, n_samples),
            np.random.uniform(10, 120, n_samples),
            np.random.uniform(10, 50, n_samples),
            np.random.uniform(20, 100, n_samples),
        ])

        X = np.vstack([X_safe, X_risky])
        y = np.array([0] * n_samples + [1] * n_samples)

        X_scaled = self.scaler.fit_transform(X)
        self.isolation_forest.fit(X_scaled)
        self.rf_classifier.fit(X_scaled, y)

        if self.xgb_classifier is not None:
            self.xgb_classifier.fit(X_scaled, y)

        if HAS_SHAP:
            try:
                self.shap_explainer = shap.TreeExplainer(self.rf_classifier)
            except Exception:
                self.shap_explainer = None

        self._trained = True

    def _extract_features(self, events: list[dict]) -> np.ndarray:
        if not events:
            return np.zeros((1, len(FEATURE_COLUMNS)))

        risk_deltas = [e.get("risk_delta", 0) for e in events]
        payload_data = []
        for e in events:
            try:
                p = json.loads(e.get("payload", "{}") or "{}")
            except (json.JSONDecodeError, TypeError):
                p = {}
            payload_data.append(p)

        device_changes = sum(1 for p in payload_data if p.get("device") in ("new_device", "unknown"))
        geo_changes = sum(1 for p in payload_data if p.get("geo_change"))
        failed_logins = sum(1 for e in events if e.get("event_type") == "login_attempt" and any(
            json.loads(e.get("payload", "{}") or "{}").get("failed") for _ in [1]
        ))
        high_value_transfers = sum(1 for p in payload_data if p.get("amount", 0) > 50000)
        beneficiary_adds = sum(1 for e in events if e.get("event_type") == "add_beneficiary")

        features = np.array([[
            len(events),
            np.mean(risk_deltas) if risk_deltas else 0,
            max(risk_deltas) if risk_deltas else 0,
            device_changes,
            geo_changes,
            failed_logins,
            high_value_transfers,
            beneficiary_adds,
            np.random.uniform(30, 300),
            np.random.uniform(0, 5),
            np.random.uniform(0, 10),
        ]])
        return features

    def score(self, events: list[dict]) -> dict:
        if not self._trained:
            return self._default_score()

        features = self._extract_features(events)
        features_scaled = self.scaler.transform(features)

        anomaly_raw = self.isolation_forest.decision_function(features_scaled)[0]
        anomaly_score = float(np.clip(50 - anomaly_raw * 20, 0, 100))

        rf_prob = float(self.rf_classifier.predict_proba(features_scaled)[0][1])

        xgb_prob = rf_prob
        if self.xgb_classifier is not None:
            try:
                xgb_prob = float(self.xgb_classifier.predict_proba(features_scaled)[0][1])
            except Exception:
                xgb_prob = rf_prob

        trust_score = self._calibrate(anomaly_score, rf_prob, xgb_prob)

        shap_values = {}
        if self.shap_explainer is not None:
            try:
                shap_vals = self.shap_explainer.shap_values(features_scaled)
                if isinstance(shap_vals, list):
                    vals = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
                else:
                    vals = shap_vals[0]
                for fname, fval in zip(FEATURE_COLUMNS, vals):
                    shap_values[fname] = round(float(fval), 4)
            except Exception:
                pass

        return {
            "trust_score": round(trust_score, 2),
            "anomaly_score": round(anomaly_score, 4),
            "rf_probability": round(rf_prob, 4),
            "xgb_probability": round(xgb_prob, 4),
            "shap_values": json.dumps(shap_values),
        }

    def _calibrate(self, anomaly: float, rf_prob: float, xgb_prob: float) -> float:
        risk = (anomaly * 0.3 + rf_prob * 50 * 0.4 + xgb_prob * 50 * 0.3)
        trust = max(0, min(100, 100 - risk))
        return trust

    def _default_score(self) -> dict:
        return {
            "trust_score": 50.0,
            "anomaly_score": 0.5,
            "rf_probability": 0.5,
            "xgb_probability": 0.5,
            "shap_values": json.dumps({}),
        }

    def get_status(self, trust_score: float) -> str:
        if trust_score <= 20:
            return "blocked"
        elif trust_score <= 50:
            return "step_up"
        return "safe"

    def get_action(self, status: str) -> str:
        actions = {
            "safe": "allow",
            "step_up": "require_otp",
            "blocked": "block_and_alert",
        }
        return actions.get(status, "allow")


trust_engine = TrustEngine()
