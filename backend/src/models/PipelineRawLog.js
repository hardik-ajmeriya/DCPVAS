import mongoose from 'mongoose';

const PipelineRawLogSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, trim: true },
    buildNumber: { type: Number, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
    stages: [
      {
        name: { type: String, required: true },
        // Accept any Jenkins stage status (e.g., SUCCESS, FAILED, SKIPPED, ABORTED, UNSTABLE, etc.)
        status: { type: String, required: true },
        durationMs: { type: Number, default: 0 },
      },
    ],
    rawLogs: { type: String, required: true },
    consoleUrl: { type: String, default: '' },
    executedAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

// Single source of truth: insert once per build, never overwrite
PipelineRawLogSchema.index({ jobName: 1, buildNumber: 1 }, { unique: true });

const PipelineRawLog =
  mongoose.models.PipelineRawLog || mongoose.model('PipelineRawLog', PipelineRawLogSchema, 'pipeline_raw_logs');

export default PipelineRawLog;
