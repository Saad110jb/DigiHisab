import { NextRequest, NextResponse } from 'next/server';
import { evaluateClientHandshake } from '@/lib/app-versions-store';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientVersion =
      searchParams.get('version') ||
      request.headers.get('x-client-version') ||
      '2.4.1';
    const persona = (searchParams.get('persona') ||
      request.headers.get('x-persona') ||
      'DUKANDAR') as 'DUKANDAR' | 'HOUSEHOLD';

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const handshake = evaluateClientHandshake(clientVersion, persona, clientIp);

    return NextResponse.json(
      {
        success: true,
        data: handshake
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
