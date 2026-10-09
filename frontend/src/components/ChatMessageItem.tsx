import React, { useState } from 'react';
import { ChatMessage, DecisionTrace, CompareResult } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SentenceHeatmap } from './SentenceHeatmap';
import { 
  Bot, 
  User, 
  ThumbsUp, 
  ThumbsDown, 
  Copy, 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  HelpCircle, 
  ExternalLink, 
  FileText, 
  Image,
  Clock,
  Sparkles,
  ArrowRight,
  Volume2,
  VolumeX,
  Users,
  Zap,
  Scale,
  RefreshCw,
  Pencil,
  X,
  Globe,
  Share2
} from 'lucide-react';
import { api } from '../api';
import { ConsensusResultCard } from './ConsensusResultCard';
import { AnswerCorrectnessCard } from './AnswerCorrectnessCard';
import { LiveVerificationCard } from './LiveVerificationCard';

interface ChatMessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onOpenTrustReport: (trace: DecisionTrace) => void;
  onFeedback?: (messageId: string, feedback: 'helpful' | 'unhelpful') => void;
  onSelectFollowUp?: (query: string) => void;
  onEditUserMessage?: (messageId: string, newText: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onRegenerate,
  onOpenTrustReport,
  onFeedback,
  onSelectFollowUp,
  onEditUserMessage,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState(message.text);
  const [showCompareBox, setShowCompareBox] = useState(!!message.compare_result);
  const [localCompareResult, setLocalCompareResult] = useState<CompareResult | null>(message.compare_result || null);
  const [isComparing, setIsComparing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [userFeedback, setUserFeedback] = useState<'helpful' | 'unhelpful' | null>(null);
  const [showSources, setShowSources] = useState(false);

  const effectiveCompareResult = message.compare_result || localCompareResult;

  const handleToggleCompare = async () => {
    if (showCompareBox) {
      setShowCompareBox(false);
      return;
    }
    if (!effectiveCompareResult && !isComparing) {
      setIsComparing(true);
      setShowCompareBox(true);
      try {
        const queryToCompare = message.trace?.query || message.text;
        const res = await api.compare(queryToCompare);
        setLocalCompareResult(res);
      } catch (err) {
        console.error('Failed to run comparison:', err);
      } finally {
        setIsComparing(false);
      }
    } else {
      setShowCompareBox(true);
    }
  };

  const isUser = message.sender === 'user';
  const trace = message.trace;
  const scorePct = trace ? Math.round(trace.final_confidence * 100) : 92;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const cleanText = message.text.replace(/[*#`_$[\]]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleFeedbackClick = (type: 'helpful' | 'unhelpful') => {
    setUserFeedback(type);
    if (onFeedback) {
      onFeedback(message.id, type);
    }
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    setIsEditing(false);
    if (onEditUserMessage) {
      onEditUserMessage(message.id, editText.trim());
    }
  };

  const getTrustBadgeStyle = () => {
    if (!trace) return { text: '🛡️ Trust 92%', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80' };
    if (trace.requires_human_approval) {
      return { text: `⚠️ Review ${scorePct}%`, bg: 'bg-rose-950 text-rose-300 border-rose-500/50 hover:bg-rose-900' };
    }
    if (trace.final_route === 'CLARIFY') {
      return { text: `❓ Clarify ${scorePct}%`, bg: 'bg-amber-950 text-amber-300 border-amber-500/50 hover:bg-amber-900' };
    }
    if (trace.final_route === 'ABSTAIN') {
      return { text: `🚫 Abstain ${scorePct}%`, bg: 'bg-rose-950 text-rose-300 border-rose-500/50 hover:bg-rose-900' };
    }
    if (trace.final_confidence >= 0.8) {
      return { text: `🛡️ Trust ${scorePct}%`, bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80' };
    }
    return { text: `🛡️ Trust ${scorePct}%`, bg: 'bg-blue-950 text-blue-300 border-blue-500/40 hover:bg-blue-900' };
  };

  const trustBadge = getTrustBadgeStyle();

  // Extract interactive follow-up suggestions from AI response text
  const extractFollowUps = (rawText: string) => {
    const markerRegex = /###\s*(?:You can also ask|Suggested Follow-ups|Follow-up Questions):?/i;
    const match = rawText.search(markerRegex);
    if (match === -1) {
      return { mainContent: rawText, followUps: [] };
    }

    const mainContent = rawText.substring(0, match).trim();
    const followUpSection = rawText.substring(match);
    const lines = followUpSection.split('\n');
    const followUps: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const qMatch = trimmed.match(/^(?:[-*•]|\d+\.)\s*["“']?(.*?)["”']?$/);
      if (qMatch && qMatch[1] && !markerRegex.test(trimmed)) {
        const cleanQ = qMatch[1].replace(/^["']|["']$/g, '').trim();
        if (cleanQ.length > 5 && cleanQ.length < 130) {
          followUps.push(cleanQ);
        }
      }
    }

    return { mainContent, followUps };
  };

  const { mainContent, followUps } = isUser ? { mainContent: currentText, followUps: [] } : extractFollowUps(currentText);

  return (
    <div className={`py-5 px-3 sm:px-6 transition-all group ${
      isUser 
        ? 'bg-transparent' 
        : 'bg-slate-900/40 border-y border-slate-900/70 hover:bg-slate-900/50'
    }`}>
      <div className="max-w-4xl mx-auto flex gap-3.5 sm:gap-4">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 shadow-sm font-semibold text-xs">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Content Area */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header Info */}
          <div className="flex items-center justify-between text-xs pb-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-xs tracking-tight">
                {isUser ? 'You' : 'TrustGuard AI'}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {message.timestamp}
              </span>
              {!isUser && trace?.selected_model && (
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                  • {trace.selected_model}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* User Message Edit Button */}
              {isUser && onEditUserMessage && !isEditing && (
                <button
                  onClick={() => {
                    setEditText(message.text);
                    setIsEditing(true);
                  }}
                  title="Edit and resend prompt"
                  className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Trust Pill (Clickable -> Opens Trust Report) */}
              {!isUser && trace && (
                <button
                  onClick={() => onOpenTrustReport(trace)}
                  title="Click to view full Trust Report & Signal Calibration"
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-all cursor-pointer hover:scale-105 shadow-sm ${trustBadge.bg}`}
                >
                  <span>{trustBadge.text}</span>
                </button>
              )}

              {message.consensus_result && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border bg-blue-950/80 text-blue-300 border-blue-500/40 shadow-sm">
                  <Users className="w-3 h-3 text-blue-400" />
                  <span>Consensus {Math.round(message.consensus_result.occurrence_rate * 100)}%</span>
                </span>
              )}

              {message.token_saver_info && (
                <span
                  title={`Original: ${message.token_saver_info.original_tokens} tokens | Compressed: ${message.token_saver_info.compressed_tokens} tokens (${Math.round(message.token_saver_info.saved_ratio * 100)}% saved)`}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-sm"
                >
                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>⚡ Caveman -{Math.round(message.token_saver_info.saved_ratio * 100)}%</span>
                </span>
              )}
            </div>
          </div>

          {/* Attached Files for User Message */}
          {message.attachedFiles && message.attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-1">
              {message.attachedFiles.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono"
                >
                  {f.type.startsWith('image/') ? (
                    <Image className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{f.name}</span>
                  <span className="text-[10px] text-slate-500">({Math.round(f.size / 1024)}KB)</span>
                </div>
              ))}
            </div>
          )}

          {/* User Inline Editing Mode */}
          {isUser && isEditing ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full bg-slate-900 border border-blue-500/60 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editText.trim()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            /* Text / Markdown Render */
            <div className="text-slate-200 text-sm leading-relaxed">
              {!isUser && showHeatmap && trace?.confidence_report?.sentences ? (
                <SentenceHeatmap
                  sentences={trace.confidence_report.sentences}
                  rawText={message.text}
                  hasHumanVerifiedEvidence={trace.confidence_report.has_human_verified_evidence}
                />
              ) : (
                <MarkdownRenderer content={mainContent} />
              )}

              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse align-middle" />
              )}
            </div>
          )}
          
          {/* Live Multi-Source Fact Verification & Evidence Confidence Card */}
          {!isUser && !message.isStreaming && message.verification_data && (
            <LiveVerificationCard
              data={message.verification_data}
              questionText={message.trace?.query || "Previous query"}
              answerText={currentText}
              onUpdateAnswer={(newAns) => setCurrentText(newAns)}
            />
          )}

          {/* Correctness Score (%) & "Why is this correct?" Verification Box */}
          {!isUser && !message.isStreaming && (trace || message.consensus_result) && !message.verification_data && (
            <AnswerCorrectnessCard
              trace={trace}
              consensusResult={message.consensus_result}
              tokenSaverInfo={message.token_saver_info}
              onOpenTrustReport={onOpenTrustReport}
              onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
              showHeatmap={showHeatmap}
              suggestedCorrection={trace?.suggested_correction || trace?.correct_answer}
            />
          )}

          {/* Multi-AI Consensus Card & Answer Occurrence Rate */}
          {!isUser && message.consensus_result && (
            <ConsensusResultCard consensus={message.consensus_result} compact={true} />
          )}

          {/* Side-by-Side Comparison Box */}
          {!isUser && showCompareBox && (
            <div className="mt-3.5 p-4 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Side-by-Side Model Comparison
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono">
                    Traditional vs TrustAgent
                  </span>
                </div>
                <button
                  onClick={() => setShowCompareBox(false)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              {isComparing && (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs font-mono">
                  <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
                  <span>Evaluating baseline vs calibrated TrustAgent...</span>
                </div>
              )}

              {!isComparing && effectiveCompareResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Traditional Baseline Agent */}
                    <div className="p-3.5 rounded-xl bg-slate-900/70 border border-rose-500/20 flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                          <span className="text-xs font-bold text-rose-300">Traditional Baseline Agent</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 font-mono">
                          100% Blind Certainty
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
                        <MarkdownRenderer content={effectiveCompareResult.baseline_answer} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/40">
                        <span>Latency: {effectiveCompareResult.baseline_latency_ms}ms</span>
                        <span>Cost: ${effectiveCompareResult.baseline_cost_usd.toFixed(4)}</span>
                        <span className="text-rose-400">Uncalibrated</span>
                      </div>
                    </div>

                    {/* Confidence-Aware TrustAgent */}
                    <div className="p-3.5 rounded-xl bg-slate-900/70 border border-emerald-500/30 flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-300">Confidence-Aware TrustAgent</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 font-mono">
                          {Math.round(effectiveCompareResult.trust_trace.final_confidence * 100)}% Calibrated ({effectiveCompareResult.trust_trace.final_route})
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 overflow-x-auto max-h-60 overflow-y-auto leading-relaxed">
                        <MarkdownRenderer content={effectiveCompareResult.trust_trace.answer} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/40">
                        <span>Latency: {effectiveCompareResult.trust_trace.latency_ms}ms</span>
                        <span>Cost: ${effectiveCompareResult.trust_trace.cost_usd.toFixed(4)}</span>
                        <span className="text-emerald-400">Multi-Signal Calibrated</span>
                      </div>
                    </div>
                  </div>

                  {/* Safeguard & Rationale Pill */}
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2.5 border ${
                    effectiveCompareResult.hallucination_prevented
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  }`}>
                    {effectiveCompareResult.hallucination_prevented ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className="font-bold">
                        {effectiveCompareResult.hallucination_prevented ? 'Safety Guard Activated: ' : 'Calibration Insight: '}
                      </span>
                      <span>{effectiveCompareResult.rationale}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Follow-Up Suggestion Pills */}
          {!isUser && followUps.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Suggested Follow-ups</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {followUps.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectFollowUp && onSelectFollowUp(q)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-xs text-blue-300 hover:text-white font-medium transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.01] shadow-sm text-left group"
                  >
                    <span>{q}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sources Cited (if present) */}
          {!isUser && trace?.sources && trace.sources.length > 0 && (
            <div className="pt-2 border-t border-slate-900/70">
              <div className="flex items-center gap-2 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Verified Sources ({trace.sources.length})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                {trace.sources.map((src, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 hover:border-slate-700 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>{src}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Action Bar */}
          {!isUser && !message.isStreaming && (
            <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/40 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                {/* Copy */}
                <button
                  onClick={handleCopy}
                  title="Copy answer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {/* Text-to-speech */}
                <button
                  onClick={handleSpeak}
                  title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                    isSpeaking ? 'text-blue-400 bg-blue-950/60' : 'hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-blue-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span className="text-[11px] hidden sm:inline">{isSpeaking ? 'Stop' : 'Read'}</span>
                </button>

                {/* Regenerate */}
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    title="Regenerate answer"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Regenerate</span>
                  </button>
                )}

                {/* Compare toggle */}
                <button
                  onClick={handleToggleCompare}
                  title="Compare with traditional baseline agent"
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                    showCompareBox ? 'text-indigo-300 bg-indigo-950/60' : 'hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] hidden md:inline">Compare</span>
                </button>
              </div>

              {/* Feedback Thumbs */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleFeedbackClick('helpful')}
                  title="Good response"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    userFeedback === 'helpful'
                      ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/30'
                      : 'hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedbackClick('unhelpful')}
                  title="Bad response / incorrect"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    userFeedback === 'unhelpful'
                      ? 'text-rose-400 bg-rose-950/60 border border-rose-500/30'
                      : 'hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>

                {userFeedback && (
                  <span className="text-[10px] text-slate-400 font-mono ml-1 hidden sm:inline">
                    {userFeedback === 'helpful' ? '✓ Helpful' : 'Flagged'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
