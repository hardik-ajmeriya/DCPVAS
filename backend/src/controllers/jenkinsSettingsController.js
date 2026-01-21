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
        jenkinsUrl,
        jobName,
        username,
        apiToken: encryptToken,
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
    return res.json(settings);
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
    await axios.get(`${settings.jenkinsUrl}/job/${settings.jobName}/api/json`, {
      auth,
    });

    return res.json({ status: "SUCCESS", message: "Jenkins connection verified" });
  } catch (err) {
    const msg = err?.message || "Connection failed";
    return res.status(500).json({ status: "FAILED", message: msg });
  }
}
