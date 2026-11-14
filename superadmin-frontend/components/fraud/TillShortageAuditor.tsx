'use client';

import React from 'react';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ShieldCheck,
  TrendingDown,
  Building,
  RefreshCw,
  Search
} from 'lucide-react';
import { ITillVarianceRecord } from '@/types/fraud';

interface Props {
  records: ITillVarianceRecord[];
  onTriggerSurpriseAudit: (recordId: string) => Promise<void>;
  actionInProgress: boolean;
}

export default function TillShortageAuditor({ records, onTriggerSurpriseAudit, actionInProgress }: Props) {
  return (
    <div className="space-y-6">
      {/* Informational Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
              SBP CASH SECURITY SENTINEL
            </span>
            <span className="text-xs text-slate-400">Tolerance Limit: &plusmn;5.0%</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">Abnormal Till Shortage &amp; Cash Skimming Auditor</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Compares physical cash counted during register closing against ledger cash sales. Discrepancies exceeding 5% or Rs. 3,000 prompt surprise audit mandates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">Total Shortage At-Risk</p>
            <p className="text-base font-bold font-mono text-red-400">
              Rs. {records.reduce((acc, r) => acc + (r.shortagePKR > 0 ? r.shortagePKR : 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Discrepancy Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 bg-slate-950/80 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Store &amp; Location</th>
                <th className="py-3 px-4">Cashier &amp; Shift</th>
                <th className="py-3 px-4 text-right">Expected Till Cash</th>
                <th className="py-3 px-4 text-right">Physical Count</th>
                <th className="py-3 px-4 text-right">Shortage</th>
                <th className="py-3 px-4 text-center">Variance %</th>
                <th className="py-3 px-4 text-center">Repeat Offenses</th>
                <th className="py-3 px-4 text-center">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {records.map((rec) => {
                const isHighShortage = rec.discrepancyPercentage >= 5.0;

                return (
                  <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                    {/* Store */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{rec.storeName}</div>
                      <div className="text-[11px] text-slate-400">{rec.city}</div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {rec.storeId}</div>
                    </td>

                    {/* Cashier */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{rec.cashierName}</div>
                      <div className="text-[11px] text-slate-400">{rec.shiftClosedAt}</div>
                      {rec.supervisorOverrideBy && (
                        <div className="text-[10px] text-amber-400">Override: {rec.supervisorOverrideBy}</div>
                      )}
                    </td>

                    {/* Expected */}
                    <td className="py-3.5 px-4 text-right text-slate-300 font-bold">
                      Rs. {rec.expectedTillCashPKR.toLocaleString()}
                    </td>

                    {/* Physical */}
                    <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                      Rs. {rec.physicalDrawerCashPKR.toLocaleString()}
                    </td>

                    {/* Shortage */}
                    <td className="py-3.5 px-4 text-right font-bold text-red-400">
                      - Rs. {rec.shortagePKR.toLocaleString()}
                    </td>

                    {/* Variance % */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isHighShortage
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {rec.discrepancyPercentage.toFixed(2)}%
                      </span>
                    </td>

                    {/* Repeat count */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          rec.repeatOffenseCount >= 2
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400'
                        }`}
                      >
                        {rec.repeatOffenseCount} this week
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      {rec.status === 'SURPRISE_AUDIT_ORDERED' ? (
                        <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-bold">
                          ⚡ Audit Dispatched
                        </span>
                      ) : (
                        <button
                          onClick={() => onTriggerSurpriseAudit(rec.id)}
                          disabled={actionInProgress}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto"
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Surprise Audit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
