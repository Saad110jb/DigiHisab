import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminAuditLogs,
  generateSbpAuditCsv,
  recordAdminAction
} from '@/lib/admin-audit-store';

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
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const module = searchParams.get('module') || undefined;
    const severity = searchParams.get('severity') || undefined;

    const data = getAdminAuditLogs({ search, role, module, severity });

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
    const { action, filters } = body;

    if (action === 'EXPORT_SBP_CSV') {
      const data = getAdminAuditLogs(filters || {});
      const csv = generateSbpAuditCsv(data.logs);

      // Log the export itself as an immutable audit event
      recordAdminAction({
        actionType: 'SBP_AUDIT_REPORT_EXPORTED',
        deskModule: 'AUDIT_LOGS',
        targetEntityId: 'SBP-FORENSIC-EXPORT',
        targetEntityName: `State Bank Regulatory CSV Export (${data.logs.length} records)`,
        previousState: null,
        newState: { exportedRecordsCount: data.logs.length, exportFormat: 'CSV' },
        severity: 'INFO'
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="SBP_DigiHisab_Admin_Audit_Trail_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action.' },
      { status: 400, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
