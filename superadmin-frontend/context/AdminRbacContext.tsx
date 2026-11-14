'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { IAdminUser, AdminRole, IRolePermission } from '@/types/rbac';

interface AdminRbacContextType {
  activeAdmin: IAdminUser | null;
  allAdmins: IAdminUser[];
  permissionsMatrix: Record<AdminRole, IRolePermission[]> | null;
  switchActiveAdmin: (id: string) => Promise<boolean>;
  updateRole: (adminId: string, role: AdminRole) => Promise<boolean>;
  resetPassword: (adminId: string, newPassword: string) => Promise<boolean>;
  regenerate2FA: (adminId: string) => Promise<{ success: boolean; secret?: string }>;
  checkAccess: (pathname: string) => { allowed: boolean; isReadOnly: boolean; reason?: string };
  isReadOnly: boolean;
  isLoading: boolean;
  refreshRbac: () => Promise<void>;
}

const AdminRbacContext = createContext<AdminRbacContextType | undefined>(undefined);

export const AdminRbacProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeAdmin, setActiveAdminState] = useState<IAdminUser | null>(null);
  const [allAdmins, setAllAdmins] = useState<IAdminUser[]>([]);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<AdminRole, IRolePermission[]> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRbacData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/v1/admin/rbac');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveAdminState(json.data.activeAdmin);
          setAllAdmins(json.data.users || []);
          setPermissionsMatrix(json.data.permissionsMatrix || null);
        }
      }
    } catch (err) {
      console.error('Failed to load RBAC context:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRbacData();
  }, [fetchRbacData]);

  const switchActiveAdmin = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SWITCH_ADMIN', adminId: id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveAdminState(json.data);
          await fetchRbacData();
          return true;
        }
      }
    } catch (err) {
      console.error('Error switching admin session:', err);
    }
    return false;
  };

  const updateRole = async (adminId: string, role: AdminRole): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_ROLE', adminId, role }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          await fetchRbacData();
          return true;
        }
      }
    } catch (err) {
      console.error('Error updating admin role:', err);
    }
    return false;
  };

  const resetPassword = async (adminId: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/v1/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_PASSWORD', adminId, newPassword }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          await fetchRbacData();
          return true;
        }
      }
    } catch (err) {
      console.error('Error resetting admin password:', err);
    }
    return false;
  };

  const regenerate2FA = async (adminId: string): Promise<{ success: boolean; secret?: string }> => {
    try {
      const res = await fetch('/api/v1/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REGENERATE_2FA', adminId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          await fetchRbacData();
          return { success: true, secret: json.data?.newSecret };
        }
      }
    } catch (err) {
      console.error('Error regenerating 2FA secret:', err);
    }
    return { success: false };
  };

  const checkAccess = useCallback(
    (pathname: string): { allowed: boolean; isReadOnly: boolean; reason?: string } => {
      if (!activeAdmin || !permissionsMatrix) {
        return { allowed: true, isReadOnly: false }; // Optimistic while loading
      }

      // Root SuperAdmin has full unrestricted access
      if (activeAdmin.role === 'ROOT_SUPERADMIN') {
        return { allowed: true, isReadOnly: false };
      }

      const rolePerms = permissionsMatrix[activeAdmin.role] || [];

      // Check if pathname matches any permitted route (exact or prefix)
      const matched = rolePerms.find((p) => {
        if (p.route === '/admin') {
          return pathname === '/admin' || pathname === '/admin/';
        }
        return pathname === p.route || pathname.startsWith(p.route + '/');
      });

      if (!matched) {
        const roleHuman = activeAdmin.role.replace('_', ' ');
        return {
          allowed: false,
          isReadOnly: false,
          reason: `آپ کا ایڈمن رول (${roleHuman}) اس ماڈیول تک رسائی کا مجاز نہیں ہے۔ برائے مہربانی روٹ ایڈمن سے رابطہ کریں۔`,
        };
      }

      return {
        allowed: true,
        isReadOnly: matched.isReadOnly,
      };
    },
    [activeAdmin, permissionsMatrix]
  );

  const isReadOnly = activeAdmin?.role === 'FINANCIAL_AUDITOR';

  return (
    <AdminRbacContext.Provider
      value={{
        activeAdmin,
        allAdmins,
        permissionsMatrix,
        switchActiveAdmin,
        updateRole,
        resetPassword,
        regenerate2FA,
        checkAccess,
        isReadOnly,
        isLoading,
        refreshRbac: fetchRbacData,
      }}
    >
      {children}
    </AdminRbacContext.Provider>
  );
};

export const useAdminRbac = (): AdminRbacContextType => {
  const context = useContext(AdminRbacContext);
  if (!context) {
    throw new Error('useAdminRbac must be used within an AdminRbacProvider');
  }
  return context;
};
