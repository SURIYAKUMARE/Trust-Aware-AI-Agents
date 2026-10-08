from typing import Tuple, Dict, Any
from app.config import settings
from app.schemas import ActionRoute, ConfidenceReport, ConfidenceLevel, UncertaintyType

class DecisionRouter:
    """Automated decision routing based on calibrated confidence thresholds,
    diagnosed uncertainty types, and high-stakes risk classifications.
    
    Routing Matrix:
    - HIGH (>=0.85): ANSWER directly
    - MEDIUM (0.65-0.85): VERIFY with precision tool (calculator/python/search/RAG), then re-score
    - LOW (0.45-0.65):
        - If uncertainty == AMBIGUITY -> CLARIFY (ask ONE targeted question)
        - If uncertainty == KNOWLEDGE_GAP -> SEARCH (web/KB search)
        - Else -> VERIFY
    - VERY_LOW (0.30-0.45): HANDOFF to domain specialist agent
    - <0.30:
        - If high stakes or critical request -> ESCALATE to human
        - Else -> ABSTAIN honestly
    - Critical Risk Override: ALWAYS ESCALATE regardless of confidence score
    """
    
    def __init__(self):
        self.high_thresh = settings.HIGH_THRESHOLD
        self.med_thresh = settings.MEDIUM_THRESHOLD
        self.low_thresh = settings.LOW_THRESHOLD
        self.very_low_thresh = settings.VERY_LOW_THRESHOLD

    def route(
        self,
        report: ConfidenceReport,
        is_high_stakes: bool = False,
        iteration: int = 1,
    ) -> Tuple[ActionRoute, str]:
        # High-Stakes Override
        if is_high_stakes:
            return ActionRoute.ESCALATE, "High-stakes operational or financial risk mandates human authorization."

        score = report.calibrated_score
        u_type = report.uncertainty_type

        # High Confidence: Answer
        if score >= self.high_thresh:
            return ActionRoute.ANSWER, "Confidence is high (>= 0.85). Direct authoritative answer delivered."

        # Medium Confidence: Verify with tool
        if score >= self.med_thresh:
            return ActionRoute.VERIFY, "Medium confidence (0.65-0.85). Verifying claims and calculations with tools."

        # Low Confidence: Clarify or Search
        if score >= self.low_thresh:
            if u_type == UncertaintyType.AMBIGUITY:
                return ActionRoute.CLARIFY, "Low confidence due to ambiguity. Requesting targeted user clarification."
            elif u_type == UncertaintyType.KNOWLEDGE_GAP:
                return ActionRoute.SEARCH, "Low confidence due to knowledge gap. Initiating external search retrieval."
            else:
                return ActionRoute.VERIFY, "Low confidence. Verifying facts and inference steps."

        # Very Low Confidence: Specialist Handoff
        if score >= self.very_low_thresh:
            return ActionRoute.HANDOFF, "Very low confidence (0.30-0.45). Handing off to domain specialist."

        # Below 0.30: Abstain or Escalate
        if u_type == UncertaintyType.HIGH_STAKES or "refund" in report.plain_explanation.lower():
            return ActionRoute.ESCALATE, "Confidence critically low on sensitive action. Escalating to human reviewer."
        else:
            return ActionRoute.ABSTAIN, "Confidence critically low (< 0.30) with unresolvable gaps. Honest abstention."

decision_router = DecisionRouter()
