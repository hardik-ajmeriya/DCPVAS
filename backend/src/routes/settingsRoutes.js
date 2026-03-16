import express from "express";
import {
  getJenkinsSettings,
  saveJenkinsSettings,
  validateJenkinsTestPayload,
  testJenkinsConnection,
} from "../controllers/settingsController.js";

const router = express.Router();

router.post("/jenkins/save", saveJenkinsSettings);
router.get("/jenkins", getJenkinsSettings);
router.post("/jenkins/test", validateJenkinsTestPayload, testJenkinsConnection);

export default router;