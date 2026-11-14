import { NextRequest, NextResponse } from 'next/server';
import {
  SUBSCRIPTION_TIERS_STORE,
  updateTierPrice,
  toggleTierActive,
} from '@/lib/subscription-store';
import { recordAdminAction } from '@/lib/admin-audit-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: SUBSCRIPTION_TIERS_STORE,
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planKey, monthlyPrice, isVisible } = body;

    const tier = SUBSCRIPTION_TIERS_STORE.find(
      (t) => t.planKey === planKey || t.id === planKey
    );

    if (!tier) {
      return NextResponse.json(
        { success: false, message: `Tier with planKey ${planKey} not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    const oldPrice = tier.pricePKR;
    if (monthlyPrice !== undefined) {
      updateTierPrice(tier.id, Number(monthlyPrice));
    }
    if (isVisible !== undefined) {
      tier.isActive = Boolean(isVisible);
    }

    recordAdminAction({
      actionType: 'SUBSCRIPTION_PRICE_MUTATION',
      deskModule: 'SUBSCRIPTION_ENGINE',
      targetEntityId: tier.id,
      targetEntityName: `${tier.name} (${tier.planKey})`,
      previousState: { pricePKR: oldPrice },
      newState: { pricePKR: Number(monthlyPrice ?? oldPrice), isActive: tier.isActive },
      severity: 'WARNING',
    });

    return NextResponse.json(
      {
        success: true,
        message: `Plan ${planKey} updated successfully to Rs. ${monthlyPrice ?? oldPrice}`,
        data: tier,
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
