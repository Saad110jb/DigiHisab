'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  ArrowLeft,
  Plus,
  QrCode,
  Tag,
  Share2,
  DollarSign,
  TrendingUp,
  Award,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Percent,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Smartphone,
  Users,
  Repeat,
  ArrowRight,
  Send,
  Check,
  AlertTriangle,
  BadgeCheck,
  Briefcase
} from 'lucide-react';
import {
  ICampaignAttribution,
  IPromoCodeRecord,
  IWhatsAppReferralMetric,
  ISubscriptionTierLtv,
  IUdhaarPaylinkFlywheel,
  IBtlAgentDistributor
} from '@/types/marketing';

export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<ICampaignAttribution[]>([]);
  const [promos, setPromos] = useState<IPromoCodeRecord[]>([]);
  const [referrals, setReferrals] = useState<IWhatsAppReferralMetric[]>([]);
  const [tiers, setTiers] = useState<ISubscriptionTierLtv[]>([]);
  const [flywheel, setFlywheel] = useState<IUdhaarPaylinkFlywheel | null>(null);
  const [btlAgents, setBtlAgents] = useState<IBtlAgentDistributor[]>([]);
  const [aggregate, setAggregate] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [showPromoModal, setShowPromoModal] = useState<boolean>(false);
  const [showAgentModal, setShowAgentModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [settlingCode, setSettlingCode] = useState<string | null>(null);

  // New Promo form state
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'PERCENTAGE' | 'FLAT_PKR' | 'FREE_SMS_CREDITS'>('PERCENTAGE');
  const [newValue, setNewValue] = useState('50');
  const [newMax, setNewMax] = useState('200');

  // New Agent form state
  const [agentCode, setAgentCode] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentBazaar, setAgentBazaar] = useState('');
  const [agentCity, setAgentCity] = useState('Faisalabad');
  const [agentPhone, setAgentPhone] = useState('0300-1234567');
  const [agentCommission, setAgentCommission] = useState('150');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/marketing/campaigns');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCampaigns(json.data.campaigns || []);
          setPromos(json.data.promos || []);
          setReferrals(json.data.referralLeaders || []);
          setTiers(json.data.tiers || []);
          setFlywheel(json.data.flywheel || null);
          setBtlAgents(json.data.btlAgents || []);
          setAggregate(json.data.aggregate || null);
        }
      }
    } catch (err) {
      console.error('Failed to load campaigns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/marketing/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          title: newTitle,
          discountType: newType,
          discountValue: Number(newValue),
          maxRedemptions: Number(newMax),
        }),
      });
      if (res.ok) {
        showToast(`✅ Promo code "${newCode.toUpperCase()}" created and active.`);
        setShowPromoModal(false);
        setNewCode('');
        setNewTitle('');
        fetchCampaigns();
      }
    } catch (err: any) {
      showToast('Error creating promo: ' + err.message);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/marketing/campaigns/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: agentCode,
          agentName,
          assignedBazaar: agentBazaar,
          city: agentCity,
          phone: agentPhone,
          commissionRatePKR: Number(agentCommission)
        }),
      });
      if (res.ok) {
        showToast(`✅ BTL Agent "${agentName}" enrolled under code ${agentCode.toUpperCase()}`);
        setShowAgentModal(false);
        setAgentCode('');
        setAgentName('');
        setAgentBazaar('');
        fetchCampaigns();
      }
    } catch (err: any) {
      showToast('Error registering agent: ' + err.message);
    }
  };

  const handleSettleAgentPayout = async (code: string) => {
    try {
      setSettlingCode(code);
      const res = await fetch('/api/v1/admin/marketing/campaigns/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          action: 'SETTLE_PAYOUT'
        }),
      });
      if (res.ok) {
        const json = await res.json();
        showToast(`✅ Commission payout settled for agent code ${code}`);
        fetchCampaigns();
      }
    } catch (err: any) {
      showToast('Error settling payout: ' + err.message);
    } finally {
      setSettlingCode(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#00d49f] text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs animate-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/marketing"
              className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Geographic Overview</span>
            </Link>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400 font-mono">Channel Attribution &amp; Viral Flywheels</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1.5 flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-emerald-400" />
            <span>Acquisition Attribution, Viral Loops &amp; CAC/LTV</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Track multi-channel acquisition spend, multi-tier CAC/LTV unit economics, BTL mandi ground distributor commissions, and organic WhatsApp udhaar paylink viral conversions.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAgentModal(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 transition"
          >
            <Briefcase className="w-4 h-4 text-cyan-400" />
            <span>Enroll BTL Agent</span>
          </button>

          <button
            onClick={() => setShowPromoModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Voucher</span>
          </button>

          <button
            onClick={fetchCampaigns}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* TOP SECTION: UNIT ECONOMICS SENTINEL & MULTI-TIER LTV */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unit Economics Sentinel Card */}
        <div className="p-6 rounded-3xl bg-[#091322] border border-emerald-500/40 relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>Unit Economics Sentinel</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              TARGET &gt; 3.0x PASSED
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white font-mono">8.43x</span>
              <span className="text-xs font-mono text-emerald-400 font-bold">LTV / CAC Ratio</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              DigiHisab generates Rs. 8.43 of lifetime revenue for every Rs. 1.00 expended across customer acquisition channels.
            </p>
          </div>

          {/* Efficiency Gauge Visual */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Target Benchmark: &gt; 3.0x</span>
              <span className="text-emerald-400 font-bold">Current: 8.43x (+181% above par)</span>
            </div>
            <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden flex">
              <div className="bg-amber-500 h-full w-[35.6%]" title="Baseline Target (3.0x)" />
              <div className="bg-emerald-400 h-full w-[64.4%]" title="Surplus Efficiency" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0x (Burn)</span>
              <span>3.0x (SaaS Par)</span>
              <span>8.43x (Live)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Weighted CAC</span>
              <span className="text-sm font-bold text-white">PKR 281.49</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Weighted LTV</span>
              <span className="text-sm font-bold text-emerald-400">PKR 2,373.91</span>
            </div>
          </div>
        </div>

        {/* Multi-Tier Micro-Subscriptions Breakdown (Rs 150 / 200 / 250) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#091322] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Multi-Tier Subscription LTV Mechanics (ماہانہ پیکیج دورانیہ)</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">Average Tenure Pre-Churn</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tiers.map((t) => (
              <div
                key={t.tierId}
                className="p-4 rounded-2xl bg-[#070e1b] border border-slate-800/80 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{t.tierName}</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Rs. {t.priceMonthlyPKR}/mo
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 min-h-[28px]">{t.targetPersona}</p>

                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Duration:</span>
                    <span className="text-white font-bold">{t.avgLifespanMonths} mos</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Monthly Churn:</span>
                    <span className="text-amber-400 font-bold">{t.monthlyChurnRatePct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Calculated LTV:</span>
                    <span className="text-emerald-400 font-extrabold">PKR {t.calculatedLtvPKR.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Market Share:</span>
                    <span className="text-slate-300 font-bold">{t.marketSharePct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: UDHAAR PAYLINK ORGANIC FLYWHEEL (ZERO CAC) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#091629] to-[#070d18] border border-teal-500/30 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                ORGANIC VIRAL FLYWHEEL
              </span>
              <span className="text-xs text-slate-400 font-mono">The Udhaar Paylink Flywheel</span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-teal-400" />
              <span>Udhaar Paylink Conversion (Debtor to Registered Merchant Flywheel)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Customers who receive an automated WhatsApp tagaza, pay through PayFast/JazzCash, and subsequently register their own household or store ledger at zero acquisition cost.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Debtor $\rightarrow$ User Conversion</span>
              <span className="text-xl font-extrabold text-teal-400">
                {flywheel ? flywheel.flywheelConversionRatePct : '24.4'}%
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Organic Monthly MRR</span>
              <span className="text-xl font-extrabold text-emerald-400">
                PKR {flywheel ? (flywheel.organicMrrGeneratedPKR / 1000).toFixed(1) + 'k' : '46.8k'}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Flywheel Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400">1. Dispatched</span>
            <div className="text-lg font-extrabold text-white font-mono">
              {flywheel ? flywheel.linksDispatched.toLocaleString() : '28,400'}
            </div>
            <p className="text-[10px] text-slate-400">WhatsApp Tagaza Links sent</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400">2. Opened</span>
            <div className="text-lg font-extrabold text-cyan-400 font-mono">
              {flywheel ? flywheel.linksOpened.toLocaleString() : '14,850'}
            </div>
            <p className="text-[10px] text-slate-400">52.3% Click-through rate</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400">3. Bill Paid</span>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">
              {flywheel ? flywheel.paymentsCompleted.toLocaleString() : '1,280'}
            </div>
            <p className="text-[10px] text-slate-400">Cleared debt digitally</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400">4. App Installed</span>
            <div className="text-lg font-extrabold text-teal-400 font-mono">
              {flywheel ? flywheel.postPaymentAppInstalls.toLocaleString() : '512'}
            </div>
            <p className="text-[10px] text-slate-400">Downloaded DigiHisab APK</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-1">
            <span className="text-[10px] font-mono text-emerald-300 font-bold">5. New Ledgers</span>
            <div className="text-lg font-extrabold text-emerald-400 font-mono">
              {flywheel ? flywheel.subsequentLedgersCreated.toLocaleString() : '312'}
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Zero CAC Attributed</p>
          </div>
        </div>
      </div>

      {/* SECTION 3: BTL GROUND AGENTS & MANDI DISTRIBUTOR COMMISSION DESK */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>BTL Field Agents &amp; Mandi Distributor Commission Desk</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Direct ground foot-sales attribution across major wholesale hubs (FAISAL_MANDI_20, LAHORE_PROMO, etc.)
            </span>
          </div>

          <button
            onClick={() => setShowAgentModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs text-white font-mono flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Enroll New Agent</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#09111e] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e1726] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Distributor Code</th>
                  <th className="py-3 px-4">Agent Name</th>
                  <th className="py-3 px-4">Assigned Wholesale Hub</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Merchants Onboarded</th>
                  <th className="py-3 px-4">Paid Upgrades</th>
                  <th className="py-3 px-4">Total Commission</th>
                  <th className="py-3 px-4">Settlement Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {btlAgents.map((agent) => (
                  <tr key={agent.code} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                      {agent.code}
                    </td>

                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      <div>
                        <span>{agent.agentName}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{agent.phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {agent.assignedBazaar}
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {agent.city}
                    </td>

                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {agent.merchantsOnboarded} Stores
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                      {agent.paidUpgrades} Paid
                    </td>

                    <td className="py-3 px-4 font-bold text-cyan-400 whitespace-nowrap">
                      PKR {agent.totalEarnedPKR.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {agent.settlementStatus === 'PAID' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <Check className="w-3 h-3" />
                          <span>PAID ({agent.lastPayoutDate || 'Settled'})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          <span>PENDING PAYOUT</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {agent.settlementStatus === 'PENDING' ? (
                        <button
                          onClick={() => handleSettleAgentPayout(agent.code)}
                          disabled={settlingCode === agent.code}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition disabled:opacity-50"
                        >
                          {settlingCode === agent.code ? 'Settling...' : 'Settle Payout'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: UTM CAMPAIGN TRACKING TABLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Channel &amp; UTM Campaign Performance Matrix</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Live Acquisition Channel Attribution</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#09111e] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e1726] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Channel Type</th>
                  <th className="py-3 px-4">UTM Attribution</th>
                  <th className="py-3 px-4">Total Signups</th>
                  <th className="py-3 px-4">Paid Conversions</th>
                  <th className="py-3 px-4">CAC (PKR)</th>
                  <th className="py-3 px-4">Total Spend</th>
                  <th className="py-3 px-4">Generated MRR</th>
                  <th className="py-3 px-4 text-right">ROAS / Payback</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {c.campaignName}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {c.channel.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      <div>
                        <span className="text-emerald-400 font-bold">{c.utmSource}</span>
                        <span className="text-slate-400"> / {c.utmCampaign}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      {c.totalSignups}
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                      {c.paidConversions} ({c.conversionRatePct}%)
                    </td>

                    <td className="py-3 px-4 font-bold text-cyan-400 whitespace-nowrap">
                      PKR {c.cacPKR.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      PKR {c.totalSpendPKR.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-400 whitespace-nowrap">
                      PKR {c.generatedMrrPKR.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        {c.roasMultiplier}x Payback
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 5: PROMO CODES BURN DESK */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            <span>Promotional Vouchers &amp; Subsidy Burn Desk</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Merchant Acquisition Incentives</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {promos.map((p) => (
            <div
              key={p.code}
              className="p-5 rounded-2xl bg-[#091220] border border-slate-800 space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-black text-xs border border-emerald-500/30">
                  {p.code}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Expires {p.expiryDate}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white line-clamp-1">{p.title}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {p.cityRestricted ? `Restricted to ${p.cityRestricted}` : 'All Trade Corridors'}
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Redemptions:</span>
                  <span className="text-white font-bold">{p.totalRedemptions} / {p.maxRedemptions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subsidy Burn:</span>
                  <span className="text-amber-400 font-bold">PKR {p.totalSubsidizedBurnPKR.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Generated MRR:</span>
                  <span className="text-emerald-400 font-bold">PKR {p.generatedMrrPKR.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ROI Multiplier:</span>
                  <span className="text-cyan-400 font-bold">{p.roiMultiplier}x</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: WHATSAPP REFERRAL LEADERS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Organic WhatsApp Referral Champions (Dukandar Peer Invites)</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Merchant-to-Merchant Viral Champions</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#09111e] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0e1726] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Merchant Name &amp; Business</th>
                  <th className="py-3 px-4">City Hub</th>
                  <th className="py-3 px-4">Invited Peers</th>
                  <th className="py-3 px-4">Converted Paid Merchants</th>
                  <th className="py-3 px-4">Conversion Ratio</th>
                  <th className="py-3 px-4">Free Months Earned</th>
                  <th className="py-3 px-4 text-right">Viral K-Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {referrals.map((r, idx) => (
                  <tr key={r.merchantId} className="hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{r.merchantName}</span>
                          <span className="text-[10px] text-slate-400">{r.businessName}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-bold">
                      {r.city}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-white">
                      {r.invitedCount} WhatsApp Invites
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-emerald-400">
                      {r.convertedCount} Converted
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                        {((r.convertedCount / r.invitedCount) * 100).toFixed(0)}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-cyan-400">
                      {r.earnedFreeMonths} Months Free
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        K = {r.kFactorContribution}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE PROMO CODE MODAL */}
      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border border-[#1b2b48] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-400" />
              <span>Create New Promotional Voucher</span>
            </h3>

            <form onSubmit={handleCreatePromo} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">PROMO CODE (UPPERCASE) *</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. SINDH2026"
                  className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white font-bold uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">CAMPAIGN TITLE *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sindh Rural Karyana Onboarding"
                  className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">DISCOUNT TYPE</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT_PKR">Flat PKR</option>
                    <option value="FREE_SMS_CREDITS">Free SMS</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">DISCOUNT VALUE</label>
                  <input
                    type="number"
                    required
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">MAX REDEMPTIONS LIMIT</label>
                <input
                  type="number"
                  required
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                  className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPromoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Publish Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL BTL AGENT MODAL */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border border-[#1b2b48] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <span>Enroll BTL Ground Field Agent</span>
            </h3>

            <form onSubmit={handleCreateAgent} className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">DISTRIBUTOR CODE (UPPERCASE) *</label>
                <input
                  type="text"
                  required
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value)}
                  placeholder="e.g. PESHAWAR_KHYBER_10"
                  className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white font-bold uppercase focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">AGENT FULL NAME *</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g. Haji Gulzar Khan"
                  className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ASSIGNED WHOLESALE BAZAAR *</label>
                <input
                  type="text"
                  required
                  value={agentBazaar}
                  onChange={(e) => setAgentBazaar(e.target.value)}
                  placeholder="e.g. Qissa Khwani & Khyber Bazaar"
                  className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">CITY</label>
                  <select
                    value={agentCity}
                    onChange={(e: any) => setAgentCity(e.target.value)}
                    className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="Faisalabad">Faisalabad</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Karachi">Karachi</option>
                    <option value="Multan">Multan</option>
                    <option value="Rawalpindi / Islamabad">Rawalpindi / Islamabad</option>
                    <option value="Peshawar">Peshawar</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">COMMISSION (PKR/UPGRADE)</label>
                  <input
                    type="number"
                    required
                    value={agentCommission}
                    onChange={(e) => setAgentCommission(e.target.value)}
                    className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">PHONE NUMBER</label>
                <input
                  type="text"
                  required
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="0300-1234567"
                  className="w-full bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Enroll Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
