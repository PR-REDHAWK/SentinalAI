# ShopDemo

### Simulated Production Environment & SentinelAI Chaos Control

ShopDemo is a simulated high-throughput e-commerce production application and DevOps chaos control plane built to continuously generate realistic telemetry observations and stream them directly into **SentinelAI** for autonomous incident correlation and root-cause analysis.

---

## Architecture Overview

```mermaid
graph TD
    subgraph SHOPDEMO ["SHOPDEMO (Simulated Production Environment)"]
        UI["Storefront UI & User Actions<br/>(Browsing, Cart, Checkout)"]
        BE["Backend Microservices Kernel<br/>(API Gateway, Auth, Product, Order, Payment)"]
        ENG["Simulator Engine<br/>(Baselines, Traffic Loop, 8 Chaos Scenarios)"]
        ADP["Telemetry Normalization Adapter"]
    end

    subgraph CHAOS ["SENTINEL AI CHAOS CONTROL"]
        CTRL["Chaos Control Panel<br/>(Scenario Ingestion, Blind Test, Reset)"]
    end

    subgraph SENTINEL ["SENTINEL AI (Incident Intelligence Engine)"]
        P1["Phase 1: Telemetry Normalization"]
        P2["Phase 2: Anomaly Scoring"]
        P3["Phase 3: Incident Identification"]
        P4["Phase 4: Causal DAG Evidence"]
        P5["Phase 5: Gemini 2.5 Flash RCA"]
    end

    CTRL -->|Modifies State / Injects Failure| ENG
    ENG -->|Updates Metrics & Degrades API| BE
    BE -->|Real User Experience Impact| UI
    ENG -->|Raw Observations (No Ground Truth)| ADP
    ADP -->|Webhook Payload (Datadog/Prometheus/K8s)| P1
    P1 --> P2 --> P3 --> P4 --> P5
```

---

## Crucial Architectural Guarantees

1. **Ground-Truth Isolation:** ShopDemo NEVER sends `groundTruth`, scenario names, or internal labels to SentinelAI. SentinelAI receives only raw metric observations, latencies, error rates, logs, and dependency health.
2. **Failure Visualization:** Chaos scenarios directly affect ShopDemo's application behavior—causing slow product loading, checkout timeouts, or 500 errors when users interact with the site.
3. **Reversibility:** The `[RESET ENVIRONMENT]` button instantly restores baseline health across all 7 logical microservices.
4. **Blind Incident Evaluation Mode:** Operators can run blind incident tests where the scenario is hidden (`groundTruth` isolated), allowing comparison between Ground Truth and SentinelAI's autonomous RCA diagnosis.

---

## Logical Microservices Topology

1. **API Gateway:** Entrypoint handling route dispatching & rate limits.
2. **Auth Service:** User session validation & JWT authentication.
3. **Product Service:** Product catalog & inventory lookups.
4. **Order Service:** Cart management & order state persistence.
5. **Payment Service:** Internal payment routing logic.
6. **Database (PostgreSQL):** Primary relational data store.
7. **Payment Processor API:** Third-party payment gateway.

---

## 8 Progressive Chaos Scenarios

| Scenario | Primary Symptom | Target Evidence Pattern |
| :--- | :--- | :--- |
| **Traffic Spike** | Traffic 150 -> 1200 req/s | Traffic overload, CPU saturation, queue depth surge |
| **Database Degradation** | DB Latency 30ms -> 850ms | High query latency p99, connection lock timeouts |
| **DB Connection Exhaustion** | Pool active 40 -> 100/100 | Connection acquisition timeout, 503 errors |
| **Payment Dependency Failure** | External API latency 150ms -> 1200ms | Downstream dependency timeout (CPU & traffic normal) |
| **Memory Leak** | RAM usage 45% -> 96% | JVM GC pause, eventual container OOMKilled restart |
| **Deployment Regression** | Deployment event `v2.14.0` | Post-deployment error spike & latency shift |
| **Container Failure** | Pod replicas drop 3 -> 1 | CrashLoopBackOff events, load redistribution |
| **High Error Rate** | Application 5xx 0.2% -> 14% | Elevated HTTP 500 errors with healthy infrastructure |

---

## Quick Start & Installation

### 1. Install Dependencies
```bash
cd ShopDemo
npm run install:all
```

### 2. Run ShopDemo Development Servers
```bash
npm run dev
```

- **Storefront Application:** `http://localhost:5174`
- **Chaos Control Panel:** `http://localhost:5174/chaos`
- **ShopDemo Backend:** `http://localhost:5100`

---

## How to Perform a Blind Incident Test

1. Start SentinelAI (`cd sentinel-ai && npm run dev`).
2. Start ShopDemo (`cd ShopDemo && npm run dev`).
3. Open Chaos Control at `http://localhost:5174/chaos`.
4. Click **[ START BLIND INCIDENT TEST ]**.
5. Observe ShopDemo degrading naturally and sending raw telemetry to SentinelAI.
6. Open SentinelAI Dashboard (`http://localhost:5173`) to view the newly created incident, anomaly report, and Gemini 2.5 Flash RCA synthesis.
7. Click **[ REVEAL GROUND TRUTH ]** in Chaos Control to compare the simulator's hidden ground truth against SentinelAI's autonomous diagnosis!
8. Click **[ RESET ENVIRONMENT ]** to return everything to baseline.
