'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  FileText,
  Clock,
  ShieldAlert,
  Zap,
  DollarSign,
  User,
  Smartphone
} from 'lucide-react';
import { INITIAL_COMPLAINTS, INITIAL_JOURNAL_VOUCHERS } from '@/lib/mock-data';

export default function DiagnosticLedgerInspector() {
  const params = useParams();
  const ticketId = params?.id as string;
  const complaint = INITIAL_COMPLAINTS.find((c) => c.id === ticketId) || INITIAL_COMPLAINTS[0];

  const [status, setStatus] = useState(complaint.status);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleResolveAndCredit = () => {
    setStatus('RESOLVED');
    showNotification(`⚡ Dispute ${complaint.ticketNumber} marked RESOLVED. Missing subscription/funds credited immediately.`);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Toast */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#17233b] pb-4">
        <Link
          href="/admin/complaints"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dispute Desk</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">Diagnostic Inspector: {complaint.ticketNumber}</span>
      </div>

      {/* Hero Summary Card */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                {complaint.category}
              </span>
              <span className="text-xs font-mono text-slate-400">Ref: {complaint.transactionReference || 'N/A'}</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{complaint.title}</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Lodged by: <span className="text-white font-bold">{complaint.userName}</span> ({complaint.userPhone}) • Device: {complaint.deviceModel}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleResolveAndCredit}
              className="rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-bold font-mono text-xs px-4 py-2.5 flex items-center gap-2 transition"
            >
              <Zap className="h-4 w-4" />
              <span>Credit & Resolve Ticket</span>
            </button>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#070d18] border border-[#17233b] text-xs text-slate-300 leading-relaxed">
          {complaint.description}
        </div>
      </div>

      {/* Diagnostic Context: Historical Ledger Entries */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#00d49f]" />
            <h2 className="text-sm font-bold text-white">Related Ledger Vouchers & Journal Mutations</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Forensic Audit Stream</span>
        </div>

        <div className="space-y-2 font-mono text-xs">
          {INITIAL_JOURNAL_VOUCHERS.map((v) => (
            <div
              key={v.id}
              className="rounded-xl border border-[#17233b] bg-[#070d18] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <span className="text-white font-bold">{v.voucherNumber}</span>
                <span className="text-slate-400 font-sans ml-2">{v.description}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-300">Dr: Rs. {v.totalDebitPKR.toLocaleString()}</span>
                <span className="text-slate-300">Cr: Rs. {v.totalCreditPKR.toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${v.isBalanced ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-300'}`}>
                  {v.isBalanced ? 'Balanced' : 'Unbalanced'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Telemetry & Log Audit Trail */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-3 font-mono text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
          <Clock className="h-4 w-4 text-[#00d49f]" />
          <span>Last 5 Automated Event Traces</span>
        </h3>
        <div className="space-y-2 text-[11px] text-slate-400 bg-[#070d18] p-4 rounded-xl border border-[#17233b]">
          <div>[2026-11-04 11:32:01] Gateway webhook listener received IPN trigger from payment processor.</div>
          <div>[2026-11-04 11:32:02] Token verification passed with signature SHA-256 HMAC.</div>
          <div>[2026-11-04 11:32:03] Client POS terminal heartbeat timeout (HTTP 504) after 3 retries.</div>
          <div>[2026-11-04 11:32:05] Ticket auto-created in priority dispute desk under category PAYMENT_GATEWAY.</div>
          <div className="text-emerald-400">[2026-11-04 11:35:10] SuperAdmin inspected session logs. Ready for WhatsApp dispatch.</div>
        </div>
      </div>
    </div>
  );
}
