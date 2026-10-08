from enum import Enum
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    VERY_LOW = "VERY_LOW"

class UncertaintyType(str, Enum):
    KNOWLEDGE_GAP = "knowledge_gap"
    AMBIGUITY = "ambiguity"
    REASONING_RISK = "reasoning_risk"
    CONFLICT = "conflict"
    HIGH_STAKES = "high_stakes"
    NONE = "none"

class ActionRoute(str, Enum):
    ANSWER = "ANSWER"
    VERIFY = "VERIFY"
    CLARIFY = "CLARIFY"
    SEARCH = "SEARCH"
    HANDOFF = "HANDOFF"
    ABSTAIN = "ABSTAIN"
    ESCALATE = "ESCALATE"

class ClaimStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    NO_EVIDENCE = "NO_EVIDENCE"

class ClaimVerification(BaseModel):
    claim: str
    status: ClaimStatus
    snippet: Optional[str] = None
    source: Optional[str] = None
    confidence: float = 1.0
    is_human_verified: bool = False

class SentenceVerification(BaseModel):
    sentence: str
    status: ClaimStatus
    score: float = 1.0  # 1.0 for SUPPORTED, 0.4 for NO_EVIDENCE, 0.05 for CONTRADICTED
    snippet: Optional[str] = None
    source: Optional[str] = None
    is_human_verified: bool = False

class ScorerSignal(BaseModel):
    scorer: str  # "self_consistency", "verbalized", "evidence", "reasoning_check"
    score: float = Field(ge=0.0, le=1.0)
    weight: float
    reasons: List[str] = Field(default_factory=list)
    details: Dict[str, Any] = Field(default_factory=dict)

class ConfidenceReport(BaseModel):
    raw_score: float = Field(ge=0.0, le=1.0)
    calibrated_score: float = Field(ge=0.0, le=1.0)
    level: ConfidenceLevel
    uncertainty_type: UncertaintyType
    signals: List[ScorerSignal] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)
    claims: List[ClaimVerification] = Field(default_factory=list)
    sentences: List[SentenceVerification] = Field(default_factory=list)
    plain_explanation: str = ""
    has_human_verified_evidence: bool = False

class TraceStep(BaseModel):
    step_index: int
    action: ActionRoute
    input_summary: str
    tool_name: Optional[str] = None
    tool_input: Optional[str] = None
    tool_output: Optional[str] = None
    confidence_score: float
    confidence_level: ConfidenceLevel
    thought: str

class DecisionTrace(BaseModel):
    trace_id: str
    query: str
    initial_confidence: float
    final_confidence: float
    confidence_trajectory: List[float] = Field(default_factory=list)
    final_route: ActionRoute
    answer: str
    steps: List[TraceStep] = Field(default_factory=list)
    confidence_report: ConfidenceReport
    cost_usd: float = 0.0
    latency_ms: float = 0.0
    tools_used: List[str] = Field(default_factory=list)
    iteration_count: int = 1
    requires_human_approval: bool = False
    escalation_id: Optional[str] = None

class EscalationItem(BaseModel):
    id: str
    trace_id: str
    query: str
    proposed_action: str
    risk_category: str
    confidence_score: float
    status: Literal["PENDING", "APPROVED", "REJECTED", "EDITED"] = "PENDING"
    human_note: Optional[str] = None
    edited_action: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None

class CompareResult(BaseModel):
    query: str
    baseline_answer: str
    baseline_latency_ms: float
    baseline_cost_usd: float
    trust_trace: DecisionTrace
    hallucination_prevented: bool
    rationale: str

# API Schemas
class AskRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class BaselineRequest(BaseModel):
    query: str

class CompareRequest(BaseModel):
    query: str

class EscalationResolveRequest(BaseModel):
    action: Literal["APPROVE", "REJECT", "EDIT"]
    human_note: Optional[str] = None
    edited_action: Optional[str] = None

class ReliabilityBin(BaseModel):
    bin_center: float
    confidence: float
    accuracy: float
    count: int

class MetricsResponse(BaseModel):
    total_queries: int
    route_distribution: Dict[str, int]
    confidence_histogram: Dict[str, int]
    reliability_diagram: List[ReliabilityBin]
    ece: float
    brier_score: float
    escalation_rate: float
    abstain_rate: float
    avg_latency_ms: float
    avg_cost_usd: float
    drift_alert: bool
    drift_details: Optional[Dict[str, Any]] = None

class SimulationRequest(BaseModel):
    high_threshold: float = 0.85
    low_threshold: float = 0.45

class SimulationResponse(BaseModel):
    high_threshold: float
    low_threshold: float
    hallucination_rate: float
    failed_decision_rate: float
    escalation_rate: float
    abstain_rate: float
    selective_accuracy: float
