import PipelineRun from '../models/PipelineRun.js';

export async function listExecutions(req, res) {
  try {
    const items = await PipelineRun.find({}, 'jobName buildNumber status failedStage executedAt')
      .sort({ executedAt: -1 })
      .lean();
    return res.json(items);
  } catch (e) {
    console.error('Failed to list executions:', e?.message || e);
    return res.status(500).json({ error: 'Failed to list executions' });
  }
}

export async function getExecutionById(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing execution id' });
    const item = await PipelineRun.findById(id).lean();
    if (!item) return res.status(404).json({ error: 'Execution not found' });
    return res.json(item);
  } catch (e) {
    console.error('Failed to get execution:', e?.message || e);
    return res.status(500).json({ error: 'Failed to get execution' });
  }
}

export default { listExecutions, getExecutionById };