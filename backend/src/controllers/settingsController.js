import axios from "axios";
import JenkinsSettings from "../models/jenkinsSettings.js";
import { encrypt } from "../services/cryptoService.js";

const REQUIRED_FIELDS = ["jenkinsUrl", "username", "apiToken"];

// Simple middleware-style validator; avoids leaking secrets while enforcing required fields
export function validateJenkinsTestPayload(req, res, next) {
  const payload = req.body || {};
  const effectiveUrl = payload.jenkinsUrl || payload.url;
  const effectiveToken = payload.apiToken || payload.token;
  const missing = REQUIRED_FIELDS.filter((field) => {
    if (field === "jenkinsUrl") return !effectiveUrl;
    if (field === "apiToken") return !effectiveToken;
    return !payload[field];
  });

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
    const normalizedUrl = new URL(effectiveUrl).toString().replace(/\/$/, "");
    req.jenkinsTestPayload = {
      ...payload,
      jenkinsUrl: normalizedUrl,
      url: normalizedUrl,
      apiToken: effectiveToken,
      token: effectiveToken,
    };
  } catch (err) {
    return res.status(400).json({ success: false, message: "Invalid Jenkins URL" });
  }

  return next();
}

export async function saveJenkinsSettings(req, res) {
  try {
    const body = req.body || {};
    const jenkinsUrlInput = body.jenkinsUrl || body.url;
    const apiTokenInput = body.apiToken || body.token;
    const { jobName, username } = body;

    if (!jenkinsUrlInput || !jobName || !username || !apiTokenInput) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    let normalizedUrl;
    try {
      normalizedUrl = new URL(jenkinsUrlInput).toString().replace(/\/$/, "");
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid Jenkins URL" });
    }

    const encryptedToken = encrypt(apiTokenInput);

    const update = {
      type: "jenkins",
      jenkinsUrl: normalizedUrl,
      url: normalizedUrl,
      jobName,
      username,
      apiToken: encryptedToken,
      token: encryptedToken,
    };

    console.log("[JenkinsSettings] Saving config:", {
      jenkinsUrl: normalizedUrl,
      jobName,
      username,
    });

    const saved = await JenkinsSettings.findOneAndUpdate(
      { type: "jenkins" },
      { $set: update },
      { upsert: true, new: true },
    );

    console.log("[JenkinsSettings] Saved document:", {
      id: saved?._id,
      isConnected: saved?.isConnected,
      lastVerifiedAt: saved?.lastVerifiedAt,
    });

    return res.json({ success: true, message: "Jenkins settings saved successfully" });
  } catch (err) {
    const msg = err?.message || "Failed to Save Jenkins Settings";
    console.error("[JenkinsSettings] Failed to save Jenkins settings:", err);
    return res.status(500).json({ success: false, message: msg });
  }
}

export async function getJenkinsSettings(req, res) {
  try {
    let settings = await JenkinsSettings.findOne({ type: "jenkins" }).select("-apiToken -token");
    if (!settings) {
      // Backwards compatibility for records created before `type` field existed
      settings = await JenkinsSettings.findOne().select("-apiToken -token");
    }

    if (!settings) {
      console.warn("[JenkinsSettings] getJenkinsSettings: no config found in database");
      return res.json({
        success: false,
        message: "Jenkins not configured",
        isConnected: false,
      });
    }

    const jenkinsUrl = settings.jenkinsUrl || settings.url;
    const { jobName, username, isConnected, lastVerifiedAt } = settings;

    console.log("[JenkinsSettings] Fetched config:", {
      id: settings._id,
      jenkinsUrl,
      jobName,
      username,
      isConnected,
      lastVerifiedAt,
    });

    return res.json({ success: true, jenkinsUrl, jobName, username, isConnected, lastVerifiedAt });
  } catch (err) {
    console.error("[JenkinsSettings] Failed to fetch Jenkins settings:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch Jenkins settings" });
  }
}

export async function testJenkinsConnection(req, res) {
  try {
    const payload = req.jenkinsTestPayload || req.body || {};
    const jenkinsUrl = payload.jenkinsUrl || payload.url;
    const apiToken = payload.apiToken || payload.token;
    const { username, jobName } = payload;

    console.log("[JenkinsSettings] Testing Jenkins config request received", {
      jenkinsUrl,
      username,
      jobName,
      hasToken: Boolean(apiToken),
    });

    const auth = { username, password: apiToken };

    const response = await axios.get(`${jenkinsUrl}/api/json`, {
      auth,
      timeout: 5000,
    });

    const verifiedAt = new Date();
    const update = {
      type: "jenkins",
      jenkinsUrl,
      url: jenkinsUrl,
      username,
      isConnected: true,
      lastVerifiedAt: verifiedAt,
    };

    if (jobName) update.jobName = jobName;
    if (apiToken) {
      const encrypted = encrypt(apiToken);
      update.apiToken = encrypted;
      update.token = encrypted;
    }

    const saved = await JenkinsSettings.findOneAndUpdate(
      { type: "jenkins" },
      { $set: update },
      { upsert: true, new: true },
    );

    console.log("[JenkinsSettings] Jenkins connection verified and saved:", {
      id: saved?._id,
      jenkinsUrl: saved?.jenkinsUrl || saved?.url,
      jobName: saved?.jobName,
      username: saved?.username,
      isConnected: saved?.isConnected,
      lastVerifiedAt: saved?.lastVerifiedAt,
    });

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
        { type: "jenkins" },
        { $set: { isConnected: false, lastVerifiedAt: verifiedAt } },
        { new: true },
      );
      console.error("[JenkinsSettings] Jenkins authentication failed:", err?.message || err);
      return res.status(401).json({
        success: false,
        message: "Jenkins authentication failed. Check username or API token.",
      });
    }

    const verifiedAt = new Date();
    await JenkinsSettings.findOneAndUpdate(
      { type: "jenkins" },
      { $set: { isConnected: false, lastVerifiedAt: verifiedAt } },
      { new: true },
    );

    console.error("[JenkinsSettings] Jenkins connection error:", err?.message || err);

    return res.status(500).json({
      success: false,
      message: "Unable to connect to Jenkins server",
      details: err?.message,
    });
  }
}

// Debug helper: inspect raw Jenkins settings in MongoDB without exposing tokens
export async function getJenkinsSettingsDebug(req, res) {
  try {
    const [total, typed] = await Promise.all([
      JenkinsSettings.countDocuments({}).catch((e) => {
        console.error("[JenkinsSettings] countDocuments(all) failed:", e?.message || e);
        return -1;
      }),
      JenkinsSettings.countDocuments({ type: "jenkins" }).catch((e) => {
        console.error("[JenkinsSettings] countDocuments(type=jenkins) failed:", e?.message || e);
        return -1;
      }),
    ]);

    let settings = await JenkinsSettings.findOne({ type: "jenkins" }).lean();
    if (!settings) {
      settings = await JenkinsSettings.findOne({}).lean();
    }

    const summary = settings
      ? {
          id: settings._id,
          type: settings.type,
          jenkinsUrl: settings.jenkinsUrl || settings.url,
          jobName: settings.jobName,
          username: settings.username,
          isConnected: settings.isConnected,
          lastVerifiedAt: settings.lastVerifiedAt,
        }
      : null;

    return res.json({
      success: true,
      totalDocuments: total,
      jenkinsTypedDocuments: typed,
      settings: summary,
    });
  } catch (err) {
    console.error("[JenkinsSettings] getJenkinsSettingsDebug failed:", err?.message || err);
    return res.status(500).json({ success: false, message: "Failed to inspect Jenkins settings" });
  }
}
