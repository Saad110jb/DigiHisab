'use client';

import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, RefreshCw, Key } from 'lucide-react';
import Link from 'next/link';
import { useAdminRbac } from '@/context/AdminRbacContext';

interface Props {
  reason?: string;
  onOpenSwitcher?: () => void;
}

export default function AdminAccessDenied({ reason, onOpenSwitcher }: Props) {
  const { activeAdmin, switchActiveAdmin } = useAdminRbac();

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-[#0a1222] border border-red-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
        {/* Glow Spot */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Central Shield Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 shadow-inner">
          <ShieldAlert className="w-10 h-10 text-red-400 animate-pulse" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-mono font-bold uppercase tracking-wider mb-3">
          <Lock className="w-3.5 h-3.5" />
          <span>403 SBP RBAC ACCESS DENIED</span>
        </div>

        {/* Urdu Headline */}
        <h2 className="text-2xl font-extrabold text-white mb-2">
          رسائی کی ممانعت (Restricted Module)
        </h2>

        {/* English Subheadline */}
        <p className="text-xs text-slate-400 font-mono mb-4 uppercase tracking-wider">
          Enterprise Role-Based Access Control Sentinel
        </p>

        {/* Reassuring Urdu Description */}
        <div className="bg-[#070d18] border border-slate-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed text-right mb-6">
          <p className="text-amber-400 font-semibold mb-1">
            موجودہ سیشن: {activeAdmin?.name} ({activeAdmin?.designation})
          </p>
          <p>
            {reason ||
              `آپ کا ایڈمن رول (${activeAdmin?.role}) اس ماڈیول تک رسائی کا مجاز نہیں ہے۔ اسٹیٹ بینک سیکیورٹی فریم ورک کے تحت ہر ایڈمن کو صرف اس کے متعلقہ اختیارات تفویض کیے گئے ہیں۔`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/admin"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ڈیش بورڈ پر واپس جائیں</span>
          </Link>

          <button
            onClick={() => switchActiveAdmin('ADM-101')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Key className="w-4 h-4" />
            <span>روٹ سپر ایڈمن (Master Node) پر سوئچ کریں</span>
          </button>
        </div>
      </div>
    </div>
  );
}
