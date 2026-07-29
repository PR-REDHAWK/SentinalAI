import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { ArrowRight, Cpu, Clock, Users } from 'lucide-react';

export const IncidentCard = ({ incident }) => {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass-panel glass-panel-hover rounded-xl p-5 flex flex-col justify-between space-y-4"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-mono text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
            {incident.id}
          </span>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={incident.severity} size="sm" />
            <StatusBadge status={incident.status} size="sm" />
          </div>
        </div>

        <Link to={`/incidents/${incident.id}`} className="group">
          <h4 className="text-base font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1">
            {incident.title}
          </h4>
        </Link>

        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
          {incident.description}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-slate-500" />
            {incident.affectedService}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            {incident.impactedUsers ? incident.impactedUsers.toLocaleString() : 'N/A'}
          </span>
        </div>

        <Link
          to={`/incidents/${incident.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Details
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
};

export default IncidentCard;
