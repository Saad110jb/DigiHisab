'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Smartphone,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Download,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Monitor,
  Laptop,
  Trash2,
  ShieldX,
  UserCheck,
  Server
} from 'lucide-react';
import { adminUserService } from '@/lib/admin-api';
import { getDeviceFingerprint, DeviceFingerprint } from '@/lib/device-fingerprint';

export default function SuperAdminSecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secretKey, setSecretKey] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [breakGlassInput, setBreakGlassInput] = useState<string>('');
  const [emergencyCodes, setEmergencyCodes] = useState<{ code: string; used: boolean }[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState<{ success: boolean; message: string; user?: string } | null>(null);
  const [checkingSmtp, setCheckingSmtp] = useState(false);

  // Geofencing & Concurrent Session State
  const [deviceFp, setDeviceFp] = useState<DeviceFingerprint | null>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [geofenceConfig, setGeofenceConfig] = useState<any>(null);
  const [terminatingSession, setTerminatingSession] = useState(false);
  const [locationPref, setLocationPref] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSecurityState = async () => {
    try {
      setLoading(true);
      const [setupRes, codesRes, sessionsRes, geoRes] = await Promise.all([
        adminUserService.get2faSetup(),
        adminUserService.getBreakGlassCodes(),
        adminUserService.getActiveSessions().catch(() => ({ success: false, data: { sessions: [] } })),
        adminUserService.getGeofenceConfig().catch(() => ({ success: false, data: null })),
      ]);

      if (setupRes.success) {
        setQrCodeUrl(setupRes.data.qrCodeDataUrl);
        setSecretKey(setupRes.data.secret);
      }
      if (codesRes.success) {
        setEmergencyCodes(codesRes.data.codes);
      }
      if (sessionsRes.success && sessionsRes.data) {
        setActiveSessions(sessionsRes.data.sessions);
      }
      if (geoRes.success && geoRes.data) {
        setGeofenceConfig(geoRes.data);
      }

      if (typeof window !== 'undefined') {
        setDeviceFp(getDeviceFingerprint());
        const savedGeo = localStorage.getItem('digihisab_geo_pref');
        if (savedGeo) {
          try {
            setLocationPref(JSON.parse(savedGeo));
          } catch (e) {}
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch security state', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      setTerminatingSession(true);
      const res = await adminUserService.terminateSession(sessionId);
      setActiveSessions(activeSessions.filter((s) => s.sessionId !== sessionId));
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to terminate session', 'error');
    } finally {
      setTerminatingSession(false);
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    try {
      setTerminatingSession(true);
      const res = await adminUserService.terminateAllOtherSessions();
      setActiveSessions(activeSessions.filter((s) => s.isCurrent));
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to terminate remote sessions', 'error');
    } finally {
      setTerminatingSession(false);
    }
  };

  const handleTogglePakistanStrict = async () => {
    if (!geofenceConfig) return;
    const updated = { ...geofenceConfig, pakistanGeofenceStrict: !geofenceConfig.pakistanGeofenceStrict };
    setGeofenceConfig(updated);
    try {
      await adminUserService.updateGeofenceConfig(updated);
      showToast(
        updated.pakistanGeofenceStrict
          ? '🛡️ Pakistan Strict Geofencing ENFORCED'
          : '⚠️ Pakistan Geofencing set to permissive mode',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update geofence', 'error');
    }
  };

  const handleTestSmtp = async () => {
    setCheckingSmtp(true);
    try {
      const res = await adminUserService.testSmtpConnection();
      setSmtpStatus({ success: res.success, message: res.message, user: res.user });
      showToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      setSmtpStatus({ success: false, message: err.message || 'SMTP failed' });
      showToast('SMTP Test Failed', 'error');
    } finally {
      setCheckingSmtp(false);
    }
  };

  useEffect(() => {
    loadSecurityState();
    handleTestSmtp();
  }, []);

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return;
    try {
      const res = await adminUserService.verify2faToken(verificationCode, 'TOTP');
      showToast(res.message, 'success');
      setVerificationCode('');
      setShowQrModal(false);
    } catch (err: any) {
      showToast(err.message || 'Invalid 6-digit code', 'error');
    }
  };

  const handleVerifyBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakGlassInput) return;
    try {
      const res = await adminUserService.verify2faToken(breakGlassInput, 'BREAK_GLASS');
      showToast(res.message, 'success');
      setBreakGlassInput('');
      const codesRes = await adminUserService.getBreakGlassCodes();
      if (codesRes.success) setEmergencyCodes(codesRes.data.codes);
    } catch (err: any) {
      showToast(err.message || 'Invalid or used emergency code', 'error');
    }
  };

  const handleRegenerateBreakGlass = async () => {
    if (!confirm('Are you sure? This will invalidate all previous emergency codes.')) return;
    try {
      const res = await adminUserService.regenerateBreakGlassCodes();
      setEmergencyCodes(res.data.codes);
      showToast('10 New emergency codes generated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to regenerate codes', 'error');
    }
  };

  const handleCopyCodes = () => {
    const text = emergencyCodes.map((c) => `${c.code} ${c.used ? '(USED)' : ''}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast('Emergency codes copied to clipboard!', 'success');
  };

  const handleDownloadCodes = () => {
    const text = `DIGIHISAB SUPERADMIN EMERGENCY BREAK-GLASS CODES\nGenerated: ${new Date().toISOString()}\n\n` +
      emergencyCodes.map((c, i) => `${i + 1}. ${c.code} ${c.used ? '[USED]' : '[AVAILABLE]'}`).join('\n') +
      `\n\nSecurity Notice: Store this offline in a secure vault.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digihisab-break-glass-codes-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    showToast('Download started!', 'success');
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {notification && (
        <div
          className={`fixed top-16 right-6 z-50 rounded-xl px-4 py-3 text-xs font-mono shadow-2xl border transition-all animate-in slide-in-from-top-2 ${
            notification.type === 'error'
              ? 'bg-rose-950/90 border-rose-500 text-rose-300'
              : 'bg-slate-900/95 border-[#00d49f] text-[#00d49f]'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
            <Link href="/admin/security" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Forensic Security
            </Link>
            <span>/</span>
            <span className="text-[#00d49f]">Zero-Trust 2FA & Auth</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>SuperAdmin 2FA & Dispatcher Configuration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Hardware WebAuthn Passkeys, Time-based OTP (Google Authenticator), Emergency Break-Glass Codes, and SMTP Gateway
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-emerald-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>2FA STATUS: ENFORCED</span>
          </div>
        </div>
      </div>

      {/* Grid: 2FA TOTP Card vs Break-Glass Codes Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: TOTP Setup & Passkey Status */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* TOTP Authenticator Card */}
          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-5 w-5 text-[#00d49f]" />
                <h2 className="text-sm font-bold text-white">Time-based One-Time Password (TOTP)</h2>
              </div>
              <span className="text-[10px] font-mono bg-[#00d49f]/10 text-[#00d49f] px-2 py-0.5 rounded border border-[#00d49f]/20">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Protects root administrative actions using RFC 6238 TOTP compatible with <strong>Google Authenticator</strong>, <strong>Authy</strong>, and <strong>1Password</strong>.
            </p>

            <div className="p-4 rounded-xl bg-[#070d18] border border-[#17233b] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Authenticator Secret Key:</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{secretKey || 'JBSWY3DPEHPK3PXP'}</div>
                </div>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="rounded-lg bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-mono font-bold text-xs px-3 py-1.5 transition"
                >
                  View QR Code
                </button>
              </div>

              {/* Form to test/elevate TOTP */}
              <form onSubmit={handleVerifyTotp} className="pt-2 border-t border-[#17233b] flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code..."
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="flex-1 rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2 text-xs text-white font-mono tracking-widest text-center focus:outline-none focus:border-[#00d49f]"
                />
                <button
                  type="submit"
                  className="rounded-xl border border-[#00d49f]/30 bg-[#00d49f]/10 hover:bg-[#00d49f]/20 text-[#00d49f] font-mono text-xs px-4 py-2 font-bold transition"
                >
                  Test Validate
                </button>
              </form>
            </div>
          </div>

          {/* WebAuthn / FIDO2 Passkey Card */}
          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <div className="flex items-center gap-2.5">
                <Key className="h-5 w-5 text-sky-400" />
                <h2 className="text-sm font-bold text-white">FIDO2 / WebAuthn Hardware Passkeys</h2>
              </div>
              <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">
                ENABLED
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Hardware-bound physical keys (YubiKey 5 Series) and biometrics (Windows Hello / Apple Touch ID) provide phishing-resistant authentication.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Admin Laptop (Windows Hello Biometrics)</div>
                  <div className="text-[10px] text-slate-500">Registered: 2026-11-04 • Last used: Today</div>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">Verified</span>
              </div>
              <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-between">
                <div>
                  <div className="text-white font-bold">Backup YubiKey 5 NFC (Hardware Token)</div>
                  <div className="text-[10px] text-slate-500">Registered: 2026-10-15 • USB-C / NFC</div>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">Verified</span>
              </div>
            </div>
          </div>

          {/* SMTP Email Health Card */}
          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <div className="flex items-center gap-2.5">
                <Mail className="h-5 w-5 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Google Workspace / Gmail SMTP Relay</h2>
              </div>
              <button
                onClick={handleTestSmtp}
                disabled={checkingSmtp}
                className="text-[10px] font-mono text-[#00d49f] hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${checkingSmtp ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b] space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">SMTP Host:</span>
                <span className="text-white font-bold">smtp.gmail.com:465 (SSL)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Authenticated Sender:</span>
                <span className="text-[#00d49f] font-bold">hisabdigi@gmail.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Relay Health:</span>
                <span className={smtpStatus?.success ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {smtpStatus ? smtpStatus.message : 'Checking SMTP...'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Emergency Break-Glass Codes */}
        <div className="lg:col-span-6 rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Emergency Break-Glass Recovery Codes</h2>
                <p className="text-[10px] text-slate-400">Single-use bypass tokens if 2FA device is lost</p>
              </div>
            </div>
            <span className="text-[10px] font-mono bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">
              {emergencyCodes.filter((c) => !c.used).length} of 10 Remaining
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Each emergency code can be used <strong>exactly once</strong> to bypass the TOTP prompt. Keep a downloaded printed copy in a locked office safe.
          </p>

          {/* Code Grid */}
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            {emergencyCodes.map((item, idx) => (
              <div
                key={item.code}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${
                  item.used
                    ? 'border-slate-800 bg-slate-900/40 text-slate-600 line-through'
                    : 'border-[#17233b] bg-[#070d18] text-white font-bold'
                }`}
              >
                <span>{idx + 1}. {item.code}</span>
                <span className="text-[9px] uppercase px-1 rounded">
                  {item.used ? 'USED' : 'VALID'}
                </span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={handleCopyCodes}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 text-xs font-mono transition"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy All</span>
            </button>
            <button
              onClick={handleDownloadCodes}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 text-xs font-mono transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download TXT</span>
            </button>
            <button
              onClick={handleRegenerateBreakGlass}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 p-2.5 text-xs font-mono font-bold transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Regenerate</span>
            </button>
          </div>

          {/* Test Break-glass form */}
          <div className="pt-4 border-t border-[#17233b] space-y-2">
            <div className="text-xs font-bold text-slate-300 font-mono">Test Break-Glass Code Validation:</div>
            <form onSubmit={handleVerifyBreakGlass} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. DH-88A1-49FC"
                value={breakGlassInput}
                onChange={(e) => setBreakGlassInput(e.target.value)}
                className="flex-1 rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-mono text-xs px-4 py-2 font-bold transition"
              >
                Consume Code
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* SECOND SECTION: Device Fingerprinting & Concurrent Session Limits */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Device Fingerprinting & Concurrent Session Sentinel</span>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-full border border-sky-400/20">
                  Strict 1 Active Session
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Inspects canvas hash, WebGL renderer, and screen resolution. When a new SuperAdmin session begins, prior sessions are immediately terminated.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={terminatingSession || activeSessions.length <= 1}
            onClick={handleTerminateAllOtherSessions}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-mono text-xs px-4 py-2.5 font-bold transition flex items-center gap-2 shadow-lg shadow-rose-500/20"
          >
            <ShieldX className="h-4 w-4" />
            <span>Terminate All Other Sessions</span>
          </button>
        </div>

        {/* Current Machine Fingerprint Dossier */}
        {deviceFp && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-[#17233b] bg-[#070d18] text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Device Fingerprint ID</span>
              <span className="text-[#00d49f] font-bold">{deviceFp.fingerprintId}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Canvas 2D Hash</span>
              <span className="text-slate-200">{deviceFp.canvasHash}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Display Dimensions</span>
              <span className="text-slate-200">{deviceFp.screenResolution}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">GPU Renderer</span>
              <span className="text-slate-200 truncate block" title={deviceFp.webGlRenderer}>
                {deviceFp.webGlRenderer.substring(0, 24)}...
              </span>
            </div>
          </div>
        )}

        {/* Active Sessions List */}
        <div className="space-y-2.5">
          <div className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center justify-between">
            <span>Active SuperAdmin Sessions ({activeSessions.length})</span>
            <span className="text-[11px] text-emerald-400">Policy: Auto-kill displaced logins</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {activeSessions.map((s) => (
              <div
                key={s.sessionId}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  s.isCurrent
                    ? 'border-[#00d49f]/40 bg-[#00d49f]/5'
                    : 'border-[#17233b] bg-[#070d18]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${s.isCurrent ? 'bg-[#00d49f]/10 text-[#00d49f]' : 'bg-slate-800 text-slate-400'}`}>
                    <Laptop className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{s.device}</span>
                      {s.isCurrent ? (
                        <span className="text-[9px] bg-[#00d49f]/20 text-[#00d49f] px-2 py-0.5 rounded font-bold">
                          THIS DEVICE (CURRENT)
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                          REMOTE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      IP: <span className="text-slate-300">{s.ip}</span> • Fingerprint: <span className="text-slate-300">{s.deviceFingerprint}</span> • {s.lastSeen}
                    </div>
                  </div>
                </div>

                {!s.isCurrent && (
                  <button
                    onClick={() => handleTerminateSession(s.sessionId)}
                    className="self-end sm:self-center px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-[11px] transition flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Revoke</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* THIRD SECTION: Geofencing & IP Allowlisting */}
      <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Perimeter Geofencing & IP Allowlisting</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  geofenceConfig?.pakistanGeofenceStrict
                    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                    : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                }`}>
                  {geofenceConfig?.pakistanGeofenceStrict ? 'PAKISTAN LOCK: ENFORCED' : 'PERMISSIVE MODE'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Restricts login to designated corporate office IPs/VPNs and auto-rejects non-Pakistan logins (except for verified diaspora nodes).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTogglePakistanStrict}
            className={`rounded-xl px-4 py-2 font-mono text-xs font-bold transition flex items-center gap-2 border ${
              geofenceConfig?.pakistanGeofenceStrict
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                : 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>{geofenceConfig?.pakistanGeofenceStrict ? 'Country Lock: Active' : 'Enable Country Lock'}</span>
          </button>
        </div>

        {/* Current Location Status Card */}
        <div className="p-4 rounded-xl border border-[#17233b] bg-[#070d18] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <div className="text-white font-bold">
                Client Browser Location Status:{' '}
                <span className={locationPref?.status === 'GRANTED' ? 'text-[#00d49f]' : 'text-amber-400'}>
                  {locationPref?.status === 'GRANTED' ? 'GPS VERIFIED (PAKISTAN)' : 'SAFE NETWORK IP FALLBACK'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                {locationPref?.status === 'GRANTED'
                  ? `Lat: ${locationPref.latitude?.toFixed(4)}, Lng: ${locationPref.longitude?.toFixed(4)} (Accuracy: ${Math.round(locationPref.accuracyMeters || 10)}m)`
                  : 'Operating under Corporate IP Sentinel. Safe Counter & Admin access active without lockout.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('digihisab_geo_pref');
                window.location.reload();
              }
            }}
            className="px-3 py-1.5 rounded-lg border border-[#17233b] hover:bg-slate-800 text-slate-300 text-xs transition"
          >
            Reset Location Prompt
          </button>
        </div>

        {/* IP Tables: Corporate Office vs Diaspora Developers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Corporate VPNs */}
          <div className="p-4 rounded-xl border border-[#17233b] bg-[#070d18] space-y-3">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-2 text-slate-300 font-bold">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-[#00d49f]" />
                <span>Corporate Office IPs / VPN</span>
              </div>
              <span className="text-[10px] text-slate-500">3 Subnets</span>
            </div>
            <div className="space-y-2">
              {[
                { ip: '119.160.67.21', label: 'Nayatel Static Fiber (Office Headquarter)', tag: 'PRIMARY' },
                { ip: '39.40.112.5', label: 'Zong 4G Corporate APN (Backup Line)', tag: 'BACKUP' },
                { ip: '127.0.0.1', label: 'Local Development Cluster', tag: 'DEV' },
              ].map((ipItem) => (
                <div key={ipItem.ip} className="flex items-center justify-between p-2 rounded-lg bg-[#0d1627] border border-[#17233b]">
                  <div>
                    <span className="text-[#00d49f] font-bold block">{ipItem.ip}</span>
                    <span className="text-[10px] text-slate-400 font-sans">{ipItem.label}</span>
                  </div>
                  <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                    {ipItem.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Diaspora Dev Whitelist */}
          <div className="p-4 rounded-xl border border-[#17233b] bg-[#0d1627] space-y-3">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-2 text-slate-300 font-bold">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-400" />
                <span>Diaspora Developer Whitelist</span>
              </div>
              <span className="text-[10px] text-slate-500">Exempt from Geo-lock</span>
            </div>
            <div className="space-y-2">
              {[
                { ip: '86.96.1.1', country: '🇦🇪 UAE', label: 'Dubai Lead Cloud Gateway' },
                { ip: '212.118.142.1', country: '🇸🇦 KSA', label: 'Riyadh Infrastructure Node' },
                { ip: '185.86.151.1', country: '🇬🇧 UK', label: 'London DevOps Mirror' },
              ].map((diaspora) => (
                <div key={diaspora.ip} className="flex items-center justify-between p-2 rounded-lg bg-[#070d18] border border-[#17233b]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{diaspora.ip}</span>
                      <span className="text-[10px] text-sky-400">{diaspora.country}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans">{diaspora.label}</span>
                  </div>
                  <span className="text-[9px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded font-bold">
                    AUTHORIZED
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 max-w-sm w-full space-y-4 text-center animate-in zoom-in-95">
            <h3 className="text-base font-bold text-white">Scan Google Authenticator QR</h3>
            <p className="text-xs text-slate-400">
              Open Google Authenticator or Authy, choose &ldquo;Scan a QR code&rdquo;, and scan the image below:
            </p>

            {qrCodeUrl ? (
              <div className="p-3 bg-white rounded-xl inline-block mx-auto border-4 border-[#00d49f]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 mx-auto" />
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs font-mono text-slate-500">
                Generating QR...
              </div>
            )}

            <div className="text-[11px] font-mono text-slate-400 bg-[#070d18] p-2 rounded-lg border border-[#17233b]">
              Manual Key: <span className="text-[#00d49f] font-bold">{secretKey}</span>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs py-2.5 transition"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
