import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

const severityConfig = {
  Critical: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    icon: ShieldAlert,
    dot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
  },
  High: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    icon: AlertTriangle,
    dot: 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
  },
  Medium: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    icon: AlertCircle,
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
  },
  Low: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    icon: Info,
    dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]'
  }
};

export const SeverityBadge = ({ severity = 'Medium', size = 'md' }) => {
  const config = severityConfig[severity] || severityConfig.Medium;
  const Icon = config.icon;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs font-medium' 
    : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${config.border} ${config.text} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} animate-pulse`} />
      <Icon className="w-3.5 h-3.5" />
      {severity}
    </span>
  );
};

export default SeverityBadge;
