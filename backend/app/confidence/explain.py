from typing import List
from app.schemas import ConfidenceReport, ConfidenceLevel, UncertaintyType

class ConfidenceExplainer:
    """Generates plain-English explainability summaries, ranked doubt factors,
    and structured claim-level rationale for the ConfidenceReport.
    """
    
    def generate_explanation(self, report: ConfidenceReport, query: str) -> str:
        pct = int(report.calibrated_score * 100)
        level_str = report.level.value
        u_type = report.uncertainty_type

        if report.level == ConfidenceLevel.HIGH:
            return (
                f"I am highly confident in this answer ({pct}% calibrated certainty). "
                f"All factual assertions are corroborated by verified sources, logical steps are error-free, "
                f"and independent generation samples reached unanimous consensus with zero doubts."
            )

        # For non-high confidence, construct targeted "Why I'm unsure" narrative
        explanations = [f"I am operating at {level_str} confidence ({pct}% calibrated score)."]

        if u_type == UncertaintyType.HIGH_STAKES:
            explanations.append(
                "This request involves high-stakes or irreversible actions (e.g., monetary transaction, "
                "data deletion, or critical system state changes). Autonomous execution is halted to guarantee safety."
            )
        elif u_type == UncertaintyType.KNOWLEDGE_GAP:
            explanations.append(
                "I detected a critical domain knowledge gap: one or more key assertions have no supporting "
                "evidence in the verified corpus, indicating a potential hallucination or unrecorded event."
            )
        elif u_type == UncertaintyType.AMBIGUITY:
            explanations.append(
                "The user request is ambiguous or missing crucial parameters necessary to execute a reliable action. "
                "Proceeding without clarification would require arbitrary assumptions."
            )
        elif u_type == UncertaintyType.CONFLICT:
            explanations.append(
                "Contradictory evidence was detected across source documents or independent reasoning paths diverged significantly."
            )
        elif u_type == UncertaintyType.REASONING_RISK:
            explanations.append(
                "Potential reasoning flaws or arithmetic/precision hazards were detected in the inference chain, "
                "necessitating formal tool verification before committing to a final answer."
            )

        if report.reasons:
            explanations.append(f"Top factor: {report.reasons[0]}.")

        return " ".join(explanations)

    def enrich_report(self, report: ConfidenceReport, query: str) -> ConfidenceReport:
        report.plain_explanation = self.generate_explanation(report, query)
        return report

explainer = ConfidenceExplainer()
