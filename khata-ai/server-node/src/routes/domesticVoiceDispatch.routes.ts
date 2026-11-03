import { Router } from 'express';
import { executeDomesticVoiceCommand } from '../controllers/domesticVoiceDispatch.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// Execute Domestic Voice Transaction
router.post('/execute', executeDomesticVoiceCommand);

export default router;
