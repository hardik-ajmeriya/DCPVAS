# DevOps CI/CD Pipeline Visualizer (DCPVAS)

![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-7.3.1-646CFF?logo=vite&logoColor=white) ![Tailwind%20CSS](https://img.shields.io/badge/Tailwind%20CSS-3.3.3-06B6D4?logo=tailwindcss&logoColor=white) ![Express](https://img.shields.io/badge/Express-4.18.2-000000?logo=express&logoColor=white) ![Mongoose](https://img.shields.io/badge/Mongoose-8.3.5-880000) ![OpenAI](https://img.shields.io/badge/OpenAI-6.16.0-74AA9C?logo=openai&logoColor=white)

DCPVAS is a MERN application that visualizes Jenkins CI/CD pipelines and produces evidence-based failure analysis from real Jenkins console logs. All analysis is generated in the backend using OpenAI Responses API (model: gpt-5-mini). No mock data is used.

## License
- Proprietary and not open-source. All Rights Reserved.
- Copyright © 2026 <Author Name>.
- No permission is granted to use, modify, distribute, or create derivative works from this codebase without prior written permission from the author.
- Third‑party dependencies are licensed by their respective authors; refer to their repositories for terms.

## Usage Restrictions
- Project ownership: created and owned by the author as a private, personal academic and research project.
- Shared solely for viewing and evaluation purposes.
- Cloning, copying, redistributing, or using this project for coursework, academic submission, or commercial activities is not permitted without prior written permission.

## Research & Academic Notice
- This repository forms part of ongoing academic research and learning work.
- Any reuse for research, publication, or coursework requires prior written permission from the author.
- If referencing ideas or findings, please cite appropriately and do not copy source code.

## Disclaimer
- Provided "as-is" without warranties of any kind, express or implied.
- The author assumes no liability for any misuse, derivative works, or outcomes resulting from viewing or evaluating this repository.

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
 - Real-time UI updates via Socket.IO (progress + completion) without polling.
 - User-configurable Jenkins integration via Settings (no hardcoded jobs).
 - Secure storage of Jenkins URL, job name, username, and API token (encrypted).

### Jenkins Integration (Save & Connect)
- Dynamic Jenkins pipeline configuration via Settings (Save & Connect).
- Backend-verified Jenkins connectivity before enabling pipeline views.
- Visual connection status in Navbar (green badge with job name).

## Backend APIs
- GET /api/pipeline/latest — Latest Jenkins build + AI analysis.
- GET /api/pipeline/history?limit=all|N — Recent builds.
- GET /api/pipeline/logs/:number — Cleaned console logs for a build.
- GET /api/pipeline/stages — Stages via wfapi or log-derived.
- GET /api/pipeline/build/:number — Specific build details + AI analysis.
- GET /api/pipeline/failures — Failure Intelligence Timeline.
- POST /api/pipeline/reanalyze/:number — Re-run AI analysis (emits Socket.IO progress).
- POST /api/pipeline/ai/analyze — Analyze pasted logs (emits Socket.IO progress).
- GET /api/health/openai — Env verification: `{ openaiKeyLoaded, model }`.
- GET /api/test/openai-text — Basic connectivity test (Responses API).
- GET /api/test/openai-json — Structured JSON test (Responses API).
- POST /api/test/analyze-log — Analyze pasted Jenkins logs; returns strict JSON.

### Settings APIs (Jenkins)
- POST /api/settings/jenkins — Save Jenkins settings `{ jenkinsUrl, jobName, username, apiToken }`.
- GET /api/settings/jenkins — Fetch saved settings (token omitted).
- POST /api/settings/jenkins/test — Verify connectivity using saved credentials.

## Jenkins Settings (Dynamic Configuration)
- Jenkins connection details are provided via a dedicated Settings module rather than hardcoded values.
- The backend validates connectivity using the Jenkins Remote Access API.
- Credentials are encrypted and stored in MongoDB, then decrypted server-side when needed.
- All pipeline APIs dynamically use the saved configuration (`jenkins_settings`).
- The frontend never connects to Jenkins directly; all access is mediated by the backend.

## Jenkins Test Pipeline (Validation)
- A controlled Jenkins Pipeline script is used to generate real CI/CD failures.
- Pipeline includes stages: Checkout, Build, Unit Test, Docker Build, Deploy.
- Unit Test stage intentionally fails using an AssertionError.
- Downstream stages are skipped to mimic real production behavior.
- Logs are consumed by backend and analyzed by AI.

```groovy
// Defined directly in Jenkins (scripted pipeline)
// Purpose: test AI log analysis and execution history
```
## Analysis Approach
- Strict, log-driven signals (e.g., AssertionError → UNIT_TEST_FAILURE).
- Backend-only OpenAI analysis using Responses API (model: gpt-5-mini).
- No temperature or chat-completions used.


## How Data Flows (Live Mode)
Jenkins connectivity is validated via the Settings module before any pipeline data is fetched.
1. Jenkins runs pipelines (this app never triggers builds).
2. Backend `jenkinsService` loads Jenkins configuration from MongoDB (`jenkins_settings`), decrypts credentials server-side, then polls Jenkins Remote Access API.
3. Latest build and logs are cached; new builds trigger `build:new` Socket.IO events.
4. Logs are sanitized server-side; OpenAI analysis runs strictly on provided text.
5. Frontend uses Socket.IO to render progress in real time; REST remains for initial data.

## Why Settings-Based Jenkins Integration
- Scalability: change Jenkins URL/job/token without code changes or redeploys.
- Reusability: consistent configuration across environments and teams.
- DevOps relevance: separates secrets from application code, enables rotation and auditing.

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
   - Encryption: `SECRET_KEY` (used to encrypt Jenkins API token)
   - Set OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5-mini`
   - MongoDB: `MONGODB_URI=mongodb://127.0.0.1:27017/dcpvas`
   - Frontend (optional): `VITE_API_BASE_URL=http://localhost:4000/api`, `VITE_SOCKET_URL=http://localhost:4000`
3. Run servers:
   - Backend: `npm run dev` in `backend/` (default port 4000)
   - Frontend: `npm run dev` in `frontend/` (port 5173)
4. Save Jenkins settings via POST `/api/settings/jenkins`.
5. Frontend connects to Socket.IO for real-time analysis events.

## Configuration
- See `backend/.env.example` for environment variables (Jenkins, OpenAI, MongoDB).
 - Jenkins credentials are stored in MongoDB (`jenkins_settings`) encrypted via `SECRET_KEY` and loaded server-side.

## Project Structure
See the repository for the mandated monorepo structure under `dcpvas/` with `backend/` and `frontend/` folders.

## Postman Verification
1. Health: `GET /api/health/openai` → `{ openaiKeyLoaded, model }`
2. Basic Text: `GET /api/test/openai-text` → `{ reply }`
3. Structured JSON: `GET /api/test/openai-json` → `{ humanSummary, suggestedFix, technicalRecommendation }`
4. Real Log Analysis: `POST /api/test/analyze-log` with body `{ log: "<console log>" }` →
   `{ humanSummary, suggestedFix, technicalRecommendation, failedStage, detectedError }`

- Jenkins test pipeline can be triggered manually from Jenkins UI.
- DCPVAS reflects new builds automatically after successful connection.



## Real-Time Events (Socket.IO)
- `analysis:progress` — `{ buildNumber, status: 'ANALYSIS_IN_PROGRESS', stage, message }`
   - Stages: `FETCHING_LOGS` → `FILTERING_ERRORS` → `AI_ANALYZING` → `STORING_RESULTS` → `COMPLETED`
- `analysis:complete` — `{ buildNumber, status: 'READY', humanSummary, suggestedFix, technicalRecommendation, confidenceScore }`
- `build:new` — `{ jobName, buildNumber }`

Frontend subscribes using `socket.io-client` (see `frontend/src/services/socket.js`).

## AI Analysis Completion Handling (Auto-Refresh Strategy)

To ensure a consistent, production-grade user experience, the application performs a single controlled auto-refresh once AI analysis has fully completed and the final output is persisted. This strategy guarantees that the UI reflects the definitive analysis results without relying on manual page reloads.

### Why auto-refresh is required
- Asynchronous Jenkins logs: Console output is ingested incrementally and finalized server-side.
- Long-running AI analysis: The backend performs analysis after a pipeline failure and persists results when complete.
- Frontend state synchronization: Under concurrent timing, the UI may occasionally miss the final state transition; a deterministic refresh removes this edge.

### How the auto-refresh works
- Backend emits `analysis:completed` after persisting the final AI output.
- Frontend listens via Socket.IO and, upon receiving `analysis:completed`, triggers a one-time page refresh.
- A `sessionStorage` flag prevents any reload loop and is cleared on app startup.
- The refresh occurs only after the backend has saved the final results; REST endpoints then return `finalResult` immediately.

### Benefits of this approach
- Eliminates manual refresh for end users.
- Guarantees final AI results are visible promptly.
- Improves UX consistency across varying network and browser conditions.
- Aligns with real-world CI/CD dashboards that reconcile final states deterministically.

### Safety considerations
- Reload happens exactly once per completed analysis.
- No impact during in-progress analysis; refresh is deferred until completion.
- Loop prevention via `sessionStorage`; no infinite refresh behavior.
- Operates only after final AI output is stored server-side.