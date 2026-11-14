import { NextRequest, NextResponse } from 'next/server';

let geofenceConfig = {
  pakistanGeofenceStrict: true,
  autoRejectNonPakistan: true,
  corporateVpnIps: [
    { ip: '119.160.67.21', label: 'Primary Office Nayatel Fiber (Faisalabad)', active: true },
    { ip: '39.40.112.5', label: 'Backup Corporate APN (Zong 4G)', active: true },
    { ip: '127.0.0.1', label: 'Local Development Relay', active: true },
  ],
  diasporaDevWhitelist: [
    { ip: '86.96.1.1', country: 'AE', label: 'Dubai Lead Engineer Gateway', active: true },
    { ip: '212.118.142.1', country: 'SA', label: 'Riyadh Infrastructure Node', active: true },
    { ip: '185.86.151.1', country: 'GB', label: 'London DevOps Mirror', active: true },
  ],
};

export async function GET() {
  return NextResponse.json({
    success: true,
    data: geofenceConfig,
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    geofenceConfig = { ...geofenceConfig, ...payload };
    return NextResponse.json({
      success: true,
      message: 'Geofence & IP Sentinel rules updated successfully.',
      data: geofenceConfig,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
