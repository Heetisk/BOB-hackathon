from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventCreate(BaseModel):
    event_type: str
    payload: Optional[str] = None


class EventResponse(BaseModel):
    id: int
    event_type: str
    payload: Optional[str]
    risk_delta: float
    timestamp: datetime

    model_config = {"from_attributes": True}


class ScoreResponse(BaseModel):
    trust_score: float
    status: str
    anomaly_score: Optional[float]
    rf_probability: Optional[float]
    xgb_probability: Optional[float]
    shap_values: Optional[str]
    action: str


class SessionResponse(BaseModel):
    id: str
    user_id: str
    persona: str
    status: str
    trust_score: float
    device_fingerprint: Optional[str]
    ip_address: Optional[str]
    geo_location: Optional[str]
    created_at: datetime
    updated_at: datetime
    event_count: int = 0

    model_config = {"from_attributes": True}


class SessionDetailResponse(SessionResponse):
    events: list[EventResponse] = []
    score_history: list[dict] = []


class SimulateActionRequest(BaseModel):
    event_type: str
    payload: Optional[str] = None


class ResolveRequest(BaseModel):
    resolution: str
