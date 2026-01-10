# DevOps CI/CD Pipeline Visualizer (DCPVAS)

DCPVAS is a MERN application that visualizes Jenkins CI/CD pipelines and produces evidence-based failure analysis from real Jenkins console logs. All analysis is generated in the backend using OpenAI Responses API (model: gpt-5-mini). No mock data is used.

## Mode
- Live Only: Uses Jenkins Remote API (read-only) via backend polling. Frontend never calls Jenkins directly.

## Features
- Live Jenkins monitoring via backend polling (Basic Auth, read-only).
- Cleaned console logs (ANSI/control sequences removed) for clarity.
- Failure Intelligence Timeline focused on developer decision-making.
- Failure Analysis per build:
   - humanSummary, suggestedFix, technicalRecommendation
   - failedStage, detectedError (e.g., UNIT_TEST_FAILURE on AssertionError)
- Tabs: Dashboard, Pipelines, Execution History, AI Insights, Settings.

## Backend APIs
- GET /api/pipeline/latest — Latest Jenkins build + AI analysis.
- GET /api/pipeline/history?limit=all|N — Recent builds.
- GET /api/pipeline/logs — Cleaned console logs + tail lines.
- GET /api/pipeline/stages — Stages via wfapi or log-derived.
- GET /api/pipeline/build/:number — Specific build details + AI analysis.
- GET /api/pipeline/failures — Failure Intelligence Timeline.
- GET /api/health/openai — Env verification: `{ openaiKeyLoaded, model }`.
- GET /api/test/openai-text — Basic connectivity test (Responses API).
- GET /api/test/openai-json — Structured JSON test (Responses API).
- POST /api/test/analyze-log — Analyze pasted Jenkins logs; returns strict JSON.
## Analysis Approach
- Strict, log-driven signals (e.g., AssertionError → UNIT_TEST_FAILURE).
- Backend-only OpenAI analysis using Responses API (model: gpt-5-mini).
- No temperature or chat-completions used.


## How Data Flows (Live Mode)
1. Jenkins runs pipelines (this app never triggers builds).
2. Backend `jenkinsService` polls Jenkins Remote API using Basic Auth (user + token).
3. Console logs and build metadata are cached in memory for near real-time updates.
4. Logs are sanitized server-side; OpenAI analysis runs strictly on provided text.
5. Frontend polls backend endpoints and renders dashboards and timelines.

## Disclaimers
- AI analysis is grounded in logs but should be reviewed; treat as guidance.
- Credentials are stored only in backend environment variables; never exposed to the frontend.
- Jenkins executes pipelines; DCPVAS reads and analyzes output.

## Getting Started
1. Install dependencies:
   - Backend: `npm install` in `backend/`
   - Frontend: `npm install` in `frontend/`
2. Configure environment:
   - Copy `backend/.env.example` → `backend/.env`
   - Set Jenkins: `JENKINS_URL`, `JENKINS_JOB`, `JENKINS_USER`, `JENKINS_TOKEN`
   - Set OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5-mini`
   - MongoDB: `MONGODB_URI=mongodb://127.0.0.1:27017/dcpvas`
3. Run servers:
   - Backend: `npm run dev` in `backend/` (default port 4000)
   - Frontend: `npm run dev` in `frontend/` (port 5173)
4. Frontend polls the backend at http://localhost:4000/api.

## Configuration
- See `backend/.env.example` for environment variables (Jenkins, OpenAI, MongoDB).

## Project Structure
See the repository for the mandated monorepo structure under `dcpvas/` with `backend/` and `frontend/` folders.

## Postman Verification
1. Health: `GET /api/health/openai` → `{ openaiKeyLoaded, model }`
2. Basic Text: `GET /api/test/openai-text` → `{ reply }`
3. Structured JSON: `GET /api/test/openai-json` → `{ humanSummary, suggestedFix, technicalRecommendation }`
4. Real Log Analysis: `POST /api/test/analyze-log` with body `{ log: "<console log>" }` →
   `{ humanSummary, suggestedFix, technicalRecommendation, failedStage, detectedError }`
