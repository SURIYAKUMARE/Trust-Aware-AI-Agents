import React, { useState, useEffect } from 'react';
import { Header, TabType } from './components/Header';
import { AgentConsole } from './components/AgentConsole';
import { DecisionTimeline } from './components/DecisionTimeline';
import { CompareView } from './components/CompareView';
import { EscalationInbox } from './components/EscalationInbox';
import { MonitoringDashboard } from './components/MonitoringDashboard';
import { EvaluationView } from './components/EvaluationView';
import { ArchitectureView } from './components/ArchitectureView';
import { DemoMode } from './components/DemoMode';
import { AdversarialPlayground } from './components/AdversarialPlayground';
import { DecisionTrace, CompareResult } from './types';
import { api } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('console');
  const [latestTrace, setLatestTrace] = useState<DecisionTrace | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pendingEscalationsCount, setPendingEscalationsCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Poll or check pending escalations count
  const checkEscalations = async () => {
    try {
      const items = await api.listEscalations();
      const pending = items.filter(i => i.status === 'PENDING').length;
      setPendingEscalationsCount(pending);
    } catch {
      // Ignore if offline
    }
  };

  useEffect(() => {
    checkEscalations();
    const interval = setInterval(checkEscalations, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleExecute = async (query: string): Promise<DecisionTrace> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const trace = await api.ask(query);
      setLatestTrace(trace);
      await checkEscalations();
      return trace;
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with backend API');
      throw err;
    } finally {
      setIsLoading(false);
    }
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
      setErrorMessage(err.message || 'Error performing comparison');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setErrorMessage(null);
        }}
        pendingEscalationsCount={pendingEscalationsCount}
      />

      {/* Error alert toast if present */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-3">
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'console' && (
          <AgentConsole
            onExecute={handleExecute}
            latestTrace={latestTrace}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'timeline' && (
          <DecisionTimeline trace={latestTrace} />
        )}

        {activeTab === 'compare' && (
          <CompareView
            onCompare={handleCompare}
            lastResult={compareResult}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'playground' && (
          <AdversarialPlayground />
        )}

        {activeTab === 'escalations' && (
          <EscalationInbox onRefresh={checkEscalations} />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringDashboard />
        )}

        {activeTab === 'evaluation' && (
          <EvaluationView />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureView />
        )}

        {activeTab === 'demo' && (
          <DemoMode />
        )}
      </main>
    </div>
  );
}

export default App;
