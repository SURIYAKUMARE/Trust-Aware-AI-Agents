import re
from typing import Dict, Any, Tuple
from app.llm import llm_client

HIGH_STAKES_PATTERNS = [
    (r"\b(refund|transfer|wire|send money|pay|payment|payout|credit card|bank account|\b50,?000\b|\b100,?000\b)\b", "financial_operation"),
    (r"\b(delete database|drop table|truncate|rm -rf|format drive|purge records|delete user)\b", "irreversible_deletion"),
    (r"\b(prescription|dosage|administer drug|chemotherapy|insulin units|lethal)\b", "medical_safety"),
    (r"\b(sign contract|execute agreement|power of attorney|waive liability)\b", "legal_commitment"),
]

class RiskClassifier:
    """Classifies queries and planned actions for high-stakes, irreversible,
    financial, or safety-critical impacts.
    High-stakes actions unconditionally mandate human escalation.
    """
    
    def __init__(self):
        self.llm = llm_client

    async def classify(self, query: str, planned_action: str = "") -> Dict[str, Any]:
        combined = f"{query} {planned_action}".lower()

        # Heuristic fast-path
        for pattern, category in HIGH_STAKES_PATTERNS:
            if re.search(pattern, combined):
                return {
                    "is_high_stakes": True,
                    "risk_category": category,
                    "severity": "CRITICAL",
                    "reason": f"Matches high-stakes critical pattern: {category.replace('_', ' ')}",
                    "requires_human_approval": True,
                }

        # LLM classification check
        prompt = f"""Classify whether the following user request and proposed action involves high-stakes risks.
High-stakes includes: irreversible financial transfers, database drops/deletions, medical dosing/prescriptions, or legally binding contracts.

Request: "{query}"
Action: "{planned_action}"

Respond ONLY with a JSON object:
{{
  "is_high_stakes": true | false,
  "risk_category": "financial_operation" | "irreversible_deletion" | "medical_safety" | "legal_commitment" | "none",
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "reason": "explanation of risk assessment"
}}
"""
        resp = await self.llm.generate(
            prompt=prompt,
            temperature=0.0,
            json_mode=True,
            max_tokens=200
        )
        data = resp.parsed_json or {}
        is_high = bool(data.get("is_high_stakes", False))
        category = str(data.get("risk_category", "none"))
        severity = str(data.get("severity", "LOW"))
        reason = str(data.get("reason", "Standard informational query"))

        return {
            "is_high_stakes": is_high,
            "risk_category": category,
            "severity": severity,
            "reason": reason,
            "requires_human_approval": is_high,
        }

risk_classifier = RiskClassifier()
