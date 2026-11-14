'use client';

import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  UserCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Edit,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAdminRbac } from '@/context/AdminRbacContext';
import { AdminRole } from '@/types/rbac';
import { RegisteredAdminDirectory } from '@/components/rbac/RegisteredAdminDirectory';

export default function RbacManagementPage() {
  const { allAdmins, activeAdmin, switchActiveAdmin, updateRole, permissionsMatrix } = useAdminRbac();
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<AdminRole>('ROOT_SUPERADMIN');
  const [updating, setUpdating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRoleUpdate = async () => {
    if (!editingAdminId) return;
    try {
      setUpdating(true);
      const success = await updateRole(editingAdminId, selectedNewRole);
      if (success) {
        showToast('✅ Role updated successfully. Chained audit log recorded.');
        setEditingAdminId(null);
      } else {
        showToast('Role update failed.');
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const rolesConfig: { role: AdminRole; label: string; badgeClass: string; desc: string }[] = [
    {
      role: 'ROOT_SUPERADMIN',
      label: '👑 Root SuperAdmin',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      desc: 'Full unconstrained platform control, database overrides, emergency maintenance and operational kill switches.',
    },
    {
      role: 'COMPLIANCE_OFFICER',
      label: '🛡️ Compliance Officer',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      desc: 'Access strictly restricted to Dual CNIC OCR verification, KYC document audits, and merchant status reviews.',
    },
    {
      role: 'DISPUTE_RESOLVER',
      label: '⚖️ Dispute Resolver',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      desc: 'Access restricted to customer khata complaints, sub-meter tenant disputes, and WhatsApp support desks.',
    },
    {
      role: 'FINANCIAL_AUDITOR',
      label: '📊 Financial Auditor',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      desc: 'Read-only access across MRR, GMV, Tariffs, and payment gateway reconciliation. Mutation buttons disabled.',
    },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#00d49f] text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs animate-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              SBP ROLE-BASED ACCESS CONTROL (RBAC)
            </span>
            <span className="text-xs text-slate-400 font-mono">Four-Tier Granular Security Desk</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1.5 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-emerald-400" />
            <span>Administrator Directory &amp; Role Governance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Enforces strict separation of duties across Digi Hisab administrators in compliance with State Bank of Pakistan digital banking circulars.
          </p>
        </div>

        {/* Current Active Indicator */}
        <div className="p-3 rounded-2xl bg-[#09111e] border border-[#00d49f]/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#070d18] border border-[#00d49f]/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#00d49f]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-white">{activeAdmin?.label || 'SuperAdmin Master Node'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00d49f]/20 text-[#00d49f] border border-[#00d49f]/40">
                ACTIVE SESSION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">{activeAdmin?.email || 'admin.node01@digihisab.pk'}</p>
          </div>
        </div>
      </div>

      {/* Refactored Registered Administrator Directory */}
      <RegisteredAdminDirectory />

      {/* Role Permission Breakdown Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <span>Four-Tier Role Permission Matrix</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rolesConfig.map((cfg) => {
            const perms = permissionsMatrix ? permissionsMatrix[cfg.role] || [] : [];
            const writeCount = perms.filter((p) => p.canWrite).length;
            const readOnlyCount = perms.filter((p) => p.isReadOnly).length;

            return (
              <div
                key={cfg.role}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${cfg.badgeClass}`}>
                      {cfg.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{cfg.desc}</p>

                  <div className="p-3 rounded-2xl bg-[#070e1b] border border-slate-800/80 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Write / Mutate:</span>
                      <span className="text-emerald-400 font-bold">{writeCount} Desks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Read-Only Mode:</span>
                      <span className="text-purple-400 font-bold">{readOnlyCount} Desks</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-500 block">Accessible Desks:</span>
                  <div className="flex flex-wrap gap-1">
                    {perms.map((p) => (
                      <span
                        key={p.moduleKey}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                          p.isReadOnly
                            ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {p.moduleName} {p.isReadOnly ? '(RO)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Change Role Modal */}
      {editingAdminId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border border-[#1b2b48] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Assign New Administrator Role</h3>
            <p className="text-xs text-slate-400">
              Role changes take effect immediately and are cryptographically recorded in the SBP audit trail.
            </p>

            <div className="space-y-2">
              {rolesConfig.map((r) => (
                <div
                  key={r.role}
                  onClick={() => setSelectedNewRole(r.role)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    selectedNewRole === r.role
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
                      : 'bg-[#070e1b] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${r.badgeClass}`}>
                      {r.label}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{r.desc}</p>
                  </div>
                  {selectedNewRole === r.role && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingAdminId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                disabled={updating}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
              >
                {updating ? 'Committing...' : 'Commit Role Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
