'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Building,
  User,
  Zap,
  ExternalLink
} from 'lucide-react';
import { ICircularCollusionRing } from '@/types/fraud';

interface Props {
  rings: ICircularCollusionRing[];
  onFreezeRing: (ringId: string) => Promise<void>;
  actionInProgress: boolean;
}

export default function CircularUdhaarGraph({ rings, onFreezeRing, actionInProgress }: Props) {
  const [selectedRingId, setSelectedRingId] = useState<string>(rings[0]?.id || 'RING-01');
  const activeRing = rings.find((r) => r.id === selectedRingId) || rings[0];

  if (!activeRing) {
    return (
      <div className="p-8 text-center text-slate-400">
        No circular collusion rings detected. Sentinel DFS Cycle search clean.
      </div>
    );
  }

  const isTriad = activeRing.nodes.length === 3;

  return (
    <div className="space-y-6">
      {/* Top Selector & Ring Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
              {activeRing.status === 'FROZEN' ? '❄️ RING FROZEN' : '🚨 ACTIVE COLLUSION DETECTED'}
            </span>
            <span className="text-xs text-slate-400">Detected: {activeRing.detectedAt}</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">{activeRing.name}</h3>
        </div>

        {/* Ring Switcher */}
        <div className="flex items-center gap-2">
          {rings.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRingId(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedRingId === r.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {r.id}: {r.nodes.length}-Node Ring
            </button>
          ))}
        </div>
      </div>

      {/* Forensic Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Total Gross Circular Udhaar</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">
            Rs. {activeRing.totalGrossCircularPKR.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Artificial credit turnover generated</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Net Wash Variance</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            Rs. {activeRing.netWashDifferencePKR.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Net debt difference after loop closure</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Wash Collusion Ratio</p>
          <p className="text-xl font-bold font-mono text-red-400 mt-1">
            {(activeRing.collusionRatio * 100).toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">&gt; 90% threshold indicates fake wash trade</p>
        </div>
      </div>

      {/* Interactive Visual Graph Canvas */}
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-mono text-slate-400">
            DFS Cycle Topology: {activeRing.nodes.length} Nodes &bull; {activeRing.edges.length} Directed Balances
          </span>
        </div>

        {/* Action Button: Freeze Ring */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => onFreezeRing(activeRing.id)}
            disabled={activeRing.status === 'FROZEN' || actionInProgress}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition ${
              activeRing.status === 'FROZEN'
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 hover:border-red-500'
            }`}
          >
            <Lock className="w-4 h-4 text-red-400" />
            {activeRing.status === 'FROZEN' ? 'Collusion Ring Frozen' : 'Freeze Collusion Ring'}
          </button>
        </div>

        {/* Directed Graph SVG Visualizer */}
        <div className="py-12 flex items-center justify-center">
          {!isTriad ? (
            /* 2-Node Bilateral Collusion Visualizer */
            <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-2xl px-4 gap-8">
              {/* Node 1 */}
              <div
                className={`w-64 p-4 rounded-xl border transition ${
                  activeRing.nodes[0].isFrozen
                    ? 'bg-red-950/30 border-red-500/50'
                    : 'bg-slate-900 border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {activeRing.nodes[0].id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      activeRing.nodes[0].isFrozen
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {activeRing.nodes[0].isFrozen ? 'FROZEN' : 'ACTIVE'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{activeRing.nodes[0].name}</h4>
                <p className="text-xs text-slate-400">{activeRing.nodes[0].city}</p>
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Claims Udhaar from B: </span>
                  <span className="font-bold font-mono text-amber-400">
                    Rs. {activeRing.nodes[1].owesPKR.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Connecting Double-Arrow Bridges */}
              <div className="flex flex-col items-center gap-3">
                {/* Arrow 1: A -> B */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <span className="text-xs font-mono font-bold text-amber-300">
                    A owes B: Rs. {activeRing.edges[0]?.amountPKR.toLocaleString()}
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </div>

                <div className="text-[11px] font-mono text-red-400 font-bold bg-red-950/60 px-3 py-1 rounded-full border border-red-500/30">
                  ⚡ Wash Loop (Net Diff: Rs. {activeRing.netWashDifferencePKR.toLocaleString()})
                </div>

                {/* Arrow 2: B -> A */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <ArrowRight className="w-4 h-4 text-emerald-400 rotate-180" />
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    B owes A: Rs. {activeRing.edges[1]?.amountPKR.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Node 2 */}
              <div
                className={`w-64 p-4 rounded-xl border transition ${
                  activeRing.nodes[1].isFrozen
                    ? 'bg-red-950/30 border-red-500/50'
                    : 'bg-slate-900 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {activeRing.nodes[1].id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      activeRing.nodes[1].isFrozen
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {activeRing.nodes[1].isFrozen ? 'FROZEN' : 'ACTIVE'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{activeRing.nodes[1].name}</h4>
                <p className="text-xs text-slate-400">{activeRing.nodes[1].city}</p>
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">Claims Udhaar from A: </span>
                  <span className="font-bold font-mono text-emerald-400">
                    Rs. {activeRing.nodes[0].owesPKR.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* 3-Node Triangular Collusion Visualizer (A -> B -> C -> A) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
              {activeRing.nodes.map((node, idx) => {
                const nextNode = activeRing.nodes[(idx + 1) % activeRing.nodes.length];
                const edge = activeRing.edges.find((e) => e.from === node.id);

                return (
                  <div
                    key={node.id}
                    className={`p-4 rounded-xl border relative transition ${
                      node.isFrozen ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Node {String.fromCharCode(65 + idx)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          node.isFrozen
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {node.isFrozen ? 'FROZEN' : 'ACTIVE'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{node.name}</h4>
                    <p className="text-xs text-slate-400">{node.city}</p>

                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-1 text-xs font-mono">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Owes {nextNode.name.split(' ')[0]}:</span>
                        <span className="text-amber-400 font-bold">
                          Rs. {edge?.amountPKR.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-slate-400 bg-slate-950/80 py-1 rounded">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>Transfers to Node {String.fromCharCode(65 + ((idx + 1) % 3))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Collusion Details Table */}
        <div className="border-t border-slate-800 pt-4 mt-4">
          <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Ring Participants &amp; Ledger References
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-400 bg-slate-950/50 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2 px-3">Merchant</th>
                  <th className="py-2 px-3">Phone</th>
                  <th className="py-2 px-3">City</th>
                  <th className="py-2 px-3 text-right">Udhaar Owed</th>
                  <th className="py-2 px-3">Debtor Counterparty</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {activeRing.nodes.map((node) => (
                  <tr key={node.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-semibold text-white">{node.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{node.phone}</td>
                    <td className="py-2.5 px-3 text-slate-400">{node.city}</td>
                    <td className="py-2.5 px-3 text-right text-amber-400 font-bold">
                      Rs. {node.owesPKR.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{node.owesToName}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          node.isFrozen
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {node.isFrozen ? 'FROZEN' : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
