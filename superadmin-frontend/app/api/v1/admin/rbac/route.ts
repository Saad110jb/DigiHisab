import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminUsers,
  getActiveAdmin,
  setActiveAdmin,
  updateAdminRole,
  updateAdminPassword,
  regenerateAdmin2FA,
  ROLE_PERMISSIONS,
} from '@/lib/admin-rbac-store';
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
    const users = getAdminUsers();
    const activeAdmin = getActiveAdmin();

    return NextResponse.json(
      {
        success: true,
        data: {
          activeAdmin,
          users,
          permissionsMatrix: ROLE_PERMISSIONS,
        },
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
    const { action, adminId, role, newPassword } = body;

    if (action === 'SWITCH_ADMIN') {
      if (!adminId) {
        return NextResponse.json(
          { success: false, message: 'adminId is required to switch session.' },
          { status: 400, headers: corsHeaders }
        );
      }
      const switched = setActiveAdmin(adminId);
      return NextResponse.json(
        {
          success: true,
          message: `Switched active session to ${switched.label || switched.name} (${switched.role}).`,
          data: switched,
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'UPDATE_ROLE') {
      if (!adminId || !role) {
        return NextResponse.json(
          { success: false, message: 'adminId and role are required.' },
          { status: 400, headers: corsHeaders }
        );
      }

      const users = getAdminUsers();
      const targetUser = users.find((u) => u.id === adminId);
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: 'Target admin user not found.' },
          { status: 404, headers: corsHeaders }
        );
      }

      const prevRole = targetUser.role;
      const updated = updateAdminRole(adminId, role);

      // Record immutable audit log
      recordAdminAction({
        actionType: 'ADMIN_ROLE_CHANGED',
        deskModule: 'RBAC_MANAGEMENT',
        targetEntityId: adminId,
        targetEntityName: `${targetUser.label || targetUser.name} (${adminId})`,
        previousState: { role: prevRole },
        newState: { role },
        severity: 'CRITICAL',
      });

      return NextResponse.json(
        {
          success: true,
          message: `Role for ${targetUser.label || targetUser.name} updated to ${role}. Immutable audit record logged.`,
          data: updated,
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'RESET_PASSWORD') {
      if (!adminId || !newPassword) {
        return NextResponse.json(
          { success: false, message: 'adminId and newPassword are required.' },
          { status: 400, headers: corsHeaders }
        );
      }
      const targetUser = getAdminUsers().find((u) => u.id === adminId);
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: 'Target admin user not found.' },
          { status: 404, headers: corsHeaders }
        );
      }
      const updated = updateAdminPassword(adminId, newPassword);
      recordAdminAction({
        actionType: 'ADMIN_ROLE_CHANGED',
        deskModule: 'RBAC_MANAGEMENT',
        targetEntityId: adminId,
        targetEntityName: `${targetUser.label || targetUser.name} (${adminId})`,
        previousState: { passwordRotated: false },
        newState: { passwordRotated: true },
        severity: 'CRITICAL',
      });
      return NextResponse.json(
        {
          success: true,
          message: `Password rotated successfully for ${targetUser.label || targetUser.name}.`,
          data: updated,
        },
        { headers: corsHeaders }
      );
    }

    if (action === 'REGENERATE_2FA') {
      if (!adminId) {
        return NextResponse.json(
          { success: false, message: 'adminId is required.' },
          { status: 400, headers: corsHeaders }
        );
      }
      const targetUser = getAdminUsers().find((u) => u.id === adminId);
      if (!targetUser) {
        return NextResponse.json(
          { success: false, message: 'Target admin user not found.' },
          { status: 404, headers: corsHeaders }
        );
      }
      const result = regenerateAdmin2FA(adminId);
      recordAdminAction({
        actionType: 'ADMIN_ROLE_CHANGED',
        deskModule: 'RBAC_MANAGEMENT',
        targetEntityId: adminId,
        targetEntityName: `${targetUser.label || targetUser.name} (${adminId})`,
        previousState: { totpRegenerated: false },
        newState: { totpRegenerated: true },
        severity: 'CRITICAL',
      });
      return NextResponse.json(
        {
          success: true,
          message: `2FA secret regenerated successfully for ${targetUser.label || targetUser.name}.`,
          data: result,
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action specified.' },
      { status: 400, headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
