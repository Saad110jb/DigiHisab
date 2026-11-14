'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Sliders,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Zap,
  Lock,
  Unlock,
  AlertTriangle,
  Play
} from 'lucide-react';
import {
  IAppVersionRecord,
  IFeatureFlag,
  IMaintenanceConfig,
  IVersionControlSettings
} from '@/types/app-versions';
import VersionMatrixDesk from '@/components/app-versions/VersionMatrixDesk';
import FeatureFlagSwitchBoard from '@/components/app-versions/FeatureFlagSwitchBoard';
import MaintenanceController from '@/components/app-versions/MaintenanceController';
import ClientHandshakeSimulator from '@/components/app-versions/ClientHandshakeSimulator';

type VersionTab = 'MATRIX' | 'FLAGS' | 'MAINTENANCE' | 'SIMULATOR';

export default function AppVersioningControllerPage() {
  const [activeTab, setActiveTab] = useState<VersionTab>('MATRIX');
  const [versions, setVersions] = useState<IAppVersionRecord[]>([]);
  const [settings, setSettings] = useState<IVersionControlSettings>({
    dukanMinVersion: '2.2.0',
    dukanLatestVersion: '2.4.1',
    gharMinVersion: '1.8.0',
    gharLatestVersion: '2.4.1',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=pk.digihisab.app',
    apkDirectUrl: 'https://cdn.digihisab.pk/apk/digi-hisab-latest.apk'
  });
  const [flags, setFlags] = useState<IFeatureFlag[]>([]);
  const [maintenance, setMaintenance] = useState<IMaintenanceConfig>({
    isActive: false,
    durationMinutes: 45,
    urduMessage: 'سسٹم اپ گریڈ جاری ہے...',
    englishMessage: 'System maintenance in progress...',
    allowedIpWhitelist: ['127.0.0.1'],
    allowAdminBypass: true,
    lastToggledBy: 'SuperAdmin',
    lastToggledAt: 'Just now'
  });
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [matrixRes, flagsRes, maintRes] = await Promise.all([
        fetch('/api/v1/admin/app-versions/matrix'),
        fetch('/api/v1/admin/app-versions/flags'),
        fetch('/api/v1/admin/app-versions/maintenance')
      ]);

      const matrixJson = await matrixRes.json();
      const flagsJson = await flagsRes.json();
      const maintJson = await maintRes.json();

      if (matrixJson.success && matrixJson.data) {
        setVersions(matrixJson.data.versions || []);
        if (matrixJson.data.settings) setSettings(matrixJson.data.settings);
      }

      if (flagsJson.success && flagsJson.data) {
        setFlags(flagsJson.data.flags || []);
      }

      if (maintJson.success && maintJson.data) {
        setMaintenance(maintJson.data);
      }
    } catch (err: any) {
      showToast('Failed to load versioning data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSettings = async (newSettings: Partial<IVersionControlSettings>) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/app-versions/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const json = await res.json();
      if (json.success) {
        showToast('✅ ' + json.message);
        await loadData();
      }
    } catch (err: any) {
      showToast('Update failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleToggleFlag = async (
    key: string,
    isEnabled: boolean,
    rolloutPercentage?: number
  ) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/app-versions/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, isEnabled, rolloutPercentage })
      });
      const json = await res.json();
      if (json.success) {
        showToast('🎛️ ' + json.message);
        await loadData();
      }
    } catch (err: any) {
      showToast('Flag toggle failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleToggleMaintenance = async (
    isActive: boolean,
    durationMinutes?: number,
    customUrduMsg?: string
  ) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/app-versions/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive, durationMinutes, customUrduMsg })
      });
      const json = await res.json();
      if (json.success) {
        showToast(isActive ? '🚨 Maintenance Broadcast Active' : '✅ Maintenance Deactivated');
        await loadData();
      }
    } catch (err: any) {
      showToast('Maintenance toggle failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const totalInstalls = versions.reduce((acc, v) => acc + v.activeInstallsCount, 0);

  return (
    <div className="p-4 sm:p-8 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-5 py-3 text-xs font-mono text-[#00d49f] shadow-2xl flex items-center gap-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold uppercase">
                  CLIENT FLEET CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">Real-Time Mobile &amp; POS Telemetry</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                App Versioning &amp; Forced Update Controller
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-3xl">
            Supervises Android POS terminals, thermal tablets, and shopkeeper smartphones across Pakistan. Enforces minimum supported versions per persona, manages remote feature flag kill switches, and triggers polite Urdu emergency maintenance screens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Total Active POS Tablets</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {totalInstalls.toLocaleString()} Devices
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Across 4 registered app builds</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Dukandar Min Supported</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">
            v{settings.dukanMinVersion}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Target latest: v{settings.dukanLatestVersion}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Ghar Ka Hisab Min Supported</p>
          <p className="text-xl font-bold font-mono text-blue-400 mt-1">
            v{settings.gharMinVersion}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Target latest: v{settings.gharLatestVersion}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Maintenance Status</p>
          <p
            className={`text-xl font-bold font-mono mt-1 ${
              maintenance.isActive ? 'text-red-400 animate-pulse' : 'text-emerald-400'
            }`}
          >
            {maintenance.isActive ? '🚨 ACTIVE' : '✅ NORMAL'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {maintenance.isActive ? 'POS transactions locked' : 'All POS clients operational'}
          </p>
        </div>
      </div>

      {/* 4-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('MATRIX')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'MATRIX'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Version Matrix &amp; Cutoffs</span>
        </button>

        <button
          onClick={() => setActiveTab('FLAGS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'FLAGS'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Remote Feature Flags ({flags.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MAINTENANCE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'MAINTENANCE'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Emergency Maintenance Controller</span>
        </button>

        <button
          onClick={() => setActiveTab('SIMULATOR')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'SIMULATOR'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          <span>Live Client Simulator</span>
        </button>
      </div>

      {/* TAB 1: VERSION MATRIX */}
      {activeTab === 'MATRIX' && (
        <VersionMatrixDesk
          versions={versions}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          actionInProgress={actionInProgress}
        />
      )}

      {/* TAB 2: REMOTE FEATURE FLAGS */}
      {activeTab === 'FLAGS' && (
        <FeatureFlagSwitchBoard
          flags={flags}
          onToggleFlag={handleToggleFlag}
          actionInProgress={actionInProgress}
        />
      )}

      {/* TAB 3: EMERGENCY MAINTENANCE */}
      {activeTab === 'MAINTENANCE' && (
        <MaintenanceController
          config={maintenance}
          onToggleMaintenance={handleToggleMaintenance}
          actionInProgress={actionInProgress}
        />
      )}

      {/* TAB 4: CLIENT SIMULATOR */}
      {activeTab === 'SIMULATOR' && <ClientHandshakeSimulator />}
    </div>
  );
}
