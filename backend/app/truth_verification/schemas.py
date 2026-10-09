"""Truth Verification Engine Data Contracts."""
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class VerificationStatus(str, Enum):
    CORRECT = "CORRECT"
    INCORRECT = "INCORRECT"
    PARTIALLY_CORRECT = "PARTIALLY_CORRECT"
    OUTDATED = "OUTDATED"
    UNVERIFIED = "UNVERIFIED"
    CONFLICTING_EVIDENCE = "CONFLICTING_EVIDENCE"
    NOT_APPLICABLE = "NOT_APPLICABLE"

class VerificationDomain(str, Enum):
    MATHEMATICS = "MATHEMATICS"
    PROGRAMMING = "PROGRAMMING"
    COMPUTER_SCIENCE = "COMPUTER_SCIENCE"
    HISTORY = "HISTORY"
    GEOGRAPHY = "GEOGRAPHY"
    SCIENCE = "SCIENCE"
    CURRENT_AFFAIRS = "CURRENT_AFFAIRS"
    GENERAL_KNOWLEDGE = "GENERAL_KNOWLEDGE"
    OPINION_PREFERENCE = "OPINION_PREFERENCE"
    AMBIGUOUS = "AMBIGUOUS"

class SourceEvidenceItem(BaseModel):
    title: str
    url: str
    domain: str
    snippet: str
    authority_score: float = 0.8
    published_date: Optional[str] = None
    is_primary: bool = False

class TruthVerificationReport(BaseModel):
    status: VerificationStatus
    domain: VerificationDomain
    user_claim: str
    correct_information: str
    why_explanation: str
    verification_method: str
    evidence_sources: List[SourceEvidenceItem] = Field(default_factory=list)
    computational_proof: Optional[str] = None
    evidence_confidence: int = Field(ge=0, le=100)
    confidence_band: str = "High evidence confidence"
    formatted_markdown: str
    is_opinion: bool = False
    requires_clarification: bool = False
    reverified: bool = False
