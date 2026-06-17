import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), default=lambda: str(uuid.uuid4()))
    persona = Column(String(50), nullable=False, default="typical_customer")
    status = Column(String(20), nullable=False, default="safe")
    trust_score = Column(Float, nullable=False, default=85.0)
    device_fingerprint = Column(String(128), nullable=True)
    ip_address = Column(String(45), nullable=True)
    geo_location = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    events = relationship("Event", back_populates="session", cascade="all, delete-orphan")
    scores = relationship("ScoreHistory", back_populates="session", cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    payload = Column(Text, nullable=True)
    risk_delta = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("Session", back_populates="events")


class ScoreHistory(Base):
    __tablename__ = "score_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), ForeignKey("sessions.id"), nullable=False)
    score = Column(Float, nullable=False)
    anomaly_score = Column(Float, nullable=True)
    rf_probability = Column(Float, nullable=True)
    xgb_probability = Column(Float, nullable=True)
    shap_values = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    session = relationship("Session", back_populates="scores")
