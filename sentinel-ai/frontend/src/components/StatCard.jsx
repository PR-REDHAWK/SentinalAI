import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  color = 'indigo'
}) => {
  const colorStyles = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="glass-panel glass-panel-hover rounded-xl p-5 relative overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-100 mt-1.5">{value}</h3>
          {change && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
              <span className="text-slate-300">{change}</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${colorStyles[color] || colorStyles.indigo}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;
