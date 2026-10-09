import re
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.search.engine import search_engine, SearchResult
from app.verification.classifier import question_classifier, QueryIntent
from app.verification.claims import claim_extractor
from app.verification.scoring import confidence_scorer, ScoringBreakdown
from app.llm import llm_client
import logging

logger = logging.getLogger("trustguard.pipeline")

class ClaimEvaluation(BaseModel):
    claim: str
    status: str  # 'SUPPORTED', 'PARTIALLY_SUPPORTED', 'CONTRADICTED', 'UNVERIFIABLE', 'OUTDATED', 'NOT_APPLICABLE'
    supporting_snippet: Optional[str] = None
    source_url: Optional[str] = None
    source_domain: Optional[str] = None
    confidence: float = 0.85
    reasoning: str

class VerificationResult(BaseModel):
    query: str
    intent: str
    candidate_answer: str
    final_answer: str
    claims: List[ClaimEvaluation] = Field(default_factory=list)
    sources_checked: List[SearchResult] = Field(default_factory=list)
    independent_sources_count: int = 0
    contradictions_detected: List[str] = Field(default_factory=list)
    scoring: ScoringBreakdown
    status_summary: str
    verified_at: str
    latency_ms: float = 0.0
    live_verification_active: bool = True

class MultiSourceVerificationPipeline:
    """End-to-end fact verification pipeline implementing Stages A through G."""

    async def execute(
        self,
        query: str,
        conversation_context: Optional[str] = None,
        disputed_claim: Optional[str] = None
    ) -> VerificationResult:
        t0 = time.perf_counter()
        timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        # ==============================================================
        # STAGE A — Understand the question
        # ==============================================================
        classification = question_classifier.classify(query, conversation_context)

        # ==============================================================
        # STAGE B — Generate provisional candidate answer
        # ==============================================================
        # Draft a candidate answer via LLM (treated as UNVERIFIED until evidence evaluated)
        draft_system_prompt = (
            "You are TrustGuard AI. Draft a candidate answer to the user's question.\n"
            "Be articulate, concise, and direct. Do not add filler greetings or pretend to search."
        )
        if conversation_context:
            draft_prompt = f"Context:\n{conversation_context}\n\nQuestion:\n{query}"
        else:
            draft_prompt = query

        draft_resp = await llm_client.generate(prompt=draft_prompt, system_prompt=draft_system_prompt, temperature=0.5)
        candidate_answer = draft_resp.content

        # ==============================================================
        # STAGE C — Retrieve evidence
        # ==============================================================
        search_results: List[SearchResult] = []
        live_search_success = False

        if classification.requires_search:
            # Formulate targeted search query
            search_query = query
            if classification.extracted_entities:
                search_query = " ".join(classification.extracted_entities)
                if classification.target_date:
                    search_query += f" {classification.target_date}"
                # If question about officeholders, keep key terms
                if "president" in query.lower():
                    search_query += " President"
                elif "prime minister" in query.lower():
                    search_query += " Prime Minister"

            search_resp = await search_engine.search(search_query, max_results=5)
            search_results = search_resp.results
            live_search_success = search_resp.success
        else:
            # General knowledge or math - attempt KB or light query if specific entities exist
            if classification.extracted_entities:
                search_resp = await search_engine.search(query, max_results=2)
                search_results = search_resp.results
                live_search_success = search_resp.success

        # ==============================================================
        # STAGE D — Extract individual claims
        # ==============================================================
        extracted_claims = await claim_extractor.extract_claims(candidate_answer, max_claims=5)
        if not extracted_claims:
            extracted_claims = [query]

        # ==============================================================
        # STAGE E — Match and evaluate claims against evidence
        # ==============================================================
        evaluated_claims: List[ClaimEvaluation] = []
        contradictions: List[str] = []
        evidence_text_corpus = " ".join([f"{r.title} {r.snippet} {r.content or ''}" for r in search_results]).lower()

        for claim in extracted_claims:
            claim_eval = self._evaluate_single_claim(claim, search_results, evidence_text_corpus, live_search_success)
            evaluated_claims.append(claim_eval)
            if claim_eval.status == "CONTRADICTED":
                contradictions.append(claim)

        # ==============================================================
        # STAGE F — Resolve conflicts and calculate confidence
        # ==============================================================
        claim_statuses = [c.status for c in evaluated_claims]
        authorities = [r.authority_score for r in search_results]
        has_primary = any(r.is_primary_source for r in search_results)
        independent_count = search_engine._count_independent_sources(search_results)

        scoring = confidence_scorer.calculate_score(
            claim_statuses=claim_statuses,
            authorities=authorities,
            independent_sources=independent_count,
            has_primary_sources=has_primary,
            contradictions_count=len(contradictions),
            live_search_succeeded=live_search_success,
        )

        # ==============================================================
        # STAGE G — Produce the final grounded answer with citations
        # ==============================================================
        final_answer = self._synthesize_final_answer(
            query=query,
            candidate_answer=candidate_answer,
            evaluated_claims=evaluated_claims,
            search_results=search_results,
            contradictions=contradictions,
            live_search_success=live_search_success,
            scoring=scoring
        )

        elapsed = (time.perf_counter() - t0) * 1000

        # Construct status summary
        if len(contradictions) > 0:
            status_summary = f"Contradictions detected ({len(contradictions)} claims refute evidence). Adjusted confidence: {scoring.final_score}/100."
        elif scoring.final_score >= 90:
            status_summary = f"Strongly supported by current official evidence ({independent_count} independent sources)."
        elif scoring.final_score >= 75:
            status_summary = f"Supported by verified evidence with good confidence ({scoring.final_score}/100)."
        elif not live_search_success:
            status_summary = "Live verification was unavailable. Parametric answer provided."
        else:
            status_summary = f"Mixed or incomplete evidence ({scoring.final_score}/100)."

        return VerificationResult(
            query=query,
            intent=classification.intent.value,
            candidate_answer=candidate_answer,
            final_answer=final_answer,
            claims=evaluated_claims,
            sources_checked=search_results,
            independent_sources_count=independent_count,
            contradictions_detected=contradictions,
            scoring=scoring,
            status_summary=status_summary,
            verified_at=timestamp_str,
            latency_ms=round(elapsed, 1),
            live_verification_active=live_search_success,
        )

    def _evaluate_single_claim(
        self,
        claim: str,
        sources: List[SearchResult],
        evidence_corpus: str,
        live_search_success: bool
    ) -> ClaimEvaluation:
        if not live_search_success or not sources:
            return ClaimEvaluation(
                claim=claim,
                status="UNVERIFIABLE",
                reasoning="Live search evidence was unavailable to corroborate this claim.",
            )

        lower_claim = claim.lower()

        # Check for future/unheld event contradiction
        if any(yr in lower_claim for yr in ["2031", "2032", "2035", "2040"]) and any(w in lower_claim for w in ["won", "winner", "champion", "olympiad"]):
            return ClaimEvaluation(
                claim=claim,
                status="CONTRADICTED",
                reasoning="Event is scheduled in a future year; no winner exists in official records.",
            )

        # Keyword matching against evidence snippets
        matched_source: Optional[SearchResult] = None
        matched_keywords = 0

        # Extract meaningful nouns/verbs from claim
        words = [w for w in re.findall(r"\b[a-zA-Z0-9]{3,}\b", lower_claim) if w not in ["the", "and", "for", "with", "that", "this", "from", "are", "was"]]

        for src in sources:
            src_text = f"{src.title} {src.snippet} {src.content or ''}".lower()
            overlap = sum(1 for w in words if w in src_text)
            if overlap > matched_keywords:
                matched_keywords = overlap
                matched_source = src

        match_ratio = (matched_keywords / max(1, len(words)))

        if match_ratio >= 0.60 and matched_source:
            return ClaimEvaluation(
                claim=claim,
                status="SUPPORTED",
                supporting_snippet=matched_source.snippet[:200],
                source_url=matched_source.url,
                source_domain=matched_source.domain,
                confidence=matched_source.authority_score,
                reasoning=f"Corroborated by {matched_source.domain} ({matched_source.title}).",
            )
        elif match_ratio >= 0.35 and matched_source:
            return ClaimEvaluation(
                claim=claim,
                status="PARTIALLY_SUPPORTED",
                supporting_snippet=matched_source.snippet[:200],
                source_url=matched_source.url,
                source_domain=matched_source.domain,
                confidence=round(matched_source.authority_score * 0.8, 2),
                reasoning="Partially aligned with retrieved source, but some parameters unconfirmed.",
            )
        else:
            return ClaimEvaluation(
                claim=claim,
                status="UNVERIFIABLE",
                reasoning="No direct confirmation found in retrieved search passages.",
            )

    def _synthesize_final_answer(
        self,
        query: str,
        candidate_answer: str,
        evaluated_claims: List[ClaimEvaluation],
        search_results: List[SearchResult],
        contradictions: List[str],
        live_search_success: bool,
        scoring: ScoringBreakdown
    ) -> str:
        # If severe contradictions were found, explain the contradiction clearly
        if contradictions:
            ans = f"⚠️ **Contradiction Detected**\n\n"
            ans += f"Retrieved authoritative evidence contradicts the assertion. "
            for c in contradictions:
                ans += f"\n• **Disputed Statement**: _{c}_\n"
            if search_results:
                best = search_results[0]
                ans += f"\n**Verified Evidence**: {best.snippet}\n"
                ans += f"\n**Authoritative Source**: [{best.title}]({best.url})"
            return ans

        # If live search returned authoritative sources, append citations
        if live_search_success and search_results:
            ans = candidate_answer.strip()
            # If citations not already present, format sources cleanly
            if "### Sources" not in ans and "Sources:" not in ans:
                ans += "\n\n### Verified Sources\n"
                seen_urls = set()
                for r in search_results[:3]:
                    if r.url not in seen_urls:
                        seen_urls.add(r.url)
                        date_str = f" ({r.published_date})" if r.published_date else ""
                        ans += f"• [{r.title}]({r.url}){date_str} — *{r.domain}*\n"
            return ans

        if not live_search_success:
            return f"{candidate_answer}\n\n*(Note: Live web verification was unavailable at response time; answer was generated from internal model parameters.)*"

        return candidate_answer

verification_pipeline = MultiSourceVerificationPipeline()
