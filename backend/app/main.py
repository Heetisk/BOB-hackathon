import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session as DBSession

from .config import settings
from .database import SessionLocal, get_db, init_db
from .engine import trust_engine
from .generator import auto_generate_loop, generate_initial_sessions, step_session
from .models import Event, ScoreHistory, Session
from .schemas import (
    EventCreate,
    EventResponse,
    ResolveRequest,
    ScoreResponse,
    SessionDetailResponse,
    SessionResponse,
    SimulateActionRequest,
)

auto_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global auto_task
    init_db()
    db = SessionLocal()
    try:
        count = db.query(Session).count()
        if count == 0:
            generate_initial_sessions(db, count=8)
    finally:
        db.close()

    auto_task = asyncio.create_task(
        auto_generate_loop(SessionLocal, settings.AUTO_GENERATE_INTERVAL, settings.MAX_SESSIONS)
    )
    yield
    if auto_task:
        auto_task.cancel()


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/sessions")
def list_sessions(db: DBSession = Depends(get_db)):
    sessions = db.query(Session).order_by(Session.updated_at.desc()).all()
    result = []
    for s in sessions:
        event_count = db.query(Event).filter(Event.session_id == s.id).count()
        result.append(SessionResponse(
            id=s.id,
            user_id=s.user_id,
            persona=s.persona,
            status=s.status,
            trust_score=s.trust_score,
            device_fingerprint=s.device_fingerprint,
            ip_address=s.ip_address,
            geo_location=s.geo_location,
            created_at=s.created_at,
            updated_at=s.updated_at,
            event_count=event_count,
        ))
    return result


@app.get("/api/sessions/{session_id}")
def get_session(session_id: str, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    events = db.query(Event).filter(Event.session_id == session_id).order_by(Event.timestamp).all()
    scores = db.query(ScoreHistory).filter(ScoreHistory.session_id == session_id).order_by(ScoreHistory.timestamp).all()

    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        persona=session.persona,
        status=session.status,
        trust_score=session.trust_score,
        device_fingerprint=session.device_fingerprint,
        ip_address=session.ip_address,
        geo_location=session.geo_location,
        created_at=session.created_at,
        updated_at=session.updated_at,
        event_count=len(events),
        events=[EventResponse.model_validate(e) for e in events],
        score_history=[{
            "score": s.score,
            "anomaly_score": s.anomaly_score,
            "rf_probability": s.rf_probability,
            "xgb_probability": s.xgb_probability,
            "shap_values": s.shap_values,
            "timestamp": s.timestamp.isoformat(),
        } for s in scores],
    )


@app.post("/api/sessions/{session_id}/action")
def inject_action(session_id: str, req: SimulateActionRequest, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    event = step_session(db, session_id, req.event_type, json.loads(req.payload) if req.payload else {})
    if not event:
        raise HTTPException(status_code=400, detail="Could not inject event")

    events = db.query(Event).filter(Event.session_id == session_id).order_by(Event.timestamp).all()
    event_dicts = [{"event_type": e.event_type, "payload": e.payload, "risk_delta": e.risk_delta} for e in events]
    engine_result = trust_engine.score(event_dicts)

    session.trust_score = engine_result["trust_score"]
    session.status = trust_engine.get_status(engine_result["trust_score"])
    db.commit()

    return {
        "event": EventResponse.model_validate(event),
        "score": ScoreResponse(
            trust_score=engine_result["trust_score"],
            status=session.status,
            anomaly_score=engine_result["anomaly_score"],
            rf_probability=engine_result["rf_probability"],
            xgb_probability=engine_result["xgb_probability"],
            shap_values=engine_result["shap_values"],
            action=trust_engine.get_action(session.status),
        ),
    }


@app.post("/api/sessions/{session_id}/resolve")
def resolve_session(session_id: str, req: ResolveRequest, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if req.resolution == "otp_verified":
        event = step_session(db, session_id, "verify_otp", {})
        session.trust_score = min(100, session.trust_score + 25)
        session.status = trust_engine.get_status(session.trust_score)
    elif req.resolution == "step_up_resolved":
        event = step_session(db, session_id, "resolve_step_up", {})
        session.trust_score = min(100, session.trust_score + 30)
        session.status = trust_engine.get_status(session.trust_score)
    elif req.resolution == "block":
        session.status = "blocked"
        session.trust_score = 0
        event = step_session(db, session_id, "blocked_by_analyst", {})
    else:
        raise HTTPException(status_code=400, detail="Invalid resolution")

    db.commit()

    return {
        "session_id": session.id,
        "status": session.status,
        "trust_score": session.trust_score,
    }


@app.post("/api/score")
def score_telemetry(events: list[EventCreate], db: DBSession = Depends(get_db)):
    event_dicts = [{"event_type": e.event_type, "payload": e.payload, "risk_delta": 0} for e in events]
    result = trust_engine.score(event_dicts)

    return ScoreResponse(
        trust_score=result["trust_score"],
        status=trust_engine.get_status(result["trust_score"]),
        anomaly_score=result["anomaly_score"],
        rf_probability=result["rf_probability"],
        xgb_probability=result["xgb_probability"],
        shap_values=result["shap_values"],
        action=trust_engine.get_action(trust_engine.get_status(result["trust_score"])),
    )


@app.get("/api/metrics")
def get_metrics(db: DBSession = Depends(get_db)):
    sessions = db.query(Session).all()
    total = len(sessions)
    flagged = sum(1 for s in sessions if s.status in ("step_up", "blocked"))
    blocked = sum(1 for s in sessions if s.status == "blocked")
    avg_score = sum(s.trust_score for s in sessions) / total if total > 0 else 0

    return {
        "total_sessions": total,
        "flagged_sessions": flagged,
        "blocked_sessions": blocked,
        "avg_trust_score": round(avg_score, 2),
    }
