import { Response, NextFunction } from 'express';
import { GlobalSystemConfigModel } from '../models/GlobalSystemConfig';

/**
 * Express Middleware to enforce:
 * 1. Master System-Wide Subscription Kill-Switch (if OFF, paywalls are bypassed globally)
 * 2. Master Feature-Level Outage Flag (if OFF, returns 503 maintenance message in Urdu)
 * 3. Cross-Persona Access Boundary (Household vs Dukandar vs Dual VIP)
 * 4. User Active Tier Feature Inclusions (if not included, returns 402 Paywall Prompt)
 */
export function requireFeature(featureKey: string, requiredScope?: 'DUKANDAR' | 'HOUSEHOLD') {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // 1. Check Master System-Wide Subscription Kill-Switch
      let config = await GlobalSystemConfigModel.findOne({ key: 'MASTER_CONFIG' });
      if (!config) {
        config = await GlobalSystemConfigModel.create({ key: 'MASTER_CONFIG' });
      }

      if (!config.subscriptionEnforcementActive) {
        // SuperAdmin disabled paywalls globally -> allow all requests unconditionally
        return next();
      }

      // 2. Check Global Feature Switch (e.g. Whisper API maintenance)
      const featureFlags = config.featureFlags as any;
      if (featureFlags && (featureFlags.get ? featureFlags.get(featureKey) === false : featureFlags[featureKey] === false)) {
        return res.status(503).json({
          success: false,
          error: 'FEATURE_DISABLED_GLOBALLY',
          messageUrdu: 'یہ فیچر عارضی طور پر مینٹیننس کے لیے بند ہے۔',
          message: `The feature '${featureKey}' is temporarily disabled by system administration.`
        });
      }

      // 3. User Authentication & Tier Scope Check
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const userScope = user.subscription?.personaScope || (user.activePersona === 'VENDOR' ? 'DUKANDAR_ONLY' : 'HOUSEHOLD_ONLY');

      // Check Cross-Persona Boundary
      if (requiredScope === 'DUKANDAR' && userScope === 'HOUSEHOLD_ONLY') {
        return res.status(403).json({
          success: false,
          error: 'CROSS_PERSONA_RESTRICTED',
          messageUrdu: 'گھریلو کھاتہ پلان سے دکان کا ریٹیل پی او ایس استعمال نہیں ہو سکتا۔ ڈوئل وی آئی پی (Rs. 750) پر اپگریڈ کریں۔',
          message: 'Household plan cannot access retail Dukandar tools. Upgrade to Dual-Persona VIP (PKR 750).'
        });
      }

      if (requiredScope === 'HOUSEHOLD' && userScope === 'DUKANDAR_ONLY') {
        return res.status(403).json({
          success: false,
          error: 'CROSS_PERSONA_RESTRICTED',
          messageUrdu: 'دکاندار پلان سے گھرانہ اور گھریلو بل تقسیم استعمال نہیں ہو سکتا۔ ڈوئل وی آئی پی (Rs. 750) پر اپگریڈ کریں۔',
          message: 'Dukandar plan cannot access Ghar Ka Hisab tools. Upgrade to Dual-Persona VIP (PKR 750).'
        });
      }

      // 4. Feature Membership Validation
      const allowedFeatures: string[] = user.subscription?.allowedFeatures || [];
      const isDualVip = user.subscription?.planKey === 'DUAL_VIP_750';

      if (!isDualVip && !allowedFeatures.includes(featureKey)) {
        return res.status(402).json({
          success: false,
          error: 'PAYWALL_TRIGGER',
          requiredFeature: featureKey,
          currentTier: user.subscription?.planKey || 'FREE_STARTER',
          messageUrdu: 'اس جدید فیچر کو استعمال کرنے کے لیے اپنا سبسکرپشن پیکیج اپگریڈ کریں۔',
          message: `Your current subscription plan does not include '${featureKey}'. Upgrade required.`
        });
      }

      return next();
    } catch (err: any) {
      return next(err);
    }
  };
}
