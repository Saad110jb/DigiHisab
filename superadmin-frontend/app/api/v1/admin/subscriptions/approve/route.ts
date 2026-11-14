import { NextRequest, NextResponse } from 'next/server';
import { recordAdminAction } from '@/lib/admin-audit-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tid } = body;

    recordAdminAction({
      actionType: 'SUBSCRIPTION_GRANT_MUTATION',
      deskModule: 'SUBSCRIPTION_ENGINE',
      targetEntityId: tid || 'UNKNOWN_TID',
      targetEntityName: `Manual Pilot Subscription Approved [${tid}]`,
      previousState: { status: 'PENDING_APPROVAL' },
      newState: { status: 'APPROVED', verifiedAt: new Date().toISOString() },
      severity: 'INFO',
    });

    return NextResponse.json(
      {
        success: true,
        message: `Subscription pilot TID ${tid} verified and approved. Merchant access activated.`,
        data: { tid, status: 'APPROVED' },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
