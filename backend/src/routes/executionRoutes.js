import { Router } from 'express';
import { listExecutions, getExecutionById } from '../controllers/executionController.js';

const router = Router();

router.get('/', listExecutions);
router.get('/:id', getExecutionById);

export default router;