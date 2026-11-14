import { NextRequest, NextResponse } from 'next/server';
import { getCampaignsData, createCampaign } from '@/lib/marketing-store';
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
    const data = getCampaignsData();
    return NextResponse.json(
      {
        success: true,
        data
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
    const { campaignName, channel, utmSource, utmMedium, utmCampaign, cacPKR, totalSpendPKR } = body;

    if (!campaignName || !channel || !utmSource) {
      return NextResponse.json(
        { success: false, message: 'Campaign name, channel, and UTM source are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const created = createCampaign({
      campaignName,
      channel,
      utmSource,
      utmMedium: utmMedium || 'cpc',
      utmCampaign: utmCampaign || 'general',
      totalSignups: 0,
      paidConversions: 0,
      conversionRatePct: 0,
      cacPKR: Number(cacPKR) || 250,
      totalSpendPKR: Number(totalSpendPKR) || 0,
      generatedMrrPKR: 0,
      roasMultiplier: 0,
      status: 'ACTIVE',
      startDate: new Date().toISOString().split('T')[0]
    });

    recordAdminAction({
      actionType: 'MERCHANT_STATUS_MUTATION',
      deskModule: 'MARKETING_INTELLIGENCE',
      targetEntityId: created.id,
      targetEntityName: created.campaignName,
      previousState: null,
      newState: created,
      severity: 'INFO'
    });

    return NextResponse.json(
      {
        success: true,
        message: `Campaign "${created.campaignName}" created successfully with UTM tracking link.`,
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
