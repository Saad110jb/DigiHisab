'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Server,
  Terminal,
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Fingerprint,
  Globe,
  Radio,
  LockKeyhole,
} from 'lucide-react';

function SuperAdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/admin';

  // Step state: 1 = Credentials, 2 = TOTP Challenge
  const [step, setStep] = useState<1 | 2>(1);

  // Form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [totpDigits, setTotpDigits] = useState<string[]>(['', '', '', '', '', '']);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // Verified admin node metadata returned after Step 1
  const [verifiedAdmin, setVerifiedAdmin] = useState<{
    adminId: string;
    nodeLabel: string;
  } | null>(null);

  // Security telemetry state
  const [clientIp, setClientIp] = useState('39.40.112.5');
  const [telemetryVerified, setTelemetryVerified] = useState(false);
  const [deviceEntropyHash, setDeviceEntropyHash] = useState('DFP-7FA1-90E2');

  // References for TOTP input boxes
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Initial Telemetry & Pre-flight check
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/v1/admin/auth/login');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            if (json.data.clientIp) setClientIp(json.data.clientIp);
            if (json.data.rateLimit?.isLocked) {
              setIsLockedOut(true);
              setLockoutTimer(json.data.rateLimit.lockoutRemainingSeconds);
            }
            if (json.data.rateLimit?.remainingAttempts !== undefined) {
              setRemainingAttempts(json.data.rateLimit.remainingAttempts);
            }
            if (json.data.sessionActive) {
              // User already authenticated: redirect to dashboard
              router.push(redirectTarget);
              return;
            }
          }
        }
      } catch (e) {
        // Fallback telemetry
      } finally {
        setTelemetryVerified(true);
      }
    };

    fetchTelemetry();

    // Compute synthetic canvas/entropy hash for forensic telemetry
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('DigiHisab-Zero-Trust-Sentinel', 2, 2);
        const dataUrl = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < dataUrl.length; i++) {
          hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
          hash |= 0;
        }
        setDeviceEntropyHash(`DFP-${Math.abs(hash).toString(16).toUpperCase().slice(0, 8)}`);
      }
    } catch (e) {}
  }, [router, redirectTarget]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimer <= 0) {
      if (isLockedOut) {
        setIsLockedOut(false);
        setErrorMsg(null);
        setRemainingAttempts(3);
      }
      return;
    }

    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLockedOut(false);
          setErrorMsg(null);
          setRemainingAttempts(3);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutTimer, isLockedOut]);

  // Handle Step 1: Credential Verification
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('System handle and security passkey are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          clientFingerprint: deviceEntropyHash,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'RATE_LIMIT_LOCKED') {
          setIsLockedOut(true);
          setLockoutTimer(data.lockoutRemainingSeconds || 900);
          setErrorMsg(data.message);
        } else {
          setErrorMsg(data.message || 'Authentication rejected by Zero-Trust gateway.');
          if (data.remainingAttempts !== undefined) {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
        return;
      }

      // If Step 1 requires TOTP 2FA challenge
      if (data.require2FA) {
        setVerifiedAdmin({
          adminId: data.adminId,
          nodeLabel: data.nodeLabel,
        });
        setStep(2);
        // Auto-focus first OTP digit after transition
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
        return;
      }

      // No 2FA required (unlikely in strict mode): Session established
      router.push(redirectTarget);
    } catch (err: any) {
      setErrorMsg('Network error connecting to Zero-Trust gateway. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: 6-Digit TOTP Submission
  const handleTotpSubmit = async (e?: React.FormEvent, tokenOverride?: string) => {
    if (e) e.preventDefault();
    const token = tokenOverride || totpDigits.join('');
    if (token.length !== 6) {
      setErrorMsg('Please enter the full 6-digit authenticator code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          totpToken: token,
          clientFingerprint: deviceEntropyHash,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'RATE_LIMIT_LOCKED') {
          setIsLockedOut(true);
          setLockoutTimer(data.lockoutRemainingSeconds || 900);
          setErrorMsg(data.message);
        } else {
          setErrorMsg(data.message || 'Invalid 6-digit TOTP token.');
          if (data.remainingAttempts !== undefined) {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
        // Clear OTP inputs on failure
        setTotpDigits(['', '', '', '', '', '']);
        otpInputsRef.current[0]?.focus();
        return;
      }

      // Success: Route to dashboard
      router.push(redirectTarget);
    } catch (err: any) {
      setErrorMsg('Failed to verify TOTP with Zero-Trust node.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP digit box input
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    let nextDigits: string[] = [];
    setTotpDigits((prev) => {
      const newDigits = [...prev];
      newDigits[index] = clean;
      nextDigits = newDigits;
      return newDigits;
    });

    // Auto-advance to next box if character entered
    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-submit if 6th digit entered
    if (clean && index === 5) {
      setTimeout(() => {
        if (nextDigits.length === 6 && nextDigits.every((d) => d !== '')) {
          handleTotpSubmit(undefined, nextDigits.join(''));
        }
      }, 80);
    }
  };

  // Handle Backspace navigation in OTP
  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !totpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle clipboard paste of full 6-digit OTP
  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setTotpDigits(newDigits);

    const focusIdx = Math.min(pasted.length, 5);
    otpInputsRef.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      setTimeout(() => handleTotpSubmit(undefined, pasted), 50);
    }
  };

  // Quick preset loader for authorized developer/sentinel nodes
  const applyPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#00d49f]/30 selection:text-[#00d49f] relative overflow-hidden">
      {/* Background Ambience: Subtle Geometric Grid & Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,212,159,0.08),rgba(255,255,255,0))] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#00d49f 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Top Zero-Trust Header */}
      <header className="w-full border-b border-[#17233b]/80 bg-[#070d18]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          {/* DigiHisab Infinity Emblem */}
          <div className="w-9 h-9 rounded-lg bg-[#0d1627] border border-[#17233b] flex items-center justify-center shadow-inner relative group">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#00d49f] animate-pulse" />
            <div className="w-1.5 h-1.5 bg-[#00d49f] rounded-full absolute" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-widest text-slate-100">
                DIGIHISAB
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00d49f]/10 text-[#00d49f] border border-[#00d49f]/30 font-semibold tracking-wider">
                CORE
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider">
              ENTERPRISE AUDIT & SENTINEL DESK
            </p>
          </div>
        </div>

        {/* Live System Sentinel Status */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0d1627] border border-[#17233b] text-slate-300">
            <Radio className="w-3 h-3 text-[#00d49f] animate-ping" />
            <span className="text-[11px]">GATEWAY: ONLINE (PK-KHI-01)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-[#00d49f]" />
            <span className="text-[11px] font-mono text-slate-300">ZERO-TRUST</span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-[440px]">
          {/* Vault Card Container */}
          <div className="bg-[#0d1627] border border-[#17233b] rounded-2xl shadow-2xl shadow-black/80 p-7 sm:p-8 relative">
            {/* Corner Circuit Accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#00d49f]/60 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#00d49f]/60 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00d49f]/60 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00d49f]/60 rounded-br-2xl" />

            {/* Header Badge & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#070d18] border border-[#17233b] mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00d49f]" />
                <span className="text-[10px] font-mono tracking-widest text-[#00d49f] font-semibold">
                  ROOT CONSOLE ACCESS • ZERO-TRUST GATEWAY
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-100">
                SuperAdmin Authorization
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-sans">
                {step === 1
                  ? 'Verify cryptographic credentials to access mission control.'
                  : `Enter 6-digit TOTP token for node [${verifiedAdmin?.nodeLabel || 'SA_01'}].`}
              </p>
            </div>

            {/* Lockout Warning Banner */}
            {isLockedOut && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-3 text-red-300">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-semibold text-red-200">IP ADDRESS TEMPORARILY LOCKED</div>
                  <p className="mt-0.5 text-red-300/90 leading-relaxed">
                    Excessive failed attempts detected. Sentinel lockout active for{' '}
                    <span className="font-mono font-bold text-red-100">
                      {Math.floor(lockoutTimer / 60)}m {lockoutTimer % 60}s
                    </span>
                    .
                  </p>
                </div>
              </div>
            )}

            {/* General Error Banner */}
            {errorMsg && !isLockedOut && (
              <div className="mb-5 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-amber-300 text-xs animate-shake">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMsg}</span>
                  {remainingAttempts !== null && remainingAttempts < 3 && remainingAttempts > 0 && (
                    <div className="mt-1 font-mono text-[11px] text-amber-200">
                      ⚠️ Caution: {remainingAttempts} attempt{remainingAttempts === 1 ? '' : 's'}{' '}
                      remaining before 15-min IP lockdown.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: CREDENTIAL ENTRY */}
            {step === 1 && (
              <form onSubmit={handleCredentialSubmit} className="space-y-4">
                {/* System Handle / Email */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    SYSTEM EMAIL / NODE HANDLE
                  </label>
                  <div className="relative">
                    <Server className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoComplete="username"
                      disabled={loading || isLockedOut}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin.root@digihisab.pk"
                      className="w-full bg-[#070d18] border border-[#17233b] focus:border-[#00d49f] focus:ring-1 focus:ring-[#00d49f] rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 font-mono outline-none transition disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password / Passkey */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono text-slate-300">
                      SECURITY PASSKEY
                    </label>
                    <span className="text-[10px] font-mono text-slate-500">AES-256</span>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      disabled={loading || isLockedOut}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full bg-[#070d18] border border-[#17233b] focus:border-[#00d49f] focus:ring-1 focus:ring-[#00d49f] rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 font-mono outline-none transition disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || isLockedOut}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 bg-[#00d49f] hover:bg-[#00b98a] text-slate-950 shadow-lg shadow-[#00d49f]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Validating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Identity & Proceed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Pre-seeded Sentinel Node Fast-Fill (for authorized admins) */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-[#17233b]" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      Authorized Test Handles
                    </span>
                    <div className="flex-1 h-px bg-[#17233b]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => applyPreset('admin.root@digihisab.pk', 'Root@Sentinel#2026')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#070d18] border border-[#17233b] hover:border-[#00d49f]/50 hover:bg-[#00d49f]/5 text-left text-slate-400 hover:text-slate-200 transition"
                    >
                      <div className="text-[#00d49f] font-semibold text-[10px]">Node SA_01</div>
                      <div className="truncate text-slate-400">admin.root@...</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('admin.node01@digihisab.pk', 'dGh$92!kM99#xP04')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#070d18] border border-[#17233b] hover:border-[#00d49f]/50 hover:bg-[#00d49f]/5 text-left text-slate-400 hover:text-slate-200 transition"
                    >
                      <div className="text-sky-400 font-semibold text-[10px]">Node ADM-101</div>
                      <div className="truncate text-slate-400">admin.node01@...</div>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: TOTP 2FA CHALLENGE */}
            {step === 2 && (
              <form onSubmit={handleTotpSubmit} className="space-y-5 animate-fadeIn">
                {/* Node Identity Chip */}
                <div className="p-3 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#00d49f]/10 border border-[#00d49f]/30 flex items-center justify-center text-[#00d49f]">
                      <Fingerprint className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-semibold text-slate-200">
                        {verifiedAdmin?.nodeLabel || 'Root SuperAdmin'}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        ID: {verifiedAdmin?.adminId || 'SA_01'} • 2FA Enforced
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setTotpDigits(['', '', '', '', '', '']);
                      setErrorMsg(null);
                    }}
                    className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                {/* 6-Digit OTP Boxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-mono text-slate-300">
                      AUTHENTICATOR TOKEN (6 DIGITS)
                    </label>
                    <span className="text-[10px] font-mono text-[#00d49f]">Google / MS Auth</span>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {totpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={loading || isLockedOut}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        onPaste={handleDigitPaste}
                        className="w-full h-12 text-center text-lg font-mono font-bold bg-[#070d18] border border-[#17233b] focus:border-[#00d49f] focus:ring-2 focus:ring-[#00d49f]/30 rounded-xl text-slate-100 outline-none transition disabled:opacity-50"
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 mt-2 text-center">
                    Auto-submits upon entering 6 digits. (Demo bypass code: <span className="text-slate-400 font-semibold">123456</span>)
                  </p>
                </div>

                {/* Authorize Button */}
                <button
                  type="submit"
                  disabled={loading || isLockedOut || totpDigits.join('').length !== 6}
                  className="w-full py-3 px-4 rounded-xl font-mono text-xs font-bold tracking-wider uppercase transition flex items-center justify-center gap-2 bg-[#00d49f] hover:bg-[#00b98a] text-slate-950 shadow-lg shadow-[#00d49f]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing Session...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorize Root Console</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Security Telemetry Footer */}
      <footer className="w-full border-t border-[#17233b]/80 bg-[#070d18]/90 backdrop-blur-md px-6 py-3.5 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          {/* Rate-Limit Security Policy Warning */}
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">
              SECURITY POLICY: 3 failed attempts trigger a 15-minute IP lockout.
            </span>
          </div>

          {/* Client Telemetry Badges */}
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-[#00d49f]" />
              <span>IP: {clientIp}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fingerprint className="w-3 h-3 text-sky-400" />
              <span>FINGERPRINT: {deviceEntropyHash}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <Terminal className="w-3 h-3" />
              <span>SESSION: HTTPONLY • STRICT</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070d18] flex items-center justify-center font-mono text-xs text-[#00d49f]">
          INITIALIZING ZERO-TRUST VAULT GATEWAY...
        </div>
      }
    >
      <SuperAdminLoginContent />
    </Suspense>
  );
}
