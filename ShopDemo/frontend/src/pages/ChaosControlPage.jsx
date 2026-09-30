import React, { useState } from 'react';
import {
  Zap,
  RotateCcw,
  Eye,
  EyeOff,
  Activity,
  Server,
  Database,
  CreditCard,
  Cpu,
  HardDrive,
  Flame,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Radio,
  Send,
  Lock,
  Layers,
  Sparkles,
  RefreshCw,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { useChaos } from '../context/ChaosContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';

export const ChaosControlPage = () => {
  const {
    simulationState,
    socketConnected,
    actionLoading,
    triggerScenario,
    startBlindTest,
    revealGroundTruth,
    resetEnvironment
  } = useChaos();

  const [revealedData, setRevealedData] = useState(null);

  if (!simulationState) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex items-center space-x-3 text-emerald-400 font-bold">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Connecting to ShopDemo Chaos Controller Engine...</span>
        </div>
      </div>
    );
  }

  const {
    systemStatus,
    activeScenario,
    blindMode,
    revealed,
    hiddenGroundTruth,
    scenarioStage,
    metrics,
    services,
    sentinelStatus,
    recentLogs,
    recentEvents,
    statsHistory
  } = simulationState;

  const handleReveal = async () => {
    const res = await revealGroundTruth();
    if (res.success) {
      setRevealedData(res.revelation);
    }
  };

  const scenariosList = [
    {
      id: 'TRAFFIC_SPIKE',
      name: 'Traffic Spike',
      icon: Flame,
      desc: 'Escalate simulated load from 150 -> 1200 req/s to cause queue backlog and CPU saturation.',
      badge: 'TRAFFIC OVERLOAD'
    },
    {
      id: 'DATABASE_DEGRADATION',
      name: 'Database Degradation',
      icon: Database,
      desc: 'Increase DB query latency from 30ms -> 850ms causing cascading request timeouts.',
      badge: 'QUERY LATENCY'
    },
    {
      id: 'DATABASE_CONNECTION_EXHAUSTION',
      name: 'DB Connection Exhaustion',
      icon: HardDrive,
      desc: 'Saturate active DB pool connections 40/100 -> 100/100 triggering acquisition lockouts.',
      badge: 'POOL SATURATION'
    },
    {
      id: 'PAYMENT_DEPENDENCY_FAILURE',
      name: 'Payment Dependency Failure',
      icon: CreditCard,
      desc: 'Degrade payment processor latency 150ms -> 1200ms while keeping CPU & traffic normal.',
      badge: 'DOWNSTREAM DEPENDENCY'
    },
    {
      id: 'MEMORY_LEAK',
      name: 'Memory Leak',
      icon: Cpu,
      desc: 'Gradually leak simulated RAM 45% -> 96% until JVM GC pauses & pod restart occurs.',
      badge: 'RESOURCE LEAK'
    },
    {
      id: 'DEPLOYMENT_REGRESSION',
      name: 'Deployment Regression',
      icon: Layers,
      desc: 'Simulate deployment v2.14.0 followed by elevated 5xx errors & latency shifts.',
      badge: 'TEMPORAL CORRELATION'
    },
    {
      id: 'CONTAINER_FAILURE',
      name: 'Container Failure',
      icon: Server,
      desc: 'Terminate backend pod replicas (3 -> 1 healthy) causing load redistribution spikes.',
      badge: 'INFRASTRUCTURE RESTART'
    },
    {
      id: 'HIGH_ERROR_RATE',
      name: 'High Error Rate',
      icon: AlertTriangle,
      desc: 'Elevate application 5xx error rate (0.2% -> 14%) while infra metrics remain healthy.',
      badge: 'APPLICATION BUG'
    }
  ];

  // Helper for stage color
  const getStageLabel = (stage) => {
    switch (stage) {
      case 0: return { text: 'STAGE 0: NORMAL BASELINE', color: 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50' };
      case 1: return { text: 'STAGE 1: EARLY DEGRADATION', color: 'text-yellow-400 bg-yellow-950/80 border-yellow-500/50' };
      case 2: return { text: 'STAGE 2: WARNING BREACH', color: 'text-amber-400 bg-amber-950/80 border-amber-500/50' };
      case 3: return { text: 'STAGE 3: SEVERE FAILURE', color: 'text-orange-400 bg-orange-950/80 border-orange-500/50' };
      case 4: return { text: 'STAGE 4: CRITICAL INCIDENT', color: 'text-red-400 bg-red-950/80 border-red-500/50' };
      default: return { text: 'NORMAL', color: 'text-gray-400' };
    }
  };

  const currentStageInfo = getStageLabel(scenarioStage);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      
      {/* Control Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                SENTINEL AI CHAOS CONTROL
              </h1>
              <span className="px-2.5 py-0.5 bg-gray-800 text-xs font-mono font-bold text-gray-400 border border-gray-700 rounded-md">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              Control Plane for ShopDemo Production Environment • Real-time Telemetry Adapter active
            </p>
          </div>

          {/* Environment Status Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 bg-gray-800/90 border border-gray-700 rounded-xl text-xs font-mono font-semibold text-gray-300">
              ENV: <span className="text-emerald-400">PRODUCTION</span>
            </div>

            <div className="px-3 py-1.5 bg-gray-800/90 border border-gray-700 rounded-xl text-xs font-mono font-semibold text-gray-300">
              REGION: <span className="text-blue-400">us-east-1</span>
            </div>

            <div
              className={`px-4 py-1.5 border rounded-xl text-xs font-mono font-bold flex items-center space-x-2 ${
                systemStatus === 'INCIDENT'
                  ? 'bg-red-950 border-red-500 text-red-400 animate-pulse'
                  : systemStatus === 'DEGRADED'
                  ? 'bg-amber-950 border-amber-500 text-amber-400'
                  : 'bg-emerald-950 border-emerald-500 text-emerald-400'
              }`}
            >
              {systemStatus === 'INCIDENT' && <XCircle className="w-4 h-4" />}
              {systemStatus === 'DEGRADED' && <AlertTriangle className="w-4 h-4" />}
              {systemStatus === 'HEALTHY' && <CheckCircle2 className="w-4 h-4" />}
              <span>STATUS: {systemStatus}</span>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => resetEnvironment()}
              disabled={actionLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-gray-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all border border-emerald-400/40 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RESET ENVIRONMENT</span>
            </button>
          </div>
        </div>

        {/* Active Scenario Stage Banner */}
        <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400 font-mono">ACTIVE SCENARIO:</span>
            {blindMode && !revealed ? (
              <span className="px-3 py-1 bg-purple-950 border border-purple-500 text-purple-300 text-xs font-mono font-bold rounded-lg flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>BLIND TEST ACTIVE (HIDDEN GROUND TRUTH)</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-800 border border-gray-700 text-emerald-400 text-xs font-mono font-bold rounded-lg">
                {activeScenario || 'NONE (BASELINE HEALTH)'}
              </span>
            )}
          </div>

          <div className={`px-3.5 py-1 border text-xs font-mono font-bold rounded-lg ${currentStageInfo.color}`}>
            {currentStageInfo.text}
          </div>
        </div>
      </div>

      {/* Live KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-mono block">TRAFFIC RATE</span>
          <span className="text-2xl font-black font-mono text-white">{metrics?.traffic || 0}</span>
          <span className="text-xs text-gray-500 block">req / second</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-mono block">ERROR RATE</span>
          <span className={`text-2xl font-black font-mono ${metrics?.errorRate > 2 ? 'text-red-400' : 'text-white'}`}>
            {metrics?.errorRate || 0}%
          </span>
          <span className="text-xs text-gray-500 block">5xx HTTP responses</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-mono block">AVG LATENCY</span>
          <span className={`text-2xl font-black font-mono ${metrics?.apiLatency > 300 ? 'text-amber-400' : 'text-white'}`}>
            {metrics?.apiLatency || 0} ms
          </span>
          <span className="text-xs text-gray-500 block">gateway target time</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-mono block">DATABASE LATENCY</span>
          <span className={`text-2xl font-black font-mono ${metrics?.dbLatency > 150 ? 'text-orange-400' : 'text-white'}`}>
            {metrics?.dbLatency || 0} ms
          </span>
          <span className="text-xs text-gray-500 block">PostgreSQL p99 query</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-mono block">PAYMENT DEPENDENCY</span>
          <span className={`text-2xl font-black font-mono ${metrics?.paymentLatency > 400 ? 'text-red-400' : 'text-white'}`}>
            {metrics?.paymentLatency || 0} ms
          </span>
          <span className="text-xs text-gray-500 block">external API latency</span>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-gray-400 font-mono block">CPU / MEMORY</span>
          <span className="text-xl font-black font-mono text-white">
            {metrics?.cpu}% / {metrics?.memory}%
          </span>
          <span className="text-xs text-gray-500 block">host cluster load</span>
        </div>
      </div>

      {/* Blind Incident Simulation Section */}
      <div className="bg-gradient-to-r from-purple-950/70 via-gray-900 to-gray-900 border border-purple-800/60 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-purple-400 font-bold text-lg">
              <Lock className="w-5 h-5" />
              <span>BLIND INCIDENT EVALUATION MODE</span>
            </div>
            <p className="text-xs text-gray-300">
              Demonstrate that SentinelAI infers incident root causes strictly from raw telemetry observations rather than scenario tags.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => startBlindTest()}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-2 border border-purple-400/40 disabled:opacity-50"
            >
              <EyeOff className="w-4 h-4" />
              <span>START BLIND INCIDENT TEST</span>
            </button>

            {blindMode && !revealed && (
              <button
                onClick={handleReveal}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                <span>REVEAL GROUND TRUTH</span>
              </button>
            )}
          </div>
        </div>

        {/* Revelation Box */}
        {revealed && (
          <div className="p-5 bg-gray-950 border border-emerald-500/50 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="space-y-2">
              <span className="text-xs font-mono text-gray-400 block">SIMULATOR GROUND TRUTH</span>
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 font-mono font-bold text-sm">
                {hiddenGroundTruth || activeScenario}
              </div>
              <p className="text-xs text-gray-400">
                This label was strictly isolated inside ShopDemo and NEVER sent over the telemetry adapter.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono text-gray-400 block">SENTINEL AI DIAGNOSIS EXPECTATION</span>
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono font-bold text-sm">
                Phase 1-5 RCA Engine Inferred Hypothesis
              </div>
              <p className="text-xs text-gray-400">
                Open SentinelAI Cockpit to verify how Gemini 2.5 Flash synthesized the structured evidence package!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chaos Scenarios Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-bold text-xl">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2>CHAOS SCENARIO INJECTION CONTROLS</h2>
          </div>
          <span className="text-xs font-mono text-gray-400">8 Progressive Scenarios Available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {scenariosList.map((sc) => {
            const IconComp = sc.icon;
            const isCurrent = activeScenario === sc.id;

            return (
              <div
                key={sc.id}
                className={`bg-gray-900 border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-amber-500/80 bg-gradient-to-b from-gray-900 to-amber-950/30 shadow-lg shadow-amber-500/10'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-gray-800 rounded-xl text-amber-400 border border-gray-700">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                      {sc.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base">{sc.name}</h3>
                    <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{sc.desc}</p>
                  </div>
                </div>

                <button
                  onClick={() => triggerScenario(sc.id)}
                  disabled={actionLoading}
                  className={`mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                    isCurrent
                      ? 'bg-amber-500 text-gray-950 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isCurrent ? 'Escalate Stage' : `Inject ${sc.name}`}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7 Logical Services Status Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-bold text-xl">
            <Server className="w-5 h-5 text-blue-400" />
            <h2>LOGICAL MICROSERVICES TOPOLOGY</h2>
          </div>
          <span className="text-xs font-mono text-gray-400">7 Connected Logical Services</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(services).map(([key, svc]) => (
            <div key={key} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{svc.name}</span>
                <span
                  className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-md border ${
                    svc.status === 'CRITICAL'
                      ? 'bg-red-950 text-red-400 border-red-500/50'
                      : svc.status === 'DEGRADED'
                      ? 'bg-amber-950 text-amber-400 border-amber-500/50'
                      : 'bg-emerald-950 text-emerald-400 border-emerald-500/50'
                  }`}
                >
                  {svc.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-gray-800">
                <div>
                  <span className="text-gray-500 block">LATENCY</span>
                  <span className="text-gray-200 font-bold">{svc.latency} ms</span>
                </div>
                <div>
                  <span className="text-gray-500 block">ERROR RATE</span>
                  <span className="text-gray-200 font-bold">{svc.errorRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Metric Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Latency & Error Rate Trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Response Latency Trend (ms)</span>
            </h3>
            <span className="text-xs font-mono text-gray-500">Last 30 snapshots</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statsHistory}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tick={false} stroke="#475569" />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="metrics.apiLatency" stroke="#10b981" fillOpacity={1} fill="url(#latencyGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Database & Downstream Dependency Trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Database & Payment Dependency Latency (ms)</span>
            </h3>
            <span className="text-xs font-mono text-gray-500">Live comparison</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statsHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tick={false} stroke="#475569" />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="metrics.dbLatency" stroke="#f59e0b" strokeWidth={2} dot={false} name="DB Latency" />
                <Line type="monotone" dataKey="metrics.paymentLatency" stroke="#ef4444" strokeWidth={2} dot={false} name="Payment Latency" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Telemetry Stream & SentinelAI Integration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Logs & Events Stream */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white font-bold text-base">
              <Terminal className="w-4 h-4 text-teal-400" />
              <h3>LIVE TELEMETRY & LOG STREAM</h3>
            </div>
            <span className="text-xs font-mono text-gray-500">Real-time application logs</span>
          </div>

          <div className="h-64 overflow-y-auto bg-gray-950 border border-gray-800 rounded-2xl p-4 font-mono text-xs space-y-2">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 text-gray-300 border-b border-gray-900 pb-1.5">
                <span className="text-gray-500 text-[10px] whitespace-nowrap">{log.timestamp.substring(11, 19)}</span>
                <span
                  className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                    log.level === 'ERROR'
                      ? 'bg-red-950 text-red-400 border border-red-500/40'
                      : log.level === 'WARN'
                      ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-950 text-emerald-400'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-teal-400 font-semibold">{log.service}:</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SentinelAI Integration Status Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <ShieldCheck className="w-5 h-5 text-gray-950 font-bold" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">SENTINEL AI LINK</h3>
                <span className="text-xs text-gray-400 block -mt-1">Webhook Ingestion Adapter</span>
              </div>
            </div>

            <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Connection Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    sentinelStatus?.connected ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                  }`}
                >
                  {sentinelStatus?.connected ? 'CONNECTED' : 'STANDBY'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Target Endpoint:</span>
                <span className="text-gray-300">http://localhost:5000</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Webhooks Sent:</span>
                <span className="text-white font-bold">{sentinelStatus?.totalEventsSent || 0}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Anomalies Sent:</span>
                <span className="text-amber-400 font-bold">{sentinelStatus?.anomaliesObserved || 0}</span>
              </div>

              <div className="pt-2 border-t border-gray-900 text-[11px] text-gray-400">
                <span className="block text-gray-500">Last Response:</span>
                <span className="text-emerald-400 block truncate">{sentinelStatus?.lastResponse || 'None'}</span>
              </div>
            </div>
          </div>

          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Open SentinelAI Dashboard ↗</span>
          </a>
        </div>
      </div>
    </div>
  );
};
