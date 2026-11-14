'use client';

import React, { useState } from 'react';
import {
  Wallet,
  Zap,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  CreditCard,
  Building2,
  BadgePercent,
  Search,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { INITIAL_GATEWAY_TXNS } from '@/lib/mock-data';
import { IGatewayTransactionAudit } from '@/types/admin';

export default function SaaSFinancialsAndReconciliation() {
  const [transactions, setTransactions] = useState<IGatewayTransactionAudit[]>(INITIAL_GATEWAY_TXNS);
  const [filterGateway, setFilterGateway] = useState<string>('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleReplayIpn = (basketId: string) => {
    setTransactions(
      transactions.map((t) =>
        t.basketId === basketId ? { ...t, status: 'SUCCESS' } : t
      )
    );
    showNotification(`⚡ Webhook IPN replayed for ${basketId}! Merchant subscription upgraded instantly.`);
  };

  const tiers = [
    {
      name: 'Free Tier (Basic)',
      monthlyPrice: 'Rs. 0',
      activeCount: 4210,
      revenuePKR: 0,
      persona: 'Both Dukandar & Household',
      badgeColor: 'border-slate-700 bg-slate-800/50 text-slate-300'
    },
    {
      name: 'Ghar Ka Hisab Pro Hub',
      monthlyPrice: 'Rs. 150 / mo',
      activeCount: 1840,
      revenuePKR: 276000,
      persona: 'Household (Domestic)',
      badgeColor: 'border-sky-500/30 bg-sky-500/10 text-sky-400'
    },
    {
      name: 'Dukandar Retail POS & Khata',
      monthlyPrice: 'Rs. 200 / mo',
      activeCount: 2150,
      revenuePKR: 430000,
      persona: 'Dukandar Commercial',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    },
    {
      name: 'Pro Malik Sentinel & Till Audit',
      monthlyPrice: 'Rs. 250 / mo',
      activeCount: 3820,
      revenuePKR: 955000,
      persona: 'Dukandar Commercial',
      badgeColor: 'border-[#00d49f]/30 bg-[#00d49f]/10 text-[#00d49f]'
    },
    {
      name: 'Annual Dukandar Pro',
      monthlyPrice: 'Rs. 2,500 / yr',
      activeCount: 1290,
      revenuePKR: 3225000,
      persona: 'Dukandar Commercial',
      badgeColor: 'border-purple-500/30 bg-purple-500/10 text-purple-300'
    }
  ];

  const totalSaaSMonthlyRevenue = tiers.reduce((acc, t) => acc + t.revenuePKR, 0);

  const filteredTransactions = transactions.filter(
    (t) => filterGateway === 'ALL' || t.gatewayName === filterGateway
  );

  return (
    <div className="p-4 sm:p-8 space-y-6">
      
      {/* Toast */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>SaaS Financials & Gateway Reconciliation</span>
                <span className="text-xs font-mono text-[#00d49f] bg-[#00d49f]/10 px-2 py-0.5 rounded-full border border-[#00d49f]/20">
                  IPN Auto-Recovery
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Subscription recurring MRR breakdown, PayFast / JazzCash webhook recovery, and merchant payout settlements
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] p-2.5 px-4 text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Total Monthly MRR</span>
            <span className="text-sm font-bold text-[#00d49f]">
              Rs. {(totalSaaSMonthlyRevenue / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>
      </div>

      {/* SaaS Subscription Breakdown Cards */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <BadgePercent className="h-4 w-4 text-[#00d49f]" />
            <span>SaaS Plan Subscriptions (Pakistani Market Tiers)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Recurring PKR Model</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-xl border border-[#17233b] bg-[#070d18] p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border block w-fit mb-2 ${tier.badgeColor}`}>
                  {tier.monthlyPrice}
                </span>
                <h3 className="text-xs font-bold text-white leading-tight">{tier.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{tier.persona}</span>
              </div>

              <div className="pt-2 border-t border-[#17233b] font-mono">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Subscribers:</span>
                  <span className="text-white font-bold">{tier.activeCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] mt-0.5">
                  <span className="text-slate-400">Monthly Vol:</span>
                  <span className="text-[#00d49f] font-bold">Rs. {(tier.revenuePKR / 1000).toFixed(0)}k</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IPN Webhook Auto-Recovery & Gateway Reconciliation Desk */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>IPN Webhook Auto-Recovery Desk (PayFast & JazzCash)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies dropped gateway notifications. Click &ldquo;Replay IPN&rdquo; to simulate instant webhook execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterGateway}
              onChange={(e) => setFilterGateway(e.target.value)}
              className="rounded-xl border border-[#17233b] bg-[#070d18] px-3 py-1.5 text-xs text-slate-300 font-mono"
            >
              <option value="ALL">All Gateways</option>
              <option value="JAZZCASH_DIRECT">JazzCash Direct</option>
              <option value="PAYFAST">PayFast</option>
              <option value="RAAST_P2M">SBP Raast P2M</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070d18] text-slate-400 text-[10px] uppercase border-b border-[#17233b]">
              <tr>
                <th className="py-2.5 px-3">Basket / Txn Ref</th>
                <th className="py-2.5 px-3">Gateway Rail</th>
                <th className="py-2.5 px-3">User & Phone</th>
                <th className="py-2.5 px-3">Tier</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">IPN Status</th>
                <th className="py-2.5 px-3 text-right">Recovery Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17233b]/60">
              {filteredTransactions.map((tx) => (
                <tr key={tx.basketId} className="hover:bg-[#121d33] transition">
                  <td className="py-3 px-3">
                    <span className="text-white font-bold block">{tx.basketId}</span>
                    <span className="text-slate-500 text-[10px]">{tx.gatewayTxnId}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-slate-300 font-bold">{tx.gatewayName}</span>
                    <span className="text-[10px] text-slate-500 block">{tx.createdAt}</span>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <span className="text-slate-200 font-bold block">{tx.userName}</span>
                    <span className="text-slate-400 text-[11px] font-mono">{tx.userPhone}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      {tx.tierId}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">
                    Rs. {tx.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    {tx.status === 'SUCCESS' && (
                      <span className="text-[#00d49f] font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> ACK_OK
                      </span>
                    )}
                    {tx.status === 'PENDING_IPN' && (
                      <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                        <Clock className="h-3.5 w-3.5" /> PENDING_IPN
                      </span>
                    )}
                    {tx.status === 'FAILED' && (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> FAILED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {tx.status === 'PENDING_IPN' ? (
                      <button
                        onClick={() => handleReplayIpn(tx.basketId)}
                        className="rounded-lg bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-bold text-[11px] px-3 py-1.5 transition flex items-center gap-1 ml-auto shadow-md shadow-[#00d49f]/10"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Replay IPN</span>
                      </button>
                    ) : (
                      <span className="text-slate-600 text-[10px]">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Merchant Settlement Calculator */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sky-400" />
            <span>Merchant Udhaar Settlement Payout Calculator</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">Central Link Clearing Desk</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#070d18] border border-[#17233b] space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Collected Via Central Payment Links:</span>
            <div className="text-xl font-bold text-white">Rs. 18,450,000</div>
            <span className="text-[10px] text-slate-500">From customer online payments</span>
          </div>

          <div className="p-4 rounded-xl bg-[#070d18] border border-[#17233b] space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Disbursed to Dukandar IBAN/Raast:</span>
            <div className="text-xl font-bold text-[#00d49f]">Rs. 17,988,750</div>
            <span className="text-[10px] text-slate-500">97.5% settled via 1Link / Raast</span>
          </div>

          <div className="p-4 rounded-xl bg-[#070d18] border border-[#17233b] space-y-1">
            <span className="text-slate-400 text-[10px] block uppercase">Platform Interchange Fee (2.5%):</span>
            <div className="text-xl font-bold text-amber-400">Rs. 461,250</div>
            <span className="text-[10px] text-slate-500">Gross gateway margin</span>
          </div>
        </div>
      </div>

    </div>
  );
}
