import React from 'react';
import ChartCard from '../components/ChartCard';
import StatCard from '../components/StatCard';
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  CartesianGrid 
} from 'recharts';

const mttrData = [
  { day: "Mon", mttr: 42, target: 30 },
  { day: "Tue", mttr: 38, target: 30 },
  { day: "Wed", mttr: 24, target: 30 },
  { day: "Thu", mttr: 18, target: 30 },
  { day: "Fri", mttr: 29, target: 30 },
  { day: "Sat", mttr: 15, target: 30 },
  { day: "Sun", mttr: 12, target: 30 }
];

const categoryBreakdown = [
  { name: "Auth & IAM", count: 18 },
  { name: "Database", count: 12 },
  { name: "Payments", count: 9 },
  { name: "CDN / DNS", count: 5 },
  { name: "K8s Cluster", count: 14 }
];

export const Analytics = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Incident Intelligence Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">Mean Time to Resolution (MTTR), resolution efficiency, and AI model performance.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Average MTTR"
          value="18.4 mins"
          change="-32% since AI rollout"
          icon={Clock}
          color="emerald"
        />
        <StatCard
          title="First Pass Resolution"
          value="88.4%"
          change="+14% this month"
          icon={CheckCircle2}
          color="indigo"
        />
        <StatCard
          title="Prevented Duplicate Alerts"
          value="1,420"
          change="Alert fatigue reduced by 74%"
          icon={ShieldCheck}
          color="purple"
        />
        <StatCard
          title="AI Vector Match Rate"
          value="94.2%"
          change="Similar Incident DB"
          icon={Sparkles}
          color="indigo"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Weekly Mean Time to Resolution (MTTR)"
          subtitle="Measured in minutes vs target SLA"
        >
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mttrData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="mttr" stroke="#6366F1" strokeWidth={3} dot={{ fill: '#6366F1' }} name="Actual MTTR (m)" />
                <Line type="monotone" dataKey="target" stroke="#EF4444" strokeDasharray="5 5" strokeWidth={2} name="SLA Target (30m)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Incidents by Service Category"
          subtitle="Top failing components over 30 days"
        >
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Total Incidents" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};

export default Analytics;
