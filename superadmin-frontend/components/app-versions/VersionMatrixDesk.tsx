'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Download,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Sliders
} from 'lucide-react';
import { IAppVersionRecord, IVersionControlSettings } from '@/types/app-versions';

interface Props {
  versions: IAppVersionRecord[];
  settings: IVersionControlSettings;
  onUpdateSettings: (newSettings: Partial<IVersionControlSettings>) => Promise<void>;
  actionInProgress: boolean;
}

export default function VersionMatrixDesk({
  versions,
  settings,
  onUpdateSettings,
  actionInProgress
}: Props) {
  const [dukanMin, setDukanMin] = useState(settings.dukanMinVersion);
  const [dukanLatest, setDukanLatest] = useState(settings.dukanLatestVersion);
  const [gharMin, setGharMin] = useState(settings.gharMinVersion);
  const [gharLatest, setGharLatest] = useState(settings.gharLatestVersion);

  const totalInstalls = versions.reduce((acc, v) => acc + v.activeInstallsCount, 0);

  const handleSaveThresholds = async () => {
    await onUpdateSettings({
      dukanMinVersion: dukanMin,
      dukanLatestVersion: dukanLatest,
      gharMinVersion: gharMin,
      gharLatestVersion: gharLatest
    });
  };

  return (
    <div className="space-y-6">
      {/* Visual Market Adoption Strip */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#00d49f]" />
              Android POS &amp; Mobile Market Version Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Total Active Installations: <span className="text-white font-mono font-bold">{totalInstalls.toLocaleString()} devices</span> across retail counters &amp; homes.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
            Current Stable: v{settings.dukanLatestVersion}
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            style={{ width: '64.2%' }}
            className="bg-[#00d49f] h-full"
            title="v2.4.1 (Latest) - 64.2%"
          />
          <div
            style={{ width: '22.8%' }}
            className="bg-blue-500 h-full"
            title="v2.3.0 (Supported) - 22.8%"
          />
          <div
            style={{ width: '8.5%' }}
            className="bg-amber-500 h-full"
            title="v2.1.0 (Deprecated) - 8.5%"
          />
          <div
            style={{ width: '4.5%' }}
            className="bg-red-500 h-full"
            title="v1.9.0 (Blocked) - 4.5%"
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00d49f]" />
            <span className="text-slate-300">v2.4.1 (64.2% - Current Stable)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-300">v2.3.0 (22.8% - Soft Prompt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-300">v2.1.0 (8.5% - Deprecated)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">&lt; v2.0 (4.5% - Hard Blocked)</span>
          </div>
        </div>
      </div>

      {/* Persona Cutoff Settings Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Persona-Specific Version Enforcement Cutoffs</h4>
          </div>
          <button
            onClick={handleSaveThresholds}
            disabled={actionInProgress}
            className="px-3.5 py-1.5 rounded-lg bg-[#00d49f] hover:bg-[#00b887] text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow"
          >
            <Save className="w-3.5 h-3.5" />
            Save &amp; Enforce Cutoffs
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Dukandar POS Cutoff */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 font-mono uppercase">
                🏪 DUKANDAR POS TABLETS
              </span>
              <span className="text-[10px] text-slate-500">Thermal POS &amp; Shop Terminals</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Minimum Supported</label>
                <input
                  type="text"
                  value={dukanMin}
                  onChange={(e) => setDukanMin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                  placeholder="e.g. 2.2.0"
                />
                <span className="text-[10px] text-red-400 mt-0.5 block">&lt; this version = Hard Block</span>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Latest Target</label>
                <input
                  type="text"
                  value={dukanLatest}
                  onChange={(e) => setDukanLatest(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold"
                  placeholder="e.g. 2.4.1"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Recommended PlayStore build</span>
              </div>
            </div>
          </div>

          {/* Ghar Ka Hisab Cutoff */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono uppercase">
                🏠 GHAR KA HISAB (CONSUMERS)
              </span>
              <span className="text-[10px] text-slate-500">Budget Android Smartphones</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Minimum Supported</label>
                <input
                  type="text"
                  value={gharMin}
                  onChange={(e) => setGharMin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                  placeholder="e.g. 1.8.0"
                />
                <span className="text-[10px] text-red-400 mt-0.5 block">&lt; this version = Hard Block</span>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Latest Target</label>
                <input
                  type="text"
                  value={gharLatest}
                  onChange={(e) => setGharLatest(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold"
                  placeholder="e.g. 2.4.1"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Recommended PlayStore build</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version Matrix Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 bg-slate-950/80 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Version &amp; Code</th>
                <th className="py-3 px-4">Target Persona</th>
                <th className="py-3 px-4 text-right">Active Installs</th>
                <th className="py-3 px-4 text-center">Market Share</th>
                <th className="py-3 px-4">Changelog Summary (Urdu &amp; English)</th>
                <th className="py-3 px-4 text-center">Enforcement Status</th>
                <th className="py-3 px-4 text-center">Release Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {versions.map((ver) => (
                <tr key={ver.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-bold text-white">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 mr-2 text-[10px]">
                      {ver.id}
                    </span>
                    v{ver.versionString}
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-semibold">
                      {ver.persona}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-white">
                    {ver.activeInstallsCount.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">
                    {ver.adoptionPercentage}%
                  </td>

                  <td className="py-3.5 px-4 max-w-md font-sans">
                    <p className="text-xs text-slate-300 line-clamp-1">{ver.changelogEn}</p>
                    <p className="text-[11px] text-amber-300/90 font-medium line-clamp-1">{ver.changelogUrdu}</p>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        ver.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : ver.status === 'DEPRECATED'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      }`}
                    >
                      {ver.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                    {ver.releaseDate}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
