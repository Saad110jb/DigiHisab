'use client';

import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  Lock,
  ExternalLink,
  Sparkles,
  Zap,
  Key
} from 'lucide-react';
import { useAdminRbac } from '@/context/AdminRbacContext';
import { AdminRole } from '@/types/rbac';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminIdentitySwitcherModal({ isOpen, onClose }: Props) {
  const { activeAdmin, allAdmins, switchActiveAdmin } = useAdminRbac();

  if (!isOpen) return null;

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'ROOT_SUPERADMIN':
        return {
          label: '👑 Root SuperAdmin',
          class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          desc: 'Full unconstrained platform control, overrides, maintenance and kill switches.'
        };
      case 'COMPLIANCE_OFFICER':
        return {
          label: '🛡️ Compliance Officer',
          class: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          desc: 'Restricted strictly to CNIC verification, KYC documents, and fraud triage.'
        };
      case 'DISPUTE_RESOLVER':
        return {
          label: '⚖️ Dispute Resolver',
          class: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          desc: 'Restricted to customer khata complaints, drop-offs, and WhatsApp desk.'
        };
      case 'FINANCIAL_AUDITOR':
        return {
          label: '📊 Financial Auditor',
          class: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          desc: 'Read-only access to MRR, GMV, Tariffs, and Gateway reconciliation.'
        };
    }
  };

  const handleSelectAdmin = async (id: string) => {
    await switchActiveAdmin(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1424] border border-[#1b2b48] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl shadow-emerald-500/5">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#17233b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Active Admin Session &amp; RBAC Switcher</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE SIMULATOR
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate different administrative personas to test granular permissions and access boundaries.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: List of Admin Personas */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {allAdmins.map((admin) => {
            const isSelected = activeAdmin?.id === admin.id;
            const badge = getRoleBadge(admin.role);

            return (
              <div
                key={admin.id}
                onClick={() => handleSelectAdmin(admin.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                    : 'bg-[#070e1b] border-slate-800 hover:border-slate-700 hover:bg-[#0c182c]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-[#070d18] border border-[#00d49f]/30 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-[#00d49f]" />
                    </div>
                    {isSelected && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00d49f] border-2 border-[#0b1424] flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-[#070d18]" />
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white font-mono">{admin.label || admin.name}</h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-400/10 border-amber-400/30 text-amber-300">
                        👑 SuperAdmin
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{admin.email}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-1 leading-tight">{admin.node || admin.department}</p>
                  </div>
                </div>

                <div className="text-right">
                  {isSelected ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono border border-emerald-500/40">
                      ACTIVE SESSION
                    </span>
                  ) : (
                    <button className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition">
                      Switch Role
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#070e1b] border-t border-[#17233b] flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>State Bank of Pakistan (SBP) RBAC Circular 2026</span>
          </div>
          <span className="text-slate-500">All actions logged to immutable trail</span>
        </div>
      </div>
    </div>
  );
}
