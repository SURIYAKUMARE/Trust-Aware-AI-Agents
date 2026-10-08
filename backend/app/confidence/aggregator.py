from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas import (
    ConfidenceLevel,
    UncertaintyType,
    ScorerSignal,
    ConfidenceReport,
    ClaimVerification,
    SentenceVerification,
)
from app.confidence.calibration import calibrator

class ConfidenceAggregator:
    """Combines 4 independent scorer signals using calibrated weights,
    maps to discrete confidence levels, diagnoses the primary uncertainty type,
    and constructs a unified ConfidenceReport.
    """
    
    def __init__(self):
        self.w_consistency = settings.WEIGHT_CONSISTENCY
        self.w_evidence = settings.WEIGHT_EVIDENCE
        self.w_verbalized = settings.WEIGHT_VERBALIZED
        self.w_reasoning = settings.WEIGHT_REASONING

    def aggregate(
        self,
        signals: List[ScorerSignal],
        claims: Optional[List[ClaimVerification]] = None,
        sentences: Optional[List[SentenceVerification]] = None,
        is_high_stakes: bool = False,
        has_human_verified_evidence: bool = False,
    ) -> ConfidenceReport:
        claims = claims or []
        sentences = sentences or []
        
        # Weighted raw ensemble score
        raw_score = sum(s.score * s.weight for s in signals)
        raw_score = round(max(0.01, min(0.99, raw_score)), 3)

        # Calibrated score using isotonic regression
        calibrated_score = calibrator.calibrate(raw_score)

        # High-stakes action override
        if is_high_stakes:
            calibrated_score = min(calibrated_score, 0.28)

        # Diagnose primary uncertainty type
        uncertainty_type = self._diagnose_uncertainty(signals, is_high_stakes)

        # Categorize discrete confidence level
        if calibrated_score >= settings.HIGH_THRESHOLD:
            level = ConfidenceLevel.HIGH
        elif calibrated_score >= settings.MEDIUM_THRESHOLD:
            level = ConfidenceLevel.MEDIUM
        elif calibrated_score >= settings.LOW_THRESHOLD:
            level = ConfidenceLevel.LOW
        else:
            level = ConfidenceLevel.VERY_LOW

        # Consolidate and rank reasons by severity
        reasons = self._rank_reasons(signals, uncertainty_type, is_high_stakes)

        return ConfidenceReport(
            raw_score=raw_score,
            calibrated_score=calibrated_score,
            level=level,
            uncertainty_type=uncertainty_type,
            signals=signals,
            reasons=reasons,
            claims=claims,
            sentences=sentences,
            plain_explanation="",  # Will be populated by explain.py
            has_human_verified_evidence=has_human_verified_evidence,
        )

    def _diagnose_uncertainty(self, signals: List[ScorerSignal], is_high_stakes: bool) -> UncertaintyType:
        if is_high_stakes:
            return UncertaintyType.HIGH_STAKES

        sig_dict = {s.scorer: s for s in signals}
        verb_details = sig_dict.get("verbalized", ScorerSignal(scorer="v", score=1, weight=0)).details
        evid_details = sig_dict.get("evidence", ScorerSignal(scorer="e", score=1, weight=0)).details
        reas_details = sig_dict.get("reasoning_check", ScorerSignal(scorer="r", score=1, weight=0)).details
        cons_details = sig_dict.get("self_consistency", ScorerSignal(scorer="c", score=1, weight=0)).details

        # Check Ambiguity
        if verb_details.get("ambiguity", 0.0) >= 0.40:
            return UncertaintyType.AMBIGUITY

        # Check Evidence Contradiction / Conflict
        if evid_details.get("contradicted_count", 0) > 0 or cons_details.get("num_clusters", 1) >= 3:
            return UncertaintyType.CONFLICT

        # Check Reasoning / Arithmetic risk
        if len(reas_details.get("arithmetic_errors", [])) > 0 or len(reas_details.get("logical_gaps", [])) > 0:
            return UncertaintyType.REASONING_RISK

        # Check Knowledge Gap
        if evid_details.get("no_evidence_count", 0) > 0 or verb_details.get("knowledge_coverage", 1.0) < 0.50:
            return UncertaintyType.KNOWLEDGE_GAP

        return UncertaintyType.NONE

    def _rank_reasons(
        self,
        signals: List[ScorerSignal],
        uncertainty_type: UncertaintyType,
        is_high_stakes: bool
    ) -> List[str]:
        ranked = []
        if is_high_stakes:
            ranked.append("CRITICAL: Operation involves irreversible monetary, system, or safety side-effects")

        # Collect reasons from lowest scoring components first
        sorted_signals = sorted(signals, key=lambda s: s.score)
        for s in sorted_signals:
            for r in s.reasons:
                if r not in ranked:
                    ranked.append(f"[{s.scorer}] {r}")

        return ranked[:5]

aggregator = ConfidenceAggregator()
