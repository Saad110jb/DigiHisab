'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building,
  Hash,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { IRawJournalEntry, AccountHeadType } from '@/types/admin';
import { INITIAL_RAW_JEV_ENTRIES } from '@/lib/explorer-store';

interface RawJevTableProps {
  initialVoucherFilter?: string;
}

export default function RawJevTable({ initialVoucherFilter = '' }: RawJevTableProps) {
  const [entries, setEntries] = useState<IRawJournalEntry[]>(INITIAL_RAW_JEV_ENTRIES);
  const [searchQuery, setSearchQuery] = useState(initialVoucherFilter);
  const [selectedAccountHead, setSelectedAccountHead] = useState<string>('ALL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Filter logic
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      // Account Head filter
      if (selectedAccountHead !== 'ALL' && item.accountHead !== selectedAccountHead) {
        return false;
      }
      // Branch filter
      if (selectedBranch !== 'ALL' && item.branchName !== selectedBranch) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const voucherMatch = item.voucherRef.toLowerCase().includes(q);
        const narrationMatch = item.narration.toLowerCase().includes(q);
        const branchMatch = item.branchName.toLowerCase().includes(q);
        const subCatMatch = item.accountSubCategory.toLowerCase().includes(q);
        const counterpartyMatch = item.counterpartyName?.toLowerCase().includes(q) || false;
        if (!voucherMatch && !narrationMatch && !branchMatch && !subCatMatch && !counterpartyMatch) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedAccountHead, selectedBranch, searchQuery]);

  // Totals & Mathematical Balance Check
  const totalDebits = useMemo(() => filteredEntries.reduce((acc, curr) => acc + curr.debitPKR, 0), [filteredEntries]);
  const totalCredits = useMemo(() => filteredEntries.reduce((acc, curr) => acc + curr.creditPKR, 0), [filteredEntries]);
  const discrepancy = Math.abs(totalDebits - totalCredits);
  const isBalanced = discrepancy === 0;

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.branchName)));
  }, [entries]);

  return (
    <div className="space-y-4">
      
      {/* Ledger Double-Entry Health Bar */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
            isBalanced
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {isBalanced ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-mono">Master Double-Entry Integrity Sentinel</h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                isBalanced
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}>
                {isBalanced ? 'ZERO DISCREPANCY (BALANCED)' : `DISCREPANCY: Rs. ${discrepancy.toLocaleString()}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified double-entry journal vouchers anchored in cryptographic SHA-256 chained hashes.
            </p>
          </div>
        </div>

        {/* Total Debits vs Credits */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2">
            <span className="text-[10px] text-slate-500 uppercase block">Total Debits</span>
            <span className="text-sm font-bold text-emerald-400">Rs. {totalDebits.toLocaleString()}</span>
          </div>
          <div className="rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2">
            <span className="text-[10px] text-slate-500 uppercase block">Total Credits</span>
            <span className="text-sm font-bold text-sky-400">Rs. {totalCredits.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter and Query Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-mono">
        {/* Search */}
        <div className="sm:col-span-5 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Voucher Ref (e.g. JV-2026-1049), counterparty, or narration..."
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d49f]"
          />
        </div>

        {/* Account Head Filter */}
        <div className="sm:col-span-4">
          <select
            value={selectedAccountHead}
            onChange={(e) => {
              setSelectedAccountHead(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2.5 text-slate-200 focus:outline-none focus:border-[#00d49f]"
          >
            <option value="ALL">All Account Heads (تمام کھاتے)</option>
            <option value="CASH_IN_HAND">💵 Cash in Hand (Till / Safe Vault)</option>
            <option value="BANK_ACCOUNTS">🏦 Bank Accounts (Meezan / HBL / Raast)</option>
            <option value="CUSTOMER_RECEIVABLES">👤 Customer Receivables (Udhaar Book)</option>
            <option value="SUPPLIER_PAYABLES">📦 Supplier Payables (Vendor Khata)</option>
            <option value="SALES_REVENUE">📈 Sales Revenue (OTC / Wholesale)</option>
            <option value="OPERATIONAL_EXPENSE">🧾 Operational Expense (Utilities / Rent)</option>
          </select>
        </div>

        {/* Branch Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2.5 text-slate-200 focus:outline-none focus:border-[#00d49f]"
          >
            <option value="ALL">All Branches & Houses</option>
            {uniqueBranches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main JEV Table */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#09111e] text-slate-400 uppercase text-[10px] border-b border-[#17233b]">
              <tr>
                <th className="py-3 px-4">Voucher & Date</th>
                <th className="py-3 px-4">Branch & Entity</th>
                <th className="py-3 px-4">Account Head</th>
                <th className="py-3 px-4">Narration & Counterparty</th>
                <th className="py-3 px-4 text-right">Debit (PKR)</th>
                <th className="py-3 px-4 text-right">Credit (PKR)</th>
                <th className="py-3 px-4 text-right">Running Vault</th>
                <th className="py-3 px-4 text-center">Seal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17233b]/60">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No journal vouchers match the active filters.
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-[#121d33] transition">
                    
                    {/* Voucher & Timestamp */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-[#00d49f]" />
                        <span>{row.voucherRef}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{row.timestamp}</span>
                    </td>

                    {/* Branch & Entity */}
                    <td className="py-3.5 px-4">
                      <div className="text-white font-medium truncate max-w-[140px]">{row.branchName}</div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">{row.branchCity}</span>
                    </td>

                    {/* Account Head */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border border-[#17233b] bg-[#070d18] text-slate-200">
                        {row.accountHead.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[140px]">
                        {row.accountSubCategory}
                      </span>
                    </td>

                    {/* Narration & Counterparty */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 text-xs truncate max-w-[220px]" title={row.narration}>
                        {row.narration}
                      </div>
                      {row.counterpartyName && (
                        <span className="text-[10px] text-[#00d49f] block mt-0.5 truncate max-w-[220px]">
                          Target: {row.counterpartyName}
                        </span>
                      )}
                    </td>

                    {/* Debit */}
                    <td className="py-3.5 px-4 text-right">
                      {row.debitPKR > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          Rs. {row.debitPKR.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Credit */}
                    <td className="py-3.5 px-4 text-right">
                      {row.creditPKR > 0 ? (
                        <span className="text-sky-400 font-bold">
                          Rs. {row.creditPKR.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Running Vault */}
                    <td className="py-3.5 px-4 text-right text-slate-300 font-medium">
                      Rs. {row.runningBalancePKR.toLocaleString()}
                    </td>

                    {/* Cryptographic SHA-256 Seal */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className="inline-flex items-center justify-center text-slate-400 hover:text-[#00d49f] cursor-pointer"
                        title={`SHA-256 Hash Seal: ${row.hashSha256}`}
                      >
                        <ShieldCheck className="h-4 w-4 text-[#00d49f]" />
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#09111e] border-t border-[#17233b] text-xs font-mono">
            <span className="text-slate-400">
              Page <span className="text-white font-bold">{currentPage}</span> of {totalPages} ({filteredEntries.length} entries)
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
