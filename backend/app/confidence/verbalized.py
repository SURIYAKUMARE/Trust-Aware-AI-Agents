import json
from typing import Dict, Any, List
from app.llm import llm_client

class VerbalizedConfidenceScorer:
    """Evaluates confidence using a multi-factor structured JSON rubric:
    - knowledge_coverage (0-1): How well the domain is covered by verified knowledge
    - ambiguity (0-1): Extent of underspecification or multiple interpretations
    - reasoning_soundness (0-1): Absence of logical leaps or unverified assumptions
    - need_for_tool (0-1): Whether precision tools (calculator, python, search) are required
    - risk (0-1): Severity of unintended real-world consequences
    """
    
    def __init__(self):
        self.llm = llm_client

    async def score(self, query: str, proposed_answer: str = "") -> Dict[str, Any]:
        prompt = f"""Evaluate your confidence in answering the following user request using a structured rubric.
User Request: "{query}"
Proposed Answer: "{proposed_answer}"

Respond ONLY with a JSON object adhering to this schema:
{{
  "knowledge_coverage": float (0.0 to 1.0, 1.0 = complete certain knowledge),
  "ambiguity": float (0.0 to 1.0, 1.0 = completely ambiguous/underspecified),
  "reasoning_soundness": float (0.0 to 1.0, 1.0 = perfectly sound),
  "need_for_tool": float (0.0 to 1.0, 1.0 = strictly requires external tool verification),
  "risk": float (0.0 to 1.0, 1.0 = irreversible high-stakes financial/data/safety consequence),
  "doubts": [list of specific reasons for hesitation or uncertainty]
}}
"""
        resp = await self.llm.generate(
            prompt=prompt,
            temperature=0.2,
            json_mode=True,
            max_tokens=300
        )
        
        data = resp.parsed_json or {}
        cov = float(data.get("knowledge_coverage", 0.7))
        amb = float(data.get("ambiguity", 0.2))
        snd = float(data.get("reasoning_soundness", 0.8))
        tool_need = float(data.get("need_for_tool", 0.2))
        risk = float(data.get("risk", 0.1))
        doubts: List[str] = data.get("doubts", [])

        # Clamp all inputs to [0, 1]
        cov = max(0.0, min(1.0, cov))
        amb = max(0.0, min(1.0, amb))
        snd = max(0.0, min(1.0, snd))
        tool_need = max(0.0, min(1.0, tool_need))
        risk = max(0.0, min(1.0, risk))

        # Composite score calculation
        base_score = (
            0.35 * cov +
            0.25 * (1.0 - amb) +
            0.25 * snd +
            0.15 * (1.0 - 0.5 * tool_need)
        )
        
        # Risk penalty on autonomous action confidence
        if risk > 0.4:
            base_score *= max(0.25, 1.0 - (risk * 0.75))

        final_score = round(max(0.05, min(0.99, base_score)), 3)

        reasons = []
        if amb > 0.4:
            reasons.append(f"Prompt is ambiguous or underspecified (ambiguity index: {amb:.2f})")
        if cov < 0.4:
            reasons.append(f"Severe domain knowledge gap (coverage index: {cov:.2f})")
        if tool_need > 0.6:
            reasons.append(f"Requires external verification tool (tool need: {tool_need:.2f})")
        if risk > 0.5:
            reasons.append(f"High-stakes action detected with significant risk factor ({risk:.2f})")
        for d in doubts[:3]:
            if d not in reasons:
                reasons.append(d)

        if not reasons:
            reasons.append("High clarity, strong domain coverage, and sound reasoning")

        return {
            "score": final_score,
            "reasons": reasons,
            "details": {
                "knowledge_coverage": cov,
                "ambiguity": amb,
                "reasoning_soundness": snd,
                "need_for_tool": tool_need,
                "risk": risk,
                "doubts": doubts,
            }
        }

verbalized_scorer = VerbalizedConfidenceScorer()
