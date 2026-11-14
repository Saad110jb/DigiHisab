'use client';

import React from 'react';
import { Moon, Zap, ShieldAlert, Clock, Activity, AlertTriangle, Lock, Terminal } from 'lucide-react';
import { IVelocitySpikeRecord } from '@/types/fraud';

interface Props {
  spikes: IVelocitySpikeRecord[];
  onFreezeEntity: (entityId: string) => Promise<void>;
  actionInProgress: boolean;
}

export default function GhostVelocityView({ spikes, onFreezeEntity, actionInProgress }: Props) {
  const midnightSpikes = spikes.filter((s) => s.burstType === 'MIDNIGHT_SPIKE');
  const botBursts = spikes.filter((s) => s.burstType === 'BOT_BURST');

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Midnight Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Moon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Midnight Ghost Spikes (02:00 - 05:00 AM)</h4>
            <p className="text-xs text-slate-400 mt-1">
              Flagged transactions exceeding Rs. 500k recorded during off-trading hours without night license.
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-mono">
              <span className="text-purple-400 font-bold">{midnightSpikes.length} Active Incident(s)</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-300">
                Total Volume: Rs.{' '}
                {midnightSpikes.reduce((acc, s) => acc + s.totalVolumePKR, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Bot Burst Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white">Bot &amp; High-Velocity Burst Limits</h4>
            <p className="text-xs text-slate-400 mt-1">
              Triggers when $\ge 50$ transactions are posted in under 60 seconds (scripted balance inflation).
            </p>
            <div className="mt-3 flex items-center gap-4 text-xs font-mono">
              <span className="text-amber-400 font-bold">{botBursts.length} Active Incident(s)</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-slate-300">Peak Rate: 1.38 txns/sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Incidents Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Live Velocity Telemetry Feed</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{spikes.length} Total Telemetry Records</span>
        </div>

        <div className="divide-y divide-slate-800/70">
          {spikes.map((spike) => (
            <div key={spike.id} className="p-6 hover:bg-slate-800/30 transition">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                        spike.burstType === 'MIDNIGHT_SPIKE'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {spike.burstType === 'MIDNIGHT_SPIKE' ? '🌙 MIDNIGHT GHOST SPIKE' : '⚡ BOT VELOCITY BURST'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{spike.timestamp}</span>
                    <span className="text-xs text-slate-600">&bull;</span>
                    <span className="text-xs text-slate-400">{spike.city}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{spike.entityName}</h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Phone: {spike.userPhone} &bull; Store ID: {spike.entityId}
                  </p>
                </div>

                {/* Metrics Pill */}
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Total Volume</p>
                    <p className="text-sm font-bold font-mono text-amber-400">
                      Rs. {spike.totalVolumePKR.toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">Velocity</p>
                    <p className="text-sm font-bold font-mono text-red-400">
                      {spike.transactionsCount} txns in {spike.timeWindowSeconds}s
                    </p>
                  </div>

                  {/* Freeze / Action Button */}
                  <button
                    onClick={() => onFreezeEntity(spike.entityId)}
                    disabled={spike.status === 'FROZEN' || actionInProgress}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                      spike.status === 'FROZEN'
                        ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5 text-red-400" />
                    {spike.status === 'FROZEN' ? 'Frozen' : 'Freeze Account'}
                  </button>
                </div>
              </div>

              {/* Forensic Details Box */}
              <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Peak Window: </span>
                  <span className="text-slate-300 font-semibold">{spike.peakHour}</span>
                </div>
                <div>
                  <span className="text-slate-500">Source IP: </span>
                  <span className="text-slate-300 font-semibold">{spike.ipAddress}</span>
                </div>
                <div>
                  <span className="text-slate-500">Client Signature: </span>
                  <span className="text-slate-300 font-semibold">{spike.deviceFingerprint}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
