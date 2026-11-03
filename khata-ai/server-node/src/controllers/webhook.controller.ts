import { Request, Response } from 'express';
import { handleGatewayWebhook } from './paymentLink.controller';

/**
 * Handle incoming payment gateway webhooks (JazzCash / EasyPaisa / Raast)
 * POST /api/v1/webhooks/gateway
 */
export const processIncomingWebhook = async (req: Request, res: Response): Promise<Response> => {
  return handleGatewayWebhook(req, res);
};
