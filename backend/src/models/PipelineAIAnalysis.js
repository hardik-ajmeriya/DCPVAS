import mongoose from 'mongoose';

const PipelineAIAnalysisSchema = new mongoose.Schema(
  {
    rawLogRef: { type: mongoose.Schema.Types.ObjectId, ref: 'PipelineRawLog', required: true },
    jobName: { type: String, required: true, trim: true },
    buildNumber: { type: Number, required: true },
    // Final Jenkins result analyzed; used to guard duplicate analyses
    finalResult: { type: String, enum: ['SUCCESS', 'FAILURE', 'ABORTED'], required: true, default: 'FAILURE' },
    // Async progress tracking (MongoDB is the source of truth)
    // Industry-standard discrete phases
    analysisStatus: {
      type: String,
      enum: ['FETCHING_LOGS', 'FILTERING_ERRORS', 'AI_ANALYZING', 'STORING_RESULTS', 'COMPLETED', 'FAILED', 'SKIPPED'],
      required: true,
      default: 'FETCHING_LOGS',
    },
    // Deterministic stage tracker (forward-only)
    stage: {
      type: String,
      enum: ['FETCH_LOGS', 'FILTER_ERRORS', 'AI_ANALYSIS', 'STORE_RESULTS', 'COMPLETED', 'SKIPPED'],
      default: 'FETCH_LOGS',
    },
    // Coarse analysis run lifecycle for frontend recovery
    analysisRunStatus: { type: String, enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
    // Legacy step field retained for compatibility; mirrors analysisStatus
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
    // Optional debug field for failure cases; not used by UI but
    // invaluable when AI fails or times out.
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

// Allow multiple analyses per build over time (re-runs)
PipelineAIAnalysisSchema.index({ rawLogRef: 1, analysisVersion: 1, updatedAt: -1 });
PipelineAIAnalysisSchema.index({ jobName: 1, buildNumber: 1, updatedAt: -1 });
PipelineAIAnalysisSchema.index({ buildNumber: -1 });

const PipelineAIAnalysis =
  mongoose.models.PipelineAIAnalysis ||
  mongoose.model('PipelineAIAnalysis', PipelineAIAnalysisSchema, 'pipeline_ai_analysis');

export default PipelineAIAnalysis;
