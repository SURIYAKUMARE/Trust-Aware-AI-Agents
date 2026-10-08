import json
import logging
from typing import Optional
from app.db import SessionLocal, RequestLog, EscalationQueue
from app.schemas import DecisionTrace, EscalationItem

logger = logging.getLogger(__name__)

class MonitorLogger:
    """Persists decision traces and escalations to the SQLite database."""

    @staticmethod
    def log_decision_trace(trace: DecisionTrace, is_correct: Optional[bool] = None, ground_truth: Optional[str] = None):
        session = SessionLocal()
        try:
            tools_str = ",".join(trace.tools_used)
            log_entry = RequestLog(
                trace_id=trace.trace_id,
                query=trace.query,
                initial_confidence=trace.initial_confidence,
                final_confidence=trace.final_confidence,
                final_route=trace.final_route.value,
                answer=trace.answer,
                ground_truth=ground_truth,
                is_correct=is_correct,
                cost_usd=trace.cost_usd,
                latency_ms=trace.latency_ms,
                tools_used=tools_str,
            )
            session.add(log_entry)

            # If escalated, ensure it is mirrored in EscalationQueue table
            if trace.escalation_id and trace.requires_human_approval:
                esc_existing = session.query(EscalationQueue).filter_by(id=trace.escalation_id).first()
                if not esc_existing:
                    queue_item = EscalationQueue(
                        id=trace.escalation_id,
                        trace_id=trace.trace_id,
                        query=trace.query,
                        proposed_action=f"Execute: {trace.query}",
                        risk_category="high_stakes_operation",
                        confidence_score=trace.final_confidence,
                        status="PENDING",
                        created_at=trace.steps[0].thought[:30] if trace.steps else "",
                    )
                    session.add(queue_item)

            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to log decision trace {trace.trace_id}: {e}")
        finally:
            session.close()

    @staticmethod
    def resolve_escalation(escalation_id: str, action: str, human_note: Optional[str] = None, edited_action: Optional[str] = None):
        session = SessionLocal()
        try:
            item = session.query(EscalationQueue).filter_by(id=escalation_id).first()
            if item:
                item.status = action.upper()
                item.human_note = human_note
                item.edited_action = edited_action
                from datetime import datetime
                item.resolved_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to resolve escalation {escalation_id}: {e}")
            return False
        finally:
            session.close()

monitor_logger = MonitorLogger()
