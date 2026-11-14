import {
  AdminUserRecord,
  AdminUsersApiResponse,
  KycActionPayload,
  FreezeActionPayload,
  GrantTierPayload,
  ResetPinPayload,
  SendEmailPayload,
  UserTier,
} from '@/types/admin';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export class AdminApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.data = data;
  }
}

export async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let authHeaders: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('digihisab_admin_jwt');
    if (localToken) {
      authHeaders['Authorization'] = `Bearer ${localToken}`;
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new AdminApiError(
      errorData.message || `API Error: ${res.status} ${res.statusText}`,
      res.status,
      errorData
    );
  }

  return res.json();
}

export interface GetUsersParams {
  search?: string;
  persona?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export const adminUserService = {
  getUsers: (params: GetUsersParams = {}, signal?: AbortSignal) => {
    const queryParams = new URLSearchParams();
    if (params.search && params.search.trim() !== '') {
      queryParams.set('search', params.search.trim());
    }
    if (params.persona && params.persona !== 'ALL') {
      queryParams.set('persona', params.persona);
    }
    if (params.status && params.status !== 'ALL') {
      queryParams.set('status', params.status);
    }
    if (params.page) {
      queryParams.set('page', params.page.toString());
    }
    if (params.limit) {
      queryParams.set('limit', params.limit.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;

    return adminFetch<AdminUsersApiResponse>(endpoint, {
      method: 'GET',
      signal,
    });
  },

  updateKyc: (userId: string, action: 'APPROVE' | 'REJECT', rejectionReason?: string) =>
    adminFetch<{ success: boolean; data: { user: AdminUserRecord }; message: string }>(
      `/admin/users/${userId}/kyc`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action, rejectionReason } as KycActionPayload),
      }
    ),

  toggleFreeze: (userId: string, newStatus: 'FROZEN' | 'ACTIVE', reason = 'Admin Action') =>
    adminFetch<{ success: boolean; data: { user: AdminUserRecord }; message: string }>(
      `/admin/users/${userId}/freeze`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, reason } as FreezeActionPayload),
      }
    ),

  grantTier: (userId: string, tier: UserTier, days: number = 30, bypassReason = 'SuperAdmin Manual Override') =>
    adminFetch<{ success: boolean; data: { user: AdminUserRecord }; message: string }>(
      `/admin/users/${userId}/grant-tier`,
      {
        method: 'POST',
        body: JSON.stringify({ tier, days, bypassReason } as GrantTierPayload),
      }
    ),

  resetPin: (userId: string, deliveryMethod: 'SMS_OTP' | 'WHATSAPP_OTP' | 'EMAIL_OTP' = 'SMS_OTP') =>
    adminFetch<{ success: boolean; message: string; data?: { phone: string } }>(
      `/admin/users/${userId}/reset-pin`,
      {
        method: 'POST',
        body: JSON.stringify({ deliveryMethod } as ResetPinPayload),
      }
    ),

  sendDirectUserEmail: (userId: string, payload: { type: 'WELCOME' | 'OTP' | 'CUSTOM'; customSubject?: string; customBody?: string; customBodyUrdu?: string; updateEmail?: string }) =>
    adminFetch<{ success: boolean; message: string; data?: any }>(
      `/admin/users/${userId}/email`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  dispatchBulkEmail: (payload: SendEmailPayload) =>
    adminFetch<{ success: boolean; message: string; data?: any }>(
      `/admin/email/dispatch`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  testSmtpConnection: () =>
    adminFetch<{ success: boolean; message: string; host: string; user: string; port: string }>(
      `/admin/email/test`
    ),

  get2faSetup: () =>
    adminFetch<{ success: boolean; data: { secret: string; qrCodeDataUrl: string; backupCodes: string[]; is2faEnabled: boolean } }>(
      `/admin/auth/2fa/setup`
    ),

  verify2faToken: (token: string, codeType: 'TOTP' | 'BREAK_GLASS' = 'TOTP') =>
    adminFetch<{ success: boolean; message: string; method: string }>(
      `/admin/auth/2fa/verify`,
      {
        method: 'POST',
        body: JSON.stringify({ token, codeType }),
      }
    ),

  getBreakGlassCodes: () =>
    adminFetch<{ success: boolean; data: { codes: { code: string; used: boolean }[]; activeCount: number } }>(
      `/admin/auth/2fa/break-glass`
    ),

  regenerateBreakGlassCodes: () =>
    adminFetch<{ success: boolean; message: string; data: { codes: any[]; rawCodes: string[] } }>(
      `/admin/auth/2fa/break-glass`,
      {
        method: 'POST',
      }
    ),

  dispatchNotificationBroadcast: (payload: {
    title: string;
    body: string;
    titleUrdu?: string;
    bodyUrdu?: string;
    targetAudience: 'ALL' | 'DUKANDAR' | 'HOUSEHOLD';
    channel: 'BOTH' | 'FCM_PUSH' | 'IN_APP_TOAST';
    deepLinkRoute?: string;
    soundAlert?: string;
  }) =>
    adminFetch<{
      success: boolean;
      message: string;
      data: {
        targetAudience: string;
        channel: string;
        estimatedDevicesReached: number;
        liveSseClientsDispatched: number;
        notification: any;
      };
    }>(`/admin/notifications/broadcast`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyStepUpAuth: (payload: {
    credential: string;
    type: 'TOTP' | 'PASSWORD';
    actionName: string;
    targetId?: string;
  }) =>
    adminFetch<{
      success: boolean;
      message: string;
      stepUpToken?: string;
      expiresAt?: number;
      actionName?: string;
    }>(`/admin/auth/step-up`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getActiveSessions: () =>
    adminFetch<{
      success: boolean;
      data: {
        sessions: any[];
        maxAllowedSessions: number;
        enforceKillPriorSession: boolean;
      };
    }>(`/admin/security/sessions`),

  terminateSession: (sessionId: string) =>
    adminFetch<{ success: boolean; message: string; activeCount: number }>(`/admin/security/sessions`, {
      method: 'POST',
      body: JSON.stringify({ action: 'REVOKE_SESSION', sessionId }),
    }),

  terminateAllOtherSessions: () =>
    adminFetch<{ success: boolean; message: string; activeCount: number }>(`/admin/security/sessions`, {
      method: 'POST',
      body: JSON.stringify({ action: 'TERMINATE_ALL_OTHER' }),
    }),

  getGeofenceConfig: () =>
    adminFetch<{
      success: boolean;
      data: {
        pakistanGeofenceStrict: boolean;
        autoRejectNonPakistan: boolean;
        corporateVpnIps: any[];
        diasporaDevWhitelist: any[];
      };
    }>(`/admin/security/geofence`),

  updateGeofenceConfig: (payload: any) =>
    adminFetch<{ success: boolean; message: string; data: any }>(`/admin/security/geofence`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
