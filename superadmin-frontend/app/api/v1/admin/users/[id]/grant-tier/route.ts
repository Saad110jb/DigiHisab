import { NextRequest, NextResponse } from 'next/server';
import { updateServerUser } from '@/lib/users-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { tier, days = 30, bypassReason = 'SuperAdmin Manual Override' } = body;

    if (!tier) {
      return NextResponse.json(
        { success: false, message: 'Tier is required' },
        { status: 400 }
      );
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + Number(days));
    const tierExpiry = expiryDate.toISOString().split('T')[0];

    const updated = updateServerUser(id, {
      tier,
      tierExpiry,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: `User ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Tier granted: ${tier} for ${days} days until ${tierExpiry}. Reason: ${bypassReason}`,
      data: { user: updated },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
