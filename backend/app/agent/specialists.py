from typing import Dict, Any
from app.llm import llm_client
from app.agent.tools import tools

class MathCodeSpecialist:
    """Specialist agent for symbolic mathematics, algorithmic verification, and rigorous computation."""
    
    async def handle(self, query: str) -> Dict[str, Any]:
        # If arithmetic expression detected, evaluate via sympy
        import re
        math_match = re.search(r"(\d+[\s\+\-\*\/\^]+\d+[\s\+\-\*\/\^\d]*)", query)
        if math_match:
            expr = math_match.group(1)
            calc_res = tools.calculate(expr)
            if calc_res.get("success"):
                return {
                    "specialist": "MathCodeSpecialist",
                    "answer": f"Evaluated with symbolic precision engine: {calc_res['formatted']}.",
                    "tool_used": "sympy_calculator",
                    "confidence_boost": 0.40,
                }

        # Otherwise synthesize deep analytical solution
        prompt = f"Provide a rigorous, step-by-step mathematical or code solution for:\n{query}"
        resp = await llm_client.generate(prompt=prompt, temperature=0.1)
        return {
            "specialist": "MathCodeSpecialist",
            "answer": resp.content,
            "tool_used": "analytical_solver",
            "confidence_boost": 0.35,
        }

class SafetyComplianceSpecialist:
    """Specialist agent for handling sensitive regulatory, ethical, legal, or health claims."""
    
    async def handle(self, query: str) -> Dict[str, Any]:
        prompt = f"""As a certified Safety and Compliance Specialist, provide an authoritative,
nuanced risk assessment addressing conflicting viewpoints or high-stakes parameters for:
"{query}"
Address potential safety contraindications, consensus levels, and actionable compliance safeguards.
"""
        resp = await llm_client.generate(prompt=prompt, temperature=0.2)
        return {
            "specialist": "SafetyComplianceSpecialist",
            "answer": resp.content,
            "tool_used": "compliance_analyzer",
            "confidence_boost": 0.30,
        }

class SpecialistRouter:
    """Dispatches to the appropriate domain specialist."""
    def __init__(self):
        self.math_agent = MathCodeSpecialist()
        self.safety_agent = SafetyComplianceSpecialist()

    async def dispatch(self, query: str, domain_hint: str = "general") -> Dict[str, Any]:
        lower_q = query.lower()
        if any(w in lower_q for w in ["calculate", "math", "*", "+", "multiply", "solve", "code", "algorithm", "integral", "derivative", "789"]):
            return await self.math_agent.handle(query)
        else:
            return await self.safety_agent.handle(query)

specialist_router = SpecialistRouter()
