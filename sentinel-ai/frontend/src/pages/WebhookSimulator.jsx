import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cloud, Database, Box, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import Button from '../components/Button';

const WEBHOOK_ENDPOINTS = [
  {
    id: 'datadog',
    name: 'Datadog',
    icon: Activity,
    color: 'from-purple-500 to-indigo-600',
    endpoint: '/api/webhooks/datadog',
    payload: {
      alert_id: "10934812",
      title: "High Latency Detected on Payment Gateway",
      status: "Triggered",
      tags: ["env:production", "service:payment-gateway", "region:us-east-1"],
      metric: "aws.applicationelb.target_response_time",
      value: 1205.4,
      threshold: 500,
      timestamp: new Date().toISOString()
    }
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    icon: Database,
    color: 'from-orange-500 to-red-600',
    endpoint: '/api/webhooks/prometheus',
    payload: {
      status: "firing",
      alerts: [{
        labels: {
          alertname: "PostgreSQL High CPU",
          severity: "critical",
          instance: "db-main-01"
        },
        annotations: {
          summary: "Database CPU above 95%",
          description: "PostgreSQL primary node CPU utilization has sustained >95% for 5 minutes."
        }
      }]
    }
  },
  {
    id: 'cloudwatch',
    name: 'AWS CloudWatch',
    icon: Cloud,
    color: 'from-blue-500 to-cyan-600',
    endpoint: '/api/webhooks/cloudwatch',
    payload: {
      AlarmName: "TargetTracking-ASG-ScaleOut",
      NewStateValue: "ALARM",
      NewStateReason: "Threshold Crossed: 2 datapoints were greater than or equal to the threshold (80.0).",
      StateChangeTime: new Date().toISOString(),
      Region: "eu-west-1"
    }
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    icon: Box,
    color: 'from-blue-600 to-indigo-700',
    endpoint: '/api/webhooks/kubernetes',
    payload: {
      kind: "Event",
      involvedObject: {
        kind: "Pod",
        name: "auth-service-7f89b9d4-abc12",
        namespace: "production"
      },
      reason: "CrashLoopBackOff",
      message: "Back-off restarting failed container",
      type: "Warning",
      lastTimestamp: new Date().toISOString()
    }
  }
];

export const WebhookSimulator = () => {
  const [sending, setSending] = useState(null);
  const [status, setStatus] = useState(null);

  const triggerWebhook = async (integration) => {
    setSending(integration.id);
    setStatus(null);
    try {
      await axios.post(`http://localhost:5000${integration.endpoint}`, integration.payload);
      setStatus({ type: 'success', message: `${integration.name} alert sent successfully!` });
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: `Failed to send ${integration.name} alert. Is the backend running?` });
    }
    setSending(null);
    
    // Clear status after 3 seconds
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          Webhook Simulator
          <Send className="w-5 h-5 text-indigo-400" />
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Trigger simulated monitoring alerts to test the AI Analysis pipeline and real-time dashboard updates.
        </p>
      </div>

      {status && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            status.type === 'success' 
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-950/30 border-red-500/30 text-red-400'
          }`}
        >
          {status.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {status.message}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {WEBHOOK_ENDPOINTS.map((integration) => {
          const Icon = integration.icon;
          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-xl p-6 border border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-gradient-to-tr ${integration.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-100">{integration.name}</h3>
                  <p className="text-xs text-slate-400">Endpoint: {integration.endpoint}</p>
                </div>
              </div>

              <div className="bg-slate-950 rounded-lg p-3 overflow-x-auto border border-slate-800">
                <pre className="text-xs text-slate-300 font-mono">
                  {JSON.stringify(integration.payload, null, 2)}
                </pre>
              </div>

              <Button
                variant="primary"
                className="w-full justify-center"
                onClick={() => triggerWebhook(integration)}
                disabled={sending !== null}
              >
                {sending === integration.id ? 'Sending Alert...' : `Trigger ${integration.name} Alert`}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default WebhookSimulator;
