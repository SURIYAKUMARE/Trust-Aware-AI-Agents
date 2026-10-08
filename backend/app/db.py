import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Float, Integer, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

Base = declarative_base()

class RequestLog(Base):
    __tablename__ = "request_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trace_id = Column(String(64), index=True)
    query = Column(Text, nullable=False)
    initial_confidence = Column(Float, nullable=False)
    final_confidence = Column(Float, nullable=False)
    final_route = Column(String(32), nullable=False)
    answer = Column(Text, nullable=False)
    ground_truth = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    cost_usd = Column(Float, default=0.0)
    latency_ms = Column(Float, default=0.0)
    tools_used = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class EscalationQueue(Base):
    __tablename__ = "escalation_queue"

    id = Column(String(64), primary_key=True)
    trace_id = Column(String(64), index=True)
    query = Column(Text, nullable=False)
    proposed_action = Column(Text, nullable=False)
    risk_category = Column(String(64), nullable=False)
    confidence_score = Column(Float, nullable=False)
    status = Column(String(32), default="PENDING")  # PENDING, APPROVED, REJECTED, EDITED
    human_note = Column(Text, nullable=True)
    edited_action = Column(Text, nullable=True)
    created_at = Column(String(64), nullable=False)
    resolved_at = Column(String(64), nullable=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

init_db()
