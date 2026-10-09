import React, { useState } from 'react';
import { ConversationSession } from '../types';
import { 
  Plus, 
  Search, 
  Pin, 
  PinOff, 
  Trash2, 
  Edit3, 
  Sparkles, 
  BrainCircuit, 
  Settings, 
  BarChart3, 
  Award, 
  Flame, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  User, 
  ShieldCheck,
  ScanFace,
  Zap,
  MessageSquare
} from 'lucide-react';

interface ChatSidebarProps {
  sessions: ConversationSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onPinSession: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenSavedPrompts: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  onNavigateView: (view: string) => void;
  pendingEscalationsCount?: number;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  isOpen,
  onToggleOpen,
  onOpenSavedPrompts,
  onOpenMemory,
  onOpenSettings,
  onNavigateView,
  pendingEscalationsCount = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const startRename = (s: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditTitle(s.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const filteredSessions = sessions.filter(s => {
    const term = searchTerm.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(term);
    const messageMatch = s.messages.some(m => m.text.toLowerCase().includes(term));
    return titleMatch || messageMatch;
  });

  const pinnedSessions = filteredSessions.filter(s => s.isPinned);
  const unpinnedSessions = filteredSessions.filter(s => !s.isPinned);

  // Group unpinned sessions into ChatGPT / Gemini-style time buckets
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const sevenDaysAgo = todayStart - 7 * 86400000;

  const todayList: ConversationSession[] = [];
  const yesterdayList: ConversationSession[] = [];
  const prev7DaysList: ConversationSession[] = [];
  const olderList: ConversationSession[] = [];

  for (const s of unpinnedSessions) {
    const ts = new Date(s.updatedAt || s.createdAt || 0).getTime();
    if (ts >= todayStart) {
      todayList.push(s);
    } else if (ts >= yesterdayStart) {
      yesterdayList.push(s);
    } else if (ts >= sevenDaysAgo) {
      prev7DaysList.push(s);
    } else {
      olderList.push(s);
    }
  }

  // Collapsed desktop state
  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 px-2 border-r border-slate-800 bg-slate-950 w-16 shrink-0 justify-between select-none">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onToggleOpen}
            title="Expand Sidebar"
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={onNewChat}
            title="New Chat"
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => onNavigateView('image_analyzer')}
            title="Fake Image Forensics"
            className="p-2 text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
          >
            <ScanFace className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateView('token_saver')}
            title="Token Saver Studio"
            className="p-2 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSavedPrompts}
            title="Prompt Templates"
            className="p-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Backdrop Overlay (only on small screens when sidebar is open) */}
      <div
        onClick={onToggleOpen}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        aria-hidden="true"
      />

      <aside className="fixed inset-y-0 left-0 z-40 lg:static w-72 sm:w-80 border-r border-slate-800 bg-slate-950/98 backdrop-blur-2xl flex flex-col h-full shrink-0 transition-transform duration-300 select-none shadow-2xl lg:shadow-none">
        {/* Top Header & New Chat Button */}
        <div className="p-3.5 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black tracking-tight text-white block">TrustGuard AI</span>
                <span className="text-[10px] text-slate-400 font-mono">Conversational Studio</span>
              </div>
            </div>
            <button
              onClick={onToggleOpen}
              title="Collapse Sidebar"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
              <span>New Chat</span>
            </span>
            <span className="text-[10px] bg-blue-700/60 px-1.5 py-0.5 rounded font-mono text-blue-200">
              ⌘K
            </span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>
        </div>

        {/* Conversations Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Pinned Chats */}
          {pinnedSessions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 flex items-center gap-1">
                <Pin className="w-3 h-3 text-amber-400" />
                <span>Pinned</span>
              </span>
              {pinnedSessions.map((s) => renderSessionItem(s))}
            </div>
          )}

          {/* Time-Grouped Chat Buckets */}
          {todayList.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block">
                Today
              </span>
              {todayList.map((s) => renderSessionItem(s))}
            </div>
          )}

          {yesterdayList.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block">
                Yesterday
              </span>
              {yesterdayList.map((s) => renderSessionItem(s))}
            </div>
          )}

          {prev7DaysList.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block">
                Previous 7 Days
              </span>
              {prev7DaysList.map((s) => renderSessionItem(s))}
            </div>
          )}

          {olderList.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 block">
                Older
              </span>
              {olderList.map((s) => renderSessionItem(s))}
            </div>
          )}

          {filteredSessions.length === 0 && (
            <p className="text-xs text-slate-500 italic px-2 py-4 text-center">
              {searchTerm ? 'No matching chats found.' : 'No conversations yet.'}
            </p>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="p-3 mx-3 mb-2 rounded-xl bg-rose-950/95 border border-rose-500/50 text-xs text-rose-200 space-y-2 animate-fadeIn">
            <p className="font-semibold">Delete this conversation permanently?</p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-[11px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteSession(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold font-mono text-[11px] cursor-pointer shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Bottom Utility Tools & Platform Navigation */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-1.5 text-xs">
          <div className="grid grid-cols-2 gap-1.5 mb-1.5">
            <button
              onClick={onOpenSavedPrompts}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Prompts</span>
            </button>
            <button
              onClick={onOpenMemory}
              className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-slate-300 hover:text-white transition-all cursor-pointer text-[11px]"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              <span>Memory</span>
            </button>
          </div>

          {/* Quick Feature Navigation List */}
          <div className="pt-1.5 border-t border-slate-900 space-y-1">
            <button
              onClick={() => onNavigateView('image_analyzer')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-900 text-[11px] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ScanFace className="w-3.5 h-3.5 text-purple-400" />
                <span>Image Forensics Studio</span>
              </span>
            </button>
            <button
              onClick={() => onNavigateView('token_saver')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-900 text-[11px] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-sky-400" />
                <span>Token Saver Studio</span>
              </span>
            </button>
            <button
              onClick={() => onNavigateView('monitoring')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 text-[11px] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Monitoring & Calibration</span>
              </span>
            </button>
            <button
              onClick={() => onNavigateView('evaluation')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 text-[11px] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Evaluation Benchmarks</span>
              </span>
            </button>
            <button
              onClick={() => onNavigateView('playground')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 text-[11px] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Adversarial Playground</span>
              </span>
            </button>
            <button
              onClick={() => onNavigateView('escalations')}
              className="w-full flex items-center justify-between p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 text-[11px] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Human Escalations</span>
              </span>
              {pendingEscalationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold animate-pulse">
                  {pendingEscalationsCount}
                </span>
              )}
            </button>
          </div>

          {/* User Profile & Settings Footer */}
          <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-200 block">TrustGuard Pro</span>
                <span className="text-[9px] text-emerald-400 font-mono">Calibrated & Active</span>
              </div>
            </div>
            <button
              onClick={onOpenSettings}
              title="API & Model Settings"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  function renderSessionItem(s: ConversationSession) {
    const isActive = s.id === activeSessionId;
    const isEditing = editingId === s.id;
    const lastMsg = s.messages[s.messages.length - 1];

    if (isEditing) {
      return (
        <form
          key={s.id}
          onSubmit={(e) => handleSaveRename(s.id, e)}
          className="p-2 rounded-xl bg-slate-900 border border-blue-500 flex items-center gap-2"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-xs text-white focus:outline-none font-medium"
          />
          <button
            type="button"
            onClick={(e) => handleSaveRename(s.id, e)}
            className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditingId(null);
            }}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      );
    }

    return (
      <div
        key={s.id}
        onClick={() => onSelectSession(s.id)}
        className={`group p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2 border ${
          isActive
            ? 'bg-blue-950/50 border-blue-500/50 text-white shadow-sm'
            : 'border-transparent hover:bg-slate-900/60 text-slate-300'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {s.isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
            <span className="text-xs font-semibold truncate block">
              {s.title}
            </span>
          </div>
          {lastMsg && (
            <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
              {lastMsg.text}
            </p>
          )}
        </div>

        {/* Hover Action Buttons */}
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPinSession(s.id);
            }}
            title={s.isPinned ? 'Unpin' : 'Pin'}
            className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {s.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
          </button>
          <button
            onClick={(e) => startRename(s, e)}
            title="Rename"
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirmId(s.id);
            }}
            title="Delete"
            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }
};
