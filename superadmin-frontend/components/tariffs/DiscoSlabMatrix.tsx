'use client';

import React, { useState } from 'react';
import {
  Zap,
  Edit2,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Building,
  Save,
  Clock,
  Globe,
  FileCheck2,
  Info
} from 'lucide-react';
import { IDiscoTariffSlab, IDiscoSummary, DiscoCode, TariffCategory } from '@/types/tariffs';

interface Props {
  slabs: IDiscoTariffSlab[];
  discos: IDiscoSummary[];
  onUpdateSlab: (slabId: string, baseRatePKR: number, fpaRatePKR?: number) => Promise<void>;
  actionInProgress: boolean;
}

export default function DiscoSlabMatrix({ slabs, discos, onUpdateSlab, actionInProgress }: Props) {
  const [selectedDisco, setSelectedDisco] = useState<DiscoCode>('LESCO');
  const [selectedCategory, setSelectedCategory] = useState<TariffCategory>('UNPROTECTED');
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [editBaseRate, setEditBaseRate] = useState<string>('');
  const [editFpaRate, setEditFpaRate] = useState<string>('');
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const currentDiscoSummary = discos.find((d) => d.disco === selectedDisco) || discos[0];

  const filteredSlabs = slabs.filter(
    (s) => s.disco === selectedDisco && s.category === selectedCategory
  );

  const startEdit = (slab: IDiscoTariffSlab) => {
    setEditingSlabId(slab.id);
    setEditBaseRate(slab.baseRatePKR.toString());
    setEditFpaRate(slab.fpaRatePKR.toString());
  };

  const cancelEdit = () => {
    setEditingSlabId(null);
    setEditBaseRate('');
    setEditFpaRate('');
  };

  const handleSave = async (slabId: string) => {
    const base = parseFloat(editBaseRate);
    const fpa = parseFloat(editFpaRate);
    if (isNaN(base) || base <= 0) return;
    await onUpdateSlab(slabId, base, !isNaN(fpa) ? fpa : undefined);
    setEditingSlabId(null);
  };

  const handleSyncNationalTariff = async () => {
    try {
      setSyncingAll(true);
      const res = await fetch('/api/v1/admin/tariffs/slabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC_NATIONAL_TARIFF' })
      });
      const json = await res.json();
      if (json.success) {
        setSyncNotice(json.message);
        setTimeout(() => setSyncNotice(null), 5000);
        window.location.reload();
      }
    } catch (err: any) {
      setSyncNotice('Sync failed: ' + err.message);
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* NEPRA Single National Uniform Tariff Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 p-5 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                NEPRA NATIONAL UNIFORM TARIFF • S.R.O. 279(I)/2026
              </span>
              <span className="text-xs text-slate-400 font-mono">Applicable Across All DISCOs &amp; K-Electric</span>
            </div>
            <h3 className="text-base font-bold text-white">
              Nationwide Uniform Base Electricity Tariff Schedule
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              In Pakistan, the base unit rates are uniform nationwide under NEPRA gazette S.R.O. 279(I)/2026 across all ten ex-WAPDA DISCOs (LESCO, IESCO, FESCO, GEPCO, MEPCO, PESCO, HESCO, SEPCO, QESCO) and K-Electric. Final bills differ slightly only due to monthly Fuel Cost Adjustments (FCA/FPA), Quarterly Adjustments (QTA), and local provincial duties.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncNationalTariff}
              disabled={syncingAll || actionInProgress}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition flex items-center gap-2 shadow-lg"
            >
              <FileCheck2 className={`w-4 h-4 ${syncingAll ? 'animate-spin' : ''}`} />
              {syncingAll ? 'Synchronizing...' : 'Sync All DISCOs to S.R.O. 279(I)/2026'}
            </button>
          </div>
        </div>

        {syncNotice && (
          <div className="mt-3 p-2.5 bg-emerald-900/50 border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-200">
            {syncNotice}
          </div>
        )}
      </div>

      {/* DISCO Selector Cards (Showing company-specific variances: FPA, QTA, Duty) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {discos.map((d) => {
          const isSelected = selectedDisco === d.disco;
          return (
            <button
              key={d.disco}
              onClick={() => setSelectedDisco(d.disco)}
              className={`p-4 rounded-2xl border text-left transition ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                  {d.disco}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">Base: Uniform</span>
              </div>
              <h4 className="text-sm font-bold text-white truncate">{d.fullName}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{d.city}</p>

              {/* Company Specific Adjustments */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[11px] font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Current Monthly FPA:</span>
                  <span className="text-amber-400 font-bold">Rs. {d.currentFpaPKR.toFixed(2)}/u</span>
                </div>
                <div className="flex justify-between">
                  <span>Quarterly QTA:</span>
                  <span className="text-slate-300">Rs. {d.qtaRatePKR?.toFixed(2) || '1.25'}/u</span>
                </div>
                <div className="flex justify-between">
                  <span>Provincial Duty:</span>
                  <span className="text-slate-300">{d.provincialDutyPct || 1.5}%</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Category Toggle & Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {currentDiscoSummary?.fullName} Tariff Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              National Base Rate (S.R.O. 279(I)/2026) + {currentDiscoSummary?.disco} FPA (Rs. {currentDiscoSummary?.currentFpaPKR}) + 18% GST + 1.5% Duty
            </p>
          </div>
        </div>

        {/* Category Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedCategory('PROTECTED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedCategory === 'PROTECTED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Protected Slabs (&le; 200 Units)
          </button>
          <button
            onClick={() => setSelectedCategory('UNPROTECTED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedCategory === 'UNPROTECTED'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Unprotected Slabs (Non-Telescopic)
          </button>
        </div>
      </div>

      {/* Slab Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-300 font-semibold">
              {selectedCategory === 'PROTECTED'
                ? 'Protected Category: Applies to consumers who have used <= 200 units consecutively for the last 6 months (Lifeline rates apply).'
                : 'Unprotected Non-Telescopic Category: Base rate applies to all units within the determined consumption band.'}
            </span>
          </div>
          <span className="text-slate-500 font-mono">Gazette: S.R.O. 279(I)/2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 bg-slate-950/90 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Slab Tier</th>
                <th className="py-3 px-4">Units Range</th>
                <th className="py-3 px-4 text-right">National Base Rate (PKR)</th>
                <th className="py-3 px-4 text-right">{selectedDisco} FPA</th>
                <th className="py-3 px-4 text-right">FC Surcharge</th>
                <th className="py-3 px-4 text-right">Gross Rate + 18% GST</th>
                <th className="py-3 px-4 text-center">Gazette / S.R.O.</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredSlabs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No slabs configured for {selectedDisco} in {selectedCategory} category.
                  </td>
                </tr>
              ) : (
                filteredSlabs.map((slab) => {
                  const isEditing = editingSlabId === slab.id;
                  const totalBeforeGst = slab.baseRatePKR + slab.fpaRatePKR + slab.fcSurchargePKR;
                  const totalWithGst = totalBeforeGst * 1.18 * 1.015; // GST 18% + Duty 1.5%

                  return (
                    <tr key={slab.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 mr-2 text-[10px]">
                          {slab.id}
                        </span>
                        {slab.slabName}
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {slab.minUnits} – {slab.maxUnits === 9999 ? 'Above' : slab.maxUnits} Units
                      </td>

                      {/* Base Rate */}
                      <td className="py-3.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editBaseRate}
                            onChange={(e) => setEditBaseRate(e.target.value)}
                            className="w-24 bg-slate-950 border border-amber-500/50 rounded px-2 py-1 text-right text-white font-mono text-xs focus:outline-none"
                          />
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-bold text-amber-400 text-sm">
                              Rs. {slab.baseRatePKR.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/30">
                              Uniform
                            </span>
                          </div>
                        )}
                      </td>

                      {/* FPA */}
                      <td className="py-3.5 px-4 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editFpaRate}
                            onChange={(e) => setEditFpaRate(e.target.value)}
                            className="w-20 bg-slate-950 border border-amber-500/50 rounded px-2 py-1 text-right text-white font-mono text-xs focus:outline-none"
                          />
                        ) : (
                          <span className="text-slate-300 font-semibold">
                            Rs. {slab.fpaRatePKR.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right text-slate-400">
                        Rs. {slab.fcSurchargePKR.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        Rs. {totalWithGst.toFixed(2)} / unit
                      </td>

                      <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                        {slab.gazetteReference || 'S.R.O. 279(I)/2026'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSave(slab.id)}
                              disabled={actionInProgress}
                              className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition"
                              title="Save"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(slab)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 mx-auto transition"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                            <span>Edit Rate</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
