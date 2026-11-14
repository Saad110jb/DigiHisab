'use client';

import React, { useState } from 'react';
import { Lock, ShieldAlert, Key, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { adminUserService } from '@/lib/admin-api';

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (stepUpToken: string) => void;
  actionTitle: string;
  actionDescription: string;
  targetId?: string;
}

export default function StepUpAuthModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle,
  actionDescription,
  targetId,
}: StepUpAuthModalProps) {
  const [authMethod, setAuthMethod] = useState<'TOTP' | 'PASSWORD'>('TOTP');
  const [credential, setCredential] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential) {
      setErrorMsg('Credential is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await adminUserService.verifyStepUpAuth({
        credential,
        type: authMethod,
        actionName: actionTitle,
        targetId,
      });

      if (res.success && res.stepUpToken) {
        onSuccess(res.stepUpToken);
        setCredential('');
        onClose();
      } else {
        setErrorMsg(res.message || 'Verification rejected.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify step-up authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0d1627] p-6 shadow-2xl relative space-y-5 text-slate-100 font-mono">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>Step-Up Re-Authentication</span>
            </h2>
            <span className="text-[10px] text-rose-400 uppercase tracking-wider">
              Zero-Trust Guard for Destructive Mutations
            </span>
          </div>
        </div>

        {/* Action Warning Card */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <AlertTriangle className="h-4 w-4" />
            <span>{actionTitle}</span>
          </div>
          <p className="text-slate-300 font-sans text-xs">{actionDescription}</p>
          {targetId && (
            <div className="pt-1 text-[10px] font-mono text-slate-400">
              Entity Target: <span className="text-white font-bold">{targetId}</span>
            </div>
          )}
        </div>

        {/* Auth Method Selector */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAuthMethod('TOTP')}
            className={`p-2 rounded-xl border text-center transition flex items-center justify-center gap-1.5 font-bold ${
              authMethod === 'TOTP'
                ? 'border-[#00d49f] bg-[#00d49f]/10 text-white'
                : 'border-[#17233b] bg-[#070d18] text-slate-400'
            }`}
          >
            <Key className="h-3.5 w-3.5 text-[#00d49f]" />
            <span>TOTP 2FA Code</span>
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('PASSWORD')}
            className={`p-2 rounded-xl border text-center transition flex items-center justify-center gap-1.5 font-bold ${
              authMethod === 'PASSWORD'
                ? 'border-[#00d49f] bg-[#00d49f]/10 text-white'
                : 'border-[#17233b] bg-[#070d18] text-slate-400'
            }`}
          >
            <Lock className="h-3.5 w-3.5 text-[#00d49f]" />
            <span>Admin Password</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 uppercase text-[10px] block mb-1">
              {authMethod === 'TOTP' ? 'Google Authenticator 6-Digit Code' : 'SuperAdmin Password'}
            </label>
            <input
              type={authMethod === 'TOTP' ? 'text' : 'password'}
              maxLength={authMethod === 'TOTP' ? 6 : undefined}
              placeholder={authMethod === 'TOTP' ? '123456' : '••••••••••••'}
              autoFocus
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-[#00d49f]"
            />

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span>
                {authMethod === 'TOTP'
                  ? '💡 Dev Master Code: 123456 (or Authenticator app)'
                  : '💡 Dev Password: Admin@123 (min 6 chars)'}
              </span>
              <button
                type="button"
                onClick={() => setCredential(authMethod === 'TOTP' ? '123456' : 'Admin@123')}
                className="text-[#00d49f] hover:underline font-bold"
              >
                Auto-fill Dev Key
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#17233b] bg-[#070d18] hover:bg-slate-800 text-slate-300 font-bold transition text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !credential}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold transition text-xs shadow-lg shadow-rose-500/20"
            >
              {submitting ? 'Verifying...' : 'Authorize Execution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
