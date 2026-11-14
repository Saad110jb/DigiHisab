import { NextRequest, NextResponse } from 'next/server';
import { PROMOS_STORE, createPromoCode } from '@/lib/marketing-store';
import { recordAdminAction } from '@/lib/admin-audit-store';

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
        data: PROMOS_STORE
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
    const { code, title, discountType, discountValue, maxRedemptions, cityRestricted, expiryDate } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { success: false, message: 'Code, discount type, and value are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const created = createPromoCode({
      code: code.toUpperCase().trim(),
      title: title || `${code} Promotional Voucher`,
      discountType,
      discountValue: Number(discountValue),
      cityRestricted: cityRestricted || undefined,
      totalRedemptions: 0,
      maxRedemptions: Number(maxRedemptions) || 100,
      totalSubsidizedBurnPKR: 0,
      generatedMrrPKR: 0,
      roiMultiplier: 0,
      status: 'ACTIVE',
      expiryDate: expiryDate || '2026-12-31'
    });

    recordAdminAction({
      actionType: 'MERCHANT_STATUS_MUTATION',
      deskModule: 'MARKETING_INTELLIGENCE',
      targetEntityId: `PROMO-${created.code}`,
      targetEntityName: created.title,
      previousState: null,
      newState: created,
      severity: 'INFO'
    });

    return NextResponse.json(
      {
        success: true,
        message: `Promo code "${created.code}" created and active across Pakistan.`,
        data: created
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
