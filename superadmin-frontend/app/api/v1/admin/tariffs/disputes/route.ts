import { NextRequest, NextResponse } from 'next/server';
import {
  SHARED_UTILITY_DISPUTES_STORE,
  arbitrateDispute
} from '@/lib/tariffs-store';

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
    const counts = {
      total: SHARED_UTILITY_DISPUTES_STORE.length,
      pending: SHARED_UTILITY_DISPUTES_STORE.filter((d) => d.status === 'PENDING_AUDIT').length,
      adjustmentOrdered: SHARED_UTILITY_DISPUTES_STORE.filter((d) => d.status === 'ADJUSTMENT_ORDERED').length,
      resolved: SHARED_UTILITY_DISPUTES_STORE.filter((d) => d.status === 'RESOLVED').length
    };

    const totalContestedDifferencePKR = SHARED_UTILITY_DISPUTES_STORE.reduce(
      (acc, d) => acc + d.contestedDifferencePKR,
      0
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          disputes: SHARED_UTILITY_DISPUTES_STORE,
          counts,
          totalContestedDifferencePKR
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
    const { disputeId, action, fairCalculatedSharePKR } = body;

    if (!disputeId || !action) {
      return NextResponse.json(
        { success: false, message: 'disputeId and action are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = arbitrateDispute(
      disputeId,
      action,
      fairCalculatedSharePKR ? Number(fairCalculatedSharePKR) : undefined
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: `Dispute ${disputeId} not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          action === 'ORDER_ADJUSTMENT'
            ? `Fair adjustment ordered for dispute ${disputeId}. Tenant Khata credited with difference of Rs. ${updated.contestedDifferencePKR.toLocaleString()}.`
            : `Dispute ${disputeId} successfully resolved and closed.`,
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
