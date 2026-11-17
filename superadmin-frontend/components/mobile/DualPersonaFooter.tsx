'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ReceiptText,
  Coins,
  Settings,
  Store,
  BookOpen,
  ShieldAlert,
  Mic,
} from 'lucide-react';

export type PersonaType = 'DUKANDAR' | 'HOUSEHOLD';

export interface DualPersonaFooterProps {
  /** Current active mode: 'DUKANDAR' (Retail POS) or 'HOUSEHOLD' (Ghar Ka Hisab) */
  activePersona: PersonaType;
  /** Explicit current path; if omitted, automatically detected via Next.js usePathname */
  currentPath?: string;
  /** Custom navigation callback; if provided, called instead of router.push */
  onNavigate?: (path: string) => void;
  /** Triggered when the raised center Voice AI orb is tapped */
  onVoiceClick?: () => void;
  /** Whether the voice assistant is actively capturing audio */
  isListening?: boolean;
  /** Overdue debt reminders badge count for Dukandar Khata */
  overdueCount?: number;
  /** Whether a Kameti installment or 45-day UPS check is due in Household mode */
  hasDueAlert?: boolean;
  /** Optional extra classes */
  className?: string;
}

interface NavSlot {
  id: string;
  labelEn: string;
  labelUr: string;
  route: string;
  icon: React.ElementType;
}

export const DualPersonaFooter: React.FC<DualPersonaFooterProps> = ({
  activePersona,
  currentPath: propCurrentPath,
  onNavigate,
  onVoiceClick,
  isListening = false,
  overdueCount = 0,
  hasDueAlert = false,
  className = '',
}) => {
  let detectedPath = '';
  try {
    // Attempt Next.js pathname detection; fallback safely if outside Router context
    detectedPath = usePathname() || '';
  } catch {
    detectedPath = typeof window !== 'undefined' ? window.location.pathname : '';
  }

  const router = useRouter?.();
  const currentPath = propCurrentPath ?? detectedPath;
  const isHousehold = activePersona === 'HOUSEHOLD';

  // Haptic feedback trigger for tactile touch micro-interactions
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Safe no-op if vibration is blocked by browser policy
      }
    }
  };

  const handleTabClick = (route: string) => {
    triggerHaptic();
    if (onNavigate) {
      onNavigate(route);
    } else if (router?.push) {
      router.push(route);
    } else if (typeof window !== 'undefined') {
      window.location.href = route;
    }
  };

  const handleVoicePress = () => {
    triggerHaptic();
    onVoiceClick?.();
  };

  // Persona Slots Definition
  const householdSlots: NavSlot[] = [
    {
      id: 'home',
      labelEn: 'Home',
      labelUr: 'گھر',
      route: '/household',
      icon: Home,
    },
    {
      id: 'kharcha',
      labelEn: 'Kharcha',
      labelUr: 'روزنامچہ',
      route: '/household/kharcha',
      icon: ReceiptText,
    },
    {
      id: 'kameti-bills',
      labelEn: 'Kameti & Bills',
      labelUr: 'کمیٹی و بل',
      route: '/household/kameti-bills',
      icon: Coins,
    },
    {
      id: 'settings',
      labelEn: 'Settings',
      labelUr: 'سیٹنگز',
      route: '/household/settings',
      icon: Settings,
    },
  ];

  const dukandarSlots: NavSlot[] = [
    {
      id: 'dukan',
      labelEn: 'Dukan',
      labelUr: 'دکان',
      route: '/dukandar',
      icon: Store,
    },
    {
      id: 'khata',
      labelEn: 'Khata',
      labelUr: 'ادھار کھاتہ',
      route: '/dukandar/khata',
      icon: BookOpen,
    },
    {
      id: 'galla-audit',
      labelEn: 'Galla Audit',
      labelUr: 'گلہ و رپورٹ',
      route: '/dukandar/galla-audit',
      icon: ShieldAlert,
    },
    {
      id: 'settings',
      labelEn: 'Settings',
      labelUr: 'سیٹنگز',
      route: '/dukandar/settings',
      icon: Settings,
    },
  ];

  const activeSlots = isHousehold ? householdSlots : dukandarSlots;
  const leftSlots = activeSlots.slice(0, 2);
  const rightSlots = activeSlots.slice(2, 4);

  const checkIsActive = (route: string) => {
    if (!currentPath) return false;
    if (route === '/household' || route === '/dukandar') {
      return currentPath === route;
    }
    return currentPath.startsWith(route);
  };

  const renderSlotButton = (slot: NavSlot) => {
    const isActive = checkIsActive(slot.route);
    const Icon = slot.icon;

    return (
      <button
        key={slot.id}
        type="button"
        onClick={() => handleTabClick(slot.route)}
        className="group relative flex flex-col items-center justify-center h-full w-full py-1 text-center active:scale-90 transition-transform duration-150 focus:outline-none select-none"
        aria-label={`${slot.labelEn} - ${slot.labelUr}`}
      >
        {/* Subtle Top Active Indicator Pill */}
        {isActive && (
          <span
            className={`absolute top-0 w-5 h-0.5 rounded-full transition-all duration-200 ${
              isHousehold ? 'bg-[#0ea5e9]' : 'bg-[#00d49f]'
            }`}
          />
        )}

        {/* Outer Icon with Optional Badges */}
        <div className="relative flex items-center justify-center">
          <Icon
            className={`w-5 h-5 transition-colors duration-150 ${
              isActive
                ? isHousehold
                  ? 'text-[#0ea5e9]'
                  : 'text-[#00d49f]'
                : 'text-slate-400 group-hover:text-slate-200'
            }`}
          />

          {/* Household: Amber Notification Dot for Kameti / UPS checks */}
          {slot.id === 'kameti-bills' && hasDueAlert && (
            <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-[#0d1627]" />
            </span>
          )}

          {/* Dukan: Overdue Udhaar Rose Badge Count */}
          {slot.id === 'khata' && overdueCount > 0 && (
            <span className="absolute -top-1.5 -right-3 min-w-[17px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border border-[#070d18] shadow-sm animate-pulse">
              {overdueCount > 99 ? '99+' : overdueCount}
            </span>
          )}
        </div>

        {/* Compact Bilingual Labels (10px English, 9px Urdu) */}
        <span
          className={`text-[10px] font-bold leading-none mt-1 transition-colors duration-150 ${
            isActive
              ? isHousehold
                ? 'text-[#0ea5e9]'
                : 'text-[#00d49f]'
              : 'text-slate-400 group-hover:text-slate-200'
          }`}
        >
          {slot.labelEn}
        </span>
        <span
          className={`text-[9px] leading-tight mt-0.5 transition-colors duration-150 ${
            isActive
              ? isHousehold
                ? 'text-[#0ea5e9]'
                : 'text-[#00d49f]'
              : 'text-slate-500 group-hover:text-slate-400'
          }`}
          style={{ lineHeight: 1.2 }}
        >
          {slot.labelUr}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="DigiHisab Bottom Navigation"
      className={`fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto select-none ${
        isHousehold
          ? 'bg-[#0d1627]/95 backdrop-blur-md border-t border-[#17233b]'
          : 'bg-[#070d18]/95 backdrop-blur-md border-t border-slate-800'
      } ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 items-center h-16 px-1.5 relative">
        {/* Slot 1 & Slot 2 (Left) */}
        {leftSlots.map((slot) => renderSlotButton(slot))}

        {/* Slot 3: Center Raised 'بولیں' (Voice AI) Microphone Orb */}
        <div className="flex flex-col items-center justify-center relative">
          <button
            type="button"
            onClick={handleVoicePress}
            className={`-mt-7 h-14 w-14 rounded-full flex flex-col items-center justify-center active:scale-90 transition-transform duration-150 focus:outline-none relative z-10 ${
              isListening
                ? 'bg-rose-500 shadow-lg shadow-rose-500/50'
                : isHousehold
                ? 'bg-gradient-to-tr from-[#0ea5e9] to-[#00d49f] shadow-lg shadow-[#0ea5e9]/30'
                : 'bg-[#00d49f] shadow-lg shadow-[#00d49f]/30'
            }`}
            aria-label={isListening ? 'Voice AI سن رہا ہے...' : 'Voice AI بولیں'}
          >
            {/* Pulsing ring animation when active/listening */}
            {isListening && (
              <span className="absolute -inset-1 rounded-full bg-rose-400 animate-ping opacity-60 pointer-events-none" />
            )}
            <Mic
              className={`w-6 h-6 ${
                isListening
                  ? 'text-white'
                  : isHousehold
                  ? 'text-white'
                  : 'text-[#070d18]'
              }`}
            />
          </button>

          {/* Center Orb Subtitle Label */}
          <span
            className={`text-[9px] font-bold tracking-tight mt-1 transition-colors ${
              isListening
                ? 'text-rose-400 animate-pulse'
                : isHousehold
                ? 'text-[#0ea5e9]'
                : 'text-[#00d49f]'
            }`}
          >
            {isListening ? 'سن رہا ہے...' : 'بولیں'}
          </span>
        </div>

        {/* Slot 4 & Slot 5 (Right) */}
        {rightSlots.map((slot) => renderSlotButton(slot))}
      </div>
    </nav>
  );
};

export default DualPersonaFooter;
