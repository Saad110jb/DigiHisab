'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Database,
  Search,
  FileText,
  HardDrive,
  Building2,
  ShieldAlert,
  Sparkles,
  Command,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import OmniSearchModal from '@/components/explorer/OmniSearchModal';
import RawJevTable from '@/components/explorer/RawJevTable';
import DatabaseHealthMetrics from '@/components/explorer/DatabaseHealthMetrics';
import SbpAuditExporter from '@/components/explorer/SbpAuditExporter';
import { performOmniSearch, MASTER_SEARCH_RECORDS } from '@/lib/explorer-store';

type ExplorerTab = 'SEARCH' | 'JEV' | 'DATABASE' | 'SBP';

export default function ForensicExplorerPage() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get('tab');
  const initialVoucherParam = searchParams.get('voucher') || '';

  const [activeTab, setActiveTab] = useState<ExplorerTab>(
    initialTabParam === 'jev' ? 'JEV' : initialTabParam === 'sbp' ? 'SBP' : initialTabParam === 'database' ? 'DATABASE' : 'SEARCH'
  );
  const [omniModalOpen, setOmniModalOpen] = useState(false);
  const [inPageSearchQuery, setInPageSearchQuery] = useState('');

  // Keyboard shortcut Ctrl+K listener inside explorer page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOmniModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const inPageSearchResults = inPageSearchQuery.trim() ? performOmniSearch(inPageSearchQuery) : [];

  return (
    <div className="p-4 sm:p-8 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/20 text-[#00d49f]">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Forensic Explorer & Data Inspector</span>
                <span className="text-xs font-mono font-semibold text-[#00d49f] px-2 py-0.5 rounded-full bg-[#00d49f]/10 border border-[#00d49f]/20">
                  Raw JEV • SBP Audit
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Query any record across Digi Hisab: Customer CNIC, Phone, Voucher Ref, Txn UUID, IBAN, or LESCO sub-meter
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Omni Search Ctrl+K */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOmniModalOpen(true)}
            className="rounded-xl border border-[#00d49f]/30 bg-[#00d49f]/10 hover:bg-[#00d49f]/20 text-[#00d49f] px-4 py-2 text-xs font-mono font-bold transition flex items-center gap-2 shadow-lg shadow-[#00d49f]/5"
          >
            <Search className="h-4 w-4" />
            <span>Launch Omni-Search</span>
            <div className="flex items-center gap-0.5 bg-slate-900/80 border border-[#00d49f]/30 px-1.5 py-0.5 rounded text-[10px] text-white ml-1">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#17233b] gap-2 overflow-x-auto text-xs font-mono scrollbar-none">
        <button
          onClick={() => setActiveTab('SEARCH')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeTab === 'SEARCH'
              ? 'border-[#00d49f] text-[#00d49f]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Omni-Search Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab('JEV')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeTab === 'JEV'
              ? 'border-[#00d49f] text-[#00d49f]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Raw JEV Journal Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('DATABASE')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeTab === 'DATABASE'
              ? 'border-[#00d49f] text-[#00d49f]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>Database Health & Row Auditor</span>
        </button>

        <button
          onClick={() => setActiveTab('SBP')}
          className={`flex items-center gap-2 pb-3 px-3.5 border-b-2 font-bold transition shrink-0 ${
            activeTab === 'SBP'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>State Bank (SBP) Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: Omni-Search Inspector */}
      {activeTab === 'SEARCH' && (
        <div className="space-y-6 animate-in fade-in">
          
          {/* In-page Master Search Box */}
          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-[#00d49f]" />
                  <span>Platform-Wide Forensic Search</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Index scans across customer CNICs, telephone numbers, vouchers, payment UUIDs, IBANs, and sub-meters
                </p>
              </div>
              <button
                onClick={() => setOmniModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-mono bg-[#070d18] border border-[#17233b] px-3 py-1.5 rounded-xl transition"
              >
                <span>Or press</span>
                <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Ctrl+K</kbd>
              </button>
            </div>

            <div className="relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={inPageSearchQuery}
                onChange={(e) => setInPageSearchQuery(e.target.value)}
                placeholder="Enter CNIC (e.g. 33101-2155778-3), Phone (+92300...), Voucher (JV-2026-1049), IBAN, or Sub-meter..."
                className="w-full rounded-xl border border-[#17233b] bg-[#070d18] pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00d49f]"
              />
            </div>

            {/* Sample Search Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
              <span className="text-slate-500">Quick Test Queries:</span>
              <button
                onClick={() => setInPageSearchQuery('33101-2155778-3')}
                className="px-2.5 py-1 rounded-lg border border-[#17233b] bg-[#070d18] text-slate-300 hover:border-[#00d49f] hover:text-[#00d49f] transition"
              >
                CNIC: 33101-2155778-3
              </button>
              <button
                onClick={() => setInPageSearchQuery('+923009663004')}
                className="px-2.5 py-1 rounded-lg border border-[#17233b] bg-[#070d18] text-slate-300 hover:border-[#00d49f] hover:text-[#00d49f] transition"
              >
                Phone: +923009663004
              </button>
              <button
                onClick={() => setInPageSearchQuery('JV-2026-1049')}
                className="px-2.5 py-1 rounded-lg border border-[#17233b] bg-[#070d18] text-slate-300 hover:border-[#00d49f] hover:text-[#00d49f] transition"
              >
                Voucher: JV-2026-1049
              </button>
              <button
                onClick={() => setInPageSearchQuery('LESCO-SM-8812-4B')}
                className="px-2.5 py-1 rounded-lg border border-[#17233b] bg-[#070d18] text-slate-300 hover:border-[#00d49f] hover:text-[#00d49f] transition"
              >
                Sub-meter: LESCO-SM-8812-4B
              </button>
              <button
                onClick={() => setInPageSearchQuery('PK88MEZN')}
                className="px-2.5 py-1 rounded-lg border border-[#17233b] bg-[#070d18] text-slate-300 hover:border-[#00d49f] hover:text-[#00d49f] transition"
              >
                IBAN: PK88MEZN
              </button>
              <button
                onClick={() => setInPageSearchQuery('NTN-7412980-3')}
                className="px-2.5 py-1 rounded-lg border border-[#17233b] bg-[#070d18] text-slate-300 hover:border-[#00d49f] hover:text-[#00d49f] transition"
              >
                Shop NTN: 7412980-3
              </button>
            </div>
          </div>

          {/* Results Grid or Empty State */}
          {inPageSearchQuery.trim() && (
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Matched Records for &ldquo;<strong className="text-white">{inPageSearchQuery}</strong>&rdquo;:</span>
                <span className="text-[#00d49f]">{inPageSearchResults.length} record(s)</span>
              </div>

              {inPageSearchResults.length === 0 ? (
                <div className="p-10 rounded-2xl border border-[#17233b] bg-[#0d1627] text-center text-slate-400 text-xs">
                  No records found matching this identifier.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {inPageSearchResults.map((res) => (
                    <a
                      key={res.id}
                      href={res.linkUrl}
                      className="p-4 rounded-xl border border-[#17233b] bg-[#0d1627] hover:border-[#00d49f]/50 hover:bg-[#121d33] transition block space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 bg-[#070d18] text-[#00d49f]">
                          {res.category}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-[#00d49f] transition">
                          <span>Open Record</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div className="text-sm font-bold text-white">{res.title}</div>
                      <div className="text-xs text-slate-300 font-sans">{res.subtitle}</div>
                      <div className="text-[10px] text-slate-400 pt-1 border-t border-[#17233b] flex items-center justify-between">
                        <span>Matched on: {res.matchKey}</span>
                        <span className="text-emerald-400 font-bold">{res.statusBadge}</span>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overview Directory Cards */}
          {!inPageSearchQuery.trim() && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-5 rounded-2xl border border-[#17233b] bg-[#0d1627] space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Indexed Entities</span>
                <div className="text-2xl font-bold text-white">48,920</div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Customers, retail suppliers, and family khata counterparties indexed for instant phone/CNIC match.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-[#17233b] bg-[#0d1627] space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Double-Entry Vouchers</span>
                <div className="text-2xl font-bold text-[#00d49f]">382,410</div>
                <p className="text-slate-400 text-[11px] font-sans">
                  Audited journal vouchers with balanced debit/credit checks and SHA-256 seal.
                </p>
              </div>

              <div className="p-5 rounded-2xl border border-[#17233b] bg-[#0d1627] space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Utility Sub-Meters</span>
                <div className="text-2xl font-bold text-amber-400">3,200</div>
                <p className="text-slate-400 text-[11px] font-sans">
                  LESCO, FESCO, and K-Electric domestic sub-meters tracking multi-family unit splits.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: Master Raw JEV Ledger */}
      {activeTab === 'JEV' && (
        <div className="animate-in fade-in">
          <RawJevTable initialVoucherFilter={initialVoucherParam} />
        </div>
      )}

      {/* TAB 3: Database Health & Table Auditor */}
      {activeTab === 'DATABASE' && (
        <div className="animate-in fade-in">
          <DatabaseHealthMetrics />
        </div>
      )}

      {/* TAB 4: SBP Transaction Audit Trail */}
      {activeTab === 'SBP' && (
        <div className="animate-in fade-in">
          <SbpAuditExporter />
        </div>
      )}

      {/* Floating Omni-Search Modal */}
      <OmniSearchModal
        isOpen={omniModalOpen}
        onClose={() => setOmniModalOpen(false)}
      />

    </div>
  );
}
