import React, { useState } from 'react';
import { SentenceVerification } from '../types';
import { ShieldCheck, AlertTriangle, XCircle, UserCheck, Info } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface SentenceHeatmapProps {
  sentences?: SentenceVerification[];
  rawText: string;
  hasHumanVerifiedEvidence?: boolean;
}

export const SentenceHeatmap: React.FC<SentenceHeatmapProps> = ({
  sentences,
  rawText,
  hasHumanVerifiedEvidence,
}) => {
  const [activeSentence, setActiveSentence] = useState<SentenceVerification | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  if (!sentences || sentences.length === 0 || showRaw) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800">
          <span className="font-mono">Standard Response View</span>
          {sentences && sentences.length > 0 && (
            <button
              onClick={() => setShowRaw(false)}
              className="text-indigo-400 hover:text-indigo-300 underline font-mono text-xs cursor-pointer"
            >
              Show Evidence Heatmap ({sentences.length} sentences)
            </button>
          )}
        </div>
        <MarkdownRenderer content={rawText} />
      </div>
    );
  }

  const getStyle = (s: SentenceVerification) => {
    if (s.is_human_verified) {
      return {
        bg: 'bg-purple-950/40 border-b-2 border-purple-400 text-purple-100 hover:bg-purple-900/50',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        label: 'HUMAN VERIFIED',
      };
    }
    if (s.status === 'SUPPORTED' || s.score >= 0.75) {
      return {
        bg: 'bg-emerald-950/30 border-b-2 border-emerald-500/60 text-emerald-100 hover:bg-emerald-900/40',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        label: 'SUPPORTED',
      };
    }
    if (s.status === 'NO_EVIDENCE' || s.score >= 0.35) {
      return {
        bg: 'bg-amber-950/30 border-b-2 border-amber-500/60 text-amber-100 hover:bg-amber-900/40',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        label: 'NO EVIDENCE',
      };
    }
    return {
      bg: 'bg-rose-950/40 border-b-2 border-rose-500/60 text-rose-100 hover:bg-rose-900/50',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      label: 'CONTRADICTED',
    };
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Badges and Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400 uppercase tracking-wider text-[11px]">
            Sentence-Level Evidence Heatmap
          </span>
          {hasHumanVerifiedEvidence && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
              <UserCheck className="w-3.5 h-3.5" />
              Learned from Human Feedback
            </span>
          )}
        </div>
        <button
          onClick={() => setShowRaw(true)}
          className="text-xs text-slate-400 hover:text-slate-200 underline font-mono"
        >
          Raw Text
        </button>
      </div>

      {/* Heatmap Interactive Sentences */}
      <div className="text-sm leading-relaxed p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
        {sentences.map((sent, idx) => {
          const style = getStyle(sent);
          const isSelected = activeSentence?.sentence === sent.sentence;

          return (
            <span
              key={idx}
              onMouseEnter={() => setActiveSentence(sent)}
              onClick={() => setActiveSentence(isSelected ? null : sent)}
              className={`cursor-pointer transition-all duration-150 inline rounded-sm px-1 py-0.5 mx-0.5 ${style.bg} ${
                isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900' : ''
              }`}
              title="Click or hover to inspect claim evidence"
            >
              {sent.sentence}{' '}
            </span>
          );
        })}
      </div>

      {/* Hover / Selected Evidence Inspector Card */}
      {activeSentence ? (
        <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow-xl space-y-2 text-xs animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {activeSentence.is_human_verified ? (
                <UserCheck className="w-4 h-4 text-purple-400" />
              ) : activeSentence.status === 'SUPPORTED' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : activeSentence.status === 'NO_EVIDENCE' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${getStyle(activeSentence).badgeBg}`}>
                {getStyle(activeSentence).label}
              </span>
              <span className="font-mono text-slate-300">
                Confidence: <strong className="text-white">{Math.round(activeSentence.score * 100)}%</strong>
              </span>
            </div>
            {activeSentence.source && (
              <span className="font-mono text-slate-400 text-[11px] bg-slate-800/80 px-2 py-0.5 rounded">
                Source: {activeSentence.source}
              </span>
            )}
          </div>

          <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed">
            <span className="text-slate-400 block mb-1 font-semibold">Supporting / Missing Evidence Snippet:</span>
            {activeSentence.snippet || 'No specific snippet recorded.'}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 italic px-1">
          <Info className="w-3.5 h-3.5" />
          Hover over or click any colored sentence above to inspect its underlying evidence source and claim audit.
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Supported (&gt;75%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          Unsubstantiated / No Direct Evidence (35-75%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          Contradicted (&lt;35%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          Human Feedback
        </span>
      </div>
    </div>
  );
};
