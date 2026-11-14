import { NextRequest, NextResponse } from 'next/server';
import {
  DISCO_SLABS_STORE,
  DISCO_SUMMARIES,
  getTariffSlabs,
  updateSlabRate,
  syncAllDiscosToNationalTariff
} from '@/lib/tariffs-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const disco = searchParams.get('disco') || 'ALL';
    const category = searchParams.get('category') || 'ALL';

    const slabs = getTariffSlabs(disco, category);

    return NextResponse.json(
      {
        success: true,
        data: {
          slabs,
          discos: DISCO_SUMMARIES,
          totalSlabs: DISCO_SLABS_STORE.length,
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
    const { action, slabId, baseRatePKR, fpaRatePKR } = body;

    if (action === 'SYNC_NATIONAL_TARIFF') {
      const allSlabs = syncAllDiscosToNationalTariff();
      return NextResponse.json(
        {
          success: true,
          message: 'All 4 DISCOs (LESCO, KE, IESCO, GEPCO) synchronized to NEPRA National Uniform Base Tariff Schedule under S.R.O. 279(I)/2026.',
          data: { totalSlabs: allSlabs.length, gazetteSro: 'S.R.O. 279(I)/2026' }
        },
        { headers: corsHeaders }
      );
    }

    if (!slabId || baseRatePKR === undefined) {
      return NextResponse.json(
        { success: false, message: 'slabId and baseRatePKR are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = updateSlabRate(slabId, Number(baseRatePKR), fpaRatePKR ? Number(fpaRatePKR) : undefined);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: `Slab ${slabId} not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Slab ${slabId} updated to Rs. ${baseRatePKR}/unit and synced with Ghar Ka Hisab mobile app.`,
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
