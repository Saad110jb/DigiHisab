import { NextRequest, NextResponse } from 'next/server';
import { rewardAdvocateMerchant } from '@/lib/marketing-store';
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
    const { merchantId } = body;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, message: 'Merchant ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = rewardAdvocateMerchant(merchantId);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    recordAdminAction({
      actionType: 'SBP_AUDIT_REPORT_EXPORTED', // or general admin reward
      deskModule: 'MARKETING_INTELLIGENCE',
      targetEntityId: merchantId,
      targetEntityName: `${updated.merchantName} (${updated.storeName})`,
      previousState: { freeMonthsGranted: updated.freeMonthsGranted - 1 },
      newState: { freeMonthsGranted: updated.freeMonthsGranted, reward: '1_MONTH_FREE_PRO' },
      severity: 'INFO'
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully granted 1 Free Pro Month to ${updated.merchantName} (${updated.storeName})`,
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
