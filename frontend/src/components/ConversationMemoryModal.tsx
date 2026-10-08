import React from 'react';
import { ChatMessage } from '../types';
import { 
  X, 
  BrainCircuit, 
  Trash2, 
  Check, 
  FileText, 
  User, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ConversationMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onClearMemory: () => void;
}

export const ConversationMemoryModal: React.FC<ConversationMemoryModalProps> = ({
  isOpen,
  onClose,
  messages,
  onClearMemory,
}) => {
  if (!isOpen) return null;

  // Extract facts stored from user messages
  const userMessages = messages.filter(m => m.sender === 'user');
  const storedFacts: string[] = [];

  for (const m of userMessages) {
    const text = m.text;
    if (/(?:my name is|i am|call me)\s+([a-zA-Z]+)/i.test(text)) {
      const match = text.match(/(?:my name is|i am|call me)\s+([a-zA-Z]+)/i);
      if (match) storedFacts.push(`User Name: ${match[1]}`);
    }
    if (/(?:i live in|i am from|my city is)\s+([a-zA-Z\s]+)/i.test(text)) {
      const match = text.match(/(?:i live in|i am from|my city is)\s+([a-zA-Z\s]+)/i);
      if (match) storedFacts.push(`Location: ${match[1].trim()}`);
    }
    if (m.attachedFiles && m.attachedFiles.length > 0) {
      for (const f of m.attachedFiles) {
        storedFacts.push(`Uploaded Document: ${f.name} (${Math.round(f.size / 1024)} KB)`);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Conversation Memory Context</h3>
              <p className="text-xs text-slate-400">Information retained across your current dialogue session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              TrustGuard AI maintains privacy-first in-session working memory. Stored memory is scoped to this conversation and can be purged at any time.
            </p>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Extracted Facts & Attributes ({storedFacts.length})
            </span>
            {storedFacts.length > 0 ? (
              <div className="space-y-1.5">
                {storedFacts.map((fact, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-200 flex items-center gap-2 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-800 rounded-xl">
                No personalized facts extracted yet in this conversation session.
              </p>
            )}
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Session History Statistics
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Total Messages</span>
                <span className="text-base font-bold text-white mt-1 block">{messages.length}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Context Turns</span>
                <span className="text-base font-bold text-white mt-1 block">{userMessages.length} Turns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onClearMemory();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Working Memory</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
