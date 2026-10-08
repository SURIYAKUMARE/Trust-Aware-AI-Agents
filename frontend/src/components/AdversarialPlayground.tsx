import React, { useState, useEffect } from 'react';
import { AdversarialPreset, CompareResult } from '../types';
import { api } from '../api';
import { ConfidenceGauge } from './ConfidenceGauge';
import { SentenceHeatmap } from './SentenceHeatmap';
import { WhyUnsurePanel } from './WhyUnsurePanel';
import { exportTracePdf } from '../utils/exportPdf';
import { 
  Zap, 
  ShieldAlert, 
  ShieldCheck, 
  Flame, 
  Send, 
  RefreshCw, 
  FileDown, 
  AlertTriangle,
  Bot,
  UserCheck,
  CheckCircle2,
  Clock,
  DollarSign
} from 'lucide-react';

export const AdversarialPlayground: React.FC = () => {
  const [presets, setPresets] = useState<AdversarialPreset[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CompareResult | null>(null);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const data = await api.getAdversarialPresets();
        setPresets(data);
        if (data.length > 0 && !selectedPrompt) {
          setSelectedPrompt(data[0].prompt);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadPresets();
  }, []);

  const handleRun = async (queryToRun: string) => {
    const q = queryToRun || selectedPrompt;
    if (!q.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.compare(q);
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/40 via-purple-950/30 to-slate-900 border border-red-500/30 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Adversarial & Trap Arena
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Stress-test hallucination prevention & high-stakes safeguards
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Adversarial Playground: Traditional vs. Confidence-Aware Agent
            </h2>
          </div>
        </div>
      </div>

      {/* Preset Prompts Selector Grid */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
          8 Preset Trap Categories (Click any to test side-by-side):
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                setSelectedPrompt(preset.prompt);
                handleRun(preset.prompt);
              }}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                selectedPrompt === preset.prompt
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                    {preset.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">#{preset.id}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 mt-1">{preset.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 italic">
                  "{preset.prompt}"
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between text-slate-400">
                <span className="text-rose-400">Baseline fails</span>
                <span className="text-emerald-400 font-bold">&rarr; Trust catches</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Query Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleRun(selectedPrompt);
        }}
        className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg"
      >
        <input
          type="text"
          value={selectedPrompt}
          onChange={(e) => setSelectedPrompt(e.target.value)}
          placeholder="Type any custom adversarial trap, trick question, false premise, or prompt injection..."
          disabled={isLoading}
          className="flex-1 bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-sans"
        />
        <button
          type="submit"
          disabled={!selectedPrompt.trim() || isLoading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20 cursor-pointer shrink-0"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Compare Agents</span>
        </button>
      </form>

      {/* Side-by-Side Results Display */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <h4 className="text-sm font-bold text-slate-200">Executing Parallel Agent Comparison</h4>
          <p className="text-xs text-slate-400 max-w-md">
            Querying uncalibrated Baseline Agent and running TrustAgent multi-scorer ensemble, uncertainty diagnosis, and routing verification...
          </p>
        </div>
      ) : result ? (
        <div className="space-y-4 animate-fadeIn">
          {/* Prevented Callout Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 shadow-xl ${
              result.hallucination_prevented
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-900/90 border-slate-800 text-slate-300'
            }`}
          >
            {result.hallucination_prevented ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold">
                  {result.hallucination_prevented
                    ? 'ADVERSARIAL FAILURE SAFELY PREVENTED BY TRUSTAGENT'
                    : 'SAFE COMPARISON EXECUTED'}
                </h4>
                <button
                  onClick={() => exportTracePdf(result.trust_trace)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                  Export Trace PDF
                </button>
              </div>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">{result.rationale}</p>
            </div>
          </div>

          {/* Two-Column Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* LEFT: Baseline Agent */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-rose-500/30 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Traditional Baseline Agent</h3>
                    <span className="text-[10px] text-rose-400 font-mono">Uncalibrated • Always 100% Confident</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-rose-950 text-rose-400 border border-rose-500/30 font-bold">
                  ROUTE: ANSWER
                </span>
              </div>

              {/* Baseline Metrics Bar */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {Math.round(result.baseline_latency_ms)}ms
                </span>
                <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                  <DollarSign className="w-3 h-3 text-slate-500" />
                  ${result.baseline_cost_usd.toFixed(5)}
                </span>
                <span className="text-rose-400 ml-auto font-bold">Confidence: 100% (Blind)</span>
              </div>

              {/* Baseline Output */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-sm leading-relaxed text-slate-200 min-h-[140px] whitespace-pre-wrap">
                {result.baseline_answer}
              </div>

              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-xs text-rose-300">
                <span className="font-bold flex items-center gap-1.5 mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Architectural Weakness:
                </span>
                No confidence scoring, no claim verification, and no high-stakes safeguards. Blindly outputs hallucinated answers or executes risky actions without doubt.
              </div>
            </div>

            {/* RIGHT: Confidence-Aware TrustAgent */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Confidence-Aware TrustAgent</h3>
                    <span className="text-[10px] text-emerald-400 font-mono">Calibrated Ensemble • Adaptive Routing</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-bold">
                  ROUTE: {result.trust_trace.final_route}
                </span>
              </div>

              {/* TrustAgent Gauge & Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <ConfidenceGauge
                    score={result.trust_trace.final_confidence}
                    level={result.trust_trace.confidence_report.level}
                    size={64}
                    showDetails={false}
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      Certainty: {Math.round(result.trust_trace.final_confidence * 100)}%
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Uncertainty: <strong className="text-amber-400 font-mono">{result.trust_trace.confidence_report.uncertainty_type}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {Math.round(result.trust_trace.latency_ms)}ms
                  </span>
                  <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    ${result.trust_trace.cost_usd.toFixed(5)}
                  </span>
                </div>
              </div>

              {/* TrustAgent Output with Heatmap */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 min-h-[140px]">
                {result.trust_trace.confidence_report?.sentences ? (
                  <SentenceHeatmap
                    sentences={result.trust_trace.confidence_report.sentences}
                    rawText={result.trust_trace.answer}
                    hasHumanVerifiedEvidence={result.trust_trace.confidence_report.has_human_verified_evidence}
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
                    {result.trust_trace.answer}
                  </p>
                )}
              </div>

              {/* Explainer Panel */}
              <WhyUnsurePanel report={result.trust_trace.confidence_report} defaultOpen={false} />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
          Select any of the 8 preset trick prompts above or type a custom query to compare both agents side by side.
        </div>
      )}
    </div>
  );
};
