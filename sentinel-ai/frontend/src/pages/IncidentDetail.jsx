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
  Server,
  AlertOctagon,
  Lock,
  FileSearch,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5000'
    : '');

export const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, updateIncidentStatus, addToast } = useIncidents();

  const incident = incidents.find(inc => inc.id === id) || incidents[0];

  const [copiedId, setCopiedId] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
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
    if (!incident || incident.status === newStatus || updatingStatus) return;

    const previousStatus = incident.status;
    setUpdatingStatus(true);
    updateIncidentStatus(incident.id, newStatus);

    try {
      await axios.put(`${API_URL}/api/incidents/${incident.id}`, { status: newStatus });
    } catch (err) {
      console.error("Failed to update status:", err);
      updateIncidentStatus(incident.id, previousStatus);
      addToast?.({
        title: 'Status Update Failed',
        description: err.response?.data?.message || 'Could not save incident status change.',
        type: 'alert'
      });
    } finally {
      setUpdatingStatus(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incidents
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Update Status:</span>
          {['Investigating', 'Mitigated', 'Resolved'].map((st) => (
            <button
              key={st}
              type="button"
              disabled={updatingStatus}
              onClick={() => handleStatusChange(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer disabled:opacity-60 ${
                incident.status === st
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Banner Header */}
      <div className="glass-panel rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="font-mono text-sm font-bold text-indigo-400">
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
            <span className="text-slate-500 block text-xs">Affected Service</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              {incident.affectedService}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Geographic Region</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              {incident.region}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">Impacted Users</span>
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 mt-0.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              {incident.impactedUsers ? incident.impactedUsers.toLocaleString() : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs">AI Confidence Score</span>
            <span className="font-semibold text-indigo-400 flex items-center gap-1.5 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
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
          <div className="glass-panel rounded-xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 text-indigo-400">
              <BrainCircuit className="w-5 h-5" />
              <h2 className="text-base font-bold text-slate-100">AI Incident Summary</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{incident.aiSummary}</p>
          </div>

          {/* Phase 2: Detected Telemetry Anomalies Card */}
          {incident.anomalies && incident.anomalies.length > 0 && (
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Activity className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Detected Telemetry Anomalies</h2>
                </div>
                <span className="text-slate-400 text-xs font-mono font-semibold flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  {incident.anomalies.length} Anomalous Signal{incident.anomalies.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incident.anomalies.map((ano, idx) => {
                  const severityText = {
                    CRITICAL: 'text-red-400',
                    HIGH: 'text-orange-400',
                    MEDIUM: 'text-amber-400',
                    LOW: 'text-blue-400',
                    NORMAL: 'text-emerald-400'
                  }[ano.severity] || 'text-slate-400';

                  const dotColor = {
                    CRITICAL: 'bg-red-500',
                    HIGH: 'bg-orange-500',
                    MEDIUM: 'bg-amber-500',
                    LOW: 'bg-blue-500',
                    NORMAL: 'bg-emerald-500'
                  }[ano.severity] || 'bg-slate-500';

                  return (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-lg bg-slate-900/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                          {ano.metricDisplayName || ano.metric}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-mono font-semibold">
                          <span className={severityText}>{ano.severity}</span>
                          <span className="text-slate-500">/</span>
                          <span className="text-slate-300">{ano.anomalyScore}/100</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono bg-slate-950/60 px-2.5 py-1.5 rounded">
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
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <ShieldAlert className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Detected Incident Hypothesis</h2>
                </div>
                <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Multi-Signal Evidence Correlation
                </span>
              </div>

              {/* Primary Most Likely Hypothesis */}
              <div className="p-4 rounded-xl bg-slate-900/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-100">
                    {incident.identifiedIncident.displayName || incident.identifiedIncident.incidentType}
                  </h3>
                  <span className={`text-xs font-mono font-bold ${
                    incident.identifiedIncident.confidence >= 80 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                  }`}>
                    {incident.identifiedIncident.confidence}% Confidence
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {incident.identifiedIncident.explanation}
                </p>

                {/* Supporting Signals Breakdown */}
                {incident.identifiedIncident.supportingEvidence && incident.identifiedIncident.supportingEvidence.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Correlated Supporting Signals
                    </span>
                    <div className="space-y-1.5">
                      {incident.identifiedIncident.supportingEvidence.map((ev, idx) => (
                        <div key={idx} className="text-xs text-slate-400 flex items-start gap-2 bg-slate-950/50 p-2 rounded">
                          <span className="text-indigo-400 font-mono text-[11px] shrink-0 font-bold">+{ev.weight}pts</span>
                          <span className="text-slate-300">{ev.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradicting Signals (if any) */}
                {incident.identifiedIncident.contradictingEvidence && incident.identifiedIncident.contradictingEvidence.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-xs font-semibold text-amber-400 block">
                      Contradicting Evidence
                    </span>
                    <div className="space-y-1.5">
                      {incident.identifiedIncident.contradictingEvidence.map((ev, idx) => (
                        <div key={idx} className="text-xs text-amber-300/80 flex items-start gap-2 bg-amber-950/20 p-2 rounded">
                          <span className="text-amber-400 font-mono text-[11px] shrink-0 font-bold">{ev.weight}pts</span>
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
                  <span className="text-xs font-semibold text-slate-400 block">
                    Alternative Plausible Hypotheses
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {incident.incidentHypotheses.slice(1).map((alt, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">{alt.displayName || alt.incidentType}</span>
                        <span className="font-mono text-slate-400 text-xs font-semibold">
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
            <div className="glass-panel rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Network className="w-5 h-5" />
                  <h2 className="text-base font-bold text-slate-100">Why SentinelAI Thinks This</h2>
                </div>
                <span className="text-slate-400 text-xs font-mono flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  Cross-Signal Evidence Correlation
                </span>
              </div>

              {/* Probable Root Cause Banner */}
              <div className="p-4 rounded-xl bg-slate-900/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-slate-100">
                    {incident.primaryRootCause.candidate}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono font-bold">
                    <span className="text-indigo-400">
                      {incident.primaryRootCause.confidence}% Confidence
                    </span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-300">
                      {incident.primaryRootCause.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {incident.primaryRootCause.summary}
                </p>

                {incident.primaryRootCause.suspectedOrigin && (
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono bg-slate-950/70 p-2.5 rounded-lg">
                    <div className="text-slate-400">
                      Suspected Origin Service: <strong className="text-indigo-300">{incident.primaryRootCause.suspectedOrigin.service}</strong>
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
                    <span className="text-xs font-semibold text-emerald-400 block">
                      Supporting Evidence ({incident.primaryRootCause.supportingEvidence?.length || 0})
                    </span>
                    {incident.primaryRootCause.supportingEvidence?.map((item, idx) => (
                      <div key={idx} className="text-xs text-slate-300 bg-slate-950/60 p-2 rounded flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Contradicting Evidence */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-amber-400 block">
                      Contradicting Signals ({incident.primaryRootCause.contradictingEvidence?.length || 0})
                    </span>
                    {incident.primaryRootCause.contradictingEvidence && incident.primaryRootCause.contradictingEvidence.length > 0 ? (
                      incident.primaryRootCause.contradictingEvidence.map((item, idx) => (
                        <div key={idx} className="text-xs text-amber-300 bg-amber-950/20 p-2 rounded flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 italic p-2 bg-slate-950/40 rounded">
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
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-200">
                      Sequential Evidence Chain
                    </h3>
                  </div>

                  <div className="space-y-2 relative pl-3 border-l-2 border-indigo-500/30 ml-2">
                    {incident.evidenceChain.map((step, idx) => {
                      const stageColor = {
                        ORIGIN_SIGNAL: 'text-red-400',
                        PROPAGATION: 'text-amber-400',
                        DOWNSTREAM_IMPACT: 'text-indigo-400',
                        USER_IMPACT: 'text-sky-400'
                      }[step.stage] || 'text-slate-400';

                      return (
                        <div key={idx} className="p-3 rounded-lg bg-slate-900/80 relative space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-mono font-bold">
                                {step.step}
                              </span>
                              <span className="text-xs font-bold text-slate-200">
                                {step.title}
                              </span>
                            </div>
                            <span className={`text-[11px] font-mono font-semibold ${stageColor}`}>
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
                  <span className="text-xs font-semibold text-slate-400 block">
                    Correlated Evidence Clusters
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {incident.evidenceClusters.map((cluster, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300 font-mono">{cluster.category}</span>
                          <span className="text-slate-400 text-xs font-mono font-semibold">
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
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                AI Grounded Root Cause Synthesis
              </h2>
              <div className="flex items-center gap-3 text-xs font-mono font-semibold">
                {incident.aiAnalysisStatus && (
                  <span className={
                    incident.aiAnalysisStatus === 'COMPLETED' ? 'text-emerald-400' :
                    incident.aiAnalysisStatus === 'PENDING' ? 'text-amber-400' :
                    'text-red-400'
                  }>
                    {incident.aiAnalysisStatus}
                  </span>
                )}
                <span className="text-emerald-400">
                  {incident.aiScore || incident.rootCause?.confidence || 90}% AI Confidence
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900/90 space-y-2">
              <p className="text-sm font-semibold text-indigo-300">{incident.rootCause?.summary || incident.aiAnalysis?.rootCauseAnalysis?.primaryHypothesis}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{incident.rootCause?.details || incident.aiAnalysis?.rootCauseAnalysis?.explanation}</p>
            </div>

            {incident.aiAnalysis?.evidenceNarrative && (
              <div className="p-3 rounded-lg bg-slate-900/70 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-indigo-300 block mb-1">
                  Evidence Narrative Progression
                </span>
                {incident.aiAnalysis.evidenceNarrative}
              </div>
            )}

            {incident.rootCause?.evidence && incident.rootCause.evidence.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300 block">
                  Grounded Telemetry Evidence
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

            {/* Uncertainty Assessment */}
            {incident.aiAnalysis?.uncertainty && (
              <div className="p-2.5 rounded-lg bg-slate-950/70 flex items-start gap-2 text-xs">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-300">Uncertainty Assessment ({incident.aiAnalysis.uncertainty.level || 'LOW'}):</span>
                  <p className="text-slate-400 text-[11px]">{incident.aiAnalysis.uncertainty.explanation}</p>
                </div>
              </div>
            )}
          </div>

          {/* External Web Intelligence (TinyFish) Card */}
          {((incident.externalEvidence && incident.externalEvidence.length > 0) || incident.externalEnrichment) && (
            <div className="glass-panel rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sky-400">
                  <Globe className="w-5 h-5 text-sky-400" />
                  <h2 className="text-base font-bold text-slate-100">External Web Intelligence (TinyFish)</h2>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono font-semibold">
                  {incident.externalEnrichment?.status && (
                    <span className={
                      incident.externalEnrichment.status === 'COMPLETED' ? 'text-sky-400' :
                      incident.externalEnrichment.status === 'SKIPPED' ? 'text-slate-400' :
                      'text-amber-400'
                    }>
                      {incident.externalEnrichment.status}
                    </span>
                  )}
                  {incident.externalEvidence?.length > 0 && (
                    <span className="text-sky-300">
                      {incident.externalEvidence.length} Public Advisor{incident.externalEvidence.length > 1 ? 'ies' : 'y'}
                    </span>
                  )}
                </div>
              </div>

              {/* Informational distinction notice */}
              <div className="p-3 rounded-lg bg-sky-950/20 text-xs text-sky-200/90 flex items-start gap-2.5 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sky-300">Supplementary Evidence Notice: </span>
                  External findings are public web results retrieved to investigate potential cloud or vendor outages. Internal telemetry remains the verified ground truth.
                </div>
              </div>

              {/* AI Corroboration Synthesis */}
              {(incident.externalEvidenceAnalysis?.explanation || incident.aiAnalysis?.externalEvidenceAnalysis?.explanation) && (
                <div className="p-3.5 rounded-lg bg-slate-900/90 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      AI External Corroboration
                    </span>
                    {(incident.externalEvidenceAnalysis?.status || incident.aiAnalysis?.externalEvidenceAnalysis?.status) && (
                      <span className={`text-xs font-mono font-bold ${
                        (incident.externalEvidenceAnalysis?.status || incident.aiAnalysis?.externalEvidenceAnalysis?.status) === 'CORROBORATING'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}>
                        {incident.externalEvidenceAnalysis?.status || incident.aiAnalysis?.externalEvidenceAnalysis?.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {incident.externalEvidenceAnalysis?.explanation || incident.aiAnalysis?.externalEvidenceAnalysis?.explanation}
                  </p>
                </div>
              )}

              {/* List of Discovered External Advisories */}
              {incident.externalEvidence && incident.externalEvidence.length > 0 ? (
                <div className="space-y-2.5">
                  <span className="text-xs font-semibold text-slate-400 block">
                    Discovered Public Advisories & Sources
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {incident.externalEvidence.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-slate-900/70 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {item.isAuthoritative ? (
                              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Authoritative Status Page
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-semibold text-slate-400">
                                Community Candidate
                              </span>
                            )}
                            <span className="text-xs font-mono text-slate-400">
                              {item.source}
                            </span>
                          </div>
                          {item.retrievedAt && (
                            <span className="text-[10px] font-mono text-slate-500">
                              Retrieved: {new Date(item.retrievedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </div>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1.5 transition-colors"
                        >
                          <span>{item.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        </a>

                        <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/50 p-2 rounded">
                          {item.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : incident.externalEnrichment?.reason ? (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-950/50 rounded-lg">
                  {incident.externalEnrichment.reason}
                </div>
              ) : null}
            </div>
          )}

          {/* Business Impact Prediction Card */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-100">Operational & Business Impact Assessment</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg bg-slate-900/60 space-y-1">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Estimated Quantitative Impact
                </span>
                <p className="text-xs font-medium text-slate-300">
                  {incident.businessImpact?.estimatedRevenueLoss || incident.aiAnalysis?.businessImpact?.estimatedImpact || 'Quantitative impact cannot be determined from available telemetry.'}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/60 space-y-1">
                <span className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-400" />
                  User Experience Impact
                </span>
                <p className="text-xs font-medium text-slate-200">
                  {incident.businessImpact?.affectedUsers || incident.aiAnalysis?.businessImpact?.userImpact || incident.businessImpact?.serviceDegradation || 'Active user workflows may experience elevated latency.'}
                </p>
              </div>
            </div>
          </div>

          {/* Recommended Remediation Actions Card */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">Recommended Action Plan</h2>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Human-in-the-Loop Safe Execution
              </span>
            </div>
            
            <div className="space-y-3">
              {incident.recommendations?.map((rec, idx) => (
                <div key={rec.id || idx} className="p-4 rounded-xl bg-slate-900/90 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">{rec.action}</span>
                    <div className="flex items-center gap-3 text-xs font-mono font-semibold shrink-0">
                      {rec.requiresApproval && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Requires Approval
                        </span>
                      )}
                      <span className="text-indigo-400">
                        {rec.type || 'HIGH'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{rec.description}</p>
                  
                  {rec.command && (
                    <div className="mt-2 flex items-center justify-between p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-indigo-300">
                      <code className="truncate max-w-md">{rec.command}</code>
                      <button
                        onClick={() => handleCopyCommand(rec.id || idx, rec.command)}
                        className="ml-2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy command"
                      >
                        {copiedId === (rec.id || idx) ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Investigation Steps */}
            {incident.aiAnalysis?.investigationSteps && incident.aiAnalysis.investigationSteps.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileSearch className="w-3.5 h-3.5 text-indigo-400" />
                  Recommended Diagnostic Investigation Steps
                </span>
                <div className="space-y-1.5">
                  {incident.aiAnalysis.investigationSteps.map((step, idx) => (
                    <div key={idx} className="text-xs text-slate-400 flex items-start gap-2 bg-slate-950/60 p-2.5 rounded">
                      <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                        {step.step || idx + 1}
                      </span>
                      <div>
                        <strong className="text-slate-200 block">{step.action}</strong>
                        <span className="text-[11px] text-slate-400">{step.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Timeline & AI Assistant */}
        <div className="space-y-6">
          {/* Incident Timeline */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-100">Reconstructed Timeline</h2>
            <Timeline events={incident.timeline || []} />
          </div>

          {/* AI Incident Assistant Q&A */}
          <div className="glass-panel rounded-xl p-5 space-y-4">
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
