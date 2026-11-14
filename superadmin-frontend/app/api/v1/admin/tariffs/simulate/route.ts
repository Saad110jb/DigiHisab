import { NextRequest, NextResponse } from 'next/server';
import { calculateSubMeterSplit } from '@/lib/tariffs-store';
import { DiscoCode } from '@/types/tariffs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { disco, masterUnits, masterBillAmountPKR, subTenants } = body;

    if (!disco || masterUnits === undefined || masterBillAmountPKR === undefined || !Array.isArray(subTenants)) {
      return NextResponse.json(
        { success: false, message: 'Invalid payload. disco, masterUnits, masterBillAmountPKR and subTenants array required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const simulation = calculateSubMeterSplit(
      disco as DiscoCode,
      Number(masterUnits),
      Number(masterBillAmountPKR),
      subTenants
    );

    return NextResponse.json(
      {
        success: true,
        data: simulation
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
