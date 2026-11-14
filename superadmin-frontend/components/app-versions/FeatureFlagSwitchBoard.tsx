'use client';

import React, { useState } from 'react';
import {
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Zap,
  WifiOff,
  Mic,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  QrCode,
  Landmark,
  FileText,
  MessageSquare,
  Users,
  ShieldCheck
} from 'lucide-react';
import { IFeatureFlag, FeatureFlagCategory } from '@/types/app-versions';

interface Props {
  flags: IFeatureFlag[];
  onToggleFlag: (key: string, isEnabled: boolean, rolloutPercentage?: number) => Promise<void>;
  actionInProgress: boolean;
}

export default function FeatureFlagSwitchBoard({ flags, onToggleFlag, actionInProgress }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const getFlagIcon = (key: string) => {
    switch (key) {
      case 'jazzcash_qr_scanner':
        return <Zap className="w-5 h-5 text-amber-400" />;
      case 'easypaisa_merchant_gateway':
        return <QrCode className="w-5 h-5 text-emerald-400" />;
      case 'raast_p2m_instant_rail':
        return <Landmark className="w-5 h-5 text-cyan-400" />;
      case 'offline_local_sync':
        return <WifiOff className="w-5 h-5 text-blue-400" />;
      case 'fbr_pos_digital_invoicing':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'urdu_voice_khata_ai':
        return <Mic className="w-5 h-5 text-purple-400" />;
      case 'submeter_lesco_ocr':
        return <Camera className="w-5 h-5 text-teal-400" />;
      case 'whatsapp_invoice_messenger':
        return <MessageSquare className="w-5 h-5 text-green-400" />;
      case 'kameti_auto_debit_ledger':
        return <Users className="w-5 h-5 text-indigo-400" />;
      case 'chor_nazar_cash_skimming_guard':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-slate-400" />;
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Switches' },
    { id: 'PAYMENTS', label: 'Payments & QR' },
    { id: 'TAX_LEGAL', label: 'FBR Tax' },
    { id: 'CONNECTIVITY', label: 'Offline Sync' },
    { id: 'AI_FEATURES', label: 'AI Voice' },
    { id: 'MESSAGING', label: 'WhatsApp' },
    { id: 'FRAUD_PREVENTION', label: 'Chor Nazar' }
  ];

  const filteredFlags = selectedCategory === 'ALL'
    ? flags
    : flags.filter((f) => f.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#00d49f]/20 text-[#00d49f] border border-[#00d49f]/30">
              ZERO-DEPLOYMENT REMOTE SWITCHES
            </span>
            <span className="text-xs text-slate-400">Instant POS Client Telemetry Propagation</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">Remote Feature Flags &amp; Operational Kill Switches</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Toggle third-party gateways or beta modules instantly across thousands of POS devices without rebuilding APKs or waiting for Google Play store review.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-emerald-400 font-bold">
            {flags.filter((f) => f.isEnabled).length} of {flags.length} Flags Active
          </span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const count = cat.id === 'ALL' ? flags.length : flags.filter((f) => f.category === cat.id).length;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-blue-800 text-blue-200' : 'bg-slate-800 text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Flags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFlags.map((flag) => (
          <div
            key={flag.key}
            className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
              flag.isEnabled
                ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                : 'bg-slate-950/80 border-red-500/30'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                    {getFlagIcon(flag.key)}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                      {flag.category}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{flag.title}</h4>
                  </div>
                </div>

                {/* Kill Switch Toggle Button */}
                <button
                  onClick={() => onToggleFlag(flag.key, !flag.isEnabled)}
                  disabled={actionInProgress}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition shadow ${
                    flag.isEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                  }`}
                >
                  {flag.isEnabled ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>ENABLED</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-red-400" />
                      <span>KILLED</span>
                    </>
                  )}
                </button>
              </div>

              {/* Description (Bilingual) */}
              <p className="text-xs text-slate-300 mb-1 leading-relaxed">{flag.description}</p>
              <p className="text-xs text-amber-300/90 font-medium">{flag.descriptionUrdu}</p>
            </div>

            {/* Bottom Meta Bar */}
            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span>Rollout: <strong className="text-white">{flag.rolloutPercentage}%</strong></span>
                <span>&bull;</span>
                <span>Personas: <strong className="text-slate-300">{flag.affectedPersonas.join(', ')}</strong></span>
              </div>
              <span className="text-slate-500">Updated: {flag.lastModifiedAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
