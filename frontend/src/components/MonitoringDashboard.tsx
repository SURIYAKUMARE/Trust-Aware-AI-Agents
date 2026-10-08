import React, { useState, useEffect } from 'react';
import { MetricsResponse, SimulationResponse } from '../types';
import { api } from '../api';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Cell 
} from 'recharts';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Clock, 
  DollarSign, 
  TrendingUp,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Gauge
} from 'lucide-react';

export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [highThreshold, setHighThreshold] = useState(0.85);
  const [lowThreshold, setLowThreshold] = useState(0.45);
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const runSim = async () => {
      setIsSimulating(true);
      try {
        const res = await api.simulateThresholds(highThreshold, lowThreshold);
        setSimResult(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSimulating(false);
      }
    };
    runSim();
  }, [highThreshold, lowThreshold]);

  if (!metrics) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>Loading production monitoring telemetry...</span>
      </div>
    );
  }

  // Format Reliability diagram data
  const reliabilityData = metrics.reliability_diagram.map((b) => ({
    confidence: Math.round(b.confidence * 100),
    accuracy: Math.round(b.accuracy * 100),
    count: b.count,
    ideal: Math.round(b.confidence * 100),
  }));

  // Route distribution data
  const routeColors: Record<string, string> = {
    ANSWER: '#10B981',
    VERIFY: '#3B82F6',
    CLARIFY: '#F59E0B',
    SEARCH: '#8B5CF6',
    HANDOFF: '#06B6D4',
    ABSTAIN: '#64748B',
    ESCALATE: '#EF4444',
  };

  const routeData = Object.entries(metrics.route_distribution).map(([route, count]) => ({
    route,
    count,
    color: routeColors[route] || '#3B82F6',
  }));

  // Confidence histogram data
  const histogramData = Object.entries(metrics.confidence_histogram).map(([range, count]) => ({
    range,
    count,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header and Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            System Reliability & Monitoring Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry, isotonic calibration curve, route distributions, and distribution drift alerts.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={isLoading}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Drift Alert Banner */}
      {metrics.drift_alert ? (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 flex items-center justify-between shadow-xl glow-rose">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-200">
                CALIBRATION DRIFT DETECTED ({metrics.drift_details?.rolling_ece ? `ECE: ${metrics.drift_details.rolling_ece.toFixed(3)}` : 'Threshold Exceeded'})
              </h4>
              <p className="text-xs text-rose-300/90 mt-0.5">
                {metrics.drift_details?.reason || 'The discrepancy between predicted confidence and observed empirical outcomes exceeds 0.10.'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-rose-900/90 text-rose-200 text-xs font-mono font-bold">
            Retrain Recommended
          </span>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-200">
                Confidence Calibration Healthy & Robust
              </h4>
              <p className="text-xs text-emerald-300/80 mt-0.5">
                Rolling Expected Calibration Error is within target bounds (ECE &le; 0.10). Model self-doubt accurately mirrors empirical accuracy.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-900/70 text-emerald-300 text-xs font-mono font-bold">
            Optimal State
          </span>
        </div>
      )}

      {/* Hero Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[11px] font-mono uppercase text-slate-400">Total Invocations</span>
          <p className="text-2xl font-black text-white mt-1">{metrics.total_queries}</p>
          <span className="text-[11px] text-slate-500">Logged in SQLite</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[11px] font-mono uppercase text-emerald-400">Expected Calibration Error</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{metrics.ece.toFixed(3)}</p>
          <span className="text-[11px] text-slate-500">Industry benchmark &le; 0.08</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[11px] font-mono uppercase text-blue-400">Escalation Rate</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{(metrics.escalation_rate * 100).toFixed(1)}%</p>
          <span className="text-[11px] text-slate-500">High-stakes operations</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg">
          <span className="text-[11px] font-mono uppercase text-amber-400">Abstention Rate</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{(metrics.abstain_rate * 100).toFixed(1)}%</p>
          <span className="text-[11px] text-slate-500">Traps safely halted</span>
        </div>
      </div>

      {/* Live Threshold Simulator Card */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Live Decision Routing Threshold Simulation</h3>
              {isSimulating && <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dynamically recomputes hallucination rate, escalation volume, and selective accuracy from evaluation test benchmarks in real time.
            </p>
          </div>
          <button
            onClick={() => {
              setHighThreshold(0.85);
              setLowThreshold(0.45);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-mono transition-colors cursor-pointer"
          >
            Reset Defaults (0.85 / 0.45)
          </button>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HIGH Threshold Slider */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                HIGH Threshold (Direct Answer)
              </span>
              <span className="font-mono text-sm font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                {(highThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.60"
              max="0.98"
              step="0.01"
              value={highThreshold}
              onChange={(e) => setHighThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.60 (Permissive)</span>
              <span>Default: 0.85</span>
              <span>0.98 (Conservative)</span>
            </div>
          </div>

          {/* LOW Threshold Slider */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                LOW Threshold (Clarify / Tool Search vs Abstain)
              </span>
              <span className="font-mono text-sm font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                {(lowThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.65"
              step="0.01"
              value={lowThreshold}
              onChange={(e) => setLowThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.20 (Few Escalations)</span>
              <span>Default: 0.45</span>
              <span>0.65 (High Escalation)</span>
            </div>
          </div>
        </div>

        {/* Real-time Computed Simulation Metrics */}
        {simResult && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Hallucination Rate</span>
              <span className="text-xl font-black text-rose-400">
                {(simResult.hallucination_rate * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">Baseline: 28.9%</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Escalation Rate</span>
              <span className="text-xl font-black text-blue-400">
                {(simResult.escalation_rate * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">Supervised items</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Abstention Rate</span>
              <span className="text-xl font-black text-amber-400">
                {(simResult.abstain_rate * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">Honest traps</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Selective Accuracy</span>
              <span className="text-xl font-black text-emerald-400">
                {(simResult.selective_accuracy * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">When answering</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center col-span-2 md:col-span-1">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Failed Decisions</span>
              <span className="text-xl font-black text-purple-400">
                {(simResult.failed_decision_rate * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-500 block">Baseline: 34.4%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Reliability Diagram */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1">
            Reliability Diagram (Calibration Curve)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Comparison between mean predicted confidence and observed empirical accuracy.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reliabilityData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="confidence" stroke="#64748B" fontSize={11} unit="%" />
                <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(val: any, name: any) => [`${val}%`, name === 'accuracy' ? 'Empirical Accuracy' : 'Ideal Identity']}
                />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke="#475569"
                  strokeDasharray="4 4"
                  dot={false}
                  name="Ideal"
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10B981', r: 5 }}
                  name="TrustAgent"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Route Distribution */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-1">
            Automated Route Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Count of queries routed by confidence thresholds.
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="route" stroke="#64748B" fontSize={10} />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(val: any) => [val, 'Count']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {routeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confidence Histogram */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-1">
          Confidence Score Histogram
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Distribution of calibrated confidence scores across queries.
        </p>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="range" stroke="#64748B" fontSize={11} />
              <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                formatter={(val: any) => [val, 'Queries']}
              />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
