import { NextRequest, NextResponse } from 'next/server';
import { approveAgentCommissionPayout, toggleAgentCodeStatus } from '@/lib/marketing-store';
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
    const { agentId, action } = body;

    if (!agentId) {
      return NextResponse.json(
        { success: false, message: 'Agent ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'APPROVE_PAYOUT') {
      const updated = approveAgentCommissionPayout(agentId);
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Agent not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      recordAdminAction({
        actionType: 'BTL_COMMISSION_PAYOUT_SETTLED',
        deskModule: 'MARKETING_INTELLIGENCE',
        targetEntityId: agentId,
        targetEntityName: `${updated.agentName} (${updated.promoCode})`,
        previousState: { payoutStatus: 'PENDING' },
        newState: { payoutStatus: 'DISBURSED', earnedCommissionPKR: updated.earnedCommissionPKR },
        severity: 'INFO'
      });

      return NextResponse.json(
        {
          success: true,
          message: `Approved JazzCash Commission Payout of PKR ${updated.earnedCommissionPKR.toLocaleString()} for ${updated.agentName}`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'TOGGLE_STATUS') {
      const updated = toggleAgentCodeStatus(agentId);
      return NextResponse.json(
        {
          success: true,
          message: `Toggled code status for agent ${agentId}`,
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
