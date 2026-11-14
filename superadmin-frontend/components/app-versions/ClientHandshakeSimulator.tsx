'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { IClientHandshakeResponse } from '@/types/app-versions';

export default function ClientHandshakeSimulator() {
  const [testVersion, setTestVersion] = useState<string>('1.9.0');
  const [testPersona, setTestPersona] = useState<'DUKANDAR' | 'HOUSEHOLD'>('DUKANDAR');
  const [handshakeResult, setHandshakeResult] = useState<IClientHandshakeResponse | null>(null);
  const [testing, setTesting] = useState(false);

  const runSimulation = async () => {
    try {
      setTesting(true);
      const res = await fetch(
        `/api/v1/config/app-version?version=${testVersion}&persona=${testPersona}`
      );
      const json = await res.json();
      if (json.success) {
        setHandshakeResult(json.data);
      }
    } catch (e) {
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">Live Client Boot &amp; Handshake Simulator</h4>
          <p className="text-xs text-slate-400">
            Simulate how a merchant tablet or smartphone reacts when booting Digi Hisab with specific version numbers.
          </p>
        </div>
      </div>

      {/* Inputs Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 items-end">
        <div>
          <label className="text-xs font-mono text-slate-400 block mb-1">Simulated Client Version</label>
          <select
            value={testVersion}
            onChange={(e) => setTestVersion(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="1.9.0">v1.9.0 (Hard Blocked Legacy)</option>
            <option value="2.1.0">v2.1.0 (Deprecated POS)</option>
            <option value="2.3.0">v2.3.0 (Supported Soft Prompt)</option>
            <option value="2.4.1">v2.4.1 (Current Latest)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-mono text-slate-400 block mb-1">Target Persona</label>
          <select
            value={testPersona}
            onChange={(e) => setTestPersona(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none"
          >
            <option value="DUKANDAR">DUKANDAR (POS Tablet Cutoff: 2.2.0)</option>
            <option value="HOUSEHOLD">HOUSEHOLD (Ghar Ka Hisab Cutoff: 1.8.0)</option>
          </select>
        </div>

        <div>
          <button
            onClick={runSimulation}
            disabled={testing}
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow"
          >
            <Play className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            Run Handshake Simulation
          </button>
        </div>
      </div>

      {/* Simulation Results Display */}
      {handshakeResult && (
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-300 font-mono uppercase">
              Client Boot Decision Result:
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                handshakeResult.maintenance.isActive
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : handshakeResult.updateStatus === 'FORCED_UPDATE'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : handshakeResult.updateStatus === 'SOFT_UPDATE'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
            >
              {handshakeResult.maintenance.isActive
                ? '🛑 EMERGENCY MAINTENANCE SCREEN'
                : handshakeResult.updateStatus === 'FORCED_UPDATE'
                ? '🚨 HARD BLOCK (FORCED UPDATE REQUIRED)'
                : handshakeResult.updateStatus === 'SOFT_UPDATE'
                ? '⚠️ SOFT PROMPT (OPTIONAL UPDATE)'
                : '✅ UP TO DATE (PASS THROUGH)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block">Tested Version:</span>
              <span className="text-white font-bold">v{handshakeResult.clientVersion}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Min Supported for {testPersona}:</span>
              <span className="text-amber-400 font-bold">v{handshakeResult.minSupportedVersion}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Target Latest:</span>
              <span className="text-emerald-400 font-bold">v{handshakeResult.latestVersion}</span>
            </div>
          </div>

          {/* Active Flags Injected */}
          <div className="pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase font-mono block mb-2">
              Injected Feature Flags for this Device:
            </span>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {Object.entries(handshakeResult.featureFlags).map(([key, val]) => (
                <span
                  key={key}
                  className={`px-2.5 py-1 rounded border ${
                    val
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-300 border-red-500/30'
                  }`}
                >
                  {key}: {val ? 'ON' : 'OFF'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
