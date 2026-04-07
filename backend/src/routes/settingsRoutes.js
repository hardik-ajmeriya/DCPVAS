import express from "express";
import {
  getJenkinsSettings,
  saveJenkinsSettings,
  validateJenkinsTestPayload,
  testJenkinsConnection,
  getJenkinsSettingsDebug,
} from "../controllers/settingsController.js";

const router = express.Router();

// Primary save endpoint: POST /api/settings/jenkins
router.post("/jenkins", saveJenkinsSettings);
// Backwards-compatible alias for older frontends
router.post("/jenkins/save", saveJenkinsSettings);
router.get("/jenkins", getJenkinsSettings);
router.post("/jenkins/test", validateJenkinsTestPayload, testJenkinsConnection);
// Debug route: GET /api/settings/jenkins/debug
router.get("/jenkins/debug", getJenkinsSettingsDebug);

export default router;