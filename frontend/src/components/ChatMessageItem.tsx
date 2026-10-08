import React, { useState } from 'react';
import { ChatMessage, DecisionTrace } from '../types';
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
  DollarSign,
  Sparkles,
  ArrowRight,
  Volume2,
  VolumeX,
  Users
} from 'lucide-react';
import { ConsensusResultCard } from './ConsensusResultCard';
import { AnswerCorrectnessCard } from './AnswerCorrectnessCard';

interface ChatMessageItemProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onOpenTrustReport: (trace: DecisionTrace) => void;
  onFeedback?: (messageId: string, feedback: 'helpful' | 'unhelpful') => void;
  onSelectFollowUp?: (query: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onRegenerate,
  onOpenTrustReport,
  onFeedback,
  onSelectFollowUp,
}) => {
  const [copied, setCopied] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      // Remove markdown formatting from spoken text
      const cleanText = message.text.replace(/[*#`_$[\]]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
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

  const { mainContent, followUps } = isUser ? { mainContent: message.text, followUps: [] } : extractFollowUps(message.text);

  return (
    <div className={`py-4 px-3 sm:px-6 flex gap-3.5 transition-colors ${
      isUser ? 'bg-transparent' : 'bg-slate-900/30 border-y border-slate-900/50'
    }`}>
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shadow-sm">
            <User className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Message Content Area */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-xs">
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
        </div>

        {/* Attached Files for User Message */}
        {message.attachedFiles && message.attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 pb-2">
            {message.attachedFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono"
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

        {/* Text / Markdown Render */}
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
        
        {/* Correctness Score (%) & "Why is this correct?" Verification Box */}
        {!isUser && !message.isStreaming && (trace || message.consensus_result) && (
          <AnswerCorrectnessCard
            trace={trace}
            consensusResult={message.consensus_result}
            onOpenTrustReport={onOpenTrustReport}
            onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
            showHeatmap={showHeatmap}
          />
        )}

        {/* Multi-AI Consensus Card & Answer Occurrence Rate */}
        {!isUser && message.consensus_result && (
          <ConsensusResultCard consensus={message.consensus_result} compact={true} />
        )}

        {/* Interactive Follow-Up Suggestion Pills */}
        {!isUser && followUps.length > 0 && (
          <div className="pt-2.5 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Suggested Follow-ups</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {followUps.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectFollowUp && onSelectFollowUp(q)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-xs text-blue-300 hover:text-white font-medium transition-all cursor-pointer flex items-center gap-1.5 hover:scale-[1.01] shadow-sm text-left group"
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
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="text-slate-500">Sources:</span>
            {trace.sources.map((src, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                • {src}
              </span>
            ))}
          </div>
        )}

        {/* AI Action Bar */}
        {!isUser && !message.isStreaming && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/40 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                title="Copy response"
                className="flex items-center gap-1 p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleSpeak}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud (Text-to-Speech)'}
                className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isSpeaking ? 'text-blue-400 bg-blue-950/60' : 'hover:text-white hover:bg-slate-800'
                }`}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-blue-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span className="text-[11px] hidden sm:inline">{isSpeaking ? 'Stop' : 'Read'}</span>
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  className="flex items-center gap-1 p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Regenerate</span>
                </button>
              )}

              {trace?.confidence_report?.sentences && trace.confidence_report.sentences.length > 0 && (
                <button
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  title="Toggle sentence-level evidence heatmap"
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer ml-1 ${
                    showHeatmap ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{showHeatmap ? 'Raw View' : 'Evidence Heatmap'}</span>
                </button>
              )}
            </div>

            {/* Thumbs up / down feedback */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => onFeedback && onFeedback(message.id, 'helpful')}
                title="Helpful response"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  message.feedback === 'helpful' ? 'text-emerald-400 bg-emerald-950/60' : 'hover:text-white hover:bg-slate-800'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onFeedback && onFeedback(message.id, 'unhelpful')}
                title="Not helpful response"
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  message.feedback === 'unhelpful' ? 'text-rose-400 bg-rose-950/60' : 'hover:text-white hover:bg-slate-800'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
