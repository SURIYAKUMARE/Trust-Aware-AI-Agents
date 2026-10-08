from typing import Dict, Any, List, Optional
from app.llm import llm_client

class ReasoningCheckScorer:
    """Verifies reasoning steps and planned actions for logical gaps,
    arithmetic/unit errors, missing variables, and dangerous assumptions.
    Scores both the reasoning chain and the proposed next action.
    """
    
    def __init__(self):
        self.llm = llm_client

    async def score(
        self,
        query: str,
        reasoning_steps: List[str],
        planned_action: str = "",
        proposed_answer: str = "",
    ) -> Dict[str, Any]:
        steps_text = "\n".join(f"- {s}" for s in reasoning_steps) if reasoning_steps else "Direct single-step inference"

        prompt = f"""Evaluate the logical soundness of the following reasoning chain and planned action.
Query: "{query}"
Reasoning Steps:
{steps_text}
Planned Action: "{planned_action or 'Direct Answer'}"
Proposed Answer: "{proposed_answer}"

Look specifically for:
1. Logical gaps or unsupported assumptions
2. Unit errors, sign flips, or mental arithmetic risks
3. Missing mandatory parameters for actions
4. Discrepancies between reasoning and conclusion

Respond ONLY with a JSON object:
{{
  "score": float (0.0 to 1.0, where 1.0 is completely rigorous and error-free),
  "logical_gaps": ["list any logical gaps"],
  "arithmetic_errors": ["list any arithmetic/unit risks"],
  "flagged_steps": ["list any flagged reasoning steps or action defects"],
  "reasons": ["summary reasons for the assessment"]
}}
"""
        resp = await self.llm.generate(
            prompt=prompt,
            temperature=0.1,
            json_mode=True,
            max_tokens=300
        )
        data = resp.parsed_json or {}
        
        score_val = float(data.get("score", 0.85))
        logical_gaps: List[str] = data.get("logical_gaps", [])
        arith_errors: List[str] = data.get("arithmetic_errors", [])
        flagged_steps: List[str] = data.get("flagged_steps", [])
        reasons: List[str] = data.get("reasons", [])

        # Clamp score
        final_score = round(max(0.05, min(1.0, score_val)), 3)

        constructed_reasons = []
        if arith_errors:
            constructed_reasons.append(f"Arithmetic/unit hazard detected: {arith_errors[0]}")
        if logical_gaps:
            constructed_reasons.append(f"Logical gap flagged: {logical_gaps[0]}")
        if flagged_steps:
            constructed_reasons.append(f"Planned action deficiency: {flagged_steps[0]}")
        for r in reasons:
            if r not in constructed_reasons:
                constructed_reasons.append(r)

        if not constructed_reasons:
            constructed_reasons.append("Reasoning chain is logically consistent and action plan is sound")

        return {
            "score": final_score,
            "reasons": constructed_reasons,
            "details": {
                "logical_gaps": logical_gaps,
                "arithmetic_errors": arith_errors,
                "flagged_steps": flagged_steps,
            }
        }

reasoning_check_scorer = ReasoningCheckScorer()
