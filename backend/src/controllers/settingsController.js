import axios from "axios";
import JenkinsSettings from "../models/jenkinsSettings.js";
import { decrypt, encrypt } from "../services/cryptoService.js";

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
      return res.status(400).json({ success: false, message: "Jenkins not configured" });
    }
    const { jenkinsUrl, jobName, username, isConnected, lastVerifiedAt } = settings;
    return res.json({ success: true, jenkinsUrl, jobName, username, isConnected, lastVerifiedAt });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch Jenkins settings" });
  }
}

export async function testJenkinsConnection(req, res) {
  try {
    // Accept config from body or fall back to DB
    const body = req.body || {};
    const hasBodyConfig = Boolean(body?.jenkinsUrl || body?.username || body?.apiToken);
    const settings = await JenkinsSettings.findOne();

    const jenkinsUrl = body?.jenkinsUrl || settings?.jenkinsUrl;
    const username = body?.username || settings?.username;
    // Token: plain from body if provided, else decrypt stored
    const apiToken = body?.apiToken || (settings ? decrypt(settings.apiToken) : undefined);

    // Debug (temporary)
    console.log('Testing Jenkins config:', { jenkinsUrl, username });

    if (!jenkinsUrl) {
      return res.status(400).json({ success: false, message: 'Missing Jenkins URL' });
    }
    if (!username || !apiToken) {
      return res.status(400).json({ success: false, message: 'Missing credentials' });
    }

    const auth = { username, password: apiToken };

    // Connectivity test: only base /api/json; jobName is optional and not required here
    await axios.get(`${jenkinsUrl}/api/json`, { auth });

    const verifiedAt = new Date();
    if (settings) {
      await JenkinsSettings.findOneAndUpdate(
        {},
        { $set: { isConnected: true, lastVerifiedAt: verifiedAt } },
        { new: true }
      );
    }

    return res.json({ success: true, isConnected: true, verifiedAt });
  } catch (err) {
    const msg = err?.message || "Connection failed";
    const verifiedAt = new Date();
    // Update DB status if settings exist
    const existing = await JenkinsSettings.findOne();
    if (existing) {
      await JenkinsSettings.findOneAndUpdate(
        {},
        { $set: { isConnected: false, lastVerifiedAt: verifiedAt } },
        { new: true }
      );
    }
    // Failures should be 500 with readable message (no 404 here)
    return res.status(500).json({ success: false, message: msg });
  }
}
