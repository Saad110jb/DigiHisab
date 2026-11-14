import { NextRequest, NextResponse } from 'next/server';
import {
  FRAUD_INCIDENTS_STORE,
  TILL_DISCREPANCIES_STORE,
  NEGATIVE_STOCK_STORE,
  VELOCITY_SPIKES_STORE,
  getFraudIncidents,
  updateIncidentStatus,
  freezeAccountByIncident,
  triggerSurpriseTillAudit
} from '@/lib/fraud-store';

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
    const type = searchParams.get('type') || 'ALL';
    const severity = searchParams.get('severity') || 'ALL';

    const incidents = getFraudIncidents(type, severity);

    const counts = {
      total: FRAUD_INCIDENTS_STORE.length,
      critical: FRAUD_INCIDENTS_STORE.filter((i) => i.severity === 'CRITICAL').length,
      high: FRAUD_INCIDENTS_STORE.filter((i) => i.severity === 'HIGH').length,
      medium: FRAUD_INCIDENTS_STORE.filter((i) => i.severity === 'MEDIUM').length,
      open: FRAUD_INCIDENTS_STORE.filter((i) => i.status === 'OPEN').length,
      frozen: FRAUD_INCIDENTS_STORE.filter((i) => i.status === 'FROZEN').length
    };

    const totalAtRiskPKR = FRAUD_INCIDENTS_STORE.reduce((acc, i) => {
      const amt = i.metrics.amountPKR || i.metrics.phantomSaleValuePKR || i.metrics.shortagePKR || 0;
      return acc + amt;
    }, 0);

    return NextResponse.json(
      {
        success: true,
        data: {
          incidents,
          counts,
          totalAtRiskPKR,
          tillDiscrepancies: TILL_DISCREPANCIES_STORE,
          negativeStock: NEGATIVE_STOCK_STORE,
          velocitySpikes: VELOCITY_SPIKES_STORE
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
    const { action, incidentId, recordId } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, message: 'Action is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action === 'FREEZE_ACCOUNT') {
      const updated = freezeAccountByIncident(incidentId);
      if (!updated) {
        return NextResponse.json(
          { success: false, message: `Incident ${incidentId} not found.` },
          { status: 404, headers: corsHeaders }
        );
      }
      return NextResponse.json(
        {
          success: true,
          message: `Account associated with ${incidentId} has been administratively FROZEN. All till sessions terminated.`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'DISMISS') {
      const updated = updateIncidentStatus(incidentId, 'FALSE_POSITIVE');
      return NextResponse.json(
        {
          success: true,
          message: `Incident ${incidentId} dismissed as False Positive.`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'RESOLVE') {
      const updated = updateIncidentStatus(incidentId, 'RESOLVED');
      return NextResponse.json(
        {
          success: true,
          message: `Incident ${incidentId} marked as RESOLVED.`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'TRIGGER_SURPRISE_AUDIT') {
      const updated = triggerSurpriseTillAudit(recordId);
      return NextResponse.json(
        {
          success: true,
          message: `Surprise physical cash drawer audit dispatched for store record ${recordId}.`,
          data: updated
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, message: `Unknown action: ${action}` },
      { status: 400, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
