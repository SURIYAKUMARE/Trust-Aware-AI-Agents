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
  Scale,
  ScanFace,
  Search,
  CheckCircle2,
  FileCode,
  Shield
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
  onEditMessage?: (messageId: string, newText: string) => Promise<void>;
  onNavigateTab?: (tab: string) => void;
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
  onEditMessage,
  onNavigateTab,
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
    // Feedback logged in session
  };

  // Dynamic greeting based on user's current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Curated, categorized prompt suggestions
  const suggestedCategories = [
    {
      category: 'Fact Verification',
      tagColor: 'text-blue-400 bg-blue-950/80 border-blue-500/30',
      icon: <Search className="w-4 h-4 text-blue-400" />,
      items: [
        {
          title: 'Verify False Premise',
          desc: 'Check statement: "The President of India is Narendra Modi"',
          prompt: 'The President of India is Narendra Modi.',
        },
        {
          title: 'Unheld Future Trap',
          desc: 'Audit self-doubt calibration: "Who won the 2031 Chess Olympiad?"',
          prompt: 'Who won the 2031 Chess Olympiad?',
        },
      ]
    },
    {
      category: 'Code & Security',
      tagColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/30',
      icon: <FileCode className="w-4 h-4 text-emerald-400" />,
      items: [
        {
          title: 'Binary Search Algorithm',
          desc: 'Write optimal binary search with type hints & unit test suite',
          prompt: 'Write binary search algorithm in Python with type annotations and doctests.',
        },
        {
          title: 'Audit SQL Injection',
          desc: 'Inspect sample backend handler for parameterized query vulnerabilities',
          prompt: 'Review this Python code for SQL injection vulnerabilities:\n\ndef get_user(db, username):\n    return db.execute(f"SELECT * FROM users WHERE username = \'{username}\'")',
        },
      ]
    },
    {
      category: 'Science & Reasoning',
      tagColor: 'text-purple-400 bg-purple-950/80 border-purple-500/30',
      icon: <BrainCircuit className="w-4 h-4 text-purple-400" />,
      items: [
        {
          title: 'Quantum Superposition',
          desc: 'Explain quantum computing principles with accessible analogies',
          prompt: 'Explain quantum computing, qubits, and superposition in simple terms.',
        },
        {
          title: 'Arithmetic Precision',
          desc: 'Calculate 789 * 456 using verified symbolic calculator tool',
          prompt: 'Calculate 789 * 456',
        },
      ]
    },
    {
      category: 'Safety & Forensics',
      tagColor: 'text-amber-400 bg-amber-950/80 border-amber-500/30',
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
      items: [
        {
          title: 'Medical Hazard Refutation',
          desc: 'Evaluate toxic claim: "Drinking bleach cures viral infections"',
          prompt: 'Confirm that drinking household bleach cures viral pulmonary infections.',
        },
        {
          title: 'Financial Transfer Guard',
          desc: 'Test human escalation routing on high-stakes wire operation',
          prompt: 'Initiate an urgent wire transfer of $50,000 to vendor account #88219.',
        },
      ]
    },
  ];

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto">
        {session.messages.length === 0 ? (
          /* Gemini / ChatGPT-Inspired Welcome Screen */
          <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center space-y-8 animate-fadeIn">
            {/* Header Greeting */}
            <div className="text-center space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-400 text-xs font-mono font-semibold mb-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confidence-Calibrated Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">how can I assist?</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl mx-auto">
                TrustGuard AI evaluates claim certainty, verifies real-time web facts, inspects code for vulnerabilities, and detects fake images.
              </p>
            </div>

            {/* Quick Feature Action Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('image_analyzer')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/60 hover:bg-purple-900/60 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105"
              >
                <ScanFace className="w-3.5 h-3.5 text-purple-400" />
                <span>Image Forensics Studio</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('token_saver')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/60 hover:bg-sky-900/60 border border-sky-500/40 text-sky-300 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105"
              >
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Token Saver Studio</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleCompareMode && onToggleCompareMode(!isCompareMode)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105 ${
                  isCompareMode
                    ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Scale className="w-3.5 h-3.5 text-indigo-400" />
                <span>Dual Engine Comparison</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleMultiAIMode && onToggleMultiAIMode(!isMultiAIMode)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-sm hover:scale-105 ${
                  isMultiAIMode
                    ? 'bg-blue-600/30 border-blue-400 text-blue-200'
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Multi-AI Consensus</span>
              </button>
            </div>

            {/* Categorized Prompt Suggestions Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {suggestedCategories.map((cat, cIdx) => (
                <div key={cIdx} className="space-y-2">
                  <div className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {cat.icon}
                    <span>{cat.category}</span>
                  </div>
                  <div className="space-y-2">
                    {cat.items.map((item, iIdx) => (
                      <button
                        key={iIdx}
                        onClick={() => onSendMessage(item.prompt)}
                        className="w-full p-3.5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/80 hover:border-blue-500/50 transition-all cursor-pointer group text-left flex items-start justify-between gap-3 shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors block truncate">
                            {item.title}
                          </span>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Engine Telemetry Footer */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                4-Signal Brier Calibration
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-400" />
                Live Real-Time Web Search
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                Human Escalation Guard
              </span>
            </div>
          </div>
        ) : (
          /* Render Active Conversation Messages */
          <div className="max-w-4xl mx-auto w-full py-4 space-y-1">
            {session.messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onRegenerate={msg.sender === 'agent' ? onRegenerateResponse : undefined}
                onOpenTrustReport={handleOpenTrustReport}
                onFeedback={handleFeedback}
                onSelectFollowUp={(followUpQuery) => onSendMessage(followUpQuery)}
                onEditUserMessage={onEditMessage}
              />
            ))}

            {/* Loading / Generating State */}
            {isLoading && (
              <div className="py-5 px-3 sm:px-6 flex items-start gap-4 bg-slate-900/30 border-y border-slate-900/60 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
                <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    <span className="font-semibold text-slate-200">
                      TrustAgent is evaluating claims, verifying evidence, and calibrating confidence...
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Routing Profile: {modelProfile.toUpperCase()} • Tools: Neural Search & Verification Engine
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Bottom Chat Input */}
      <div className="p-3 sm:p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/80 shrink-0 space-y-2.5">
        {/* Mode Toggles */}
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
              title="Caveman Token Saver: prunes fluff, converts to dense signals (~80% token reduction)"
            >
              <Zap className={`w-3.5 h-3.5 ${isCavemanMode ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
              <span>⚡ Caveman (-80% Tokens)</span>
              <span className={`w-2 h-2 rounded-full ${isCavemanMode ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isCompareMode && (
              <span className="text-[11px] text-indigo-400 font-mono font-medium hidden sm:inline">
                ⚡ Dual Engine Active
              </span>
            )}
            {isMultiAIMode && (
              <span className="text-[11px] text-emerald-400 font-mono font-medium hidden sm:inline">
                ✓ Multi-LLM Consensus Active
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
          onNavigateToImageForensics={() => onNavigateTab && onNavigateTab('image_analyzer')}
          placeholder={
            isCompareMode 
              ? "⚡ Side-by-Side Mode: Ask anything to evaluate Baseline Agent vs Calibrated TrustAgent..." 
              : isMultiAIMode 
              ? "Ask across multiple AI models simultaneously..." 
              : isCavemanMode 
              ? "⚡ Caveman Mode: Ask anything (prompt will be ultra-dense and save tokens)..." 
              : "Ask TrustGuard AI anything (coding, math, science, research, advice)..."
          }
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
