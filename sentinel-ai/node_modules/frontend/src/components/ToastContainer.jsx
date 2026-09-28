import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIncidents } from '../context/IncidentContext';
import { AlertTriangle, Sparkles, CheckCircle2, Info, X } from 'lucide-react';

const toastConfig = {
  alert: {
    icon: AlertTriangle,
    border: 'border-red-500/40',
    bg: 'bg-slate-900/95 shadow-red-950/30',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    iconColor: 'text-red-400'
  },
  ai: {
    icon: Sparkles,
    border: 'border-purple-500/40',
    bg: 'bg-slate-900/95 shadow-purple-950/30',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    iconColor: 'text-purple-400'
  },
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-500/40',
    bg: 'bg-slate-900/95 shadow-emerald-950/30',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    iconColor: 'text-emerald-400'
  },
  info: {
    icon: Info,
    border: 'border-indigo-500/40',
    bg: 'bg-slate-900/95 shadow-indigo-950/30',
    badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    iconColor: 'text-indigo-400'
  }
};

export const ToastContainer = () => {
  const { toasts, removeToast } = useIncidents();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = toastConfig[toast.type] || toastConfig.info;
          const Icon = config.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-md shadow-2xl ${config.border} ${config.bg} flex items-start gap-3 relative`}
            >
              <div className={`p-2 rounded-lg border shrink-0 ${config.badge}`}>
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs font-bold text-slate-100">{toast.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{toast.description}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
