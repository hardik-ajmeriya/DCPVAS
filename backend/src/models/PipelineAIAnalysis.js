import mongoose from 'mongoose';

const PipelineAIAnalysisSchema = new mongoose.Schema(
  {
    rawLogRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineRawLog', required: true },
    jobName: { type: String, required: true, trim: true },
    buildNumber: { type: Number, required: true },
    // Async progress tracking
    analysisStatus: { type: String, enum: ['ANALYSIS_IN_PROGRESS', 'READY'], required: true, default: 'ANALYSIS_IN_PROGRESS' },
    analysisStep: { type: String, default: 'FETCHING_LOGS' },
    // AI outputs (nullable until READY)
    failedStage: { type: String, default: null },
    detectedError: { type: String, default: null },
    humanSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    suggestedFix: { type: mongoose.Schema.Types.Mixed, default: null },
    technicalRecommendation: { type: mongoose.Schema.Types.Mixed, default: null },
    confidenceScore: { type: Number, min: 0, max: 1, default: null },
    analysisSource: { type: String, enum: ['OPENAI_GPT', 'RULE_BASED'], required: true },
    aiModel: { type: String, default: '' },
    analysisVersion: { type: String, default: 'v1' },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Allow multiple analyses per build over time (re-runs)
PipelineAIAnalysisSchema.index({ rawLogRef: 1, analysisVersion: 1, updatedAt: -1 });
PipelineAIAnalysisSchema.index({ jobName: 1, buildNumber: 1, updatedAt: -1 });

const PipelineAIAnalysis =
  mongoose.models.PipelineAIAnalysis ||
  mongoose.model('PipelineAIAnalysis', PipelineAIAnalysisSchema, 'pipeline_ai_analysis');

export default PipelineAIAnalysis;
