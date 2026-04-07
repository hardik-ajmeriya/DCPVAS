import mongoose from 'mongoose';

const PipelineRawLogSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, trim: true },
    buildNumber: { type: Number, required: true },
    // Final Jenkins build result (may be null until completed)
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'ABORTED'], default: null },
    // Build state guard
    buildStatus: { type: String, enum: ['QUEUED', 'BUILDING', 'COMPLETED'], required: true, default: 'BUILDING' },
    building: { type: Boolean, required: true, default: true },
    // Finalization & stabilization
    logsFinal: { type: Boolean, required: true, default: false },
    // Stabilization: store last observed consoleText length
    lastLogSize: { type: Number, default: 0 },
    // High-level analysis state used for frontend recovery (single source of truth per build)
    analysisStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'WAITING_FOR_BUILD', 'WAITING_FOR_LOGS', 'AI_ANALYZING', 'COMPLETED', 'FAILED'],
      default: 'WAITING_FOR_BUILD',
    },
    stages: [
      {
        name: { type: String, required: true },
        status: { type: String, required: true },
        durationMs: { type: Number, default: 0 },
      },
    ],
    // Full Jenkins console output (kept untruncated for Raw Logs UI)
    logs: { type: String, default: '' },
    rawLogs: { type: String, default: '' },
    consoleUrl: { type: String, default: '' },
    executedAt: { type: Date, required: true },
    // Per-build analysis summary for quick UI
    analyzedAt: { type: Date, default: null },
    confidenceScore: { type: Number, min: 0, max: 1, default: null },
    branch: { type: String, default: null, trim: true },
    commit: { type: String, default: null, trim: true },
    durationSeconds: { type: Number, default: null },
  },
  { timestamps: true }
);

// Single source of truth: insert once per build, never overwrite
PipelineRawLogSchema.index({ jobName: 1, buildNumber: 1 }, { unique: true });
PipelineRawLogSchema.index({ buildNumber: -1 });
PipelineRawLogSchema.index({ executedAt: -1 });

const PipelineRawLog =
  mongoose.models.PipelineRawLog || mongoose.model('PipelineRawLog', PipelineRawLogSchema, 'pipeline_raw_logs');

export default PipelineRawLog;
