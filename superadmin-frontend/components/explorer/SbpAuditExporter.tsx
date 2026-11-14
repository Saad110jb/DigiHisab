'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Calendar,
  Search,
  CheckCircle2,
  Lock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ISbpAuditRecord } from '@/types/admin';
import { MOCK_SBP_AUDIT_TRAIL } from '@/lib/explorer-store';
import { downloadSbpAuditCsv } from '@/lib/sbp-export-utils';

export default function SbpAuditExporter() {
  const [records, setRecords] = useState<ISbpAuditRecord[]>(MOCK_SBP_AUDIT_TRAIL);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const pageSize = 8;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedChannel !== 'ALL' && r.channel !== selectedChannel) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const stanMatch = r.stan.includes(q);
        const rrnMatch = r.rrn.includes(q);
        const merchantMatch = r.merchantName.toLowerCase().includes(q);
        const cnicMatch = r.merchantCnic.includes(q);
        const ntnMatch = r.merchantNtn.toLowerCase().includes(q);
        const txnMatch = r.transactionUuid.toLowerCase().includes(q);
        if (!stanMatch && !rrnMatch && !merchantMatch && !cnicMatch && !ntnMatch && !txnMatch) {
          return false;
        }
      }
      return true;
    });
  }, [records, selectedChannel, searchTerm]);

  const totalVolume = useMemo(() => {
    return filteredRecords.reduce((acc, curr) => acc + curr.amountPKR, 0);
  }, [filteredRecords]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleExportCsv = () => {
    downloadSbpAuditCsv(filteredRecords, 'SBP_Transaction_Audit_Trail');
    setDownloadSuccess(`✅ SBP compliance CSV generated with ${filteredRecords.length} records. Download started.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      
      {/* Download Alert Toast */}
      {downloadSuccess && (
        <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs shadow-xl animate-in fade-in">
          {downloadSuccess}
        </div>
      )}

      {/* SBP Regulatory Compliance Banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-[#0d1627] p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">State Bank of Pakistan (SBP) Transaction Audit Trail</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                PSD-04-2023 EMI SPEC
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Cryptographically verified audit trail formatted for State Bank on-site inspections and external financial auditors.
            </p>
          </div>
        </div>

        {/* 1-Click Export Button */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-500 uppercase block">Audited Turnover</span>
            <span className="text-sm font-bold text-cyan-400">Rs. {totalVolume.toLocaleString()}</span>
          </div>
          <button
            onClick={handleExportCsv}
            className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2.5 flex items-center gap-2 transition shadow-lg shadow-cyan-500/10 text-xs"
          >
            <Download className="h-4 w-4" />
            <span>Export SBP CSV Dossier</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by STAN (e.g. 009821), RRN, Merchant CNIC, NTN, or Txn UUID..."
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-xs"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={selectedChannel}
            onChange={(e) => {
              setSelectedChannel(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs"
          >
            <option value="ALL">All Payment Channels</option>
            <option value="RAAST_P2M">🏛️ Raast P2M National Switch</option>
            <option value="POS_DIGITAL">💳 POS Digital Card Swipe</option>
            <option value="OTC_CASH">💵 OTC Walk-in Counter Cash</option>
            <option value="JAZZCASH_IPN">📱 JazzCash IPN Direct</option>
            <option value="EASYPAISA">📱 Easypaisa Digital</option>
          </select>
        </div>
      </div>

      {/* Table of SBP Records */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09111e] text-slate-400 uppercase text-[10px] border-b border-[#17233b]">
              <tr>
                <th className="py-3 px-3">STAN / RRN</th>
                <th className="py-3 px-3">Merchant & CNIC</th>
                <th className="py-3 px-3">Remitter → Beneficiary</th>
                <th className="py-3 px-3 text-right">Amount (PKR)</th>
                <th className="py-3 px-3">Channel</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Timestamp (PKT)</th>
                <th className="py-3 px-3 text-center">Audit Seal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17233b]/60">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No SBP audit records matched your filter.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.stan} className="hover:bg-[#121d33] transition">
                    
                    {/* STAN / RRN */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-white text-[11px]">STAN: {r.stan}</div>
                      <span className="text-[10px] text-slate-500 block">RRN: {r.rrn}</span>
                    </td>

                    {/* Merchant & CNIC */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-200 truncate max-w-[150px]">{r.merchantName}</div>
                      <span className="text-[10px] text-cyan-300 block">{r.merchantCnic}</span>
                      <span className="text-[9px] text-slate-500 block">{r.merchantNtn}</span>
                    </td>

                    {/* Remitter -> Beneficiary */}
                    <td className="py-3.5 px-3">
                      <div className="text-slate-300 truncate max-w-[160px]" title={r.remitterIbanOrPhone}>
                        From: <span className="text-white font-mono">{r.remitterIbanOrPhone}</span>
                      </div>
                      <div className="text-slate-400 truncate max-w-[160px] mt-0.5" title={r.beneficiaryIbanOrWallet}>
                        To: <span className="text-[#00d49f] font-mono">{r.beneficiaryIbanOrWallet}</span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-3 text-right font-bold text-white">
                      Rs. {r.amountPKR.toLocaleString()}
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-[#17233b] bg-[#070d18] text-slate-300">
                        {r.channel.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{r.settlementStatus}</span>
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-3 text-slate-400 text-[10px]">
                      {r.timestampPkt}
                    </td>

                    {/* Cryptographic SHA256 Seal */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className="inline-flex items-center justify-center text-cyan-400 hover:text-cyan-300 cursor-pointer"
                        title={r.tamperProofFingerprint}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#09111e] border-t border-[#17233b] text-xs font-mono">
            <span className="text-slate-400">
              Page <span className="text-white font-bold">{currentPage}</span> of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-[#17233b] bg-[#0d1627] hover:bg-[#121d33] disabled:opacity-40 px-3 py-1.5 text-slate-300 flex items-center gap-1 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="rounded-lg border border-[#17233b] bg-[#0d1627] hover:bg-[#121d33] disabled:opacity-40 px-3 py-1.5 text-slate-300 flex items-center gap-1 transition"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
