import React, { useState, useRef, useEffect } from 'react';
import { 
  ChatMessage, 
  ConversationSession, 
  DecisionTrace, 
  ModelProfile, 
  UploadedFile 
} from '../types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { TrustReportModal } from './TrustReportModal';
import { 
  ShieldCheck, 
  Sparkles, 
  Code2, 
  BrainCircuit, 
  Calculator, 
  Flame, 
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Zap,
  Info,
  Users,
  Scale
} from 'lucide-react';

interface ConversationalChatViewProps {
  session: ConversationSession;
  onSendMessage: (text: string, files?: UploadedFile[]) => Promise<void>;
  onRegenerateResponse: () => Promise<void>;
  onStopGeneration?: () => void;
  isLoading: boolean;
  modelProfile: ModelProfile;
  isMultiAIMode?: boolean;
  onToggleMultiAIMode?: (enabled: boolean) => void;
  isCavemanMode?: boolean;
  onToggleCavemanMode?: (enabled: boolean) => void;
  isCompareMode?: boolean;
  onToggleCompareMode?: (enabled: boolean) => void;
}

export const ConversationalChatView: React.FC<ConversationalChatViewProps> = ({
  session,
  onSendMessage,
  onRegenerateResponse,
  onStopGeneration,
  isLoading,
  modelProfile,
  isMultiAIMode = false,
  onToggleMultiAIMode,
  isCavemanMode = false,
  onToggleCavemanMode,
  isCompareMode = false,
  onToggleCompareMode,
}) => {
  const [selectedTrace, setSelectedTrace] = useState<DecisionTrace | null>(null);
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, isLoading]);

  const handleOpenTrustReport = (trace: DecisionTrace) => {
    setSelectedTrace(trace);
    setIsTrustModalOpen(true);
  };

  const handleFeedback = (messageId: string, feedback: 'helpful' | 'unhelpful') => {
    // Feedback recorded in message state
  };

  const quickStarters = [
    {
      title: 'Quantum Computing',
      desc: 'Explain quantum mechanics & superposition in simple terms',
      prompt: 'Explain quantum computing and its core principles in simple terms.',
      icon: <BrainCircuit className="w-4 h-4 text-purple-400" />,
    },
    {
      title: 'Python Binary Search',
      desc: 'Optimal implementation with tests and time complexity',
      prompt: 'Write binary search algorithm in Python with type annotations.',
      icon: <Code2 className="w-4 h-4 text-emerald-400" />,
    },
    {
      title: 'Precision Arithmetic',
      desc: 'Calculate 789 * 456 with tool verification',
      prompt: 'Calculate 789 * 456',
      icon: <Calculator className="w-4 h-4 text-amber-400" />,
    },
    {
      title: 'Trap Benchmark',
      desc: 'Test self-doubt calibration on unheld future event',
      prompt: 'Who won the 2031 Chess Olympiad?',
      icon: <Flame className="w-4 h-4 text-rose-400" />,
    },
  ];

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto">
        {session.messages.length === 0 ? (
          /* Empty State / Welcome Hero */
          <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                TrustGuard AI Assistant
              </h2>
              <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
                A confidence-aware conversational platform that doesn't just guess blindly. It estimates how sure it is, verifies facts with precision tools, asks for clarification when ambiguous, and halts on critical risks.
              </p>
            </div>

            {/* Quick Starters Grid */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 text-left">
              {quickStarters.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(item.prompt)}
                  className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-blue-500/50 transition-all cursor-pointer group flex items-start gap-3 text-left"
                >
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors block">
                      {item.title}
                    </span>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 flex items-center gap-4 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                4-Signal Calibration
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Multi-Model Routing
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Human Escalation Guard
              </span>
            </div>
          </div>
        ) : (
          /* Render Conversation Messages */
          <div className="max-w-4xl mx-auto w-full py-4 space-y-1">
            {session.messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onRegenerate={msg.sender === 'agent' ? onRegenerateResponse : undefined}
                onOpenTrustReport={handleOpenTrustReport}
                onFeedback={handleFeedback}
                onSelectFollowUp={(followUpQuery) => onSendMessage(followUpQuery)}
              />
            ))}

            {/* Loading / Thinking State */}
            {isLoading && (
              <div className="py-4 px-6 flex items-start gap-4 bg-slate-900/20 border-y border-slate-900/40">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
                <div className="space-y-1 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="font-semibold text-slate-300">
                      Evaluating consensus, checking claim evidence, and routing action...
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Mode: {modelProfile.toUpperCase()} • Tools: Symbol Calculator / Neural Retriever
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Chat Input */}
      <div className="p-3 sm:p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/60 shrink-0 space-y-2">
        {/* Multi-AI Consensus Mode, Side-by-Side Compare & Caveman Token Saver Toggles */}
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleCompareMode && onToggleCompareMode(!isCompareMode)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isCompareMode
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-indigo-500/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Side-by-Side Model Comparison: runs Traditional Baseline Agent simultaneously alongside TrustAgent"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              <span>Side-by-Side Compare</span>
              <span className={`w-2 h-2 rounded-full ${isCompareMode ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => onToggleMultiAIMode && onToggleMultiAIMode(!isMultiAIMode)}
              className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isMultiAIMode
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-blue-500/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-AI Mode</span>
              <span className={`w-2 h-2 rounded-full ${isMultiAIMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => onToggleCavemanMode && onToggleCavemanMode(!isCavemanMode)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isCavemanMode
                  ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-amber-500/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
              title="Caveman Token Saver: prunes fluff, strips pleasantries, converts to dense signals (~80% token reduction)"
            >
              <Zap className={`w-3.5 h-3.5 ${isCavemanMode ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
              <span>⚡ Caveman (~80% Token Saver)</span>
              <span className={`w-2 h-2 rounded-full ${isCavemanMode ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isCompareMode && (
              <span className="text-[11px] text-indigo-400 font-mono font-medium hidden sm:inline">
                ⚡ Side-by-Side Dual Engine Active
              </span>
            )}
            {isMultiAIMode && (
              <span className="text-[11px] text-emerald-400 font-mono font-medium hidden sm:inline">
                ✓ Computes Cross-AI Occurrence Rate
              </span>
            )}
          </div>
        </div>

        <ChatInput
          onSend={onSendMessage}
          onStop={onStopGeneration}
          isLoading={isLoading}
          isCavemanMode={isCavemanMode}
          onToggleCavemanMode={onToggleCavemanMode}
          placeholder={isCompareMode ? "⚡ Side-by-Side Mode: Ask anything to evaluate Baseline Agent vs Calibrated TrustAgent..." : (isMultiAIMode ? "Ask across Google, ChatGPT, Gemini, Claude & Groq simultaneously..." : (isCavemanMode ? "⚡ Caveman Mode: Ask anything (prompt will be hyper-dense and save tokens)..." : "Ask TrustGuard AI anything (coding, math, science, research, advice, operations)..."))}
        />
      </div>

      {/* Trust Report Modal */}
      <TrustReportModal
        trace={selectedTrace}
        isOpen={isTrustModalOpen}
        onClose={() => setIsTrustModalOpen(false)}
      />
    </div>
  );
};
