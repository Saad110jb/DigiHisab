import { NextRequest, NextResponse } from 'next/server';
import { toggleGlobalFeatureFlag } from '@/lib/subscription-store';
import { recordAdminAction } from '@/lib/admin-audit-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, message: 'Feature key is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = toggleGlobalFeatureFlag(key);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Feature not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    recordAdminAction({
      actionType: updated.isGloballyEnabled ? 'FEATURE_FLAG_RESTORED' : 'FEATURE_FLAG_KILLED',
      deskModule: 'SUBSCRIPTION_ENGINE',
      targetEntityId: key,
      targetEntityName: `${updated.labelEnglish} (${updated.labelUrdu})`,
      previousState: { isGloballyEnabled: !updated.isGloballyEnabled },
      newState: { isGloballyEnabled: updated.isGloballyEnabled },
      severity: updated.isGloballyEnabled ? 'INFO' : 'WARNING'
    });

    return NextResponse.json(
      {
        success: true,
        message: `Global feature ${updated.labelEnglish} is now ${updated.isGloballyEnabled ? 'ENABLED' : 'DISABLED'}`,
        data: updated
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
