import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useIncidents } from '../context/IncidentContext';
import SeverityBadge from '../components/SeverityBadge';
import StatusBadge from '../components/StatusBadge';
import Timeline from '../components/Timeline';
import Button from '../components/Button';
import { 
  ArrowLeft, 
  Sparkles, 
  BrainCircuit, 
  DollarSign, 
  Users, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  Copy, 
  Check, 
  MessageSquare, 
  Send,
  Activity,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Layers,
  HelpCircle,
  GitBranch,
  ArrowDown,
  Network,
  Database,
  Clock,
  Compass,
  Server
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncidentStatus } = useIncidents();

  const incident = incidents.find(inc => inc.id === id) || incidents[0];

  const [copiedId, setCopiedId] = useState(null);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'ai',
      text: `I've analyzed ${incident?.id || 'this incident'}. Ask me anything about the root cause, deployment evidence, or recommended rollback steps.`
    }
  ]);

  const handleCopyCommand = (recId, command) => {
    navigator.clipboard.writeText(command);
    setCopiedId(recId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updatedData = { ...incident, status: newStatus };
      await axios.put(`${API_URL}/api/incidents/${incident.id}`, updatedData);
      // Socket.IO will broadcast the 'incident-updated' event, but we can also optimistically update local state:
      updateIncidentStatus(incident.id, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userQ = question;
    setQuestion('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userQ }]);

    // Simulated AI response logic based on query keywords
    setTimeout(() => {
      let reply = `Based on telemetry for ${incident.id}, the AI confidence is ${incident.confidenceScore}%. ${incident.aiSummary}`;
      if (userQ.toLowerCase().includes('critical') || userQ.toLowerCase().includes('why')) {
        reply = `This incident is flagged as ${incident.severity} because it impacts ${incident.businessImpact?.affectedUsers || 'key users'} across ${incident.region} with an estimated financial drag of ${incident.businessImpact?.estimatedRevenueLoss || 'N/A'}.`;
      } else if (userQ.toLowerCase().includes('deploy') || userQ.toLowerCase().includes('cause')) {
        reply = `Root Cause Evidence: ${incident.rootCause?.summary}. ${incident.rootCause?.details}`;
      } else if (userQ.toLowerCase().includes('previous') || userQ.toLowerCase().includes('before')) {
        reply = `Similar incident matched with INC-7412 (Nov 2025) with a 91% vector embedding similarity score. Reverting connection timeouts fixed it previously.`;
      }

      setChatHistory(prev => [...prev, { sender: 'ai', text: reply }]);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incidents
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Update Status:</span>
          {['Investigating', 'Mitigated', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                incident.status === st
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Banner Header */}
      <div className="glass-panel rounded-xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/30">
              {incident.id}
            </span>
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Created: {new Date(incident.createdAt).toLocaleString()}
          </span>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-100">{incident.title}</h1>
        <p className="text-sm text-slate-300 leading-relaxed">{incident.description}</p>

        {/* Quick Attributes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Affected Service</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              {incident.affectedService}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Geographic Region</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              {incident.region}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">Impacted Users</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              {incident.impactedUsers ? incident.impactedUsers.toLocaleString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-mono">AI Confidence Score</span>
            <span className="font-semibold text-purple-400 flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {incident.confidenceScore}% Score
            </span>
          </div>
        </div>
      </div>

      {/* Grid: AI Analysis & Impact (Left 2 cols) vs Timeline & Chat Assistant (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Executive Summary Card */}
          <div className="glass-panel rounded-xl p-5 border border-purple-500/20 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 text-purple-400">
              <BrainCircuit className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-100">AI Incident Summary</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{incident.aiSummary}</p>
          </div>

          {/* Phase 2: Detected Telemetry Anomalies Card */}
          {incident.anomalies && incident.anomalies.length > 0 && (
            <div className="glass-panel rounded-xl p-5 border border-indigo-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Activity className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Detected Telemetry Anomalies</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {incident.anomalies.length} Anomalous Signal{incident.anomalies.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incident.anomalies.map((ano, idx) => {
                  const severityStyle = {
                    CRITICAL: 'bg-red-950/40 border-red-500/30 text-red-400 badge-critical',
                    HIGH: 'bg-orange-950/40 border-orange-500/30 text-orange-400 badge-high',
                    MEDIUM: 'bg-amber-950/40 border-amber-500/30 text-amber-400 badge-medium',
                    LOW: 'bg-blue-950/40 border-blue-500/30 text-blue-400 badge-low',
                    NORMAL: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 badge-normal'
                  }[ano.severity] || 'bg-slate-900 border-slate-800 text-slate-400';

                  const badgeDot = {
                    CRITICAL: '🔴',
                    HIGH: '🟠',
                    MEDIUM: '🟡',
                    LOW: '🔵',
                    NORMAL: '🟢'
                  }[ano.severity] || '⚪';

                  return (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{badgeDot}</span>
                          {ano.metricDisplayName || ano.metric}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${severityStyle}`}>
                            {ano.severity}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-semibold">
                            {ano.anomalyScore}/100
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800/60">
                        <span className="text-slate-400">
                          Observed: <strong className="text-slate-200">{ano.current}{ano.unit === 'percent' ? '%' : ano.unit ? ` ${ano.unit}` : ''}</strong>
                        </span>
                        <span className="text-slate-500">
                          Baseline: <strong className="text-slate-400">{ano.baseline}{ano.unit === 'percent' ? '%' : ano.unit ? ` ${ano.unit}` : ''}</strong>
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {ano.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase 3: Detected Incident Hypotheses Card */}
          {incident.identifiedIncident && (
            <div className="glass-panel rounded-xl p-5 border border-indigo-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <ShieldAlert className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Detected Incident Hypothesis</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-semibold flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  Multi-Signal Evidence Correlation
                </span>
              </div>

              {/* Primary Most Likely Hypothesis */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 block font-semibold">
                      Most Likely Incident Category
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                      {incident.identifiedIncident.displayName || incident.identifiedIncident.incidentType}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                      incident.identifiedIncident.confidence >= 80 
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' 
                        : 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                    }`}>
                      {incident.identifiedIncident.confidence}% Confidence
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {incident.identifiedIncident.explanation}
                </p>

                {/* Supporting Signals Breakdown */}
                {incident.identifiedIncident.supportingEvidence && incident.identifiedIncident.supportingEvidence.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block font-mono">
                      Correlated Supporting Signals:
                    </span>
                    <div className="space-y-1.5">
                      {incident.identifiedIncident.supportingEvidence.map((ev, idx) => (
                        <div key={idx} className="text-xs text-slate-400 flex items-start gap-2 bg-slate-950/50 p-2 rounded border border-slate-800/80">
                          <span className="text-indigo-400 font-mono text-[10px] shrink-0 mt-0.5 font-bold">+{ev.weight}pts</span>
                          <span className="text-slate-300">{ev.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradicting Signals (if any) */}
                {incident.identifiedIncident.contradictingEvidence && incident.identifiedIncident.contradictingEvidence.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block font-mono">
                      Contradicting Evidence:
                    </span>
                    <div className="space-y-1.5">
                      {incident.identifiedIncident.contradictingEvidence.map((ev, idx) => (
                        <div key={idx} className="text-xs text-amber-300/80 flex items-start gap-2 bg-amber-950/20 p-2 rounded border border-amber-500/20">
                          <span className="text-amber-400 font-mono text-[10px] shrink-0 mt-0.5 font-bold">{ev.weight}pts</span>
                          <span>{ev.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Alternative Hypotheses */}
              {incident.incidentHypotheses && incident.incidentHypotheses.length > 1 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                    Alternative Plausible Hypotheses:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {incident.incidentHypotheses.slice(1).map((alt, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{alt.displayName || alt.incidentType}</span>
                        <span className="font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded text-[10px] font-semibold">
                          {alt.confidence}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase 4: Why SentinelAI Thinks This (Evidence Chain & Root Cause) */}
          {incident.primaryRootCause && (
            <div className="glass-panel rounded-xl p-5 border border-purple-500/30 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <Network className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Why SentinelAI Thinks This</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Cross-Signal Evidence Correlation
                </span>
              </div>

              {/* Probable Root Cause Banner */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-purple-400 block font-semibold">
                      Probable Root Cause Hypothesis
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                      {incident.primaryRootCause.candidate}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-purple-950/60 border border-purple-500/40 text-purple-300">
                      {incident.primaryRootCause.confidence}% Confidence
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {incident.primaryRootCause.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {incident.primaryRootCause.summary}
                </p>

                {incident.primaryRootCause.suspectedOrigin && (
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">
                      Suspected Origin Service: <strong className="text-purple-300">{incident.primaryRootCause.suspectedOrigin.service}</strong>
                    </div>
                    {incident.primaryRootCause.suspectedOrigin.component && (
                      <div className="text-slate-400">
                        Component: <strong className="text-slate-200">{incident.primaryRootCause.suspectedOrigin.component}</strong>
                      </div>
                    )}
                  </div>
                )}

                {/* Supporting and Contradicting Evidence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  {/* Supporting Evidence */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-semibold text-emerald-400 block">
                      Supporting Evidence ({incident.primaryRootCause.supportingEvidence?.length || 0})
                    </span>
                    {incident.primaryRootCause.supportingEvidence?.map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80 flex items-start gap-1.5">
                        <span className="text-emerald-400 shrink-0">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Contradicting Evidence */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-semibold text-amber-400 block">
                      Contradicting Signals ({incident.primaryRootCause.contradictingEvidence?.length || 0})
                    </span>
                    {incident.primaryRootCause.contradictingEvidence && incident.primaryRootCause.contradictingEvidence.length > 0 ? (
                      incident.primaryRootCause.contradictingEvidence.map((item, idx) => (
                        <div key={idx} className="text-xs text-amber-300 bg-amber-950/20 p-2 rounded border border-amber-500/20 flex items-start gap-1.5">
                          <span className="text-amber-400 shrink-0">⚠</span>
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic p-2 bg-slate-950/40 rounded border border-slate-800/40">
                        No contradictory signals detected.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Evidence Chain */}
              {incident.evidenceChain && incident.evidenceChain.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-slate-300">
                    <GitBranch className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider font-mono">
                      Sequential Evidence Chain
                    </h3>
                  </div>

                  <div className="space-y-2 relative pl-3 border-l-2 border-purple-500/30 ml-2">
                    {incident.evidenceChain.map((step, idx) => {
                      const stageStyle = {
                        ORIGIN_SIGNAL: 'text-red-400 border-red-500/30 bg-red-950/30',
                        PROPAGATION: 'text-amber-400 border-amber-500/30 bg-amber-950/30',
                        DOWNSTREAM_IMPACT: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/30',
                        USER_IMPACT: 'text-purple-400 border-purple-500/30 bg-purple-950/30'
                      }[step.stage] || 'text-slate-400 border-slate-800 bg-slate-900';

                      return (
                        <div key={idx} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 relative space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px] font-mono font-bold">
                                {step.step}
                              </span>
                              <span className="text-xs font-bold text-slate-200">
                                {step.title}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${stageStyle}`}>
                              {step.stage}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 pl-7">{step.observation}</p>
                          {step.timestamp && (
                            <span className="text-[10px] font-mono text-slate-500 pl-7 block">
                              {new Date(step.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Evidence Clusters */}
              {incident.evidenceClusters && incident.evidenceClusters.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block font-mono">
                    Correlated Evidence Clusters:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {incident.evidenceClusters.map((cluster, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-300 font-mono">{cluster.category}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-semibold">
                            {cluster.strength}% Strength
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{cluster.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Root Cause Analysis (RCA) Card */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Predictive Root Cause Analysis
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
                {incident.rootCause?.confidence || 90}% Confidence
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <p className="text-sm font-semibold text-indigo-300">{incident.rootCause?.summary}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{incident.rootCause?.details}</p>
            </div>

            {incident.rootCause?.evidence && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Correlated Telemetry Evidence:
                </span>
                <ul className="space-y-1.5">
                  {incident.rootCause.evidence.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Business Impact Prediction Card */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-100">Business Impact Assessment</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Estimated Financial Impact
                </span>
                <p className="text-lg font-bold text-emerald-400">{incident.businessImpact?.estimatedRevenueLoss || 'N/A'}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  User Experience Degradation
                </span>
                <p className="text-xs font-medium text-slate-200">{incident.businessImpact?.serviceDegradation || 'Minor'}</p>
              </div>
            </div>
          </div>

          {/* Recommended Remediation Actions Card */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-100">Recommended Action Plan</h2>
            <div className="space-y-3">
              {incident.recommendations?.map((rec) => (
                <div key={rec.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-100">{rec.action}</span>
                    <span className="px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-400 bg-purple-500/10 rounded border border-purple-500/20">
                      {rec.confidence}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{rec.description}</p>
                  
                  {rec.command && (
                    <div className="mt-2 flex items-center justify-between p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300 border border-slate-800">
                      <code className="truncate max-w-md">{rec.command}</code>
                      <button
                        onClick={() => handleCopyCommand(rec.id, rec.command)}
                        className="ml-2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy command"
                      >
                        {copiedId === rec.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Timeline & AI Assistant */}
        <div className="space-y-6">
          {/* Incident Timeline */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-slate-100">Reconstructed Timeline</h2>
            <Timeline events={incident.timeline || []} />
          </div>

          {/* AI Incident Assistant Q&A */}
          <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <MessageSquare className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-100">Incident Assistant Chat</h2>
            </div>

            <div className="h-64 overflow-y-auto space-y-3 p-2 bg-slate-950/60 rounded-lg border border-slate-900 text-xs">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2.5 rounded-lg max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'ml-auto bg-indigo-600/30 text-indigo-200 border border-indigo-500/30'
                      : 'mr-auto bg-slate-900 text-slate-300 border border-slate-800'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleAskQuestion} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask AI: e.g. Why is this critical?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 px-3 py-2 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
