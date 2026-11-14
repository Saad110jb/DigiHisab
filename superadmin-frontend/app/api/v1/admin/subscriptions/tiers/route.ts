import { NextRequest, NextResponse } from 'next/server';
import {
  getTiers,
  getSubscriptionSummary,
  createTier,
  GLOBAL_FEATURE_GATES
} from '@/lib/subscription-store';
import { recordAdminAction } from '@/lib/admin-audit-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  try {
    const tiers = getTiers();
    const summary = getSubscriptionSummary();

    return NextResponse.json(
      {
        success: true,
        data: {
          tiers,
          summary,
          globalFeatures: GLOBAL_FEATURE_GATES
        }
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nameUrdu, planKey, personaScope, pricePKR, trialDays, quotas, allowedFeatures, featuresList } = body;

    if (!name || !planKey || pricePKR === undefined) {
      return NextResponse.json(
        { success: false, message: 'Plan name, key, and price are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const created = createTier({
      name,
      nameUrdu: nameUrdu || name,
      planKey,
      personaScope: personaScope || 'DUKANDAR_ONLY',
      pricePKR: Number(pricePKR),
      billingCycle: 'MONTHLY',
      trialDays: Number(trialDays) || 7,
      isActive: true,
      isRecommended: false,
      quotas: quotas || { maxCustomers: -1, maxSubAccounts: 1, monthlyWhatsAppReminders: 500, maxVaultAccounts: 2 },
      allowedFeatures: allowedFeatures || [],
      featuresList: featuresList || [],
      activeSubscribers: 0
    });

    recordAdminAction({
      actionType: 'SUBSCRIPTION_TIER_CREATED',
      deskModule: 'SUBSCRIPTION_ENGINE',
      targetEntityId: created.id,
      targetEntityName: `${created.name} (${created.planKey})`,
      previousState: null,
      newState: { planKey: created.planKey, pricePKR: created.pricePKR },
      severity: 'INFO'
    });

    return NextResponse.json(
      {
        success: true,
        message: 'New subscription plan created successfully.',
        data: created
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
