import React, { useState, useEffect } from 'react';
import { CompareResult } from '../types';
import { api } from '../api';
import { ConfidenceGauge } from './ConfidenceGauge';
import { WhyUnsurePanel } from './WhyUnsurePanel';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert, 
  HelpCircle, 
  Wrench, 
  Bot, 
  Search, 
  FastForward,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface DemoModeProps {
  onScenarioSelect?: (scenarioId: number) => void;
}

export const DemoMode: React.FC<DemoModeProps> = () => {
  const [activeScenarioId, setActiveScenarioId] = useState<number>(1);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);

  const scenarios = [
    {
      id: 1,
      title: '1. Easy Fact',
      query: 'What is the capital of France?',
      badge: 'HIGH CONFIDENCE',
      badgeColor: 'text-emerald-400 bg-emerald-950 border-emerald-500/30',
      expectedRoute: 'ANSWER',
      description: 'Standard verifiable factual query. Directly answers with high certainty and cited knowledge.',
    },
    {
      id: 2,
      title: '2. Fabricated Trap',
      query: 'Who won the 2031 Chess Olympiad?',
      badge: 'HONEST ABSTAIN',
      badgeColor: 'text-slate-300 bg-slate-900 border-slate-700',
      expectedRoute: 'ABSTAIN',
      description: 'Fictional/future entity trap. Baseline hallucinates a fake winner; TrustAgent checks web search & honestly abstains.',
    },
    {
      id: 3,
      title: '3. Ambiguous Request',
      query: 'Book me a flight',
      badge: 'CLARIFY QUESTION',
      badgeColor: 'text-amber-400 bg-amber-950 border-amber-500/30',
      expectedRoute: 'CLARIFY',
      description: 'Underspecified prompt. Instead of booking an arbitrary trip, TrustAgent asks for flight details.',
    },
    {
      id: 4,
      title: '4. Tricky Arithmetic',
      query: 'Calculate 789 * 456',
      badge: 'TOOL VERIFICATION',
      badgeColor: 'text-blue-400 bg-blue-950 border-blue-500/30',
      expectedRoute: 'VERIFY (SymPy)',
      description: 'Mental arithmetic risk. Routes to symbolic calculator, validates 359,784, and upgrades confidence to 92%.',
    },
    {
      id: 5,
      title: '5. Conflicting Evidence',
      query: 'Are caffeine and coffee consumption unequivocally beneficial or harmful for cardiovascular health?',
      badge: 'SPECIALIST HANDOFF',
      badgeColor: 'text-cyan-400 bg-cyan-950 border-cyan-500/30',
      expectedRoute: 'HANDOFF',
      description: 'Scientific nuances and clinical contradictions. Hands off to SafetyComplianceSpecialist for balanced synthesis.',
    },
    {
      id: 6,
      title: '6. High-Stakes Financial Transfer',
      query: 'Refund Rs 50,000 to this account',
      badge: 'HUMAN ESCALATION',
      badgeColor: 'text-rose-400 bg-rose-950 border-rose-500/30',
      expectedRoute: 'ESCALATE',
      description: 'Critical monetary transaction. Bypasses autonomous execution and routes directly to supervisor queue.',
    },
  ];

  const runScenario = async (id: number) => {
    setActiveScenarioId(id);
    setIsLoading(true);
    try {
      const data = await api.runDemoScenario(id);
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcuts (1-6 for scenarios, Space for autoplay toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key >= '1' && e.key <= '6') {
        const id = parseInt(e.key, 10);
        runScenario(id);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsAutoplay(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autoplay loop timer
  useEffect(() => {
    if (!isAutoplay) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const nextId = activeScenarioId >= 6 ? 1 : activeScenarioId + 1;
          runScenario(nextId);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoplay, activeScenarioId]);

  // Initial load
  useEffect(() => {
    runScenario(1);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Control Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Live Scripted Demonstration (6 Scenarios)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Press keys <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">1</kbd> to <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">6</kbd> to trigger, or toggle Autoplay.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAutoplay(!isAutoplay)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isAutoplay
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg glow-amber'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isAutoplay ? <FastForward className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />}
            <span>{isAutoplay ? `Autoplay Active (${countdown}s)` : 'Start Autoplay'}</span>
          </button>

          <button
            onClick={() => runScenario(activeScenarioId)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Reset Scenario"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scenario Selection Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => runScenario(s.id)}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              activeScenarioId === s.id
                ? 'bg-blue-950/80 border-blue-500 shadow-lg glow-blue'
                : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold text-slate-400">#{s.id}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold ${s.badgeColor}`}>
                {s.expectedRoute}
              </span>
            </div>
            <h4 className="text-xs font-bold text-white line-clamp-1">{s.title.split('. ')[1]}</h4>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">{s.query}</p>
          </button>
        ))}
      </div>

      {/* Active Scenario Execution Display */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-200">Executing Scenario #{activeScenarioId}...</p>
          <p className="text-xs text-slate-500 mt-1">Multi-signal confidence scoring and dynamic routing in progress.</p>
        </div>
      ) : result ? (
        <div className="space-y-4">
          {/* Prevention / Result Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-blue-400 uppercase">
                Scenario #{activeScenarioId} Rationale:
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                "{result.query}"
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {result.rationale}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Final Route</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-600 text-white font-mono">
                {result.trust_trace.final_route}
              </span>
            </div>
          </div>

          {/* Side by side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Baseline */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-rose-950/60">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold text-rose-400">Baseline Agent</span>
                <span className="text-[10px] font-mono text-rose-400 px-2 py-0.5 rounded bg-rose-950 border border-rose-500/30">
                  Uncalibrated (100% Blind)
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950 p-3 rounded-lg border border-slate-800">
                {result.baseline_answer}
              </p>
            </div>

            {/* TrustAgent */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-blue-900/50 glow-blue">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold text-emerald-400">TrustAgent</span>
                <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30">
                  {Math.round(result.trust_trace.final_confidence * 100)}% Calibrated Certainty
                </span>
              </div>
              <p className="text-xs text-slate-100 font-medium leading-relaxed font-sans bg-slate-950 p-3 rounded-lg border border-slate-800">
                {result.trust_trace.answer}
              </p>
              <div className="mt-3">
                <WhyUnsurePanel report={result.trust_trace.confidence_report} defaultOpen={false} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
