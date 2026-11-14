'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  AlertTriangle,
  Store,
  Home,
  Crown,
  Users,
  Save,
  Zap,
  Sliders,
  Sparkles,
  RefreshCw,
  Plus,
  History,
  Lock,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  X,
  Check,
  Smartphone
} from 'lucide-react';
import {
  ISubscriptionTier,
  ISubscriptionSummary,
  IFeatureGate
} from '@/types/subscription';

export default function SuperAdminSubscriptionsPage() {
  const [tiers, setTiers] = useState<ISubscriptionTier[]>([]);
  const [summary, setSummary] = useState<ISubscriptionSummary | null>(null);
  const [globalFeatures, setGlobalFeatures] = useState<IFeatureGate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-place editing state for prices
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [savingTierId, setSavingTierId] = useState<string | null>(null);

  // Global Feature Drawer State
  const [featureDrawerOpen, setFeatureDrawerOpen] = useState<boolean>(false);
  const [togglingKillSwitch, setTogglingKillSwitch] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/subscriptions/tiers');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTiers(json.data.tiers || []);
          setSummary(json.data.summary || null);
          setGlobalFeatures(json.data.globalFeatures || []);

          // Initialize editing prices
          const initialPrices: Record<string, number> = {};
          (json.data.tiers || []).forEach((t: ISubscriptionTier) => {
            initialPrices[t.id] = t.pricePKR;
          });
          setEditingPrices(initialPrices);
        }
      }
    } catch (err: any) {
      console.error('Failed to load subscriptions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleMasterKillswitch = async () => {
    try {
      setTogglingKillSwitch(true);
      const res = await fetch('/api/v1/admin/subscriptions/master-killswitch', {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        fetchData();
      }
    } catch (err: any) {
      showToast('Error toggling master switch: ' + err.message);
    } finally {
      setTogglingKillSwitch(false);
    }
  };

  const handleToggleTierActive = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/admin/subscriptions/tiers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_ACTIVE' }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        fetchData();
      }
    } catch (err: any) {
      showToast('Error updating tier: ' + err.message);
    }
  };

  const handleSavePrice = async (id: string) => {
    const newPrice = editingPrices[id];
    if (newPrice === undefined || isNaN(newPrice)) return;

    try {
      setSavingTierId(id);
      const res = await fetch(`/api/v1/admin/subscriptions/tiers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_PRICE', newPrice }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        fetchData();
      }
    } catch (err: any) {
      showToast('Error saving price: ' + err.message);
    } finally {
      setSavingTierId(null);
    }
  };

  const handleToggleFeatureInTier = async (tierId: string, featureKey: string) => {
    try {
      const res = await fetch(`/api/v1/admin/subscriptions/tiers/${tierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_FEATURE', featureKey }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        fetchData();
      }
    } catch (err: any) {
      showToast('Error toggling feature: ' + err.message);
    }
  };

  const handleToggleGlobalFeature = async (key: string) => {
    try {
      const res = await fetch('/api/v1/admin/features/global-toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message);
        fetchData();
      }
    } catch (err: any) {
      showToast('Error toggling global feature: ' + err.message);
    }
  };

  const isEnforced = summary?.systemEnforcementActive ?? true;

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#00d49f] text-slate-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs border border-[#00d49f]/40 animate-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER & MASTER KILL-SWITCH */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#17233b]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/20 text-[#00d49f]">
              <CreditCard className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  Subscription &amp; Dynamic Feature-Gate Matrix
                </h1>
                <span className="text-xs font-mono font-semibold text-[#00d49f] px-2 py-0.5 rounded-full bg-[#00d49f]/10 border border-[#00d49f]/20">
                  v2.6 Enforced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure prices, toggle user visibility, allocate sub-accounts, and enforce AI feature gates across Pakistani retail &amp; domestic tiers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Master Kill-Switch & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Master Kill-Switch Box */}
          <div className="flex items-center gap-3 bg-[#0d1627] border border-[#17233b] rounded-2xl p-2.5 px-4 shadow-lg">
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Master System Paywall</span>
              <span className={`text-xs font-bold font-mono ${isEnforced ? 'text-[#00d49f]' : 'text-rose-400'}`}>
                {isEnforced ? 'ACTIVE (Paywalls Enforced)' : 'BYPASS (Free Access to All)'}
              </span>
            </div>
            <button
              onClick={handleToggleMasterKillswitch}
              disabled={togglingKillSwitch}
              className="text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Toggle system-wide paywall enforcement"
            >
              {isEnforced ? (
                <ToggleRight className="h-8 w-8 text-[#00d49f]" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-rose-500" />
              )}
            </button>
          </div>

          {/* Global Feature Drawer Button */}
          <button
            onClick={() => setFeatureDrawerOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-[#0d1627] border border-[#17233b] hover:border-slate-600 text-slate-200 font-bold text-xs flex items-center gap-2 transition"
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Global Feature Switches</span>
          </button>

          {/* Price Change Audit Logs */}
          <Link
            href="/admin/subscriptions/audit"
            className="px-3.5 py-2.5 rounded-xl bg-[#0d1627] border border-[#17233b] hover:border-slate-600 text-slate-200 font-bold text-xs flex items-center gap-2 transition"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span>Proration Audit</span>
          </Link>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#0d1627] border border-[#17233b] hover:border-slate-600 text-slate-300 transition"
            title="Refresh Tiers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00d49f]' : ''}`} />
          </button>
        </div>
      </div>

      {/* FINANCIAL HEALTH RIBBON */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Total Subscription MRR</span>
          <span className="text-xl font-black text-[#00d49f]">
            PKR {summary ? summary.totalMRR.toLocaleString() : '444,250'}
          </span>
          <p className="text-[10px] text-slate-400">100% recurring cashflow</p>
        </div>

        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Active Paid Subscribers</span>
          <span className="text-xl font-black text-white">
            {summary ? summary.totalPaidSubscribers.toLocaleString() : '1,385'}
          </span>
          <p className="text-[10px] text-slate-400">
            Across {summary ? summary.totalSubscribers.toLocaleString() : '2,645'} total accounts
          </p>
        </div>

        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Blended Paid ARPU</span>
          <span className="text-xl font-black text-sky-400">
            PKR {summary ? summary.blendedPaidArpu.toFixed(2) : '320.76'}
          </span>
          <p className="text-[10px] text-slate-400">Average revenue per paid shop</p>
        </div>

        <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-4 space-y-1">
          <span className="text-[10px] text-slate-400 block uppercase">Configured Plans</span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-400">
              {tiers.length} Tiers
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-[#00d49f] border border-[#00d49f]/30 font-bold">
              AI Powered
            </span>
          </div>
          <p className="text-[10px] text-slate-400">1 Free &bull; 1 Ghar &bull; 2 Dukan &bull; 1 Dual VIP</p>
        </div>
      </div>

      {/* PLAN CONFIGURATION CARDS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#00d49f]" />
            <span>Master Plan &amp; AI Feature Bundles</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Click feature checkboxes to toggle in-tier access</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {tiers.map((tier) => {
            const currentPriceInput = editingPrices[tier.id] ?? tier.pricePKR;
            const hasPriceChanged = currentPriceInput !== tier.pricePKR;
            const isSaving = savingTierId === tier.id;

            return (
              <div
                key={tier.id}
                className={`rounded-2xl border bg-[#0d1627] p-4 flex flex-col justify-between transition-all duration-150 ${
                  tier.isActive
                    ? tier.isRecommended
                      ? 'border-[#00d49f]/50 shadow-xl shadow-[#00d49f]/10'
                      : 'border-[#17233b]'
                    : 'border-rose-900/40 opacity-60 bg-[#09111e]'
                }`}
              >
                <div>
                  {/* Card Header & Persona Scope */}
                  <div className="flex items-center justify-between border-b border-[#17233b] pb-2.5 mb-3">
                    <div className="flex items-center gap-1.5">
                      {tier.personaScope === 'HOUSEHOLD_ONLY' && <Home className="h-4 w-4 text-sky-400" />}
                      {tier.personaScope === 'DUKANDAR_ONLY' && <Store className="h-4 w-4 text-emerald-400" />}
                      {tier.personaScope === 'DUAL_ACCESS' && <Crown className="h-4 w-4 text-amber-400" />}
                      <span className="text-[11px] font-mono font-bold text-slate-300">
                        {tier.personaScope === 'DUAL_ACCESS'
                          ? 'DUAL VIP'
                          : tier.personaScope === 'HOUSEHOLD_ONLY'
                          ? 'HOUSEHOLD'
                          : 'DUKANDAR'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-mono font-bold ${tier.isActive ? 'text-[#00d49f]' : 'text-rose-500'}`}>
                        {tier.isActive ? 'ON' : 'OFF'}
                      </span>
                      <button
                        onClick={() => handleToggleTierActive(tier.id)}
                        className="text-slate-400 hover:text-white"
                        title={tier.isActive ? 'Hide tier from checkout' : 'Make tier active'}
                      >
                        {tier.isActive ? (
                          <ToggleRight className="h-6 w-6 text-[#00d49f]" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Plan Name & Urdu Label */}
                  <div className="min-h-[48px]">
                    <h3 className="text-sm font-bold text-white flex items-center justify-between">
                      <span>{tier.name}</span>
                      {tier.isRecommended && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#00d49f]/20 text-[#00d49f] border border-[#00d49f]/30">
                          POPULAR
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-amber-300/80 font-medium font-urdu mt-0.5">{tier.nameUrdu}</p>
                  </div>

                  {/* In-Place Price & Sub-Accounts Editor */}
                  <div className="my-3 p-3 rounded-xl bg-[#070d18] border border-[#17233b] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono">Monthly Price:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#00d49f] font-mono font-bold">Rs.</span>
                        <input
                          type="number"
                          value={currentPriceInput}
                          onChange={(e) =>
                            setEditingPrices({
                              ...editingPrices,
                              [tier.id]: Number(e.target.value),
                            })
                          }
                          className="w-16 rounded-md bg-[#0d1627] border border-[#17233b] px-1.5 py-0.5 text-xs text-white font-mono text-right focus:outline-none focus:border-[#00d49f]"
                        />
                      </div>
                    </div>

                    {hasPriceChanged && (
                      <button
                        onClick={() => handleSavePrice(tier.id)}
                        disabled={isSaving}
                        className="w-full py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] font-mono flex items-center justify-center gap-1 transition"
                      >
                        <Save className="w-3 h-3" />
                        <span>{isSaving ? 'Saving...' : '💾 Save New Price'}</span>
                      </button>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[#17233b]/80">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-500" />
                        <span>Sub-Accounts:</span>
                      </span>
                      <span className="text-white font-bold">{tier.quotas.maxSubAccounts} Users</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Khata Cap:</span>
                      <span className={tier.quotas.maxCustomers === -1 ? 'text-[#00d49f] font-bold' : 'text-amber-400 font-bold'}>
                        {tier.quotas.maxCustomers === -1 ? 'Unlimited' : `${tier.quotas.maxCustomers} Max`}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist with Individual Toggles */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] font-mono uppercase text-slate-400 block tracking-wider">
                      Included Feature Gates:
                    </span>
                    {tier.featuresList.map((feat) => (
                      <div
                        key={feat.key}
                        onClick={() => handleToggleFeatureInTier(tier.id, feat.key)}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#121d33] transition cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                          {feat.isAi && (
                            <span title="AI Powered Module" className="inline-flex items-center">
                              <Sparkles className="w-3 h-3 text-[#00d49f] shrink-0" />
                            </span>
                          )}
                          <span className="text-slate-300 text-[11px] truncate">
                            {feat.label}
                          </span>
                        </div>
                        {feat.enabled ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#00d49f] shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscriber Footprint */}
                <div className="mt-4 pt-3 border-t border-[#17233b] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400 font-bold">{tier.activeSubscribers} Subs</span>
                  <span className="text-[#00d49f] font-bold">
                    PKR {tier.mrrContributionPKR.toLocaleString()}/mo
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GLOBAL FEATURE-GATE DRAWER / MODAL */}
      {featureDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border-l border-[#1b2b48] h-full w-full max-w-lg p-6 space-y-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[#00d49f]" />
                <h3 className="text-base font-bold text-white">Global Feature Switches</h3>
              </div>
              <button
                onClick={() => setFeatureDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-mono">
              Master system kill-switches: Toggling any switch here disables the feature globally across all mobile and web clients (e.g. during third-party Whisper API or payment gateway outages).
            </p>

            <div className="space-y-3">
              {globalFeatures.map((feat) => (
                <div
                  key={feat.key}
                  className="p-4 rounded-2xl bg-[#070e1b] border border-[#17233b] flex items-start justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{feat.labelEnglish}</span>
                      <span className="text-xs text-amber-300 font-urdu">({feat.labelUrdu})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">{feat.description}</p>
                    <div className="flex items-center gap-2 pt-1 text-[9px] font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {feat.category}
                      </span>
                      <span className="text-slate-400">
                        Scope: {feat.scope.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleGlobalFeature(feat.key)}
                    className="shrink-0 text-slate-400 hover:text-white mt-1"
                  >
                    {feat.isGloballyEnabled ? (
                      <ToggleRight className="h-7 w-7 text-[#00d49f]" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-rose-500" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#17233b]">
              <button
                onClick={() => setFeatureDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs font-mono"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
