'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ArrowLeft,
  Calendar,
  Layers,
  AlertTriangle,
  Flame,
  ArrowDown,
  RefreshCw,
  Phone,
  MessageCircle,
  Clock,
  Sparkles,
  TrendingDown,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import {
  ICohortDataPoint,
  IPaywallFunnelStage,
  IChurnRiskStore,
  IFeatureUpgradeTrigger
} from '@/types/marketing';

export default function MarketingCohortsPage() {
  const [cohorts, setCohorts] = useState<ICohortDataPoint[]>([]);
  const [funnel, setFunnel] = useState<IPaywallFunnelStage[]>([]);
  const [churnRisks, setChurnRisks] = useState<IChurnRiskStore[]>([]);
  const [featureTriggers, setFeatureTriggers] = useState<IFeatureUpgradeTrigger[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchCohortData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/marketing/cohorts');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCohorts(json.data.cohorts || []);
          setFunnel(json.data.paywallFunnel || []);
          setChurnRisks(json.data.churnRisks || []);
          setFeatureTriggers(json.data.featureTriggers || []);
        }
      }
    } catch (err) {
      console.error('Failed to load cohort analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohortData();
  }, []);

  const getHeatmapColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500 text-slate-950 font-bold';
    if (pct >= 70) return 'bg-emerald-600/90 text-white font-bold';
    if (pct >= 55) return 'bg-emerald-700/80 text-emerald-100 font-semibold';
    if (pct >= 45) return 'bg-emerald-800/70 text-emerald-200';
    if (pct >= 35) return 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/20';
    return 'bg-slate-900 text-slate-400';
  };

  const handleDispatchReengagement = (store: IChurnRiskStore) => {
    const cleanPhone = store.phone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('92') ? cleanPhone : `92${cleanPhone.replace(/^0/, '')}`;
    const url = `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(store.recommendedReengagementUrdu)}`;
    window.open(url, '_blank');
    showToast(`WhatsApp re-engagement prompt opened for ${store.storeName}.`);
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
            <span className="text-xs text-slate-400 font-mono">Retention &amp; Funnel Optimization</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1.5 flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-emerald-400" />
            <span>Persona Conversion &amp; Paywall Drop-Off Funnel</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Track 5-step onboarding drop-offs, feature upgrade triggers (Pro Malik cash alerts vs WhatsApp reminders), 30/60/90-day cohort retention, and dormant churn early warnings.
          </p>
        </div>

        <button
          onClick={fetchCohortData}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* SECTION 1: 5-STAGE ONBOARDING & PAYWALL CONVERSION FUNNEL */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <span>5-Stage Persona Onboarding &amp; Paywall Conversion Funnel</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Phone OTP $\rightarrow$ Store/Home Name $\rightarrow$ First Transaction $\rightarrow$ Paywall Hit (&gt;20 Customers) $\rightarrow$ Paid Tier Upgrade.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">15.5% End-to-End Paid Conversion</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {funnel.map((stage, idx) => (
            <div
              key={stage.stepNumber}
              className={`p-4 rounded-2xl border space-y-3 flex flex-col justify-between relative ${
                idx === 4
                  ? 'bg-gradient-to-b from-[#091f24] to-[#08131e] border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs font-mono border ${
                    idx === 4
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {stage.stepNumber}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {stage.conversionFromPreviousPct}%
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white mt-2 leading-tight">{stage.stageName}</h4>
                <p className="text-[11px] text-amber-300/90 font-medium mt-1 text-right">{stage.stageNameUrdu}</p>
                <p className="text-[10px] text-slate-400 mt-1">{stage.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <span className={`text-lg font-extrabold font-mono block ${
                  idx === 4 ? 'text-emerald-300' : 'text-emerald-400'
                }`}>
                  {stage.accountsReached.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {idx === 0 ? 'Top of Funnel (100%)' : `${stage.overallDropoffPct}% cumulative drop`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: PAYWALL UPGRADE TRIGGER HEATMAP */}
      <div className="p-6 rounded-3xl bg-[#091322] border border-slate-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FEATURE ATTRIBUTION HEATMAP
              </span>
              <span className="text-xs text-slate-400 font-mono">Subscription Upgrade Catalysts</span>
            </div>
            <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>Feature Trigger Upgrade Heatmap (کون سا فیچر پے وال خریداری پر راغب کرتا ہے؟)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct telemetry tracking which specific feature prompt triggered the shopkeeper or household landlord to upgrade to paid Rs. 150/200/250 plans.
            </p>
          </div>

          <div className="text-right text-xs font-mono">
            <span className="text-slate-400 block uppercase text-[10px]">Top Upgrade Catalyst</span>
            <span className="text-sm font-bold text-emerald-400">Automated WhatsApp Tagaza (38.2%)</span>
          </div>
        </div>

        {/* Feature Heatmap Rows */}
        <div className="space-y-3 pt-2">
          {featureTriggers.map((f, idx) => (
            <div
              key={f.featureKey}
              className="p-4 rounded-2xl bg-[#070e1b] border border-slate-800/80 space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-mono font-bold text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{f.featureName}</span>
                      <span className="text-xs text-amber-300 font-medium font-urdu">
                        ({f.featureNameUrdu})
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{f.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Upgrades Driven</span>
                    <span className="font-bold text-white">{f.upgradesDriven} accounts</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Conv Efficiency</span>
                    <span className="font-bold text-cyan-400">{f.conversionEfficiencyPct}%</span>
                  </div>
                  <div className="text-right min-w-[70px]">
                    <span className="text-[10px] text-slate-400 block">Upgrade Share</span>
                    <span className="font-extrabold text-emerald-400">{f.shareOfTotalUpgradesPct}%</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Visual */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${f.shareOfTotalUpgradesPct * 2.2}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: 30 / 60 / 90-Day Cohort Retention Heatmap */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Cohort Retention Heatmap (Month-over-Month Retention Curve)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Percentage of accounts remaining active after initial signup month.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">Day 90 Benchmark: ~42% Habitual Retention</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#070e1b] text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Cohort Month</th>
                  <th className="py-3 px-4">Accounts</th>
                  <th className="py-3 px-3 text-center">Day 1</th>
                  <th className="py-3 px-3 text-center">Day 7</th>
                  <th className="py-3 px-3 text-center">Day 14</th>
                  <th className="py-3 px-3 text-center">Day 30</th>
                  <th className="py-3 px-3 text-center">Day 60</th>
                  <th className="py-3 px-3 text-center">Day 90</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {cohorts.map((c) => (
                  <tr key={c.cohortMonth} className="hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-white">
                      {c.cohortMonth}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-bold">
                      {c.cohortSize.toLocaleString()}
                    </td>

                    {/* Day 1 */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block w-14 py-1 rounded-lg text-xs font-bold ${getHeatmapColor(c.retentionRates.day1)}`}>
                        {c.retentionRates.day1}%
                      </span>
                    </td>

                    {/* Day 7 */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block w-14 py-1 rounded-lg text-xs font-bold ${getHeatmapColor(c.retentionRates.day7)}`}>
                        {c.retentionRates.day7}%
                      </span>
                    </td>

                    {/* Day 14 */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block w-14 py-1 rounded-lg text-xs font-bold ${getHeatmapColor(c.retentionRates.day14)}`}>
                        {c.retentionRates.day14}%
                      </span>
                    </td>

                    {/* Day 30 */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block w-14 py-1 rounded-lg text-xs font-bold ${getHeatmapColor(c.retentionRates.day30)}`}>
                        {c.retentionRates.day30}%
                      </span>
                    </td>

                    {/* Day 60 */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block w-14 py-1 rounded-lg text-xs font-bold ${getHeatmapColor(c.retentionRates.day60)}`}>
                        {c.retentionRates.day60}%
                      </span>
                    </td>

                    {/* Day 90 */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block w-14 py-1 rounded-lg text-xs font-bold ${getHeatmapColor(c.retentionRates.day90)}`}>
                        {c.retentionRates.day90}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: Churn Risk Early Warning Stores */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Merchant Churn Early Warning Radar (Inactive &gt; 7 Days)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High-value merchants and landlords at risk of abandoning the application with 1-click Urdu re-engagement scripts.
            </p>
          </div>
          <span className="text-xs font-mono text-red-400 font-bold">4 High-Risk Accounts Requiring Immediate Outreach</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {churnRisks.map((store) => (
            <div
              key={store.storeId}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{store.storeName}</h4>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        store.churnRiskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {store.churnRiskLevel} RISK
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{store.ownerName} &bull; {store.city}</p>
                  </div>

                  <span className="text-xs font-mono font-bold text-red-400">
                    {store.daysInactive} Days Dormant
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 rounded-2xl bg-[#070e1b] border border-slate-800/80 my-3">
                  <div>
                    <span className="text-slate-400 text-[9px] block">PREVIOUS VOLUME</span>
                    <span className="text-white font-bold">PKR {store.previousMonthlyVolumePKR.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[9px] block">PHONE</span>
                    <span className="text-slate-300">{store.phone}</span>
                  </div>
                </div>

                {/* Urdu Re-engagement Script */}
                <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-xs text-right">
                  <span className="text-[10px] font-mono text-amber-400 font-bold block mb-1">تجویز کردہ واٹس ایپ پیغام:</span>
                  <p className="text-amber-200/90 leading-relaxed font-medium">{store.recommendedReengagementUrdu}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">Auto-generated via retention sentinel</span>
                <button
                  onClick={() => handleDispatchReengagement(store)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Send WhatsApp Outreach</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
