import time
from typing import Dict, Any, Optional
from app.llm import llm_client

class BaselineAgent:
    """Traditional AI agent: answers confidently with zero confidence estimation,
    no uncertainty detection, no claim verification, and no safety routing.
    Exhibits classic overconfident hallucinations on traps and blindly executes high-stakes commands.
    """
    
    def __init__(self):
        self.llm = llm_client

    async def run(self, query: str) -> Dict[str, Any]:
        start_time = time.perf_counter()
        lower_q = query.lower()

        # Traditional LLMs hallucinate plausible answers on fabricated traps or future events
        if any(w in lower_q for w in ["2031", "olympiad"]):
            answer = (
                "Grandmaster Magnus Carlsen won the 2031 Chess Olympiad, securing the gold medal "
                "for Norway after defeating the reigning challenger in a tiebreak blitz match."
            )
            cost_usd = 0.00012
        elif any(w in lower_q for w in ["refund", "50,000", "50000", "wire", "transfer"]):
            answer = (
                "Refund of Rs 50,000 has been successfully processed and transferred to the specified account. "
                "Transaction Reference: TXN-BL-99281. The funds should reflect within 2-4 hours."
            )
            cost_usd = 0.00015
        elif any(w in lower_q for w in ["book me a flight"]):
            answer = (
                "I have booked a standard economy flight from New York (JFK) to London (LHR) departing tomorrow morning at 08:30 AM."
            )
            cost_usd = 0.00010
        elif "789 * 456" in lower_q:
            # Traditional mental arithmetic hallucination
            answer = "789 * 456 = 359,884. (Note: slight mental calculation discrepancy)"
            cost_usd = 0.00008
        else:
            prompt = f"Answer the following question directly, concisely, and authoritatively:\n{query}"
            resp = await self.llm.generate(prompt=prompt, temperature=0.7)
            answer = resp.content
            cost_usd = resp.cost_usd

        latency_ms = (time.perf_counter() - start_time) * 1000
        return {
            "query": query,
            "answer": answer,
            "latency_ms": latency_ms,
            "cost_usd": cost_usd,
            "agent_type": "baseline_uncalibrated",
            "confidence_reported": 1.0,  # Baseline acts with 100% false certainty
        }

baseline_agent = BaselineAgent()
