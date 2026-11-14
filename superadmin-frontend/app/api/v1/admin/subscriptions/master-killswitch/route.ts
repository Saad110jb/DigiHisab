import { NextResponse } from 'next/server';
import { toggleMasterKillSwitch, GLOBAL_SYSTEM_FLAGS } from '@/lib/subscription-store';
import { recordAdminAction } from '@/lib/admin-audit-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST() {
  try {
    const oldState = GLOBAL_SYSTEM_FLAGS.subscriptionEnforcementActive;
    const newState = toggleMasterKillSwitch();

    recordAdminAction({
      actionType: 'MASTER_SUBSCRIPTION_KILLSWITCH_TOGGLED',
      deskModule: 'SUBSCRIPTION_ENGINE',
      targetEntityId: 'SYS_FLAG:SUBSCRIPTION_ENFORCEMENT',
      targetEntityName: 'Master System Paywall Enforcement',
      previousState: { enforcementActive: oldState },
      newState: { enforcementActive: newState },
      severity: newState ? 'INFO' : 'CRITICAL'
    });

    return NextResponse.json(
      {
        success: true,
        message: newState
          ? 'Master Subscription Enforcement ACTIVATED (Paywalls Enforced)'
          : 'Master Subscription Enforcement BYPASSED (All Features Free to All Users)',
        data: { subscriptionEnforcementActive: newState }
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
