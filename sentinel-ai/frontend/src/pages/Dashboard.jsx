import React from 'react';
import { motion } from 'framer-motion';
import { useIncidents } from '../context/IncidentContext';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import IncidentTable from '../components/IncidentTable';
import { 
  mockTrendData, 
  mockSeverityDistribution, 
  mockRecentAiAnalyses, 
  mockUpcomingRecommendations 
} from '../data/mockData';

import { 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  Sparkles, 
  ArrowUpRight, 
  Plus, 
  BrainCircuit, 
  Zap 
} from 'lucide-react';
import Button from '../components/Button';
import { useNavigate, Link } from 'react-router-dom';

import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export const Dashboard = () => {
  const { incidents, stats } = useIncidents();
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">Live Incident Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Stream
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Real-time telemetry, AI correlations, and incident priorities.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/analytics')}
          >
            Analytics Details
          </Button>
          <Button
            variant="gradient"
            size="md"
            icon={Plus}
            onClick={() => navigate('/report')}
          >
            Report Incident
          </Button>
        </div>
      </div>

      {/* Top Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Active Incidents"
          value={stats.activeIncidents}
          change={stats.activeChange}
          icon={Activity}
          color="indigo"
        />
        <StatCard
          title="Critical Incidents"
          value={stats.criticalIncidents}
          change={stats.criticalChange}
          icon={ShieldAlert}
          color="red"
        />
        <StatCard
          title="Resolved Today"
          value={stats.resolvedToday}
          change={stats.resolvedChange}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="AI Root Cause Accuracy"
          value={`${stats.aiAccuracy}%`}
          change={stats.accuracyChange}
          icon={Sparkles}
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Trend Chart (2 cols) */}
        <div className="lg:col-span-2">
          <ChartCard
            title="24-Hour Incident Severity Trends"
            subtitle="Correlated incident spikes across critical microservices"
          >
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="criticalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="highColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="critical" stroke="#EF4444" fillOpacity={1} fill="url(#criticalColor)" strokeWidth={2} name="Critical" />
                  <Area type="monotone" dataKey="high" stroke="#F97316" fillOpacity={1} fill="url(#highColor)" strokeWidth={2} name="High" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Severity Distribution Chart (1 col) */}
        <div className="lg:col-span-1">
          <ChartCard
            title="Severity Breakdown"
            subtitle="Active incident priority matrix"
          >
            <div className="h-72 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockSeverityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {mockSeverityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-100">{incidents.length}</span>
                <span className="text-[10px] uppercase font-mono text-slate-400">Total Active</span>
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Main Content Split: Recent Table vs AI Insights Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table of Active Incidents (2 cols) */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Recent Incident Stream</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time correlated incidents requiring attention</p>
            </div>
            <Link to="/incidents" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All ({incidents.length})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <IncidentTable incidents={incidents.slice(0, 5)} />
        </div>

        {/* AI Copilot Intelligence Side Panel (1 col) */}
        <div className="space-y-6">
          {/* Recent AI Analyses Panel */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-purple-400">
              <BrainCircuit className="w-5 h-5 animate-pulse" />
              <h3 className="text-base font-semibold text-slate-100">AI Correlation Log</h3>
            </div>

            <div className="space-y-3">
              {mockRecentAiAnalyses.map((ai) => (
                <div key={ai.id} className="p-3 rounded-lg bg-slate-900/80 border border-purple-500/20 text-xs space-y-1 hover:border-purple-500/40 transition-colors">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-indigo-300">{ai.incidentId}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{ai.timestamp}</span>
                  </div>
                  <p className="font-medium text-slate-200">{ai.title}</p>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{ai.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Recommendations Panel */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap className="w-5 h-5" />
              <h3 className="text-base font-semibold text-slate-100">Suggested Action Plan</h3>
            </div>

            <div className="space-y-3">
              {mockUpcomingRecommendations.map((rec) => (
                <div key={rec.id} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{rec.title}</span>
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {rec.confidence}% Match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{rec.impact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
