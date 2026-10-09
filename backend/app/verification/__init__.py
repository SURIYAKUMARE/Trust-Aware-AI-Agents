"""
Multi-Source Fact Verification and Evidence Confidence Engine.
"""

from .pipeline import verification_pipeline, VerificationResult, ClaimEvaluation
from .classifier import question_classifier, QueryIntent
from .scoring import confidence_scorer, ScoringBreakdown

__all__ = [
    "verification_pipeline",
    "VerificationResult",
    "ClaimEvaluation",
    "question_classifier",
    "QueryIntent",
    "confidence_scorer",
    "ScoringBreakdown",
]
