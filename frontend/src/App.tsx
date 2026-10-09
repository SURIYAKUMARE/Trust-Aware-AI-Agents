import React, { useState, useEffect } from 'react';
import { Header, TabType } from './components/Header';
import { ChatSidebar } from './components/ChatSidebar';
import { ConversationalChatView } from './components/ConversationalChatView';
import { DecisionTimeline } from './components/DecisionTimeline';
import { CompareView } from './components/CompareView';
import { EscalationInbox } from './components/EscalationInbox';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { EvaluationView } from './components/EvaluationView';
import { ArchitectureView } from './components/ArchitectureView';
import { DemoMode } from './components/DemoMode';
import { AdversarialPlayground } from './components/AdversarialPlayground';
import { TokenSaverView } from './components/TokenSaverView';
import { ExtensionCompanionView } from './components/ExtensionCompanionView';
import { ModelSettingsModal } from './components/ModelSettingsModal';
import { SavedPromptsModal } from './components/SavedPromptsModal';
import { ConversationMemoryModal } from './components/ConversationMemoryModal';
import { 
  DecisionTrace, 
  CompareResult, 
  ConversationSession, 
  ChatMessage, 
  ModelProfile, 
  UploadedFile 
} from './types';
import { api } from './api';
import { getStoredModelSettings } from './services/clientAgent';

const SESSIONS_STORAGE_KEY = 'trustguard_chat_sessions';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('console');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [modelProfile, setModelProfile] = useState<ModelProfile>('auto');
  const [providerLabel, setProviderLabel] = useState<string>('🛡️ TrustEngine');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('trustguard_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('trustguard_theme', next);
      } catch {}
      return next;
    });
  };

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isSavedPromptsOpen, setIsSavedPromptsOpen] = useState<boolean>(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState<boolean>(false);

  // Status & Execution state
  const [latestTrace, setLatestTrace] = useState<DecisionTrace | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMultiAIMode, setIsMultiAIMode] = useState<boolean>(false);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [isCavemanMode, setIsCavemanMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('trustguard_caveman_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCavemanMode = (enabled: boolean) => {
    setIsCavemanMode(enabled);
    try {
      localStorage.setItem('trustguard_caveman_mode', String(enabled));
    } catch {}
  };

  const [pendingEscalationsCount, setPendingEscalationsCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multi-Turn Conversation Sessions
  const [sessions, setSessions] = useState<ConversationSession[]>(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading sessions from storage:', e);
    }
    const initialId = `session-${Date.now()}`;
    return [
      {
        id: initialId,
        title: 'Welcome to TrustGuard AI',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        modelProfile: 'auto',
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || `session-${Date.now()}`;
  });

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error('Error persisting sessions:', e);
    }
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const refreshProviderLabel = () => {
    const s = getStoredModelSettings();
    if (s.provider === 'groq' || s.groqKey) {
      setProviderLabel('⚡ Groq LPU (GPT-OSS 120B)');
    } else if (s.provider === 'gemini') {
      setProviderLabel('⚡ Gemini 2.0');
    } else if (s.provider === 'openai') {
      setProviderLabel('✨ GPT-4o');
    } else if (s.customBackendUrl) {
      setProviderLabel('⚙️ Custom API');
    } else {
      setProviderLabel('🛡️ TrustEngine');
    }
  };

  useEffect(() => {
    refreshProviderLabel();
  }, []);

  // Poll escalations count
  const checkEscalations = async () => {
    try {
      const items = await api.listEscalations();
      const pending = items.filter(i => i.status === 'PENDING').length;
      setPendingEscalationsCount(pending);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    checkEscalations();
    const interval = setInterval(checkEscalations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Session Handlers
  const handleNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession: ConversationSession = {
      id: newId,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modelProfile,
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setActiveTab('console');
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setActiveTab('console');
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => {
      const remaining = prev.filter(s => s.id !== id);
      if (remaining.length === 0) {
        const freshId = `session-${Date.now()}`;
        return [{
          id: freshId,
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          modelProfile: 'auto',
        }];
      }
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle, updatedAt: new Date().toISOString() } : s));
  };

  const handlePinSession = (id: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, isPinned: !s.isPinned } : s));
  };

  const handleClearMemory = () => {
    setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
  };

  // Generate short, smart chat title
  const generateSmartTitle = (prompt: string): string => {
    const cleaned = prompt.replace(/^(can you|please|explain|what is|how to)\s+/i, '').trim();
    const words = cleaned.split(/\s+/).slice(0, 5).join(' ');
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  // Main message send handler
  const handleSendMessage = async (text: string, files?: UploadedFile[]) => {
    if (!text.trim() && (!files || files.length === 0)) return;
    setIsLoading(true);
    setErrorMessage(null);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let promptToSend = text;
    let tokenSaverInfo: any = undefined;

    if (isCavemanMode && text.trim().length > 6) {
      try {
        const comp = await api.compressContext({ text, mode: 'compact' });
        tokenSaverInfo = {
          mode: 'compact_caveman',
          original_tokens: comp.original_tokens,
          compressed_tokens: comp.compressed_tokens,
          saved_tokens: comp.saved_tokens,
          saved_ratio: comp.compression_ratio,
          cost_saved_usd: comp.estimated_cost_saved_usd,
        };
        promptToSend = `[CAVEMAN TOKEN SAVER DIRECTIVE: Answer in ultra-dense, zero-fluff, token-optimized style. Omit conversational greetings, filler introductions, and polite sign-offs. Use concise bullet points, direct code, or key:value format. Save ~70-85% tokens while guaranteeing 100% technical accuracy.]\n\n${comp.compressed_text}`;
      } catch (e) {
        console.warn('Caveman compression error, using original text:', e);
      }
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: timeStr,
      attachedFiles: files,
      token_saver_info: tokenSaverInfo,
    };

    // Update session title on first message
    const currentMsgs = activeSession.messages;
    const isFirstUserMessage = currentMsgs.filter(m => m.sender === 'user').length === 0;
    const updatedTitle = (isFirstUserMessage && (activeSession.title === 'New Chat' || activeSession.title.includes('Welcome')))
      ? generateSmartTitle(text)
      : activeSession.title;

    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      title: updatedTitle,
      messages: [...s.messages, userMessage],
      updatedAt: now.toISOString(),
    } : s));

    try {
      const historyContext = [...currentMsgs, userMessage].map(m => ({
        sender: m.sender,
        text: m.text,
      }));

      let agentMessage: ChatMessage;

      if (isCompareMode) {
        // Run side-by-side comparison: Baseline uncalibrated vs TrustAgent confidence-calibrated
        const comp = await api.compare(promptToSend);
        setCompareResult(comp);
        setLatestTrace(comp.trust_trace);
        agentMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          text: comp.trust_trace.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          trace: comp.trust_trace,
          sources: comp.trust_trace.sources,
          token_saver_info: tokenSaverInfo,
          compare_result: comp,
        };
      } else if (isMultiAIMode) {
        // Query Google, ChatGPT, Gemini, Claude, Groq and compute cross-model occurrence rate
        const consensus = await api.getMultiAIConsensus(promptToSend);
        agentMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'agent',
          text: consensus.consensus_answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          consensus_result: consensus,
          token_saver_info: tokenSaverInfo,
        };
      } else {
        const chatRes = await api.chat(promptToSend, activeSessionId, historyContext, files);
        agentMessage = {
          id: chatRes.id || `msg-${Date.now() + 1}`,
          sender: 'agent',
          text: chatRes.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: chatRes.sources?.map((s: any) => s.url && s.url !== '#' ? s.url : s.title) || [],
          token_saver_info: tokenSaverInfo,
          verification_data: {
            confidence_score: chatRes.confidence_score,
            confidence_band: chatRes.confidence_band,
            confidence_explanation: chatRes.confidence_explanation,
            status_summary: chatRes.status_summary,
            claims: chatRes.claims || [],
            sources: chatRes.sources || [],
            independent_sources_count: chatRes.independent_sources_count || 0,
            contradictions_detected: chatRes.contradictions_detected || [],
            code_review: chatRes.code_review,
            prompt_review: chatRes.prompt_review,
            self_correction: chatRes.self_correction,
            verified_at: chatRes.verified_at,
            latency_ms: chatRes.latency_ms,
            live_verification_active: chatRes.live_verification_active,
          },
        };
      }

      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...s.messages, agentMessage],
        updatedAt: new Date().toISOString(),
      } : s));

      await checkEscalations();
    } catch (err: any) {
      setErrorMessage(err.message || 'System encountered an error generating the response.');
      const errorMessageItem: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        text: `Something went wrong while generating the response: ${err.message || 'Network error'}. You can retry or switch model provider in Settings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...s.messages, errorMessageItem],
        updatedAt: new Date().toISOString(),
      } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateResponse = async () => {
    const msgs = activeSession.messages;
    if (msgs.length === 0) return;
    const lastUserMsg = [...msgs].reverse().find(m => m.sender === 'user');
    if (!lastUserMsg) return;

    // Pop the last agent message
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: s.messages.slice(0, -1),
    } : s));

    await handleSendMessage(lastUserMsg.text, lastUserMsg.attachedFiles);
  };

  const handleCompare = async (query: string): Promise<CompareResult> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await api.compare(query);
      setCompareResult(result);
      setLatestTrace(result.trust_trace);
      await checkEscalations();
      return result;
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing comparison');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-blue-600 selection:text-white ${
      theme === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setErrorMessage(null);
        }}
        pendingEscalationsCount={pendingEscalationsCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentProvider={providerLabel}
        currentProfile={modelProfile}
        onSelectProfile={setModelProfile}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Error alert toast if present */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-2 z-20">
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Layout Area: Sidebar + Active View */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)]">
        {/* Collapsible Left Sidebar */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          onPinSession={handlePinSession}
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSavedPrompts={() => setIsSavedPromptsOpen(true)}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNavigateView={(view) => setActiveTab(view as TabType)}
          pendingEscalationsCount={pendingEscalationsCount}
        />

        {/* Dynamic View Center */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden">
          {activeTab === 'console' && (
            <ConversationalChatView
              session={activeSession}
              onSendMessage={handleSendMessage}
              onRegenerateResponse={handleRegenerateResponse}
              isLoading={isLoading}
              modelProfile={modelProfile}
              isMultiAIMode={isMultiAIMode}
              onToggleMultiAIMode={setIsMultiAIMode}
              isCavemanMode={isCavemanMode}
              onToggleCavemanMode={handleToggleCavemanMode}
              isCompareMode={isCompareMode}
              onToggleCompareMode={setIsCompareMode}
            />
          )}

          {activeTab === 'token_saver' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <TokenSaverView 
                onUseInChat={(text) => {
                  setActiveTab('console');
                  handleSendMessage(text);
                }}
              />
            </div>
          )}

          {activeTab === 'extension' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <ExtensionCompanionView />
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <DecisionTimeline trace={latestTrace} />
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <CompareView
                onCompare={handleCompare}
                lastResult={compareResult}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeTab === 'playground' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <AdversarialPlayground />
            </div>
          )}

          {activeTab === 'escalations' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <EscalationInbox onRefresh={checkEscalations} />
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <MonitoringDashboard />
            </div>
          )}

          {activeTab === 'evaluation' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <EvaluationView />
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <ArchitectureView />
            </div>
          )}

          {activeTab === 'demo' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-7xl mx-auto w-full">
              <DemoMode />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <ModelSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={refreshProviderLabel}
      />

      <SavedPromptsModal
        isOpen={isSavedPromptsOpen}
        onClose={() => setIsSavedPromptsOpen(false)}
        onSelectPrompt={(p) => handleSendMessage(p)}
      />

      <ConversationMemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        messages={activeSession.messages}
        onClearMemory={handleClearMemory}
      />
    </div>
  );
}

export default App;
