import React, { useState, useRef, useEffect } from 'react';
import { ModelProfile } from '../types';
import { 
  Sparkles, 
  Zap, 
  BrainCircuit, 
  Code2, 
  Eye, 
  ChevronDown, 
  Check, 
  ShieldCheck, 
  Info 
} from 'lucide-react';

interface ModelSelectorProps {
  currentProfile: ModelProfile;
  onSelectProfile: (profile: ModelProfile) => void;
  activeProviderName?: string;
  onOpenSettings?: () => void;
}

const PROFILES: Array<{
  id: ModelProfile;
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
}> = [
  {
    id: 'auto',
    name: 'Auto Router',
    tagline: 'Intelligent Adaptive Selection',
    description: 'TrustGuard automatically classifies your query and routes to the optimal model based on task complexity, cost, and safety.',
    icon: <Sparkles className="w-4 h-4 text-blue-400" />,
    badge: 'Recommended',
  },
  {
    id: 'fast',
    name: 'Fast Engine',
    tagline: 'Ultra-low Latency',
    description: 'Optimized for rapid factual lookups, conversational pleasantries, summarization, and quick answers.',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    badge: 'Low Latency',
  },
  {
    id: 'reasoning',
    name: 'Reasoning Engine',
    tagline: 'Deep Chain-of-Thought',
    description: 'Multi-step analytical reasoning, symbolic logic checks, policy evaluation, and scientific inquiry.',
    icon: <BrainCircuit className="w-4 h-4 text-purple-400" />,
    badge: 'Deep CoT',
  },
  {
    id: 'coding',
    name: 'Coding Engine',
    tagline: 'Full-Stack Polyglot',
    description: 'Specialized in Python, TypeScript, algorithms, debugging, code architecture, and database queries.',
    icon: <Code2 className="w-4 h-4 text-emerald-400" />,
    badge: 'Code & Math',
  },
  {
    id: 'vision',
    name: 'Vision & Docs',
    tagline: 'Multimodal Document QA',
    description: 'Understands uploaded PDFs, diagrams, screenshots, tables, and document contexts with grounded retrieval.',
    icon: <Eye className="w-4 h-4 text-rose-400" />,
    badge: 'Multimodal',
  },
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentProfile,
  onSelectProfile,
  activeProviderName = 'Built-in Engine',
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = PROFILES.find(p => p.id === currentProfile) || PROFILES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-medium transition-all shadow-sm cursor-pointer group"
      >
        <div className="flex items-center gap-1.5">
          {selected.icon}
          <span className="font-semibold text-white">{selected.name}</span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            ({selected.badge})
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-auto mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-fade-in backdrop-blur-xl">
          <div className="px-3 py-2 border-b border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Select Intelligence Mode
            </span>
            {onOpenSettings && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSettings();
                }}
                className="text-[10px] text-blue-400 hover:underline cursor-pointer"
              >
                API Settings
              </button>
            )}
          </div>

          <div className="space-y-1">
            {PROFILES.map((profile) => {
              const isCurrent = profile.id === currentProfile;
              return (
                <button
                  key={profile.id}
                  onClick={() => {
                    onSelectProfile(profile.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-3 ${
                    isCurrent
                      ? 'bg-blue-950/40 border border-blue-500/40 text-white'
                      : 'hover:bg-slate-800/60 border border-transparent text-slate-300'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0 mt-0.5">
                    {profile.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{profile.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                        {profile.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {profile.description}
                    </p>
                  </div>
                  {isCurrent && (
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 px-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Provider:</span>
            <span className="text-slate-200">{activeProviderName}</span>
          </div>
        </div>
      )}
    </div>
  );
};
