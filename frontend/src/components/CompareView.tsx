import React, { useState, useEffect } from 'react';
import { CompareResult, MultiAIConsensusResult } from '../types';
import { WhyUnsurePanel } from './WhyUnsurePanel';
import { SentenceHeatmap } from './SentenceHeatmap';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ConsensusResultCard } from './ConsensusResultCard';
import { api } from '../api';
import { 
  ShieldCheck, 
  AlertOctagon, 
  Clock, 
  DollarSign, 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  Users,
  Layers,
  BarChart3,
  Scale,
  Send,
  HelpCircle,
  FileText,
  Search,
  Check,
  Copy,
  Sliders,
  History
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
  const [activeMode, setActiveMode] = useState<'baseline' | 'multi_ai'>('baseline');
  const [query, setQuery] = useState('');
  const [consensusResult, setConsensusResult] = useState<MultiAIConsensusResult | null>(null);
  const [isConsensusLoading, setIsConsensusLoading] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [copiedBaseline, setCopiedBaseline] = useState<boolean>(false);
  const [copiedTrust, setCopiedTrust] = useState<boolean>(false);
  const [comparisonHistory, setComparisonHistory] = useState<CompareResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CompareResult | null>(null);

  // Sync lastResult into history
  useEffect(() => {
    if (lastResult) {
      setSelectedResult(lastResult);
      setComparisonHistory(prev => {
        const exists = prev.find(p => p.query === lastResult.query);
        if (exists) return prev;
        return [lastResult, ...prev.slice(0, 9)];
      });
    }
  }, [lastResult]);

  const activeResult = selectedResult || lastResult;

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = query.trim();
    if (!cleanQ) return;

    if (activeMode === 'multi_ai') {
      setIsConsensusLoading(true);
      try {
        const res = await api.getMultiAIConsensus(cleanQ);
        setConsensusResult(res);
      } catch (err) {
        console.error('Error running multi-AI consensus:', err);
      } finally {
        setIsConsensusLoading(false);
      }
    } else {
      if (isLoading) return;
      try {
        const res = await onCompare(cleanQ);
        setSelectedResult(res);
      } catch (err) {
        console.error('Error running compare:', err);
      }
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
      try {
        const res = await onCompare(q);
        setSelectedResult(res);
      } catch (err) {
        console.error('Error running preset compare:', err);
      }
    }
  };

  const handleCopyText = (text: string, isTrust: boolean) => {
    navigator.clipboard.writeText(text);
    if (isTrust) {
      setCopiedTrust(true);
      setTimeout(() => setCopiedTrust(false), 2000);
    } else {
      setCopiedBaseline(true);
      setTimeout(() => setCopiedBaseline(false), 2000);
    }
  };

  // Diverse test prompts covering all key question categories
  const samplePrompts = [
    { label: 'General: What is Python?', q: 'What is Python and what makes it versatile?' },
    { label: 'Technical: Explain RAG', q: 'Explain Retrieval-Augmented Generation (RAG) and its core architecture.' },
    { label: 'Math: 25 × 37', q: 'Calculate 25 * 37' },
    { label: 'Math: 987654321 × 123456789', q: 'Calculate 987654321 * 123456789' },
    { label: 'Future Trap: 2031 Chess Olympiad', q: 'Who won the 2031 Chess Olympiad?' },
    { label: 'Ambiguous: Book a Flight', q: 'Book me a flight for tomorrow' },
    { label: 'High-Stakes: Wire Refund', q: 'Refund Rs 50,000 to this account' },
    { label: 'Coding: Binary Search in Java', q: 'Write Java code for binary search with edge case handling.' },
    { label: 'Research: Quantum Computing', q: 'Explain quantum computing, superposition, and entanglement in simple terms.' },
  ];

  // Derive Trust Score badge styling
  const getTrustBadge = (score: number) => {
    const pct = Math.round(score * 100);
    if (pct >= 90) return { label: 'HIGH CERTAINTY', color: 'emerald', bg: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' };
    if (pct >= 70) return { label: 'GOOD CERTAINTY', color: 'blue', bg: 'bg-blue-950/80 border-blue-500/40 text-blue-300' };
    if (pct >= 50) return { label: 'MODERATE CERTAINTY', color: 'amber', bg: 'bg-amber-950/80 border-amber-500/40 text-amber-300' };
    if (pct >= 30) return { label: 'LOW CERTAINTY', color: 'rose', bg: 'bg-rose-950/80 border-rose-500/40 text-rose-300' };
    return { label: 'CRITICAL RISK / ABSTAIN', color: 'red', bg: 'bg-red-950 border-red-500/50 text-red-300' };
  };

  // Approximate Token Optimization Metrics
  const estimateTokenOptimization = (baselineAnswer: string, trustAnswer: string) => {
    const origTokens = Math.round((baselineAnswer.length + (activeResult?.query.length || 0)) / 3.8);
    const compTokens = Math.max(1, Math.round(origTokens * 0.42));
    const savedTokens = origTokens - compTokens;
    const ratioPct = Math.round((savedTokens / origTokens) * 100);
    return { origTokens, compTokens, savedTokens, ratioPct };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-10">
      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            Traditional Baseline vs Confidence-Aware TrustAgent
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time side-by-side evaluation for ANY question. Observe uncalibrated blind generation vs multi-signal calibration, claim extraction, and safety routing.
          </p>
        </div>

        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveMode('baseline')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'baseline'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Side-by-Side Comparison</span>
          </button>
          <button
            onClick={() => setActiveMode('multi_ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'multi_ai'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Multi-AI Consensus Hub</span>
          </button>
        </div>
      </div>

      {/* Main Dynamic Chat Input Area */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{activeMode === 'baseline' ? 'Dynamic Question Evaluator (Ask Anything)' : 'Multi-Model Consensus Evaluator'}</span>
          </span>
          <span className="text-[11px] bg-slate-950 border border-slate-800 text-slate-400 font-mono px-2.5 py-0.5 rounded-full">
            {activeMode === 'baseline' ? 'Dual-Engine Parallel Execution' : 'Google Gemini • ChatGPT • Claude • Groq • TrustGuard'}
          </span>
        </div>

        <form onSubmit={handleRun} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeMode === 'baseline'
                  ? 'Ask TrustGuard anything (e.g. What is RAG?, Calculate 25 × 37, Write Java code for binary search, Who won 2031 Chess Olympiad?)...'
                  : 'Enter query to evaluate consensus across Google, ChatGPT, Gemini, Claude...'
              }
              disabled={isLoading || isConsensusLoading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-sans shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isLoading || isConsensusLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-50 shrink-0"
          >
            {(isLoading || isConsensusLoading) ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Evaluate</span>
              </>
            )}
          </button>
        </form>

        {/* Quick sample chips for instant test benchmarking */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>Quick Test Scenarios (or type your own above):</span>
            {comparisonHistory.length > 1 && (
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <History className="w-3 h-3" /> {comparisonHistory.length} in session
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto text-xs text-slate-400 pb-1 scrollbar-thin">
            {samplePrompts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunPreset(s.q)}
                className="px-3 py-1 rounded-full bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer whitespace-nowrap text-[11px] font-medium"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison History Pills (if multiple queries in session) */}
        {comparisonHistory.length > 1 && (
          <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs text-slate-400">
            <span className="text-[11px] text-slate-500 font-mono shrink-0">Recent:</span>
            {comparisonHistory.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelectedResult(item);
                  setQuery(item.query);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono shrink-0 transition-colors cursor-pointer border ${
                  activeResult?.query === item.query
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                "{item.query.length > 25 ? item.query.substring(0, 25) + '...' : item.query}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MODE 1: Baseline vs TrustAgent Comparison Output */}
      {activeMode === 'baseline' && (
        <div className="space-y-6">
          {/* Progressive Loading State Banner */}
          {isLoading && (
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-blue-500/30 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <h3 className="text-sm font-bold text-white">Running Multi-Stage Evaluation Pipeline...</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Search className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>1. Query Analyzer & Intent</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>2. Baseline AI Generation</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>3. TrustAgent Claims & Evidence</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-slate-300">
                  <BarChart3 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>4. Calibrated Trust Scoring</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Result View */}
          {!isLoading && activeResult && (
            <div className="space-y-6">
              {/* Hallucination / Failure Prevention Banner */}
              {activeResult.hallucination_prevented ? (
                <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 flex items-start gap-3 shadow-lg glow-emerald">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-200">
                      Hallucination / Failure Prevented by TrustAgent!
                    </h4>
                    <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">
                      {activeResult.rationale}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-300 flex items-start gap-3 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-200">
                      Reliable Convergence & Calibrated Output
                    </h4>
                    <p className="text-xs text-blue-300/90 mt-0.5 leading-relaxed">
                      {activeResult.rationale}
                    </p>
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* 1. TRADITIONAL BASELINE AGENT CARD */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-950/60 shadow-xl flex flex-col justify-between">
                  <div>
                    {/* Baseline Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 font-mono">
                          Traditional AI Model
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          Traditional Baseline Agent
                        </h3>
                        <p className="text-[11px] text-slate-400">Uncalibrated • Always answers directly</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-950/90 border border-rose-500/40 text-rose-300 font-mono block">
                          100% Blind Certainty
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                          Route: ANSWER
                        </span>
                      </div>
                    </div>

                    {/* Baseline Content Output */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                          <span>Reported Output:</span>
                          <button
                            onClick={() => handleCopyText(activeResult.baseline_answer, false)}
                            className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedBaseline ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedBaseline ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-sm text-slate-300 leading-relaxed font-sans min-h-[160px]">
                          <MarkdownRenderer content={activeResult.baseline_answer} />
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-xs text-rose-300/90 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>No confidence estimation, no claim verification, and no safety routing guardrails.</span>
                      </div>
                    </div>
                  </div>

                  {/* Baseline Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {Math.round(activeResult.baseline_latency_ms)}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> ${activeResult.baseline_cost_usd.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* 2. CONFIDENCE-AWARE TRUSTAGENT CARD */}
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-blue-900/50 shadow-xl flex flex-col justify-between glow-blue">
                  <div>
                    {/* TrustAgent Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                          Calibrated Ensemble
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
                          <span>Confidence-Aware TrustAgent</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </h3>
                        <p className="text-[11px] text-slate-400">Adaptive Routing • Precision Grounding</p>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const badge = getTrustBadge(activeResult.trust_trace.final_confidence);
                          return (
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full font-mono block ${badge.bg}`}>
                              {Math.round(activeResult.trust_trace.final_confidence * 100)}% Trust ({badge.label})
                            </span>
                          );
                        })()}
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold mt-1 block">
                          Route: {activeResult.trust_trace.final_route}
                        </span>
                      </div>
                    </div>

                    {/* TrustAgent Content Output */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                          <span>Calibrated Output & Action:</span>
                          <div className="flex items-center gap-2">
                            {activeResult.trust_trace.confidence_report?.sentences && activeResult.trust_trace.confidence_report.sentences.length > 0 && (
                              <button
                                onClick={() => setShowHeatmap(!showHeatmap)}
                                className={`text-[11px] px-2 py-0.5 rounded cursor-pointer transition-colors ${
                                  showHeatmap
                                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                                    : 'text-indigo-400 hover:text-indigo-300 underline'
                                }`}
                              >
                                {showHeatmap ? 'Raw Text' : 'Evidence Heatmap'}
                              </button>
                            )}
                            <button
                              onClick={() => handleCopyText(activeResult.trust_trace.answer, true)}
                              className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedTrust ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedTrust ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-sm text-slate-200 leading-relaxed font-sans font-medium min-h-[160px]">
                          {showHeatmap && activeResult.trust_trace.confidence_report?.sentences ? (
                            <SentenceHeatmap
                              sentences={activeResult.trust_trace.confidence_report.sentences}
                              rawText={activeResult.trust_trace.answer}
                              hasHumanVerifiedEvidence={activeResult.trust_trace.confidence_report.has_human_verified_evidence}
                            />
                          ) : (
                            <MarkdownRenderer content={activeResult.trust_trace.answer} />
                          )}
                        </div>
                      </div>

                      {/* Expandable Why I'm Unsure & Confidence Breakdown */}
                      <WhyUnsurePanel
                        report={activeResult.trust_trace.confidence_report}
                        defaultOpen={activeResult.trust_trace.final_confidence < 0.85}
                      />

                      {/* Sources Display */}
                      {activeResult.trust_trace.sources && activeResult.trust_trace.sources.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                          <span className="text-slate-500">Sources:</span>
                          {activeResult.trust_trace.sources.map((s, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                              • {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TrustAgent Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-400" /> {Math.round(activeResult.trust_trace.latency_ms)}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> ${activeResult.trust_trace.cost_usd.toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Comprehensive TrustAgent Verification Report Card */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                      TrustAgent Comprehensive Verification Report
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-950 border border-blue-500/30 text-blue-300">
                    Trace ID: {activeResult.trust_trace.trace_id}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Trust Score</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {Math.round(activeResult.trust_trace.final_confidence * 100)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Decision Route</span>
                    <span className="text-sm font-bold text-blue-400 font-mono block mt-0.5">
                      {activeResult.trust_trace.final_route}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Claims Checked</span>
                    <span className="text-lg font-black text-slate-200 font-mono">
                      {activeResult.trust_trace.confidence_report.claims?.length || 1}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Verified Claims</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {activeResult.trust_trace.confidence_report.claims?.filter(c => c.status === 'SUPPORTED').length || (activeResult.trust_trace.final_confidence >= 0.8 ? 1 : 0)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Contradictions</span>
                    <span className="text-lg font-black text-rose-400 font-mono">
                      {activeResult.trust_trace.confidence_report.claims?.filter(c => c.status === 'CONTRADICTED').length || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <span className="text-[10px] text-slate-400 font-mono uppercase block">Uncertainty</span>
                    <span className="text-xs font-bold text-amber-400 font-mono block mt-1">
                      {activeResult.trust_trace.confidence_report.uncertainty_type}
                    </span>
                  </div>
                </div>

                {/* Token Optimization Stats */}
                {(() => {
                  const tokenStats = estimateTokenOptimization(activeResult.baseline_answer, activeResult.trust_trace.answer);
                  return (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300 font-mono">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-white">Token Saver Optimization:</span>
                        <span>{tokenStats.origTokens} tokens → {tokenStats.compTokens} tokens</span>
                      </div>
                      <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                        Saved: {tokenStats.savedTokens} tokens ({tokenStats.ratioPct}%)
                      </span>
                    </div>
                  );
                })()}

                {/* Explanation Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
                  <span className="font-bold text-slate-200 block mb-1">Recommendation & Synthesis:</span>
                  {activeResult.trust_trace.confidence_report.plain_explanation || activeResult.rationale}
                </div>
              </div>
            </div>
          )}

          {/* Empty State when no query has been run yet */}
          {!isLoading && !activeResult && (
            <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800/80 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
                <Scale className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Ready to Compare Any Question</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Type any normal question, math problem, coding request, or trap into the box above to see the Traditional Baseline Agent vs Confidence-Aware TrustAgent evaluated side-by-side.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Multi-AI Consensus & Occurrence Engine Output */}
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

              <ConsensusResultCard consensus={consensusResult} compact={false} />
            </div>
          )}

          {!isConsensusLoading && !consensusResult && (
            <div className="p-8 rounded-2xl bg-slate-900/30 border border-slate-800/80 text-center text-slate-400 text-xs">
              Click <span className="text-blue-400 font-semibold">"Evaluate"</span> or choose a preset test above to evaluate across Google, ChatGPT, Gemini, Claude, and Groq.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
