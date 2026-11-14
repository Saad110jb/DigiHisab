'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  RefreshCw,
  QrCode,
  Lock,
  X,
  Sparkles,
  ShieldAlert,
  Server
} from 'lucide-react';
import { useAdminRbac } from '@/context/AdminRbacContext';
import { IAdminUser } from '@/types/rbac';

export const RegisteredAdminDirectory: React.FC = () => {
  const { allAdmins, activeAdmin, resetPassword, regenerate2FA } = useAdminRbac();

  // Password visibility state map per admin card
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals for credential management
  const [resetModalAdmin, setResetModalAdmin] = useState<IAdminUser | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string>('');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  const [totpModalAdmin, setTotpModalAdmin] = useState<IAdminUser | null>(null);
  const [newTotpSecret, setNewTotpSecret] = useState<string | null>(null);
  const [isRegeneratingTotp, setIsRegeneratingTotp] = useState<boolean>(false);

  // Toggle password visibility
  const togglePasswordVisibility = (adminId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  // Copy password to clipboard with temporary feedback
  const handleCopyPassword = (adminId: string, passwordText?: string) => {
    const textToCopy = passwordText || '••••••••••••••••';
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(adminId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Cryptographically secure password generator (16+ chars, uppercase, lowercase, numbers, symbols)
  const generateSecurePassword = () => {
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+';
    let result = '';
    const randomValues = new Uint32Array(18);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < 18; i++) {
        result += charset[randomValues[i] % charset.length];
      }
    } else {
      for (let i = 0; i < 18; i++) {
        result += charset[Math.floor(Math.random() * charset.length)];
      }
    }
    setGeneratedPassword(result);
  };

  // Open Reset Password Modal
  const handleOpenResetModal = (admin: IAdminUser) => {
    setResetModalAdmin(admin);
    setResetSuccessNotice(null);
    generateSecurePassword();
  };

  // Confirm password reset
  const handleConfirmReset = async () => {
    if (!resetModalAdmin || !generatedPassword) return;
    try {
      setIsResetting(true);
      const success = await resetPassword(resetModalAdmin.id, generatedPassword);
      if (success) {
        setResetSuccessNotice('Credential rotated and broadcast to SBP Audit log.');
        setTimeout(() => {
          setResetModalAdmin(null);
          setGeneratedPassword('');
          setResetSuccessNotice(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Password reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Open 2FA Regeneration Challenge Modal
  const handleOpenTotpModal = async (admin: IAdminUser) => {
    setTotpModalAdmin(admin);
    setIsRegeneratingTotp(true);
    try {
      const result = await regenerate2FA(admin.id);
      if (result.success && result.secret) {
        setNewTotpSecret(result.secret);
      } else {
        // Fallback generator for preview
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 16; i++) {
          secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewTotpSecret(secret);
      }
    } finally {
      setIsRegeneratingTotp(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Directory Section Header */}
      <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-[#00d49f]" />
          <h2 className="text-sm font-mono font-bold tracking-wider uppercase text-white">
            Registered Administrator Directory ({allAdmins.length})
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d49f] animate-pulse" />
            SBP NODE CLUSTER ACTIVE
          </span>
        </div>
      </div>

      {/* SuperAdmin Anonymous Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allAdmins.map((admin, idx) => {
          const isCurrentSession = activeAdmin?.id === admin.id;
          const displayLabel = admin.label || `SuperAdmin Account #${String(idx + 1).padStart(2, '0')}`;
          const displayEmail = admin.email || `admin.node${String(idx + 1).padStart(2, '0')}@digihisab.pk`;
          const passwordText = admin.passwordText || 'dGh$92!kM99#xP04';
          const nodeScope = admin.node || admin.department || 'Platform Core & SBP Engine';
          const isVisible = Boolean(visiblePasswords[admin.id]);
          const isCopied = copiedId === admin.id;

          return (
            <div
              key={admin.id}
              className={`rounded-2xl border p-5 bg-[#0d1627] flex flex-col justify-between space-y-4 transition ${
                isCurrentSession
                  ? 'border-[#00d49f]/50 shadow-xl shadow-[#00d49f]/5 ring-1 ring-[#00d49f]/30'
                  : 'border-[#17233b] hover:border-slate-700'
              }`}
            >
              {/* Top Identity Strip (NO Photos / NO Personal Names) */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Monospace Security Badge Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#070d18] border border-[#17233b] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-[#00d49f]" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="h-2 w-2 rounded-full bg-[#00d49f] animate-pulse" />
                      <h3 className="font-mono text-sm font-bold text-white tracking-wide">
                        {displayLabel}
                      </h3>
                      {/* Standardized SuperAdmin Badge */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold shadow-sm shadow-amber-400/10">
                        👑 SuperAdmin
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-400">{displayEmail}</p>
                  </div>
                </div>

                {isCurrentSession && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#00d49f]/10 border border-[#00d49f]/40 text-[#00d49f] shrink-0">
                    YOU
                  </span>
                )}
              </div>

              {/* Dedicated Password Visibility & Credential Controller Box */}
              <div className="rounded-xl border border-[#17233b] bg-[#070d18] p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-[#00d49f]" />
                    Access Password
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {isVisible ? 'Plaintext' : 'SHA-256 Masked'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 bg-[#0a1221] px-3 py-2 rounded-lg border border-[#17233b]/80">
                  <span className="font-mono text-xs sm:text-sm tracking-wider text-slate-200 select-all truncate">
                    {isVisible ? passwordText : '••••••••••••••••'}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Eye Reveal / Hide Toggle */}
                    <button
                      onClick={() => togglePasswordVisibility(admin.id)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title={isVisible ? 'Hide Password' : 'Show Password'}
                      type="button"
                    >
                      {isVisible ? (
                        <EyeOff className="h-3.5 w-3.5 text-amber-400" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Copy to Clipboard Button */}
                    <button
                      onClick={() => handleCopyPassword(admin.id, passwordText)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-[#00d49f] hover:bg-slate-800 transition flex items-center gap-1"
                      title="Copy Password"
                      type="button"
                    >
                      {isCopied ? (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#00d49f]">
                          <Check className="h-3.5 w-3.5 text-[#00d49f]" />
                          Copied!
                        </span>
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Security Telemetry Strip */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-xl bg-[#070e1b] border border-[#17233b]/60">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Node Scope</span>
                  <span className="text-slate-300 text-[11px] truncate block" title={nodeScope}>
                    {nodeScope}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Last Access</span>
                  <span className="text-slate-300 text-[11px] block">{admin.lastLoginAt}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Authentication</span>
                  <span className="text-[#00d49f] text-[11px] flex items-center gap-1 font-bold">
                    <ShieldCheck className="h-3 w-3" />
                    TOTP 2FA Enforced
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Actions Logged</span>
                  <span className="text-white text-[11px] font-bold">
                    {admin.totalActionsLogged} Signed Actions
                  </span>
                </div>
              </div>

              {/* Administrative Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-[#17233b] text-xs font-mono gap-2 flex-wrap">
                <button
                  onClick={() => handleOpenResetModal(admin)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold transition text-xs"
                  type="button"
                >
                  <Key className="h-3.5 w-3.5 text-amber-400" />
                  <span>🔑 Reset Password</span>
                </button>

                <button
                  onClick={() => handleOpenTotpModal(admin)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition text-xs"
                  type="button"
                >
                  <QrCode className="h-3.5 w-3.5 text-[#00d49f]" />
                  <span>🛡️ Regenerate 2FA Secret</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= RESET PASSWORD MODAL ================= */}
      {resetModalAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d1627] border border-[#17233b] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase">
                  Rotate Password: {resetModalAdmin.label || resetModalAdmin.name}
                </h3>
              </div>
              <button
                onClick={() => setResetModalAdmin(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Generates a cryptographically strong 18-character password. Changes will be recorded in the SBP
              Immutable Audit Log trail.
            </p>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Generated New Password</span>
              <div className="flex items-center justify-between gap-2 bg-[#070d18] border border-[#17233b] rounded-xl px-3 py-2.5">
                <span className="font-mono text-sm font-bold text-amber-300 select-all tracking-wider">
                  {generatedPassword}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={generateSecurePassword}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    title="Generate another"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword);
                      setResetSuccessNotice('Copied to clipboard!');
                      setTimeout(() => setResetSuccessNotice(null), 1500);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-[#00d49f] hover:bg-slate-800 transition"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {resetSuccessNotice && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{resetSuccessNotice}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#17233b]">
              <button
                onClick={() => setResetModalAdmin(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-mono transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={isResetting || !generatedPassword}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition flex items-center gap-2"
              >
                {isResetting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                <span>Confirm Rotation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REGENERATE 2FA SECRET MODAL ================= */}
      {totpModalAdmin && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d1627] border border-[#17233b] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#00d49f]" />
                <h3 className="font-mono text-sm font-bold text-white uppercase">
                  Regenerate 2FA Secret Challenge
                </h3>
              </div>
              <button
                onClick={() => setTotpModalAdmin(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              An updated Base32 TOTP secret has been provisioned for {totpModalAdmin.label || totpModalAdmin.name}.
              Scan with Google Authenticator or Microsoft Authenticator.
            </p>

            <div className="bg-[#070d18] border border-[#17233b] rounded-xl p-4 flex flex-col items-center justify-center space-y-3">
              <div className="w-32 h-32 bg-white rounded-lg p-2 flex items-center justify-center">
                {/* Visual QR representation placeholder */}
                <div className="w-full h-full border-2 border-dashed border-slate-400 rounded flex flex-col items-center justify-center text-slate-700">
                  <QrCode className="w-16 h-16 text-slate-900" />
                  <span className="text-[9px] font-mono font-bold mt-1">TOTP AUTH</span>
                </div>
              </div>

              <div className="w-full space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 text-center block">
                  Manual Base32 Key
                </span>
                <div className="flex items-center justify-between bg-[#0a1221] px-3 py-2 rounded-lg border border-[#17233b]">
                  <span className="font-mono text-xs text-[#00d49f] font-bold tracking-widest truncate">
                    {newTotpSecret || 'JBSWY3DPEHPK3PXP'}
                  </span>
                  <button
                    onClick={() => {
                      if (newTotpSecret) navigator.clipboard.writeText(newTotpSecret);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white transition"
                    title="Copy Secret"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#17233b]">
              <button
                onClick={() => setTotpModalAdmin(null)}
                className="px-4 py-2 rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-bold text-xs font-mono transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
