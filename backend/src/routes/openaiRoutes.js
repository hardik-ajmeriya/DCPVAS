import { Router } from 'express';
import { healthOpenAI, testOpenAIText, testOpenAIJson, testAnalyzeLog } from '../controllers/openaiController.js';

const router = Router();

// TASK 1: ENV VERIFICATION
router.get('/health/openai', healthOpenAI);

// TASK 2: BASIC CONNECTIVITY
router.get('/test/openai-text', testOpenAIText);

// TASK 3: STRUCTURED JSON TEST
router.get('/test/openai-json', testOpenAIJson);

// TASK 4: REALISTIC JENKINS LOG TEST
router.post('/test/analyze-log', testAnalyzeLog);

export default router;
