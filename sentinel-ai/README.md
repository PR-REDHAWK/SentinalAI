# SentinelAI

Autonomous Telemetry Correlation & Incident Intelligence Platform

SentinelAI is an incident intelligence platform designed to eliminate alert fatigue and accelerate Mean Time to Resolution (MTTR) across complex cloud infrastructure. It combines a deterministic telemetry correlation pipeline with an evidence-grounded Large Language Model (LLM) synthesis engine to provide explainable root-cause analysis, blast radius mapping, and verified remediation steps.

---

## Architecture Overview

SentinelAI operates on a Dual-Engine Architecture:
1. **Deterministic Ground Truth Engine (Phases 1-4):** Normalizes telemetry across disparate monitoring tools, evaluates bounded mathematical anomaly scores (0-100), classifies incident signatures against a controlled taxonomy, and constructs causal Directed Acyclic Graphs (DAGs) linking root causes to downstream symptoms.
2. **Evidence-Grounded AI Synthesis Engine (Phase 5):** Uses Gemini 2.5 Flash to synthesize the structured evidence package into human-readable engineering narratives, impact assessments, and remediation plans with strict prompt injection protection and mandatory human approval on destructive actions.

```
+-----------------------------------------------------------------------+
| Phase 1: Telemetry Normalization                                      |
| Ingestion & standardization for Datadog, Prometheus, CloudWatch, K8s  |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Phase 2: Deterministic Anomaly Scoring                                |
| Piecewise linear scoring (0-100) & temporal trend analysis            |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Phase 3: Multi-Signal Incident Identification                         |
| Controlled 12-type incident taxonomy with calibrated confidence       |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Phase 4: Cross-Signal Correlation & Evidence DAG                      |
| 8 domain clusters separating origin from downstream symptoms          |
+----------------------------------+------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| Phase 5: Evidence-Grounded AI Synthesis                               |
| Gemini 2.5 Flash synthesis, safety validation & action approvals      |
+-----------------------------------------------------------------------+
```

---

## Core Features

- **Multi-Source Webhook Ingestion:** Native normalization adapters for Datadog, Prometheus Alertmanager, AWS CloudWatch, and Kubernetes container events.
- **Deterministic Anomaly Evaluation:** Mathematical piecewise scoring across 9 metric categories (CPU, Memory, Latency, Error Rates, Connection Pools, Throughput, Restarts, Queue Lag, Uptime) with monotonic trend penalties.
- **Incident Taxonomy Classification:** 12 controlled incident types including Database Connection Exhaustion, Memory Saturation (OOM), Deployment Regressions, and Service Dependency Failures.
- **Causal Evidence Graph:** Directed Acyclic Graph (DAG) distinguishing the suspected point of origin from downstream cascading failures.
- **Interactive Webhook Simulator:** Built-in testbed to fire synthetic production alerts from multiple providers in real time.
- **Real-Time Operational Cockpit:** WebSocket-driven dashboard with live KPI counters, 24-hour incident trends, and instant browser notifications.
- **Interactive Incident Copilot:** Contextual chat assistant embedded directly in incident triage views.
- **Safety Safeguards:** Mandatory human approval flags on destructive remediation commands (restarts, rollbacks, scaling).

---

## Technology Stack

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Real-Time Transport:** Socket.IO
- **AI / LLM Engine:** Google Gemini 2.5 Flash (`@google/genai`)

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS (Vanilla CSS & Glassmorphic Design System)
- **Visualizations:** Recharts & Framer Motion
- **Icons:** Lucide React

---

## Directory Structure

```
sentinel-ai/
├── backend/
│   ├── src/
│   │   ├── config/             # Database connection setup
│   │   ├── controllers/        # Webhook, Incident, Analytics, User controllers
│   │   ├── middleware/         # Auth, error handling, async wrappers
│   │   ├── models/             # Mongoose schemas (Incident, TimelineEvent, User)
│   │   ├── routes/             # REST endpoints (/api/incidents, /api/webhooks, etc.)
│   │   ├── services/           # 5-Phase core pipeline logic
│   │   │   ├── telemetryNormalizer.js
│   │   │   ├── anomalyDetector.js
│   │   │   ├── incidentIdentifier.js
│   │   │   ├── evidenceCorrelator.js
│   │   │   └── ai/             # Gemini reasoning and validation services
│   │   ├── server.js           # Express + Socket.IO server entry point
│   │   └── app.js              # Express middleware and routing configuration
│   ├── .env.example            # Environment variable template
│   └── package.json            # Backend package configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable UI components (badges, tables, cards)
│   │   ├── context/            # React context providers (IncidentContext, AuthContext)
│   │   ├── layouts/            # Dashboard shell, Sidebar, Navbar
│   │   ├── pages/              # Dashboard, IncidentDetail, Simulator, Analytics
│   │   ├── routes/             # Client-side route declarations
│   │   ├── App.jsx             # Top-level React component
│   │   └── main.jsx            # React DOM mounting
│   ├── index.html              # HTML template
│   ├── tailwind.config.js      # Design tokens and style configuration
│   ├── vite.config.js          # Vite bundler configuration
│   └── package.json            # Frontend package configuration
│
└── package.json                # Monorepo root workspace configuration
```

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- MongoDB instance (local or MongoDB Atlas URI)
- (Optional) Google Gemini API Key for LLM reasoning features

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd sentinel-ai
   ```

2. Install dependencies for all workspaces:
   ```bash
   npm run install:all
   ```

3. Configure environment variables in `backend/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/sentinel-ai
   GEMINI_API_KEY=your_gemini_api_key_here
   FRONTEND_URL=http://localhost:5173
   NODE_ENV=development
   ```

   *Note: If `GEMINI_API_KEY` is omitted, SentinelAI automatically operates in deterministic offline fallback mode with full Phase 1-4 analytical capabilities.*

4. Start development servers for both frontend and backend concurrently:
   ```bash
   npm run dev
   ```

5. Access the application:
   - Frontend Dashboard: `http://localhost:5173`
   - Backend API: `http://localhost:5000/api`

---

## API Endpoints

### Ingestion Webhooks
- `POST /api/webhooks/datadog` - Ingest Datadog alert webhooks
- `POST /api/webhooks/prometheus` - Ingest Prometheus Alertmanager webhooks
- `POST /api/webhooks/cloudwatch` - Ingest AWS CloudWatch alarm notifications
- `POST /api/webhooks/kubernetes` - Ingest Kubernetes event payloads

### Incident Management
- `GET /api/incidents` - List all incidents (with embedded timeline events)
- `GET /api/incidents/:id` - Fetch single incident details
- `POST /api/incidents` - Create an incident manually
- `PUT /api/incidents/:id` - Update incident status (Investigating, Mitigated, Resolved)

### Analytics
- `GET /api/analytics/summary` - Aggregate incident statistics, category breakdown, and time trends

### Health Check
- `GET /api/health` - Check backend server availability

---

## Running Verification Tests

The backend includes a dedicated unit and integration test suite:

```bash
cd backend

# Test Phase 1 Normalization
node src/test-telemetry.js

# Test Phase 2 Anomaly Detection Scoring
node src/test-anomaly-detector.js

# Test Phase 3 Taxonomy Classification
node src/test-incident-identifier.js

# Test Phase 4 Evidence Correlation & DAG
node src/test-evidence-correlator.js

# Test Phase 5 Gemini Reasoning & Guardrails
node src/test-ai-reasoning.js

# Test Complete End-to-End Pipeline
node src/test-webhook-e2e.js
```

---

## License

This project is licensed under the MIT License.
