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
    evidence_quality: Optional[float] = None
    source_reliability: Optional[float] = None
    model_agreement: Optional[float] = None
    reasoning_consistency: Optional[float] = None
    risk_level: Optional[str] = None
    agents_engaged: List[str] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)

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
    selected_model: Optional[str] = None
    sources: List[str] = Field(default_factory=list)

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
    model_profile: Optional[str] = "auto"
    history: Optional[List[Dict[str, str]]] = None
    attached_files: Optional[List[Dict[str, Any]]] = None

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


# Token Saver & Context Compression Schemas
class TokenSaverMode(str, Enum):
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"
    COMPACT = "compact"  # Key-Value / Caveman mode
    LOSSLESS = "lossless"

class CompressRequest(BaseModel):
    text: str
    mode: TokenSaverMode = TokenSaverMode.BALANCED
    preserve_code: bool = True
    redact_sensitive: bool = True
    target_token_budget: Optional[int] = None

class CompressResponse(BaseModel):
    original_text: str
    compressed_text: str
    original_tokens: int
    compressed_tokens: int
    saved_tokens: int
    compression_ratio: float  # e.g., 0.62 means 62% tokens saved
    estimated_cost_saved_usd: float
    mode: str
    critical_facts_retained: List[str] = Field(default_factory=list)
    redacted_items_count: int = 0
    processing_time_ms: float = 0.0

class TokenAnalyticsResponse(BaseModel):
    total_compressions: int
    total_original_tokens: int
    total_compressed_tokens: int
    total_saved_tokens: int
    avg_compression_ratio: float
    total_cost_saved_usd: float
    cache_hits: int
    cache_misses: int
    cache_hit_rate: float


# Extension & Independent Verification Schemas
class AnalyzeMode(str, Enum):
    QUICK = "quick"
    DEEP = "deep"
    FACT = "fact"
    CODE = "code"
    MATH = "math"
    RESEARCH = "research"
    HIGH_RISK = "high_risk"

class ClaimAnalysisItem(BaseModel):
    claim: str
    status: ClaimStatus
    confidence: float
    source: Optional[str] = None
    snippet: Optional[str] = None
    category: Optional[str] = "fact"  # fact, logic, math, code, safety
    is_cached: bool = False

class AnalyzeRequest(BaseModel):
    prompt: Optional[str] = None
    response: Optional[str] = None
    question: Optional[str] = None
    answer: Optional[str] = None
    context: Optional[str] = None
    provider: Optional[str] = "generic"  # chatgpt, gemini, claude, perplexity, generic
    mode: AnalyzeMode = AnalyzeMode.QUICK
    url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def model_post_init(self, __context):
        if not self.prompt and self.question:
            self.prompt = self.question
        elif not self.prompt:
            self.prompt = "User Query"
        if not self.response and self.answer:
            self.response = self.answer
        elif not self.response:
            self.response = ""

class AnalyzeScreenRequest(BaseModel):
    extracted_text: Optional[str] = ""
    source_app: Optional[str] = "tab"  # tab, window, screen
    mode: AnalyzeMode = AnalyzeMode.QUICK
    image_base64: Optional[str] = None

class AnalyzeResponse(BaseModel):
    analysis_id: str
    query: str
    response_text: str
    trust_score: float  # 0.0 to 100.0
    trust_label: str  # HIGH TRUST, MEDIUM TRUST, LOW TRUST, UNVERIFIED, CRITICAL RISK
    trust_level: Optional[str] = None
    claims_checked: Optional[int] = 0
    claims_verified: Optional[int] = 0
    uncertain_claims: Optional[int] = 0
    contradictions: Optional[int] = 0
    reasons: Optional[List[str]] = Field(default_factory=list)
    recommendation: Optional[str] = None
    sources: Optional[List[str]] = Field(default_factory=list)
    mode: str
    provider: str
    claims: List[ClaimAnalysisItem] = Field(default_factory=list)
    summary: str
    factual_consistency: float = 1.0
    evidence_consistency: float = 1.0
    contradiction_count: int = 0
    uncertainty_score: float = 0.0
    suggested_correction: Optional[str] = None
    verified_answer: Optional[str] = None
    tokens_saved: int = 0
    cached: bool = False
    latency_ms: float = 0.0


# --- 13. MULTI-AI CONSENSUS & ANSWER OCCURRENCE RATE SCHEMAS ---

class AIModelAnswer(BaseModel):
    model_name: str
    provider: str  # google, openai, anthropic, groq, perplexity, trustguard
    answer: str
    confidence: float
    latency_ms: float
    agrees_with_consensus: bool
    occurrence_cluster: str
    key_claims: List[str] = Field(default_factory=list)

class ClaimOccurrence(BaseModel):
    claim: str
    occurrence_rate: float  # 0.0 to 1.0 (e.g., 0.80 = 80%)
    supporting_models: List[str] = Field(default_factory=list)
    dissenting_models: List[str] = Field(default_factory=list)
    status: Literal["VERIFIED_CONSENSUS", "MAJORITY_SUPPORTED", "DISPUTED", "REFUTED"]

class MultiAIConsensusRequest(BaseModel):
    query: str
    models_to_query: Optional[List[str]] = None


# --- 14. ASK & VERIFY SCHEMAS ---

class AskAndVerifyRequest(BaseModel):
    question: str
    mode: Optional[str] = "fact"          # verification mode after generation
    provider: Optional[str] = "trustguard"

class AskAndVerifyResponse(BaseModel):
    question: str
    ai_answer: str                         # the LLM-generated answer
    trust_score: float                     # 0.0 – 100.0
    trust_label: str                       # HIGH TRUST / MEDIUM TRUST / LOW TRUST / UNVERIFIED
    verdict: str                           # "REAL INFORMATION" | "LIKELY REAL" | "UNCERTAIN" | "FAKE INFORMATION"
    verdict_color: str                     # "green" | "amber" | "red"
    summary: str                           # one-line human-readable verdict explanation
    claims_checked: int
    claims_verified: int
    contradictions: int
    suggested_correction: Optional[str] = None
    sources: List[str] = Field(default_factory=list)
    latency_ms: float = 0.0

class MultiAIConsensusResponse(BaseModel):
    query: str
    consensus_answer: str
    occurrence_rate: float  # 0.0 to 1.0 (e.g. 0.80 = 80%)
    total_models_queried: int
    agreeing_models_count: int
    consensus_level: Literal["UNANIMOUS", "STRONG_CONSENSUS", "MAJORITY", "DIVIDED", "OUTLIER_REJECTED", "REFUTED"]
    model_answers: List[AIModelAnswer]
    claim_occurrences: List[ClaimOccurrence] = Field(default_factory=list)
    outlier_warnings: List[str] = Field(default_factory=list)
    synthesis_rationale: str
    latency_ms: float


# --- 15. PRODUCTION REAL-TIME CHAT & FACT VERIFICATION SCHEMAS ---

class SourceCitation(BaseModel):
    title: str
    url: str
    domain: str
    published_date: Optional[str] = None
    authority_score: float = 0.70
    is_primary: bool = False
    snippet: Optional[str] = None

class VerifiedClaimItem(BaseModel):
    claim: str
    status: Literal["SUPPORTED", "PARTIALLY_SUPPORTED", "CONTRADICTED", "UNVERIFIABLE", "OUTDATED", "NOT_APPLICABLE"]
    supporting_snippet: Optional[str] = None
    source_url: Optional[str] = None
    source_domain: Optional[str] = None
    confidence: float = 0.85
    reasoning: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list)
    attached_files: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    mode: Optional[str] = "auto"  # 'auto', 'search', 'verify', 'code'

class ChatResponse(BaseModel):
    id: str
    message: str
    intent: str
    confidence_score: int  # 0 to 100
    confidence_band: str   # 'High evidence confidence' | 'Good evidence, some limitations' | 'Mixed or incomplete evidence' | 'Low evidence confidence' | 'No usable verification evidence'
    confidence_explanation: str
    status_summary: str
    claims: List[VerifiedClaimItem] = Field(default_factory=list)
    sources: List[SourceCitation] = Field(default_factory=list)
    independent_sources_count: int = 0
    contradictions_detected: List[str] = Field(default_factory=list)
    code_review: Optional[Dict[str, Any]] = None
    prompt_review: Optional[Dict[str, Any]] = None
    self_correction: Optional[Dict[str, Any]] = None
    verified_at: str
    latency_ms: float = 0.0
    live_verification_active: bool = True

class FeedbackDisputeRequest(BaseModel):
    session_id: Optional[str] = None
    message_id: Optional[str] = None
    dispute_message: str  # e.g. "Your answer is wrong. Droupadi Murmu took office in 2022"
    previous_question: str
    previous_answer: str
    previous_confidence: Optional[int] = 85

class FeedbackDisputeResponse(BaseModel):
    verdict: str
    detected_issue: str
    previous_answer: str
    previous_confidence: int
    corrected_answer: str
    updated_confidence: int
    updated_band: str
    reason_for_change: str
    evidence_links: List[Dict[str, str]] = Field(default_factory=list)
    timestamp: str

class CodeReviewApiRequest(BaseModel):
    code: str
    filename: Optional[str] = None
    error_log: Optional[str] = None
    context: Optional[str] = None

class PromptReviewApiRequest(BaseModel):
    prompt: str


