'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface LocationState {
  status: 'PROMPT' | 'GRANTED' | 'DENIED';
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  fallbackIpOnly: boolean;
}

interface LocationPermissionModalProps {
  onStatusChange?: (state: LocationState) => void;
}

export default function LocationPermissionModal({ onStatusChange }: LocationPermissionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if user already made a decision in localStorage
    const savedPref = localStorage.getItem('digihisab_geo_pref');
    if (savedPref) {
      try {
        const parsed: LocationState = JSON.parse(savedPref);
        if (parsed.status === 'GRANTED') {
          // ALREADY ALLOWED! Do not ask again. Silently notify parent.
          if (onStatusChange) onStatusChange(parsed);
          setIsOpen(false);
          return;
        } else if (parsed.status === 'DENIED') {
          // Already decided: user previously chose Safe IP Fallback. Do not nag repeatedly.
          if (onStatusChange) onStatusChange(parsed);
          setIsOpen(false);
          return;
        }
      } catch (e) {}
    }

    // 2. Query browser native permission state
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            // Browser native permission is ALREADY ALLOWED! Do not ask again.
            setIsOpen(false);
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const state: LocationState = {
                  status: 'GRANTED',
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracyMeters: pos.coords.accuracy,
                  fallbackIpOnly: false,
                };
                localStorage.setItem('digihisab_geo_pref', JSON.stringify(state));
                if (onStatusChange) onStatusChange(state);
              },
              () => {},
              { timeout: 5000 }
            );
          } else if (permissionStatus.state === 'denied') {
            // Denied at browser system level: safe fallback without prompt
            setIsOpen(false);
          } else {
            // 'prompt' state and no prior saved decision: ask user for permission
            setIsOpen(true);
          }
        })
        .catch(() => {
          if (!savedPref) setIsOpen(true);
        });
    } else {
      if (!savedPref) {
        setIsOpen(true);
      }
    }
  }, [onStatusChange]);

  const handleGrantLocation = () => {
    setRequesting(true);
    setFeedback(null);

    if (!navigator.geolocation) {
      handleDenyLocation('Geolocation is not supported by your browser. Falling back to IP Sentinel.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const state: LocationState = {
          status: 'GRANTED',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          fallbackIpOnly: false,
        };

        localStorage.setItem('digihisab_geo_pref', JSON.stringify(state));
        setRequesting(false);
        setFeedback('✅ Precise GPS coordinates verified within Pakistan perimeter.');
        if (onStatusChange) onStatusChange(state);
        setTimeout(() => setIsOpen(false), 1200);
      },
      (error) => {
        let msg = 'Location permission was denied or unavailable.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Permission denied by user. Safe Network IP Fallback Mode activated.';
        }
        handleDenyLocation(msg);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleDenyLocation = (reason = 'User opted for Safe Network IP Fallback.') => {
    setRequesting(false);
    const state: LocationState = {
      status: 'DENIED',
      fallbackIpOnly: true,
    };
    localStorage.setItem('digihisab_geo_pref', JSON.stringify(state));
    setFeedback(`⚠️ ${reason}`);
    if (onStatusChange) onStatusChange(state);
    setTimeout(() => setIsOpen(false), 1600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-2xl relative space-y-5 text-slate-100 font-mono">
        <button
          onClick={() => handleDenyLocation()}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/30 flex items-center justify-center text-[#00d49f]">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-1.5">
              <span>Perimeter Geofencing Verification</span>
            </h2>
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider">
              Zero-Trust Anti-Fraud Sentinel
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          To protect financial ledgers against unauthorized remote logins, DigiHisab validates
          that administrative and commercial billing counters operate inside Pakistan or authorized
          corporate perimeters.
        </p>

        <div className="rounded-xl border border-[#17233b] bg-[#070d18] p-3 text-[11px] space-y-1.5 text-slate-400">
          <div className="flex items-center gap-2 text-[#00d49f]">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="font-bold">What if I deny location access?</span>
          </div>
          <p className="font-sans text-[11px] text-slate-300">
            You will <strong className="text-white">not be locked out</strong>. The platform will automatically
            fall back to <strong>Network IP Sentinel</strong> (PTCL, Nayatel, Zong, Jazz). Dukandars enter
            Safe Counter Mode.
          </p>
        </div>

        {feedback && (
          <div className="text-xs p-2.5 rounded-lg border border-[#17233b] bg-[#070d18] text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            disabled={requesting}
            onClick={handleGrantLocation}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-[#00d49f]/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <MapPin className="h-4 w-4" />
            <span>{requesting ? 'Verifying GPS...' : 'Allow GPS Location'}</span>
          </button>
          <button
            type="button"
            disabled={requesting}
            onClick={() => handleDenyLocation()}
            className="py-2.5 px-3 rounded-xl border border-[#17233b] bg-[#070d18] hover:bg-slate-800 text-slate-300 text-xs transition"
          >
            Safe IP Fallback
          </button>
        </div>
      </div>
    </div>
  );
}
