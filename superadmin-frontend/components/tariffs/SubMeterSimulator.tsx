'use client';

import React, { useState } from 'react';
import {
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Building,
  User,
  ArrowRight,
  TrendingDown,
  Printer,
  Sparkles
} from 'lucide-react';
import { calculateSubMeterSplit } from '@/lib/tariffs-store';
import { ISubMeterSplitSimulation, DiscoCode } from '@/types/tariffs';

interface TenantInput {
  id: string;
  tenantName: string;
  portionName: string;
  subMeterUnits: number;
}

export default function SubMeterSimulator() {
  const [disco, setDisco] = useState<DiscoCode>('LESCO');
  const [masterUnits, setMasterUnits] = useState<number>(950);
  const [masterBillAmountPKR, setMasterBillAmountPKR] = useState<number>(47500);

  const [tenants, setTenants] = useState<TenantInput[]>([
    { id: '1', tenantName: 'Haji Bashir (Owner)', portionName: 'Ground Floor (Main)', subMeterUnits: 400 },
    { id: '2', tenantName: 'Farhan Zaidi (Tenant)', portionName: 'Upper Portion (Flat 1)', subMeterUnits: 350 },
    { id: '3', tenantName: 'Engr. Bilal (Tenant)', portionName: 'Basement Studio', subMeterUnits: 200 }
  ]);

  const addTenant = () => {
    const newId = (tenants.length + 1).toString();
    setTenants([
      ...tenants,
      {
        id: newId,
        tenantName: `Tenant #${newId}`,
        portionName: `Portion ${newId}`,
        subMeterUnits: 150
      }
    ]);
  };

  const removeTenant = (id: string) => {
    if (tenants.length <= 1) return;
    setTenants(tenants.filter((t) => t.id !== id));
  };

  const updateTenant = (id: string, field: keyof TenantInput, value: any) => {
    setTenants(
      tenants.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const simulation: ISubMeterSplitSimulation = calculateSubMeterSplit(
    disco,
    masterUnits,
    masterBillAmountPKR,
    tenants
  );

  const totalSubUnits = tenants.reduce((acc, t) => acc + (Number(t.subMeterUnits) || 0), 0);
  const unitsVariance = masterUnits - totalSubUnits;

  return (
    <div className="space-y-6">
      {/* Top Config Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-[#00d49f]/10 text-[#00d49f] border border-[#00d49f]/30">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                NEPRA S.R.O. 279(I)/2026 COMPLIANT
              </span>
              <span className="text-xs text-slate-400 font-mono">Anti-Exploitation Proportional Splitter</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1">Interactive Sub-Meter Split Simulator</h3>
            <p className="text-xs text-slate-400">
              Eliminates landlord-tenant disputes by splitting master WAPDA bills proportionally according to government-approved effective rates rather than unfair flat top-slab rates.
            </p>
          </div>
        </div>

        {/* Master Meter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* DISCO Select */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Utility DISCO Company</label>
            <select
              value={disco}
              onChange={(e) => setDisco(e.target.value as DiscoCode)}
              className="w-full bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00d49f]"
            >
              <option value="LESCO">LESCO (Lahore)</option>
              <option value="KELECTRIC">K-Electric (Karachi)</option>
              <option value="IESCO">IESCO (Islamabad/Rawalpindi)</option>
              <option value="GEPCO">GEPCO (Gujranwala)</option>
            </select>
          </div>

          {/* Master Units */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Master Meter Total Units</label>
            <input
              type="number"
              value={masterUnits}
              onChange={(e) => setMasterUnits(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00d49f]"
              placeholder="e.g. 950"
            />
          </div>

          {/* Total Bill Amount */}
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Total WAPDA Bill Amount (PKR)</label>
            <input
              type="number"
              value={masterBillAmountPKR}
              onChange={(e) => setMasterBillAmountPKR(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-400 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#00d49f]"
              placeholder="e.g. 47500"
            />
          </div>
        </div>

        {/* Master Metrics Bar */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-slate-400">
              Master Effective Rate: <strong className="text-amber-400">Rs. {(masterBillAmountPKR / (masterUnits || 1)).toFixed(2)}/unit</strong>
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">
              Sub-Meters Total: <strong className="text-white">{totalSubUnits} units</strong>
            </span>
          </div>

          <div>
            {unitsVariance === 0 ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Units Reconciled 100% Balanced
              </span>
            ) : (
              <span className="text-amber-400 font-bold">
                ⚠️ Units Difference: {unitsVariance > 0 ? `+${unitsVariance}` : unitsVariance} units unaccounted (common line loss)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tenants & Sub-Meters Allocation Section */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            Portion &amp; Sub-Meter Consumption Allocations ({tenants.length} Portions)
          </h4>

          <button
            onClick={addTenant}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#00d49f]" />
            Add Portion
          </button>
        </div>

        {/* Dynamic Tenant Inputs Table */}
        <div className="space-y-3">
          {tenants.map((t, index) => (
            <div
              key={t.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800 items-center text-xs"
            >
              <div className="sm:col-span-3">
                <label className="text-[10px] text-slate-500 font-mono block">Tenant / Occupant Name</label>
                <input
                  type="text"
                  value={t.tenantName}
                  onChange={(e) => updateTenant(t.id, 'tenantName', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-medium focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="text-[10px] text-slate-500 font-mono block">Portion / Floor Description</label>
                <input
                  type="text"
                  value={t.portionName}
                  onChange={(e) => updateTenant(t.id, 'portionName', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[10px] text-slate-500 font-mono block">Sub-Meter Units Consumed</label>
                <input
                  type="number"
                  value={t.subMeterUnits}
                  onChange={(e) => updateTenant(t.id, 'subMeterUnits', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-amber-400 font-bold focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-end pt-3">
                <button
                  onClick={() => removeTenant(t.id)}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                  title="Remove portion"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculated Fair Allocation Results Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden p-6">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Proportional Slab-Weighted Bill Splits &amp; Fair Invoices
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simulation.allocations.map((alloc) => (
            <div
              key={alloc.id}
              className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {alloc.portionName}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    Rs. {alloc.effectiveRatePerUnit}/unit
                  </span>
                </div>
                <h5 className="text-sm font-bold text-white">{alloc.tenantName}</h5>

                <div className="mt-4 space-y-2 text-xs font-mono border-t border-slate-800/80 pt-3">
                  <div className="flex justify-between text-slate-400">
                    <span>Units Consumed:</span>
                    <span className="text-white font-bold">{alloc.subMeterUnits} Units</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Base Energy Share:</span>
                    <span className="text-slate-200">Rs. {alloc.computedBaseSharePKR.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taxes &amp; Fixed Share:</span>
                    <span className="text-slate-200">Rs. {alloc.computedTaxesSharePKR.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 font-mono">Net Payable Bill</p>
                  <p className="text-base font-bold font-mono text-emerald-400">
                    Rs. {alloc.computedTotalPKR.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono flex items-center gap-1 transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Slip
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
