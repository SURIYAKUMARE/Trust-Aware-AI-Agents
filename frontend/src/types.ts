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

