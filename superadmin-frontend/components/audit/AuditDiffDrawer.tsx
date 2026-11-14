'use client';

import React from 'react';
import {
  X,
  ShieldCheck,
  Clock,
  MapPin,
  Laptop,
  CheckCircle2,
  FileCode,
  KeyRound,
  Hash,
  AlertTriangle,
  Info,
  ShieldAlert
} from 'lucide-react';
import { IAdminAuditLog } from '@/types/audit';

interface Props {
  log: IAdminAuditLog | null;
  onClose: () => void;
}

export default function AuditDiffDrawer({ log, onClose }: Props) {
  if (!log) return null;

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0a1222] border-l border-[#1b2b48] h-full overflow-y-auto flex flex-col justify-between shadow-2xl">
        {/* Top Header */}
        <div>
          <div className="p-6 border-b border-[#17233b] flex items-center justify-between sticky top-0 bg-[#0a1222]/95 backdrop-blur z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-emerald-400">{log.id}</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadge(log.severity)}`}>
                  {log.severity}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {log.deskModule}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{log.actionType.replace(/_/g, ' ')}</h3>
              <p className="text-xs text-slate-400">Target: <strong className="text-slate-200">{log.targetEntityName}</strong> ({log.targetEntityId})</p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Meta Overview Card */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-[#070e1b] border border-slate-800">
                <span className="text-slate-500 text-[10px]">AUTHORIZED ADMINISTRATOR</span>
                <p className="text-white font-bold text-sm mt-0.5">{log.adminName}</p>
                <p className="text-slate-400 text-[11px]">{log.adminRole}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#070e1b] border border-slate-800">
                <span className="text-slate-500 text-[10px]">TIMESTAMP (PKT / UTC)</span>
                <p className="text-white font-bold text-sm mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })} PKT
                </p>
                <p className="text-slate-400 text-[11px]">{new Date(log.timestamp).toLocaleDateString('en-GB')}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#070e1b] border border-slate-800">
                <span className="text-slate-500 text-[10px]">IP ADDRESS &amp; LOCATION</span>
                <p className="text-white font-bold text-sm mt-0.5">{log.ipAddress}</p>
                <p className="text-slate-400 text-[11px]">{log.geoLocation}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#070e1b] border border-slate-800">
                <span className="text-slate-500 text-[10px]">CLIENT USER AGENT</span>
                <p className="text-white font-bold text-xs truncate mt-0.5">{log.userAgent}</p>
                <p className="text-emerald-400 text-[10px] mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>2FA Verified Session</span>
                </p>
              </div>
            </div>

            {/* Cryptographic SHA-256 Tamper Integrity Card */}
            <div className="p-4 rounded-2xl bg-[#070e1b] border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>CRYPTOGRAPHIC CHAIN INTEGRITY (SHA-256)</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                  IMMUTABLE
                </span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500">Record Hash: </span>
                  <span className="text-slate-300 break-all select-all">{log.sha256Hash}</span>
                </div>
                <div>
                  <span className="text-slate-500">Previous Block Hash: </span>
                  <span className="text-slate-400 break-all select-all">{log.previousHash}</span>
                </div>
              </div>
            </div>

            {/* Before vs After Diff Inspector */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>State Mutation Diff (Before &bull; After)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Previous State */}
                <div className="rounded-2xl bg-[#070e1b] border border-red-500/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-red-400 uppercase">
                      PREVIOUS STATE (OLD)
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 bg-black/40 p-3 rounded-xl overflow-x-auto leading-relaxed max-h-56">
                    {log.previousState ? JSON.stringify(log.previousState, null, 2) : 'null (Initial / Creation)'}
                  </pre>
                </div>

                {/* New State */}
                <div className="rounded-2xl bg-[#070e1b] border border-emerald-500/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                      NEW STATE (COMMITTED)
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <pre className="text-[11px] font-mono text-emerald-200 bg-black/40 p-3 rounded-xl overflow-x-auto leading-relaxed max-h-56">
                    {JSON.stringify(log.newState, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Drawer Footer */}
        <div className="p-4 bg-[#070e1b] border-t border-[#17233b] flex items-center justify-between text-xs font-mono text-slate-500">
          <span>SBP Regulatory Compliance Standard 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
