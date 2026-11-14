import { NextRequest, NextResponse } from 'next/server';
import { BTL_AGENTS_STORE, settleBtlAgentPayout, addBtlAgent } from '@/lib/marketing-store';
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
      data: BTL_AGENTS_STORE
    },
    { headers: corsHeaders }
  );
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, action } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Agent code is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'SETTLE_PAYOUT') {
      const updated = settleBtlAgentPayout(code);
      if (!updated) {
        return NextResponse.json(
          { success: false, message: 'Agent not found' },
          { status: 404, headers: corsHeaders }
        );
      }

      recordAdminAction({
        actionType: 'BTL_COMMISSION_PAYOUT_SETTLED',
        deskModule: 'MARKETING_INTELLIGENCE',
        targetEntityId: code,
        targetEntityName: `${updated.agentName} (${updated.assignedBazaar})`,
        previousState: { settlementStatus: 'PENDING', totalEarnedPKR: updated.totalEarnedPKR },
        newState: { settlementStatus: 'PAID', lastPayoutDate: updated.lastPayoutDate },
        severity: 'INFO'
      });

      return NextResponse.json(
        {
          success: true,
          message: `Commission payout settled for agent ${updated.agentName}`,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, agentName, assignedBazaar, city, phone, commissionRatePKR } = body;

    if (!code || !agentName || !assignedBazaar || !city) {
      return NextResponse.json(
        { success: false, message: 'Code, agent name, assigned bazaar, and city are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const newAgent = addBtlAgent({
      code: code.toUpperCase().trim(),
      agentName,
      assignedBazaar,
      city,
      phone: phone || '0300-0000000',
      merchantsOnboarded: 0,
      paidUpgrades: 0,
      commissionRatePKR: Number(commissionRatePKR) || 150,
      totalEarnedPKR: 0,
      settlementStatus: 'PENDING'
    });

    recordAdminAction({
      actionType: 'BTL_AGENT_ENROLLED',
      deskModule: 'MARKETING_INTELLIGENCE',
      targetEntityId: newAgent.code,
      targetEntityName: `${newAgent.agentName} (${newAgent.assignedBazaar}, ${newAgent.city})`,
      previousState: null,
      newState: { code: newAgent.code, agentName: newAgent.agentName, commissionRatePKR: newAgent.commissionRatePKR },
      severity: 'INFO'
    });

    return NextResponse.json(
      {
        success: true,
        message: 'BTL Field Agent registered successfully',
        data: newAgent
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
