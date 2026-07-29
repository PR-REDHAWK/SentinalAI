export const initialIncidents = [
  {
    id: "INC-8942",
    title: "European Auth Gateway 504 Timeout Spikes",
    description: "Following deployment release v4.3.0, login requests originating from eu-west-1 region are experiencing cascading 504 Gateway Timeout errors. Authentication latency increased from 120ms to >4500ms.",
    severity: "Critical",
    category: "Authentication",
    status: "Investigating",
    affectedService: "Auth Service (eu-west-1)",
    region: "Europe (eu-west-1)",
    impactedUsers: 142000,
    confidenceScore: 94,
    createdAt: "2026-07-29T20:15:00Z",
    aiSummary: "The AI correlated a sharp increase in HTTP 504 status codes in eu-west-1 with Release v4.3.0 deployed at 20:10 UTC. A deadlock in database connection pool scaling during token validation is the primary driver of cascading service degradation.",
    rootCause: {
      summary: "Database Connection Pool Exhaustion after release v4.3.0",
      confidence: 94,
      details: "Deployment v4.3.0 introduced a non-blocking JWT signature check that omitted connection cleanup on error handling branches. Under high concurrent traffic, unclosed pool handles depleted the Postgres connection pool within 5 minutes.",
      evidence: [
        "Deployment v4.3.0 tagged at 20:10:12 UTC",
        "DB pool connection usage reached 100% (500/500 connections) at 20:14:05 UTC",
        "504 HTTP status code rate jumped from 0.01% to 38.4% in eu-west-1"
      ]
    },
    businessImpact: {
      affectedUsers: "142,000 active users",
      regions: ["EU-West-1 (Ireland)", "EU-Central-1 (Frankfurt)"],
      estimatedRevenueLoss: "$18,500 / hr",
      serviceDegradation: "User login impossible; active sessions remain functional."
    },
    recommendations: [
      {
        id: "REC-1",
        action: "Rollback deployment to v4.2.9",
        description: "Executing automated rollback will restore previous connection pool handling logic.",
        confidence: 96,
        type: "Mitigation",
        command: "kubectl rollout undo deployment/auth-service -n prod-eu"
      },
      {
        id: "REC-2",
        action: "Emergency connection pool capacity increase",
        description: "Temporarily boost max_connections from 500 to 1200 on DB primary cluster.",
        confidence: 88,
        type: "Workaround",
        command: "aws rds modify-db-parameter-group --db-parameter-group-name prod-eu-pg --parameters \"ParameterName=max_connections,ParameterValue=1200,ApplyMethod=immediate\""
      },
      {
        id: "REC-3",
        action: "Flush Redis Auth Cache",
        description: "Clear stale validation tokens to force clean re-authentication after rollback.",
        confidence: 79,
        type: "Cleanup",
        command: "redis-cli -h cache.eu-west-1.internal FLUSHDB"
      }
    ],
    timeline: [
      { id: 1, timestamp: "2026-07-29T20:10:12Z", type: "deployment", title: "Release v4.3.0 Deployed", description: "CI/CD Pipeline #9481 deployed image auth-service:v4.3.0 to cluster prod-eu-west-1." },
      { id: 2, timestamp: "2026-07-29T20:13:45Z", type: "alert", title: "Latency Threshold Exceeded", description: "Datadog alert triggered: p99 latency > 3000ms on auth-service." },
      { id: 3, timestamp: "2026-07-29T20:14:05Z", type: "metric", title: "DB Pool Exhaustion", description: "PostgreSQL max connection limit reached (500/500)." },
      { id: 4, timestamp: "2026-07-29T20:15:00Z", type: "incident", title: "Incident Auto-Created by SentinelAI", description: "Correlated 42 alerts from Sentry, PagerDuty, and CloudWatch into INC-8942." },
      { id: 5, timestamp: "2026-07-29T20:16:30Z", type: "ai", title: "Root Cause Prediction Generated", description: "SentinelAI identified v4.3.0 DB pool leak with 94% confidence." }
    ]
  },
  {
    id: "INC-8941",
    title: "Payment Gateway Webhook Processing Backlog",
    description: "Stripe and PayPal webhook processing queue lag exceeded 25 minutes. Transactions are completed but order confirmation status is delayed.",
    severity: "High",
    category: "Payment Pipeline",
    status: "Mitigated",
    affectedService: "Checkout Worker Cluster",
    region: "Global",
    impactedUsers: 38500,
    confidenceScore: 91,
    createdAt: "2026-07-29T18:45:00Z",
    aiSummary: "Worker pool thread starvation caused by unthrottled third-party API retries during Stripe secondary infrastructure maintenance.",
    rootCause: {
      summary: "Stripe API rate limit retries blocking worker thread pool",
      confidence: 91,
      details: "Synchronous retry loop inside worker queue consumer caused thread starvation when Stripe API response latency spiked during their scheduled maintenance window.",
      evidence: [
        "RabbitMQ unacknowledged messages reached 45,000 threshold",
        "Worker CPU utilization static at 35% despite full queue",
        "Stripe status page reported elevated 503 response rates"
      ]
    },
    businessImpact: {
      affectedUsers: "38,500 customers awaiting confirmation",
      regions: ["Global"],
      estimatedRevenueLoss: "$4,200 / hr",
      serviceDegradation: "Orders processed successfully; fulfillment notifications delayed."
    },
    recommendations: [
      {
        id: "REC-10",
        action: "Scale Out Worker Replicas",
        description: "Increase concurrency from 20 to 80 pods to drain queue backpressure.",
        confidence: 95,
        type: "Scale",
        command: "kubectl scale deployment/checkout-worker --replicas=80"
      },
      {
        id: "REC-11",
        action: "Enable Exponential Backoff with Jitter",
        description: "Update config flag WORKER_RETRY_STRATEGY=EXPONENTIAL_JITTER.",
        confidence: 89,
        type: "Config",
        command: "helm upgrade checkout-worker ./charts/checkout -f values-prod.yaml --set retry.strategy=exponential_jitter"
      }
    ],
    timeline: [
      { id: 1, timestamp: "2026-07-29T18:30:00Z", type: "external", title: "Stripe Maintenance Window Started", description: "Stripe API secondary gateway latency increased." },
      { id: 2, timestamp: "2026-07-29T18:40:10Z", type: "alert", title: "Queue Length Breach", description: "RabbitMQ queue checkout_webhooks exceeds 20,000 items." },
      { id: 3, timestamp: "2026-07-29T18:45:00Z", type: "incident", title: "Incident Created", description: "SentinelAI automatically grouped webhook failure alerts into INC-8941." },
      { id: 4, timestamp: "2026-07-29T19:05:00Z", type: "action", title: "Worker Replicas Scaled", description: "Incident Commander applied Recommendation REC-10. Backlog draining rapidly." }
    ]
  },
  {
    id: "INC-8939",
    title: "Search Index Synchronization Delay",
    description: "New product catalog updates take up to 45 minutes to reflect in ElasticSearch clusters due to high indexing shard lock contend.",
    severity: "Medium",
    category: "Search & Analytics",
    status: "Active",
    affectedService: "ElasticSearch Shard Node 04",
    region: "US-East-1",
    impactedUsers: 8400,
    confidenceScore: 86,
    createdAt: "2026-07-29T15:20:00Z",
    aiSummary: "High disk I/O wait times on ES Data Node 04 caused by simultaneous automated index re-indexing and bulk catalog updates.",
    rootCause: {
      summary: "Disk I/O Bottleneck on ElasticSearch Cluster Node 04",
      confidence: 86,
      details: "Cron job reindex-daily-metrics ran concurrently with merchant catalog update, starving IOPS on EBS gp3 volume.",
      evidence: [
        "EBS Volume IOPS throttled at 3000 max capacity",
        "ES Shard reallocation task stalled on Node 04"
      ]
    },
    businessImpact: {
      affectedUsers: "8,400 catalog searches",
      regions: ["US-East-1"],
      estimatedRevenueLoss: "$650 / hr",
      serviceDegradation: "Stale search results for newly added products."
    },
    recommendations: [
      {
        id: "REC-20",
        action: "Pause Background Reindexing Cron Job",
        description: "Free up disk I/O by deferring non-critical daily metric reindexing.",
        confidence: 92,
        type: "Mitigation",
        command: "kubectl pause cronjob/es-reindex-daily"
      }
    ],
    timeline: [
      { id: 1, timestamp: "2026-07-29T15:00:00Z", type: "cron", title: "Daily Reindex Started", description: "Automated cronjob initiated bulk indexing." },
      { id: 2, timestamp: "2026-07-29T15:20:00Z", type: "incident", title: "Incident Logged", description: "Created from customer support ticket escalations." }
    ]
  },
  {
    id: "INC-8935",
    title: "S3 Asset CDN Cache Miss Ratio Increase",
    description: "CloudFront CDN edge servers experiencing 42% cache miss rate for static assets in Asia-Pacific region.",
    severity: "Low",
    category: "CDN & Assets",
    status: "Resolved",
    affectedService: "CloudFront Distribution APAC",
    region: "Asia-Pacific (ap-southeast-1)",
    impactedUsers: 2100,
    confidenceScore: 97,
    createdAt: "2026-07-29T10:10:00Z",
    aiSummary: "Cache invalidation wildcard header wildcard purge requested during static asset build deploy.",
    rootCause: {
      summary: "Accidental global Cache-Control header overwrite",
      confidence: 97,
      details: "Deployment pipeline included max-age=0 override on CSS/JS bundle uploads.",
      evidence: ["S3 bucket policy commit #a8f9c1 at 09:55 UTC"]
    },
    businessImpact: {
      affectedUsers: "2,100 visitors",
      regions: ["APAC"],
      estimatedRevenueLoss: "$0 / hr",
      serviceDegradation: "Slight increase in initial asset load times (300ms delay)."
    },
    recommendations: [
      {
        id: "REC-30",
        action: "Re-apply Cache Control Headers",
        description: "Set s-maxage=31536000 for immutable build bundles.",
        confidence: 98,
        type: "Fix",
        command: "aws s3 sync ./dist s3://prod-assets --cache-control max-age=31536000"
      }
    ],
    timeline: [
      { id: 1, timestamp: "2026-07-29T10:10:00Z", type: "incident", title: "Incident Created", description: "System detected latency increase in APAC." },
      { id: 2, timestamp: "2026-07-29T11:30:00Z", type: "resolution", title: "Resolved", description: "Cache policy reverted and verified." }
    ]
  }
];

export const mockDashboardStats = {
  activeIncidents: 3,
  criticalIncidents: 1,
  resolvedToday: 14,
  aiAccuracy: 96.8,
  activeChange: "+2 from last hour",
  criticalChange: "Requires immediate attention",
  resolvedChange: "94% within SLA",
  accuracyChange: "+1.2% this week"
};

export const mockTrendData = [
  { time: "00:00", critical: 0, high: 1, medium: 2, low: 1 },
  { time: "03:00", critical: 0, high: 0, medium: 1, low: 2 },
  { time: "06:00", critical: 1, high: 2, medium: 1, low: 0 },
  { time: "09:00", critical: 0, high: 1, medium: 3, low: 2 },
  { time: "12:00", critical: 2, high: 3, medium: 2, low: 1 },
  { time: "15:00", critical: 1, high: 2, medium: 4, low: 3 },
  { time: "18:00", critical: 1, high: 1, medium: 2, low: 1 },
  { time: "21:00", critical: 1, high: 1, medium: 1, low: 1 }
];

export const mockSeverityDistribution = [
  { name: "Critical", value: 1, color: "#EF4444" },
  { name: "High", value: 1, color: "#F97316" },
  { name: "Medium", value: 1, color: "#FBBF24" },
  { name: "Low", value: 1, color: "#3B82F6" }
];

export const mockRecentAiAnalyses = [
  {
    id: "AI-101",
    incidentId: "INC-8942",
    title: "Correlated 42 alerts from 3 monitoring sources",
    timestamp: "10 mins ago",
    confidence: "94% Confidence",
    summary: "Identified DB connection pool leak triggered by Release v4.3.0 in eu-west-1."
  },
  {
    id: "AI-102",
    incidentId: "INC-8941",
    title: "Matched with historical Incident INC-7412 (Nov 2025)",
    timestamp: "1 hour ago",
    confidence: "91% Confidence",
    summary: "Thread pool exhaustion pattern matches Stripe API maintenance outage behavior."
  },
  {
    id: "AI-103",
    incidentId: "INC-8939",
    title: "Root Cause Prediction: Disk I/O Bottleneck",
    timestamp: "4 hours ago",
    confidence: "86% Confidence",
    summary: "Resource lock conflict detected between merchant update API and daily reindex cron."
  }
];

export const mockUpcomingRecommendations = [
  {
    id: "UR-1",
    incidentId: "INC-8942",
    title: "Rollback auth-service to v4.2.9",
    impact: "High Impact - Resolves 142k user outage",
    confidence: 96
  },
  {
    id: "UR-2",
    incidentId: "INC-8941",
    title: "Scale worker deployment to 80 replicas",
    impact: "Medium Impact - Drains 45k backlogged webhooks",
    confidence: 95
  },
  {
    id: "UR-3",
    incidentId: "INC-8939",
    title: "Pause es-reindex-daily cron job",
    impact: "Low Impact - Clears I/O queue on Node 04",
    confidence: 92
  }
];
