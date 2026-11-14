import { NextRequest, NextResponse } from 'next/server';
import { updateServerUser } from '@/lib/users-store';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || (action !== 'APPROVE' && action !== 'REJECT')) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be APPROVE or REJECT' },
        { status: 400 }
      );
    }

    const isApprove = action === 'APPROVE';
    const updated = updateServerUser(id, {
      isCnicVerified: isApprove,
      status: isApprove ? 'ACTIVE' : 'KYC_PENDING',
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: `User ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isApprove
        ? `KYC approved for ${updated.name}. SBP transaction limits expanded.`
        : `KYC rejected for ${updated.name}. Reason: ${rejectionReason || 'Documents illegible'}`,
      data: { user: updated },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
