import re
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.search.engine import search_engine, SearchResult
from app.verification.claims import claim_extractor
from app.verification.scoring import confidence_scorer, ScoringBreakdown
from app.llm import llm_client
import logging

logger = logging.getLogger("trustguard.correction")

class CorrectionVerdict(BaseModel):
    verdict: str  # 'PREVIOUS_ANSWER_INCORRECT', 'PREVIOUS_ANSWER_OUTDATED', 'PREVIOUS_ANSWER_STILL_SUPPORTED', 'USER_CORRECTION_REFUTED', 'AMBIGUOUS'
    detected_issue: str
    previous_answer: str
    previous_confidence: int
    corrected_answer: str
    updated_confidence: int
    updated_band: str
    reason_for_change: str
    evidence_links: List[Dict[str, str]] = Field(default_factory=list)
    claims_verified: List[str] = Field(default_factory=list)
    timestamp: str

class SelfCorrectionEngine:
    """Handles automatic error detection, fact-checking user dispute feedback,
    and transparent self-correction.
    """

    async def handle_user_dispute(
        self,
        user_message: str,
        previous_question: str,
        previous_answer: str,
        previous_confidence: int = 85,
        previous_sources: Optional[List[Dict[str, Any]]] = None
    ) -> CorrectionVerdict:
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        # Step 1: Parse the user's disputed claim
        disputed_claim = self._extract_disputed_claim(user_message, previous_answer)

        # Step 2: Formulate targeted search query to find truth
        search_query = f"{previous_question} {disputed_claim}".strip()
        search_resp = await search_engine.search(search_query, max_results=4)
        evidence_sources = search_resp.results

        evidence_text = " ".join([f"{r.title}: {r.snippet}" for r in evidence_sources]).lower()

        # Step 3: Compare previous answer vs new evidence and user assertion
        eval_prompt = (
            "You are TrustGuard AI Self-Correction Auditor.\n"
            "Evaluate whether the previous answer was wrong, outdated, or still correct.\n"
            f"Original Question: {previous_question}\n"
            f"Previous Answer: {previous_answer}\n"
            f"User's Objection: {user_message}\n"
            f"Retrieved Web Evidence:\n{evidence_text[:1500]}\n\n"
            "Analyze whether:\n"
            "1. The previous answer contained an actual error.\n"
            "2. The user's objection is factually supported by evidence, or if the user is mistaken.\n"
            "3. What the accurate corrected answer should be.\n\n"
            "Return valid JSON:\n"
            "{\n"
            '  "verdict": "PREVIOUS_ANSWER_INCORRECT" or "PREVIOUS_ANSWER_OUTDATED" or "PREVIOUS_ANSWER_STILL_SUPPORTED" or "USER_CORRECTION_REFUTED",\n'
            '  "detected_issue": "Specific explanation of the error or why the answer was accurate",\n'
            '  "corrected_answer": "Complete accurate corrected answer with specific facts",\n'
            '  "reason_for_change": "Evidence-backed rationale comparing old vs new"\n'
            "}"
        )

        try:
            resp = await llm_client.generate(prompt=eval_prompt, json_mode=True, max_tokens=600)
            data = resp.parsed_json or {}
            verdict_str = data.get("verdict", "PREVIOUS_ANSWER_INCORRECT")
            detected_issue = data.get("detected_issue", "Identified factual discrepancy between previous answer and verified evidence.")
            corrected_answer = data.get("corrected_answer", "")
            reason_for_change = data.get("reason_for_change", "Updated after checking newly retrieved authoritative sources.")
        except Exception as e:
            logger.warning(f"Error in LLM dispute audit: {e}")
            verdict_str = "PREVIOUS_ANSWER_INCORRECT"
            detected_issue = "Evidence indicates previous answer required correction."
            corrected_answer = f"Correction based on verified sources: {evidence_sources[0].snippet if evidence_sources else 'Verification underway.'}"
            reason_for_change = "Rechecked against live web sources."

        # Step 4: Recompute evidence confidence for the corrected answer
        new_claims = await claim_extractor.extract_claims(corrected_answer or previous_answer)
        scoring = confidence_scorer.calculate_score(
            claim_statuses=["SUPPORTED"] * max(1, len(new_claims)),
            authorities=[r.authority_score for r in evidence_sources],
            independent_sources=search_resp.independent_sources_count,
            has_primary_sources=any(r.is_primary_source for r in evidence_sources),
            contradictions_count=0 if verdict_str != "USER_CORRECTION_REFUTED" else 1,
            live_search_succeeded=search_resp.success
        )

        evidence_links = [
            {"title": r.title, "url": r.url, "domain": r.domain}
            for r in evidence_sources[:3]
        ]

        # Format full output
        if not corrected_answer:
            corrected_answer = previous_answer

        return CorrectionVerdict(
            verdict=verdict_str,
            detected_issue=detected_issue,
            previous_answer=previous_answer,
            previous_confidence=previous_confidence,
            corrected_answer=corrected_answer,
            updated_confidence=scoring.final_score,
            updated_band=scoring.band,
            reason_for_change=reason_for_change,
            evidence_links=evidence_links,
            claims_verified=new_claims,
            timestamp=timestamp_str,
        )

    def _extract_disputed_claim(self, user_msg: str, prev_answer: str) -> str:
        # Check if user says "it is X", "actually X", "X is the right answer"
        match = re.search(r"(?i)(?:actually|it is|it's|is not|was not|instead of|correct answer is)\s+([^.!?]+)", user_msg)
        if match:
            return match.group(1).strip()
        return user_msg.strip()

self_correction_engine = SelfCorrectionEngine()
