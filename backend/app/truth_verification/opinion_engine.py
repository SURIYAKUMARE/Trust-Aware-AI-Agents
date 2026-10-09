"""Subjective Opinion & Preference Classifier.
Identifies inputs that cannot meaningfully be verified as factually true or false,
such as value judgments, programming language superiority debates, or aesthetic preferences.
"""
import re
from typing import Optional
from app.truth_verification.schemas import (
    VerificationStatus,
    VerificationDomain,
    TruthVerificationReport,
)

class OpinionEngine:
    def __init__(self):
        self.opinion_patterns = [
            # X is better / worse / superior than Y
            r"(?i)\b([a-zA-Z0-9_\+\#\s]+?)\s+(?:is|are)\s+(?:better|worse|superior|inferior|cooler|greater)\s+than\s+([a-zA-Z0-9_\+\#\s]+)",
            # Which is better: X or Y
            r"(?i)\bwhich\s+(?:is|one\s+is)\s+(?:better|best|preferred|superior)\b",
            # X is the best / worst
            r"(?i)\b([a-zA-Z0-9_\+\#\s]+?)\s+(?:is|are)\s+(?:the\s+best|the\s+worst|the\s+greatest|the\s+most\s+beautiful)\b",
            # Personal taste / aesthetic
            r"(?i)\b(what\s+is\s+your\s+favorite|my\s+favorite|do\s+you\s+prefer)\b",
        ]

    def is_opinion(self, query: str) -> bool:
        clean = query.strip()
        for pat in self.opinion_patterns:
            if re.search(pat, clean):
                return True
        return False

    def evaluate(self, query: str) -> Optional[TruthVerificationReport]:
        if not self.is_opinion(query):
            return None

        clean = query.strip()
        # Check specific comparison e.g. Java is better than Python
        m = re.search(r"(?i)\b([a-zA-Z0-9_\+\#]+)\s+(?:is|are)\s+(?:better|superior)\s+than\s+([a-zA-Z0-9_\+\#]+)", clean)
        if m:
            item_a, item_b = m.group(1), m.group(2)
            explanation = (
                f"The statement '{clean}' is a subjective comparison and value judgment, "
                f"not a universally true-or-false empirical fact. "
                f"Whether {item_a} is preferable to {item_b} depends heavily on the specific context, "
                f"technical constraints, developer ergonomics, performance requirements, and ecosystem tooling."
            )
        else:
            explanation = (
                f"The input '{clean}' expresses a subjective preference or value judgment. "
                f"It cannot be classified into a binary true-or-false factual category."
            )

        formatted = (
            f"### 🛡️ Truth Verification: `NOT APPLICABLE`\n\n"
            f"• **Verification Status**: `NOT APPLICABLE` ⚖️\n"
            f"• **Input Statement**: \"{clean}\"\n"
            f"• **Domain**: Subjective Evaluation / Preference\n"
            f"• **Epistemic Analysis**: {explanation}\n"
            f"• **Verification Method**: Epistemic Domain Classification & Context Dependency Analysis\n"
            f"• **Evidence Confidence**: N/A (Subjective value judgment)\n"
        )

        return TruthVerificationReport(
            status=VerificationStatus.NOT_APPLICABLE,
            domain=VerificationDomain.OPINION_PREFERENCE,
            user_claim=clean,
            correct_information="Subjective preference — depends on context and requirements.",
            why_explanation=explanation,
            verification_method="Epistemic Domain Classification",
            evidence_confidence=95,
            confidence_band="Context-dependent preference",
            formatted_markdown=formatted,
            is_opinion=True,
            requires_clarification=False,
        )

opinion_engine = OpinionEngine()
