'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Search,
  Filter,
  ShieldCheck,
  CreditCard,
  Building,
  Home,
  Store,
  RefreshCw,
  Bell,
  Send,
  Eye,
  Check,
  ChevronRight,
  Sparkles,
  AlertOctagon,
  Upload
} from 'lucide-react';
import DualCnicViewer from '@/components/documents/DualCnicViewer';
import OcrComparisonGrid from '@/components/documents/OcrComparisonGrid';
import NadraVerisysMockCard from '@/components/documents/NadraVerisysMockCard';
import { IKycDocumentRecord, KycSubmissionStatus } from '@/types/admin';

export default function DocumentKycDeskPage() {
  const [documents, setDocuments] = useState<IKycDocumentRecord[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    expiringSoon: 0,
    rejected: 0
  });
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<IKycDocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  // Reject reason modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('Blurry photo / glare on Smart Chip. Please re-scan Front side in good lighting.');
  const [actionInProgress, setActionInProgress] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleSystemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedDoc) return;
    const reader = new FileReader();
    reader.onload = () => {
      const resultUri = reader.result as string;
      setSelectedDoc({
        ...selectedDoc,
        frontImageUrl: resultUri,
        ocrDetails: {
          ...selectedDoc.ocrDetails,
          confidenceScore: 99.4,
          extractedAt: 'Just now (Uploaded from System)'
        }
      });
      showToast('📸 New picture successfully loaded from system storage!');
    };
    reader.readAsDataURL(file);
  };

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 4000);
  };

  const loadDocuments = async (status = activeFilter) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/documents?status=${status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setDocuments(json.data.documents);
        setCounts(json.data.counts);
        if (!selectedDoc && json.data.documents.length > 0) {
          setSelectedDoc(json.data.documents[0]);
        } else if (selectedDoc) {
          const updated = json.data.documents.find((d: IKycDocumentRecord) => d.id === selectedDoc.id);
          if (updated) setSelectedDoc(updated);
        }
      }
    } catch (e: any) {
      showToast('Failed to load documents: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments(activeFilter);
  }, [activeFilter]);

  const handleApprove = async () => {
    if (!selectedDoc) return;
    setActionInProgress(true);
    try {
      const res = await fetch('/api/v1/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: selectedDoc.id, action: 'APPROVE' })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ CNIC approved for ${selectedDoc.userName}! SBP transaction limits expanded.`);
        loadDocuments();
      }
    } catch (e: any) {
      showToast('Approval failed: ' + e.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc) return;
    setActionInProgress(true);
    try {
      const res = await fetch('/api/v1/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: selectedDoc.id,
          action: 'REJECT',
          reason: rejectionReason
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`❌ Document rejected for ${selectedDoc.userName}. Notification sent to merchant dashboard.`);
        setRejectModalOpen(false);
        loadDocuments();
      }
    } catch (e: any) {
      showToast('Rejection failed: ' + e.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleTriggerVerisys = async () => {
    if (!selectedDoc) return;
    const res = await fetch('/api/v1/admin/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId: selectedDoc.id, action: 'VERISYS_CHECK' })
    });
    const json = await res.json();
    if (json.success) {
      showToast('⚡ Simulated NADRA Verisys query completed successfully!');
      loadDocuments();
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.userName.toLowerCase().includes(q) ||
      d.ocrDetails.cnicNumber.includes(q) ||
      d.userPhone.includes(q) ||
      d.entityName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-8 space-y-6">
      
      {/* Dynamic Toast Notice */}
      {toastNotice && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl animate-in slide-in-from-top-2">
          {toastNotice}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/20 text-[#00d49f]">
              <FileCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Document & Smart CNIC Intelligence Desk</span>
                <span className="text-xs font-mono font-semibold text-[#00d49f] px-2 py-0.5 rounded-full bg-[#00d49f]/10 border border-[#00d49f]/20">
                  Dual-Sided OCR
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Front & Back Smart CNIC scanner, OCR cross-referencing, simulated NADRA Verisys check, and 30-day expiry sentinel
              </p>
            </div>
          </div>
        </div>

        {/* Live Counters Summary */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Pending Review</span>
            <span className="text-sm font-bold text-amber-400">{counts.pending}</span>
          </div>
          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Expiring &lt;30d</span>
            <span className="text-sm font-bold text-rose-400">{counts.expiringSoon}</span>
          </div>
          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2 text-center">
            <span className="text-[10px] text-slate-500 uppercase block">Approved</span>
            <span className="text-sm font-bold text-emerald-400">{counts.approved}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-[#17233b] gap-2 overflow-x-auto text-xs font-mono scrollbar-none">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeFilter === 'ALL'
              ? 'border-[#00d49f] text-[#00d49f]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>All Documents ({counts.total})</span>
        </button>

        <button
          onClick={() => setActiveFilter('PENDING_REVIEW')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeFilter === 'PENDING_REVIEW'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Pending Review ({counts.pending})</span>
        </button>

        <button
          onClick={() => setActiveFilter('APPROVED')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeFilter === 'APPROVED'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Approved ({counts.approved})</span>
        </button>

        <button
          onClick={() => setActiveFilter('EXPIRING_SOON')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeFilter === 'EXPIRING_SOON'
              ? 'border-rose-400 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          <span>Expiring Soon (&lt;30 Days) ({counts.expiringSoon})</span>
        </button>

        <button
          onClick={() => setActiveFilter('REJECTED')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeFilter === 'REJECTED'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Rejected ({counts.rejected})</span>
        </button>
      </div>

      {/* Main Content Layout: Left Document Queue + Right Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-mono">
        
        {/* Left Document List (col-span-5) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl space-y-3 p-4">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, CNIC number, or phone..."
              className="w-full rounded-xl border border-[#17233b] bg-[#070d18] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d49f]"
            />
          </div>

          {/* List items */}
          <div className="divide-y divide-[#17233b]/60 space-y-1">
            {filteredDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No CNIC documents found matching active filter.
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#121d33] border-l-2 border-[#00d49f]'
                        : 'hover:bg-[#121d33]/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{doc.userName}</span>
                        {doc.userPersona === 'DUKANDAR' ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                            POS
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.2 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300">
                            GHAR
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{doc.entityName} • {doc.city}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px]">
                        <span className="text-cyan-300 font-bold">{doc.ocrDetails.cnicNumber}</span>
                        <span>•</span>
                        {doc.status === 'APPROVED' ? (
                          <span className="text-emerald-400 font-bold">APPROVED</span>
                        ) : doc.status === 'PENDING_REVIEW' ? (
                          <span className="text-amber-400 font-bold">PENDING REVIEW</span>
                        ) : doc.status === 'EXPIRING_SOON' ? (
                          <span className="text-rose-400 font-bold">EXPIRING &lt;16d</span>
                        ) : (
                          <span className="text-slate-400 font-bold">REJECTED</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-[#00d49f]' : 'text-slate-600'}`} />
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Detail Inspector Deck (col-span-7) */}
        {selectedDoc ? (
          <div className="lg:col-span-7 rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-2xl space-y-5 animate-in fade-in">
            
            {/* Header with Status & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#17233b] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{selectedDoc.userName}</h2>
                  <span className="text-xs text-slate-400">({selectedDoc.userId})</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    selectedDoc.status === 'APPROVED'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : selectedDoc.status === 'PENDING_REVIEW'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : selectedDoc.status === 'EXPIRING_SOON'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}>
                    {selectedDoc.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedDoc.userPhone} • {selectedDoc.entityName} • {selectedDoc.city}
                </p>
              </div>

              {/* 1-Click Action Buttons & System Upload */}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSystemImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2 flex items-center gap-1.5 transition"
                  title="Upload a test CNIC picture directly from your PC/Mac"
                >
                  <Upload className="h-4 w-4 text-[#00d49f]" />
                  <span>Upload Picture</span>
                </button>
                <button
                  disabled={actionInProgress}
                  onClick={handleApprove}
                  className="rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 disabled:opacity-50 text-slate-950 font-bold text-xs px-3.5 py-2 flex items-center gap-1.5 transition shadow-lg shadow-[#00d49f]/10"
                >
                  <Check className="h-4 w-4" />
                  <span>Approve CNIC</span>
                </button>
                <button
                  disabled={actionInProgress}
                  onClick={() => setRejectModalOpen(true)}
                  className="rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs px-3.5 py-2 flex items-center gap-1.5 transition"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Document Expiry Sentinel Warning Banner if Expiring Soon */}
            {selectedDoc.expiryStatus.isExpiringWithin30Days && (
              <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-5 w-5 text-rose-400 shrink-0" />
                  <div>
                    <strong className="block text-white">Smart CNIC Expiry Alert!</strong>
                    <span>Card expires on {selectedDoc.expiryStatus.expiryDate} ({selectedDoc.expiryStatus.daysRemaining} days remaining). Renewal required.</span>
                  </div>
                </div>
                <button
                  onClick={() => showToast(`Automated SMS renewal notice dispatched to ${selectedDoc.userPhone}!`)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] transition shrink-0"
                >
                  Send Renewal SMS
                </button>
              </div>
            )}

            {/* Side-by-Side Dual Image Inspector */}
            <DualCnicViewer
              frontUrl={selectedDoc.frontImageUrl}
              backUrl={selectedDoc.backImageUrl}
              cnicNumber={selectedDoc.ocrDetails.cnicNumber}
              holderName={selectedDoc.userName}
            />

            {/* OCR Extracted Data Comparison Grid */}
            <OcrComparisonGrid
              ocrDetails={selectedDoc.ocrDetails}
              profileName={selectedDoc.userName}
              profileCnic={selectedDoc.ocrDetails.cnicNumber}
              profileComparison={selectedDoc.profileComparison}
            />

            {/* NADRA Verisys Simulation Card */}
            <NadraVerisysMockCard
              status={selectedDoc.nadraVerisys.status}
              lookupId={selectedDoc.nadraVerisys.simulatedLookupId}
              biometricScore={selectedDoc.nadraVerisys.biometricMatchScore}
              lastCheckedAt={selectedDoc.nadraVerisys.lastCheckedAt}
              remarks={selectedDoc.nadraVerisys.remarks}
              onTriggerCheck={handleTriggerVerisys}
            />

          </div>
        ) : (
          <div className="lg:col-span-7 p-12 text-center text-slate-500 text-xs">
            Select a document from the left queue to inspect.
          </div>
        )}

      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-rose-500/30 bg-[#0d1627] p-6 max-w-md w-full space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <XCircle className="h-5 w-5" />
              <span>Reject Smart CNIC Submission</span>
            </div>
            <p className="text-slate-300 font-sans">
              Provide feedback for <strong>{selectedDoc?.userName}</strong>. This message will be sent as a push notification and displayed on their mobile dashboard:
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full rounded-xl border border-[#17233b] bg-[#070d18] p-3 text-white focus:outline-none focus:border-rose-500 font-sans text-xs"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 transition"
              >
                Confirm Rejection & Send Alert
              </button>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 text-slate-300 px-4 py-2.5 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
