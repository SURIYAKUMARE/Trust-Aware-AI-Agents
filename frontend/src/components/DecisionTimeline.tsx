import React from 'react';
import { DecisionTrace, TraceStep } from '../types';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { 
  CheckCircle, 
  Wrench, 
  HelpCircle, 
  ShieldAlert, 
  Search, 
  ArrowRight, 
  Activity, 
  Clock, 
  Sparkles,
  Bot
} from 'lucide-react';

interface DecisionTimelineProps {
  trace: DecisionTrace | null;
}

export const DecisionTimeline: React.FC<DecisionTimelineProps> = ({ trace }) => {
  if (!trace) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
        <Activity className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <h3 className="text-base font-semibold text-slate-300">No Active Decision Trace</h3>
        <p className="text-sm text-slate-500 max-w-md mt-1">
          Execute a query in the Agent Console or select a scenario in Demo Mode to visualize the multi-step verification and confidence trajectory.
        </p>
      </div>
    );
  }

  // Format trajectory data for Recharts
  const trajectoryData = trace.confidence_trajectory.map((val, idx) => ({
    step: `Step ${idx + 1}`,
    confidence: Math.round(val * 100),
    score: val,
  }));

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'ANSWER':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'VERIFY':
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'CLARIFY':
        return <HelpCircle className="w-4 h-4 text-amber-400" />;
      case 'SEARCH':
        return <Search className="w-4 h-4 text-purple-400" />;
      case 'HANDOFF':
        return <Bot className="w-4 h-4 text-cyan-400" />;
      case 'ESCALATE':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'ABSTAIN':
      default:
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Overview Header Banner */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-500/30">
                {trace.trace_id}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {trace.iteration_count} iteration{trace.iteration_count > 1 ? 's' : ''}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1.5 line-clamp-1">
              "{trace.query}"
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] font-mono text-slate-400 uppercase">Initial &rarr; Final Conf</p>
              <p className="text-lg font-black tracking-tight text-white">
                <span className="text-slate-400">{Math.round(trace.initial_confidence * 100)}%</span>
                <span className="text-slate-500 mx-1">&rarr;</span>
                <span className={trace.final_confidence >= 0.85 ? 'text-emerald-400' : 'text-blue-400'}>
                  {Math.round(trace.final_confidence * 100)}%
                </span>
              </p>
            </div>
            <div className="h-10 w-[1px] bg-slate-800"></div>
            <div className="text-right">
              <p className="text-[11px] font-mono text-slate-400 uppercase">Final Route</p>
              <span className="inline-block mt-0.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white">
                {trace.final_route}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trajectory Line Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Confidence Trajectory Line
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Dynamic shifts in calibrated certainty across sequential evaluation and verification loops.
        </p>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trajectoryData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
              <XAxis dataKey="step" stroke="#64748B" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#64748B" fontSize={11} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#38BDF8', fontWeight: 'bold' }}
                formatter={(val: any) => [`${val}%`, 'Certainty']}
              />
              <ReferenceLine y={85} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'HIGH (85%)', fill: '#10B981', fontSize: 10 }} />
              <ReferenceLine y={65} stroke="#3B82F6" strokeDasharray="3 3" label={{ value: 'MED (65%)', fill: '#3B82F6', fontSize: 10 }} />
              <ReferenceLine y={45} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'LOW (45%)', fill: '#F59E0B', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#38BDF8"
                strokeWidth={3}
                dot={{ fill: '#0284C7', r: 5, strokeWidth: 2, stroke: '#FFFFFF' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Step-by-Step Execution Sequence */}
      <div>
        <h3 className="text-sm font-bold text-slate-200 mb-3 uppercase tracking-wider font-mono text-xs">
          Execution Trace Steps
        </h3>
        <div className="space-y-3">
          {trace.steps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-mono text-xs font-bold text-slate-300">
                    #{step.step_index}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 flex items-center gap-1.5">
                        {getActionIcon(step.action)}
                        {step.action}
                      </span>
                      {step.tool_name && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950/70 border border-blue-500/30 text-blue-400">
                          tool: {step.tool_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 font-medium">
                      {step.input_summary}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold font-mono text-slate-200">
                    {Math.round(step.confidence_score * 100)}%
                  </span>
                  <span className="block text-[10px] text-slate-500 uppercase font-mono">
                    {step.confidence_level}
                  </span>
                </div>
              </div>

              {/* Thought explanation */}
              <div className="mt-3 text-xs text-slate-400 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 font-sans leading-relaxed">
                <span className="font-semibold text-slate-300">Planner Rationale:</span> {step.thought}
              </div>

              {/* Tool Execution Details if present */}
              {step.tool_output && (
                <div className="mt-2 text-xs bg-slate-950/90 border border-slate-800 p-2.5 rounded-lg font-mono text-emerald-400">
                  <span className="text-slate-500 text-[10px] uppercase block mb-0.5">Tool Output:</span>
                  {step.tool_output}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
