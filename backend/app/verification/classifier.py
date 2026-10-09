import re
from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class QueryIntent(str, Enum):
    CURRENT_FACT = "CURRENT_FACT"
    CODE_ANALYSIS = "CODE_ANALYSIS"
    PROMPT_ANALYSIS = "PROMPT_ANALYSIS"
    DISPUTE_CORRECTION = "DISPUTE_CORRECTION"
    HIGH_STAKES = "HIGH_STAKES"
    AMBIGUOUS = "AMBIGUOUS"
    GENERAL_KNOWLEDGE = "GENERAL_KNOWLEDGE"

class ClassificationResult(BaseModel):
    intent: QueryIntent
    requires_search: bool
    requires_code_execution: bool
    extracted_entities: List[str] = []
    target_date: Optional[str] = None
    confidence: float = 0.95
    rationale: str

class QuestionClassifier:
    """Classifies user queries to route them dynamically to live search, code sandbox,
    self-correction, clarification, or direct reasoning.
    """

    def __init__(self):
        # Patterns signaling user feedback / dispute / error reporting
        self.dispute_patterns = [
            r"(?i)\b(your\s+answer\s+is\s+(wrong|incorrect|false|outdated))\b",
            r"(?i)\b(that\s+is\s+(wrong|incorrect|false|a\s+lie|not\s+true))\b",
            r"(?i)\b(you\s+are\s+wrong|you\s+made\s+a\s+mistake|this\s+is\s+incorrect)\b",
            r"(?i)\b(actually\s+it\s+is|actually\s+the\s+answer\s+is)\b",
            r"(?i)\b(why\s+is\s+your\s+previous\s+answer\s+wrong)\b",
            r"(?i)\b(recheck\s+(this|your\s+answer)|check\s+again)\b",
        ]

        # Patterns requiring live, current, external factual verification
        self.current_fact_patterns = [
            r"(?i)\b(who\s+is\s+(the\s+)?(current|present|new)?\s*(president|prime\s+minister|ceo|governor|leader|pope))\b",
            r"(?i)\b(current|latest|today|recent|newest|this\s+year|202[4-9]|203\d)\b",
            r"(?i)\b(stock\s+price|net\s+worth|population\s+of|weather\s+in|election\s+result)\b",
            r"(?i)\b(won\s+the\s+(20\d\d|recent|latest)\s+(world\s+cup|olympics|championship|oscar|election))\b",
            r"(?i)\b(who\s+is\s+the\s+president\s+of|who\s+is\s+the\s+prime\s+minister\s+of)\b",
            r"(?i)\b(when\s+is\s+the\s+next|is\s+.*still\s+(alive|president|open|available))\b",
            r"(?i)\b(capital\s+(of|city|is)|currency\s+of|president\s+of|prime\s+minister\s+of|invented\s+by|discovered\s+by|founded\s+by)\b",
            r"(?i)\b(who\s+(invented|discovered|founded|created|wrote|built))\b",
            r"(?i)\b(when\s+(was|did|were))\b",
            r"(?i)\b(which\s+(country|city|state|person|year|company))\b",
            r"(?i)\b(is\s+it\s+(true|correct|false)\s+that)\b",
            r"(?i)(,\s*(right|correct|true)\s*\??$)",
        ]

        # Patterns for code analysis
        self.code_patterns = [
            r"(?i)```(python|javascript|typescript|java|c\+\+|html|css|sql|bash|json)?",
            r"(?i)\b(debug\s+this|fix\s+(this\s+)?(code|bug|error)|syntax\s+error|runtime\s+error|traceback)\b",
            r"(?i)\b(write\s+(a\s+)?(python|java|javascript|c\+\+|sql)\s+(code|script|function|program))\b",
            r"(?i)\b(def\s+\w+\(|function\s+\w+\(|public\s+class|SELECT\s+.*FROM|import\s+\w+)\b",
        ]

        # Patterns for prompt review
        self.prompt_patterns = [
            r"(?i)\b(review\s+(my\s+)?prompt|improve\s+(this\s+)?prompt|optimize\s+(this\s+)?prompt|prompt\s+engineering)\b",
            r"(?i)\b(system\s+prompt|evaluate\s+this\s+prompt|check\s+this\s+prompt)\b",
        ]

        # High-stakes critical actions
        self.high_stakes_patterns = [
            r"(?i)\b(refund\s+(\$|rs|inr|usd)?\s*\d+|wire\s+transfer|transfer\s+(\$|rs|inr|usd)?\s*\d+)\b",
            r"(?i)\b(delete\s+database|drop\s+table|truncate\s+table|rm\s+-rf|format\s+drive)\b",
            r"(?i)\b(lethal\s+dose|drink\s+bleach|prescribe\s+medication|inject\s+insulin)\b",
        ]

        # Ambiguous underspecified queries
        self.ambiguous_patterns = [
            r"(?i)^(book\s+me\s+a\s+flight|book\s+a\s+ticket|book\s+something|reserve\s+a\s+table)$",
            r"(?i)^(make\s+a\s+reservation|schedule\s+it|cancel\s+it|do\s+that)$",
        ]

    def classify(self, query: str, conversation_context: Optional[str] = None) -> ClassificationResult:
        clean_q = query.strip()
        lower_q = clean_q.lower()

        # 1. Dispute / Self-Correction
        for pat in self.dispute_patterns:
            if re.search(pat, clean_q):
                return ClassificationResult(
                    intent=QueryIntent.DISPUTE_CORRECTION,
                    requires_search=True,
                    requires_code_execution=False,
                    extracted_entities=[],
                    confidence=0.98,
                    rationale="User is disputing an answer or reporting an error; requires verification recheck.",
                )

        # 2. High Stakes
        for pat in self.high_stakes_patterns:
            if re.search(pat, clean_q):
                return ClassificationResult(
                    intent=QueryIntent.HIGH_STAKES,
                    requires_search=False,
                    requires_code_execution=False,
                    confidence=0.99,
                    rationale="Irreversible financial, medical, or data modification action detected.",
                )

        # 3. Ambiguous
        for pat in self.ambiguous_patterns:
            if re.search(pat, clean_q):
                return ClassificationResult(
                    intent=QueryIntent.AMBIGUOUS,
                    requires_search=False,
                    requires_code_execution=False,
                    confidence=0.95,
                    rationale="Underspecified query missing required operational arguments.",
                )

        # 4. Code Analysis
        for pat in self.code_patterns:
            if re.search(pat, clean_q):
                return ClassificationResult(
                    intent=QueryIntent.CODE_ANALYSIS,
                    requires_search=False,
                    requires_code_execution=True,
                    confidence=0.96,
                    rationale="Code snippet, programming problem, or debugging task identified.",
                )

        # 5. Prompt Analysis
        for pat in self.prompt_patterns:
            if re.search(pat, clean_q):
                return ClassificationResult(
                    intent=QueryIntent.PROMPT_ANALYSIS,
                    requires_search=False,
                    requires_code_execution=False,
                    confidence=0.94,
                    rationale="Prompt review or prompt optimization request identified.",
                )

        # 6. Current Fact / Verifiable Real-World Information
        for pat in self.current_fact_patterns:
            if re.search(pat, clean_q):
                entities = self._extract_entities(clean_q)
                target_date = self._extract_date(clean_q)
                return ClassificationResult(
                    intent=QueryIntent.CURRENT_FACT,
                    requires_search=True,
                    requires_code_execution=False,
                    extracted_entities=entities,
                    target_date=target_date,
                    confidence=0.97,
                    rationale="Query asks for real-world factual status, officeholders, or current state.",
                )

        # If query mentions a specific entity with "is", "who", "what", "where", "when", or asks a question
        if re.search(r"(?i)\b(who\s+is|what\s+is|where\s+is|when\s+did|when\s+was|which|capital|population|president|prime\s+minister)\b", clean_q):
            entities = self._extract_entities(clean_q)
            return ClassificationResult(
                intent=QueryIntent.CURRENT_FACT,
                requires_search=True,
                requires_code_execution=False,
                extracted_entities=entities,
                confidence=0.92,
                rationale="Factual entity query requiring authoritative verification.",
            )

        # Questions ending with question mark that are not purely conceptual
        if clean_q.endswith("?") and not any(w in lower_q for w in ["explain", "difference between", "how does", "what are advantages"]):
            entities = self._extract_entities(clean_q)
            if entities:
                return ClassificationResult(
                    intent=QueryIntent.CURRENT_FACT,
                    requires_search=True,
                    requires_code_execution=False,
                    extracted_entities=entities,
                    confidence=0.88,
                    rationale="Factual question with identified entities requiring evidence verification.",
                )

        # Default: General Knowledge / Conceptual
        return ClassificationResult(
            intent=QueryIntent.GENERAL_KNOWLEDGE,
            requires_search=False,
            requires_code_execution=False,
            confidence=0.85,
            rationale="Timeless conceptual, educational, or conversational question.",
        )

    def _extract_entities(self, text: str) -> List[str]:
        # 1. Extract capitalized phrases
        entities = []
        matches = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b", text)
        for m in matches:
            if m.lower() not in ["who", "what", "where", "when", "why", "how", "the", "is", "are", "was", "were", "can", "tell", "me"]:
                entities.append(m)

        # 2. If no capitalized phrases found (e.g. lowercase input), extract key substantive words
        if not entities:
            stop_words = {
                "who", "what", "where", "when", "why", "how", "the", "is", "are", "was", "were",
                "can", "tell", "me", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for",
                "with", "that", "this", "it", "right", "correct", "true", "false", "please", "you",
                "does", "did", "do", "have", "has", "had", "be", "been", "being"
            }
            words = re.findall(r"\b[a-zA-Z0-9]{3,}\b", text.lower())
            substantive = [w for w in words if w not in stop_words]
            if substantive:
                entities.extend(substantive[:3])

        return list(dict.fromkeys(entities))

    def _extract_date(self, text: str) -> Optional[str]:
        match = re.search(r"\b(20[2-9]\d|19\d\d)\b", text)
        return match.group(1) if match else None

question_classifier = QuestionClassifier()
