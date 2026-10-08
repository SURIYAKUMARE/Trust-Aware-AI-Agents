import React, { useState } from 'react';
import { MultiAIConsensusResult, AIModelAnswer } from '../types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Users, 
  ExternalLink,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface ConsensusResultCardProps {
  consensus: MultiAIConsensusResult;
  compact?: boolean;
}

export const ConsensusResultCard: React.FC<ConsensusResultCardProps> = ({ consensus, compact = false }) => {
  const [showAllModels, setShowAllModels] = useState<boolean>(!compact);
  const [showClaimMatrix, setShowClaimMatrix] = useState<boolean>(false);

  const occurrencePercent = Math.round(consensus.occurrence_rate * 100);
  const isRefuted = consensus.consensus_level === 'REFUTED';

  // Badge color based on occurrence rate
  const getRateColor = (rate: number) => {
    if (isRefuted) return 'text-rose-400 bg-rose-950/80 border-rose-500/40';
    if (rate >= 0.9) return 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
    if (rate >= 0.7) return 'text-blue-400 bg-blue-950/80 border-blue-500/40';
    if (rate >= 0.5) return 'text-amber-400 bg-amber-950/80 border-amber-500/40';
    return 'text-rose-400 bg-rose-950/80 border-rose-500/40';
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return '⚡';
      case 'openai': return '✨';
      case 'anthropic': return '🟣';
      case 'groq': return '⚡';
      default: return '🛡️';
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden mt-4 animate-fade-in text-slate-200">
      {/* Top Banner: Occurrence Rate & Multi-Model Accordance */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Multi-AI Consensus Engine
              </span>
              <span className="text-[10px] bg-blue-950 border border-blue-500/30 text-blue-300 font-mono px-2 py-0.5 rounded-full font-semibold">
                {consensus.agreeing_models_count} of {consensus.total_models_queried} AIs in Accordance
              </span>
            </div>
            <h4 className="text-sm font-semibold text-white mt-0.5">
              Cross-Model Occurrence Rate:{' '}
              <span className={`font-mono font-bold ${isRefuted ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isRefuted ? '0%' : `${occurrencePercent}%`}
              </span>
              {isRefuted && (
                <span className="ml-2 text-xs text-rose-300 font-normal">(Claim REFUTED — Misinformation)</span>
              )}
            </h4>
          </div>
        </div>

        {/* Occurrence Rate Meter */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-medium">Consensus Level</div>
            <div className="text-xs font-bold text-white uppercase tracking-wider">
              {consensus.consensus_level.replace('_', ' ')}
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${getRateColor(consensus.occurrence_rate)}`}>
            {occurrencePercent}%
          </div>
        </div>
      </div>

      {/* Outlier / Hallucination Warning if applicable */}
      {consensus.outlier_warnings.length > 0 && (
        <div className={`px-4 py-3 border-b text-xs flex items-start gap-2.5 ${
          isRefuted
            ? 'bg-rose-950/50 border-rose-500/40 text-rose-200'
            : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
        }`}>
          <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${isRefuted ? 'text-rose-400' : 'text-amber-400'}`} />
          <div className="space-y-1">
            {consensus.outlier_warnings.map((w, idx) => (
              <p key={idx} className="leading-relaxed font-medium">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Model Accordance Badges */}
      <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium mr-1 text-[11px]">Ensemble:</span>
          {consensus.model_answers.map((m, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                m.agrees_with_consensus
                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/30 text-rose-300'
              }`}
            >
              <span>{getProviderIcon(m.provider)}</span>
              <span>{m.model_name.split(' ')[0]}</span>
              {m.agrees_with_consensus ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
              ) : (
                <span className="text-[10px] text-rose-400 font-bold">⚠️ Outlier</span>
              )}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClaimMatrix(!showClaimMatrix)}
            className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showClaimMatrix ? 'Hide Claim Matrix' : 'Claim Occurrence Matrix'}</span>
          </button>

          <button
            onClick={() => setShowAllModels(!showAllModels)}
            className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <span>{showAllModels ? 'Collapse Models' : 'Inspect All 5 Models'}</span>
            {showAllModels ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Claim Occurrence Matrix (Collapsible) */}
      {showClaimMatrix && consensus.claim_occurrences.length > 0 && (
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            Claim-Level Occurrence Rates
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
              <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Extracted Claim</th>
                  <th className="p-2.5">Occurrence Rate</th>
                  <th className="p-2.5">Supporting Models</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {consensus.claim_occurrences.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="p-2.5 font-medium text-slate-200 max-w-xs">{c.claim}</td>
                    <td className="p-2.5 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${c.occurrence_rate >= 0.7 ? 'text-emerald-400 bg-emerald-950/60' : 'text-rose-400 bg-rose-950/60'}`}>
                        {Math.round(c.occurrence_rate * 100)}%
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      {c.supporting_models.join(', ')}
                    </td>
                    <td className="p-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        c.status === 'VERIFIED_CONSENSUS' || c.status === 'MAJORITY_SUPPORTED'
                          ? 'text-emerald-300 bg-emerald-950 border border-emerald-500/30'
                          : 'text-rose-300 bg-rose-950 border border-rose-500/30'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Model Cards (Collapsible) */}
      {showAllModels && (
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Side-by-Side AI Answers & Occurrence Clusters
            </h5>
            <span className="text-[11px] text-slate-500">
              Evaluated simultaneously in {consensus.latency_ms}ms
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {consensus.model_answers.map((model, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  model.agrees_with_consensus
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>{getProviderIcon(model.provider)}</span>
                      <span className="truncate">{model.model_name}</span>
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                      model.agrees_with_consensus
                        ? 'text-emerald-400 bg-emerald-950 border border-emerald-500/30'
                        : 'text-rose-400 bg-rose-950 border border-rose-500/30'
                    }`}>
                      {model.agrees_with_consensus ? `${occurrencePercent}% Accordance` : 'Outlier / Divergent'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed font-sans">
                    {model.answer}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Conf: {Math.round(model.confidence * 100)}%</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {model.latency_ms}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synthesis Rationale Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5 truncate">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="truncate font-medium text-slate-300">{consensus.synthesis_rationale}</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
          Latency: {consensus.latency_ms}ms
        </span>
      </div>
    </div>
  );
};
