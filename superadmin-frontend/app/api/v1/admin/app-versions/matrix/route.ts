import { NextRequest, NextResponse } from 'next/server';
import {
  getVersionMatrixData,
  updateVersionSettings
} from '@/lib/app-versions-store';
import { broadcastAlertToClients } from '@/lib/notification-broadcast';

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
    const { versions, settings } = getVersionMatrixData();
    const totalInstalls = versions.reduce((acc, v) => acc + v.activeInstallsCount, 0);

    return NextResponse.json(
      {
        success: true,
        data: {
          versions,
          settings,
          totalInstalls,
          activeBuildsCount: versions.filter((v) => v.status === 'ACTIVE').length
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
    const updated = updateVersionSettings(body);

    // Broadcast version cutoff update notice
    await broadcastAlertToClients({
      titleEnglish: '📱 App Update Enforced',
      titleUrdu: '📱 نئی ایپ اپ ڈیٹ کی ضرورت',
      messageEnglish: `Minimum supported version for POS is now v${updated.dukanMinVersion}. Please update your devices.`,
      messageUrdu: `کاؤنٹر پی او ایس کے لیے کم از کم ورژن v${updated.dukanMinVersion} لازمی قرار دیا گیا ہے۔ گوگل پلے سے اپ ڈیٹ کریں۔`,
      priority: 'CRITICAL',
      category: 'SYSTEM_BROADCAST',
      targetAudience: 'ALL',
      durationMs: 7000
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Minimum supported version thresholds updated. Remote enforcement active.',
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
