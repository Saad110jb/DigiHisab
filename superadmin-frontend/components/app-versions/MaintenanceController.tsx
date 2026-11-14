'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  Clock,
  Play,
  Square,
  Lock,
  Unlock,
  CheckCircle2,
  Smartphone,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { IMaintenanceConfig } from '@/types/app-versions';

interface Props {
  config: IMaintenanceConfig;
  onToggleMaintenance: (isActive: boolean, durationMinutes?: number, customUrduMsg?: string) => Promise<void>;
  actionInProgress: boolean;
}

export default function MaintenanceController({
  config,
  onToggleMaintenance,
  actionInProgress
}: Props) {
  const [duration, setDuration] = useState<number>(config.durationMinutes || 45);
  const [urduMsg, setUrduMsg] = useState<string>(config.urduMessage);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const handleToggle = async (active: boolean) => {
    await onToggleMaintenance(active, duration, urduMsg);
    setConfirmModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Master Switch Banner */}
      <div
        className={`p-6 rounded-2xl border transition ${
          config.isActive
            ? 'bg-red-950/40 border-red-500/60 shadow-2xl shadow-red-500/10'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3.5 rounded-2xl border ${
                config.isActive
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {config.isActive ? (
                <ShieldAlert className="w-8 h-8" />
              ) : (
                <ShieldCheck className="w-8 h-8" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${
                    config.isActive
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {config.isActive ? '🚨 MAINTENANCE ACTIVE' : '✅ SYSTEM NORMAL • POS ONLINE'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  All Pakistan POS Tablets
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {config.isActive
                  ? 'Emergency Maintenance Screen is LIVE on all devices'
                  : 'Emergency Maintenance Sentinel Screen Controller'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {config.isActive
                  ? 'Client transactions are paused. Devices are displaying polite Urdu reassurance messaging with live countdown.'
                  : '1-Click trigger to display an emergency maintenance block across all mobile and POS devices during database migrations.'}
              </p>
            </div>
          </div>

          <div>
            {config.isActive ? (
              <button
                onClick={() => handleToggle(false)}
                disabled={actionInProgress}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl transition"
              >
                <Unlock className="w-4 h-4" />
                Deactivate Maintenance (Restore POS)
              </button>
            ) : (
              <button
                onClick={() => setConfirmModalOpen(true)}
                disabled={actionInProgress}
                className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl transition animate-pulse"
              >
                <Lock className="w-4 h-4" />
                Activate Emergency Maintenance
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Smartphone Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Maintenance Schedule &amp; Messaging Settings
            </h4>

            {/* Duration Selector */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5">
                Estimated Upgrade Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDuration(mins)}
                    className={`py-2 text-xs font-mono font-bold rounded-lg border transition ${
                      duration === mins
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {mins} Minutes
                  </button>
                ))}
              </div>
            </div>

            {/* Urdu Message Input */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1.5">
                Polite Urdu Reassurance Message (Displayed to Shopkeeper)
              </label>
              <textarea
                rows={3}
                value={urduMsg}
                onChange={(e) => setUrduMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-sm font-medium text-amber-300 rounded-xl p-3 focus:outline-none focus:border-[#00d49f]"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Reassures Dukandars that their money, Udhaar ledger, and customer records are completely secure.
              </span>
            </div>

            {/* Whitelisted IP box */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-xs font-mono text-slate-400 block mb-1">
                Admin Whitelist IPs (Bypass Maintenance Block)
              </label>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {config.allowedIpWhitelist.map((ip) => (
                  <span
                    key={ip}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300"
                  >
                    {ip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Smartphone Preview Column */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="text-xs font-mono text-slate-400 mb-2 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-[#00d49f]" />
            Live Client Screen Preview (Android POS / Mobile)
          </div>

          {/* Phone Frame Mockup */}
          <div className="w-72 bg-[#070d18] border-4 border-slate-700 rounded-[36px] p-4 shadow-2xl shadow-black relative overflow-hidden flex flex-col justify-between min-h-[460px]">
            {/* Notch */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-4" />

            {/* Screen Content */}
            <div className="text-center space-y-4 my-auto px-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#00d49f]/20 to-blue-500/20 border border-[#00d49f]/40 mx-auto flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-8 h-8 text-[#00d49f]" />
              </div>

              <div>
                <h5 className="text-base font-bold text-white">Digi Hisab (ڈیجی حساب)</h5>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">سسٹم اپ گریڈیشن (System Upgrade)</p>
              </div>

              {/* Polite Urdu Box */}
              <div className="p-3 bg-slate-900/90 border border-amber-500/30 rounded-xl">
                <p className="text-xs font-semibold text-amber-300 leading-relaxed font-sans">
                  {urduMsg}
                </p>
              </div>

              {/* Countdown Timer */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-400">تخمینہ وقت (Estimated Time Remaining)</p>
                <p className="text-xl font-bold font-mono text-[#00d49f] mt-1">
                  00:{duration < 10 ? `0${duration}` : duration}:00
                </p>
              </div>

              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>100% Encrypted &bull; State Bank SBP Protected</span>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-4" />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Maintenance Activation</h3>
                <p className="text-xs text-slate-400">All Pakistan POS Clients Will Be Blocked</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to activate the emergency maintenance screen for{' '}
              <strong className="text-white">{duration} minutes</strong>? Cashiers will be unable to log new transactions until disabled.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggle(true)}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Confirm &amp; Broadcast Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
