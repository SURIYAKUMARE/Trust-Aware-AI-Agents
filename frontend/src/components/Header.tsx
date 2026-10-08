import React from 'react';
import { 
  Bot, 
  Activity, 
  GitCompare, 
  ShieldAlert, 
  BarChart3, 
  Award, 
  Network, 
  Sparkles, 
  ShieldCheck, 
  Flame,
  Settings,
  Cpu
} from 'lucide-react';

export type TabType = 
  | 'console' 
  | 'timeline' 
  | 'compare' 
  | 'playground' 
  | 'escalations' 
  | 'monitoring' 
  | 'evaluation' 
  | 'architecture' 
  | 'demo';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingEscalationsCount?: number;
  onOpenSettings?: () => void;
  currentProvider?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  pendingEscalationsCount = 0,
  onOpenSettings,
  currentProvider = 'Built-in Engine',
}) => {
  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'console', label: 'Agent Console', icon: <Bot className="w-4 h-4" /> },
    { id: 'timeline', label: 'Decision Timeline', icon: <Activity className="w-4 h-4" /> },
    { id: 'compare', label: 'Compare Mode', icon: <GitCompare className="w-4 h-4" /> },
    { id: 'playground', label: 'Playground', icon: <Flame className="w-4 h-4 text-rose-400" /> },
    { 
      id: 'escalations', 
      label: 'Escalations', 
      icon: <ShieldAlert className="w-4 h-4" />, 
      badge: pendingEscalationsCount 
    },
    { id: 'monitoring', label: 'Monitoring', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'evaluation', label: 'Evaluation', icon: <Award className="w-4 h-4" /> },
    { id: 'architecture', label: 'Architecture', icon: <Network className="w-4 h-4" /> },
    { id: 'demo', label: 'Demo Mode', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">TrustAgent</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 border border-blue-500/30 text-blue-400 font-bold">
                  v1.0 POC
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Confidence-Aware AI Agent</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono font-bold animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Model Settings Button */}
          {onOpenSettings && (
            <div className="shrink-0 flex items-center">
              <button
                onClick={onOpenSettings}
                title="Configure AI Model & Keys"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer shadow-sm group"
              >
                <Cpu className="w-3.5 h-3.5 text-blue-400 group-hover:rotate-45 transition-transform" />
                <span className="hidden md:inline font-mono text-[11px]">{currentProvider}</span>
                <Settings className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
