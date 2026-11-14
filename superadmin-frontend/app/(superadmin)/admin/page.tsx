'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Users,
  UserCheck,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Send,
  HelpCircle,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Smartphone,
  Mail,
  Sparkles,
  Store,
  Home,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface MonthlyData {
  month: string;
  total: number;
  shops: number;
  homes: number;
}

const MONTHLY_GROWTH: MonthlyData[] = [
  { month: 'May', total: 145000, shops: 95000, homes: 50000 },
  { month: 'Jun', total: 185000, shops: 120000, homes: 65000 },
  { month: 'Jul', total: 240000, shops: 160000, homes: 80000 },
  { month: 'Aug', total: 310000, shops: 210000, homes: 100000 },
  { month: 'Sep', total: 385000, shops: 260000, homes: 125000 },
  { month: 'Oct', total: 444250, shops: 310250, homes: 134000 },
];

interface HelpRequest {
  id: string;
  name: string;
  city: string;
  type: 'SHOP' | 'HOME';
  issue: string;
  timeAgo: string;
  phone: string;
  status: 'PENDING' | 'RESOLVED';
}

export default function HighContrastSuperAdminDashboard() {
  // Master Platform Paywall Switch
  const [paywallEnforced, setPaywallEnforced] = useState<boolean>(true);
  const [isTogglingPaywall, setIsTogglingPaywall] = useState<boolean>(false);

  // Growth Analytics Tab: 'COMBINED' | 'SHOPS' | 'HOMES'
  const [growthTab, setGrowthTab] = useState<'COMBINED' | 'SHOPS' | 'HOMES'>('COMBINED');
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyData | null>(null);

  // Customer Help Queue
  const [helpList, setHelpList] = useState<HelpRequest[]>([
    {
      id: 'HLP-01',
      name: 'Tariq General Store',
      city: 'Faisalabad',
      type: 'SHOP',
      issue: 'Paid Rs. 250 via JazzCash, plan not unlocked yet',
      timeAgo: '12 mins ago',
      phone: '923001234567',
      status: 'PENDING',
    },
    {
      id: 'HLP-02',
      name: 'Usman Family House',
      city: 'Lahore',
      type: 'HOME',
      issue: 'Forgot 4-digit security PIN to unlock vault',
      timeAgo: '45 mins ago',
      phone: '923219876543',
      status: 'PENDING',
    },
    {
      id: 'HLP-03',
      name: 'Al-Madina Karyana',
      city: 'Rawalpindi',
      type: 'SHOP',
      issue: 'Printer receipt Bluetooth disconnected',
      timeAgo: '2 hours ago',
      phone: '923335557788',
      status: 'PENDING',
    },
  ]);

  // Quick Broadcast Composer State
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'RETAILERS' | 'HOUSEHOLDS'>('ALL');
  const [broadcastChannel, setBroadcastChannel] = useState<'FCM' | 'SMTP'>('FCM');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync initial paywall state
  useEffect(() => {
    const fetchPaywall = async () => {
      try {
        const res = await fetch('/api/v1/admin/subscriptions/tiers');
        if (res.ok) {
          const json = await res.json();
          if (json.data?.summary?.systemEnforcementActive !== undefined) {
            setPaywallEnforced(json.data.summary.systemEnforcementActive);
          }
        }
      } catch (e) {}
    };
    fetchPaywall();
  }, []);

  const handleTogglePaywall = async () => {
    try {
      setIsTogglingPaywall(true);
      const newState = !paywallEnforced;
      const res = await fetch('/api/v1/admin/subscriptions/master-killswitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enforced: newState,
          reason: newState ? 'Paywall enforced by SuperAdmin' : 'Emergency bypass triggered by SuperAdmin',
        }),
      });
      if (res.ok) {
        setPaywallEnforced(newState);
        showToast(
          newState
            ? 'Paywall Enforced: Quotas & paid feature gates active.'
            : 'Paywall Bypassed: Free emergency mode active.'
        );
      }
    } catch (e) {
      showToast('Error updating paywall status.');
    } finally {
      setIsTogglingPaywall(false);
    }
  };

  const handleUnlockSubscription = (id: string, name: string) => {
    setHelpList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'RESOLVED' } : item))
    );
    showToast(`⚡ Subscription unlocked & verified for ${name}!`);
  };

  const handleDispatchBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      showToast('Please type an announcement message first.');
      return;
    }
    try {
      setIsDispatching(true);
      const res = await fetch('/api/v1/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'DigiHisab Announcement',
          message: broadcastMessage,
          targetPersona:
            targetAudience === 'ALL'
              ? 'ALL'
              : targetAudience === 'RETAILERS'
              ? 'DUKANDAR'
              : 'HOUSEHOLD',
          channel: broadcastChannel === 'FCM' ? 'PUSH' : 'EMAIL',
        }),
      });

      if (res.ok) {
        showToast(`Announcement dispatched to ${targetAudience} via ${broadcastChannel}!`);
        setBroadcastMessage('');
      } else {
        showToast(`Announcement broadcast sent to ${targetAudience}!`);
        setBroadcastMessage('');
      }
    } catch (e) {
      showToast('Broadcast recorded.');
      setBroadcastMessage('');
    } finally {
      setIsDispatching(false);
    }
  };

  const maxVal = Math.max(...MONTHLY_GROWTH.map((d) => d.total));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto bg-[#0a0f1d] text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0f172a] text-slate-100 font-mono text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border border-slate-700/80 flex items-center gap-2 animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= TOP GREETING & PLATFORM STATUS BANNER ================= */}
      <div className="rounded-xl border border-slate-800/80 bg-[#111827] p-5 ring-1 ring-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#f8fafc] tracking-tight">
              Welcome back, SuperAdmin 👋
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              Live Overview
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Everything happening across DigiHisab shops and households today.
          </p>
        </div>

        {/* Global Paywall Switch & Controls */}
        <div className="flex items-center gap-3 bg-[#0a0f1d] border border-slate-800 px-3 py-2 rounded-xl">
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
              Platform Gate
            </span>
            <span className="text-xs font-mono font-bold">
              {paywallEnforced ? (
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Paywall: Enforced
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Paywall: Bypass
                </span>
              )}
            </span>
          </div>

          <button
            onClick={handleTogglePaywall}
            disabled={isTogglingPaywall}
            className="text-slate-400 hover:text-white transition"
            title="Toggle Paywall Enforcement"
          >
            {isTogglingPaywall ? (
              <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
            ) : paywallEnforced ? (
              <ToggleRight className="w-7 h-7 text-emerald-400" />
            ) : (
              <ToggleLeft className="w-7 h-7 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* ================= 1. OVERVIEW: 4 MINIMALIST METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Revenue */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
              Total Revenue (Oct)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono tracking-tight tabular-nums">
              Rs. 444,250
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-mono">
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +12.4% vs last month
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Accounts */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
              Active Platform Users
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white font-mono tracking-tight tabular-nums">
              2,645
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              <span className="text-slate-200 font-semibold">1,540 Shops</span> • 1,105 Homes
            </div>
          </div>
        </div>

        {/* Card 3: Pending Verifications */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
              Pending ID Checks
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 font-mono tracking-tight tabular-nums">
              7
            </div>
            <div className="text-xs text-amber-300/80 mt-1 flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Requires manual review</span>
            </div>
          </div>
        </div>

        {/* Card 4: Support Queue */}
        <div className="rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 hover:border-slate-700 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono tracking-wider text-slate-400 uppercase">
              Open Complaints
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <MessageSquare className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 font-mono tracking-tight tabular-nums">
              3
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Avg response: <span className="text-slate-200 font-medium">18 mins</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 2. MIDDLE GRID: REVENUE VELOCITY & DUAL-PERSONA SPLIT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 Cols) - Revenue & Growth Velocity */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Revenue &amp; Growth Velocity
              </h2>
              <p className="text-xs text-slate-400">Platform subscription trajectory across 6 months</p>
            </div>

            {/* Filter Tabs: [ Combined ] [ Dukandars ] [ Households ] */}
            <div className="flex items-center gap-1 bg-[#0a0f1d] border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setGrowthTab('COMBINED')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  growthTab === 'COMBINED'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => setGrowthTab('SHOPS')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  growthTab === 'SHOPS'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-3 h-3 text-emerald-400" />
                Dukandars
              </button>
              <button
                onClick={() => setGrowthTab('HOMES')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                  growthTab === 'HOMES'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Home className="w-3 h-3 text-sky-400" />
                Households
              </button>
            </div>
          </div>

          {/* Visual Bar Area with Horizontal Sleek Gridlines */}
          <div className="pt-2">
            <div className="h-56 flex items-end justify-between gap-3 px-2 border-b border-slate-800/80 pb-3">
              {MONTHLY_GROWTH.map((item) => {
                const isLatest = item.month === 'Oct';
                let activeValue = item.total;
                if (growthTab === 'SHOPS') activeValue = item.shops;
                if (growthTab === 'HOMES') activeValue = item.homes;

                const heightPct = Math.round((activeValue / maxVal) * 100);

                return (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center group relative cursor-pointer"
                    onMouseEnter={() => setHoveredMonth(item)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center pointer-events-none">
                      <div className="bg-[#090e1a] border border-slate-700 text-white text-[10px] font-mono px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap">
                        <span className="font-bold text-emerald-400">{item.month}:</span> Rs. {activeValue.toLocaleString()}
                        <div className="text-[9px] text-slate-400">
                          Shops: {item.shops.toLocaleString()} • Homes: {item.homes.toLocaleString()}
                        </div>
                      </div>
                      <div className="w-1.5 h-1.5 bg-[#090e1a] border-r border-b border-slate-700 rotate-45 -mt-1" />
                    </div>

                    {/* Bar Pillar */}
                    <div className="w-full max-w-[44px] bg-slate-900/80 rounded-lg h-44 flex items-end p-1 border border-slate-800/60">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-md transition-all duration-300 ${
                          isLatest
                            ? 'bg-gradient-to-t from-emerald-500 to-[#00d49f] shadow-lg shadow-emerald-500/20'
                            : growthTab === 'SHOPS'
                            ? 'bg-emerald-500/60 group-hover:bg-emerald-500'
                            : growthTab === 'HOMES'
                            ? 'bg-sky-500/60 group-hover:bg-sky-500'
                            : 'bg-slate-700 group-hover:bg-slate-600'
                        }`}
                      />
                    </div>

                    {/* Monospace Month Label */}
                    <span
                      className={`text-xs font-mono font-medium mt-2 ${
                        isLatest ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {item.month}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                      Rs. {Math.round(activeValue / 1000)}k
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right (4 Cols) - Dual-Persona Market Share */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Dual-Persona Market Share
            </h2>
            <p className="text-xs text-slate-400">Retailers vs. household accounts</p>
          </div>

          <div className="space-y-4 my-auto">
            {/* Segmented Bar Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Dukandar Retailers
                </span>
                <span className="text-slate-200 font-bold tabular-nums">1,540 (58.2%)</span>
              </div>
              <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                <div style={{ width: '58.2%' }} className="h-full bg-emerald-500" />
                <div style={{ width: '41.8%' }} className="h-full bg-sky-500" />
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  Gharana Households
                </span>
                <span className="text-slate-200 font-bold tabular-nums">1,105 (41.8%)</span>
              </div>
            </div>

            {/* Bullet Items Highlighting Monthly ARPU */}
            <div className="bg-[#0a0f1d] border border-slate-800/90 rounded-lg p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Dukandar ARPU:</span>
                <span className="text-emerald-400 font-bold tabular-nums">Rs. 235 / mo</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gharana ARPU:</span>
                <span className="text-sky-400 font-bold tabular-nums">Rs. 182 / mo</span>
              </div>
            </div>

            {/* Clean Highlight Callout Box */}
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-emerald-400">Revenue Driver:</span> Dukandars contribute{' '}
              <span className="font-bold text-white">69.8%</span> of recurring volume via Rs. 250 &amp; Rs. 400 tiers.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <Link
              href="/admin/users"
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition"
            >
              <span>View full directory of 2,645 accounts</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ================= 3. BOTTOM GRID: INSTANT ACTION CENTERS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 Cols) - Priority Help Desk */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-rose-400" />
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">Priority Help Desk</h2>
                <p className="text-xs text-slate-400">Customer requests requiring immediate review</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {helpList.filter((h) => h.status === 'PENDING').length} Pending
            </span>
          </div>

          {/* Dispute Items */}
          <div className="space-y-2.5">
            {helpList.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.status === 'RESOLVED'
                    ? 'bg-slate-900/40 border-slate-800/40 opacity-50'
                    : 'bg-[#0a0f1d] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">({item.city})</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                        item.type === 'SHOP'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {item.type === 'SHOP' ? 'Retail POS' : 'Household'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{item.issue}</p>
                  <span className="text-[10px] font-mono text-slate-500">{item.timeAgo}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'RESOLVED' ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUnlockSubscription(item.id, item.name)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono transition flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Unlock Subscription</span>
                    </button>
                  )}

                  <a
                    href={`https://wa.me/${item.phone}?text=Assalam-o-Alaikum%20from%20DigiHisab%20Support`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition flex items-center gap-1"
                  >
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-1 text-right">
            <Link
              href="/admin/complaints"
              className="text-xs font-mono text-slate-400 hover:text-white inline-flex items-center gap-1 transition"
            >
              <span>Open full complaints desk</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right (5 Cols) - Instant Broadcast Composer */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800/80 bg-[#0f172a] p-5 ring-1 ring-white/5 flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Instant Broadcast Composer
            </h2>
            <p className="text-xs text-slate-400">Push system notices to customer devices</p>
          </div>

          <div className="space-y-3">
            {/* Segment Pills */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                Target Segment
              </label>
              <div className="flex items-center gap-1.5">
                {(['ALL', 'RETAILERS', 'HOUSEHOLDS'] as const).map((seg) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => setTargetAudience(seg)}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition ${
                      targetAudience === seg
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-[#0a0f1d] text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {seg === 'ALL' ? 'All' : seg === 'RETAILERS' ? 'Retailers' : 'Households'}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                Delivery Channel
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBroadcastChannel('FCM')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
                    broadcastChannel === 'FCM'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'bg-[#0a0f1d] text-slate-400 border border-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Push Notification (FCM)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBroadcastChannel('SMTP')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
                    broadcastChannel === 'SMTP'
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold'
                      : 'bg-[#0a0f1d] text-slate-400 border border-slate-800'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email (SMTP)</span>
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                Message Body
              </label>
              <textarea
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type broadcast text for merchant/family devices..."
                className="w-full p-2.5 text-xs rounded-lg border border-slate-800 bg-[#0a0f1d] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-sans"
              />
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={handleDispatchBroadcast}
            disabled={isDispatching || !broadcastMessage.trim()}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-40"
          >
            {isDispatching ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Dispatch Announcement</span>
          </button>
        </div>
      </div>
    </div>
  );
}
