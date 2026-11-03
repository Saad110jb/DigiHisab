import { Request, Response } from 'express';
import { DomesticVoiceDispatchService, IExecuteVoiceCommandPayload } from '../services/domesticVoiceDispatch.service';

/**
 * Execute interpreted domestic voice command
 * POST /api/v1/domestic/voice/execute
 */
export const executeDomesticVoiceCommand = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = String(req.user?.id || 'default_profile');
    const payload: IExecuteVoiceCommandPayload = req.body;

    if (!payload || !payload.amount || payload.amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive amount and voice command payload are required.',
      });
    }

    const receipt = await DomesticVoiceDispatchService.executeVoiceCommand(profileId, payload);

    return res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error: any) {
    console.error('[DomesticVoiceDispatchController] Execution error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
