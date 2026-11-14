import { NextRequest, NextResponse } from 'next/server';
import {
  getMaintenanceConfig,
  setMaintenanceMode
} from '@/lib/app-versions-store';
import { broadcastAlertToClients } from '@/lib/notification-broadcast';
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
    const config = getMaintenanceConfig();
    return NextResponse.json(
      {
        success: true,
        data: config
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
    const { isActive, durationMinutes, customUrduMsg } = body;

    if (isActive === undefined) {
      return NextResponse.json(
        { success: false, message: 'isActive boolean is required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = setMaintenanceMode(
      Boolean(isActive),
      durationMinutes ? Number(durationMinutes) : 45,
      customUrduMsg
    );

    // Broadcast instant push & in-app notification across Android POS devices
    await broadcastAlertToClients({
      titleEnglish: updated.isActive
        ? '🚨 Emergency Maintenance Active'
        : '✅ System Online - POS Restored',
      titleUrdu: updated.isActive
        ? '🚨 ایمرجنسی سسٹم مینٹیننس - Digi Hisab'
        : '✅ سسٹم سروس بحال ہو گئی ہے - Digi Hisab',
      messageEnglish: updated.isActive
        ? `System upgrade in progress for ${updated.durationMinutes}m. Ledgers and balances are secure.`
        : 'System maintenance completed. All POS cashier and ledger features are now online.',
      messageUrdu: updated.isActive
        ? (updated.urduMessage || 'سسٹم اپ گریڈ جاری ہے۔ آپ کا کھاتہ، کسٹمر بیلنس اور ڈیٹا 100% محفوظ ہے۔')
        : 'دیکھ بھال کا کام مکمل ہو چکا ہے۔ تمام کاؤنٹر سیل اور کھاتہ سروسز بحال ہیں۔',
      priority: updated.isActive ? 'CRITICAL' : 'SUCCESS',
      category: 'SYSTEM_BROADCAST',
      targetAudience: 'ALL',
      durationMs: 8000
    });

    // Record immutable audit log
    recordAdminAction({
      actionType: updated.isActive ? 'EMERGENCY_MAINTENANCE_TRIGGER' : 'EMERGENCY_MAINTENANCE_DEACTIVATE',
      deskModule: 'APP_VERSIONING',
      targetEntityId: 'MAINTENANCE_SENTINEL',
      targetEntityName: 'All Pakistan POS Terminals',
      previousState: { isActive: !updated.isActive },
      newState: { isActive: updated.isActive, durationMinutes: updated.durationMinutes, estEndTime: updated.estimatedEndTime },
      severity: updated.isActive ? 'CRITICAL' : 'INFO'
    });

    return NextResponse.json(
      {
        success: true,
        message: updated.isActive
          ? `EMERGENCY MAINTENANCE ACTIVATED. All mobile POS apps locked with polite Urdu screen for ${updated.durationMinutes} minutes.`
          : 'Maintenance mode deactivated. All POS tablets and mobile clients restored.',
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
