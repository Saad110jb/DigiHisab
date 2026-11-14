import { NextRequest, NextResponse } from 'next/server';
import { COLLUSION_RINGS_STORE, freezeCollusionRing } from '@/lib/fraud-store';

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
    return NextResponse.json(
      {
        success: true,
        data: {
          rings: COLLUSION_RINGS_STORE,
          totalRings: COLLUSION_RINGS_STORE.length,
          activeRings: COLLUSION_RINGS_STORE.filter((r) => r.status === 'ACTIVE').length
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
    const { ringId, action } = body;

    if (!ringId || action !== 'FREEZE_RING') {
      return NextResponse.json(
        { success: false, message: 'Valid ringId and action=FREEZE_RING are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = freezeCollusionRing(ringId);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: `Ring ${ringId} not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Entire collusion ring ${ringId} frozen. All ${updated.nodes.length} merchant accounts placed under forensic lockdown.`,
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
