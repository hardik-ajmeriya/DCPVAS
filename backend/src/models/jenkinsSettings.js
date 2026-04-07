import mongoose from "mongoose";

const JenkinsSettingsSchema = new mongoose.Schema(
  {
    // Logical type discriminator so we can store multiple settings types if needed
    type: { type: String, required: true, default: "jenkins", index: true },

    // Primary fields actually used by the rest of the codebase
    jenkinsUrl: { type: String, required: true, trim: true },
    jobName: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    apiToken: { type: String, required: true }, // encrypted

    // Backwards/forwards compatible aliases to match `{ url, token }` shape
    url: { type: String, trim: true },
    token: { type: String }, // encrypted

    isConnected: { type: Boolean, default: false },
    lastVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const JenkinsSettings =
  mongoose.models.JenkinsSettings ||
  mongoose.model("JenkinsSettings", JenkinsSettingsSchema, "jenkins_settings");

export default JenkinsSettings;
