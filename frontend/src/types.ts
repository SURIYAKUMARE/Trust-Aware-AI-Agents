export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';

export type UncertaintyType = 
  | 'knowledge_gap' 
  | 'ambiguity' 
  | 'reasoning_risk' 
  | 'conflict' 
  | 'high_stakes' 
  | 'none';

export type ActionRoute = 
  | 'ANSWER' 
  | 'VERIFY' 
  | 'CLARIFY' 
  | 'SEARCH' 
  | 'HANDOFF' 
  | 'ABSTAIN' 
  | 'ESCALATE';

export type ClaimStatus = 'SUPPORTED' | 'CONTRADICTED' | 'NO_EVIDENCE';

export type ModelProfile = 'auto' | 'fast' | 'reasoning' | 'coding' | 'vision';

export interface ClaimVerification {
  claim: string;
  status: ClaimStatus;
  snippet?: string;
  source?: string;
  confidence: number;
  is_human_verified?: boolean;
}

export interface SentenceVerification {
  sentence: string;
  status: ClaimStatus;
  score: number;
  snippet?: string;
  source?: string;
  is_human_verified?: boolean;
}

export interface ScorerSignal {
  scorer: string;
  score: number;
  weight: number;
  reasons: string[];
  details: Record<string, any>;
}

export interface ConfidenceReport {
  raw_score: number;
  calibrated_score: number;
  level: ConfidenceLevel;
  uncertainty_type: UncertaintyType;
  signals: ScorerSignal[];
  reasons: string[];
  claims: ClaimVerification[];
  sentences?: SentenceVerification[];
  plain_explanation: string;
  has_human_verified_evidence?: boolean;
  evidence_quality?: number;
  source_reliability?: number;
  model_agreement?: number;
  reasoning_consistency?: number;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  agents_engaged?: string[];
  sources?: string[];
}

export interface TraceStep {
  step_index: number;
  action: ActionRoute;
  input_summary: string;
  tool_name?: string;
  tool_input?: string;
  tool_output?: string;
  confidence_score: number;
  confidence_level: ConfidenceLevel;
  thought: string;
}

export interface DecisionTrace {
  trace_id: string;
  query: string;
  initial_confidence: number;
  final_confidence: number;
  confidence_trajectory: number[];
  final_route: ActionRoute;
  answer: string;
  steps: TraceStep[];
  confidence_report: ConfidenceReport;
  cost_usd: number;
  latency_ms: number;
  tools_used: string[];
  iteration_count: number;
  requires_human_approval: boolean;
  escalation_id?: string;
  selected_model?: string;
  sources?: string[];
}

export interface CompareResult {
  query: string;
  baseline_answer: string;
  baseline_latency_ms: number;
  baseline_cost_usd: number;
  trust_trace: DecisionTrace;
  hallucination_prevented: boolean;
  rationale: string;
}

export interface EscalationItem {
  id: string;
  trace_id: string;
  query: string;
  proposed_action: string;
  risk_category: string;
  confidence_score: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EDITED';
  human_note?: string;
  edited_action?: string;
  created_at: string;
  resolved_at?: string;
}

export interface ReliabilityBin {
  bin_center: number;
  confidence: number;
  accuracy: number;
  count: number;
}

export interface MetricsResponse {
  total_queries: number;
  route_distribution: Record<string, number>;
  confidence_histogram: Record<string, number>;
  reliability_diagram: ReliabilityBin[];
  ece: number;
  brier_score: number;
  escalation_rate: number;
  abstain_rate: number;
  avg_latency_ms: number;
  avg_cost_usd: number;
  drift_alert: boolean;
  drift_details?: Record<string, any>;
}

export interface DemoScenario {
  id: number;
  name: string;
  description: string;
  query: string;
}

export interface SimulationRequest {
  high_threshold: number;
  low_threshold: number;
}

export interface SimulationResponse {
  high_threshold: number;
  low_threshold: number;
  hallucination_rate: number;
  failed_decision_rate: number;
  escalation_rate: number;
  abstain_rate: number;
  selective_accuracy: number;
}

export interface AdversarialPreset {
  id: number;
  category: string;
  title: string;
  prompt: string;
  trap_type: string;
  baseline_behavior: string;
  trust_behavior: string;
}

// Conversational Chat Models & Sessions
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
  status: 'uploading' | 'processed' | 'error';
  summary?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  trace?: DecisionTrace;
  feedback?: 'helpful' | 'unhelpful';
  attachedFiles?: UploadedFile[];
  isStreaming?: boolean;
  sources?: string[];
}

export interface ConversationSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  isArchived?: boolean;
  modelProfile: ModelProfile;
}

export interface PromptTemplate {
  id: string;
  title: string;
  category: string;
  prompt: string;
  icon?: string;
}

// Token Saver & Compression Interfaces
export type TokenSaverMode = 'balanced' | 'aggressive' | 'compact' | 'lossless';

export interface CompressRequest {
  text: string;
  mode?: TokenSaverMode;
  preserve_code?: boolean;
  redact_sensitive?: boolean;
  target_token_budget?: number;
}

export interface CompressResponse {
  original_text: string;
  compressed_text: string;
  original_tokens: number;
  compressed_tokens: number;
  saved_tokens: number;
  compression_ratio: number;
  estimated_cost_saved_usd: number;
  mode: string;
  critical_facts_retained: string[];
  redacted_items_count: number;
  processing_time_ms: number;
}

export interface TokenAnalyticsResponse {
  total_compressions: number;
  total_original_tokens: number;
  total_compressed_tokens: number;
  total_saved_tokens: number;
  avg_compression_ratio: number;
  total_cost_saved_usd: number;
  cache_hits: number;
  cache_misses: number;
  cache_hit_rate: number;
}

// Browser Extension & Independent Verification Interfaces
export type AnalyzeMode = 'quick' | 'deep' | 'fact' | 'code' | 'math' | 'research' | 'high_risk';

export interface ClaimAnalysisItem {
  claim: string;
  status: 'SUPPORTED' | 'CONTRADICTED' | 'NO_EVIDENCE';
  confidence: number;
  source?: string;
  snippet?: string;
  category?: string;
  is_cached?: boolean;
}

export interface AnalyzeRequest {
  prompt: string;
  response: string;
  provider?: string;
  mode?: AnalyzeMode;
  url?: string;
  metadata?: Record<string, any>;
}

export interface AnalyzeScreenRequest {
  extracted_text: string;
  source_app?: string;
  mode?: AnalyzeMode;
  image_base64?: string;
}

export interface AnalyzeResponse {
  analysis_id: string;
  query: string;
  response_text: string;
  trust_score: number;
  trust_label: string;
  mode: string;
  provider: string;
  claims: ClaimAnalysisItem[];
  summary: string;
  factual_consistency: number;
  evidence_consistency: number;
  contradiction_count: number;
  uncertainty_score: number;
  suggested_correction?: string;
  verified_answer?: string;
  tokens_saved: number;
  cached: boolean;
  latency_ms: number;
}

