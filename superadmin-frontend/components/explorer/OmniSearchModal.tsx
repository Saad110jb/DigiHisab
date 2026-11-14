'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Store,
  Home,
  User,
  FileText,
  CreditCard,
  Gauge,
  Building2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Command
} from 'lucide-react';
import { performOmniSearch } from '@/lib/explorer-store';
import { OmniSearchResult, OmniEntityCategory } from '@/types/admin';

interface OmniSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export default function OmniSearchModal({ isOpen, onClose, initialQuery = '' }: OmniSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<OmniSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setResults(performOmniSearch(initialQuery));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const res = performOmniSearch(query);
    setResults(res);
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          handleSelectResult(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  if (!isOpen) return null;

  const handleSelectResult = (item: OmniSearchResult) => {
    onClose();
    router.push(item.linkUrl);
  };

  const getCategoryIcon = (category: OmniEntityCategory) => {
    switch (category) {
      case 'MERCHANT':
        return <Store className="h-4 w-4 text-emerald-400" />;
      case 'HOUSEHOLD':
        return <Home className="h-4 w-4 text-sky-400" />;
      case 'CUSTOMER_KHATA':
        return <User className="h-4 w-4 text-amber-400" />;
      case 'VOUCHER':
        return <FileText className="h-4 w-4 text-[#00d49f]" />;
      case 'TRANSACTION':
        return <CreditCard className="h-4 w-4 text-purple-400" />;
      case 'SUB_METER':
        return <Gauge className="h-4 w-4 text-yellow-400" />;
      case 'BANK_IBAN':
        return <Building2 className="h-4 w-4 text-cyan-400" />;
      default:
        return <Search className="h-4 w-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (category: OmniEntityCategory) => {
    switch (category) {
      case 'MERCHANT':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
      case 'HOUSEHOLD':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
      case 'CUSTOMER_KHATA':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
      case 'VOUCHER':
        return 'border-[#00d49f]/30 bg-[#00d49f]/10 text-[#00d49f]';
      case 'TRANSACTION':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
      case 'SUB_METER':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
      case 'BANK_IBAN':
        return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
      default:
        return 'border-slate-700 bg-slate-800 text-slate-300';
    }
  };

  const sampleChips = [
    { label: 'Saad store', q: '33101-2155778-3' },
    { label: 'Phone 03009663004', q: '03009663004' },
    { label: 'Voucher JV-1049', q: 'JV-2026-1049' },
    { label: 'LESCO Sub-meter', q: 'LESCO-SM-8812-4B' },
    { label: 'Raast IBAN', q: 'PK88MEZN' },
    { label: 'Qudoos NTN', q: 'NTN-8821940-1' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl border border-[#17233b] bg-[#0d1627] shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[80vh]">
        
        {/* Search Header Input */}
        <div className="p-4 border-b border-[#17233b] flex items-center gap-3 bg-[#09111e]">
          <Search className="h-5 w-5 text-[#00d49f] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Omni-Search by CNIC, Phone, Voucher Ref (JV-), Txn UUID, IBAN, LESCO Sub-meter, or Shop NTN..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-mono"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Query Filter Chips */}
        <div className="px-4 py-2 border-b border-[#17233b]/60 bg-[#070d18] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono scrollbar-none">
          <span className="text-slate-500 flex items-center gap-1 shrink-0 mr-1">
            <Sparkles className="h-3 w-3 text-[#00d49f]" /> Quick:
          </span>
          {sampleChips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => setQuery(chip.q)}
              className="px-2 py-0.5 rounded border border-[#17233b] bg-[#0d1627] hover:border-[#00d49f]/40 hover:text-[#00d49f] text-slate-400 shrink-0 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-2 divide-y divide-[#17233b]/40">
          {query.trim() === '' ? (
            <div className="p-8 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/20 flex items-center justify-center text-[#00d49f]">
                <Search className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-white font-mono">Platform-Wide Omni-Search</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Type any Customer CNIC, Phone number, Voucher Ref (e.g. <code>JV-2026-1049</code>), Transaction UUID, Bank IBAN, or Sub-meter Serial.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-300 font-mono">No matching records found</p>
              <p className="text-xs text-slate-500">
                No system entities matched &ldquo;<span className="text-[#00d49f]">{query}</span>&rdquo;.
              </p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectResult(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                    isSelected ? 'bg-[#121d33] border-l-2 border-[#00d49f]' : 'hover:bg-[#121d33]/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-center shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{item.title}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate mt-0.5">{item.subtitle}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                        <span>Match: <span className="text-slate-300">{item.matchKey}</span></span>
                        <span>•</span>
                        <span className="text-[#00d49f] font-bold">{item.statusBadge}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                    <span className="text-[10px] font-mono hidden sm:inline text-slate-500">Inspect</span>
                    <ChevronRight className="h-4 w-4 text-[#00d49f]" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#17233b] bg-[#09111e] flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>Navigate: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">↓</kbd></span>
            <span>Select: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Enter</kbd></span>
            <span>Dismiss: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</kbd></span>
          </div>
          <span className="text-[#00d49f]">{results.length} result(s)</span>
        </div>

      </div>
    </div>
  );
}
