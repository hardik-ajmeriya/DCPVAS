import mongoose from 'mongoose';

const PipelineRunSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, trim: true },
    buildNumber: { type: Number, required: true },
    status: { type: String, enum: ['SUCCESS', 'FAILURE'], required: true },
    failedStage: { type: String, default: null },
    humanSummary: { type: String, default: '' },
    suggestedFix: { type: String, default: '' },
    technicalRecommendation: { type: String, default: '' },
    rawLogs: { type: String, default: '' },
    executedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Ensure we never save duplicate executions for the same job/build number
PipelineRunSchema.index({ jobName: 1, buildNumber: 1 }, { unique: true });

const PipelineRun = mongoose.models.PipelineRun || mongoose.model('PipelineRun', PipelineRunSchema);

export default PipelineRun;
