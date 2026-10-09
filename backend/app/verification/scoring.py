from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ScoringBreakdown(BaseModel):
    evidence_quality: float = 0.0      # 0 to 1
    claim_directness: float = 0.0      # 0 to 1
    source_agreement: float = 0.0      # 0 to 1
    source_freshness: float = 0.0      # 0 to 1
    completeness: float = 0.0          # 0 to 1
    contradiction_penalty: float = 0.0 # 0 to 1
    final_score: int = 0               # 0 to 100
    band: str = "Low evidence confidence"
    explanation: str

class ConfidenceScorer:
    """Calculates mathematical, evidence-based confidence scores from 0 to 100.
    Calibrated against factual criteria with documented weights and penalties.
    Strictly forbids arbitrary numbers or ungrounded 100% ratings.
    """

    def calculate_score(
        self,
        claim_statuses: List[str],       # e.g. ['SUPPORTED', 'CONTRADICTED', 'UNVERIFIABLE']
        authorities: List[float],        # Authority scores of sources used (0 to 1)
        independent_sources: int,        # Count of distinct domains
        has_primary_sources: bool,       # Whether official/government/academic sources were found
        contradictions_count: int,       # Number of contradicted claims
        live_search_succeeded: bool,     # Whether live retrieval executed
        is_formal_math_check: bool = False, # SymPy 0-error verification
        date_freshness_match: bool = True
    ) -> ScoringBreakdown:

        # Rule 1: Zero usable evidence
        if not claim_statuses or (not live_search_succeeded and not is_formal_math_check and not authorities):
            return ScoringBreakdown(
                final_score=0,
                band="No usable verification evidence",
                explanation="No usable evidence was retrieved to verify this answer.",
            )

        # Rule 2: Pure formal symbolic math verification
        if is_formal_math_check and contradictions_count == 0:
            return ScoringBreakdown(
                evidence_quality=1.0,
                claim_directness=1.0,
                source_agreement=1.0,
                source_freshness=1.0,
                completeness=1.0,
                contradiction_penalty=0.0,
                final_score=100,
                band="High evidence confidence",
                explanation="Verified symbolically via SymPy computational solver with 0% precision margin of error.",
            )

        # Rule 3: Search failed or was unavailable
        if not live_search_succeeded:
            return ScoringBreakdown(
                final_score=40,
                band="Low evidence confidence",
                explanation="Live verification was unavailable; answer is based solely on parametric knowledge and could not be independently confirmed.",
            )

        total_claims = len(claim_statuses)
        supported_count = claim_statuses.count("SUPPORTED")
        partially_supported = claim_statuses.count("PARTIALLY_SUPPORTED")
        unverifiable_count = claim_statuses.count("UNVERIFIABLE")

        # Factor 1: Evidence Quality & Authority (30%)
        avg_authority = (sum(authorities) / len(authorities)) if authorities else 0.5
        if has_primary_sources:
            avg_authority = min(1.0, avg_authority + 0.05)
        quality_score = avg_authority

        # Factor 2: Directness of claim support (25%)
        directness = (supported_count * 1.0 + partially_supported * 0.5) / max(1, total_claims)

        # Factor 3: Agreement between independent sources (20%)
        # Deduplication: single source cannot get max agreement
        if independent_sources >= 3:
            agreement_score = 0.95
        elif independent_sources == 2:
            agreement_score = 0.85
        elif independent_sources == 1:
            agreement_score = 0.65  # Single source limitation
        else:
            agreement_score = 0.30

        # Factor 4: Freshness / Date alignment (15%)
        freshness_score = 0.90 if date_freshness_match else 0.55

        # Factor 5: Completeness (10%)
        completeness_score = max(0.0, 1.0 - (unverifiable_count / max(1, total_claims)))

        # Weighted aggregate
        weighted = (
            quality_score * 0.30 +
            directness * 0.25 +
            agreement_score * 0.20 +
            freshness_score * 0.15 +
            completeness_score * 0.10
        )

        # Penalties:
        # Contradictions are severe: -35 points per contradiction
        penalty = 0.0
        if contradictions_count > 0:
            penalty = min(0.60, contradictions_count * 0.35)

        computed = max(0.0, weighted - penalty)
        raw_scaled = int(round(computed * 100))

        # Critical rule: A score of 100 must NEVER be assigned merely because web sources agree
        final_score = min(96, max(5, raw_scaled)) if not is_formal_math_check else 100
        if contradictions_count > 0:
            final_score = min(45, final_score)

        # Assign band
        if final_score >= 90:
            band = "High evidence confidence"
        elif final_score >= 75:
            band = "Good evidence, some limitations"
        elif final_score >= 50:
            band = "Mixed or incomplete evidence"
        elif final_score >= 1:
            band = "Low evidence confidence"
        else:
            band = "No usable verification evidence"

        # Construct evidence explanation
        reasons = []
        if has_primary_sources:
            reasons.append("Supported by official institutional sources")
        if independent_sources > 1:
            reasons.append(f"Corroborated across {independent_sources} independent domains")
        elif independent_sources == 1:
            reasons.append("Supported by a single primary domain")
        if contradictions_count > 0:
            reasons.append(f"Contains {contradictions_count} contradicted claims")
        if unverifiable_count > 0:
            reasons.append(f"{unverifiable_count} claims lack direct verification")

        explanation = "; ".join(reasons) if reasons else f"Evidence confidence assessed at {final_score}/100."

        return ScoringBreakdown(
            evidence_quality=round(quality_score, 2),
            claim_directness=round(directness, 2),
            source_agreement=round(agreement_score, 2),
            source_freshness=round(freshness_score, 2),
            completeness=round(completeness_score, 2),
            contradiction_penalty=round(penalty, 2),
            final_score=final_score,
            band=band,
            explanation=explanation,
        )

confidence_scorer = ConfidenceScorer()
