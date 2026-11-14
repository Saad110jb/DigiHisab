'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Shield,
  Smartphone,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  Store,
  Home,
  Mail,
  Send,
  Edit2,
  Check,
  MapPin,
  Navigation,
  Compass
} from 'lucide-react';
import { INITIAL_USERS, INITIAL_JOURNAL_VOUCHERS } from '@/lib/mock-data';
import { adminUserService } from '@/lib/admin-api';
import StepUpAuthModal from '@/components/security/StepUpAuthModal';

export default function UserAuditAndSessionPage() {
  const params = useParams();
  const userId = params?.id as string;
  const initialUser = INITIAL_USERS.find((u) => u.id === userId) || INITIAL_USERS[0];

  const [user, setUser] = useState(initialUser);
  const [emailInput, setEmailInput] = useState(initialUser.email || `${initialUser.id.toLowerCase()}@digihisab-test.pk`);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [dispatchingEmail, setDispatchingEmail] = useState(false);

  const [sessions, setSessions] = useState([
    {
      sessionId: 'SESS_A901',
      device: 'Samsung Galaxy Tab A9+ (Counter POS)',
      ip: '182.185.12.94 (PTCL Faisalabad)',
      lastHeartbeat: 'Just now',
      jwtExpiresIn: '18 hours',
      isCurrent: true,
    },
    {
      sessionId: 'SESS_B102',
      device: 'Redmi 13C (Owner Malik Phone)',
      ip: '39.40.112.5 (Zong 4G)',
      lastHeartbeat: '12 mins ago',
      jwtExpiresIn: '4 days',
      isCurrent: false,
    },
    {
      sessionId: 'SESS_C303',
      device: 'Chrome Web Client (Billing Desk)',
      ip: '119.160.67.21 (Nayatel)',
      lastHeartbeat: '3 hours ago',
      jwtExpiresIn: '2 hours',
      isCurrent: false,
    }
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    title: string;
    description: string;
    execute: (token: string) => void;
  } | null>(null);

  const requestStepUp = (title: string, description: string, execute: (token: string) => void) => {
    setPendingAction({ title, description, execute });
    setStepUpOpen(true);
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessions(sessions.filter((s) => s.sessionId !== sessionId));
    showNotification(`⚡ Session ${sessionId} invalidated. JWT revoked on edge cluster.`);
  };

  const handleRevokeAllSessions = () => {
    requestStepUp(
      'Terminate All User Sessions',
      `High-risk operation: Forcibly evicting all JWT edge tokens for ${user.fullName} (${user.id}).`,
      (token) => {
        setSessions([]);
        showNotification(`🚨 ALL active JWT sessions terminated for user ${user.id} with Step-Up Token!`);
      }
    );
  };

  const handleToggleFreeze = () => {
    const nextAction = user.status === 'FROZEN' ? 'Unfreeze Account' : 'Freeze Account';
    requestStepUp(
      `Zero-Trust: ${nextAction}`,
      `High-risk destructive operation: Altering system lock state for ${user.fullName} (${user.id}). Requires 2FA or Password re-entry.`,
      (token) => {
        const newStatus = user.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
        setUser({ ...user, status: newStatus });
        showNotification(`🔒 [Auth Token: ${token.substring(0, 8)}...] Account ${user.id} status changed to ${newStatus}.`);
      }
    );
  };

  const handleSaveEmail = async () => {
    setIsEditingEmail(false);
    setUser({ ...user, email: emailInput });
    showNotification(`Updated email for ${user.fullName} to ${emailInput}`);
  };

  const handleSendSingleEmail = async (type: 'WELCOME' | 'OTP' | 'CUSTOM') => {
    setDispatchingEmail(true);
    showNotification(`Transmitting ${type} email via Gmail SMTP to ${emailInput}...`);
    try {
      const res = await adminUserService.sendDirectUserEmail(user.id, {
        type,
        updateEmail: emailInput,
      });
      showNotification(res.message || `Dispatched to ${emailInput}!`);
    } catch (err: any) {
      showNotification(err.message || 'Email delivery failed');
    } finally {
      setDispatchingEmail(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Toast */}
      {notification && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl animate-in slide-in-from-top-2">
          {notification}
        </div>
      )}

      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#17233b] pb-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Merchant & Household Directory</span>
        </Link>
        <span className="text-xs font-mono text-slate-500">Audit Desk: {user.id}</span>
      </div>

      {/* User Header Profile Card */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#00d49f]/10 border border-[#00d49f]/30 flex items-center justify-center font-black text-xl text-[#00d49f]">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user.fullName}</h1>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {user.id}
                </span>
                {user.persona === 'DUKANDAR' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Store className="h-3 w-3" /> Dukandar Commercial
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Home className="h-3 w-3" /> Household (Ghar Ka Hisab)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {user.businessOrHomeName} • {user.phoneNumber} • {user.city}, Pakistan
              </p>
              
              {/* Editable Email Field */}
              <div className="flex items-center gap-2 mt-2">
                <Mail className="h-3.5 w-3.5 text-[#00d49f]" />
                {isEditingEmail ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="rounded-lg border border-[#00d49f] bg-[#070d18] px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                    <button
                      onClick={handleSaveEmail}
                      className="p-1 rounded bg-[#00d49f] text-slate-950 hover:bg-[#00d49f]/90"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#00d49f]">{emailInput}</span>
                    <button
                      onClick={() => setIsEditingEmail(true)}
                      className="text-slate-400 hover:text-white"
                      title="Edit email address"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleFreeze}
              className={`rounded-xl border px-4 py-2 text-xs font-bold font-mono transition flex items-center gap-2 ${
                user.status === 'FROZEN'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              }`}
            >
              {user.status === 'FROZEN' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              <span>{user.status === 'FROZEN' ? 'Unfreeze Account' : 'Zero-Trust Freeze'}</span>
            </button>
            <button
              onClick={handleRevokeAllSessions}
              className="rounded-xl border border-rose-500/30 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold font-mono px-4 py-2 flex items-center gap-2 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Kill All Sessions</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#17233b] font-mono text-xs">
          <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-slate-400 text-[10px] uppercase block">Current Tier</span>
            <span className="text-sm font-bold text-[#00d49f]">{user.currentTier}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-slate-400 text-[10px] uppercase block">Liquid Balance</span>
            <span className="text-sm font-bold text-white">Rs. {user.currentVaultBalancePKR.toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-slate-400 text-[10px] uppercase block">Lifetime Volume</span>
            <span className="text-sm font-bold text-white">Rs. {user.totalRecordedVolumePKR.toLocaleString()}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-slate-400 text-[10px] uppercase block">Failed PIN Attempts</span>
            <span className={`text-sm font-bold ${user.failedPinAttempts > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {user.failedPinAttempts} / 5
            </span>
          </div>
        </div>
      </div>

      {/* Perimeter Geolocation & Counter Location Card */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#17233b] pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Live Geolocation & Perimeter Sentinel</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold">
                  {user.locationStatus === 'GPS_VERIFIED' ? 'GPS VERIFIED' : 'SAFE IP MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {user.persona === 'DUKANDAR'
                  ? 'Physical Store POS Geofence Anchor (500m Counter Perimeter)'
                  : 'Household Residential Ledger Anchor'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://www.google.com/maps?q=${user.latitude || 31.4504},${user.longitude || 73.1350}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[#00d49f]/40 bg-[#00d49f]/10 hover:bg-[#00d49f]/20 text-[#00d49f] px-3.5 py-2 text-xs font-mono font-bold transition flex items-center gap-2 shadow-lg shadow-[#00d49f]/10"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Open Google Maps</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Anchored Coordinates</span>
            <div className="text-sm font-bold text-white">
              {user.latitude || 31.4504}° N, {user.longitude || 73.1350}° E
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">Accuracy: ±12m (Lock)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Physical Location Address</span>
            <div className="text-xs font-bold text-slate-200 line-clamp-1" title={user.locationAddress || user.city}>
              {user.locationAddress || user.city}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Geofence: {user.geofenceRadiusMeters || 500}m Radius</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Last Active Network IP</span>
            <div className="text-xs font-bold text-[#00d49f] truncate">
              {user.lastKnownIp || '39.40.112.5 (Zong 4G)'}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Telco: Pakistan APN</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#070d18] border border-[#17233b]">
            <span className="text-[10px] text-slate-400 uppercase block mb-1">Perimeter In-Bounds</span>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#00d49f]" />
              <span>Terminal In-Bounds</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Safe Counter Active</span>
          </div>
        </div>
      </div>

      {/* Direct Email Communication Actions */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#00d49f]" />
            <h2 className="text-sm font-bold text-white">Direct Transactional Email Dispatcher</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Gmail Relay (Port 465)</span>
        </div>

        <p className="text-xs text-slate-300">
          Transmit official bilingual notices, automated onboarding guides, or 6-digit security OTPs directly to <strong>{emailInput}</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            disabled={dispatchingEmail}
            onClick={() => handleSendSingleEmail('WELCOME')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/30 hover:bg-[#00d49f]/20 text-[#00d49f] font-mono text-xs font-bold transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            <span>Send Onboarding Guide</span>
          </button>

          <button
            disabled={dispatchingEmail}
            onClick={() => handleSendSingleEmail('OTP')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-400 font-mono text-xs font-bold transition disabled:opacity-50"
          >
            <Key className="h-4 w-4" />
            <span>Send Security OTP</span>
          </button>

          <button
            disabled={dispatchingEmail}
            onClick={() => handleSendSingleEmail('CUSTOM')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 font-mono text-xs font-bold transition disabled:opacity-50"
          >
            <Mail className="h-4 w-4" />
            <span>Send SBP KYC Notice</span>
          </button>
        </div>
      </div>

      {/* Grid: Session Controller & SBP KYC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Session Controller */}
        <div className="lg:col-span-6 rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-[#00d49f]" />
              <h2 className="text-sm font-bold text-white">Active Device Sessions & JWT Controller</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">{sessions.length} Active Node(s)</span>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-slate-500">
                No active sessions. All devices must re-authenticate.
              </div>
            ) : (
              sessions.map((sess) => (
                <div
                  key={sess.sessionId}
                  className="rounded-xl border border-[#17233b] bg-[#070d18] p-3 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{sess.device}</span>
                      {sess.isCurrent && (
                        <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                          POS Counter Master
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      IP: {sess.ip} • Heartbeat: {sess.lastHeartbeat}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      JWT TTL: {sess.jwtExpiresIn}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevokeSession(sess.sessionId)}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] font-mono font-bold px-3 py-1.5 transition"
                  >
                    Revoke JWT
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SBP KYC & CNIC Verification Desk */}
        <div className="lg:col-span-6 rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#00d49f]" />
              <h2 className="text-sm font-bold text-white">SBP Regulatory KYC & CNIC Dossier</h2>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${user.isCnicVerified ? 'bg-emerald-500/20 text-[#00d49f]' : 'bg-amber-500/20 text-amber-300'}`}>
              {user.isCnicVerified ? 'Verified Merchant' : 'Verification Required'}
            </span>
          </div>

          {/* Simulated CNIC Card */}
          <div className="rounded-xl border border-[#17233b] bg-gradient-to-br from-[#0c182d] to-[#070d18] p-4 text-xs font-mono space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] uppercase text-[#00d49f] font-bold">Government of Pakistan - NADRA / SBP</span>
              <span className="text-[10px] text-slate-400">National ID Card</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px]">NAME:</span>
                <span className="text-white font-bold">{user.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">CNIC NO:</span>
                <span className="text-[#00d49f] font-bold">{user.cnicNumber || '33100-XXXXXXX-X'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">CITY / REGION:</span>
                <span className="text-slate-300">{user.city}, Pakistan</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px]">RAAST SETTLEMENT LIMIT:</span>
                <span className="text-emerald-400 font-bold">{user.isCnicVerified ? 'Rs. 2,000,000 / day' : 'Rs. 50,000 / day'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!user.isCnicVerified && (
              <button
                onClick={() => {
                  setUser({ ...user, isCnicVerified: true, status: 'ACTIVE' });
                  showNotification(`CNIC Approved! Raast and JazzCash limits expanded for ${user.id}.`);
                }}
                className="flex-1 rounded-xl bg-[#00d49f] text-slate-950 font-bold text-xs py-2 text-center"
              >
                Approve & Unlock Higher Limits
              </button>
            )}
            <button
              onClick={() => showNotification(`Audit report exported for SBP compliance logs.`)}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-mono py-2 text-center hover:bg-slate-700 transition"
            >
              Export KYC Audit Log (PDF)
            </button>
          </div>
        </div>

      </div>

      {/* Ledger Journal Entries Audit */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#00d49f]" />
            <h2 className="text-sm font-bold text-white">Ledger Mutations & Journal Vouchers (Immutable)</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Double-Entry Inspection</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070d18] text-slate-400 text-[10px] uppercase border-b border-[#17233b]">
              <tr>
                <th className="py-2.5 px-3">Voucher #</th>
                <th className="py-2.5 px-3">Transaction Description</th>
                <th className="py-2.5 px-3">Debit (PKR)</th>
                <th className="py-2.5 px-3">Credit (PKR)</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#17233b]/60">
              {INITIAL_JOURNAL_VOUCHERS.map((v) => (
                <tr key={v.id} className="hover:bg-[#121d33] transition">
                  <td className="py-2.5 px-3 font-bold text-white">{v.voucherNumber}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-sans">{v.description}</td>
                  <td className="py-2.5 px-3 text-emerald-400 font-bold">Rs. {v.totalDebitPKR.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-sky-400 font-bold">Rs. {v.totalCreditPKR.toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    {v.isBalanced ? (
                      <span className="text-[#00d49f]">✓ Balanced</span>
                    ) : (
                      <span className="text-rose-400 font-bold">⚠️ Discrepancy</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[10px]">{v.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step-Up Authentication Interceptor Modal */}
      <StepUpAuthModal
        isOpen={stepUpOpen}
        onClose={() => {
          setStepUpOpen(false);
          setPendingAction(null);
        }}
        onSuccess={(token) => {
          if (pendingAction) {
            pendingAction.execute(token);
            setPendingAction(null);
          }
        }}
        actionTitle={pendingAction?.title || 'Destructive Action'}
        actionDescription={pendingAction?.description || 'This action requires re-authentication.'}
        targetId={`${user.fullName} (${user.id})`}
      />

    </div>
  );
}
