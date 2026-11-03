import { Router } from 'express';
import { uploadAsset, extractOcrData, parseVoiceCommand } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect AI endpoints with JWT auth
router.use(requireAuth);

router.post('/upload', uploadAsset);
router.post('/ocr-extract', extractOcrData);
router.post('/parse-voice', parseVoiceCommand);

export default router;

