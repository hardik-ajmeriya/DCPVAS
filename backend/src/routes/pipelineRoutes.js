import { Router } from 'express';
import { getLatestPipeline, getPipelineHistory, getPipelineLogs, getPipelineStages, getPipelineBuild, getDiagnostics, getFailureTimeline, analyzeJenkinsLogs, reanalyzePipelineBuild, getAnalysisStatus } from '../controllers/pipelineController.js';

const router = Router();

router.get('/latest', getLatestPipeline);
router.get('/history', getPipelineHistory);
router.get('/logs/:number', getPipelineLogs);
router.get('/stages', getPipelineStages);
router.get('/build/:number', getPipelineBuild);
router.get('/analysis/:number', getAnalysisStatus);
router.get('/diagnostics', getDiagnostics);
router.get('/failures', getFailureTimeline);
router.post('/ai/analyze', analyzeJenkinsLogs);
router.post('/reanalyze/:number', reanalyzePipelineBuild);

export default router;