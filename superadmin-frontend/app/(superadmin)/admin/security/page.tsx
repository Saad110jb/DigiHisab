'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Key,
  AlertTriangle,
  FileCheck2,
  Terminal,
  Activity,
  CheckCircle2,
  RotateCcw,
  Zap
} from 'lucide-react';
import { INITIAL_SECURITY_LOGS, INITIAL_JOURNAL_VOUCHERS, INITIAL_USERS } from '@/lib/mock-data';
import { ISecurityOverrideLog, IJournalEntryAudit } from '@/types/admin';

export default function ForensicSecuritySentinelPage() {
  const [securityLogs, setSecurityLogs] = useState<ISecurityOverrideLog[]>(INITIAL_SECURITY_LOGS);
  const [vouchers, setVouchers] = useState<IJournalEntryAudit[]>(INITIAL_JOURNAL_VOUCHERS);
  const [lockedAccounts, setLockedAccounts] = useState(INITIAL_USERS.filter((u) => u.failedPinAttempts >= 5 || u.status === 'FROZEN'));
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleUnlockAccount = (userId: string) => {
    setLockedAccounts(lockedAccounts.filter((u) => u.id !== userId));
    showNotification(`🔓 Account ${userId} unlocked! Failed PIN attempts reset to 0.`);
  };

  const handleReconcileVoucher = (voucherId: string) => {
    setVouchers(
      vouchers.map((v) =>
        v.id === voucherId ? { ...v, totalCreditPKR: v.totalDebitPKR, isBalanced: true } : v
      )
    );
    showNotification(`⚡ Voucher ${voucherId} ledger balanced mathematically. Discrepancy eliminated.`);
  };

  const totalDebits = vouchers.reduce((acc, v) => acc + v.totalDebitPKR, 0);
  const totalCredits = vouchers.reduce((acc, v) => acc + v.totalCreditPKR, 0);
  const totalDiscrepancy = Math.abs(totalDebits - totalCredits);

  return (
    <div className="p-4 sm:p-8 space-y-6">
      
      {/* Toast */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Forensic Security & System Sentinel</span>
                <span className="text-xs font-mono text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full border border-rose-400/20">
                  Zero-Trust Enforced
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Immutable audit trails for Cashier/Malik master PIN overrides, brute-force lockouts, and mathematical double-entry validation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] px-4 py-2.5 text-center">
            <span className="text-[10px] text-slate-400 block uppercase">PIN Lockouts</span>
            <span className="text-sm font-bold text-rose-400">{lockedAccounts.length} Flagged</span>
          </div>
          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] px-4 py-2.5 text-center">
            <span className="text-[10px] text-slate-400 block uppercase">Ledger Discrepancy</span>
            <span className={`text-sm font-bold ${totalDiscrepancy === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              Rs. {totalDiscrepancy.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Mathematical Double-Entry Equation Banner */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#17233b] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/30 flex items-center justify-center text-[#00d49f]">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Double-Entry Ledger Integrity Equation</span>
                <span className="font-mono text-xs text-[#00d49f] px-2 py-0.5 rounded bg-[#00d49f]/10">
                  ∑ Debits = ∑ Credits
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Guarantees zero fractional drift or unbacked money creation across Pakistani merchant books
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">System Debit Sum:</span>
              <span className="text-sm font-bold text-emerald-400">Rs. {totalDebits.toLocaleString()}</span>
            </div>
            <span className="text-slate-600 font-bold">=</span>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">System Credit Sum:</span>
              <span className="text-sm font-bold text-sky-400">Rs. {totalCredits.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Voucher Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070d18] text-slate-400 text-[10px] uppercase border-b border-[#17233b]">
              <tr>
                <th className="py-2.5 px-3">Voucher Ref</th>
                <th className="py-2.5 px-3">Merchant / Household</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Debit (PKR)</th>
                <th className="py-2.5 px-3">Credit (PKR)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Sentinel Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17233b]/60">
              {vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-[#121d33] transition">
                  <td className="py-3 px-3 text-white font-bold">{v.voucherNumber}</td>
                  <td className="py-3 px-3 text-slate-300 font-sans">{v.userName}</td>
                  <td className="py-3 px-3 text-slate-400 font-sans">{v.description}</td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">Rs. {v.totalDebitPKR.toLocaleString()}</td>
                  <td className="py-3 px-3 text-sky-400 font-bold">Rs. {v.totalCreditPKR.toLocaleString()}</td>
                  <td className="py-3 px-3">
                    {v.isBalanced ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-bold animate-pulse">
                        <AlertTriangle className="h-3.5 w-3.5" /> Drift Rs. {(v.totalDebitPKR - v.totalCreditPKR).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {!v.isBalanced ? (
                      <button
                        onClick={() => handleReconcileVoucher(v.id)}
                        className="rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 px-2.5 py-1 text-[11px] font-bold"
                      >
                        ⚡ Auto-Rebalance
                      </button>
                    ) : (
                      <span className="text-slate-600 text-[10px]">Audit Passed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Cashier & Malik PIN Overrides & Brute Force Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Cashier & Malik PIN Overrides */}
        <div className="lg:col-span-7 rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Cashier & Malik PIN Overrides (Forensic Stream)</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Live Tamper Telemetry</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {securityLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-[#17233b] bg-[#070d18] p-3.5 space-y-2 hover:border-[#00d49f]/30 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.storeName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-sans">
                      {log.cashierName}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      log.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {log.severity}
                  </span>
                </div>

                <div className="text-slate-300 flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">{log.actionType}</span>
                  {log.deltaAmount ? <span>Amount: Rs. {log.deltaAmount.toLocaleString()}</span> : null}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-[#17233b]">
                  <span>IP: {log.ipAddress}</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brute-Force Account Protection Desk */}
        <div className="lg:col-span-5 rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-rose-400" />
              <h2 className="text-sm font-bold text-white">Brute-Force Account Unlock Desk</h2>
            </div>
            <span className="text-[10px] font-mono text-rose-400 font-bold">≥ 5 Fails</span>
          </div>

          <p className="text-xs text-slate-400">
            Accounts temporarily locked due to repeated incorrect security PIN submissions on POS counters.
          </p>

          <div className="space-y-3 font-mono text-xs">
            {lockedAccounts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-dashed border-[#17233b] rounded-xl">
                No brute-force lockouts active. All merchant accounts healthy.
              </div>
            ) : (
              lockedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{acc.fullName}</span>
                      <span className="text-[11px] text-slate-400">{acc.businessOrHomeName} ({acc.phoneNumber})</span>
                    </div>
                    <span className="text-xs font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                      {acc.failedPinAttempts} Failed Attempts
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleUnlockAccount(acc.id)}
                      className="flex-1 rounded-lg bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-bold text-xs py-2 text-center transition flex items-center justify-center gap-1.5"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>Unlock Account</span>
                    </button>
                    <button
                      onClick={() => showNotification(`SMS PIN OTP dispatched to ${acc.phoneNumber}`)}
                      className="rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs px-3 py-2 hover:bg-slate-700 transition"
                    >
                      Send SMS OTP
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
