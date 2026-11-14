import { NextRequest, NextResponse } from 'next/server';
import { updateServerUser, serverUsersDb } from '@/lib/users-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { deliveryMethod = 'SMS_OTP' } = body;

    const user = serverUsersDb.find((u) => u.id === id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: `User ${id} not found` },
        { status: 404 }
      );
    }

    // Reset failed pin attempts and issue one-time OTP
    updateServerUser(id, { failedPinAttempts: 0 });

    const generatedOtp = Math.floor(1000 + Math.random() * 9000);

    return NextResponse.json({
      success: true,
      message: `4-Digit Security PIN reset OTP (${generatedOtp}) dispatched to ${user.phone} via ${deliveryMethod}.`,
      data: {
        phone: user.phone,
        deliveryMethod,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
