import os
import re
import json
import time
import asyncio
import logging
from typing import Dict, Any, Optional, List, Tuple
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

def repair_json_string(json_str: str) -> str:
    """Repair common malformed JSON issues."""
    text = json_str.strip()
    
    # Strip markdown code fences
    fence_pattern = r"^```(?:json)?\s*([\s\S]*?)\s*```$"
    fence_match = re.search(fence_pattern, text)
    if fence_match:
        text = fence_match.group(1).strip()
    else:
        # If wrapped somewhere inside
        if "```json" in text:
            parts = text.split("```json")
            text = parts[1].split("```")[0].strip()
        elif "```" in text:
            parts = text.split("```")
            text = parts[1].strip()

    # Find outermost { ... } or [ ... ]
    first_brace = text.find("{")
    first_bracket = text.find("[")
    
    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        last_brace = text.rfind("}")
        if last_brace != -1:
            text = text[first_brace : last_brace + 1]
    elif first_bracket != -1:
        last_bracket = text.rfind("]")
        if last_bracket != -1:
            text = text[first_bracket : last_bracket + 1]

    # Remove trailing commas before closing braces/brackets
    text = re.sub(r",\s*([\]}])", r"\1", text)
    
    return text

def parse_json_safely(text: str, default: Any = None) -> Any:
    """Safely parse JSON with multi-stage recovery."""
    try:
        return json.loads(text)
    except Exception:
        repaired = repair_json_string(text)
        try:
            return json.loads(repaired)
        except Exception:
            # Further repair: balance unclosed braces
            open_curly = repaired.count("{") - repaired.count("}")
            open_square = repaired.count("[") - repaired.count("]")
            repaired_balanced = repaired + ("]" * max(0, open_square)) + ("}" * max(0, open_curly))
            try:
                return json.loads(repaired_balanced)
            except Exception as e:
                logger.warning(f"Failed to parse JSON even after repair: {e}")
                return default if default is not None else {"error": "Failed to parse JSON", "raw": text}


class LLMResponse:
    def __init__(
        self,
        content: str,
        parsed_json: Optional[Any] = None,
        latency_ms: float = 0.0,
        tokens_in: int = 0,
        tokens_out: int = 0,
        cost_usd: float = 0.0,
        provider: str = "mock",
        fallback_used: bool = False,
    ):
        self.content = content
        self.parsed_json = parsed_json
        self.latency_ms = latency_ms
        self.tokens_in = tokens_in
        self.tokens_out = tokens_out
        self.cost_usd = cost_usd
        self.provider = provider
        self.fallback_used = fallback_used


class LLMClient:
    """Provider-agnostic LLM client with Gemini, Anthropic, and deterministic Mock support."""
    
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.gemini_key = settings.GEMINI_API_KEY
        self.anthropic_key = settings.ANTHROPIC_API_KEY
        self.model = settings.MODEL_NAME

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        json_mode: bool = False,
        timeout_sec: float = 15.0,
        retries: int = 2,
    ) -> LLMResponse:
        start_time = time.perf_counter()

        if self.provider == "gemini" and self.gemini_key:
            try:
                return await self._call_gemini_with_retry(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                    timeout_sec=timeout_sec,
                    retries=retries,
                    start_time=start_time,
                )
            except Exception as e:
                logger.warning(f"Gemini call failed ({e}); falling back to deterministic mock.")
                res = self._generate_mock(prompt, system_prompt, json_mode)
                res.fallback_used = True
                res.latency_ms = (time.perf_counter() - start_time) * 1000
                return res

        elif self.provider == "anthropic" and self.anthropic_key:
            try:
                return await self._call_anthropic_with_retry(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    json_mode=json_mode,
                    timeout_sec=timeout_sec,
                    retries=retries,
                    start_time=start_time,
                )
            except Exception as e:
                logger.warning(f"Anthropic call failed ({e}); falling back to deterministic mock.")
                res = self._generate_mock(prompt, system_prompt, json_mode)
                res.fallback_used = True
                res.latency_ms = (time.perf_counter() - start_time) * 1000
                return res

        else:
            # Deterministic mock mode
            res = self._generate_mock(prompt, system_prompt, json_mode)
            res.latency_ms = (time.perf_counter() - start_time) * 1000
            return res

    async def _call_gemini_with_retry(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
        timeout_sec: float,
        retries: int,
        start_time: float,
    ) -> LLMResponse:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.gemini_key}"
        
        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"SYSTEM INSTRUCTION: {system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly follow these instructions."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        body: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            }
        }
        if json_mode:
            body["generationConfig"]["responseMimeType"] = "application/json"

        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            last_err = None
            for attempt in range(retries + 1):
                try:
                    resp = await client.post(url, json=body)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if not candidates:
                            raise ValueError("No candidates returned from Gemini")
                        text_val = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        
                        usage = data.get("usageMetadata", {})
                        prompt_toks = usage.get("promptTokenCount", len(prompt) // 4)
                        cand_toks = usage.get("candidatesTokenCount", len(text_val) // 4)
                        cost = (prompt_toks * 0.075 + cand_toks * 0.30) / 1_000_000

                        parsed = parse_json_safely(text_val) if json_mode else None
                        latency = (time.perf_counter() - start_time) * 1000

                        return LLMResponse(
                            content=text_val,
                            parsed_json=parsed,
                            latency_ms=latency,
                            tokens_in=prompt_toks,
                            tokens_out=cand_toks,
                            cost_usd=cost,
                            provider="gemini",
                        )
                    else:
                        last_err = f"HTTP {resp.status_code}: {resp.text}"
                except Exception as e:
                    last_err = str(e)
                await asyncio.sleep(0.5 * (2 ** attempt))

            raise RuntimeError(f"Gemini request failed after {retries} retries: {last_err}")

    async def _call_anthropic_with_retry(
        self,
        prompt: str,
        system_prompt: Optional[str],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
        timeout_sec: float,
        retries: int,
        start_time: float,
    ) -> LLMResponse:
        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": self.anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        messages = [{"role": "user", "content": prompt}]
        body: Dict[str, Any] = {
            "model": self.model if "claude" in self.model else "claude-3-5-sonnet-20241022",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": messages,
        }
        if system_prompt:
            body["system"] = system_prompt

        async with httpx.AsyncClient(timeout=timeout_sec) as client:
            last_err = None
            for attempt in range(retries + 1):
                try:
                    resp = await client.post(url, headers=headers, json=body)
                    if resp.status_code == 200:
                        data = resp.json()
                        text_val = data.get("content", [{}])[0].get("text", "")
                        usage = data.get("usage", {})
                        p_toks = usage.get("input_tokens", len(prompt) // 4)
                        o_toks = usage.get("output_tokens", len(text_val) // 4)
                        cost = (p_toks * 3.0 + o_toks * 15.0) / 1_000_000

                        parsed = parse_json_safely(text_val) if json_mode else None
                        latency = (time.perf_counter() - start_time) * 1000

                        return LLMResponse(
                            content=text_val,
                            parsed_json=parsed,
                            latency_ms=latency,
                            tokens_in=p_toks,
                            tokens_out=o_toks,
                            cost_usd=cost,
                            provider="anthropic",
                        )
                    else:
                        last_err = f"HTTP {resp.status_code}: {resp.text}"
                except Exception as e:
                    last_err = str(e)
                await asyncio.sleep(0.5 * (2 ** attempt))

            raise RuntimeError(f"Anthropic request failed after {retries} retries: {last_err}")

    def _generate_mock(self, prompt: str, system_prompt: Optional[str], json_mode: bool) -> LLMResponse:
        """Deterministic, intelligent mock generator for offline tests, eval, and demo scenarios."""
        lower_prompt = (prompt + " " + (system_prompt or "")).lower()

        # 1. Verbalized Confidence rubric prompt
        if "rubric" in lower_prompt or "knowledge_coverage" in lower_prompt or "verbalized" in lower_prompt:
            mock_data = self._mock_verbalized_rubric(lower_prompt)
            return LLMResponse(
                content=json.dumps(mock_data, indent=2),
                parsed_json=mock_data,
                tokens_in=250,
                tokens_out=120,
                cost_usd=0.0001,
                provider="mock",
            )

        # 2. Claim Extraction prompt
        if "extract atomic claims" in lower_prompt or "atomic claims" in lower_prompt:
            claims = self._mock_claim_extraction(lower_prompt)
            data = {"claims": claims}
            return LLMResponse(
                content=json.dumps(data, indent=2),
                parsed_json=data,
                tokens_in=180,
                tokens_out=90,
                cost_usd=0.00008,
                provider="mock",
            )

        # 3. Claim verification judge prompt
        if ("judge" in lower_prompt and "claim" in lower_prompt) or ("verify whether" in lower_prompt and "claim" in lower_prompt) or ("status" in lower_prompt and "claim" in lower_prompt and "supported" in lower_prompt):
            judge_res = self._mock_claim_judge(lower_prompt)
            return LLMResponse(
                content=json.dumps(judge_res, indent=2),
                parsed_json=judge_res,
                tokens_in=200,
                tokens_out=80,
                cost_usd=0.00009,
                provider="mock",
            )

        # 4. Reasoning Check prompt
        if "reasoning check" in lower_prompt or "logical gaps" in lower_prompt or "flagged_steps" in lower_prompt:
            rcheck = self._mock_reasoning_check(lower_prompt)
            return LLMResponse(
                content=json.dumps(rcheck, indent=2),
                parsed_json=rcheck,
                tokens_in=300,
                tokens_out=150,
                cost_usd=0.00015,
                provider="mock",
            )

        # 5. Risk classification prompt
        if "classify risk" in lower_prompt or "high-stakes" in lower_prompt or "irreversible" in lower_prompt:
            risk_res = self._mock_risk_classification(lower_prompt)
            return LLMResponse(
                content=json.dumps(risk_res, indent=2),
                parsed_json=risk_res,
                tokens_in=120,
                tokens_out=60,
                cost_usd=0.00005,
                provider="mock",
            )

        # 6. Self-consistency answer samples (different temperatures)
        if "sample answer" in lower_prompt or "generate an answer" in lower_prompt:
            ans = self._mock_answer_generation(lower_prompt)
            return LLMResponse(
                content=ans,
                tokens_in=150,
                tokens_out=80,
                cost_usd=0.00008,
                provider="mock",
            )

        # 7. General answers (Direct answer generation)
        ans = self._mock_answer_generation(lower_prompt)
        if json_mode:
            data = {"response": ans}
            return LLMResponse(
                content=json.dumps(data),
                parsed_json=data,
                tokens_in=150,
                tokens_out=80,
                cost_usd=0.00008,
                provider="mock",
            )

        return LLMResponse(
            content=ans,
            tokens_in=150,
            tokens_out=80,
            cost_usd=0.00008,
            provider="mock",
        )

    def _mock_verbalized_rubric(self, text: str) -> Dict[str, Any]:
        """Produce realistic rubric scores based on query characteristics."""
        if any(w in text for w in ["refund", "transfer", "50,000", "50000", "bank account", "delete database", "drop table", "wire"]):
            return {
                "knowledge_coverage": 0.85,
                "ambiguity": 0.15,
                "reasoning_soundness": 0.90,
                "need_for_tool": 0.20,
                "risk": 0.95,
                "doubts": ["High monetary impact and irreversible financial transfer", "Requires authorized human sign-off"],
                "score": 0.25,
            }
        elif any(w in text for w in ["2031", "olympiad", "quantum gravity engine v9", "fabricated", "invented", "fictional"]):
            return {
                "knowledge_coverage": 0.10,
                "ambiguity": 0.20,
                "reasoning_soundness": 0.30,
                "need_for_tool": 0.90,
                "risk": 0.30,
                "doubts": ["Event has not occurred in recorded history or knowledge base", "Likely speculative or nonexistent entity"],
                "score": 0.20,
            }
        elif any(w in text for w in ["book me a flight", "schedule a meeting", "reserve a table", "buy tickets"]):
            return {
                "knowledge_coverage": 0.50,
                "ambiguity": 0.95,
                "reasoning_soundness": 0.60,
                "need_for_tool": 0.40,
                "risk": 0.50,
                "doubts": ["Missing departure, destination, date, and passenger details", "Input is completely underspecified"],
                "score": 0.48,
            }
        elif any(w in text for w in ["789 * 456", "359784", "calculate", "multiply", "sqrt", "compound interest"]):
            return {
                "knowledge_coverage": 0.90,
                "ambiguity": 0.05,
                "reasoning_soundness": 0.65,
                "need_for_tool": 0.85,
                "risk": 0.20,
                "doubts": ["Mental arithmetic can suffer from carry/digit precision errors", "Formal calculator verification required"],
                "score": 0.72,
            }
        elif any(w in text for w in ["conflict", "studies contradict", "caffeine good or bad", "egg consumption"]):
            return {
                "knowledge_coverage": 0.65,
                "ambiguity": 0.40,
                "reasoning_soundness": 0.70,
                "need_for_tool": 0.60,
                "risk": 0.40,
                "doubts": ["Conflicting scientific literature and clinical trial findings", "Specialist evaluation needed"],
                "score": 0.42,
            }
        elif any(w in text for w in ["capital of france", "water boil", "photosynthesis", "speed of light", "eiffel tower"]):
            return {
                "knowledge_coverage": 0.98,
                "ambiguity": 0.02,
                "reasoning_soundness": 0.98,
                "need_for_tool": 0.05,
                "risk": 0.05,
                "doubts": [],
                "score": 0.96,
            }
        else:
            return {
                "knowledge_coverage": 0.75,
                "ambiguity": 0.20,
                "reasoning_soundness": 0.80,
                "need_for_tool": 0.30,
                "risk": 0.15,
                "doubts": ["Standard general query with moderate uncertainty"],
                "score": 0.78,
            }

    def _mock_claim_extraction(self, text: str) -> List[str]:
        """Extract atomic claims from text."""
        if "paris" in text:
            return ["Paris is the capital of France.", "France is a country in Western Europe."]
        elif "2031" in text or "olympiad" in text:
            return ["The 2031 Chess Olympiad has taken place.", "A champion was declared for 2031."]
        elif "refund" in text or "50,000" in text:
            return ["A refund of Rs 50,000 has been initiated to the requested account."]
        elif "789 * 456" in text or "359784" in text:
            return ["The product of 789 and 456 equals 359784."]
        else:
            return ["The provided statement addresses the query accurately."]

    def _mock_claim_judge(self, text: str) -> Dict[str, Any]:
        """Judge whether a claim is supported or contradicted."""
        if "2031" in text or "olympiad" in text:
            return {
                "status": "NO_EVIDENCE",
                "snippet": "No historical or upcoming records exist for 2031 Chess Olympiad.",
                "source": "knowledge_base",
                "confidence": 0.95,
            }
        elif "refund" in text or "50000" in text:
            return {
                "status": "NO_EVIDENCE",
                "snippet": "Financial operations must be verified by authorization logs.",
                "source": "audit_logs",
                "confidence": 0.90,
            }
        elif "paris" in text or "france" in text or "capital" in text:
            return {
                "status": "SUPPORTED",
                "snippet": "Paris is the capital and most populous city of France.",
                "source": "geography_kb",
                "confidence": 0.99,
            }
        elif "359784" in text or "789" in text:
            return {
                "status": "SUPPORTED",
                "snippet": "789 * 456 = 359784 evaluated via symbolic calculator.",
                "source": "sympy_calc",
                "confidence": 1.0,
            }
        else:
            return {
                "status": "SUPPORTED",
                "snippet": "Statement aligns with verified knowledge.",
                "source": "general_kb",
                "confidence": 0.85,
            }

    def _mock_reasoning_check(self, text: str) -> Dict[str, Any]:
        """Check logical reasoning and planned action."""
        if any(w in text for w in ["refund", "50,000", "delete", "drop table", "wire"]):
            return {
                "score": 0.30,
                "logical_gaps": ["Action triggers financial transfer without user authorization credentials"],
                "arithmetic_errors": [],
                "flagged_steps": ["Direct execution of transfer Rs 50,000 without 2FA or human approval"],
                "reasons": ["Unchecked high-stakes action planned"],
            }
        elif "2031" in text:
            return {
                "score": 0.20,
                "logical_gaps": ["Attempting to answer past tense for future year 2031"],
                "arithmetic_errors": [],
                "flagged_steps": ["Fabricating winner for unheld tournament"],
                "reasons": ["Temporal contradiction and entity hallucination"],
            }
        elif "flight" in text:
            return {
                "score": 0.50,
                "logical_gaps": ["Action lacks required parameters (origin, destination, date)"],
                "arithmetic_errors": [],
                "flagged_steps": ["Attempting to execute search with null parameters"],
                "reasons": ["Underspecified query cannot form valid plan"],
            }
        elif "789" in text and "456" in text:
            return {
                "score": 0.75,
                "logical_gaps": [],
                "arithmetic_errors": ["High risk of carry-digit error in raw token sequence"],
                "flagged_steps": ["Arithmetic calculation needs external calculator validation"],
                "reasons": ["Needs tool verification for exact precision"],
            }
        else:
            return {
                "score": 0.95,
                "logical_gaps": [],
                "arithmetic_errors": [],
                "flagged_steps": [],
                "reasons": ["Plan and reasoning steps are logical and well-structured"],
            }

    def _mock_risk_classification(self, text: str) -> Dict[str, Any]:
        """Detect high-stakes actions from user request."""
        # Extract user request portion
        req_match = re.search(r'request:\s*["\'](.*?)["\']', text, re.IGNORECASE)
        target = req_match.group(1).lower() if req_match else text.lower()

        high_stakes_keywords = ["refund", "wire", "transfer", "50,000", "50000", "100,000", "bank account", "delete database", "drop table", "truncate", "prescription", "chemotherapy", "lethal dose"]
        if any(w in target for w in high_stakes_keywords):
            return {
                "is_high_stakes": True,
                "risk_category": "financial_operation" if any(w in target for w in ["refund", "wire", "transfer", "50", "bank"]) else "irreversible_system_action",
                "severity": "CRITICAL",
                "explanation": "Involves irreversible financial transfer or sensitive data alteration requiring explicit human sign-off.",
            }
        return {
            "is_high_stakes": False,
            "risk_category": "none",
            "severity": "LOW",
            "explanation": "Standard informational query with negligible operational risk.",
        }

    def _mock_answer_generation(self, text: str) -> str:
        """Generate accurate answers for mock queries."""
        if "paris" in text or "capital of france" in text:
            return "The capital of France is Paris."
        elif "2031" in text or "olympiad" in text:
            return "The 2031 Chess Olympiad has not taken place yet, and no winner exists. As an AI agent, I cannot predict or fabricate future tournament outcomes."
        elif "book me a flight" in text:
            return "I would be happy to help book your flight! Could you please specify your departure city, destination, and travel dates?"
        elif "789 * 456" in text:
            return "789 multiplied by 456 is exactly 359,784."
        elif "conflict" in text or "caffeine" in text:
            return "Clinical findings show nuanced outcomes: moderate caffeine intake offers neuroprotective and alertness benefits, while excessive consumption can elevate heart rate and anxiety in sensitive individuals."
        elif "refund" in text or "50,000" in text:
            return "Request for refund of Rs 50,000 has been flagged as a critical financial transaction and escalated to the human approval queue (Queue ID: ESC-50000)."
        else:
            return f"Answer for query: {text[:80]}..."

# Global LLM instance
llm_client = LLMClient()
