import React from 'react';
import { GitCommit, AlertTriangle, Cpu, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

const iconMap = {
  deployment: GitCommit,
  alert: AlertTriangle,
  metric: Cpu,
  incident: ShieldAlert,
  ai: Sparkles,
  resolution: CheckCircle2
};

const colorMap = {
  deployment: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  alert: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  metric: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  incident: 'text-red-400 bg-red-500/10 border-red-500/30',
  ai: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  resolution: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
};

export const Timeline = ({ events = [] }) => {
  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {events.map((evt, idx) => {
        const Icon = iconMap[evt.type] || GitCommit;
        const colorClass = colorMap[evt.type] || colorMap.deployment;
        
        return (
          <div key={evt.id || idx} className="relative group">
            {/* Timeline node icon */}
            <div className={`absolute -left-6 top-0.5 w-5.5 h-5.5 rounded-full border flex items-center justify-center ${colorClass} bg-slate-950`}>
              <Icon className="w-3 h-3" />
            </div>

            {/* Content */}
            <div className="glass-panel rounded-lg p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{evt.title}</span>
                <span className="font-mono text-slate-500 text-[10px]">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed">{evt.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
