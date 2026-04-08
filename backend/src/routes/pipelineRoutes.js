import { Router } from 'express';
import { getLatestPipeline, getLatestPipelineFlow, getPipelineHistory, getPipelineLogs, getPipelineStages, getPipelineBuild, getDiagnostics, getFailureTimeline, analyzeJenkinsLogs, reanalyzePipelineBuild, getPipelineAnalysis, streamPipelineStages, getAnalysisStatusForJob } from '../controllers/pipelineController.js';

const router = Router();

router.get('/latest', getLatestPipeline);
router.get('/latest-flow', getLatestPipelineFlow);
router.get('/stream', streamPipelineStages);
router.get('/history', getPipelineHistory);
router.get('/logs/:number', getPipelineLogs);
router.get('/stages', getPipelineStages);
router.get('/build/:number', getPipelineBuild);
router.get('/analysis/:number', getPipelineAnalysis);
router.get('/analysis-status/:jobName/:buildNumber', getAnalysisStatusForJob);
router.get('/diagnostics', getDiagnostics);
router.get('/failures', getFailureTimeline);
router.post('/ai/analyze', analyzeJenkinsLogs);
router.post('/reanalyze/:number', reanalyzePipelineBuild);

export default router;