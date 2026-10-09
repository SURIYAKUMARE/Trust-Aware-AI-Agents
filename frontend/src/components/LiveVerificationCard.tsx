import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  Calendar, 
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { LiveVerificationData, VerifiedClaimDisplayItem, VerifiedSourceItem } from '../types';
import { api } from '../api';

interface LiveVerificationCardProps {
  data: LiveVerificationData;
  questionText: string;
  answerText: string;
  onUpdateAnswer?: (newAnswer: string, newConfidence: number) => void;
}

export const LiveVerificationCard: React.FC<LiveVerificationCardProps> = ({
  data,
  questionText,
  answerText,
  onUpdateAnswer,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showDisputeModal, setShowDisputeModal] = useState<boolean>(false);
  const [disputeInput, setDisputeInput] = useState<string>('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [disputeResult, setDisputeResult] = useState<any | null>(null);

  const score = data.confidence_score;

  // Determine badge styling based on confidence bands
  const getBandStyles = (s: number) => {
    if (s >= 90) return {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-500/30',
      icon: ShieldCheck,
      label: 'High evidence confidence'
    };
    if (s >= 75) return {
      border: 'border-blue-500/40',
      bg: 'bg-blue-950/60',
      text: 'text-blue-400',
      badge: 'bg-blue-900/60 text-blue-300 border-blue-500/30',
      icon: ShieldCheck,
      label: 'Good evidence, some limitations'
    };
    if (s >= 50) return {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      badge: 'bg-amber-900/60 text-amber-300 border-amber-500/30',
      icon: AlertTriangle,
      label: 'Mixed or incomplete evidence'
    };
    if (s >= 1) return {
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/60',
      text: 'text-rose-400',
      badge: 'bg-rose-900/60 text-rose-300 border-rose-500/30',
      icon: ShieldAlert,
      label: 'Low evidence confidence'
    };
    return {
      border: 'border-slate-700',
      bg: 'bg-slate-900/60',
      text: 'text-slate-400',
      badge: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: HelpCircle,
      label: 'No usable verification evidence'
    };
  };

  const bandStyle = getBandStyles(score);
  const BadgeIcon = bandStyle.icon;

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeInput.trim()) return;

    setIsSubmittingDispute(true);
    try {
      const res = await api.submitDispute(
        disputeInput,
        questionText,
        answerText,
        score
      );
      setDisputeResult(res);
      if (onUpdateAnswer && res.corrected_answer) {
        onUpdateAnswer(res.corrected_answer, res.updated_confidence);
      }
    } catch (err) {
      console.error('Error submitting dispute:', err);
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <div className={`mt-3 rounded-2xl border ${bandStyle.border} ${bandStyle.bg} p-3.5 shadow-lg transition-all text-slate-200`}>
      {/* Top Banner: Score & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-sm border ${bandStyle.badge}`}>
            {score}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Evidence Confidence
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold font-mono ${bandStyle.badge}`}>
                {data.confidence_band || bandStyle.label}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
              {data.status_summary || data.confidence_explanation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dispute / "This answer is wrong — recheck it." button */}
          <button
            onClick={() => setShowDisputeModal(!showDisputeModal)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition-colors flex items-center gap-1 cursor-pointer font-medium"
            title="Report this answer as incorrect or outdated and trigger verification recheck"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>This answer is wrong — recheck it.</span>
          </button>

          {/* Toggle Expand Details */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <span>{isExpanded ? 'Hide Details' : 'How was this verified?'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Section: Claims & Source Cards */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 animate-fade-in text-xs">
          {/* Independent Sources & Verification Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400 font-mono text-[11px]">
            <span>
              Independent Domains: <strong className="text-white">{data.independent_sources_count || data.sources.length}</strong>
            </span>
            <span>
              Contradictions: <strong className={data.contradictions_detected.length > 0 ? "text-rose-400" : "text-emerald-400"}>{data.contradictions_detected.length}</strong>
            </span>
            {data.verified_at && (
              <span>Verified: <strong className="text-slate-300">{data.verified_at}</strong></span>
            )}
          </div>

          {/* Claim-by-Claim Breakdown */}
          {data.claims && data.claims.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <BadgeIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Claim-Level Verification Matrix</span>
              </h5>
              <div className="space-y-1">
                {data.claims.map((c, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-0.5 flex-1">
                      <p className="text-slate-200 font-medium">{c.claim}</p>
                      {c.supporting_snippet && (
                        <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded border border-slate-800/50">
                          "{c.supporting_snippet}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {c.source_domain && <span>Source: <strong className="text-blue-300">{c.source_domain}</strong></span>}
                        {c.reasoning && <span>• {c.reasoning}</span>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 border ${
                      c.status === 'SUPPORTED' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40' :
                      c.status === 'CONTRADICTED' ? 'bg-rose-950 text-rose-300 border-rose-500/40' :
                      c.status === 'PARTIALLY_SUPPORTED' ? 'bg-amber-950 text-amber-300 border-amber-500/40' :
                      'bg-slate-900 text-slate-400 border-slate-700'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clickable Verified Source Cards */}
          {data.sources && data.sources.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <h5 className="font-bold text-slate-300 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Retrieved Authoritative Sources ({data.sources.length})</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url !== '#' ? src.url : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-semibold text-slate-200 group-hover:text-blue-300 line-clamp-1 transition-colors">
                        {src.title}
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-blue-400 shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-900">
                      <span className="text-slate-300">{src.domain}</span>
                      {src.is_primary && (
                        <span className="text-emerald-400 font-bold">Primary</span>
                      )}
                      {src.published_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" /> {src.published_date}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Dispute Modal / Form */}
      {showDisputeModal && (
        <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30 text-xs space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Report Incorrect Information & Re-Verify</span>
            </div>
            <button
              onClick={() => setShowDisputeModal(false)}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 text-xs"
            >
              ✕
            </button>
          </div>

          {!disputeResult ? (
            <form onSubmit={handleDisputeSubmit} className="space-y-2">
              <p className="text-slate-300 text-[11px]">
                Specify which claim is incorrect, outdated, or misleading. TrustGuard will search live sources, compare the evidence, and recalibrate the score.
              </p>
              <textarea
                value={disputeInput}
                onChange={(e) => setDisputeInput(e.target.value)}
                placeholder="e.g. 'Droupadi Murmu took office on July 25, 2022, not in 2021...'"
                rows={2}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-3 py-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute || !disputeInput.trim()}
                  className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingDispute ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Auditing evidence...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Submit & Re-Verify</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-400">✓ Audit Completed: {disputeResult.verdict}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
                  New Score: {disputeResult.updated_confidence}/100
                </span>
              </div>
              <p className="text-slate-300 text-xs">
                <strong>Issue:</strong> {disputeResult.detected_issue}
              </p>
              <p className="text-emerald-300 text-xs font-medium">
                <strong>Correction:</strong> {disputeResult.corrected_answer}
              </p>
              <p className="text-slate-400 text-[11px]">
                <strong>Reason:</strong> {disputeResult.reason_for_change}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
