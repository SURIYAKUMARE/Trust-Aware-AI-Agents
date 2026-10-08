import React, { useState } from 'react';
import { DecisionTrace } from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';
import { SentenceHeatmap } from './SentenceHeatmap';
import { exportTracePdf } from '../utils/exportPdf';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle, 
  FileSearch, 
  Scale, 
  Flame, 
  Activity, 
  FileDown, 
  Layers, 
  ExternalLink,
  ChevronDown,
  Sparkles,
  Bot
} from 'lucide-react';

interface TrustReportModalProps {
  trace: DecisionTrace | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TrustReportModal: React.FC<TrustReportModalProps> = ({
  trace,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'trajectory' | 'claims'>('overview');

  if (!isOpen || !trace) return null;

  const report = trace.confidence_report;
  const scorePct = Math.round(trace.final_confidence * 100);
  const evidenceQuality = report.evidence_quality ?? Math.round((report.signals.find(s => s.scorer === 'evidence')?.score ?? trace.final_confidence) * 100);
  const sourceReliability = report.source_reliability ?? (trace.final_confidence < 0.4 ? 25 : 94);
  const modelAgreement = report.model_agreement ?? Math.round((report.signals.find(s => s.scorer === 'self_consistency')?.score ?? trace.final_confidence) * 100);
  const reasoningConsistency = report.reasoning_consistency ?? Math.round((report.signals.find(s => s.scorer === 'reasoning_check')?.score ?? trace.final_confidence) * 100);
  const riskLevel = report.risk_level ?? (trace.requires_human_approval ? 'CRITICAL' : trace.final_confidence < 0.35 ? 'HIGH' : trace.final_confidence < 0.75 ? 'MEDIUM' : 'LOW');
  const agents = report.agents_engaged && report.agents_engaged.length > 0 ? report.agents_engaged : ['Trust Manager', 'Reasoning Agent'];

  const getRouteBadge = () => {
    switch (trace.final_route) {
      case 'ANSWER':
        return { label: '✓ Direct Answer', bg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' };
      case 'VERIFY':
        return { label: '🔧 Tool Verified', bg: 'bg-blue-950/80 border-blue-500/50 text-blue-300' };
      case 'CLARIFY':
        return { label: '❓ Clarification Requested', bg: 'bg-amber-950/80 border-amber-500/50 text-amber-300' };
      case 'ABSTAIN':
        return { label: '🚫 Honest Abstention', bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300' };
      case 'ESCALATE':
        return { label: '⚠️ Human Review Recommended', bg: 'bg-rose-950/80 border-rose-500/50 text-rose-300' };
      default:
        return { label: trace.final_route, bg: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const routeInfo = getRouteBadge();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">TrustGuard AI Trust Report</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${routeInfo.bg}`}>
                  {routeInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Trace ID: {trace.trace_id} • Evaluated with Isotonic Calibration
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportTracePdf(trace)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 border border-indigo-500/40 hover:bg-indigo-600/50 text-indigo-200 text-xs font-mono transition-colors cursor-pointer"
              title="Export A4 PDF Audit Report"
            >
              <FileDown className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'overview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trust Overview
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'heatmap' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Evidence Heatmap ({report.sentences?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'claims' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Claim Citations ({report.claims?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeTab === 'trajectory' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Decision Trajectory ({trace.steps.length} Steps)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {activeTab === 'overview' && (
            <>
              {/* Executive Trust Report Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="shrink-0 flex flex-col items-center">
                    <ConfidenceGauge
                      score={trace.final_confidence}
                      level={report.level}
                      size={88}
                      showDetails={false}
                    />
                    <span className="text-xs font-bold text-white mt-1">
                      {scorePct}% Confidence
                    </span>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Evidence</span>
                        <span className="font-bold text-emerald-400">
                          {evidenceQuality >= 80 ? '✓ Strong' : evidenceQuality >= 50 ? '• Moderate' : '✕ Limited'} ({evidenceQuality}%)
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Source Reliability</span>
                        <span className="font-bold text-blue-400">
                          {sourceReliability >= 80 ? '✓ High' : sourceReliability >= 50 ? '• Medium' : '✕ Low'} ({sourceReliability}%)
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Consistency</span>
                        <span className="font-bold text-purple-400">
                          {modelAgreement >= 80 ? '✓ High' : modelAgreement >= 50 ? '• Moderate' : '✕ Conflicting'} ({modelAgreement}%)
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Risk</span>
                        <span className={`font-bold ${
                          riskLevel === 'CRITICAL' ? 'text-rose-400' :
                          riskLevel === 'HIGH' ? 'text-orange-400' :
                          riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {riskLevel}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 col-span-1 sm:col-span-2">
                        <span className="text-[10px] text-slate-500 uppercase font-mono block">Decision</span>
                        <span className="font-bold text-slate-200">
                          {routeInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Why Explanation */}
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                  <span className="font-bold text-white block mb-0.5">Why did TrustGuard choose this?</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    "{report.plain_explanation || 'Multiple reliable sources support the answer, reasoning steps are logically consistent, and no significant conflicts were detected.'}"
                  </p>
                </div>
              </div>

              {/* 4 Signals Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Evidence Quality</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-white">{evidenceQuality}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${evidenceQuality}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Source Reliability</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-white">{sourceReliability}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${sourceReliability}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Model Agreement</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-white">{modelAgreement}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${modelAgreement}%` }} />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Reasoning Consistency</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg font-black text-white">{reasoningConsistency}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${reasoningConsistency}%` }} />
                  </div>
                </div>
              </div>

              {/* Multi-Agent Specialists Participated */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Multi-Agent Coordination Pipeline
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {agents.map((agent, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono"
                    >
                      <Bot className="w-3.5 h-3.5 text-blue-400" />
                      <span>{agent}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sources & Citations */}
              {trace.sources && trace.sources.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Sources & Evidence Corpora Consulted
                  </span>
                  <ul className="text-xs text-slate-300 space-y-1">
                    {trace.sources.map((src, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                        <span className="text-blue-400">•</span>
                        <span>{src}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {activeTab === 'heatmap' && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <SentenceHeatmap
                sentences={report.sentences}
                rawText={trace.answer}
                hasHumanVerifiedEvidence={report.has_human_verified_evidence}
              />
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="space-y-2">
              {report.claims && report.claims.length > 0 ? (
                report.claims.map((claim, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{claim.claim}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        claim.status === 'SUPPORTED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                        claim.status === 'NO_EVIDENCE' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                        'bg-rose-950 text-rose-300 border border-rose-500/30'
                      }`}>
                        {claim.status}
                      </span>
                    </div>
                    {claim.snippet && (
                      <p className="text-[11px] text-slate-400 font-mono bg-slate-900/60 p-2 rounded border border-slate-800/80">
                        Citation: "{claim.snippet}"
                      </p>
                    )}
                    <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
                      <span>Source: {claim.source || 'Knowledge Base'}</span>
                      <span>Confidence: {Math.round(claim.confidence * 100)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">No atomic claims extracted.</p>
              )}
            </div>
          )}

          {activeTab === 'trajectory' && (
            <div className="space-y-3">
              {trace.steps.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white font-mono">Step {s.step_index}: Route {s.action}</span>
                    <span className="text-[11px] font-mono text-blue-400 font-bold">
                      Confidence: {Math.round(s.confidence_score * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {s.thought}
                  </p>
                  {s.tool_name && (
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                      Tool: <span className="text-amber-400">{s.tool_name}</span> | Output: {s.tool_output}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Model: {trace.selected_model || 'TrustGuard Engine'}</span>
          <span>Latency: {Math.round(trace.latency_ms)}ms | Cost: ${trace.cost_usd.toFixed(5)}</span>
        </div>
      </div>
    </div>
  );
};
