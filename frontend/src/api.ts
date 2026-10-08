import { 
  DecisionTrace, 
  CompareResult, 
  EscalationItem, 
  MetricsResponse, 
  DemoScenario,
  SimulationResponse,
  AdversarialPreset,
} from './types';

const API_BASE = '/api';

export const api = {
  async ask(query: string, sessionId?: string): Promise<DecisionTrace> {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, session_id: sessionId }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}: ${await res.text()}`);
    return res.json();
  },

  async baseline(query: string): Promise<any> {
    const res = await fetch(`${API_BASE}/baseline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async compare(query: string): Promise<CompareResult> {
    const res = await fetch(`${API_BASE}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getTrace(traceId: string): Promise<DecisionTrace> {
    const res = await fetch(`${API_BASE}/trace/${traceId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async listTraces(): Promise<DecisionTrace[]> {
    const res = await fetch(`${API_BASE}/traces`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async listEscalations(): Promise<EscalationItem[]> {
    const res = await fetch(`${API_BASE}/escalations`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async resolveEscalation(
    id: string, 
    action: 'APPROVE' | 'REJECT' | 'EDIT', 
    note?: string, 
    editedAction?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/escalations/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, human_note: note, edited_action: editedAction }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getMetrics(): Promise<MetricsResponse> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async simulateThresholds(highThreshold: number, lowThreshold: number): Promise<SimulationResponse> {
    const res = await fetch(`${API_BASE}/metrics/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ high_threshold: highThreshold, low_threshold: lowThreshold }),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getEvalResults(): Promise<any> {
    const res = await fetch(`${API_BASE}/eval/results`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async runDemoScenario(id: number): Promise<CompareResult> {
    const res = await fetch(`${API_BASE}/demo/${id}`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async listDemoScenarios(): Promise<DemoScenario[]> {
    const res = await fetch(`${API_BASE}/demo/scenarios`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getAdversarialPresets(): Promise<AdversarialPreset[]> {
    const res = await fetch(`${API_BASE}/adversarial/presets`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },
};

