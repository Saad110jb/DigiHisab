'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  TrendingUp,
  Share2,
  Filter,
  Users,
  DollarSign,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Gift,
  Building2,
  Calendar,
  Layers,
  ArrowDownRight,
  AlertTriangle,
  Award,
  ExternalLink,
  Check
} from 'lucide-react';
import {
  IMarketingChannelMetric,
  IViralFlywheelStat,
  IFieldAgentCommission,
  ITopAdvocateMerchant
} from '@/types/marketing';

type WorkspaceTab = 'channels' | 'virality' | 'funnel' | 'agents';
type DateRange = 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_QUARTER' | 'ALL_TIME';

function MarketingDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as WorkspaceTab) || 'channels';

  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    ['channels', 'virality', 'funnel', 'agents'].includes(tabParam) ? tabParam : 'channels'
  );
  const [dateRange, setDateRange] = useState<DateRange>('THIS_MONTH');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Action loading states
  const [rewardingMerchantId, setRewardingMerchantId] = useState<string | null>(null);
  const [processingAgentId, setProcessingAgentId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    router.replace(`/admin/marketing?tab=${tab}`, { scroll: false });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/marketing/overview');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load marketing dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tabParam && ['channels', 'virality', 'funnel', 'agents'].includes(tabParam)) {
      setActiveTab(tabParam as WorkspaceTab);
    }
  }, [tabParam]);

  const handleRewardMerchant = async (merchantId: string) => {
    try {
      setRewardingMerchantId(merchantId);
      const res = await fetch('/api/v1/admin/marketing/advocates/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message || '✅ Free month granted to merchant advocate.');
        fetchData();
      } else {
        showToast('❌ Error: ' + (json.message || 'Could not reward merchant'));
      }
    } catch (err: any) {
      showToast('❌ Network error: ' + err.message);
    } finally {
      setRewardingMerchantId(null);
    }
  };

  const handleApproveAgentPayout = async (agentId: string) => {
    try {
      setProcessingAgentId(agentId);
      const res = await fetch('/api/v1/admin/marketing/agents/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'APPROVE_PAYOUT' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message || '💸 JazzCash commission payout approved!');
        fetchData();
      } else {
        showToast('❌ Error: ' + (json.message || 'Could not approve payout'));
      }
    } catch (err: any) {
      showToast('❌ Network error: ' + err.message);
    } finally {
      setProcessingAgentId(null);
    }
  };

  const handleToggleAgentStatus = async (agentId: string) => {
    try {
      setProcessingAgentId(agentId);
      const res = await fetch('/api/v1/admin/marketing/agents/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'TOGGLE_STATUS' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`⏸️ Promo code status updated for agent.`);
        fetchData();
      }
    } catch (err: any) {
      showToast('❌ Network error: ' + err.message);
    } finally {
      setProcessingAgentId(null);
    }
  };

  const channels: IMarketingChannelMetric[] = data?.marketingChannels || [];
  const topAdvocates: ITopAdvocateMerchant[] = data?.topAdvocates || [];
  const agentCommissions: IFieldAgentCommission[] = data?.fieldAgentCommissions || [];

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#00d49f] text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs border border-[#00d49f]/40 animate-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER & DATE RANGE SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#17233b]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#00d49f]/10 text-[#00d49f] border border-[#00d49f]/30 font-bold">
              SUPERADMIN GROWTH DESK
            </span>
            <span className="text-xs text-slate-400 font-mono">DigiHisab Unit Economics &amp; Viral Flywheel</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-[#00d49f]" />
            <span>Marketing Analytics, Viral Loop &amp; Funnel Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time multi-channel CAC/LTV unit economics, customer-to-merchant WhatsApp flywheel attribution, 5-stage paywall funnel drop-offs, and Mandi distributor commission desk.
          </p>
        </div>

        {/* Date Range Selector & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="bg-[#0d1627] border border-[#17233b] rounded-xl p-1 flex items-center gap-1 text-xs font-mono">
            {[
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month (Oct 2026)' },
              { id: 'LAST_QUARTER', label: 'Last Quarter' },
              { id: 'ALL_TIME', label: 'All Time' },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateRange(d.id as DateRange)}
                className={`px-3 py-1.5 rounded-lg transition font-bold ${
                  dateRange === d.id
                    ? 'bg-[#00d49f] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#0d1627] border border-[#17233b] hover:border-slate-600 text-slate-300 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00d49f]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. VISUAL LAYOUT & HEADER KPIS (4 METRIC CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Blended CAC */}
        <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#17233b] space-y-1.5 relative overflow-hidden">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Blended CAC</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">PKR 198.49</span>
          </div>
          <p className="text-[11px] text-[#00d49f] font-mono font-bold flex items-center gap-1">
            <span>-14% MoM</span>
            <span className="text-slate-400 text-[10px] font-normal">(Wholesale Mandi efficiency)</span>
          </p>
        </div>

        {/* Card 2: Blended LTV */}
        <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#17233b] space-y-1.5 relative overflow-hidden">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Blended LTV</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#00d49f] font-mono">PKR 2,568.43</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Target: <span className="text-white font-bold">&gt; Rs. 2,200</span> (+16.7% above benchmark)
          </p>
        </div>

        {/* Card 3: LTV / CAC Ratio */}
        <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#00d49f]/40 bg-gradient-to-br from-[#00d49f]/10 to-[#0d1627] space-y-1.5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider">LTV / CAC Ratio</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-[#00d49f] text-slate-950 shadow-sm shadow-[#00d49f]/30">
              High Efficiency
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">12.94x</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Generates Rs. 12.94 per Rs. 1.00 spent</p>
        </div>

        {/* Card 4: Viral WhatsApp Attribution Share */}
        <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#17233b] space-y-1.5 relative overflow-hidden">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Viral WhatsApp Share</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-teal-300 font-mono">42.3%</span>
          </div>
          <p className="text-[11px] text-teal-400/90 font-mono font-bold">
            of all new accounts <span className="text-slate-400 text-[10px] font-normal">(Zero CAC Flywheel)</span>
          </p>
        </div>
      </div>

      {/* 2. FOUR INTERACTIVE WORKSPACE TABS */}
      <div className="flex items-center border-b border-[#17233b] gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <button
          onClick={() => handleTabChange('channels')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'channels'
              ? 'bg-[#00d49f] text-slate-950 shadow-md shadow-[#00d49f]/20'
              : 'bg-[#0d1627] text-slate-300 hover:text-white border border-[#17233b]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>1. Channels &amp; Unit Economics</span>
        </button>

        <button
          onClick={() => handleTabChange('virality')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'virality'
              ? 'bg-[#00d49f] text-slate-950 shadow-md shadow-[#00d49f]/20'
              : 'bg-[#0d1627] text-slate-300 hover:text-white border border-[#17233b]'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>2. WhatsApp Paylink Viral Loop</span>
        </button>

        <button
          onClick={() => handleTabChange('funnel')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'funnel'
              ? 'bg-[#00d49f] text-slate-950 shadow-md shadow-[#00d49f]/20'
              : 'bg-[#0d1627] text-slate-300 hover:text-white border border-[#17233b]'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>3. Onboarding &amp; Paywall Funnel</span>
        </button>

        <button
          onClick={() => handleTabChange('agents')}
          className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'agents'
              ? 'bg-[#00d49f] text-slate-950 shadow-md shadow-[#00d49f]/20'
              : 'bg-[#0d1627] text-slate-300 hover:text-white border border-[#17233b]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>4. BTL Promo Codes &amp; Commissions</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ACQUISITION CHANNELS & UNIT ECONOMICS (?tab=channels) */}
      {/* ========================================================================= */}
      {activeTab === 'channels' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#00d49f]" />
                <span>Acquisition Channels &amp; Unit Economics Matrix</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Channel spend divided by paid conversions with 30/90-day retention and unit economics efficiency.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-[#00d49f]/20 text-[#00d49f] border border-[#00d49f]/30">
                #00d49f: High Efficiency
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Amber: CAC &gt; Rs. 400
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#070e1b] text-slate-400 uppercase tracking-wider border-b border-[#17233b] text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Channel Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Acquisition Vol</th>
                    <th className="py-3 px-4">Total Budget (PKR)</th>
                    <th className="py-3 px-4">Channel CAC</th>
                    <th className="py-3 px-4 text-center">30-Day Ret</th>
                    <th className="py-3 px-4 text-center">90-Day Ret</th>
                    <th className="py-3 px-4 text-right">LTV / CAC Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17233b] text-slate-300">
                  {channels.map((ch) => {
                    const isHighPerformance = ch.cacPKR <= 200 || ch.ltvCacRatio >= 10;
                    const isSubOptimal = ch.cacPKR > 400;

                    return (
                      <tr key={ch.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span>{ch.channelName}</span>
                            {isHighPerformance && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#00d49f]/20 text-[#00d49f] border border-[#00d49f]/30">
                                ⭐ High Performing
                              </span>
                            )}
                            {isSubOptimal && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                ⚠️ CAC &gt; Rs. 400
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {ch.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          {ch.totalAcquired.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {ch.totalSpendPKR === 0 ? 'Rs. 0 (Organic)' : `PKR ${ch.totalSpendPKR.toLocaleString()}`}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`font-bold ${isSubOptimal ? 'text-amber-400 font-extrabold' : ch.cacPKR === 0 ? 'text-[#00d49f] font-extrabold' : 'text-slate-200'}`}>
                            {ch.cacPKR === 0 ? 'PKR 0.00' : `PKR ${ch.cacPKR.toFixed(2)}`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-emerald-300 font-bold">
                            {ch.day30RetentionPct}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-bold">
                            {ch.day90RetentionPct}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                            isHighPerformance
                              ? 'bg-[#00d49f]/20 text-[#00d49f] border-[#00d49f]/40'
                              : isSubOptimal
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {ch.ltvCacRatio > 90 ? '99.9x' : `${ch.ltvCacRatio.toFixed(2)}x`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WHATSAPP PAYLINK VIRAL LOOP (?tab=virality) */}
      {/* ========================================================================= */}
      {activeTab === 'virality' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Flywheel Architecture Flow */}
          <div className="p-6 rounded-3xl bg-[#0d1627] border border-[#00d49f]/30 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00d49f]/20 text-[#00d49f] border border-[#00d49f]/30 font-bold">
                    ORGANIC CUSTOMER-TO-MERCHANT FLYWHEEL
                  </span>
                  <span className="text-xs text-slate-400 font-mono">The Udhaar Paylink Engine</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-[#00d49f]" />
                  <span>WhatsApp Udhaar Paylink Flywheel Attribution</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customers pay store debts via PayFast/JazzCash and subsequently convert into registered DigiHisab household/dukandar users.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#070e1b] border border-[#17233b] text-right font-mono">
                <span className="text-[10px] text-slate-400 block uppercase">Debtor-to-User Conversion</span>
                <span className="text-xl font-black text-[#00d49f]">42.3% Click-to-Install Yield</span>
              </div>
            </div>

            {/* 4 Flywheel Funnel Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#070e1b] border border-[#17233b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400">1. Dispatched Links</span>
                <div className="text-xl font-black text-white font-mono">28,400</div>
                <p className="text-[10px] text-slate-400">Sent via WhatsApp Tagaza</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#070e1b] border border-[#17233b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400">2. Invoice Impressions</span>
                <div className="text-xl font-black text-cyan-400 font-mono">14,850</div>
                <p className="text-[10px] text-slate-400">52.3% Landing page view CTR</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#070e1b] border border-[#17233b] space-y-1">
                <span className="text-[10px] font-mono text-slate-400">3. Click-to-Install</span>
                <div className="text-xl font-black text-[#00d49f] font-mono">40.0%</div>
                <p className="text-[10px] text-slate-400">512 DigiHisab APK downloads</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#00d49f]/10 border border-[#00d49f]/40 space-y-1">
                <span className="text-[10px] font-mono text-[#00d49f] font-bold">4. New Accounts Created</span>
                <div className="text-xl font-black text-[#00d49f] font-mono">312</div>
                <p className="text-[10px] text-slate-400">Downstream ledgers (PKR 0 CAC)</p>
              </div>
            </div>
          </div>

          {/* Top 10 Advocate Merchants Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#00d49f]" />
                  <span>Top 10 Advocate Merchants (Viral Champions)</span>
                </h3>
                <p className="text-xs text-slate-400">Dukandars generating highest organic customer-to-merchant referrals.</p>
              </div>
              <span className="text-xs font-mono text-slate-400">Top Advocate: Akram Cloth House</span>
            </div>

            <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#070e1b] text-slate-400 uppercase tracking-wider border-b border-[#17233b] text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Merchant &amp; Business</th>
                      <th className="py-3 px-4">City Hub</th>
                      <th className="py-3 px-4">Dispatched Links</th>
                      <th className="py-3 px-4">Bills Paid</th>
                      <th className="py-3 px-4">Accounts Referred</th>
                      <th className="py-3 px-4">K-Factor</th>
                      <th className="py-3 px-4 text-right">Incentive Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#17233b] text-slate-300">
                    {topAdvocates.map((m, idx) => (
                      <tr key={m.merchantId} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-400">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                            idx === 0 ? 'bg-[#00d49f] text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-white">{m.merchantName}</div>
                          <div className="text-[10px] text-slate-400">{m.storeName}</div>
                        </td>

                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{m.city}</td>

                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {m.linksDispatched} links
                        </td>

                        <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                          {m.billsPaidCount} cleared
                        </td>

                        <td className="py-3 px-4 font-bold text-[#00d49f] whitespace-nowrap">
                          {m.newAccountsReferred} new stores
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[#00d49f] font-bold">
                            K = {m.kFactor}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleRewardMerchant(m.merchantId)}
                            disabled={rewardingMerchantId === m.merchantId}
                            className="px-3 py-1.5 rounded-xl bg-[#00d49f]/10 hover:bg-[#00d49f]/25 text-[#00d49f] border border-[#00d49f]/40 font-bold text-[11px] transition flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            <span>
                              {rewardingMerchantId === m.merchantId
                                ? 'Granting...'
                                : `Reward Free Month (${m.freeMonthsGranted})`}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ONBOARDING & PAYWALL CONVERSION FUNNEL (?tab=funnel) */}
      {/* ========================================================================= */}
      {activeTab === 'funnel' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#00d49f]" />
              <span>5-Step Onboarding &amp; Paywall Conversion Funnel</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Telemetry tracking progression from initial mobile download through the 20+ customer paywall barrier.
            </p>
          </div>

          {/* 5-Step Visual Funnel Bar Chart */}
          <div className="p-6 rounded-3xl bg-[#0d1627] border border-[#17233b] space-y-4">
            {[
              {
                step: 1,
                name: '1. App Installed & Mobile OTP',
                count: 4800,
                pctOfTop: 100,
                stepConversion: 100,
                dropoff: 0,
                color: 'from-emerald-500 to-teal-400',
              },
              {
                step: 2,
                name: '2. 1st Ledger Entry Logged',
                count: 3950,
                pctOfTop: 82.3,
                stepConversion: 82.3,
                dropoff: 17.7,
                color: 'from-teal-400 to-cyan-500',
              },
              {
                step: 3,
                name: '3. Reached 20+ Customers or Day 14',
                count: 2820,
                pctOfTop: 58.8,
                stepConversion: 71.4,
                dropoff: 28.6,
                color: 'from-cyan-500 to-blue-500',
              },
              {
                step: 4,
                name: '4. Encountered Paywall Barrier',
                count: 2180,
                pctOfTop: 45.4,
                stepConversion: 77.3,
                dropoff: 22.7,
                color: 'from-blue-500 to-indigo-500',
              },
              {
                step: 5,
                name: '5. Converted to Paid Subscriber',
                count: 1285,
                pctOfTop: 26.8,
                stepConversion: 58.9,
                dropoff: 41.1,
                color: 'from-[#00d49f] to-emerald-400',
              },
            ].map((f) => (
              <div key={f.step} className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[10px]">
                      {f.step}
                    </span>
                    <span className="font-bold text-white">{f.name}</span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] self-end sm:self-auto">
                    <span className="text-white font-black">{f.count.toLocaleString()} accounts</span>
                    <span className="text-slate-400">({f.pctOfTop}% of total)</span>
                    <span className={f.dropoff === 0 ? 'text-[#00d49f]' : 'text-amber-400'}>
                      {f.dropoff === 0 ? 'Top of Funnel' : `-${f.dropoff}% drop-off`}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-[#070e1b] rounded-xl h-4 overflow-hidden p-0.5 border border-[#17233b]">
                  <div
                    className={`h-full rounded-lg bg-gradient-to-r ${f.color} transition-all duration-700`}
                    style={{ width: `${f.pctOfTop}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Transition Drop-Off Diagnostics Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Step Transition Diagnostics &amp; Telemetry Interventions
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#17233b] space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span>Step 1 $\rightarrow$ 2 (-17.7%)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-slate-300 font-bold">SMS OTP Latency</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Rural telco delays causing early abandonments.
                </p>
                <div className="p-2 rounded-lg bg-emerald-950/20 text-[#00d49f] border border-[#00d49f]/30 text-[9px] font-bold">
                  Intervention: Automatic WhatsApp Fallback OTP deployed.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#17233b] space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span>Step 2 $\rightarrow$ 3 (-28.6%)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-slate-300 font-bold">Counter Rush Typing Friction</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Shopkeepers busy during peak sales counter hours.
                </p>
                <div className="p-2 rounded-lg bg-emerald-950/20 text-[#00d49f] border border-[#00d49f]/30 text-[9px] font-bold">
                  Intervention: Urdu AI Voice-Based Khata Entry.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#17233b] space-y-2">
                <div className="flex items-center justify-between text-amber-400 font-bold">
                  <span>Step 3 $\rightarrow$ 4 (-22.7%)</span>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-slate-300 font-bold">Dormant Customer Books</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Delay in customer credit balances reaching &gt;20 accounts.
                </p>
                <div className="p-2 rounded-lg bg-emerald-950/20 text-[#00d49f] border border-[#00d49f]/30 text-[9px] font-bold">
                  Intervention: Automated Day-14 WhatsApp Recovery Tagaza.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0d1627] border border-[#17233b] space-y-2">
                <div className="flex items-center justify-between text-[#00d49f] font-bold">
                  <span>Step 4 $\rightarrow$ 5 (58.9% Conversion)</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-slate-300 font-bold">Paywall Subscription Upgrade</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  1,285 shops actively subscribed to paid tiers.
                </p>
                <div className="p-2 rounded-lg bg-emerald-950/20 text-[#00d49f] border border-[#00d49f]/30 text-[9px] font-bold">
                  Intervention: Rs. 150/mo Micro-Tier + JazzCash 1-Tap Autopay.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FIELD BTL PROMO CODES & AGENT COMMISSIONS (?tab=agents) */}
      {/* ========================================================================= */}
      {activeTab === 'agents' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#00d49f]" />
                <span>Field BTL Promo Codes &amp; Agent Commission Desk</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ground foot-sales agent attribution, verified 30-day merchant retention, and instant JazzCash commission payouts.
              </p>
            </div>
            <span className="text-xs font-mono text-[#00d49f] font-bold">
              Commission: PKR 150 per active 30-day retained merchant
            </span>
          </div>

          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#070e1b] text-slate-400 uppercase tracking-wider border-b border-[#17233b] text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Agent Name</th>
                    <th className="py-3 px-4">City / Mandi Cluster</th>
                    <th className="py-3 px-4">Promo Code</th>
                    <th className="py-3 px-4">Total Signups</th>
                    <th className="py-3 px-4">30-Day Retained</th>
                    <th className="py-3 px-4">Earned Commission</th>
                    <th className="py-3 px-4">Payout Status</th>
                    <th className="py-3 px-4 text-right">Commission Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#17233b] text-slate-300">
                  {agentCommissions.map((a) => {
                    const isPending = a.payoutStatus === 'PENDING';
                    const isProcessing = processingAgentId === a.agentId;

                    return (
                      <tr key={a.agentId} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          {a.agentName}
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          {a.assignedCity}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded bg-[#070e1b] text-[#00d49f] font-mono font-bold border border-[#00d49f]/30">
                            {a.promoCode}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          {a.totalSignups} stores
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-emerald-400 font-bold">{a.verifiedActiveSignups}</span>
                          <span className="text-slate-400 text-[10px]"> ({((a.verifiedActiveSignups / a.totalSignups) * 100).toFixed(0)}%)</span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                          PKR {a.earnedCommissionPKR.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {a.payoutStatus === 'DISBURSED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00d49f]/20 text-[#00d49f] border border-[#00d49f]/30 flex items-center gap-1 w-fit">
                              <Check className="w-3 h-3" />
                              <span>DISBURSED (JazzCash)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              <span>PENDING APPROVAL</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {isPending ? (
                              <button
                                onClick={() => handleApproveAgentPayout(a.agentId)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#00d49f] hover:from-emerald-500 hover:to-[#00d49f] text-slate-950 font-bold text-[11px] shadow-sm transition disabled:opacity-50"
                              >
                                {isProcessing ? 'Processing...' : '💸 Approve JazzCash Payout'}
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#00d49f] font-mono font-bold">Settled</span>
                            )}

                            <button
                              onClick={() => handleToggleAgentStatus(a.agentId)}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition"
                              title="Toggle promo code active state"
                            >
                              ⏸️ Deactivate Code
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketingAnalyticsDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070d18] text-slate-300 flex items-center justify-center font-mono text-xs">
        Loading Marketing Intelligence Dashboard...
      </div>
    }>
      <MarketingDashboardContent />
    </Suspense>
  );
}
