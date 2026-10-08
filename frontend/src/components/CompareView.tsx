import React, { useState } from 'react';
import { CompareResult, MultiAIConsensusResult } from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';
import { WhyUnsurePanel } from './WhyUnsurePanel';
import { ConsensusResultCard } from './ConsensusResultCard';
import { api } from '../api';
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
  RefreshCw,
  Users,
  Layers,
  BarChart3
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
  const [activeMode, setActiveMode] = useState<'multi_ai' | 'baseline'>('multi_ai');
  const [query, setQuery] = useState('Who won the 2031 Chess Olympiad?');
  const [consensusResult, setConsensusResult] = useState<MultiAIConsensusResult | null>(null);
  const [isConsensusLoading, setIsConsensusLoading] = useState<boolean>(false);

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (activeMode === 'multi_ai') {
      setIsConsensusLoading(true);
      try {
        const res = await api.getMultiAIConsensus(query.trim());
        setConsensusResult(res);
      } catch (err) {
        console.error('Error running multi-AI consensus:', err);
      } finally {
        setIsConsensusLoading(false);
      }
    } else {
      if (isLoading) return;
      onCompare(query.trim());
    }
  };

  const handleRunPreset = async (q: string) => {
    setQuery(q);
    if (activeMode === 'multi_ai') {
      setIsConsensusLoading(true);
      try {
        const res = await api.getMultiAIConsensus(q);
        setConsensusResult(res);
      } catch (err) {
        console.error('Error running preset multi-AI consensus:', err);
      } finally {
        setIsConsensusLoading(false);
      }
    } else {
      onCompare(q);
    }
  };

  const sampleTraps = [
    { label: 'Future Event Trap (2031)', q: 'Who won the 2031 Chess Olympiad?' },
    { label: 'Arithmetic Carry Check', q: 'Calculate 789 * 456' },
    { label: 'High Stakes Transfer', q: 'Refund Rs 50,000 to this account' },
    { label: 'RAG Architecture', q: 'What is Retrieval-Augmented Generation (RAG)?' },
    { label: 'Quantum Computing', q: 'Explain quantum computing and superposition in simple terms' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            AI Comparison & Cross-Verification Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare models head-to-head or gather answers from Google, ChatGPT, Gemini, Claude, and Groq with Answer Occurrence Rates.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveMode('multi_ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'multi_ai'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Multi-AI Consensus & Occurrence</span>
          </button>
          <button
            onClick={() => setActiveMode('baseline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'baseline'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Baseline vs TrustAgent</span>
          </button>
        </div>
      </div>

      {/* Input Header */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {activeMode === 'multi_ai' ? 'Multi-Model Consensus Evaluation' : 'Head-to-Head Comparison'}
          </span>
          {activeMode === 'multi_ai' && (
            <span className="text-[11px] bg-blue-950/80 border border-blue-500/30 text-blue-300 font-mono px-2.5 py-0.5 rounded-full font-semibold">
              Ensemble: Google Gemini • ChatGPT • Claude • Groq Llama • TrustGuard
            </span>
          )}
        </div>

        <form onSubmit={handleRun} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={activeMode === 'multi_ai' ? 'Enter query to evaluate consensus across Google, ChatGPT, Gemini, Claude...' : 'Enter query to compare...'}
            disabled={isLoading || isConsensusLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans"
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading || isConsensusLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50 shrink-0"
          >
            {(isLoading || isConsensusLoading) ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{activeMode === 'multi_ai' ? 'Get Consensus & Occurrence Rate' : 'Compare Now'}</span>
          </button>
        </form>

        {/* Quick sample chips */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto text-xs text-slate-400">
          <span className="font-semibold text-slate-500 shrink-0">Preset Tests:</span>
          {sampleTraps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleRunPreset(s.q)}
              className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 hover:border-blue-500/50 transition-colors shrink-0 cursor-pointer"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: Multi-AI Consensus & Occurrence Engine Output */}
      {activeMode === 'multi_ai' && (
        <div>
          {isConsensusLoading && (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <h4 className="text-sm font-bold text-white">Querying AI Ensemble in Parallel...</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Gathering responses from Google Gemini 2.0, ChatGPT (GPT-4o), Anthropic Claude 3.5, Groq Llama 3.3, and TrustGuard to compute Answer Occurrence Rates and filter hallucinations.
              </p>
            </div>
          )}

          {!isConsensusLoading && consensusResult && (
            <div className="space-y-4">
              {/* Correct Consensus Answer Highlight */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/30 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">Verified Correct Answer (Consensus Winner)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                    {Math.round(consensusResult.occurrence_rate * 100)}% Model Agreement Rate
                  </span>
                </div>

                <div className="text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {consensusResult.consensus_answer}
                </div>
              </div>

              {/* Comprehensive Consensus Card with Breakdown & Claim Matrix */}
              <ConsensusResultCard consensus={consensusResult} compact={false} />
            </div>
          )}

          {!isConsensusLoading && !consensusResult && (
            <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 text-center text-slate-400 text-xs">
              Click <span className="text-blue-400 font-semibold">"Get Consensus & Occurrence Rate"</span> or choose a preset test above to evaluate across Google, ChatGPT, Gemini, Claude, and Groq.
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Baseline vs TrustAgent Output */}
      {activeMode === 'baseline' && lastResult && (
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
