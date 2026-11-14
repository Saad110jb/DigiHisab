'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { IPricingAuditLog } from '@/types/subscription';

export default function SubscriptionsAuditPage() {
  const [logs, setLogs] = useState<IPricingAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/subscriptions/audit');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLogs(json.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#17233b]">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/subscriptions"
              className="text-xs text-[#00d49f] hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Subscription Matrix</span>
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400">Proration &amp; Pricing Overrides</span>
          </div>

          <h1 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2.5">
            <History className="w-7 h-7 text-amber-400" />
            <span>Price Change History &amp; Proration Logs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically chained SHA-256 audit trail tracking all tier price adjustments, grandfathered subscribers, and admin justifications.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="p-2.5 rounded-xl bg-[#0d1627] border border-[#17233b] hover:border-slate-600 text-slate-300 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00d49f]' : ''}`} />
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070e1b] text-slate-400 uppercase tracking-wider border-b border-[#17233b] text-[10px]">
              <tr>
                <th className="py-3 px-4">Audit ID</th>
                <th className="py-3 px-4">Plan &amp; Key</th>
                <th className="py-3 px-4">Price Mutation</th>
                <th className="py-3 px-4">Grandfathered Subs</th>
                <th className="py-3 px-4">Admin Authority</th>
                <th className="py-3 px-4">Timestamp (PKT)</th>
                <th className="py-3 px-4 text-right">SHA-256 Chained Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17233b] text-slate-300">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                    {log.id}
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-white block">{log.tierName}</span>
                    <span className="text-[10px] text-slate-400">{log.tierPlanKey}</span>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="line-through text-slate-400">Rs. {log.oldPricePKR}</span>
                      <span className="text-amber-400 font-bold">&rarr;</span>
                      <span className="text-[#00d49f] font-bold">Rs. {log.newPricePKR}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                      {log.grandfatheredSubscribers} legacy users locked
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    <div>
                      <span className="text-white block font-bold">{log.changedBy}</span>
                      <span className="text-[10px] text-amber-400">{log.role}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleCopyHash(log.sha256Hash)}
                      className="px-2 py-1 rounded bg-[#070e1b] hover:bg-slate-800 border border-[#17233b] text-[10px] font-mono text-slate-400 hover:text-white transition inline-flex items-center gap-1"
                      title="Click to copy full SHA-256 hash"
                    >
                      <span>{log.sha256Hash.substring(0, 12)}...</span>
                      {copiedHash === log.sha256Hash ? (
                        <Check className="w-3 h-3 text-[#00d49f]" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-500" />
                      )}
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
