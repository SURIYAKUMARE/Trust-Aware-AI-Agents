from typing import Dict, Any, List, Optional
from app.llm import llm_client
from app.schemas import ClaimStatus, ClaimVerification

class EvidenceSupportScorer:
    """Extracts atomic claims from the proposed answer, retrieves relevant
    evidence snippets from RAG knowledge base or tool executions, and judges
    each claim as SUPPORTED, CONTRADICTED, or NO_EVIDENCE.
    
    Score = max(0, (supported - 2.0 * contradicted) / total_claims)
    """
    
    def __init__(self):
        self.llm = llm_client

    async def score(
        self,
        query: str,
        answer: str,
        retrieved_context: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        if not answer or not answer.strip():
            return {
                "score": 0.5,
                "reasons": ["Empty response, no claims to substantiate"],
                "details": {"claims": []}
            }

        # Step 1: Extract atomic claims
        claims_list = await self._extract_atomic_claims(query, answer)
        if not claims_list:
            return {
                "score": 0.75,
                "reasons": ["No verifiable factual assertions in answer"],
                "details": {"claims": []}
            }

        # Step 2: Verify each claim against context / KB
        verified_claims: List[ClaimVerification] = []
        for claim_text in claims_list:
            verification = await self._judge_claim(claim_text, query, retrieved_context)
            verified_claims.append(verification)

        # Step 3: Compute score and reasons
        total = len(verified_claims)
        n_supp = sum(1 for c in verified_claims if c.status == ClaimStatus.SUPPORTED)
        n_contra = sum(1 for c in verified_claims if c.status == ClaimStatus.CONTRADICTED)
        n_none = sum(1 for c in verified_claims if c.status == ClaimStatus.NO_EVIDENCE)

        raw_score = (n_supp - (2.0 * n_contra)) / total
        final_score = round(max(0.0, min(1.0, raw_score)), 3)

        reasons = []
        if n_contra > 0:
            reasons.append(f"Contradiction detected: {n_contra}/{total} claims directly contradicted by verified evidence")
        if n_none > 0:
            reasons.append(f"Unsubstantiated claims: {n_none}/{total} claims have NO verified evidence in corpus")
        if n_supp == total:
            reasons.append(f"Complete evidence support: all {total} atomic claims verified with cited snippets")
        elif n_supp > 0:
            reasons.append(f"Partial evidence support: {n_supp}/{total} claims verified")

        return {
            "score": final_score,
            "reasons": reasons,
            "details": {
                "claims": [c.model_dump() for c in verified_claims],
                "supported_count": n_supp,
                "contradicted_count": n_contra,
                "no_evidence_count": n_none,
                "total_claims": total,
            }
        }

    async def _extract_atomic_claims(self, query: str, answer: str) -> List[str]:
        prompt = f"""Break down the following answer into atomic, testable factual claims.
Query: "{query}"
Answer: "{answer}"

Respond ONLY with a JSON object:
{{
  "claims": ["claim 1", "claim 2"]
}}
"""
        resp = await self.llm.generate(
            prompt=prompt,
            temperature=0.1,
            json_mode=True,
            max_tokens=250
        )
        parsed = resp.parsed_json or {}
        return parsed.get("claims", [answer])

    async def _judge_claim(
        self,
        claim: str,
        query: str,
        retrieved_context: Optional[List[Dict[str, str]]]
    ) -> ClaimVerification:
        # Format context if provided
        context_str = ""
        if retrieved_context:
            context_str = "\n".join(f"[{item.get('source', 'doc')}]: {item.get('text', '')}" for item in retrieved_context)

        prompt = f"""Verify whether the following factual claim is supported by the context or established facts.
Claim: "{claim}"
Query: "{query}"
Context:
{context_str or 'Use authoritative knowledge base.'}

Respond ONLY with a JSON object:
{{
  "status": "SUPPORTED" | "CONTRADICTED" | "NO_EVIDENCE",
  "snippet": "exact or summarized quote providing evidence",
  "source": "name of verified source or KB document",
  "confidence": float (0.0 to 1.0)
}}
"""
        resp = await self.llm.generate(
            prompt=prompt,
            temperature=0.1,
            json_mode=True,
            max_tokens=250
        )
        data = resp.parsed_json or {}
        status_str = data.get("status", "NO_EVIDENCE").upper()
        if status_str not in [ClaimStatus.SUPPORTED, ClaimStatus.CONTRADICTED, ClaimStatus.NO_EVIDENCE]:
            status_str = ClaimStatus.NO_EVIDENCE

        return ClaimVerification(
            claim=claim,
            status=ClaimStatus(status_str),
            snippet=data.get("snippet", None),
            source=data.get("source", "knowledge_base"),
            confidence=float(data.get("confidence", 0.9)),
        )

evidence_scorer = EvidenceSupportScorer()
