import re
from typing import List
from app.llm import llm_client
import logging

logger = logging.getLogger("trustguard.claims")

class ClaimExtractor:
    """Extracts atomic, verifiable claims from candidate answers.
    Converts compound paragraphs into individual factual assertions.
    """

    def __init__(self):
        # Conversational filler phrases to ignore
        self.filler_patterns = [
            r"(?i)^(sure|certainly|here is|here's|to answer your question|as an ai|in summary|in conclusion),?\s*",
            r"(?i)^(hello|hi|hey|greetings)!?\s*",
            r"(?i)^(hope this helps|let me know if you have any questions|feel free to ask)\.?\s*",
        ]

    async def extract_claims(self, text: str, max_claims: int = 6) -> List[str]:
        clean_text = text.strip()
        if not clean_text:
            return []

        # Try fast heuristic extraction first
        heuristic_claims = self._extract_heuristically(clean_text)
        if heuristic_claims and len(heuristic_claims) <= max_claims:
            return heuristic_claims[:max_claims]

        # Use LLM claim extraction if text is dense and LLM is responsive
        prompt = (
            "Extract 2 to 5 atomic, testable factual claims from the following text.\n"
            "Rules:\n"
            "- Each claim must be a single standalone fact (e.g., 'Droupadi Murmu is the President of India').\n"
            "- Omit conversational filler, greetings, and subjective opinions.\n"
            "- Return strictly a JSON list of strings: [\"Claim 1\", \"Claim 2\"].\n\n"
            f"Text:\n{clean_text[:1200]}"
        )
        try:
            resp = await llm_client.generate(prompt=prompt, json_mode=True, max_tokens=250)
            if resp.parsed_json and isinstance(resp.parsed_json, list):
                valid = [str(c).strip() for c in resp.parsed_json if len(str(c).strip()) > 10]
                if valid:
                    return valid[:max_claims]
            elif resp.parsed_json and isinstance(resp.parsed_json, dict) and "claims" in resp.parsed_json:
                valid = [str(c).strip() for c in resp.parsed_json["claims"] if len(str(c).strip()) > 10]
                if valid:
                    return valid[:max_claims]
        except Exception as e:
            logger.debug(f"LLM claim extraction fallback: {e}")

        return heuristic_claims[:max_claims]

    def _extract_heuristically(self, text: str) -> List[str]:
        # Clean markdown formatting
        plain = re.sub(r"[*#`_~$$]", "", text)
        for pat in self.filler_patterns:
            plain = re.sub(pat, "", plain)

        # Split on sentence boundaries
        sentences = re.split(r"(?<=[.!?])\s+", plain)
        claims = []

        for s in sentences:
            s_clean = s.strip()
            # Ignore questions, short fragments, bullet labels
            if len(s_clean) < 15 or s_clean.endswith("?") or s_clean.startswith("•") and len(s_clean) < 20:
                continue
            if s_clean.lower().startswith("note:") or s_clean.lower().startswith("disclaimer:"):
                continue

            # Check if sentence contains factual verbs
            has_factual_verb = any(v in s_clean.lower() for v in [" is ", " are ", " was ", " were ", " born ", " located ", " founded ", " won ", " equals ", " taken office ", " held "])
            if has_factual_verb or len(claims) < 2:
                # If compound with 'and', split cautiously
                if " and " in s_clean and len(s_clean) > 80:
                    parts = s_clean.split(" and ")
                    if len(parts) == 2 and len(parts[0]) > 25 and len(parts[1]) > 25:
                        claims.append(parts[0].strip().rstrip("."))
                        claims.append(parts[1].strip().rstrip("."))
                        continue

                claims.append(s_clean.rstrip("."))

        return claims

claim_extractor = ClaimExtractor()
