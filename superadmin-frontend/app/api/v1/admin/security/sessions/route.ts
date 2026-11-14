import { NextRequest, NextResponse } from 'next/server';

// Mock active sessions state for SuperAdmin console
let activeSessions = [
  {
    sessionId: 'SESS_SA_001',
    adminId: 'ADMIN_SUPER_01',
    device: 'Desktop Workstation (Chrome 122)',
    deviceFingerprint: 'DFP_A48B912C09FE',
    canvasHash: '0x8b417e29',
    ip: '119.160.67.21 (Nayatel Static Fiber - Faisalabad)',
    geoCountry: 'PK',
    locationStatus: 'GPS_VERIFIED',
    latitude: 31.4504,
    longitude: 73.135,
    loginTime: '24 mins ago',
    lastSeen: 'Just now',
    isCurrent: true,
  },
  {
    sessionId: 'SESS_SA_002',
    adminId: 'ADMIN_SUPER_01',
    device: 'MacBook Air M2 (Safari 17)',
    deviceFingerprint: 'DFP_7C19D42F110B',
    canvasHash: '0x3f120e88',
    ip: '39.40.112.5 (Zong 4G Corporate APN - Lahore)',
    geoCountry: 'PK',
    locationStatus: 'IP_ONLY',
    loginTime: '3 hours ago',
    lastSeen: '12 mins ago',
    isCurrent: false,
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      sessions: activeSessions,
      maxAllowedSessions: 1, // Strict single session policy
      enforceKillPriorSession: true,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { action, sessionId } = await request.json();

    if (action === 'TERMINATE_ALL_OTHER') {
      activeSessions = activeSessions.filter((s) => s.isCurrent);
      return NextResponse.json({
        success: true,
        message: 'All concurrent remote sessions terminated immediately.',
        activeCount: activeSessions.length,
      });
    }

    if (action === 'REVOKE_SESSION' && sessionId) {
      activeSessions = activeSessions.filter((s) => s.sessionId !== sessionId);
      return NextResponse.json({
        success: true,
        message: `Session ${sessionId} terminated. Client revoked from edge.`,
        activeCount: activeSessions.length,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
