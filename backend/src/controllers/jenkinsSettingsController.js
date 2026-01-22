import axios from "axios";
import JenkinsSettings from "../models/jenkinsSettings.js";
import { decrypt, encrypt } from "../services/cryptoService.js";

export async function saveJenkinsSettings(req, res) {
  try {
    const { jenkinsUrl, jobName, username, apiToken } = req.body;

    if (!jenkinsUrl || !jobName || !username || !apiToken) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const encryptToken = encrypt(apiToken);

    const settings = await JenkinsSettings.findOneAndUpdate(
      {},
      {
        $set: {
          jenkinsUrl,
          jobName,
          username,
          apiToken: encryptToken,
        },
        // Do not forcibly set isConnected here; let test endpoint update it
      },
      { upsert: true, new: true },
    );

    return res.json({ message: "Jenkins settings saved successfully" });
  } catch (err) {
    const msg = err?.message || "Failed to Save Jenkins Settings";
    return res.status(500).json({ error: msg });
  }
}

export async function getJenkinsSettings(req, res) {
  try {
    const settings = await JenkinsSettings.findOne().select("-apiToken");
    if (!settings) {
      return res.status(400).json({ message: "Jenkins not configured" });
    }
    const { jenkinsUrl, jobName, username, isConnected, lastVerifiedAt } = settings;
    return res.json({ jenkinsUrl, jobName, username, isConnected, lastVerifiedAt });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch Jenkins settings" });
  }
}

export async function testJenkinsConnection(req, res) {
  try {
    const settings = await JenkinsSettings.findOne();
    if (!settings) {
      return res.status(400).json({ message: "Jenkins not configured" });
    }

    const token = decrypt(settings.apiToken);

    const auth = {
      username: settings.username,
      password: token,
    };

    await axios.get(`${settings.jenkinsUrl}/api/json`, { auth });
    await axios.get(`${settings.jenkinsUrl}/job/${settings.jobName}/api/json`, { auth });

    const verifiedAt = new Date();
    const updated = await JenkinsSettings.findOneAndUpdate(
      {},
      { $set: { isConnected: true, lastVerifiedAt: verifiedAt } },
      { new: true }
    ).select("-apiToken");

    return res.json({
      status: "SUCCESS",
      message: "Jenkins connection verified",
      isConnected: true,
      lastVerifiedAt: verifiedAt,
      jobName: updated?.jobName,
    });
  } catch (err) {
    const msg = err?.message || "Connection failed";
    // Mark as disconnected; keep lastVerifiedAt as now to reflect attempted verification
    const verifiedAt = new Date();
    await JenkinsSettings.findOneAndUpdate(
      {},
      { $set: { isConnected: false, lastVerifiedAt: verifiedAt } },
      { new: true }
    );
    // Map Jenkins 404 (e.g., wrong job) to 400 (client error/misconfig)
    const statusCode = err?.response?.status;
    const code = statusCode === 404 ? 400 : 500;
    return res.status(code).json({ status: "FAILED", message: msg, isConnected: false, lastVerifiedAt: verifiedAt });
  }
}
