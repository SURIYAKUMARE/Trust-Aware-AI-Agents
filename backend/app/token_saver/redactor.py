"""
Sensitive Data Redactor for TrustGuard AI.
Scans and redacts sensitive credentials, private keys, API keys, tokens, and PII
before context processing or transmission.
"""

import re
from typing import Tuple, List, Dict, Any

# Pattern definitions for sensitive credentials
PATTERNS = [
    # OpenAI & generic AI sk- keys
    (r"\bsk-[a-zA-Z0-9_\-]{20,}\b", "[REDACTED_API_KEY]"),
    # Anthropic sk-ant- keys
    (r"\bsk-ant-[a-zA-Z0-9_\-]{20,}\b", "[REDACTED_ANTHROPIC_KEY]"),
    # Google API Key (AIza...)
    (r"\bAIza[0-9A-Za-z\-_]{35}\b", "[REDACTED_GOOGLE_KEY]"),
    # GitHub Personal Access Token (classic & fine-grained)
    (r"\bghp_[a-zA-Z0-9]{36}\b", "[REDACTED_GITHUB_PAT]"),
    (r"\bgithub_pat_[a-zA-Z0-9_]{50,}\b", "[REDACTED_GITHUB_PAT]"),
    # AWS Access Key ID
    (r"\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b", "[REDACTED_AWS_KEY]"),
    # Bearer Token
    (r"(?i)\bBearer\s+[a-zA-Z0-9_\-\.]{24,}\b", "Bearer [REDACTED_TOKEN]"),
    # Private Key blocks
    (r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----", "[REDACTED_PRIVATE_KEY]"),
    # Password assignments in code/JSON
    (r"""(?i)(["']?(?:password|passwd|secret|api_key|access_token|client_secret)["']?\s*[:=]\s*["'])([^"']{4,})(["'])""", r"\1[REDACTED_SECRET]\3"),
    # Credit Card numbers (Visa, MC, Amex, Discover formats)
    (r"\b(?:\d{4}[ -]?){3}\d{4}\b", "[REDACTED_CREDIT_CARD]"),
    # US Social Security Number
    (r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]"),
]

def redact_sensitive_data(text: str) -> Tuple[str, int, List[str]]:
    """
    Scans text and redacts detected secrets and sensitive tokens.
    Returns:
        (sanitized_text, total_redactions_count, categories_redacted)
    """
    if not text:
        return text, 0, []

    redacted_text = text
    total_count = 0
    categories: List[str] = []

    for pattern, replacement in PATTERNS:
        matches = re.findall(pattern, redacted_text)
        if matches:
            count = len(matches)
            total_count += count
            
            # Record category from replacement tag
            clean_tag = replacement.replace("[", "").replace("]", "").replace("\\1", "").replace("\\3", "")
            if clean_tag not in categories:
                categories.append(clean_tag.strip())

            redacted_text = re.sub(pattern, replacement, redacted_text)

    return redacted_text, total_count, categories
