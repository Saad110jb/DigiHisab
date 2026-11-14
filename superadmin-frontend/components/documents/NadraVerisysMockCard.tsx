'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Fingerprint,
  Info,
  Building2,
  Cpu
} from 'lucide-react';
import { NadraVerisysMockStatus } from '@/types/admin';

interface NadraVerisysMockCardProps {
  status: NadraVerisysMockStatus;
  lookupId: string;
  biometricScore: number;
  lastCheckedAt: string;
  remarks: string;
  onTriggerCheck: () => Promise<void>;
}

export default function NadraVerisysMockCard({
  status,
  lookupId,
  biometricScore,
  lastCheckedAt,
  remarks,
  onTriggerCheck
}: NadraVerisysMockCardProps) {
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      await onTriggerCheck();
    } finally {
      setLoading(false);
    }
  };

  const isVerified = status === 'VERIFIED';
  const isPending = status === 'PENDING_CHECK';

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-[#0d1627] p-5 shadow-xl space-y-4 font-mono text-xs">
      
      {/* Top Banner with Simulation Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#17233b] pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">NADRA Verisys Intelligence Node</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-sky-500/30 bg-sky-500/10 text-sky-300">
                SIMULATED ENGINE (DEV/STAGING)
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5 font-sans">
              Automated citizen verification engine matching CNIC checksums and biographical fingerprints.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRun}
          disabled={loading}
          className="rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 font-bold px-3.5 py-2 flex items-center gap-2 transition text-xs disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Simulating Query...' : 'Run Simulated Check'}</span>
        </button>
      </div>

      {/* Verification Telemetry Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        <div className="p-3.5 rounded-xl bg-[#070d18] border border-[#17233b] space-y-1">
          <span className="text-[10px] text-slate-500 uppercase block">Verisys Status</span>
          <div className="flex items-center gap-1.5">
            {isVerified ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 text-sm">
                <CheckCircle2 className="h-4 w-4" /> VERIFIED
              </span>
            ) : isPending ? (
              <span className="text-amber-400 font-bold flex items-center gap-1 text-sm">
                <AlertTriangle className="h-4 w-4" /> PENDING CHECK
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1 text-sm">
                MISMATCH / REJECTED
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block">{lookupId}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070d18] border border-[#17233b] space-y-1">
          <span className="text-[10px] text-slate-500 uppercase block">Biometric Fingerprint Match</span>
          <div className="text-sm font-bold text-white">
            {biometricScore > 0 ? `${biometricScore}% Confidence` : 'Pending execution'}
          </div>
          <span className="text-[10px] text-emerald-400 block">
            {biometricScore >= 80 ? 'Threshold (>80%) Passed' : 'Awaiting simulation'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#070d18] border border-[#17233b] space-y-1">
          <span className="text-[10px] text-slate-500 uppercase block">Last Audited Timestamp</span>
          <div className="text-xs font-bold text-slate-200">
            {lastCheckedAt}
          </div>
          <span className="text-[10px] text-slate-500 block">Node: pk-isb-verisys-sim-01</span>
        </div>

      </div>

      {/* Remarks Callout */}
      <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 text-slate-300 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed font-sans">
          <strong>NADRA Node Note:</strong> {remarks}
        </p>
      </div>

    </div>
  );
}
