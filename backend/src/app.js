import express from "express";
import cors from "cors";
import pipelineRoutes from "./routes/pipelineRoutes.js";
import executionRoutes from "./routes/executionRoutes.js";
import openaiRoutes from "./routes/openaiRoutes.js";
import { initJenkinsPolling } from "./services/jenkinsService.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pipeline", pipelineRoutes);
app.use("/api/executions", executionRoutes);
app.use("/api", openaiRoutes);
app.use("/api/settings", settingsRoutes);
console.log('✅ Settings routes mounted at /api/settings');

// Friendly API root to avoid default 404 on /api
app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "DCPVAS API",
    routes: [
      "/api/pipeline/latest",
      "/api/pipeline/history",
      "/api/pipeline/logs",
      "/api/pipeline/stages",
      "/api/executions",
    ],
  });
});

app.get("/", (req, res) => {
  res.json({ status: "DCPVAS backend running" });
});

export default app;
