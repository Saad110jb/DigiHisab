'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wrench,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';

export default function MaintenancePage() {
  const [config, setConfig] = useState<{
    urduMessage?: string;
    englishMessage?: string;
    maintenanceMode?: boolean;
    lastUpdated?: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    try {
      setChecking(true);
      const res = await fetch('/api/v1/config/app-version');
      if (res.ok) {
        const json = await res.json();
        if (json.maintenance) {
          setConfig({
            urduMessage: json.maintenance.urduMessage,
            englishMessage: json.maintenance.englishMessage,
            maintenanceMode: json.maintenance.isActive,
          });
          if (!json.maintenance.isActive) {
            window.location.href = '/';
          }
        }
      }
    } catch (e) {
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#00d49f]/30 selection:text-[#00d49f] relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.08),rgba(255,255,255,0))] pointer-events-none" />

      {/* Top Header */}
      <header className="w-full border-b border-[#17233b]/80 bg-[#070d18]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0d1627] border border-[#17233b] flex items-center justify-center shadow-inner">
            <Wrench className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-widest text-slate-100">
                DIGIHISAB
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold tracking-wider">
                MAINTENANCE MODE
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider">
              SYSTEM UPGRADE & CLUSTER RE-INDEXING
            </p>
          </div>
        </div>

        <Link
          href="/admin/login"
          className="text-xs font-mono px-3 py-1.5 rounded-lg bg-[#0d1627] border border-[#17233b] hover:border-[#00d49f]/40 hover:text-[#00d49f] text-slate-300 flex items-center gap-1.5 transition"
        >
          <Lock className="w-3.5 h-3.5 text-[#00d49f]" />
          <span>SuperAdmin Console</span>
        </Link>
      </header>

      {/* Center Notice */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-2xl bg-[#0d1627] border border-[#17233b] rounded-2xl shadow-2xl p-8 sm:p-10 text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 text-amber-400">
            <Wrench className="w-8 h-8" />
          </div>

          {/* Urdu Notice Box */}
          <div className="mb-6 p-5 rounded-xl bg-[#070d18] border border-[#17233b]">
            <p className="text-xl sm:text-2xl font-bold text-amber-300 leading-relaxed font-serif" dir="rtl">
              {config?.urduMessage ||
                'سسٹم اپ گریڈ جاری ہے: برائے مہربانی کچھ دیر بعد دوبارہ کوشش کریں۔ آپ کا کھاتہ، بیلنس اور کسٹمر ریکارڈ محفوظ ہے۔'}
            </p>
          </div>

          {/* English Notice Box */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-100 mb-2">
              Scheduled Platform Upgrade in Progress
            </h2>
            <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              {config?.englishMessage ||
                'Digi Hisab is currently upgrading database clusters and security modules. All financial records, customer debts, and ledger balances are completely safe and encrypted.'}
            </p>
          </div>

          {/* Security & Integrity Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-center gap-2 text-slate-300">
              <Database className="w-4 h-4 text-[#00d49f]" />
              <span>Data Safe & Encrypted</span>
            </div>
            <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-[#0ea5e9]" />
              <span>Zero-Loss Guarantee</span>
            </div>
            <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Auto-Resuming Soon</span>
            </div>
          </div>

          {/* Refresh Action */}
          <button
            onClick={checkStatus}
            disabled={checking}
            className="px-6 py-2.5 rounded-xl font-mono text-xs font-semibold bg-[#17233b] hover:bg-[#1f2f4e] text-slate-200 border border-slate-700 transition inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check If System Restored'}</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#17233b]/80 bg-[#070d18]/90 backdrop-blur-md px-6 py-3.5 z-10 text-center text-xs font-mono text-slate-500">
        DigiHisab High-Availability Financial Infrastructure • SBP Monitored
      </footer>
    </div>
  );
}
