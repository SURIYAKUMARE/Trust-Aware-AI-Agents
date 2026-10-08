import React, { useState } from 'react';
import { ConfidenceReport, ClaimStatus } from '../types';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Layers, 
  FileText, 
  Scale, 
  Cpu 
} from 'lucide-react';

interface WhyUnsurePanelProps {
  report: ConfidenceReport;
  defaultOpen?: boolean;
}

export const WhyUnsurePanel: React.FC<WhyUnsurePanelProps> = ({ 
  report, 
  defaultOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getScorerIcon = (name: string) => {
    switch (name) {
      case 'self_consistency':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'evidence':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'verbalized':
        return <Scale className="w-4 h-4 text-amber-400" />;
      case 'reasoning_check':
        return <Cpu className="w-4 h-4 text-blue-400" />;
      default:
        return <Layers className="w-4 h-4 text-slate-400" />;
    }
  };

  const getScorerTitle = (name: string) => {
    switch (name) {
      case 'self_consistency':
        return 'Self-Consistency (Temp 0.8 Clustering)';
      case 'evidence':
        return 'Evidence Support (RAG & Retrieval)';
      case 'verbalized':
        return 'Verbalized Rubric (Coverage & Risk)';
      case 'reasoning_check':
        return 'Reasoning & Action Check (Logic/Arithmetic)';
      default:
        return name;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Supported
          </span>
        );
      case 'CONTRADICTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-rose-950/80 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" /> Contradicted
          </span>
        );
      case 'NO_EVIDENCE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-amber-950/80 text-amber-400 border border-amber-500/30">
            <HelpCircle className="w-3 h-3" /> No Evidence
          </span>
        );
    }
  };

  return (
    <div className="mt-3 border border-slate-800 rounded-xl bg-slate-900/60 overflow-hidden shadow-lg backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">
            Why I'm {report.level === 'HIGH' ? 'Confident' : 'Unsure'} & Confidence Breakdown
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {Math.round(report.calibrated_score * 100)}% calibrated
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <span>{isOpen ? 'Collapse' : 'Inspect signals & claims'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-800/80 space-y-5 bg-slate-950/40">
          {/* Plain narrative explanation */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-sm leading-relaxed text-slate-300">
            <p className="font-medium text-slate-200 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Explainability Summary:
            </p>
            {report.plain_explanation || "No additional explanation available."}
          </div>

          {/* Scorer Signal Bars */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Independent Confidence Scorers (Ensemble)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.signals.map((sig) => (
                <div key={sig.scorer} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                      {getScorerIcon(sig.scorer)}
                      <span>{getScorerTitle(sig.scorer)}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {Math.round(sig.score * 100)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        sig.score >= 0.8
                          ? 'bg-emerald-500'
                          : sig.score >= 0.6
                          ? 'bg-blue-500'
                          : sig.score >= 0.4
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.round(sig.score * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-400">
                    <span>Weight: {Math.round(sig.weight * 100)}%</span>
                    <span className="truncate max-w-[200px] text-right">
                      {sig.reasons[0] || 'Nominal signals'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranked Reasons */}
          {report.reasons && report.reasons.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Ranked Doubt & Uncertainty Factors
              </h4>
              <ul className="space-y-1.5">
                {report.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="font-mono text-slate-500 text-[11px] mt-0.5">{idx + 1}.</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Per-Claim Evidence Table */}
          {report.claims && report.claims.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Atomic Claim Verification & Evidence Citations
              </h4>
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2">Claim Asserted</th>
                      <th className="px-3 py-2 w-32">Status</th>
                      <th className="px-3 py-2">Evidence Snippet / Citation</th>
                      <th className="px-3 py-2 w-28">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {report.claims.map((claim, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="px-3 py-2.5 font-medium text-slate-200">
                          {claim.claim}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {getStatusBadge(claim.status)}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 italic">
                          "{claim.snippet || 'No corroborating text in retrieved index'}"
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] text-blue-400">
                          {claim.source || 'corpus'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
