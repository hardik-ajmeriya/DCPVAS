import express from "express";
import {
  getJenkinsSettings,
  saveJenkinsSettings,
  testJenkinsConnection,
} from "../controllers/jenkinsSettingsController.js";

const router = express.Router();

router.post("/jenkins", saveJenkinsSettings);
router.get("/jenkins", getJenkinsSettings);
router.post("/jenkins/test", testJenkinsConnection);

export default router;