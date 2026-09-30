# SentinelAI & ShopDemo Suite

### Autonomous Telemetry Correlation, Incident Intelligence Platform & Production Chaos Simulator

**SentinelAI** is an incident intelligence platform designed to eliminate alert fatigue and accelerate Mean Time to Resolution (MTTR) across complex cloud infrastructure. It combines a deterministic telemetry correlation pipeline with an evidence-grounded Large Language Model (LLM) synthesis engine (Google Gemini 2.5 Flash) to provide explainable root-cause analysis, blast radius mapping, and verified remediation steps.

**ShopDemo** is a separate, simulated production e-commerce environment and DevOps chaos control plane. It continuously generates realistic, live traffic, baseline metrics, application logs, and service dependencies, and stream raw telemetry directly into SentinelAI's webhook adapters.

---

## High-Level Suite Architecture

```mermaid
graph TD
    subgraph SHOPDEMO ["SHOPDEMO (Simulated Production Environment - Port 5174 / 5100)"]
        UI["Customer Storefront UI<br/>(Browsing, Cart, Checkout)"]
        BE["Backend Microservices Kernel<br/>(API Gateway, Auth, Product, Order, Payment, DB)"]
        ENG["Chaos Simulator Engine<br/>(Baselines, Traffic Loop, 8 Chaos Scenarios)"]
        ADP["Telemetry Normalization Adapter"]
    end

    subgraph CHAOS ["DEV OPS CHAOS CONTROL PLANE"]
        CTRL["SentinelAI Chaos Control<br/>(Scenario Ingestion, Blind Test, Reset)"]
    end

    subgraph SENTINEL ["SENTINEL AI (Incident Intelligence Engine - Port 5173 / 5000)"]
        P1["Phase 1: Telemetry Normalization"]
        P2["Phase 2: Anomaly Scoring (0-100)"]
        P3["Phase 3: Multi-Signal Incident Taxonomy"]
        P4["Phase 4: Cross-Signal Correlation & Causal DAG"]
        P5["Phase 5: Gemini 2.5 Flash Grounded RCA"]
    end

    CTRL -->|Modifies State / Injects Failure| ENG
    ENG -->|Degrades API / Delays Responses| BE
    BE -->|Manifests Failure Behavior| UI
    ENG -->|Raw Metric Observations (No Ground Truth)| ADP
    ADP -->|Datadog / Prometheus / K8s Webhooks| P1
    P1 --> P2 --> P3 --> P4 --> P5
```

---

## Key Platform Features

### SentinelAI (Intelligence Engine)
- **Deterministic Ground Truth Engine (Phases 1-4):** Normalizes multi-source telemetry, computes bounded anomaly scores (0-100), classifies incident signatures against a 12-type taxonomy, and constructs causal DAGs separating origin from downstream symptoms.
- **Evidence-Grounded AI Synthesis (Phase 5):** Uses Gemini 2.5 Flash to synthesize structured evidence packages into human-readable engineering narratives, impact assessments, and remediation plans.
- **Multi-Source Webhook Adapters:** Native support for Datadog, Prometheus Alertmanager, AWS CloudWatch, and Kubernetes container events.
- **Operational Cockpit & Copilot:** Real-time Socket.IO dashboard with live KPI counters, incident trends, DAG visualization, and embedded AI copilot chat.

### ShopDemo (Production Simulator & Chaos Control)
- **7 Logical Microservices:** API Gateway, Auth Service, Product Service, Order Service, Payment Service, PostgreSQL Database, and Payment Processor API.
- **8 Progressive Chaos Scenarios:** Traffic Spike, Database Degradation, DB Connection Exhaustion, Payment Dependency Failure, Memory Leak, Deployment Regression, Container Failure, and High Error Rate.
- **Ground-Truth Isolation Contract:** ShopDemo NEVER sends internal scenario labels or `groundTruth` to SentinelAI. SentinelAI must independently infer root causes from raw observations.
- **Blind Incident Simulation Mode:** Test SentinelAI's autonomous reasoning against hidden chaos scenarios and reveal ground truth side-by-side.
- **Failure Visualization:** ShopDemo storefront experiences genuine performance degradation (slow loading, payment timeouts, 500 errors) when chaos is injected.

---

## Directory Structure

```
CODATHON/
├── README.md                           # Suite master documentation
├── SentinelAI_Comprehensive_...pdf     # Project PDF report
│
├── sentinel-ai/                        # SentinelAI Incident Intelligence Engine
│   ├── backend/                        # Express + MongoDB + Socket.IO + Gemini API
│   │   ├── src/
│   │   │   ├── controllers/            # Webhook, Incident, Analytics controllers
│   │   │   ├── models/                 # Mongoose schemas (Incident, TimelineEvent)
│   │   │   ├── routes/                 # REST & Webhook endpoints (/api/webhooks/...)
│   │   │   └── services/               # 5-Phase core pipeline logic & Gemini AI
│   │   └── package.json
│   └── frontend/                       # React 18 + Vite + Tailwind Operational Cockpit
│       ├── src/                        # Dashboard, IncidentDetail, Simulator
│       └── package.json
│
└── ShopDemo/                           # Simulated Production & Chaos Control
    ├── .gitignore                      # Dependency, build & log exclusions
    ├── README.md                       # ShopDemo dedicated documentation
    ├── backend/                        # Simulator Engine, Telemetry Adapter, Shop API
    │   ├── src/
    │   │   ├── services/               # simulatorEngine, telemetryAdapter, sentinelPublisher
    │   │   ├── routes/                 # shopRoutes, chaosRoutes, telemetryRoutes
    │   │   └── tests/                  # Automated verification test suite
    │   └── package.json
    └── frontend/                       # Customer Storefront & Chaos Control UI
        ├── src/
        │   ├── components/             # Navbar, ProductCard, CartModal, CheckoutModal
        │   ├── pages/                  # StorePage, ChaosControlPage
        │   └── context/                # StoreContext, ChaosContext
        └── package.json
```

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- MongoDB instance (local or Atlas URI for SentinelAI)
- (Optional) Google Gemini API Key (`GEMINI_API_KEY`) in `sentinel-ai/backend/.env`

---

### Installation & Launch Instructions

#### 1. Setup & Start SentinelAI
```bash
cd sentinel-ai
npm run install:all
npm run dev
```
- **SentinelAI Operational Cockpit:** `http://localhost:5173`
- **SentinelAI Backend API:** `http://localhost:5000`

#### 2. Setup & Start ShopDemo
```bash
cd ShopDemo
npm run install:all
npm run dev
```
- **ShopDemo Customer Storefront:** `http://localhost:5174`
- **SentinelAI Chaos Control Panel:** `http://localhost:5174/chaos`
- **ShopDemo Backend API:** `http://localhost:5100`

---

## How to Conduct a Blind Incident Demonstration

1. Start both **SentinelAI** and **ShopDemo**.
2. Navigate to **ShopDemo Chaos Control** (`http://localhost:5174/chaos`).
3. Click **`[ START BLIND INCIDENT TEST ]`**. A random scenario is selected internally, but the ground truth is hidden in the UI.
4. Open the **ShopDemo Storefront** (`http://localhost:5174`) to experience real application degradation (e.g. cart slowdown, checkout timeouts).
5. Open the **SentinelAI Cockpit** (`http://localhost:5173`) to view the real-time incident report, anomaly breakdown, causal DAG, and Gemini 2.5 Flash RCA.
6. Return to Chaos Control and click **`[ REVEAL GROUND TRUTH ]`** to compare the simulator's hidden ground truth against SentinelAI's autonomous diagnosis.
7. Click **`[ RESET ENVIRONMENT ]`** to return all services to baseline health.

---

## Automated Verification Test Suites

### SentinelAI Pipeline Tests
```bash
cd sentinel-ai/backend
node src/test-telemetry.js             # Phase 1 Normalization
node src/test-anomaly-detector.js      # Phase 2 Anomaly Scoring
node src/test-incident-identifier.js   # Phase 3 Taxonomy Classification
node src/test-evidence-correlator.js   # Phase 4 Causal DAG Correlation
node src/test-ai-reasoning.js          # Phase 5 Gemini Reasoning
node src/test-webhook-e2e.js           # Full End-to-End Pipeline
```

### ShopDemo Simulator & Isolation Tests
```bash
cd ShopDemo/backend
npm test                               # Verifies baselines, 8 chaos scenarios, & ground-truth isolation
```

---

## License

This project is licensed under the MIT License.
