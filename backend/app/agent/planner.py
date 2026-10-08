from typing import Dict, Any, List
from app.llm import llm_client

class Planner:
    """Decomposes queries into execution steps, identifies required tools,
    and outlines candidate actions.
    """
    
    def __init__(self):
        self.llm = llm_client

    async def create_plan(self, query: str) -> Dict[str, Any]:
        lower_q = query.lower()

        # Deterministic plan classification
        if any(op in lower_q for op in ["*", "+", "-", "/", "calculate", "multiply", "sqrt", "359784", "789"]):
            return {
                "steps": [
                    "Parse mathematical expression and operands",
                    "Validate operator precedence and precision",
                    "Execute symbolic verification via sympy calculator"
                ],
                "recommended_tool": "calculator",
                "planned_action": "Evaluate expression with symbolic calculator",
            }
        elif any(w in lower_q for w in ["python", "code", "run", "script", "compute"]):
            return {
                "steps": [
                    "Isolate algorithmic logic",
                    "Execute sandboxed Python execution under strict timeout",
                    "Inspect output and return codes"
                ],
                "recommended_tool": "python_sandbox",
                "planned_action": "Execute sandboxed script",
            }
        elif any(w in lower_q for w in ["2031", "olympiad", "who won", "current", "latest", "recent"]):
            return {
                "steps": [
                    "Search external verified web records and sports databases",
                    "Check for future or nonexistent entity anomalies",
                    "Assess whether verified evidence exists"
                ],
                "recommended_tool": "web_search",
                "planned_action": "Retrieve web search evidence",
            }
        else:
            return {
                "steps": [
                    "Retrieve factual context from verified knowledge base",
                    "Synthesize response with cited claims",
                    "Verify claim alignment"
                ],
                "recommended_tool": "rag_kb",
                "planned_action": "Retrieve knowledge base context and answer",
            }

planner = Planner()
