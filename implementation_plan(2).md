# SentinelAI – Implementation Plan

This document outlines the implementation plan for building the SentinelAI prototype. SentinelAI is an AI-powered Incident Intelligence Platform designed to streamline incident management using LLMs, real-time dashboards, and automated root cause analysis.

## User Review Required

> [!IMPORTANT]
> Please review the refined architecture, specifically the new folder structure and expanded AI service layer, before we proceed with the execution phase.

## Open Questions

> [!WARNING]
> 1. **AI Integration**: Should we integrate a real LLM API (e.g., Gemini API) for processing unstructured incident data, or would you prefer to mock the AI responses for this prototype to ensure reliable demonstrations?
> 2. **Database Strategy**: Do you have a MongoDB Atlas connection string ready, or should we use a local MongoDB instance / in-memory database (like SQLite) for rapid prototyping?
> 3. **Speech-to-Text**: For the voice reporting feature, should we implement the native Browser Web Speech API for simplicity, or do you have a specific Whisper API endpoint you'd like to use?

## Proposed Architecture

### 1. Frontend (React + Vite + Tailwind CSS)
- **Framework:** React with Vite for fast builds and hot module replacement.
- **Styling:** Tailwind CSS for a premium, modern, dark-mode aesthetic with glassmorphism and smooth micro-animations.
- **State Management & Routing:** React Router for navigation and React Context for global state (auth, notifications).
- **Data Visualization:** Recharts for interactive incident trend graphs and severity distributions.
- **Real-time:** Socket.IO Client for instant dashboard updates.

### 2. Backend (Node.js + Express)
- **Framework:** Express.js for RESTful API endpoints.
- **Real-time Engine:** Socket.IO Server to broadcast new incidents and status updates to all connected dashboards.
- **Authentication:** JWT for secure access (Engineers, Incident Managers, Admins).
- **AI Service Layer:** A dedicated module with specific sub-services (detailed below) to interface with the LLM and orchestrate the AI workflow.

### 3. Database (MongoDB)
- **Mongoose ORM:** To define schemas for `Users`, `Incidents` (storing raw input and structured AI output), and `TimelineEvents`.

## Proposed Changes

### Setup and Infrastructure (Project Folder Structure)
Initialize a monorepo structure in the root directory:

```text
sentinel-ai/
├── frontend/           # Vite React application
│   ├── src/
│   │   ├── components/ # Reusable UI components (buttons, cards, inputs)
│   │   ├── pages/      # Route components (Dashboard, IncidentDetail, Login)
│   │   ├── services/   # API client and Socket.IO integration
│   │   ├── context/    # React context (Auth, Notifications)
│   │   └── assets/     # Images, icons, global CSS
├── backend/            # Node.js Express application
│   ├── src/
│   │   ├── controllers/# Route handlers (IncidentController, AuthController)
│   │   ├── routes/     # Express route definitions
│   │   ├── services/   # Business logic and AI services (detailed below)
│   │   ├── models/     # Mongoose schemas (Incident, User)
│   │   └── utils/      # Helper functions (JWT, error handling)
├── shared/             # Shared TypeScript types or common utilities (optional)
└── README.md           # Project documentation and setup instructions
```
- Configure `package.json` at the root for managing both workspaces concurrently.

### Backend Implementation (`/backend`)
- Setup Express server with basic middleware (CORS, JSON parsing).
- Configure MongoDB connection using Mongoose.
- Implement Authentication routes (Login/Register).
- Implement Incident API routes (Submit, List, Get Details, Update Status).
- Setup Socket.IO for real-time broadcasting.

**Expanded AI Service Layer (`backend/src/services/ai/`):**
Instead of a single AI module, we will implement focused services:
- `gemini.service.js`: Manages the direct communication with the Gemini API (or chosen LLM API), handling authentication, retries, and API specifics.
- `prompt.service.js`: Stores and constructs the specific AI prompts needed for extraction, Root Cause Analysis (RCA), Severity Scoring, and Business Impact Prediction.
- `incident.service.js`: Orchestrates the AI processing workflow when a new incident is reported, chaining together prompts, API calls, and DB updates.
- `parser.service.js`: Cleans and converts raw AI text responses into structured, validated JSON objects suitable for storing in the database and returning to the frontend.

### Frontend Implementation (`/frontend`)
- Scaffold Vite React app and configure Tailwind CSS.
- Build a premium UI layout (Sidebar, Header, glowing accents).
- Implement Authentication views (Login screen).
- Build the **Live Dashboard** using Recharts (Stats, active incidents list).
- Build the **Incident Submission Form** (Text area, simulated voice input button).
- Build the **Incident Detail View** (AI Summary, Timeline Visualization, Action Recommendations).
- Integrate Socket.IO to auto-refresh the dashboard when new incidents arrive.

## Verification Plan

### Automated Tests
- Run backend API integration tests for incident submission and retrieval.
- Verify JWT authentication flow.

### Manual Verification
1. **Submission Flow:** Submit a natural language incident report and verify it is processed into a structured JSON format.
2. **Real-time Updates:** Open the dashboard in two different browser windows; submit an incident in one and verify it instantly appears in the other.
3. **AI Capabilities:** Verify that the AI-generated Severity Score, Root Cause Analysis, and Business Impact predictions are displayed clearly in the UI.
4. **Visual Aesthetics:** Ensure the platform looks premium, responsive, and matches the "wow" factor expected of a modern AI tool.
