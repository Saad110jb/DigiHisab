'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  TrendingUp,
  CreditCard,
  Wallet,
  Users,
  UserCheck,
  Search,
  Zap,
  HelpCircle,
  Bell,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  Key,
  FileText,
  Lock,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Activity,
} from 'lucide-react';
import LocationPermissionModal from '@/components/security/LocationPermissionModal';
import OmniSearchModal from '@/components/explorer/OmniSearchModal';
import { AdminRbacProvider, useAdminRbac } from '@/context/AdminRbacContext';
import AdminIdentitySwitcherModal from '@/components/rbac/AdminIdentitySwitcherModal';
import AdminAccessDenied from '@/components/rbac/AdminAccessDenied';
import { dynamicNavConfig, NavItem } from '@/lib/nav-config';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  TrendingUp,
  CreditCard,
  Wallet,
  Users,
  UserCheck,
  Search,
  Zap,
  HelpCircle,
  Bell,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  Key,
  FileText,
};

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);

  // Global Paywall Status State
  const [paywallEnforced, setPaywallEnforced] = useState<boolean>(true);
  const [isTogglingPaywall, setIsTogglingPaywall] = useState<boolean>(false);

  const { activeAdmin, checkAccess, isReadOnly } = useAdminRbac();
  const access = checkAccess(pathname);

  useEffect(() => {
    const fetchPaywallStatus = async () => {
      try {
        const res = await fetch('/api/v1/admin/subscriptions/tiers');
        if (res.ok) {
          const json = await res.json();
          if (json.data?.summary?.systemEnforcementActive !== undefined) {
            setPaywallEnforced(json.data.summary.systemEnforcementActive);
          }
        }
      } catch (e) {}
    };
    fetchPaywallStatus();
  }, []);

  const handleTogglePaywall = async () => {
    try {
      setIsTogglingPaywall(true);
      const newState = !paywallEnforced;
      const res = await fetch('/api/v1/admin/subscriptions/master-killswitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enforced: newState,
          reason: newState ? 'Paywall enforced by SuperAdmin' : 'Emergency bypass triggered by SuperAdmin',
        }),
      });
      if (res.ok) {
        setPaywallEnforced(newState);
      }
    } catch (e) {
    } finally {
      setIsTogglingPaywall(false);
    }
  };

  // Global Ctrl+K / Cmd+K Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isCurrentActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const categories: Array<NavItem['category']> = [
    'Main',
    'People & Business',
    'Operations',
    'Security & Team',
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-slate-100 flex flex-col lg:flex-row antialiased font-sans">
      {/* Mobile Top Navigation Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#090e1a] border-b border-slate-800/80 sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="DigiHisab Logo"
            className="w-7 h-7 rounded-lg object-contain bg-slate-900 border border-slate-700/60"
          />
          <div>
            <div className="text-xs font-bold tracking-tight text-white">DigiHisab</div>
            <div className="text-[10px] font-mono text-emerald-400">SuperAdmin</div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Streamlined Left Sidebar (Unified Dark Theme: w-64, #090e1a, border-slate-800/80) */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } lg:flex w-full lg:w-64 bg-[#090e1a] text-slate-300 flex-shrink-0 flex-col justify-between fixed lg:sticky top-0 h-screen z-40 border-r border-slate-800/80 overflow-y-auto`}
      >
        <div className="p-4 space-y-4">
          {/* Top Brand Header with DigiHisab Logo Emblem */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
            <Link href="/admin" className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="DigiHisab Emblem"
                className="w-8 h-8 rounded-lg object-contain bg-slate-900 border border-emerald-500/30 p-0.5 shadow-sm shadow-emerald-500/10"
              />
              <div>
                <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span>DigiHisab</span>
                  <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">
                    SuperAdmin
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Retail &amp; Household Hub</div>
              </div>
            </Link>
          </div>

          {/* Categorized Navigation Links without Awkward Badge Walls */}
          <nav className="space-y-4">
            {categories.map((cat) => {
              const items = dynamicNavConfig.filter((item) => item.category === cat);
              if (items.length === 0) return null;

              return (
                <div key={cat} className="space-y-0.5">
                  <div className="px-2 text-[9px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-1">
                    {cat}
                  </div>
                  {items.map((item) => {
                    const active = isCurrentActive(item.href);
                    const IconComponent = ICON_MAP[item.iconName] || Home;

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition ${
                          active
                            ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-l-2 border-emerald-400'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                        title={item.description}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <IconComponent
                            className={`h-4 w-4 shrink-0 transition ${
                              active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && (
                          <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-2 py-0.5 rounded-md shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer: Node #01 • Online (Zero portraits) */}
        <div className="p-3 border-t border-slate-800/80 bg-[#070b14]">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-white text-xs font-mono font-medium">Node #01 • Online</span>
                <span className="text-[10px] text-slate-500 font-mono">Zero-Trust Sentinel</span>
              </div>
            </div>

            <button
              onClick={() => setIdentityModalOpen(true)}
              className="text-slate-500 hover:text-slate-300 p-1 transition"
              title="Identity & RBAC Nodes"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Unified Dark Canvas #0a0f1d) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0f1d] overflow-y-auto min-h-screen">
        {/* Top Header Bar: Clean Dark High-Contrast Strip */}
        <header className="hidden lg:flex items-center justify-between px-8 py-2.5 bg-[#090e1a]/95 backdrop-blur border-b border-slate-800/80 sticky top-0 z-30 text-xs text-slate-300">
          {/* Centered/Left-Aligned Search Pill Input with Ctrl+K */}
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <button
              onClick={() => setGlobalSearchOpen(true)}
              className="w-full flex items-center justify-between bg-[#131d2e] border border-slate-800/90 hover:border-slate-700 px-3 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 transition"
              title="Global Search (Ctrl+K)"
            >
              <div className="flex items-center gap-2 text-xs">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <span>Search shops, phone numbers, or CNIC...</span>
              </div>
              <kbd className="bg-slate-800 border border-slate-700 text-[10px] px-1.5 py-0.5 rounded text-slate-400 font-mono">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Master Platform Controls & System Health Indicator */}
          <div className="flex items-center gap-4">
            {/* System Health */}
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>API: 100% Operational</span>
            </div>

            <span className="text-slate-800">|</span>

            {/* Global Paywall Toggle */}
            <div className="flex items-center gap-2 bg-[#131d2e] border border-slate-800/90 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] font-mono text-slate-400">Paywall:</span>
              <span
                className={`text-[11px] font-mono font-bold ${
                  paywallEnforced ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {paywallEnforced ? 'Enforced' : 'Bypass'}
              </span>
              <button
                onClick={handleTogglePaywall}
                disabled={isTogglingPaywall}
                className="text-slate-400 hover:text-white transition ml-1"
                title="Toggle Paywall"
              >
                {paywallEnforced ? (
                  <ToggleRight className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-amber-400" />
                )}
              </button>
            </div>

            {/* 2FA Enforced Badge */}
            <Link
              href="/admin/settings/security"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-mono transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>2FA Active</span>
            </Link>
          </div>
        </header>

        {/* Read-Only Auditor Mode Notice */}
        {access.allowed && access.isReadOnly && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between text-xs font-mono text-amber-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                <strong>READ-ONLY AUDIT MODE:</strong> Viewing as Financial Auditor. Modifications locked.
              </span>
            </div>
            <button
              onClick={() => setIdentityModalOpen(true)}
              className="underline text-amber-300 hover:text-white font-bold"
            >
              Switch Role
            </button>
          </div>
        )}

        <LocationPermissionModal />
        <OmniSearchModal isOpen={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
        <AdminIdentitySwitcherModal isOpen={identityModalOpen} onClose={() => setIdentityModalOpen(false)} />

        {/* Global Route Access Guard */}
        <div className="flex-1 bg-[#0a0f1d]">
          {access.allowed ? (
            children
          ) : (
            <AdminAccessDenied reason={access.reason} onOpenSwitcher={() => setIdentityModalOpen(true)} />
          )}
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRbacProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminRbacProvider>
  );
}
