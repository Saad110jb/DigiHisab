import { NextRequest, NextResponse } from 'next/server';
import {
  updateTierPrice,
  toggleTierActive,
  toggleTierFeature,
  SUBSCRIPTION_TIERS_STORE
} from '@/lib/subscription-store';
import { recordAdminAction } from '@/lib/admin-audit-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, newPrice, featureKey } = body;

    const currentTier = SUBSCRIPTION_TIERS_STORE.find((t) => t.id === id);
    if (!currentTier) {
      return NextResponse.json(
        { success: false, message: 'Tier not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    if (action === 'UPDATE_PRICE') {
      if (newPrice === undefined || isNaN(Number(newPrice)) || Number(newPrice) < 0) {
        return NextResponse.json(
          { success: false, message: 'Valid price is required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const oldPrice = currentTier.pricePKR;
      const updated = updateTierPrice(id, Number(newPrice));

      recordAdminAction({
        actionType: 'SUBSCRIPTION_PRICE_MUTATION',
        deskModule: 'SUBSCRIPTION_ENGINE',
        targetEntityId: id,
        targetEntityName: `${currentTier.name} (${currentTier.planKey})`,
        previousState: { pricePKR: oldPrice },
        newState: { pricePKR: Number(newPrice), grandfathered: true },
        severity: 'WARNING'
      });

      return NextResponse.json(
        {
          success: true,
          message: `Price for ${currentTier.name} updated to PKR ${newPrice}`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'TOGGLE_ACTIVE') {
      const updated = toggleTierActive(id);

      recordAdminAction({
        actionType: 'SUBSCRIPTION_TIER_TOGGLED',
        deskModule: 'SUBSCRIPTION_ENGINE',
        targetEntityId: id,
        targetEntityName: `${currentTier.name} (${currentTier.planKey})`,
        previousState: { isActive: !updated?.isActive },
        newState: { isActive: updated?.isActive },
        severity: 'INFO'
      });

      return NextResponse.json(
        {
          success: true,
          message: `Tier ${currentTier.name} visibility set to ${updated?.isActive ? 'ACTIVE' : 'OFF'}`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'TOGGLE_FEATURE') {
      if (!featureKey) {
        return NextResponse.json(
          { success: false, message: 'Feature key is required' },
          { status: 400, headers: corsHeaders }
        );
      }

      const updated = toggleTierFeature(id, featureKey);

      recordAdminAction({
        actionType: 'SUBSCRIPTION_FEATURE_TOGGLED',
        deskModule: 'SUBSCRIPTION_ENGINE',
        targetEntityId: id,
        targetEntityName: `${currentTier.name} - ${featureKey}`,
        previousState: null,
        newState: { featureKey, enabledInTier: updated?.allowedFeatures.includes(featureKey) },
        severity: 'INFO'
      });

      return NextResponse.json(
        {
          success: true,
          message: `Feature ${featureKey} toggled for ${currentTier.name}`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
