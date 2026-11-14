import { NextRequest, NextResponse } from 'next/server';
import { getKycDocuments, updateKycStatus, runMockNadraVerisysCheck } from '@/lib/documents-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const documents = getKycDocuments(status);

    const counts = {
      total: getKycDocuments('ALL').length,
      pending: getKycDocuments('PENDING_REVIEW').length,
      approved: getKycDocuments('APPROVED').length,
      expiringSoon: getKycDocuments('EXPIRING_SOON').length,
      rejected: getKycDocuments('REJECTED').length
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          documents,
          counts
        }
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { docId, action, reason } = body;

    if (!docId || !action) {
      return NextResponse.json({ success: false, message: 'docId and action are required.' }, { status: 400, headers: corsHeaders });
    }

    if (action === 'VERISYS_CHECK') {
      const updated = runMockNadraVerisysCheck(docId);
      return NextResponse.json({
        success: true,
        message: 'Simulated NADRA Verisys query executed.',
        data: updated
      }, { headers: corsHeaders });
    }

    if (action === 'APPROVE') {
      const updated = updateKycStatus(docId, 'APPROVED');
      return NextResponse.json({
        success: true,
        message: 'Smart CNIC approved and SBP limits expanded.',
        data: updated
      }, { headers: corsHeaders });
    }

    if (action === 'REJECT') {
      const updated = updateKycStatus(docId, 'REJECTED', reason || 'Document rejected by compliance.');
      return NextResponse.json({
        success: true,
        message: 'Document rejected and notification queued for user.',
        data: updated
      }, { headers: corsHeaders });
    }

    return NextResponse.json({ success: false, message: 'Unknown action.' }, { status: 400, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500, headers: corsHeaders });
  }
}
