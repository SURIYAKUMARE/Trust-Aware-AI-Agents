import React from 'react';
import { ConfidenceLevel } from '../types';

interface ConfidenceGaugeProps {
  score: number; // 0 to 1
  level: ConfidenceLevel;
  size?: number;
  showDetails?: boolean;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({
  score,
  level,
  size = 120,
  showDetails = true,
}) => {
  const percentage = Math.round(score * 100);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score * circumference);

  const getColor = () => {
    switch (level) {
      case 'HIGH':
        return { stroke: '#10B981', bg: 'text-emerald-400', badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30' };
      case 'MEDIUM':
        return { stroke: '#3B82F6', bg: 'text-blue-400', badge: 'bg-blue-950/80 text-blue-400 border-blue-500/30' };
      case 'LOW':
        return { stroke: '#F59E0B', bg: 'text-amber-400', badge: 'bg-amber-950/80 text-amber-400 border-amber-500/30' };
      case 'VERY_LOW':
      default:
        return { stroke: '#EF4444', bg: 'text-rose-400', badge: 'bg-rose-950/80 text-rose-400 border-rose-500/30' };
    }
  };

  const colors = getColor();

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black tracking-tight text-white">{percentage}%</span>
          <span className="text-[10px] font-medium tracking-wider uppercase text-slate-400">Certainty</span>
        </div>
      </div>
      {showDetails && (
        <div className="mt-2 text-center">
          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border ${colors.badge}`}>
            {level.replace('_', ' ')} CONFIDENCE
          </span>
        </div>
      )}
    </div>
  );
};
