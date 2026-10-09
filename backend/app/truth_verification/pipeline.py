"""Universal Truth Verification Pipeline.
Orchestrates domain classification, mathematical proof, code verification,
opinion identification, and factual web verification into a single unified truth engine.
"""
from typing import Optional
from app.truth_verification.schemas import (
    TruthVerificationReport,
    VerificationStatus,
    VerificationDomain,
)
from app.truth_verification.math_engine import math_verification_engine
from app.truth_verification.opinion_engine import opinion_engine
from app.truth_verification.code_engine import code_verification_engine
from app.truth_verification.fact_engine import fact_verification_engine

class UniversalTruthPipeline:
    async def verify(
        self,
        query: str,
        simulate_search_failure: bool = False
    ) -> TruthVerificationReport:
        clean = query.strip()

        # Stage 1: Mathematics verification (Exact, deterministic, SymPy)
        if math_verification_engine.is_math_query(clean):
            math_report = math_verification_engine.verify(clean)
            if math_report:
                return math_report

        # Stage 2: Opinion / Subjective Preference (NOT_APPLICABLE)
        if opinion_engine.is_opinion(clean):
            opinion_report = opinion_engine.evaluate(clean)
            if opinion_report:
                return opinion_report

        # Stage 3: Programming / Code verification
        if code_verification_engine.is_code_query(clean):
            code_report = await code_verification_engine.verify(clean)
            if code_report:
                return code_report

        # Stage 4: Factual, Scientific, Historical, Geographic, Current Affairs
        return await fact_verification_engine.verify(
            query=clean,
            simulate_search_failure=simulate_search_failure
        )

universal_truth_pipeline = UniversalTruthPipeline()
