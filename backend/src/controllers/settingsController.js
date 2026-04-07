import axios from "axios";
import JenkinsSettings from "../models/jenkinsSettings.js";
import { encrypt } from "../services/cryptoService.js";

const REQUIRED_FIELDS = ["jenkinsUrl", "username", "apiToken"];

// Simple middleware-style validator; avoids leaking secrets while enforcing required fields
export function validateJenkinsTestPayload(req, res, next) {
  const payload = req.body || {};
  const missing = REQUIRED_FIELDS.filter((field) => !payload[field]);

  if (missing.length) {
    return res.status(400).json({
      success: false,
      message: "Missing Jenkins configuration fields",
      requiredFields: REQUIRED_FIELDS,
      missing,
    });
  }

  try {
    // Validate URL format; normalize by stripping trailing slash for consistency
    const normalizedUrl = new URL(payload.jenkinsUrl).toString().replace(/\/$/, "");
    req.jenkinsTestPayload = {
      ...payload,
      jenkinsUrl: normalizedUrl,
    };
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid Jenkins URL" });
  }

  return next();
}

export async function saveJenkinsSettings(req, res) {
  try {
    const { jenkinsUrl, jobName, username, apiToken } = req.body;
    if (!jenkinsUrl || !jobName || !username || !apiToken) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const encryptToken = encrypt(apiToken);
    await JenkinsSettings.findOneAndUpdate(
      {},
      {
        $set: {
          jenkinsUrl,
          jobName,
          username,
          apiToken: encryptToken,
        },
      },
      { upsert: true, new: true },
    );

    return res.json({ success: true, message: "Jenkins settings saved successfully" });
  } catch (err) {
    const msg = err?.message || "Failed to Save Jenkins Settings";
    return res.status(500).json({ success: false, message: msg });
  }
}

export async function getJenkinsSettings(req, res) {
  try {
    const settings = await JenkinsSettings.findOne().select("-apiToken");
    if (!settings) {
      return res.json({
        success: false,
        message: "Jenkins not configured",
        isConnected: false,
      });
    }
    const { jenkinsUrl, jobName, username, isConnected, lastVerifiedAt } = settings;
    return res.json({ success: true, jenkinsUrl, jobName, username, isConnected, lastVerifiedAt });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch Jenkins settings" });
  }
}

export async function testJenkinsConnection(req, res) {
  try {
    const { jenkinsUrl, username, apiToken, jobName } = req.jenkinsTestPayload || req.body || {};

    console.log("Testing Jenkins config request received");
    console.log("Jenkins URL:", jenkinsUrl);
    console.log("Username:", username);
    console.log("Job Name:", jobName);

    const auth = { username, password: apiToken };

    const response = await axios.get(`${jenkinsUrl}/api/json`, {
      auth,
      timeout: 5000,
    });

    const verifiedAt = new Date();
    const update = {
      jenkinsUrl,
      username,
      isConnected: true,
      lastVerifiedAt: verifiedAt,
    };

    if (jobName) update.jobName = jobName;
    if (apiToken) update.apiToken = encrypt(apiToken);

    await JenkinsSettings.findOneAndUpdate(
      {},
      { $set: update },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: "Jenkins connection successful",
      jenkinsVersion: response.headers?.["x-jenkins"],
    });
  } catch (err) {
    const statusCode = err?.response?.status;

    if (statusCode === 401) {
      const verifiedAt = new Date();
      await JenkinsSettings.findOneAndUpdate(
        {},
        { $set: { isConnected: false, lastVerifiedAt: verifiedAt } },
        { new: true },
      );
      return res.status(401).json({
        success: false,
        message: "Jenkins authentication failed. Check username or API token.",
      });
    }

    const verifiedAt = new Date();
    await JenkinsSettings.findOneAndUpdate(
      {},
      { $set: { isConnected: false, lastVerifiedAt: verifiedAt } },
      { new: true },
    );

    console.error("Jenkins connection error:", err?.message || err);

    return res.status(500).json({
      success: false,
      message: "Unable to connect to Jenkins server",
      details: err?.message,
    });
  }
}
