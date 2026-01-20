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