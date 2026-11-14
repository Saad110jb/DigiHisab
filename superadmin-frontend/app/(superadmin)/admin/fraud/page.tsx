'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Activity,
  RotateCcw,
  RefreshCw,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Moon,
  DollarSign,
  PackageX
} from 'lucide-react';
import {
  IFraudIncident,
  ICircularCollusionRing,
  ITillVarianceRecord,
  INegativeStockRecord,
  IVelocitySpikeRecord,
  FraudSeverity,
  FraudAnomalyType
} from '@/types/fraud';
import CircularUdhaarGraph from '@/components/fraud/CircularUdhaarGraph';
import GhostVelocityView from '@/components/fraud/GhostVelocityView';
import TillShortageAuditor from '@/components/fraud/TillShortageAuditor';
import NegativeStockViewer from '@/components/fraud/NegativeStockViewer';

type FraudTab = 'RADAR' | 'CIRCULAR_RINGS' | 'GHOST_VELOCITY' | 'TILL_SHORTAGE' | 'NEGATIVE_STOCK';

export default function IntelligentFraudSentinelPage() {
  const [activeTab, setActiveTab] = useState<FraudTab>('RADAR');
  const [incidents, setIncidents] = useState<IFraudIncident[]>([]);
  const [rings, setRings] = useState<ICircularCollusionRing[]>([]);
  const [tillRecords, setTillRecords] = useState<ITillVarianceRecord[]>([]);
  const [negativeStock, setNegativeStock] = useState<INegativeStockRecord[]>([]);
  const [velocitySpikes, setVelocitySpikes] = useState<IVelocitySpikeRecord[]>([]);
  const [totalAtRiskPKR, setTotalAtRiskPKR] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Filters for Radar
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  // Step-Up Confirmation Modal for Freeze
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [freezeTarget, setFreezeTarget] = useState<{ id: string; name: string; type: 'INCIDENT' | 'RING' } | null>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [incRes, ringsRes] = await Promise.all([
        fetch('/api/v1/admin/fraud/incidents'),
        fetch('/api/v1/admin/fraud/rings')
      ]);

      const incJson = await incRes.json();
      const ringsJson = await ringsRes.json();

      if (incJson.success && incJson.data) {
        setIncidents(incJson.data.incidents || []);
        setTotalAtRiskPKR(incJson.data.totalAtRiskPKR || 0);
        setTillRecords(incJson.data.tillDiscrepancies || []);
        setNegativeStock(incJson.data.negativeStock || []);
        setVelocitySpikes(incJson.data.velocitySpikes || []);
      }

      if (ringsJson.success && ringsJson.data) {
        setRings(ringsJson.data.rings || []);
      }
    } catch (err: any) {
      showToast('Failed to load fraud incidents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Account Freeze Confirmation
  const promptFreeze = (id: string, name: string, type: 'INCIDENT' | 'RING') => {
    setFreezeTarget({ id, name, type });
    setAdminPinInput('');
    setPinError('');
    setFreezeModalOpen(true);
  };

  const executeConfirmedFreeze = async () => {
    if (adminPinInput !== '1234' && adminPinInput !== '0000' && adminPinInput.length < 4) {
      setPinError('Invalid Admin Re-Authentication PIN. Enter 1234.');
      return;
    }

    if (!freezeTarget) return;

    try {
      setActionInProgress(true);
      if (freezeTarget.type === 'RING') {
        const res = await fetch('/api/v1/admin/fraud/rings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ringId: freezeTarget.id, action: 'FREEZE_RING' })
        });
        const json = await res.json();
        if (json.success) {
          showToast(`❄️ ${json.message}`);
          await loadData();
        } else {
          showToast(`Error: ${json.message}`);
        }
      } else {
        const res = await fetch('/api/v1/admin/fraud/incidents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incidentId: freezeTarget.id, action: 'FREEZE_ACCOUNT' })
        });
        const json = await res.json();
        if (json.success) {
          showToast(`❄️ Account associated with ${freezeTarget.name} frozen.`);
          await loadData();
        } else {
          showToast(`Error: ${json.message}`);
        }
      }
      setFreezeModalOpen(false);
    } catch (err: any) {
      showToast('Freeze operation failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDismissIncident = async (incidentId: string) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/fraud/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, action: 'DISMISS' })
      });
      const json = await res.json();
      if (json.success) {
        showToast('✅ Incident dismissed as False Positive.');
        await loadData();
      }
    } catch (err: any) {
      showToast('Dismiss failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResolveIncident = async (incidentId: string) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/fraud/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, action: 'RESOLVE' })
      });
      const json = await res.json();
      if (json.success) {
        showToast('✅ Incident resolved and archived.');
        await loadData();
      }
    } catch (err: any) {
      showToast('Resolve failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleTriggerSurpriseAudit = async (recordId: string) => {
    try {
      setActionInProgress(true);
      const res = await fetch('/api/v1/admin/fraud/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, action: 'TRIGGER_SURPRISE_AUDIT' })
      });
      const json = await res.json();
      if (json.success) {
        showToast('⚡ Surprise physical cash audit dispatched!');
        await loadData();
      }
    } catch (err: any) {
      showToast('Audit trigger failed: ' + err.message);
    } finally {
      setActionInProgress(false);
    }
  };

  // Filtered incidents for Radar
  const filteredIncidents = incidents.filter((inc) => {
    const matchSev = severityFilter === 'ALL' || inc.severity === severityFilter;
    const matchType = typeFilter === 'ALL' || inc.type === typeFilter;
    const matchSearch =
      !searchTerm ||
      inc.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.userPhone.includes(searchTerm);
    return matchSev && matchType && matchSearch;
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-5 py-3 text-xs font-mono text-[#00d49f] shadow-2xl flex items-center gap-2 animate-bounce">
          <Zap className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold uppercase">
                  FORENSIC AUDITING DESK
                </span>
                <span className="text-xs text-slate-400 font-mono">Real-Time Anomaly Sentinel</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                Intelligent Fraud Detection &amp; Anomaly Sentinel
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-3xl">
            Live automated heuristic monitoring across financial ledgers, bot velocity surges, circular udhaar wash rings, negative inventory phantom checkouts, and till skimming discrepancies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Sentinel
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Total Volume At-Risk</p>
          <p className="text-xl font-bold font-mono text-red-400 mt-1">
            Rs. {totalAtRiskPKR.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Identified across active anomaly flags</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Critical Incidents</p>
          <p className="text-xl font-bold font-mono text-amber-400 mt-1">
            {incidents.filter((i) => i.severity === 'CRITICAL').length} / {incidents.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Requires immediate Malik freeze</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Circular Udhaar Rings</p>
          <p className="text-xl font-bold font-mono text-purple-400 mt-1">
            {rings.length} Active Loops
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Bilateral &amp; Triad collusion detected</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs font-medium text-slate-400">Average Till Discrepancy</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {(
              tillRecords.reduce((acc, r) => acc + r.discrepancyPercentage, 0) / (tillRecords.length || 1)
            ).toFixed(2)}
            %
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Tolerance threshold: &plusmn;5.0%</p>
        </div>
      </div>

      {/* 5-Tab Navigation Pill Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setActiveTab('RADAR')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'RADAR'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Incident Radar ({incidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CIRCULAR_RINGS')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'CIRCULAR_RINGS'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Circular Udhaar Rings ({rings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('GHOST_VELOCITY')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'GHOST_VELOCITY'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Ghost &amp; Bot Velocity ({velocitySpikes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TILL_SHORTAGE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'TILL_SHORTAGE'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Till Shortages &amp; Skimming ({tillRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('NEGATIVE_STOCK')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'NEGATIVE_STOCK'
              ? 'bg-[#00d49f] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PackageX className="w-3.5 h-3.5" />
          <span>Negative Inventory Checkouts ({negativeStock.length})</span>
        </button>
      </div>

      {/* TAB 1: INCIDENT RADAR */}
      {activeTab === 'RADAR' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by store name, phone, or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#00d49f] w-full sm:w-64"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Severity filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
              </select>

              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Anomaly Types</option>
                <option value="CIRCULAR_UDHAAR_RING">Circular Udhaar Rings</option>
                <option value="MIDNIGHT_GHOST_SPIKE">Midnight Ghost Spikes</option>
                <option value="BOT_VELOCITY_BURST">Bot Velocity Bursts</option>
                <option value="ABNORMAL_TILL_SHORTAGE">Till Shortages</option>
                <option value="NEGATIVE_STOCK_CHECKOUT">Negative Stock POS</option>
              </select>
            </div>
          </div>

          {/* Incidents List */}
          <div className="space-y-3">
            {filteredIncidents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
                No incidents match your selected filters. Sentinel scan clean.
              </div>
            ) : (
              filteredIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className={`p-5 rounded-2xl border transition ${
                    inc.severity === 'CRITICAL'
                      ? 'bg-slate-900/95 border-red-500/40 hover:border-red-500'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${
                            inc.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : inc.severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {inc.severity} SEVERITY
                        </span>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {inc.type.replace(/_/g, ' ')}
                        </span>

                        <span className="text-xs text-slate-500 font-mono">&bull;</span>
                        <span className="text-xs text-slate-400 font-mono">{inc.detectedAt}</span>
                      </div>

                      <h3 className="text-base font-bold text-white">{inc.title}</h3>

                      {/* Bilingual Urdu Subtitle */}
                      <p className="text-xs text-amber-300/90 font-medium">
                        {inc.summaryUrdu}
                      </p>

                      <div className="text-xs text-slate-400 font-mono pt-1">
                        Entity: <span className="text-slate-200 font-bold">{inc.entityName}</span> &bull; {inc.entityCity} ({inc.userPhone})
                      </div>
                    </div>

                    {/* Risk Score & Actions */}
                    <div className="flex flex-col items-end gap-3 min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Risk Score:</span>
                        <span
                          className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg ${
                            inc.riskScore >= 90
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : inc.riskScore >= 75
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          }`}
                        >
                          {inc.riskScore} / 100
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Freeze Account Button */}
                        <button
                          onClick={() => promptFreeze(inc.id, inc.entityName, 'INCIDENT')}
                          disabled={inc.status === 'FROZEN' || actionInProgress}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                            inc.status === 'FROZEN'
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                              : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5 text-red-400" />
                          {inc.status === 'FROZEN' ? 'Account Frozen' : 'Freeze Account'}
                        </button>

                        {/* Dismiss */}
                        <button
                          onClick={() => handleDismissIncident(inc.id)}
                          disabled={actionInProgress}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                        >
                          Dismiss
                        </button>

                        {/* Resolve */}
                        <button
                          onClick={() => handleResolveIncident(inc.id)}
                          disabled={actionInProgress}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Forensic Evidence Accordion */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                      Forensic Telemetry Evidence ({inc.evidenceLogs.length} entries)
                    </p>
                    <div className="space-y-1.5">
                      {inc.evidenceLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-xs font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-slate-300"
                        >
                          <span className="text-[#00d49f]">&bull;</span>
                          <span className="text-slate-500 min-w-[130px]">{log.timestamp}</span>
                          <span className="flex-1">{log.description}</span>
                          <span className="text-amber-400 font-bold">{log.refId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CIRCULAR UDHAAR RINGS */}
      {activeTab === 'CIRCULAR_RINGS' && (
        <CircularUdhaarGraph
          rings={rings}
          onFreezeRing={async (ringId) => {
            promptFreeze(ringId, ringId, 'RING');
          }}
          actionInProgress={actionInProgress}
        />
      )}

      {/* TAB 3: GHOST & BOT VELOCITY */}
      {activeTab === 'GHOST_VELOCITY' && (
        <GhostVelocityView
          spikes={velocitySpikes}
          onFreezeEntity={async (entityId) => {
            promptFreeze(entityId, entityId, 'INCIDENT');
          }}
          actionInProgress={actionInProgress}
        />
      )}

      {/* TAB 4: TILL SHORTAGES */}
      {activeTab === 'TILL_SHORTAGE' && (
        <TillShortageAuditor
          records={tillRecords}
          onTriggerSurpriseAudit={handleTriggerSurpriseAudit}
          actionInProgress={actionInProgress}
        />
      )}

      {/* TAB 5: NEGATIVE STOCK */}
      {activeTab === 'NEGATIVE_STOCK' && (
        <NegativeStockViewer records={negativeStock} />
      )}

      {/* STEP-UP RE-AUTHENTICATION MODAL FOR FREEZE ACTIONS */}
      {freezeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Step-Up Re-Authentication</h3>
                <p className="text-xs text-slate-400">Forensic Sentinel Freeze Confirmation</p>
              </div>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-200">
              <p className="font-bold">⚠️ Destructive Administrative Action</p>
              <p className="mt-1">
                Freezing {freezeTarget?.type === 'RING' ? 'collusion ring' : 'account'}{' '}
                <span className="font-mono font-bold text-white">{freezeTarget?.name}</span> will immediately terminate all active cashier POS logins and reject all double-entry ledger postings.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300">
                Enter Malik / SuperAdmin PIN (Default: 1234):
              </label>
              <input
                type="password"
                maxLength={6}
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="&bull;&bull;&bull;&bull;"
                className="w-full bg-slate-950 border border-slate-700 text-center text-lg tracking-widest font-mono text-white rounded-xl py-2.5 focus:outline-none focus:border-red-400"
              />
              {pinError && <p className="text-xs text-red-400 font-mono">{pinError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFreezeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedFreeze}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Confirm Forensic Freeze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
