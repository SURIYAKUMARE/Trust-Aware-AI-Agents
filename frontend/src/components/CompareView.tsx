import React, { useState } from 'react';
import { CompareResult } from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';
import { WhyUnsurePanel } from './WhyUnsurePanel';
import { 
  ShieldCheck, 
  AlertOctagon, 
  Clock, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight,
  RefreshCw 
} from 'lucide-react';

interface CompareViewProps {
  onCompare: (query: string) => Promise<CompareResult>;
  lastResult: CompareResult | null;
  isLoading: boolean;
}

export const CompareView: React.FC<CompareViewProps> = ({
  onCompare,
  lastResult,
  isLoading,
}) => {
  const [query, setQuery] = useState('Who won the 2031 Chess Olympiad?');

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onCompare(query.trim());
  };

  const sampleTraps = [
    { label: 'Fabricated Trap', q: 'Who won the 2031 Chess Olympiad?' },
    { label: 'High Stakes Transfer', q: 'Refund Rs 50,000 to this account' },
    { label: 'Arithmetic Carry Risk', q: 'Calculate 789 * 456' },
    { label: 'Underspecified Request', q: 'Book me a flight' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Input Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Head-to-Head Compare Mode
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Test identical queries simultaneously against the traditional uncalibrated Baseline Agent and the confidence-aware TrustAgent.
        </p>

        <form onSubmit={handleRun} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter query to compare..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Compare Now</span>
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto text-xs text-slate-400">
          <span className="font-semibold text-slate-500">Preset Tests:</span>
          {sampleTraps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => { setQuery(s.q); onCompare(s.q); }}
              className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 hover:border-blue-500/50 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Grid */}
      {lastResult && (
        <div className="space-y-4">
          {/* Hallucination / Failure Prevention Banner */}
          {lastResult.hallucination_prevented ? (
            <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-start gap-3 shadow-lg glow-emerald">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-200">
                  Hallucination / Critical Failure Prevented by TrustAgent!
                </h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  {lastResult.rationale}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-300 flex items-start gap-3 shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-blue-200">
                  Reliable Convergence
                </h4>
                <p className="text-xs text-blue-300/90 mt-0.5">
                  {lastResult.rationale}
                </p>
              </div>
            </div>
          )}

          {/* Side by Side Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Baseline Agent Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-950/60 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400 font-mono">
                      Traditional Agent
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">Baseline Agent</h3>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-950 border border-rose-500/30 text-rose-400">
                    Uncalibrated (100% Blind Certainty)
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                      Reported Output:
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-sm text-slate-300 leading-relaxed font-sans">
                      {lastResult.baseline_answer}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/30 text-xs text-rose-300/90 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>No confidence check, no claim verification, no guardrails.</span>
                  </div>
                </div>
              </div>

              {/* Stats footer */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {Math.round(lastResult.baseline_latency_ms)}ms
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> ${lastResult.baseline_cost_usd.toFixed(5)}
                </span>
              </div>
            </div>

            {/* 2. TrustAgent Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-blue-900/50 shadow-xl flex flex-col justify-between glow-blue">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      Confidence-Aware System
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">TrustAgent</h3>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                    {Math.round(lastResult.trust_trace.final_confidence * 100)}% Calibrated ({lastResult.trust_trace.final_route})
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                      Calibrated Output & Action:
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-sm text-slate-200 leading-relaxed font-sans font-medium">
                      {lastResult.trust_trace.answer}
                    </div>
                  </div>

                  {/* Why unsure mini */}
                  <WhyUnsurePanel report={lastResult.trust_trace.confidence_report} defaultOpen={false} />
                </div>
              </div>

              {/* Stats footer */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {Math.round(lastResult.trust_trace.latency_ms)}ms
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> ${lastResult.trust_trace.cost_usd.toFixed(5)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
