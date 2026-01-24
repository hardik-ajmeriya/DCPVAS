import mongoose from 'mongoose';

// Records that a build was analyzed or explicitly skipped, to prevent re-analysis on restart
const PipelineAnalysisAuditSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, trim: true },
    buildNumber: { type: Number, required: true },
    analysisStatus: { type: String, enum: ['COMPLETED', 'SKIPPED'], required: true },
    analyzedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

// One audit entry per build
PipelineAnalysisAuditSchema.index({ jobName: 1, buildNumber: 1 }, { unique: true });

const PipelineAnalysisAudit =
  mongoose.models.PipelineAnalysisAudit ||
  mongoose.model('PipelineAnalysisAudit', PipelineAnalysisAuditSchema, 'pipeline_analysis_audit');

export default PipelineAnalysisAudit;
