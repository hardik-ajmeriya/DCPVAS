import express from "express";
import cors from "cors";
import corsOptions from "./config/cors.js";
import requestLogger from "./middleware/requestLogger.js";
import applySecurity from "./middleware/security.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import pipelineRoutes from "./routes/pipelineRoutes.js";
import executionRoutes from "./routes/executionRoutes.js";
import openaiRoutes from "./routes/openaiRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import insightsRoutes from "./routes/insightsRoutes.js";

const app = express();

// CORS – allow known frontend origins and handle credentials + preflight
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Core security & performance middleware
applySecurity(app);

// HTTP request logging
app.use(requestLogger);

// Parse JSON/urlencoded bodies before hitting any routes
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// API routes
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/executions", executionRoutes);
app.use("/api", openaiRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/insights", insightsRoutes);
console.log("Settings routes mounted at /api/settings");

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
      "/api/insights",
    ],
  });
});

app.get("/", (req, res) => {
  res.json({ status: "DCPVAS backend running" });
});

// 404 + error handling
app.use(notFound);
app.use(errorHandler);

export default app;
