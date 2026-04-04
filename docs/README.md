# DCPVAS — DevOps CI/CD Pipeline Visualizer & AI Analysis System

![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-3.3.3-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18.2-000000?logo=express&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-8.3.5-880000)
![OpenAI](https://img.shields.io/badge/OpenAI-6.16.0-74AA9C?logo=openai&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red)

> **DCPVAS** is a full-stack MERN application that visualizes Jenkins CI/CD pipelines in real time and delivers evidence-based failure analysis powered by OpenAI. Built with a modern dark SaaS interface inspired by GitHub, Vercel, and Datadog — all analysis runs server-side against real Jenkins console logs with zero mock data.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Feature Highlights](#feature-highlights)
5. [Project Structure](#project-structure)
6. [Backend API Reference](#backend-api-reference)
7. [Real-Time Events (Socket.IO)](#real-time-events-socketio)
8. [AI Analysis Pipeline](#ai-analysis-pipeline)
9. [Data Flow](#data-flow)
10. [Configuration](#configuration)
11. [Getting Started](#getting-started)
12. [API Verification (Postman)](#api-verification-postman)
13. [Known Behaviors & Guardrails](#known-behaviors--guardrails)
14. [Screenshots](#screenshots)
15. [Roadmap](#roadmap)
16. [License](#license)

---

## Overview

DCPVAS monitors Jenkins CI/CD pipelines passively (read-only), streams live build logs to the frontend, and runs AI-powered failure analysis on every failed build. The system never triggers Jenkins builds — it only observes, analyzes, and surfaces insights.

### Core Capabilities

| Capability | Description |
|---|---|
| Live Pipeline Monitoring | Backend polls Jenkins Remote API and streams log chunks to connected clients via Socket.IO |
| AI Failure Analysis | OpenAI `gpt-5-mini` (Responses API) analyzes sanitized Jenkins console logs and returns structured JSON insights |
| Real-Time Events | Socket.IO drives progress updates, build lifecycle events, and log streaming without polling from the frontend |
| Secure Credential Management | Jenkins API token is encrypted at rest in MongoDB; the frontend never receives credentials |
| Multi-Dashboard Interface | Dashboard, Pipelines, Execution History, AI Insights, Logs Workspace, and Settings views |
| Dark SaaS Landing Page | Separate Vite/Tailwind v4 marketing site with a 3D animated hero background |

---

## Architecture

```
Jenkins CI Server
      │
      │  REST API (read-only polling)
      ▼
┌─────────────────────────────────────────┐
│           Backend  (Node / Express)      │
│  ┌─────────────┐   ┌──────────────────┐ │
│  │jenkinsService│   │  OpenAI Responses│ │
│  │  (polling)  │──▶│  API (gpt-5-mini)│ │
│  └──────┬──────┘   └────────┬─────────┘ │
│         │ Socket.IO events  │ AI JSON    │
│         ▼                   ▼           │
│       MongoDB  ◀─── PipelineAIAnalysis  │
│  (builds, analyses, jenkins_settings)   │
└────────────────┬────────────────────────┘
                 │  REST + Socket.IO + SSE
                 ▼
┌─────────────────────────────────────────┐
│        Frontend  (React / Vite)          │
│  React Query (REST) + Socket.IO client  │
│  Dashboard │ Pipelines │ AI Insights    │
│  Executions │ Logs Workspace │ Settings │
└─────────────────────────────────────────┘
```

**Communication protocols used:**

| Protocol | Purpose |
|---|---|
| REST (HTTP) | Initial data fetches, settings management, health checks |
| Socket.IO (WebSocket) | Live build events, analysis progress, log streaming |
| SSE (`/api/pipeline/stream`) | Stage flow polling until pipeline completion |

---

## Tech Stack

### Backend

| Package | Version | Role |
|---|---|---|
| Node.js + Express | 4.18.2 | HTTP server and REST API |
| Socket.IO | — | Real-time bidirectional events |
| Mongoose | 8.3.5 | MongoDB ODM |
| OpenAI SDK | 6.16.0 | AI failure analysis (Responses API) |
| crypto (built-in) | — | API token encryption via `SECRET_KEY` |

### Frontend

| Package | Version | Role |
|---|---|---|
| React | 18.2.0 | UI framework |
| Vite | 7.3.1 | Build tool and dev server |
| Tailwind CSS | 3.3.3 | Utility-first styling |
| Recharts | — | Charts and data visualizations |
| React Query | — | Server state and caching |
| Socket.IO Client | — | Real-time event subscription |
| Framer Motion | — | Animations and transitions |
| Heroicons / Lucide | — | Icon libraries |

### Landing App

| Package | Role |
|---|---|
| Vite + Tailwind CSS v4 | Build and design tokens via `@theme` in `index.css` |
| @react-three/fiber + @react-three/drei | 3D animated hero background |

---

## Feature Highlights

### AI Insights Dashboard
Renders aggregated AI data across all builds:
- **Pipeline Stability Score** — Weighted success/failure ratio
- **Most Failing Stage** — Derived from `failedStage` across history
- **Failure Trend (Last 7 Days)** — Time-series chart via Recharts
- **Stage Reliability** — Per-stage success rate table
- **AI Suggested Fixes** — Deduplicated `immediateActions[]` across recent failures
- **AI Summary Cards** — `humanSummary.overview` per build

### Logs + AI Analysis Workspace *(April 2026)*
Three-column dedicated `/logs` page:
- **Build History List** — Filterable build selector with status indicators
- **Live Log Viewer** — Streams `build:log_update` chunks in real time
- **AI Analysis Panel** — Structured "debugging assistant" with TL;DR summary, Quick Fix (copy-to-clipboard), collapsible deep-dive sections, and a color-coded confidence bar

### Pipeline Visualization
Interactive depiction of pipeline stages (Checkout → Build → Unit Test → Docker Build → Deploy) via `PipelineFlow` component backed by `/api/pipeline/latest-flow`.

### Security Posture
- Jenkins credentials stored only in MongoDB (`jenkins_settings` collection), encrypted with `SECRET_KEY`
- Frontend never receives or stores API tokens
- Backend decrypts token at runtime for each Jenkins request

### Landing Experience
- Tailwind v4 design tokens in `landing/src/index.css` (`bg`, `surface`, `primary #7C5CFF`, `accent #00E5FF`, `muted`, `border`)
- 3D hero: floating cubes, fog, pointer-events disabled, scroll-based one-way animation (zoom, z-shift, fade-out)

---

## Project Structure

```
dcpvas/
├── backend/
│   ├── .env                     # Environment variables (see Configuration)
│   ├── src/
│   │   ├── routes/              # Express route handlers
│   │   ├── services/
│   │   │   ├── jenkinsService.js    # Polling, log fetching, stage recovery
│   │   │   ├── openaiService.js     # Responses API calls, JSON schema enforcement
│   │   │   └── cryptoService.js     # AES encryption for API tokens
│   │   ├── models/
│   │   │   ├── PipelineAIAnalysis.js
│   │   │   ├── PipelineExecution.js
│   │   │   └── JenkinsSettings.js
│   │   └── sockets/             # Socket.IO event emitters
│   └── package.json
├── frontend/
│   ├── .env                     # VITE_API_BASE_URL, VITE_SOCKET_URL
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Pipelines.jsx
│   │   │   ├── ExecutionHistory.jsx
│   │   │   ├── AIInsights.jsx
│   │   │   ├── Logs.jsx
│   │   │   └── Settings.jsx
│   │   └── components/
│   │       ├── PipelineFlow.jsx     # Stage visualization
│   │       ├── Navbar.jsx           # Connection badge
│   │       └── ...
│   └── package.json
├── landing/
│   ├── src/
│   │   ├── index.css            # Tailwind v4 @theme tokens
│   │   ├── App.jsx
│   │   └── components/
│   │       └── HeroBackground3D.jsx
│   └── package.json
└── README.md
```

---

## Backend API Reference

### Pipeline Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pipeline/latest` | Latest build with AI analysis (stage recovery fallback) |
| `GET` | `/api/pipeline/latest-flow` | Normalized stage flow object for `PipelineFlow` component |
| `GET` | `/api/pipeline/stream` | SSE stream of stage flow (3 s poll) until build completion |
| `GET` | `/api/pipeline/history?limit=all\|N` | Recent builds with AI summaries |
| `GET` | `/api/pipeline/logs/:number` | Sanitized console logs (placeholder for pre-execution failures) |
| `GET` | `/api/pipeline/stages` | Latest stages with recovery |
| `GET` | `/api/pipeline/build/:number` | Single build with full AI details |
| `GET` | `/api/pipeline/analysis/:number` | Latest persisted AI analysis document |
| `GET` | `/api/pipeline/diagnostics` | Jenkins env flags and `liveEnabled` status |
| `GET` | `/api/pipeline/failures` | Failure Intelligence timeline (aggregated `failedStage` + `detectedError`) |
| `POST` | `/api/pipeline/ai/analyze` | Analyze pasted logs; emits `analysis:progress` + `analysis:complete` |
| `POST` | `/api/pipeline/reanalyze/:number` | Re-run AI analysis for a specific build number |

### Executions Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/executions` | List executions (`job`, `buildNumber`, `status`, `failedStage`, `executedAt`) |
| `GET` | `/api/executions/:id` | Execution document by MongoDB `_id` |

### Dashboard Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/metrics` | Summary metrics (total builds, success rate, avg duration) |

### Settings Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/settings/jenkins` | Save `{ jenkinsUrl, jobName, username, apiToken }` (token encrypted at rest) |
| `GET` | `/api/settings/jenkins` | Fetch saved settings (API token field omitted from response) |
| `POST` | `/api/settings/jenkins/test` | Verify connectivity; marks `isConnected` and `lastVerifiedAt` |

### Health & Test Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health/openai` | Returns `{ openaiKeyLoaded, model }` |
| `GET` | `/api/test/openai-text` | Text response sanity check; returns `{ reply }` |
| `GET` | `/api/test/openai-json` | Structured JSON test via Responses API |
| `POST` | `/api/test/analyze-log` | Analyze provided log string; body: `{ log: "<console log>" }` |

---

## Real-Time Events (Socket.IO)

### Emitted by Server → Received by Frontend

| Event | Payload | Description |
|---|---|---|
| `analysis:progress` | `{ buildNumber, status, stage, message }` | Step-by-step progress through analysis pipeline |
| `analysis:complete` | `{ buildNumber, status, humanSummary, suggestedFix, technicalRecommendation, confidenceScore }` | Analysis fully completed and persisted |
| `analysis:completed` | *(same as above)* | Alias emitted alongside `analysis:complete` |
| `analysis:skipped` | `{ buildNumber }` | Build was SUCCESS; analysis not required |
| `build:new` | `{ jobName, buildNumber, status\|buildStatus }` | New build number detected in Jenkins |
| `build:started` | `{ buildNumber }` | Build has begun execution |
| `build:log_update` | `{ buildNumber, newLogsChunk }` | Incremental console log chunk |

### Analysis Progress Stages

```
FETCHING_LOGS → FILTERING_ERRORS → AI_ANALYZING → STORING_RESULTS → COMPLETED
```

### Client → Server

| Message | Description |
|---|---|
| `logs:watch` | Request backend to start watching logs for a given build number |

---

## AI Analysis Pipeline

### Model & API
- **Model:** `gpt-5-mini` via OpenAI Responses API (fixed in code)
- **Output:** Strict JSON schema enforced at the API level

### Output Schema

```jsonc
{
  "failedStage": "string",           // e.g. "Unit Test"
  "detectedError": "string",         // e.g. "AssertionError: expected 200 but got 500"
  "confidenceScore": 0.0–1.0,
  "humanSummary": {
    "overview": "string",
    "failureCause": ["string"],
    "pipelineImpact": ["string"]
  },
  "suggestedFix": {
    "immediateActions": ["string"],
    "debuggingSteps": ["string"],
    "verification": ["string"]
  },
  "technicalRecommendation": {
    "codeLevelActions": ["string"],
    "pipelineImprovements": ["string"],
    "preventionStrategies": ["string"]
  }
}
```

### Analysis Rules

| Rule | Detail |
|---|---|
| Trigger condition | Only failed builds; successful builds emit `analysis:skipped` |
| Quota protection | Audit records on `PipelineAIAnalysis` prevent re-triggering duplicate analyses |
| Log sanitization | ANSI escape codes and control characters removed before submission |
| Pre-execution failures | Returns a placeholder message when the Jenkinsfile fails before runtime logs exist |

---

## Data Flow

```
1. Jenkins executes pipeline autonomously (app never triggers builds)
        │
        ▼
2. backend/jenkinsService loads config from MongoDB (decrypts token),
   polls Remote API, caches latest build / logs / stages
        │
        ├──▶ New build detected → emit  build:new
        └──▶ Build running     → emit  build:log_update  (chunked)
        │
        ▼
3. Logs sanitized (ANSI stripped, decoded)
        │
        ▼
4. OpenAI Responses API analyzes logs → strict JSON result
   Progress emitted via Socket.IO:
   FETCHING_LOGS → FILTERING_ERRORS → AI_ANALYZING → STORING_RESULTS → COMPLETED
        │
        ▼
5. AI document persisted to MongoDB (PipelineAIAnalysis)
        │
        ▼
6. Frontend receives analysis:complete via Socket.IO
   → renders structured insights without manual refresh
```

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | Express server port |
| `MONGODB_URI` | Yes | `mongodb://127.0.0.1:27017/dcpvas` | MongoDB connection string |
| `SECRET_KEY` | Yes | — | AES key for Jenkins API token encryption |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-5-mini` | Fixed in code; env for diagnostics only |
| `JENKINS_URL` | No | — | Legacy env var (diagnostics compatibility) |
| `JENKINS_JOB` | No | — | Legacy env var (diagnostics compatibility) |
| `JENKINS_USER` | No | — | Legacy env var (diagnostics compatibility) |
| `JENKINS_TOKEN` | No | — | Legacy env var (diagnostics compatibility) |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:4000/api` | Must include `/api` suffix |
| `VITE_SOCKET_URL` | `http://localhost:4000` | Socket.IO server root (no `/api`) |

> ⚠️ **URL Alignment:** The frontend base URL must include `/api`. Omitting it causes route mismatches across all API calls.

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)
- A running Jenkins instance with a configured job
- OpenAI API key

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd dcpvas

# 2. Install dependencies for each app
cd backend  && npm install
cd ../frontend && npm install
cd ../landing  && npm install
```

### Environment Setup

```bash
# Copy the example env file and fill in values
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your MongoDB URI, OpenAI key, and a strong `SECRET_KEY`.

### Running the Apps

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev

# Terminal 3 — Landing marketing site
cd landing
npm run dev
```

### Connect Jenkins

After the backend is running, configure your Jenkins connection via the **Settings** page in the frontend, or directly via the API:

```bash
# Save Jenkins credentials
curl -X POST http://localhost:4000/api/settings/jenkins \
  -H "Content-Type: application/json" \
  -d '{ "jenkinsUrl": "http://your-jenkins:8080", "jobName": "my-pipeline", "username": "admin", "apiToken": "your-token" }'

# Test connectivity
curl -X POST http://localhost:4000/api/settings/jenkins/test
```

---

## API Verification (Postman)

Run these requests in order to verify the full system is operational:

| Step | Method | Endpoint | Expected Response |
|---|---|---|---|
| 1 | `GET` | `/api/health/openai` | `{ openaiKeyLoaded: true, model: "gpt-5-mini" }` |
| 2 | `GET` | `/api/test/openai-text` | `{ reply: "..." }` |
| 3 | `GET` | `/api/test/openai-json` | `{ humanSummary, suggestedFix, technicalRecommendation }` |
| 4 | `POST` | `/api/test/analyze-log` + `{ log: "..." }` | Full AI schema output |
| 5 | `GET` | `/api/pipeline/latest` | Latest build with AI analysis |
| 6 | `GET` | `/api/pipeline/latest-flow` | Normalized stage flow object |
| 7 | `GET` | `/api/pipeline/history` | Array of recent builds |
| 8 | `GET` | `/api/pipeline/failures` | Failure Intelligence timeline |
| 9 | `POST` | `/api/settings/jenkins/test` | `{ isConnected: true }` |

---

## Known Behaviors & Guardrails

| Behavior | Explanation |
|---|---|
| Temporary 404 on new builds | Expected during Jenkins build initialization; frontend treats as "not ready" and retries |
| `analysis:skipped` on success | AI analysis is intentionally skipped for successful builds to conserve OpenAI quota |
| Placeholder log message | Returned when the Jenkinsfile fails before execution begins and no runtime logs exist |
| Frontend URL must include `/api` | `VITE_API_BASE_URL` must end with `/api`; omitting it breaks all route mappings |
| Re-analysis prevention | Audit records on `PipelineAIAnalysis` block re-triggering analysis for the same build |

---

## Screenshots

Place screenshot files in `screenshots/` and they will render here.

| View | File Path |
|---|---|
| Dashboard Overview | `screenshots/dashboard.png` |
| Pipeline Flow | `screenshots/pipeline-flow.png` |
| AI Insights | `screenshots/ai-insights.png` |
| Failure Analysis | `screenshots/failure-analysis.png` |
| Logs Workspace | `screenshots/logs.png` |
| Execution Details | `screenshots/execution-details.png` |
| Settings | `screenshots/settings.png` |

![Dashboard Overview](./screenshots/dashboard.png)

---

## Roadmap

| Priority | Feature |
|---|---|
| High | Predictive failure detection and anomaly alerts |
| High | Slack / Microsoft Teams notifications |
| Medium | Pipeline performance analytics and MTTR tracking |
| Medium | AI-powered log clustering and grouped root cause analysis |
| Low | Multi-project analytics across Jenkins jobs |
| Low | Role-based access control (RBAC) |

---

## Changelog

### April 2026
- **Logs + AI Analysis Workspace** — Added a dedicated `/logs` page with a three-column layout backed by `/api/pipeline/history`, `/api/pipeline/logs/:number`, and `/api/pipeline/build/:number`.
- **Smart Debugging UI** — Converted raw AI JSON into a structured debugging assistant: TL;DR summary, Quick Fix with copy-to-clipboard, collapsible deep-dive sections, and color-coded confidence bar.
- **Premium SaaS Styling** — Glassmorphism cards, subtle glows, hover/active transitions, and thin global scrollbars matching Linear/GitHub/Vercel aesthetics.
- **Single-Scroll Layout** — Fixed navbar and sidebar with an isolated scrolling content area; eliminates double scrollbars and stabilizes the Logs workspace.

---

## License

**Proprietary — All Rights Reserved.**

Copyright © 2026 `Mr.Hardik Ajmeriya`.

- No permission is granted to use, modify, distribute, or create derivative works from this codebase without prior written permission from the author.
- Shared solely for viewing and evaluation purposes. Cloning, copying, redistributing, or using for coursework, academic submission, or commercial activities is strictly prohibited without prior written permission.
- Third-party dependencies retain their respective licenses; refer to their repositories for terms.
- Provided "as-is" without warranties. The author assumes no liability for misuse or derivative works.
- Research notice: any reuse for research, publication, or coursework requires prior written permission. Ideas may be cited appropriately; source code must not be copied.