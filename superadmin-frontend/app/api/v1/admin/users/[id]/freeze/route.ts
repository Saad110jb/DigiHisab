import { NextRequest, NextResponse } from 'next/server';
import { updateServerUser } from '@/lib/users-store';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    if (!status || (status !== 'FROZEN' && status !== 'ACTIVE')) {
      return NextResponse.json(
        { success: false, message: 'Invalid status. Must be FROZEN or ACTIVE' },
        { status: 400 }
      );
    }

    const updated = updateServerUser(id, {
      status,
      failedPinAttempts: status === 'ACTIVE' ? 0 : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: `User ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        status === 'FROZEN'
          ? `User ${updated.name} frozen. Mutations locked & JWT sessions invalidated.`
          : `User ${updated.name} unfrozen. Ledger mutations re-enabled.`,
      data: { user: updated },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
