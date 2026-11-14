'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Search,
  MessageCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter,
  Store,
  Home,
  CreditCard,
  Zap,
  Phone
} from 'lucide-react';
import { INITIAL_COMPLAINTS } from '@/lib/mock-data';
import { IAdminComplaint } from '@/types/admin';

export default function ComplaintsDisputeDesk() {
  const [complaints, setComplaints] = useState<IAdminComplaint[]>(INITIAL_COMPLAINTS);
  const [selectedComplaint, setSelectedComplaint] = useState<IAdminComplaint | null>(complaints[0]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleUpdateStatus = (ticketId: string, newStatus: IAdminComplaint['status']) => {
    setComplaints(complaints.map((c) => (c.id === ticketId ? { ...c, status: newStatus } : c)));
    if (selectedComplaint?.id === ticketId) {
      setSelectedComplaint((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    showNotification(`Ticket ${ticketId} status updated to ${newStatus}`);
  };

  const handleOpenWhatsApp = (complaint: IAdminComplaint) => {
    const cleanPhone = complaint.userPhone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Assalam-o-Alaikum ${complaint.userName},\n\nThis is the Digi Hisab SuperAdmin Dispute Desk regarding ticket #${complaint.ticketNumber} (${complaint.title}).\n\nReference: ${complaint.transactionReference || 'N/A'}\nStatus: ${complaint.status}\n\nOur ledger investigation confirms your records have been reviewed. If this was a gateway drop-off, your subscription tier has been credited.\n\nDigi Hisab Support Team`
    );
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(url, '_blank');
  };

  const filteredComplaints = complaints.filter((c) => {
    const matchesSearch =
      c.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.userPhone.includes(searchQuery);
    const matchesCategory = filterCategory === 'ALL' || c.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6">
      
      {/* Toast Notice */}
      {feedbackNotice && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl">
          {feedbackNotice}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Customer Dispute & Ticket Desk</span>
                <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  {complaints.filter((c) => c.status === 'OPEN').length} Open
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Resolution engine for JazzCash/Raast drop-offs, Dukandar Udhaar Khata discrepancies, and LESCO sub-meter disputes
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Quick Link */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] px-4 py-2 text-slate-300 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            <span>1-Tap WhatsApp Resolver Enabled</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search ticket #, phone, merchant name, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d49f]"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#00d49f]"
          >
            <option value="ALL">All Categories</option>
            <option value="PAYMENT_GATEWAY">💳 Gateway Drop-offs (JazzCash/PayFast)</option>
            <option value="KHATA_DISPUTE">🏪 Udhaar Khata Discrepancies</option>
            <option value="SUB_METER">⚡ Domestic Sub-Meter (LESCO)</option>
            <option value="ACCOUNT_ACCESS">🔒 Account & PIN Lockout</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#00d49f]"
          >
            <option value="ALL">All Ticket Statuses</option>
            <option value="OPEN">🔴 Open</option>
            <option value="INVESTIGATING">🟡 Investigating</option>
            <option value="ESCALATED">🟠 Escalated</option>
            <option value="RESOLVED">🟢 Resolved</option>
            <option value="REJECTED">⚫ Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Priority Queue & Context Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Ticket Queue List */}
        <div className="lg:col-span-6 space-y-3">
          {filteredComplaints.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedComplaint(ticket)}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                selectedComplaint?.id === ticket.id
                  ? 'bg-[#121d33] border-[#00d49f] shadow-lg shadow-[#00d49f]/5'
                  : 'bg-[#0d1627] border-[#17233b] hover:bg-[#101b2f]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{ticket.ticketNumber}</span>
                  {ticket.personaType === 'DUKANDAR' ? (
                    <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                      <Store className="h-3 w-3" /> Dukandar
                    </span>
                  ) : (
                    <span className="text-sky-400 text-[10px] flex items-center gap-1">
                      <Home className="h-3 w-3" /> Household
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                      ticket.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-300'
                        : ticket.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {ticket.priority}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded font-bold ${
                      ticket.status === 'RESOLVED'
                        ? 'bg-emerald-500/20 text-[#00d49f]'
                        : ticket.status === 'OPEN'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
              </div>

              <h3 className="text-sm font-semibold text-slate-100 mt-2 line-clamp-1">{ticket.title}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-3 pt-2 border-t border-[#17233b]">
                <span>{ticket.userName} ({ticket.userPhone})</span>
                <span>{ticket.createdAt}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Selected Complaint Diagnostic Inspector */}
        {selectedComplaint && (
          <div className="lg:col-span-6 rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center justify-between border-b border-[#17233b] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#00d49f] uppercase bg-[#00d49f]/10 border border-[#00d49f]/20 px-2 py-0.5 rounded">
                  {selectedComplaint.category}
                </span>
                <h2 className="text-base font-bold text-white mt-1.5">{selectedComplaint.ticketNumber}</h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block">Logged At</span>
                <span className="text-xs font-mono text-slate-200">{selectedComplaint.createdAt}</span>
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-sm font-bold text-white">{selectedComplaint.title}</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-[#070d18] p-3.5 rounded-xl border border-[#17233b]">
                {selectedComplaint.description}
              </p>
            </div>

            {/* Context Telemetry */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
                <span className="text-[10px] text-slate-400 uppercase block">Registered Phone</span>
                <span className="text-sm font-bold text-white">{selectedComplaint.userPhone}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
                <span className="text-[10px] text-slate-400 uppercase block">Device & Build</span>
                <span className="text-xs font-bold text-[#00d49f] truncate block">
                  {selectedComplaint.deviceModel || 'Samsung Galaxy Tab'} ({selectedComplaint.appVersion || 'v2.4'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
                <span className="text-[10px] text-slate-400 uppercase block">Transaction Ref</span>
                <span className="text-xs font-bold text-sky-400">{selectedComplaint.transactionReference || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
                <span className="text-[10px] text-slate-400 uppercase block">User Persona</span>
                <span className="text-xs font-bold text-white">{selectedComplaint.personaType}</span>
              </div>
            </div>

            {/* Resolution Status Pipeline */}
            <div className="space-y-2 pt-2 border-t border-[#17233b]">
              <span className="text-xs font-bold font-mono text-slate-300 block">Status Pipeline Transition:</span>
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px]">
                {(['OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(selectedComplaint.id, st)}
                    className={`py-2 px-1 rounded-lg border font-bold transition text-center ${
                      selectedComplaint.status === st
                        ? 'border-[#00d49f] bg-[#00d49f]/20 text-[#00d49f]'
                        : 'border-[#17233b] bg-[#070d18] text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* 1-Tap WhatsApp Resolver Button */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleOpenWhatsApp(selectedComplaint)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs font-mono transition shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle className="h-4 w-4" />
                <span>1-Tap WhatsApp Resolver (Pre-filled Voucher Slip)</span>
              </button>

              <Link
                href={`/admin/complaints/${selectedComplaint.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-mono py-2.5 text-xs font-bold transition"
              >
                <span>Open Diagnostic Ledger Inspector</span>
                <ExternalLink className="h-3.5 w-3.5 text-[#00d49f]" />
              </Link>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
