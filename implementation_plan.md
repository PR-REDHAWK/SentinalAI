# SentinelAI – Implementation Plan

This document outlines the implementation plan for building the SentinelAI prototype. SentinelAI is an AI-powered Incident Intelligence Platform designed to streamline incident management using LLMs, real-time dashboards, and automated root cause analysis.

## User Review Required

> [!IMPORTANT]
> Please review the proposed architecture and answer the open questions before we proceed with the execution phase. This will help tailor the prototype to your specific environment and presentation needs for the ideathon.

## Open Questions

> [!WARNING]
> 1. **AI Integration**: Should we integrate a real LLM API (e.g., Gemini API) for processing unstructured incident data, or would you prefer to mock the AI responses for this prototype to ensure reliable demonstrations?
> 2. **Database Strategy**: Do you have a MongoDB Atlas connection string ready, or should we use a local MongoDB instance / in-memory database (like SQLite) for rapid prototyping?
> 3. **Repository Structure**: Should we organize the project as a monorepo (frontend and backend in separate folders within this directory) or do you prefer a specific structure?
> 4. **Speech-to-Text**: For the voice reporting feature, should we implement the native Browser Web Speech API for simplicity, or do you have a specific Whisper API endpoint you'd like to use?

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
- **AI Service Layer:** A dedicated module to interface with the LLM. It will handle prompts for structured extraction, Root Cause Analysis (RCA), Severity Scoring, and Business Impact Prediction.

### 3. Database (MongoDB)
- **Mongoose ORM:** To define schemas for `Users`, `Incidents` (storing raw input and structured AI output), and `TimelineEvents`.

## Proposed Changes

### Setup and Infrastructure
- Initialize a monorepo structure with `frontend/` and `backend/` directories.
- Configure `package.json` at the root for managing both workspaces concurrently.

### Backend Implementation (`/backend`)
- Setup Express server with basic middleware (CORS, JSON parsing).
- Configure MongoDB connection using Mongoose.
- Implement Authentication routes (Login/Register).
- Implement Incident API routes (Submit, List, Get Details, Update Status).
- Setup Socket.IO for real-time broadcasting.
- Develop AI processing mock/integration services for structuring incident data.

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
