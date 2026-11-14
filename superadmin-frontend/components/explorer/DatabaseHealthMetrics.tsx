'use client';

import React, { useState } from 'react';
import {
  Database,
  HardDrive,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Server,
  ShieldAlert
} from 'lucide-react';
import { IDatabaseHealthMetrics, ITableAuditorRow } from '@/types/admin';
import { MOCK_DB_HEALTH_METRICS } from '@/lib/explorer-store';

interface DatabaseHealthMetricsProps {
  onRequestOptimization?: (tableName: string) => void;
}

export default function DatabaseHealthMetrics({ onRequestOptimization }: DatabaseHealthMetricsProps) {
  const [metrics, setMetrics] = useState<IDatabaseHealthMetrics>(MOCK_DB_HEALTH_METRICS);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const usagePercent = ((metrics.totalStorageUsedGB / metrics.totalStorageAllocatedGB) * 100).toFixed(1);

  const handleRunOptimize = (tableName: string) => {
    setOptimizing(tableName);
    setTimeout(() => {
      setMetrics((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.tableName === tableName
            ? {
                ...t,
                status: 'HEALTHY',
                lastVacuumAt: 'Just now (Optimized)',
                indexSizeMB: Number((t.indexSizeMB * 0.85).toFixed(1))
              }
            : t
        )
      }));
      setOptimizing(null);
      setNotice(`✅ VACUUM ANALYZE completed for table "${tableName}". B-tree indexes re-balanced.`);
      setTimeout(() => setNotice(null), 4000);
    }, 1200);
  };

  return (
    <div className="space-y-5 font-mono text-xs">
      
      {notice && (
        <div className="p-3.5 rounded-xl border border-[#00d49f] bg-slate-900 text-[#00d49f] text-xs shadow-xl animate-in fade-in">
          {notice}
        </div>
      )}

      {/* Top Telemetry Hardware Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Storage Consumption */}
        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Storage Consumption</span>
            <HardDrive className="h-4 w-4 text-[#00d49f]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{metrics.totalStorageUsedGB} GB</span>
            <span className="text-slate-500 text-[11px]">/ {metrics.totalStorageAllocatedGB} GB</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-[#070d18] rounded-full h-2 overflow-hidden border border-[#17233b]">
            <div
              className="bg-[#00d49f] h-full rounded-full transition-all duration-500"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{usagePercent}% Allocated</span>
            <span className="text-emerald-400">8.16 GB Free</span>
          </div>
        </div>

        {/* Index Cache Hit Ratio */}
        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">B-Tree Cache Hit Ratio</span>
            <Layers className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">{metrics.indexCacheHitRatio}%</div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Shared buffer pool memory efficiency. Queries resolved in RAM.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Optimal In-Memory Reads</span>
          </div>
        </div>

        {/* Query Execution Latency */}
        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Average Query Latency</span>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white">{metrics.avgQueryLatencyMs} ms</div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            p99 transaction commit time across double-entry ledger cluster.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-sky-400 font-bold">
            <Activity className="h-3.5 w-3.5" />
            <span>Sub-20ms SLA Maintained</span>
          </div>
        </div>

        {/* Connection Pool */}
        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-bold">Connection Pool</span>
            <Server className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white">{metrics.activeConnections}</span>
            <span className="text-slate-500 text-[11px]">/ {metrics.maxConnections} Max</span>
          </div>
          <div className="w-full bg-[#070d18] rounded-full h-2 overflow-hidden border border-[#17233b]">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${(metrics.activeConnections / metrics.maxConnections) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>PgBouncer Multiplexed</span>
            <span className="text-cyan-400 font-bold">Healthy Pool</span>
          </div>
        </div>

      </div>

      {/* Table Row Auditor Master Grid */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#17233b] pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-[#00d49f]" />
              <span>Table Row Auditor & Storage Analyzer</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Live collection counts, B-Tree index memory footprints, and VACUUM maintenance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 bg-[#070d18] border border-[#17233b] px-3 py-1.5 rounded-xl">
              Engine: <strong className="text-white">{metrics.databaseEngine}</strong>
            </span>
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#09111e] text-slate-400 uppercase text-[10px] border-b border-[#17233b]">
              <tr>
                <th className="py-3 px-4">Collection / Table</th>
                <th className="py-3 px-4 text-right">Live Rows</th>
                <th className="py-3 px-4 text-right">Data Size</th>
                <th className="py-3 px-4 text-right">Index Size</th>
                <th className="py-3 px-4 text-right">Total Disk</th>
                <th className="py-3 px-4">Primary Index</th>
                <th className="py-3 px-4">Last Maintenance</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17233b]/60">
              {metrics.tables.map((t) => (
                <tr key={t.tableName} className="hover:bg-[#121d33] transition">
                  <td className="py-3.5 px-4 font-mono">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{t.tableName}</span>
                      {t.status === 'HEALTHY' ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          OK
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.2 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                          NEEDS VACUUM
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-0.5">{t.description}</span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-white">
                    {t.rowCount.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-right text-slate-300">
                    {t.dataSizeMB.toFixed(1)} MB
                  </td>

                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {t.indexSizeMB.toFixed(1)} MB
                  </td>

                  <td className="py-3.5 px-4 text-right text-[#00d49f] font-bold">
                    {t.totalSizeMB.toFixed(1)} MB
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <code className="text-[10px] bg-[#070d18] border border-[#17233b] px-2 py-0.5 rounded text-cyan-300">
                      {t.primaryIndex}
                    </code>
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                    {t.lastVacuumAt}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleRunOptimize(t.tableName)}
                      disabled={optimizing === t.tableName}
                      className="px-3 py-1 rounded-lg border border-[#17233b] bg-[#070d18] hover:border-[#00d49f]/40 hover:text-[#00d49f] text-slate-300 text-[10px] transition font-bold disabled:opacity-50"
                    >
                      {optimizing === t.tableName ? 'Optimizing...' : 'Vacuum / Re-index'}
                    </button>
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
