import React, { useState } from 'react';
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
  Send 
} from 'lucide-react';

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
      text: `I've analyzed ${incident.id}. Ask me anything about the root cause, deployment evidence, or recommended rollback steps.`
    }
  ]);

  const handleCopyCommand = (recId, command) => {
    navigator.clipboard.writeText(command);
    setCopiedId(recId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = (newStatus) => {
    updateIncidentStatus(incident.id, newStatus);
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
