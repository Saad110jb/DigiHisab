import { NextRequest, NextResponse } from 'next/server';
import {
  getFeatureFlags,
  toggleFeatureFlag
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
    const flags = getFeatureFlags();
    return NextResponse.json(
      {
        success: true,
        data: {
          flags,
          totalFlags: flags.length,
          activeFlags: flags.filter((f) => f.isEnabled).length
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
    const { key, isEnabled, rolloutPercentage } = body;

    if (!key || isEnabled === undefined) {
      return NextResponse.json(
        { success: false, message: 'key and isEnabled boolean are required.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const updated = toggleFeatureFlag(key, Boolean(isEnabled), rolloutPercentage);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: `Feature flag ${key} not found.` },
        { status: 404, headers: corsHeaders }
      );
    }

    // Broadcast feature kill switch status notification to merchants
    await broadcastAlertToClients({
      titleEnglish: updated.isEnabled
        ? `✅ Feature Active: ${updated.title}`
        : `⚠️ Gateway Paused: ${updated.title}`,
      titleUrdu: updated.isEnabled
        ? `✅ فیچر بحال: ${updated.title}`
        : `⚠️ فیچر معطل: ${updated.title}`,
      messageEnglish: updated.isEnabled
        ? `${updated.title} is now enabled for counter transactions.`
        : `${updated.title} is temporarily paused for gateway maintenance. Please use alternative methods.`,
      messageUrdu: updated.isEnabled
        ? `${updated.title} دوبارہ فعال ہو چکا ہے۔ کاؤنٹر اندراج جاری رکھیں۔`
        : `${updated.title} عارضی دیکھ بھال کے لیے معطل کیا گیا ہے۔ براہ کرم وقتی طور پر متبادل طریقہ استعمال کریں۔`,
      priority: updated.isEnabled ? 'SUCCESS' : 'WARNING',
      category: 'SYSTEM_BROADCAST',
      targetAudience: updated.affectedPersonas.includes('DUKANDAR') && updated.affectedPersonas.includes('HOUSEHOLD')
        ? 'ALL'
        : updated.affectedPersonas.includes('DUKANDAR')
        ? 'DUKANDAR'
        : 'HOUSEHOLD',
      durationMs: 6000
    });

    // Record immutable administrative audit log
    recordAdminAction({
      actionType: updated.isEnabled ? 'FEATURE_FLAG_RESTORED' : 'FEATURE_FLAG_KILLED',
      deskModule: 'APP_VERSIONING',
      targetEntityId: `FLAG-${updated.key}`,
      targetEntityName: updated.title,
      previousState: { isEnabled: !updated.isEnabled },
      newState: { isEnabled: updated.isEnabled, rolloutPercentage: updated.rolloutPercentage },
      severity: updated.isEnabled ? 'INFO' : 'WARNING'
    });

    return NextResponse.json(
      {
        success: true,
        message: `Feature flag "${updated.title}" ${updated.isEnabled ? 'ENABLED' : 'DISABLED'} successfully.`,
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
