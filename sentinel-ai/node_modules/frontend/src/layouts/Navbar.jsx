import React, { useState } from 'react';
import { Search, Bell, Sparkles, User, LogOut } from 'lucide-react';
import { useIncidents } from '../context/IncidentContext';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
  const { user } = useIncidents();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="h-16 glass-panel border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
      {/* Search Bar */}
      <div className="relative w-96">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search incidents, services, root causes..."
          className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 pl-10 pr-4 py-2 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
          ⌘K
        </kbd>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Real-time Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          <span>Socket.IO Simulated Stream</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-slate-950" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 glass-panel rounded-xl border border-slate-800 p-4 shadow-2xl space-y-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-200">AI Alerts & Notifications</span>
                <span className="text-[10px] text-indigo-400">3 new</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-slate-300">
                  <p className="font-medium text-indigo-300">INC-8942 Analyzed</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">High confidence root cause identified: DB connection pool exhaustion.</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 text-slate-300">
                  <p className="font-medium text-slate-200">Incident Auto-Grouped</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Merged 42 Sentry logs into INC-8942.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover"
          />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-slate-200">{user.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{user.role}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
