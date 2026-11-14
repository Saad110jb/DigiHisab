'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Home,
  Droplets,
  Flame,
  Calculator,
  Scale,
  RefreshCw,
  Building,
  CheckCircle2,
  TrendingDown,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import {
  IDiscoTariffSlab,
  IDiscoSummary,
  ISharedUtilityDisputeRecord
} from '@/types/tariffs';
import DiscoSlabMatrix from '@/components/tariffs/DiscoSlabMatrix';
import SubMeterSimulator from '@/components/tariffs/SubMeterSimulator';
import WaterGasSplitAuditor from '@/components/tariffs/WaterGasSplitAuditor';

type TariffTab = 'SLABS' | 'SIMULATOR' | 'WATER_GAS';

export default function DomesticTariffEnginePage() {
  const [activeTab, setActiveTab] = useState<TariffTab>('SLABS');
  const [slabs, setSlabs] = useState<IDiscoTariffSlab[]>([]);
  const [discos, setDiscos] = useState<IDiscoSummary[]>([]);
  const [disputes, setDisputes] = useState<ISharedUtilityDisputeRecord[]>([]);
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
      const [slabsRes, disputesRes] = await Promise.all([
        fetch('/api/v1/admin/tariffs/slabs'),
        fetch('/api/v1/admin/tariffs/disputes')
      ]);

      const slabsJson = await slabsRes.json();
      const disputesJson = await disputesRes.json();

      if (slabsJson.success && slabsJson.data) {
        setSlabs(slabsJson.data.slabs || []);
        setDiscos(slabsJson.data.discos || []);
      }

      if (disputesJson.success && disputesJson.data) {
        setDisputes(disputesJson.data.disputes || []);
      }
    } catch (err: any) {
      showToast('Failed to load tariff data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateSlab = async (slabId: string, baseRatePKR: number, fpaRatePKR?: number) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/tariffs/slabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slabId, baseRatePKR, fpaRatePKR })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ ${json.message}`);
        await loadData();
      } else {
        showToast(`Error: ${json.message}`);
      }
    } catch (err: any) {
      showToast('Failed to update slab: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleArbitrateDispute = async (
    disputeId: string,
    action: 'RESOLVE' | 'ORDER_ADJUSTMENT',
    fairSharePKR?: number
  ) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/tariffs/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputeId, action, fairCalculatedSharePKR: fairSharePKR })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`⚖️ ${json.message}`);
        await loadData();
      } else {
        showToast(`Error: ${json.message}`);
      }
    } catch (err: any) {
      showToast('Arbitration failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* Toast Notification */}
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  GHAR KA HISAB REGULATORY ENGINE
                </span>
                <span className="text-xs text-slate-400 font-mono">NEPRA Tariff Gazettes</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Domestic Sub-Meter Billing &amp; Tariff Engine
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-3xl">
            Live NEPRA-compliant tariff slab management across LESCO, K-Electric, IESCO, and GEPCO. Powers landlord-tenant sub-meter splitters and arbitrates shared tube-well water and SNGPL gas disputes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Tariffs
          </button>
        </div>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Supported Utility DISCOs</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            4 Power Companies
          </p>
          <p className="text-[11px] text-slate-500 mt-1">LESCO, KE, IESCO &amp; GEPCO</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Current LESCO Base FPA</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">
            Rs. 3.25 / unit
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Monthly Fuel Adjustment</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Active Tenancy Disputes</p>
          <p className="text-xl font-bold font-mono text-red-400 mt-1">
            {disputes.filter((d) => d.status === 'PENDING_AUDIT').length} Contested Cases
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Water pump &amp; gas overcharging</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Total Contested Difference</p>
          <p className="text-xl font-bold font-mono text-purple-400 mt-1">
            Rs. {disputes.reduce((acc, d) => acc + d.contestedDifferencePKR, 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Overcharged tenant funds flagged</p>
        </div>
      </div>

      {/* 3-Tab Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('SLABS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'SLABS'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>DISCO Electricity Slabs ({slabs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SIMULATOR')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'SIMULATOR'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>Sub-Meter Split Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('WATER_GAS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'WATER_GAS'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Water &amp; Gas Splitting Inspector ({disputes.length})</span>
        </button>
      </div>

      {/* TAB 1: DISCO SLABS */}
      {activeTab === 'SLABS' && (
        <DiscoSlabMatrix
          slabs={slabs}
          discos={discos}
          onUpdateSlab={handleUpdateSlab}
          actionInProgress={actionInProgress}
        />
      )}

      {/* TAB 2: SUB-METER SIMULATOR */}
      {activeTab === 'SIMULATOR' && <SubMeterSimulator />}

      {/* TAB 3: WATER & GAS INSPECTOR */}
      {activeTab === 'WATER_GAS' && (
        <WaterGasSplitAuditor
          disputes={disputes}
          onArbitrateDispute={handleArbitrateDispute}
          actionInProgress={actionInProgress}
        />
      )}
    </div>
  );
}
