import asyncio
import json
import random
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session as DBSession

from .models import Event, ScoreHistory, Session


PERSONAS = {
    "typical_customer": {
        "events": [
            ("login", {"method": "password", "device": "known"}),
            ("navigate_account", {}),
            ("check_balance", {}),
            ("view_transactions", {}),
            ("logout", {}),
        ],
        "risk_profile": "low",
    },
    "credential_stuffer": {
        "events": [
            ("login_attempt", {"method": "password", "device": "unknown", "failed": True}),
            ("login_attempt", {"method": "password", "device": "unknown", "failed": True}),
            ("login_attempt", {"method": "password", "device": "unknown", "failed": False}),
            ("navigate_account", {}),
            ("change_password", {}),
        ],
        "risk_profile": "high",
    },
    "account_takeover": {
        "events": [
            ("login", {"method": "otp", "device": "new_device"}),
            ("change_phone_number", {}),
            ("add_beneficiary", {"type": "high_risk"}),
            ("transfer_funds", {"amount": 95000, "to": "new_beneficiary"}),
            ("logout", {}),
        ],
        "risk_profile": "critical",
    },
    "mule_account": {
        "events": [
            ("login", {"method": "biometric", "device": "known"}),
            ("deposit", {"amount": 48000, "method": "neft"}),
            ("deposit", {"amount": 49000, "method": "imps"}),
            ("transfer_funds", {"amount": 96000, "to": "external"}),
            ("transfer_funds", {"amount": 1000, "to": "external"}),
        ],
        "risk_profile": "high",
    },
}

CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad"]
DEVICES = ["iPhone 15", "Samsung S24", "OnePlus 12", "Pixel 8", "Unknown Device"]
IPS = [f"103.21.{random.randint(1,255)}.{random.randint(1,255)}" for _ in range(20)]


def _random_persona() -> str:
    weights = [0.5, 0.2, 0.2, 0.1]
    return random.choices(list(PERSONAS.keys()), weights=weights, k=1)[0]


def _create_session(db: DBSession, persona: str | None = None) -> Session:
    persona = persona or _random_persona()
    session = Session(
        id=str(uuid.uuid4()),
        user_id=str(uuid.uuid4()),
        persona=persona,
        trust_score=85.0 if persona == "typical_customer" else random.uniform(60, 80),
        device_fingerprint=random.choice(DEVICES),
        ip_address=random.choice(IPS),
        geo_location=random.choice(CITIES),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _generate_event_for_session(db: DBSession, session: Session) -> Event | None:
    persona_data = PERSONAS.get(session.persona, PERSONAS["typical_customer"])
    existing_events = db.query(Event).filter(Event.session_id == session.id).count()

    if existing_events >= len(persona_data["events"]):
        return None

    event_type, payload = persona_data["events"][existing_events]

    risk_deltas = {
        "login": -2,
        "login_attempt": 8 if payload.get("failed") else -3,
        "navigate_account": -1,
        "check_balance": 0,
        "view_transactions": 0,
        "change_phone_number": 25,
        "change_password": 15,
        "add_beneficiary": 20,
        "transfer_funds": 30 if payload.get("amount", 0) > 50000 else 10,
        "deposit": -5,
        "logout": -3,
    }

    delta = risk_deltas.get(event_type, 0)
    jitter = random.uniform(-3, 3)
    delta += jitter

    event = Event(
        session_id=session.id,
        event_type=event_type,
        payload=json.dumps(payload),
        risk_delta=round(delta, 2),
    )
    db.add(event)

    new_score = max(0, min(100, session.trust_score - delta))
    session.trust_score = round(new_score, 2)

    if new_score <= 20:
        session.status = "blocked"
    elif new_score <= 50:
        session.status = "step_up"
    else:
        session.status = "safe"

    score_record = ScoreHistory(
        session_id=session.id,
        score=session.trust_score,
        anomaly_score=round(random.uniform(0.1, 0.9), 4),
        rf_probability=round(random.uniform(0.05, 0.95), 4),
        xgb_probability=round(random.uniform(0.05, 0.95), 4),
        shap_values=json.dumps({
            event_type: round(-delta, 2),
            "device_change": round(random.uniform(-10, 5), 2),
            "geo_velocity": round(random.uniform(-15, 5), 2),
            "typing_pattern": round(random.uniform(-5, 10), 2),
        }),
    )
    db.add(score_record)
    db.commit()
    return event


def generate_initial_sessions(db: DBSession, count: int = 8):
    for _ in range(count):
        session = _create_session(db)
        event_count = random.randint(1, 4)
        for _ in range(event_count):
            _generate_event_for_session(db, session)


def step_session(db: DBSession, session_id: str, event_type: str, payload: dict | None = None) -> Event | None:
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        return None

    payload = payload or {}
    risk_deltas = {
        "login": -2,
        "login_attempt": 8 if payload.get("failed") else -3,
        "navigate_account": -1,
        "check_balance": 0,
        "view_transactions": 0,
        "change_phone_number": 25,
        "change_password": 15,
        "add_beneficiary": 20,
        "transfer_funds": 30 if payload.get("amount", 0) > 50000 else 10,
        "deposit": -5,
        "logout": -3,
        "verify_otp": -20,
        "resolve_step_up": -30,
    }

    delta = risk_deltas.get(event_type, 0)
    event = Event(
        session_id=session.id,
        event_type=event_type,
        payload=json.dumps(payload),
        risk_delta=round(delta, 2),
    )
    db.add(event)

    new_score = max(0, min(100, session.trust_score - delta))
    session.trust_score = round(new_score, 2)

    if new_score <= 20:
        session.status = "blocked"
    elif new_score <= 50:
        session.status = "step_up"
    else:
        session.status = "safe"

    score_record = ScoreHistory(
        session_id=session.id,
        score=session.trust_score,
        anomaly_score=round(random.uniform(0.1, 0.9), 4),
        rf_probability=round(random.uniform(0.05, 0.95), 4),
        xgb_probability=round(random.uniform(0.05, 0.95), 4),
        shap_values=json.dumps({
            event_type: round(-delta, 2),
            "device_change": round(random.uniform(-10, 5), 2),
            "geo_velocity": round(random.uniform(-15, 5), 2),
            "typing_pattern": round(random.uniform(-5, 10), 2),
        }),
    )
    db.add(score_record)
    db.commit()
    db.refresh(event)
    return event


async def auto_generate_loop(db_factory, interval: float = 3.0, max_sessions: int = 50):
    while True:
        await asyncio.sleep(interval)
        db = db_factory()
        try:
            active_count = db.query(Session).filter(Session.status != "blocked").count()
            if active_count < max_sessions:
                session = _create_session(db)
                event_count = random.randint(1, 3)
                for _ in range(event_count):
                    _generate_event_for_session(db, session)

            safe_sessions = db.query(Session).filter(Session.status == "safe").all()
            for s in safe_sessions[:3]:
                if random.random() < 0.3:
                    _generate_event_for_session(db, s)
        except Exception:
            db.rollback()
        finally:
            db.close()
