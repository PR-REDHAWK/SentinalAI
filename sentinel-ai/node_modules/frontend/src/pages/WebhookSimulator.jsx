import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cloud, Database, Box, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import Button from '../components/Button';

// Helper to generate realistic temporal series for simulated alerts
const generateTemporalPoints = (baseline, points, stepMinutes = 1) => {
  const now = Date.now();
  return points.map((val, idx) => ({
    timestamp: new Date(now - (points.length - 1 - idx) * stepMinutes * 60000).toISOString(),
    value: val,
    baseline
  }));
};

const getSimulatorPayloads = () => {
  const nowIso = new Date().toISOString();

  return [
    {
      id: 'datadog',
      name: 'Datadog',
      icon: Activity,
      color: 'from-purple-500 to-indigo-600',
      endpoint: '/api/webhooks/datadog',
      getPayload: () => ({
        alert_id: "10934812",
        title: "High Latency Detected on Payment Gateway",
        status: "Triggered",
        tags: [
          "env:production",
          "service:payment-gateway",
          "region:us-east-1",
          "team:payments-infra",
          "tier:tier-1"
        ],
        metric: "aws.applicationelb.target_response_time",
        value: 1205.4,
        threshold: 500,
        timestamp: new Date().toISOString(),
        supporting_telemetry: {
          latency_trend_ms: generateTemporalPoints(220, [220, 410, 625, 840, 1050, 1205.4], 1),
          request_rate_rps: { current: 460, baseline: 450, unit: "req/s" },
          error_rate_pct: { current: 8.5, baseline: 0.1, unit: "percent" },
          cpu_utilization_pct: { current: 42, baseline: 35, unit: "percent" },
          downstream_dependency: {
            name: "payment-processor-api",
            baseline_latency_ms: 150,
            current_latency_ms: 980,
            status: "degraded"
          }
        }
      })
    },
    {
      id: 'prometheus',
      name: 'Prometheus',
      icon: Database,
      color: 'from-orange-500 to-red-600',
      endpoint: '/api/webhooks/prometheus',
      getPayload: () => ({
        status: "firing",
        alerts: [{
          labels: {
            alertname: "PostgreSQL High CPU",
            severity: "critical",
            instance: "db-main-01",
            job: "postgresql",
            env: "production",
            region: "us-east-1"
          },
          annotations: {
            summary: "Database CPU above 95%",
            description: "PostgreSQL primary node CPU utilization has sustained >95% for 5 minutes."
          },
          startsAt: new Date().toISOString(),
          telemetry: {
            cpu_utilization_trend: generateTemporalPoints(61, [61, 65, 72, 80, 89, 96], 1),
            active_connections: { current: 290, baseline: 45, limit: 300 },
            db_latency_ms: { current: 450, baseline: 15 },
            query_latency_p99_ms: { current: 1400, baseline: 25 },
            error_rate_pct: { current: 4.2, baseline: 0.01 }
          }
        }]
      })
    },
    {
      id: 'cloudwatch',
      name: 'AWS CloudWatch',
      icon: Cloud,
      color: 'from-blue-500 to-cyan-600',
      endpoint: '/api/webhooks/cloudwatch',
      getPayload: () => ({
        AlarmName: "TargetTracking-ASG-ScaleOut",
        NewStateValue: "ALARM",
        NewStateReason: "Threshold Crossed: 2 datapoints were greater than or equal to the threshold (80.0).",
        StateChangeTime: new Date().toISOString(),
        Region: "eu-west-1",
        Namespace: "AWS/EC2",
        MetricName: "CPUUtilization",
        Dimensions: [
          { name: "AutoScalingGroupName", value: "asg-prod-eu-west-1-workers" }
        ],
        SupportingMetrics: {
          request_rate_trend: generateTemporalPoints(1000, [1000, 1200, 2500, 4800, 6900, 8500], 1),
          cpu_trend: generateTemporalPoints(40, [40, 45, 58, 72, 84, 89], 1),
          memory_utilization_pct: { current: 82, baseline: 50 },
          queue_depth_messages: { current: 1450, baseline: 12 },
          latency_ms: { current: 390, baseline: 85 },
          error_rate_pct: { current: 1.8, baseline: 0.05 }
        }
      })
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes',
      icon: Box,
      color: 'from-blue-600 to-indigo-700',
      endpoint: '/api/webhooks/kubernetes',
      getPayload: () => ({
        kind: "Event",
        apiVersion: "v1",
        involvedObject: {
          kind: "Pod",
          name: "auth-service-7f89b9d4-abc12",
          namespace: "production"
        },
        reason: "CrashLoopBackOff",
        message: "Back-off restarting failed container auth-service in pod auth-service-7f89b9d4-abc12",
        type: "Warning",
        count: 8,
        lastTimestamp: new Date().toISOString(),
        pod_telemetry: {
          restart_count: { current: 8, baseline: 0 },
          container_uptime_seconds: { current: 14, baseline: 86400 },
          memory_mb: { current: 512, baseline: 220, limit: 512 },
          cpu_utilization_pct: { current: 92, baseline: 15 },
          error_rate_pct: { current: 45.0, baseline: 0.02 },
          container_logs: [
            "INFO Starting auth-service daemon on :8080...",
            "INFO Warming up token verification cache from Redis...",
            "FATAL java.lang.OutOfMemoryError: Java heap space (512MiB limit exceeded)",
            "ERROR Container auth-service failed liveness probe, restarting"
          ],
          recent_deployment: {
            service: "auth-service",
            version: "v2.4.1",
            deployedAt: new Date(Date.now() - 15 * 60000).toISOString(),
            status: "degraded",
            commit: "b7e2d9a"
          }
        }
      })
    }
  ];
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const WebhookSimulator = () => {
  const [sending, setSending] = useState(null);
  const [status, setStatus] = useState(null);

  const endpoints = getSimulatorPayloads();

  const triggerWebhook = async (integration) => {
    setSending(integration.id);
    setStatus(null);
    try {
      const activePayload = integration.getPayload();
      await axios.post(`${API_URL}${integration.endpoint}`, activePayload);
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
          Trigger realistic raw monitoring payloads enriched with temporal telemetry, baselines, and supporting signals for SentinelAI ingestion.
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
        {endpoints.map((integration) => {
          const Icon = integration.icon;
          const previewPayload = integration.getPayload();
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

              <div className="bg-slate-950 rounded-lg p-3 overflow-x-auto border border-slate-800 max-h-56">
                <pre className="text-xs text-slate-300 font-mono">
                  {JSON.stringify(previewPayload, null, 2)}
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
