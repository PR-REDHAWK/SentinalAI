import React from 'react';
import { Link } from 'react-router-dom';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';
import { ExternalLink, Sparkles } from 'lucide-react';

export const IncidentTable = ({ incidents = [] }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/40">
            <th className="py-3.5 px-4">ID</th>
            <th className="py-3.5 px-4">Incident Title</th>
            <th className="py-3.5 px-4">Severity</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4">Affected Service</th>
            <th className="py-3.5 px-4">AI Score</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-sm">
          {incidents.map((inc) => (
            <tr key={inc.id} className="hover:bg-slate-800/40 transition-colors group">
              <td className="py-3.5 px-4 font-mono text-xs font-semibold text-indigo-400">
                {inc.id}
              </td>
              <td className="py-3.5 px-4">
                <Link to={`/incidents/${inc.id}`} className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {inc.title}
                </Link>
                <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{inc.category} • {inc.region}</p>
              </td>
              <td className="py-3.5 px-4">
                <SeverityBadge severity={inc.severity} size="sm" />
              </td>
              <td className="py-3.5 px-4">
                <StatusBadge status={inc.status} size="sm" />
              </td>
              <td className="py-3.5 px-4 text-slate-300 text-xs font-mono">
                {inc.affectedService}
              </td>
              <td className="py-3.5 px-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  <Sparkles className="w-3 h-3" />
                  {inc.confidenceScore}%
                </span>
              </td>
              <td className="py-3.5 px-4 text-right">
                <Link
                  to={`/incidents/${inc.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  View
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IncidentTable;
