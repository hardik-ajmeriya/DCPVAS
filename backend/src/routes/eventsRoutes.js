import { Router } from "express";
import { registerClient } from "../services/eventStreamService.js";

const router = Router();

router.get("/pipeline-stream", (req, res) => {
  registerClient(req, res);
});

export default router;
