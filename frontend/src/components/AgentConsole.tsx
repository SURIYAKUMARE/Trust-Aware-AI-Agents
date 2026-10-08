import React, { useState } from 'react';
import { DecisionTrace } from '../types';
import { ConfidenceGauge } from './ConfidenceGauge';
import { WhyUnsurePanel } from './WhyUnsurePanel';
import { SentenceHeatmap } from './SentenceHeatmap';
import { exportTracePdf } from '../utils/exportPdf';
import { 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  ArrowRight,
  Terminal,
  HelpCircle,
  RefreshCw,
  FileDown
} from 'lucide-react';

interface AgentConsoleProps {
  onExecute: (query: string) => Promise<DecisionTrace>;
  latestTrace: DecisionTrace | null;
  isLoading: boolean;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({
  onExecute,
  latestTrace,
  isLoading,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'agent';
    text: string;
    trace?: DecisionTrace;
  }>>([
    {
      sender: 'agent',
      text: "Hello! I am TrustAgent, a confidence-aware AI system. I don't just generate answers—I quantify my certainty across 4 independent evaluation engines, explain my doubts, and route actions safely (verifying with tools, asking clarifying questions, or escalating high-stakes risks). Try asking me a question below!",
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;

    const query = inputQuery.trim();
    setInputQuery('');
    setMessages(prev => [...prev, { sender: 'user', text: query }]);

    try {
      const trace = await onExecute(query);
      setMessages(prev => [...prev, {
        sender: 'agent',
        text: trace.answer,
        trace: trace,
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'agent',
        text: `Error processing request: ${err.message || 'System failed to respond.'}`,
      }]);
    }
  };

  const handleSampleClick = (sample: string) => {
    setInputQuery(sample);
  };

  const samplePrompts = [
    { label: 'Easy Fact', text: 'What is the capital of France?' },
    { label: 'Trap Question', text: 'Who won the 2031 Chess Olympiad?' },
    { label: 'Ambiguous Query', text: 'Book me a flight' },
    { label: 'Tricky Math', text: 'Calculate 789 * 456' },
    { label: 'High Stakes', text: 'Refund Rs 50,000 to this account' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto w-full">
      {/* Sample Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-500 whitespace-nowrap">Suggested:</span>
        {samplePrompts.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSampleClick(s.text)}
            className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800/80 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-blue-400" />
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-900 shadow-inner">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-3 max-w-3xl">
              {msg.sender === 'agent' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
              )}

              <div className="flex-1">
                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-900/90 border border-slate-800/80 text-slate-200 shadow-lg'
                  }`}
                >
                  {msg.sender === 'agent' && msg.trace?.confidence_report?.sentences ? (
                    <SentenceHeatmap
                      sentences={msg.trace.confidence_report.sentences}
                      rawText={msg.text}
                      hasHumanVerifiedEvidence={msg.trace.confidence_report.has_human_verified_evidence}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}

                  {/* TrustAgent Trace Details (if attached to this message) */}
                  {msg.trace && (
                    <div className="mt-4 pt-3 border-t border-slate-800/90">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                        {/* Gauge & Level */}
                        <div className="flex items-center gap-3">
                          <ConfidenceGauge
                            score={msg.trace.final_confidence}
                            level={msg.trace.confidence_report.level}
                            size={72}
                            showDetails={false}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200">
                                Calibrated Confidence
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                                Route: {msg.trace.final_route}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Uncertainty: <span className="font-mono text-amber-400">{msg.trace.confidence_report.uncertainty_type}</span>
                            </p>
                          </div>
                        </div>

                        {/* Cost, Latency badges & PDF Export */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                          <button
                            onClick={() => exportTracePdf(msg.trace!)}
                            title="Download A4 PDF Audit Report"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/30 border border-indigo-500/50 hover:bg-indigo-600/50 text-indigo-200 text-xs font-mono transition-colors cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                            <span>PDF Audit</span>
                          </button>
                          <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {Math.round(msg.trace.latency_ms)}ms
                          </span>
                          <span className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            <DollarSign className="w-3 h-3 text-slate-500" />
                            ${msg.trace.cost_usd.toFixed(5)}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Why I'm Unsure Panel */}
                      <WhyUnsurePanel report={msg.trace.confidence_report} defaultOpen={false} />
                    </div>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 max-w-2xl">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Evaluating consistency, verifying claims, and calibrating decision route...
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask TrustAgent any question, arithmetic problem, or operational request..."
          disabled={isLoading}
          className="flex-1 bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 cursor-pointer"
        >
          <span>Ask</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
