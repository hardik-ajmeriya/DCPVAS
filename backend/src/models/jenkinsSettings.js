import mongoose from "mongoose";

const JenkinsSettingsSchema = new mongoose.Schema(
  {
    jenkinsUrl: { type: String, required: true, trim: true },
    jobName: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    apiToken: { type: String, required: true }, // encrypted
  },
  { timestamps: true }
);

const JenkinsSettings =
  mongoose.models.JenkinsSettings ||
  mongoose.model("JenkinsSettings", JenkinsSettingsSchema, "jenkins_settings");

export default JenkinsSettings;
