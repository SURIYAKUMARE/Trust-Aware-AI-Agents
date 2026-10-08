import React from 'react';
import { 
  Cpu, 
  Layers, 
  Scale, 
  FileText, 
  ShieldAlert, 
  CheckCircle, 
  HelpCircle, 
  Search, 
  Wrench, 
  Activity, 
  Database, 
  UserCheck, 
  ArrowRight, 
  GitBranch,
  Bot
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full">
      {/* Title */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-blue-400" />
          TrustAgent System Architecture & Decision Flow
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          End-to-end blueprint detailing multi-scorer confidence estimation, isotonic calibration, automated uncertainty-aware routing, and human-in-the-loop escalation.
        </p>
      </div>

      {/* Visual Pipeline Flowchart */}
      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl space-y-6">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500">
          Core Execution Pipeline
        </h3>

        {/* 1. Input & Risk Classifier */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs font-mono text-blue-400 font-bold block mb-1">STAGE 1</span>
            <h4 className="text-sm font-bold text-white">User Query & Intent</h4>
            <p className="text-[11px] text-slate-400 mt-1">Query ingestion & session state</p>
          </div>

          <div className="flex justify-center text-slate-600">
            <ArrowRight className="w-6 h-6 rotate-90 md:rotate-0 text-slate-500" />
          </div>

          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-center">
            <span className="text-xs font-mono text-rose-400 font-bold block mb-1">STAGE 2 (GUARDRAIL)</span>
            <h4 className="text-sm font-bold text-rose-200">Risk Classifier (risk.py)</h4>
            <p className="text-[11px] text-rose-300/80 mt-1">Financial / Deletion / Medical / Legal filter</p>
          </div>
        </div>

        {/* 2. Confidence Engine (4 Scorers) */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-blue-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-blue-400 font-bold">STAGE 3: MULTI-SIGNAL CONFIDENCE ENGINE</span>
            <span className="text-[11px] font-mono text-slate-400">Sum of weights = 1.0</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-purple-400" />
                <h5 className="text-xs font-bold text-white">Self-Consistency</h5>
              </div>
              <p className="text-[11px] text-slate-400">
                Sample N=5 answers (temp 0.8), embed with all-MiniLM-L6-v2, cluster by cosine similarity.
              </p>
              <span className="inline-block mt-2 text-[10px] font-mono text-purple-400">Weight: 35%</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h5 className="text-xs font-bold text-white">Evidence Support</h5>
              </div>
              <p className="text-[11px] text-slate-400">
                Extract atomic claims, verify against ChromaDB RAG & tools (Supported / Contradicted).
              </p>
              <span className="inline-block mt-2 text-[10px] font-mono text-emerald-400">Weight: 30%</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-amber-400" />
                <h5 className="text-xs font-bold text-white">Verbalized Rubric</h5>
              </div>
              <p className="text-[11px] text-slate-400">
                Multi-attribute JSON rubric (knowledge coverage, ambiguity, reasoning, risk).
              </p>
              <span className="inline-block mt-2 text-[10px] font-mono text-amber-400">Weight: 20%</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-blue-400" />
                <h5 className="text-xs font-bold text-white">Reasoning Check</h5>
              </div>
              <p className="text-[11px] text-slate-400">
                Symbolic logic and arithmetic check on both reasoning chain and planned actions.
              </p>
              <span className="inline-block mt-2 text-[10px] font-mono text-blue-400">Weight: 15%</span>
            </div>
          </div>
        </div>

        {/* 3. Aggregation & Calibration */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Aggregator & Isotonic Calibrator (calibration.py)</h4>
              <p className="text-xs text-slate-400">
                Maps raw ensemble score through fitted Isotonic Regression to empirical true probability. Diagnoses Uncertainty Type.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 font-mono text-xs border border-emerald-500/30">
            ECE &lt; 0.05
          </span>
        </div>

        {/* 4. Automated Decision Router */}
        <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <span className="text-xs font-mono text-blue-400 font-bold">STAGE 4: AUTOMATED DECISION ROUTING MATRIX</span>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 text-center text-xs">
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
              <p className="font-mono font-bold">&ge; 0.85</p>
              <h5 className="font-bold text-sm text-white mt-1">ANSWER</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">Authoritative direct response</p>
            </div>

            <div className="p-3 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300">
              <p className="font-mono font-bold">0.65 - 0.85</p>
              <h5 className="font-bold text-sm text-white mt-1">VERIFY</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">SymPy / Python / RAG / Search</p>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-300">
              <p className="font-mono font-bold">0.45 - 0.65</p>
              <h5 className="font-bold text-sm text-white mt-1">CLARIFY / SEARCH</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">Ask targeted query or web query</p>
            </div>

            <div className="p-3 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300">
              <p className="font-mono font-bold">0.30 - 0.45</p>
              <h5 className="font-bold text-sm text-white mt-1">HANDOFF</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">Math/Code or Safety Specialist</p>
            </div>

            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300">
              <p className="font-mono font-bold">&lt; 0.30 or Critical</p>
              <h5 className="font-bold text-sm text-white mt-1">ABSTAIN / ESCALATE</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">Honest decline or human queue</p>
            </div>
          </div>
        </div>

        {/* 5. Production Monitoring & Telemetry */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Continuous Telemetry & Drift Detection (drift.py)</h4>
              <p className="text-xs text-slate-400">
                Logs all decision traces to SQLite, updates reliability bins, and triggers alerts if rolling ECE &gt; 0.10.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">SQLite + SQLAlchemy</span>
        </div>
      </div>
    </div>
  );
};
