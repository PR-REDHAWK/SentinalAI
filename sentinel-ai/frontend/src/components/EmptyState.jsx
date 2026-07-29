import React from 'react';
import { AlertCircle } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({
  title = "No incidents found",
  description = "There are no incidents matching your current filters.",
  icon: Icon = AlertCircle,
  actionLabel,
  onAction
}) => {
  return (
    <div className="glass-panel rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto my-8">
      <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-slate-200">{title}</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
