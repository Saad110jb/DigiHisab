import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlanIdentifier =
  | 'FREE_STARTER'
  | 'GHAR_AI_PRO_200'
  | 'DUKAN_BASIC_250'
  | 'DUKAN_PRO_MALIK_400'
  | 'DUAL_VIP_750';

export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED';

export interface ISubscriptionRecord {
  planKey: PlanIdentifier;
  personaScope: 'HOUSEHOLD' | 'DUKANDAR' | 'DUAL';
  status: SubscriptionStatus;
  subscribedAt: string;
  expiresAt: string | null;
  amountPaid: number;
  paymentMethod: string;
  voucherApplied?: string | null;
  lastReminderShownAt?: string | null;
}

export interface IFeatureCheckResult {
  allowed: boolean;
  reason?: 'NOT_LOGGED_IN' | 'FREE_TIER_LIMIT' | 'PLAN_EXPIRED' | 'PERSONA_MISMATCH' | 'FEATURE_GATE_LOCKED';
  featureKey: string;
  featureTitleUrdu: string;
  requiredPlan: PlanIdentifier;
  daysRemaining?: number;
}

const STORAGE_KEY_SUBSCRIPTION = '@digihisab_user_subscription';
const STORAGE_KEY_INITIAL_DISMISSED = '@digihisab_subscription_initial_dismissed';
const STORAGE_KEY_LAST_PROMPT = '@digihisab_last_subscription_prompt_at';

// Feature Matrix mapping features to minimum required plan & persona
export const FEATURE_ENTITLEMENT_MAP: Record<
  string,
  {
    titleUrdu: string;
    minimumPlan: PlanIdentifier;
    personaScope: 'HOUSEHOLD' | 'DUKANDAR' | 'DUAL';
    allowedPlans: PlanIdentifier[];
  }
> = {
  FEATURE_VOICE_AI_ENTRY: {
    titleUrdu: 'رومن اردو وائس کھاتہ اندراج',
    minimumPlan: 'DUKAN_BASIC_250',
    personaScope: 'DUKANDAR',
    allowedPlans: ['DUKAN_BASIC_250', 'DUKAN_PRO_MALIK_400', 'DUAL_VIP_750'],
  },
  FEATURE_AI_TAGAZA_TONES: {
    titleUrdu: 'اے آئی ادھار تقاضا ٹونز (نرم/سخت)',
    minimumPlan: 'DUKAN_BASIC_250',
    personaScope: 'DUKANDAR',
    allowedPlans: ['DUKAN_BASIC_250', 'DUKAN_PRO_MALIK_400', 'DUAL_VIP_750'],
  },
  FEATURE_UNLIMITED_KHATAS: {
    titleUrdu: 'لامحدود کسٹمر کھاتے (20 سے زائد)',
    minimumPlan: 'DUKAN_BASIC_250',
    personaScope: 'DUKANDAR',
    allowedPlans: ['DUKAN_BASIC_250', 'DUKAN_PRO_MALIK_400', 'DUAL_VIP_750'],
  },
  FEATURE_THERMAL_PRINTING: {
    titleUrdu: 'بلوٹوتھ تھرمل رسید پرنٹنگ',
    minimumPlan: 'DUKAN_BASIC_250',
    personaScope: 'DUKANDAR',
    allowedPlans: ['DUKAN_BASIC_250', 'DUKAN_PRO_MALIK_400', 'DUAL_VIP_750'],
  },
  FEATURE_CHOR_NAZAR_AUDIT: {
    titleUrdu: 'چور نظر اے آئی کیش دراز آڈٹ',
    minimumPlan: 'DUKAN_PRO_MALIK_400',
    personaScope: 'DUKANDAR',
    allowedPlans: ['DUKAN_PRO_MALIK_400', 'DUAL_VIP_750'],
  },
  FEATURE_AI_STOCK_PREDICTOR: {
    titleUrdu: 'اے آئی منشی اسٹاک و ریٹ پریڈکٹر',
    minimumPlan: 'DUKAN_PRO_MALIK_400',
    personaScope: 'DUKANDAR',
    allowedPlans: ['DUKAN_PRO_MALIK_400', 'DUAL_VIP_750'],
  },
  FEATURE_DOMESTIC_VOICE_AI: {
    titleUrdu: 'رومن اردو گھریلو وائس معاون',
    minimumPlan: 'GHAR_AI_PRO_200',
    personaScope: 'HOUSEHOLD',
    allowedPlans: ['GHAR_AI_PRO_200', 'DUAL_VIP_750'],
  },
  FEATURE_RASHAN_FORECASTER: {
    titleUrdu: 'سمارٹ راشن بجٹ فورکاسٹر',
    minimumPlan: 'GHAR_AI_PRO_200',
    personaScope: 'HOUSEHOLD',
    allowedPlans: ['GHAR_AI_PRO_200', 'DUAL_VIP_750'],
  },
  FEATURE_LESCO_SUBMETER: {
    titleUrdu: 'نیپرا سلیب سب میٹر بل کیلکولیٹر',
    minimumPlan: 'GHAR_AI_PRO_200',
    personaScope: 'HOUSEHOLD',
    allowedPlans: ['GHAR_AI_PRO_200', 'DUAL_VIP_750'],
  },
  FEATURE_KAMETI_TRACKER: {
    titleUrdu: 'کمیٹی و ملازمین ایڈوانس ٹریکر',
    minimumPlan: 'GHAR_AI_PRO_200',
    personaScope: 'HOUSEHOLD',
    allowedPlans: ['GHAR_AI_PRO_200', 'DUAL_VIP_750'],
  },
  FEATURE_CROSS_PERSONA: {
    titleUrdu: 'ڈوئل وی آئی پی مشترکہ کیش فلو',
    minimumPlan: 'DUAL_VIP_750',
    personaScope: 'DUAL',
    allowedPlans: ['DUAL_VIP_750'],
  },
};

class SubscriptionService {
  /**
   * Retrieves the current user's subscription record.
   * Checks expiration timestamp. If month is completed, automatically disables the plan
   * and sets status to EXPIRED.
   */
  async getCurrentSubscription(): Promise<{
    subscription: ISubscriptionRecord;
    isExpired: boolean;
    isExpiringSoon: boolean;
    daysRemaining: number;
  }> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
      if (!raw) {
        return {
          subscription: this.getDefaultFreeStarter(),
          isExpired: false,
          isExpiringSoon: false,
          daysRemaining: 0,
        };
      }

      const sub: ISubscriptionRecord = JSON.parse(raw);

      // If user is on a paid plan, verify 30-day expiration
      if (sub.planKey !== 'FREE_STARTER' && sub.expiresAt) {
        const expiresTime = new Date(sub.expiresAt).getTime();
        const now = Date.now();

        // 1. Month completion check: Auto-disable plan if expired
        if (now >= expiresTime) {
          const expiredSub: ISubscriptionRecord = {
            ...sub,
            status: 'EXPIRED',
            // Disable active paid tier back to free
            planKey: 'FREE_STARTER',
          };
          await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(expiredSub));
          return {
            subscription: expiredSub,
            isExpired: true,
            isExpiringSoon: false,
            daysRemaining: 0,
          };
        }

        // 2. Active plan days remaining and renewal reminder check
        const diffMs = expiresTime - now;
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const isExpiringSoon = daysRemaining <= 3 && daysRemaining > 0;

        return {
          subscription: sub,
          isExpired: false,
          isExpiringSoon,
          daysRemaining,
        };
      }

      return {
        subscription: sub,
        isExpired: sub.status === 'EXPIRED',
        isExpiringSoon: false,
        daysRemaining: 0,
      };
    } catch (e) {
      return {
        subscription: this.getDefaultFreeStarter(),
        isExpired: false,
        isExpiringSoon: false,
        daysRemaining: 0,
      };
    }
  }

  /**
   * Activates a paid subscription when payment is completed.
   * Sets validity to 30 days from now.
   */
  async activateSubscription(
    planKey: PlanIdentifier,
    paymentMethod: string = 'JAZZCASH',
    amountPaid: number = 250,
    voucherCode?: string,
    customDurationDays: number = 30
  ): Promise<ISubscriptionRecord> {
    const now = new Date();
    const expiry = new Date(now.getTime() + customDurationDays * 24 * 60 * 60 * 1000);

    let personaScope: 'HOUSEHOLD' | 'DUKANDAR' | 'DUAL' = 'DUKANDAR';
    if (planKey === 'GHAR_AI_PRO_200') personaScope = 'HOUSEHOLD';
    if (planKey === 'DUAL_VIP_750') personaScope = 'DUAL';

    const newSub: ISubscriptionRecord = {
      planKey,
      personaScope,
      status: 'ACTIVE',
      subscribedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      amountPaid,
      paymentMethod,
      voucherApplied: voucherCode || null,
      lastReminderShownAt: null,
    };

    await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(newSub));
    return newSub;
  }

  /**
   * Evaluates feature-gate access for a specific feature.
   * Returns whether access is permitted or why it is blocked.
   */
  async checkFeatureAccess(
    featureKey: string,
    currentActivePersona?: 'HOUSEHOLD' | 'VENDOR' | 'HYBRID'
  ): Promise<IFeatureCheckResult> {
    const meta = FEATURE_ENTITLEMENT_MAP[featureKey];
    if (!meta) {
      // Unrestricted feature
      return {
        allowed: true,
        featureKey,
        featureTitleUrdu: 'عمومی فیچر',
        requiredPlan: 'FREE_STARTER',
      };
    }

    const { subscription, isExpired, daysRemaining } = await this.getCurrentSubscription();

    // Case 1: Subscription has expired (Month completed)
    if (isExpired || subscription.status === 'EXPIRED') {
      return {
        allowed: false,
        reason: 'PLAN_EXPIRED',
        featureKey,
        featureTitleUrdu: meta.titleUrdu,
        requiredPlan: meta.minimumPlan,
        daysRemaining: 0,
      };
    }

    // Case 2: User is on Free Starter
    if (subscription.planKey === 'FREE_STARTER') {
      return {
        allowed: false,
        reason: 'FREE_TIER_LIMIT',
        featureKey,
        featureTitleUrdu: meta.titleUrdu,
        requiredPlan: meta.minimumPlan,
      };
    }

    // Case 3: Cross-persona check
    // If Dukandar plan tries to access Household feature
    if (meta.personaScope === 'HOUSEHOLD' && subscription.personaScope === 'DUKANDAR') {
      return {
        allowed: false,
        reason: 'PERSONA_MISMATCH',
        featureKey,
        featureTitleUrdu: meta.titleUrdu,
        requiredPlan: 'DUAL_VIP_750',
      };
    }

    // If Household plan tries to access Dukandar POS feature
    if (meta.personaScope === 'DUKANDAR' && subscription.personaScope === 'HOUSEHOLD') {
      return {
        allowed: false,
        reason: 'PERSONA_MISMATCH',
        featureKey,
        featureTitleUrdu: meta.titleUrdu,
        requiredPlan: 'DUAL_VIP_750',
      };
    }

    // Case 4: Plan tier check
    if (!meta.allowedPlans.includes(subscription.planKey)) {
      return {
        allowed: false,
        reason: 'FEATURE_GATE_LOCKED',
        featureKey,
        featureTitleUrdu: meta.titleUrdu,
        requiredPlan: meta.minimumPlan,
      };
    }

    // All checks passed!
    return {
      allowed: true,
      featureKey,
      featureTitleUrdu: meta.titleUrdu,
      requiredPlan: meta.minimumPlan,
      daysRemaining,
    };
  }

  /**
   * For Testing / QA: Instantly simulates month expiry to test plan auto-disabling.
   */
  async simulateMonthExpiry(): Promise<void> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_SUBSCRIPTION);
    if (raw) {
      const sub = JSON.parse(raw);
      // Set expiresAt to 1 day in the past
      sub.expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      sub.status = 'EXPIRED';
      sub.planKey = 'FREE_STARTER';
      await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(sub));
    }
  }

  /**
   * For Testing / QA: Resets user to Free Starter.
   */
  async resetToFreeStarter(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_SUBSCRIPTION, JSON.stringify(this.getDefaultFreeStarter()));
  }

  private getDefaultFreeStarter(): ISubscriptionRecord {
    return {
      planKey: 'FREE_STARTER',
      personaScope: 'DUKANDAR',
      status: 'TRIAL',
      subscribedAt: new Date().toISOString(),
      expiresAt: null,
      amountPaid: 0,
      paymentMethod: 'NONE',
      voucherApplied: null,
    };
  }
}

export const subscriptionService = new SubscriptionService();
