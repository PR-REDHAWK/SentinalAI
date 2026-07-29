import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  PlusCircle, 
  AlertOctagon, 
  BarChart3, 
  Settings, 
  ShieldAlert,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Report Incident', path: '/report', icon: PlusCircle },
  { name: 'Incidents', path: '/incidents', icon: AlertOctagon },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 flex flex-col justify-between min-h-screen sticky top-0 z-30">
      {/* Top Header */}
      <div>
        <div className="p-5 flex items-center gap-3 border-b border-slate-800/80">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
              Sentinel<span className="text-indigo-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">Incident Intelligence</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span>{item.name}</span>
                    </div>
                    {isActive && (
                      <motion.div layoutId="activeDot" className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* AI Assistant Banner Footer */}
      <div className="p-4">
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/20 text-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>AI Copilot Active</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Correlating live logs and metrics in real-time.
          </p>
          <div className="pt-1 flex items-center justify-between text-indigo-400 text-[11px] font-medium">
            <span>Status: Engine Ready</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
