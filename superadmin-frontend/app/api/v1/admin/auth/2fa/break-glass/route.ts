import { NextRequest, NextResponse } from 'next/server';
import { generateNewBreakGlassCodes } from '@/lib/auth/break-glass';
import { superAdminSecurityState } from '@/lib/auth/totp';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      codes: superAdminSecurityState.emergencyCodes,
      activeCount: superAdminSecurityState.emergencyCodes.filter((c) => !c.used).length,
    },
  });
}

export async function POST() {
  const newCodes = generateNewBreakGlassCodes();
  return NextResponse.json({
    success: true,
    message: '10 fresh emergency break-glass codes generated. Previous codes invalidated.',
    data: {
      codes: superAdminSecurityState.emergencyCodes,
      rawCodes: newCodes,
    },
  });
}
