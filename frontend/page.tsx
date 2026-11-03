'use client';

import React, { useState } from 'react';
import logoImg from './assets/logo.png';
import {
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  HelpCircle,
  Zap,
  Store,
  Home,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  ChevronUp,
  Building2,
  Lock,
  ArrowRight,
  ExternalLink,
  Receipt,
  FileCheck2,
  RefreshCw,
  QrCode,
  X,
  Clock,
  BadgeCheck,
  ArrowDown,
  WifiOff,
  MessageSquare
} from 'lucide-react';

interface PlanItem {
  id: string;
  name: string;
  urduName: string;
  price: string;
  billingPeriod: string;
  target: string;
  category: string;
  badge?: string;
  isRecommended?: boolean;
  isPopular?: boolean;
  features: string[];
  ctaText: string;
  icon: React.ElementType;
}

const subscriptionPlans: PlanItem[] = [
  {
    id: 'household-starter',
    name: 'Household Starter',
    urduName: 'گھریلو بنیادی پلان',
    price: 'PKR 0',
    billingPeriod: '/ Forever Free',
    target: 'Basic budget kickoff for young couples and nuclear families.',
    category: 'Household Entry',
    icon: Home,
    features: [
      'Monthly Rashan item checklist & pantry tally',
      'Manual electricity/gas/water bill logging',
      '1 Physical cash envelope wallet management',
      'Zero ads or promotion interruptions'
    ],
    ctaText: 'Get Free Plan'
  },
  {
    id: 'dukandar-free',
    name: 'Dukandar Free Khata',
    urduName: 'دکاندار بنیادی کھاتہ',
    price: 'PKR 0',
    billingPeriod: '/ Forever Free',
    target: 'Paper bahi-khata digital replacement for neighbourhood kiosks.',
    category: 'Retail Micro',
    icon: Store,
    features: [
      'Up to 20 customer credit (Udhaar) khatas',
      'Daily milk & bread recurring tabs',
      'Basic balance SMS confirmation receipts',
      'Daily evening cash-in & cash-out audit'
    ],
    ctaText: 'Start Free Khata'
  },
  {
    id: 'ghar-ka-hisab-pro',
    name: 'Ghar Ka Hisab Pro Hub',
    urduName: 'گھر کا مکمل حساب',
    price: 'PKR 150',
    billingPeriod: '/ Month',
    target: 'Holistic family finance, maid staff advances, and religious endowments.',
    category: 'Domestic Master',
    isRecommended: true,
    badge: 'Recommended',
    icon: Home,
    features: [
      'Unlimited digital savings envelopes (Kameti, Emergency, Fees)',
      'Elderly parent prescription & medication refill tracking',
      'Domestic maid payroll, leaves & advance logs',
      'Automatic Zakat & Gold/Silver Nisab calculator'
    ],
    ctaText: 'Activate Hub • ₨150/mo'
  },
  {
    id: 'dukandar-pos',
    name: 'Dukandar Retail POS',
    urduName: 'دکاندار ریٹیل رجسٹر',
    price: 'PKR 200',
    billingPeriod: '/ Month',
    target: 'High-speed checkout and Udhaar automation for mart counters.',
    category: 'Retail POS',
    isPopular: true,
    badge: 'Popular',
    icon: Zap,
    features: [
      'Fast mobile camera barcode item checkout',
      'Customer Udhaar credit limits with warning triggers',
      '1-Click automated WhatsApp payment reminders with Raast QR',
      'Stock shortage warnings & supplier ledger logs'
    ],
    ctaText: 'Get POS • ₨200/mo'
  },
  {
    id: 'pro-malik-sentinel',
    name: 'Pro Malik Sentinel',
    urduName: 'پرو مالک و چور نظر پیک',
    price: 'PKR 250',
    billingPeriod: '/ Month',
    target: 'Theft-prevention security layer for absent store owners.',
    category: 'Loss Prevention',
    icon: ShieldCheck,
    features: [
      'Real-time cash drawer discrepancy detection flags',
      'Shift-closing blind cash counts for till attendants',
      'Manager biometric / PIN override for voided sales & returns',
      'Forensic transaction alteration & remote phone monitoring'
    ],
    ctaText: 'Enable Malik Pro • ₨250/mo'
  },
  {
    id: 'annual-dukandar-pro',
    name: 'Annual Dukandar Pro',
    urduName: 'سالانہ دکاندار بچت پیک',
    price: 'PKR 2,500',
    billingPeriod: '/ Year',
    target: 'Full suite lock-in with zero recurring monthly hassle.',
    category: 'Annual Saver',
    badge: '2 Months Free',
    icon: Store,
    features: [
      'Full Pro Malik & Retail Register suite included',
      'Priority VIP WhatsApp onboarding hotline (24/7)',
      'Local encrypted SQLite daily automated backup',
      'Free replacement thermal roll templates & FBR tax filing'
    ],
    ctaText: 'Subscribe Annual • ₨2,500'
  },
  {
    id: 'enterprise-mandi',
    name: 'Enterprise Mandi Mart',
    urduName: 'منڈی و ہول سیل مارٹ',
    price: 'PKR 4,500',
    billingPeriod: '/ Month',
    target: 'High-volume Sabzi Mandi, Grain & Fabric wholesale ledger.',
    category: 'Enterprise Wholesaler',
    icon: Building2,
    features: [
      'Up to 8 multi-terminal synchronous counters & tills',
      'Wholesale commission (Aarthi) ledger & tare deductions',
      'Bulk truck freight & supplier automated 3-way reconciliation',
      'Dedicated account manager & on-site priority support'
    ],
    ctaText: 'Deploy Enterprise • ₨4,500'
  }
];

type PolicyKey = 'refund' | 'delivery' | 'terms' | 'privacy';

export default function DigiHisabPortal() {
  const [activePolicy, setActivePolicy] = useState<PolicyKey>('refund');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<PlanItem | null>(null);
  const [paymentRail, setPaymentRail] = useState<'raast' | 'jazzcash' | 'easypaisa' | 'card'>('raast');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleOpenCheckout = (plan: PlanItem) => {
    setSelectedPlanForModal(plan);
    setCheckoutComplete(false);
  };

  const handleSimulatedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutComplete(true);
  };

  return (
    <div className="min-h-screen bg-[#0d131f] text-[#dde2f3] font-['Inter',sans-serif] selection:bg-[#00d49f]/30 selection:text-[#00d49f]">
      {/* Top Header matching code.html */}
      <header className="sticky top-0 left-0 w-full z-50 bg-[#080e19]/85 backdrop-blur-xl border-b border-[#17233b] shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
        <div className="h-20 max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="#" className="flex items-center gap-3 group">
              <img
                src={logoImg}
                alt="DigiHisab Logo"
                className="h-10 w-auto object-contain rounded-xl shadow-md border border-[#242a36]"
              />
              <div className="flex flex-col">
                <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-[#dde2f3] leading-none group-hover:text-[#45f1ba] transition-colors">
                  DigiHisab
                </span>
                <span className="font-['JetBrains_Mono'] text-[11px] font-semibold tracking-wider uppercase text-[#bacac1]">
                  Fintech Rails
                </span>
              </div>
            </a>
            <div className="hidden xl:flex items-center gap-2 pl-4 py-1.5 rounded-full bg-[#1a202b] px-3 border border-[#242a36]">
              <span className="w-2 h-2 rounded-full bg-[#45f1ba] animate-pulse" />
              <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#45f1ba] uppercase">
                Raast &amp; 1LINK Connected
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-2">
            <a
              href="#overview"
              className="px-4 py-2 rounded-lg text-sm text-[#bacac1] hover:text-[#dde2f3] hover:bg-[#1a202b] transition-all"
            >
              Ecosystem
            </a>
            <a
              href="#plans-matrix"
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#45f1ba] bg-[#242a36] transition-all"
            >
              Subscriptions &amp; Pricing
            </a>
            <a
              href="#compliance-tabs"
              className="px-4 py-2 rounded-lg text-sm text-[#bacac1] hover:text-[#dde2f3] hover:bg-[#1a202b] transition-all"
            >
              Compliance &amp; Policies
            </a>
            <a
              href="#faq-section"
              className="px-4 py-2 rounded-lg text-sm text-[#bacac1] hover:text-[#dde2f3] hover:bg-[#1a202b] transition-all"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              href="tel:+923189663004"
              className="hidden sm:flex items-center gap-1.5 text-[#bacac1] hover:text-[#89ceff] transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#89ceff]" />
              <span className="font-['JetBrains_Mono'] text-xs font-semibold tracking-wide text-[#89ceff]">
                +92 318 9663004
              </span>
            </a>
            <button
              onClick={() => handleOpenCheckout(subscriptionPlans[2])}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#00d49f] text-[#003828] font-semibold text-xs sm:text-sm hover:bg-[#45f1ba] transition-all shadow-[0_0_16px_rgba(0,212,159,0.25)]"
            >
              Get Started
            </button>
            <div className="w-8 h-8 rounded-full bg-[#45f1ba] flex items-center justify-center text-[#003828] shadow-sm">
              <BadgeCheck className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Top Trust Ticker */}
      <div className="w-full bg-[#080e19] py-2 px-4 md:px-8 border-b border-[#161c27]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap font-['JetBrains_Mono']">
            <span className="inline-flex items-center gap-2 text-[#00d49f]">
              <span className="w-2 h-2 rounded-full bg-[#00d49f] animate-pulse" />
              SBP-Licensed Rails Compatible
            </span>
            <span className="inline-flex items-center gap-2 text-[#89ceff]">
              <span className="w-2 h-2 rounded-full bg-[#89ceff]" />
              256-bit Encrypted Ledger
            </span>
            <span className="inline-flex items-center gap-2 text-[#cbd7f7]">
              <Zap className="w-3.5 h-3.5 text-[#45f1ba]" />
              Instant Settlement Ready (Raast / PayFast)
            </span>
          </div>
          <div className="flex items-center gap-3 font-['JetBrains_Mono'] text-[11px] text-[#bacac1]">
            <span>FBR NTN Verified</span>
            <span>•</span>
            <span className="text-[#00d49f]">SECP Inc. # 0214892</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section id="overview" className="relative w-full py-16 md:py-20 px-4 md:px-8 overflow-hidden bg-[#0d131f] border-b border-[#17233b]">
        {/* Atmospheric Glows */}
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-[#45f1ba]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-[#89ceff]/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
            <div className="flex-1 flex flex-col gap-6 max-w-3xl">
              {/* Institutional Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#161c27] border border-[#242a36] w-fit shadow-sm">
                <img
                  src={logoImg}
                  alt="DigiHisab Emblem"
                  className="w-5 h-5 rounded-full object-cover border border-[#45f1ba]/40"
                />
                <span className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-wider text-[#45f1ba]">
                  Pakistan Fiscal Core OS
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#bacac1]">
                  v4.2 Aggregator Grade
                </span>
              </div>

              <h1 className="font-['Space_Grotesk'] text-3xl sm:text-5xl lg:text-5xl font-bold text-[#dde2f3] leading-tight tracking-tight">
                DigiHisab — Smart Financial Management for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#45f1ba] via-emerald-300 to-[#89ceff]">
                  Retailers &amp; Households
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#bacac1] leading-relaxed">
                Pakistan's all-in-one ledger ecosystem for dual-entry retail accounting and household budgeting. Fully integrated with Raast, JazzCash, EasyPaisa, and local bank cards with bank-grade tamper-proof audit trails.
              </p>

              {/* Primary CTA Cluster */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#plans-matrix"
                  className="px-6 py-3 rounded-lg bg-[#00d49f] text-[#003828] font-semibold text-sm hover:bg-[#45f1ba] transition-all shadow-[0_0_20px_rgba(0,212,159,0.3)] flex items-center gap-2"
                >
                  <span>Browse 7 Registered Plans</span>
                  <ArrowDown className="w-4 h-4" />
                </a>
                <a
                  href="#compliance-tabs"
                  className="px-6 py-3 rounded-lg bg-[#242a36] text-[#dde2f3] font-semibold text-sm hover:bg-[#333946] transition-all flex items-center gap-2 border border-[#3b4a43]"
                >
                  <ShieldCheck className="w-4 h-4 text-[#89ceff]" />
                  <span>Compliance &amp; Refund Terms</span>
                </a>
              </div>

              {/* Clearing Rails Strip */}
              <div className="flex items-center gap-3 pt-3 text-[#bacac1] font-['JetBrains_Mono'] text-xs flex-wrap">
                <span className="text-[#dde2f3] font-semibold">Supported Clearing Rails:</span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#89ceff] border border-[#242a36]">
                  RAAST P2M
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#89ceff] border border-[#242a36]">
                  JazzCash Core
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#89ceff] border border-[#242a36]">
                  EasyPaisa Hub
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#89ceff] border border-[#242a36]">
                  PayFast 3DS
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#45f1ba] border border-[#242a36]">
                  PayPak / 1LINK
                </span>
              </div>
            </div>

            {/* Ledger Live Snapshot Module */}
            <div className="w-full lg:w-96 flex flex-col gap-4 bg-[#161c27] p-6 rounded-2xl border border-[#242a36] shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00d49f] animate-ping" />
                  <span className="text-sm font-bold text-[#dde2f3]">Live Ledger Status</span>
                </div>
                <span className="font-['JetBrains_Mono'] text-[11px] font-bold px-2 py-0.5 rounded bg-[#2f3541] text-[#45f1ba]">
                  99.98% UPTIME
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#080e19] border border-[#1a202b] flex flex-col gap-1.5">
                <span className="text-xs text-[#bacac1]">Today's Reconciled Volume (PKR)</span>
                <div className="font-['Space_Grotesk'] text-2xl font-black text-[#45f1ba] tracking-tight">
                  ₨ 48,912,450.00
                </div>
                <div className="flex items-center justify-between text-xs text-[#bacac1] pt-1">
                  <span>Clearing: <span className="text-[#dde2f3]">Raast Instant</span></span>
                  <span className="text-[#00d49f] font-semibold">T+0 Realtime</span>
                </div>
              </div>

              {/* Live Trust Micro Indicators */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-[#1a202b] border border-[#242a36] flex flex-col">
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacac1]">AUDIT STAMP</span>
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#dde2f3] mt-0.5">
                    SHA-256 Valid
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#1a202b] border border-[#242a36] flex flex-col">
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#bacac1]">REFUND WINDOW</span>
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#45f1ba] mt-0.5">
                    7 Days Full
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Quick Value Proposition Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            {/* Dukandar & Mandi */}
            <div className="p-6 rounded-2xl bg-[#161c27] hover:bg-[#1a202b] border border-[#242a36] transition-all flex flex-col gap-3 shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-[#1a202b] border border-[#2f3541] flex items-center justify-center text-[#45f1ba] group-hover:scale-105 transition-transform">
                <Store className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#dde2f3]">Dukandar Retail &amp; Mandi</h3>
                <span className="font-['JetBrains_Mono'] text-xs text-[#bacac1] font-urdu" dir="rtl">
                  دکان و منڈی کھاتہ
                </span>
              </div>
              <p className="text-xs text-[#bacac1] leading-relaxed">
                Full-spectrum micro-retail POS, Aarthi commission logs, rapid Udhaar tracking, and instant WhatsApp bill sharing for Pakistani bazaar merchants.
              </p>
              <div className="flex items-center gap-1.5 text-[#45f1ba] font-['JetBrains_Mono'] text-xs mt-auto pt-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Zero Data Loss Offline SQLite Mode</span>
              </div>
            </div>

            {/* Ghar Ka Hisab & Staff */}
            <div className="p-6 rounded-2xl bg-[#161c27] hover:bg-[#1a202b] border border-[#242a36] transition-all flex flex-col gap-3 shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-[#1a202b] border border-[#2f3541] flex items-center justify-center text-[#89ceff] group-hover:scale-105 transition-transform">
                <Home className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#dde2f3]">Ghar Ka Hisab &amp; Staff</h3>
                <span className="font-['JetBrains_Mono'] text-xs text-[#bacac1] font-urdu" dir="rtl">
                  گھریلو بجٹ اور ملازمین
                </span>
              </div>
              <p className="text-xs text-[#bacac1] leading-relaxed">
                Track domestic salary advances, domestic electricity tariff tier escalations, grocery envelopes, and auto-computed Zakat on gold and cash assets.
              </p>
              <div className="flex items-center gap-1.5 text-[#89ceff] font-['JetBrains_Mono'] text-xs mt-auto pt-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Bilingual Urdu &amp; English Dashboard</span>
              </div>
            </div>

            {/* Enterprise & Multi-Counter Mart */}
            <div className="p-6 rounded-2xl bg-[#161c27] hover:bg-[#1a202b] border border-[#242a36] transition-all flex flex-col gap-3 shadow-md group">
              <div className="w-12 h-12 rounded-xl bg-[#1a202b] border border-[#2f3541] flex items-center justify-center text-[#cbd7f7] group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#dde2f3]">Enterprise Multi-Counter</h3>
                <span className="font-['JetBrains_Mono'] text-xs text-[#bacac1] font-urdu" dir="rtl">
                  انٹرپرائز و ہول سیل مارٹ
                </span>
              </div>
              <p className="text-xs text-[#bacac1] leading-relaxed">
                Synchronous multi-terminal till pooling, wholesale consignment tracking, automated supplier reconciliation, and forensic cash audit trails.
              </p>
              <div className="flex items-center gap-1.5 text-[#cbd7f7] font-['JetBrains_Mono'] text-xs mt-auto pt-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Direct Micro-Pay via Raast &amp; Webhooks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Banner Break Section matching code.html */}
      <section className="w-full bg-[#080e19] py-8 px-4 md:px-8 border-b border-[#161c27]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="relative rounded-2xl overflow-hidden h-64 shadow-xl border border-[#1a202b] group">
            <img
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Pakistani retail storefront using digital POS"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOlcyXFHNMhlxAGkyvavv28xyBdf-CeeDrSlELDa8cAe38BqsYz-QEUXnBu1qZ1regTdca9PetskY26VPrplbvf5o05-ryw__8o1o7vQtbFqCdFChV0F9OF0J84D8Y8NZ0Q5cJZOe4DC4imCybNmi2NoiPe6aI3yIbLWymuAgBiXpSjfsWqVfFW8qUsTxqTkPwsTT6YevAIcIXyr3LvJ_lp45zBqJ72w6tu8tt6VVL"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080e19] via-[#080e19]/40 to-transparent flex items-end p-6">
              <span className="text-base font-bold text-[#dde2f3]">
                Digitizing 100,000+ Kiryana &amp; General Stores
              </span>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden h-64 shadow-xl border border-[#1a202b] group">
            <img
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Pakistani family budgeting together"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVnn2IBSg5f_5p6v2YqYS4FXFo-CricCcuB86VpwMiAh6ftigeK0697fTNT-Wk0rH55Rc7HJpMI6BxwNci_A4L1kuE_OcaSo39Bfy8_k1EO-43LQzxUArxmsSsnAHTl_jjgkGdGYlc3PeJXcWOO3l9l2h-P_F1zezLCZ5pRZ_QwQk6OTDGLY5Q2wnH1-107XEPXuOtMGFYCTb9AdAFAN2g425tzaCMlY79ovRDG9XE"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080e19] via-[#080e19]/40 to-transparent flex items-end p-6">
              <span className="text-base font-bold text-[#dde2f3]">
                Household Financial Clarity Across All Provinces
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Plans & Pricing Grid */}
      <section id="plans-matrix" className="w-full py-16 md:py-20 px-4 md:px-8 bg-[#0d131f] border-b border-[#17233b]">
        <div className="max-w-7xl mx-auto flex flex-col gap-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#45f1ba] uppercase tracking-widest">
                  Pricing &amp; Subscription Catalog
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1a202b] text-[#bacac1] font-['JetBrains_Mono'] text-[11px] border border-[#242a36]">
                  Aggregator Audit Standard
                </span>
              </div>
              <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl font-bold text-[#dde2f3] mt-2">
                Official DigiHisab Service Plans &amp; Tiers
              </h2>
              <p className="text-sm sm:text-base text-[#bacac1] mt-2 max-w-2xl leading-relaxed">
                Transparent PKR pricing. Instant digital delivery upon payment clearance. Backed by our 7-Day Complete Money-Back Escrow Guarantee.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#161c27] border border-[#242a36] flex items-center gap-3 shrink-0">
              <BadgeCheck className="w-5 h-5 text-[#45f1ba] shrink-0" />
              <span className="text-xs text-[#bacac1]">
                Tax inclusive (FBR Active GST compliant invoices generated)
              </span>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subscriptionPlans.map((plan) => {
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 relative shadow-lg ${
                    plan.isRecommended
                      ? 'bg-[#242a36] ring-2 ring-[#00d49f] hover:bg-[#2f3541]'
                      : plan.isPopular
                      ? 'bg-[#242a36] ring-2 ring-[#89ceff] hover:bg-[#2f3541]'
                      : 'bg-[#161c27] border border-[#242a36] hover:bg-[#1a202b]'
                  }`}
                >
                  {/* Floating Badge */}
                  {plan.badge && (
                    <div
                      className={`absolute -top-3 right-4 px-3 py-0.5 rounded-full font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-wide shadow-md ${
                        plan.isRecommended
                          ? 'bg-[#00d49f] text-[#003828]'
                          : 'bg-[#89ceff] text-[#00344d]'
                      }`}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-wider text-[#bacac1]">
                        {plan.category}
                      </span>
                      <span className="text-xs font-urdu text-[#45f1ba]" dir="rtl">
                        {plan.urduName}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#dde2f3]">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span
                          className={`font-['Space_Grotesk'] text-3xl font-black ${
                            plan.isRecommended
                              ? 'text-[#45f1ba]'
                              : plan.isPopular
                              ? 'text-[#89ceff]'
                              : 'text-[#dde2f3]'
                          }`}
                        >
                          {plan.price}
                        </span>
                        <span className="text-xs text-[#bacac1] font-medium">
                          {plan.billingPeriod}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#bacac1] leading-relaxed">
                      {plan.target}
                    </p>

                    <div className="h-px bg-[#2f3541] my-1" />

                    <ul className="flex flex-col gap-2.5 text-xs text-[#dde2f3]">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              plan.isPopular ? 'text-[#89ceff]' : 'text-[#45f1ba]'
                            }`}
                          />
                          <span className="leading-relaxed">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleOpenCheckout(plan)}
                    className={`w-full mt-6 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                      plan.isRecommended
                        ? 'bg-[#00d49f] text-[#003828] hover:bg-[#45f1ba] shadow-[0_0_12px_rgba(0,212,159,0.3)]'
                        : plan.isPopular
                        ? 'bg-[#89ceff] text-[#00344d] hover:bg-[#c9e6ff]'
                        : 'bg-[#242a36] text-[#dde2f3] hover:bg-[#333946] border border-[#3b4a43]'
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Legal Policy Section (Tabbed Viewer) */}
      <section id="compliance-tabs" className="w-full py-16 md:py-20 px-4 md:px-8 bg-[#080e19] border-b border-[#17233b]">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col gap-1.5">
            <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#45f1ba] uppercase tracking-widest">
              Regulatory Governance &amp; Terms
            </span>
            <h2 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#dde2f3]">
              Institutional Compliance &amp; Merchant Policies
            </h2>
            <p className="text-sm text-[#bacac1]">
              Published under the sovereign digital commerce statutes of Pakistan, SECP licensing, and SBP digital onboarding frameworks.
            </p>
          </div>

          {/* 7-Day 100% Escrow Refund Policy Callout Box matching code.html */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#1a202b] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl border-l-4 border-l-[#00d49f] border border-[#242a36]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#00d49f]/20 flex items-center justify-center text-[#00d49f] shrink-0 mt-1">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base sm:text-lg font-bold text-[#45f1ba]">
                    7-Day 100% Return &amp; Refund Policy
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#242a36] text-[#45f1ba] font-['JetBrains_Mono'] text-[11px] font-bold uppercase border border-[#3b4a43]">
                    Guaranteed
                  </span>
                </div>
                <p className="text-sm text-[#dde2f3] leading-relaxed">
                  DigiHisab offers a 7-day no-questions-asked refund policy for all digital subscriptions. If not completely satisfied within 7 days of payment, subscribers can submit a refund request to receive a 100% reimbursement to their original payment source (Raast, JazzCash, or Debit Card).
                </p>
                <span className="text-xs text-[#bacac1] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#45f1ba]" />
                  Processing turnaround: 24 to 48 banking hours. Direct bank reference number issued upon initiation.
                </span>
              </div>
            </div>
            <a
              href="mailto:payments@digihisab.pk?subject=Subscription%20Refund%20Claim"
              className="px-5 py-2.5 rounded-xl bg-[#242a36] text-[#45f1ba] hover:bg-[#333946] font-semibold text-xs sm:text-sm transition-all shrink-0 border border-[#3b4a43]"
            >
              Initiate Escrow Refund
            </a>
          </div>

          {/* Interactive Tabbed Container */}
          <div className="rounded-2xl bg-[#161c27] overflow-hidden shadow-xl border border-[#242a36]">
            {/* Tab Bar */}
            <div className="flex flex-wrap border-b border-[#242a36] bg-[#242a36]">
              <button
                onClick={() => setActivePolicy('refund')}
                className={`px-6 py-4 text-sm font-semibold transition-all flex items-center gap-2 ${
                  activePolicy === 'refund'
                    ? 'text-[#45f1ba] border-b-2 border-[#45f1ba] bg-[#161c27]'
                    : 'text-[#bacac1] hover:text-[#dde2f3]'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refund &amp; Dispute Policy</span>
              </button>
              <button
                onClick={() => setActivePolicy('delivery')}
                className={`px-6 py-4 text-sm font-semibold transition-all flex items-center gap-2 ${
                  activePolicy === 'delivery'
                    ? 'text-[#45f1ba] border-b-2 border-[#45f1ba] bg-[#161c27]'
                    : 'text-[#bacac1] hover:text-[#dde2f3]'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Service &amp; Digital Delivery</span>
              </button>
              <button
                onClick={() => setActivePolicy('terms')}
                className={`px-6 py-4 text-sm font-semibold transition-all flex items-center gap-2 ${
                  activePolicy === 'terms'
                    ? 'text-[#45f1ba] border-b-2 border-[#45f1ba] bg-[#161c27]'
                    : 'text-[#bacac1] hover:text-[#dde2f3]'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Terms &amp; Conditions</span>
              </button>
              <button
                onClick={() => setActivePolicy('privacy')}
                className={`px-6 py-4 text-sm font-semibold transition-all flex items-center gap-2 ${
                  activePolicy === 'privacy'
                    ? 'text-[#45f1ba] border-b-2 border-[#45f1ba] bg-[#161c27]'
                    : 'text-[#bacac1] hover:text-[#dde2f3]'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Privacy &amp; Data Sovereignty</span>
              </button>
            </div>

            {/* Tab 1: Refund */}
            {activePolicy === 'refund' && (
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <h3 className="text-lg font-bold text-[#dde2f3]">
                  Comprehensive Escrow Reimbursement Protocol
                </h3>
                <p className="text-sm text-[#bacac1] leading-relaxed">
                  All subscriptions initiated via DigiHisab Technologies (Private) Limited carry unconditional customer protection rights. Subscribers who determine our cloud bookkeeping or POS software does not fit their shop or household operational requirements are entitled to full fee restitution.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#1a202b] border border-[#242a36] flex flex-col gap-1.5">
                    <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#45f1ba] uppercase">
                      Step 1: Submission
                    </span>
                    <span className="text-sm font-bold text-[#dde2f3]">Submit Claim</span>
                    <p className="text-xs text-[#bacac1] leading-relaxed">
                      Send invoice receipt or registered WhatsApp/phone number to <strong className="text-[#45f1ba]">payments@digihisab.pk</strong> or text <strong className="text-white">+92 318 9663004</strong>.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1a202b] border border-[#242a36] flex flex-col gap-1.5">
                    <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#89ceff] uppercase">
                      Step 2: Reconciliation
                    </span>
                    <span className="text-sm font-bold text-[#dde2f3]">Zero-Fee Reversal</span>
                    <p className="text-xs text-[#bacac1] leading-relaxed">
                      Gateway interchange fees are absorbed by DigiHisab. Exactly 100% of the invoiced PKR amount is approved without disputes.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1a202b] border border-[#242a36] flex flex-col gap-1.5">
                    <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#cbd7f7] uppercase">
                      Step 3: Direct Credit
                    </span>
                    <span className="text-sm font-bold text-[#dde2f3]">Immediate Rail Credit</span>
                    <p className="text-xs text-[#bacac1] leading-relaxed">
                      Funds clear to your originating Raast IBAN, JazzCash wallet, EasyPaisa account, or credit/debit card in 24-48 business hours.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Delivery */}
            {activePolicy === 'delivery' && (
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <h3 className="text-lg font-bold text-[#dde2f3]">
                  Service &amp; Digital SaaS Delivery Policy
                </h3>
                <p className="text-sm text-[#bacac1] leading-relaxed">
                  DigiHisab delivers purely intangible digital software services (Software-as-a-Service). No physical media or shrink-wrap hardware discs are dispatched.
                </p>
                <ul className="flex flex-col gap-3 text-sm text-[#bacac1]">
                  <li className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-[#45f1ba] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#dde2f3]">Instant Webhook Provisioning:</strong> Upon successful transaction confirmation from the aggregator (1LINK / PayFast / JazzCash), your DigiHisab tenant ID and Pro features unlock instantly (typically &lt; 3 seconds).
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Receipt className="w-5 h-5 text-[#45f1ba] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#dde2f3]">Digital Tax Invoices:</strong> An official FBR NTN-certified digital receipt is delivered via SMS and registered email address within 2 minutes of payment.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-[#45f1ba] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#dde2f3]">Ledger Continuity:</strong> Account subscription upgrades immediately persist your existing free khata data into the enterprise schema without re-indexing delays.
                    </div>
                  </li>
                </ul>
              </div>
            )}

            {/* Tab 3: Terms */}
            {activePolicy === 'terms' && (
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <h3 className="text-lg font-bold text-[#dde2f3]">
                  Terms &amp; Conditions of Merchant Service
                </h3>
                <p className="text-sm text-[#bacac1] leading-relaxed">
                  By provisioning an account with DigiHisab Technologies (Private) Limited, user entities agree to adhere to standard Pakistani commercial record-keeping ethics and legitimate retail accounting standards.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#bacac1]">
                  <div className="p-4 rounded-xl bg-[#1a202b] border border-[#242a36] flex flex-col gap-1.5">
                    <strong className="text-[#dde2f3] text-sm">Permissible Ledger Operations</strong>
                    <p className="leading-relaxed">
                      Users may record commercial trade balances, customer debt commitments (Udhaar), household budgets, and wholesale receipts. Fraudulent balance fabrication or Ponzi multi-tier schemes are strictly prohibited and result in immediate tenant revocation.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1a202b] border border-[#242a36] flex flex-col gap-1.5">
                    <strong className="text-[#dde2f3] text-sm">Service Level Commitment (SLA)</strong>
                    <p className="leading-relaxed">
                      We maintain an institutional uptime tier of 99.9% across our multi-region cloud deployment. In the event of scheduled gateway maintenance, local SQLite offline mode continues recording entries without interruption.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Privacy */}
            {activePolicy === 'privacy' && (
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <h3 className="text-lg font-bold text-[#dde2f3]">
                  Pakistani Data Sovereignty &amp; Consumer Privacy Standard
                </h3>
                <p className="text-sm text-[#bacac1] leading-relaxed">
                  Customer financial data is the sole property of the subscriber. DigiHisab maintains zero data monetization partnerships and guarantees complete privacy under 256-bit encryption safeguards.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#1a202b] border border-[#242a36] flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-[#45f1ba]">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-sm font-bold text-[#dde2f3]">Zero Data Resale Guarantee</span>
                    </div>
                    <p className="text-[#bacac1] leading-relaxed">
                      We never sell, rent, or lease merchant client directories, consumer mobile numbers, or transaction values to third-party telemarketers or advertising algorithms.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1a202b] border border-[#242a36] flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-[#89ceff]">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm font-bold text-[#dde2f3]">Complete Data Portability</span>
                    </div>
                    <p className="text-[#bacac1] leading-relaxed">
                      Subscribers may export their entire historical ledger in standard CSV, Excel, or PDF formats anytime at zero cost, ensuring no proprietary platform lock-in.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq-section" className="w-full py-16 md:py-20 px-4 md:px-8 bg-[#0d131f] border-b border-[#17233b]">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <div className="text-center flex flex-col items-center gap-1.5">
            <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#45f1ba] uppercase tracking-widest">
              Questions &amp; Answers
            </span>
            <h2 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-bold text-[#dde2f3]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#bacac1]">
              Everything you need to know about our billing, local payment clearing, and refund commitments.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              {
                q: 'How does the 7-day 100% money-back refund process work?',
                icon: HelpCircle,
                iconColor: 'text-[#45f1ba]',
                a: 'DigiHisab offers a 7-day no-questions-asked refund policy for all digital subscriptions. If not completely satisfied within 7 days of payment, subscribers can submit a refund request to receive a 100% reimbursement to their original payment source (Raast, JazzCash, or Debit Card). Simply contact our billing team at payments@digihisab.pk or WhatsApp +92 318 9663004. Reversals are executed within 24 to 48 business hours with zero deduction of processing surcharges.'
              },
              {
                q: 'Can I still record Udhaar and store sales if my shop loses internet connection?',
                icon: WifiOff,
                iconColor: 'text-[#89ceff]',
                a: 'Yes, absolutely. The DigiHisab mobile and desktop client utilizes an encrypted local SQLite engine. You can conduct barcodes scans, record new customer debits, and print thermal chits completely offline. The moment your device reconnects to mobile data or Wi-Fi, changes reconcile seamlessly to the secure cloud ledger.'
              },
              {
                q: 'What Pakistani payment methods are supported for subscription billing?',
                icon: CreditCard,
                iconColor: 'text-[#cbd7f7]',
                a: 'We support all mainstream Pakistani digital payment rails including Raast Instant P2M QR, JazzCash Mobile Wallets, EasyPaisa Wallets, Kuickpay 1LINK Bill Invoicing (payable from any banking app like HBL, Meezan, Alfalah, Allied), and Visa/Mastercard Debit and Credit Cards through our verified SBP-licensed aggregator partners.'
              },
              {
                q: 'Are there hidden charges or per-SMS fees when sending customer balance alerts?',
                icon: MessageSquare,
                iconColor: 'text-[#45f1ba]',
                a: "No hidden fees. Free and Pro plans include standard system SMS balance confirmations. WhatsApp payment reminders and automated invoice PDFs utilize your phone's direct native WhatsApp client at zero platform surcharge."
              }
            ].map((faq, idx) => {
              const Icon = faq.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#161c27] overflow-hidden shadow-sm border border-[#242a36]"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left flex items-center justify-between text-[#dde2f3] hover:bg-[#1a202b] transition-colors"
                  >
                    <span className="text-sm sm:text-base font-semibold flex items-center gap-3">
                      <Icon className={`w-5 h-5 shrink-0 ${faq.iconColor}`} />
                      {faq.q}
                    </span>
                    {openFaq === idx ? (
                      <ChevronUp className="w-5 h-5 text-[#45f1ba] shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#bacac1] shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="p-5 pt-0 text-xs sm:text-sm text-[#bacac1] leading-relaxed border-t border-[#1a202b] mt-1 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Verified Merchant Footprint & Physical Presence Section */}
      <section className="w-full py-16 md:py-20 px-4 md:px-8 bg-[#080e19] border-b border-[#17233b]">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex items-center gap-2">
            <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#45f1ba] uppercase tracking-widest">
              Institutional Merchant Verification
            </span>
            <span className="px-2 py-0.5 rounded bg-[#1a202b] text-[#bacac1] font-['JetBrains_Mono'] text-[11px] border border-[#242a36]">
              Audit Verification Dossier
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Registered Entity */}
            <div className="p-6 rounded-2xl bg-[#161c27] border border-[#242a36] flex flex-col gap-4 shadow-md">
              <div className="flex items-center gap-3">
                <img
                  src={logoImg}
                  alt="DigiHisab Logo"
                  className="h-11 w-11 object-contain rounded-xl border border-[#242a36]"
                />
                <div>
                  <h3 className="text-base font-bold text-[#dde2f3]">Registered Entity</h3>
                  <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#45f1ba]">
                    SECP Reg: Private Limited
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <span className="text-sm font-bold text-[#dde2f3]">Legal Incorporation Name:</span>
                <p className="text-[#bacac1]">DigiHisab Technologies (Private) Limited</p>
                <span className="text-sm font-bold text-[#dde2f3] pt-2">Federal Board of Revenue (FBR):</span>
                <p className="text-[#bacac1] font-['JetBrains_Mono']">Active Taxpayer NTN: 9283011-4</p>
                <span className="text-sm font-bold text-[#dde2f3] pt-2">Corporate Governance:</span>
                <p className="text-[#bacac1] leading-relaxed">
                  Compliant with SBP circulars on Payment Intermediary Software and Open Ledger Frameworks.
                </p>
              </div>
            </div>

            {/* Column 2: Physical Headquarters & Map Visual */}
            <div className="p-6 rounded-2xl bg-[#161c27] border border-[#242a36] flex flex-col gap-4 shadow-md">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#89ceff]" />
                <h3 className="text-base font-bold text-[#dde2f3]">Physical Office Hubs</h3>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-[#bacac1]">
                <p className="text-[#dde2f3] font-bold text-sm">Faisalabad Headquarters:</p>
                <p>Commercial Executive Suites, Main Susan Road, Madina Town, Faisalabad, Punjab, Pakistan</p>
                <p className="text-[#dde2f3] font-bold text-sm pt-2">Lahore Liaison Office:</p>
                <p>Tech Hub Floor, Main Boulevard, Gulberg III, Lahore, Punjab, Pakistan</p>
              </div>

              {/* Verified Map Widget */}
              <div className="w-full h-28 rounded-xl bg-[#1a202b] border border-[#242a36] flex items-center justify-center text-[#bacac1] font-['JetBrains_Mono'] text-xs shadow-inner mt-auto">
                <span className="flex items-center gap-2 text-[#89ceff]">
                  <MapPin className="w-4 h-4 text-[#89ceff]" />
                  Verified Sovereign Location: Faisalabad Tech Campus
                </span>
              </div>
            </div>

            {/* Column 3: Direct Support & Clearing Rails */}
            <div className="p-6 rounded-2xl bg-[#161c27] border border-[#242a36] flex flex-col justify-between gap-4 shadow-md">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-[#45f1ba]" />
                  <h3 className="text-base font-bold text-[#dde2f3]">Merchant Support &amp; Billing</h3>
                </div>
                <div className="flex flex-col gap-1.5 text-xs">
                  <span className="text-sm font-bold text-[#dde2f3]">Helpline &amp; Direct WhatsApp:</span>
                  <a
                    href="https://wa.me/923189663004"
                    target="_blank"
                    rel="noreferrer"
                    className="font-['JetBrains_Mono'] text-sm font-bold text-[#45f1ba] hover:underline flex items-center gap-1.5"
                  >
                    +92 318 9663004
                    <ExternalLink className="w-3 h-3 text-[#bacac1]" />
                  </a>
                  <span className="text-sm font-bold text-[#dde2f3] pt-2">Official Support Inquiries:</span>
                  <a
                    href="mailto:muhammad110jb@gmail.com"
                    className="text-[#bacac1] hover:text-[#dde2f3] font-['JetBrains_Mono'] flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#89ceff]" />
                    muhammad110jb@gmail.com / support@digihisab.pk
                  </a>
                  <span className="text-sm font-bold text-[#dde2f3] pt-1">Escrow &amp; Refund Requests:</span>
                  <a href="mailto:payments@digihisab.pk" className="text-[#bacac1] hover:text-[#dde2f3] font-['JetBrains_Mono']">
                    payments@digihisab.pk
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-[#242a36]">
                <span className="font-['JetBrains_Mono'] text-[11px] text-[#bacac1] uppercase">
                  Certified Clearing Badges:
                </span>
                <div className="flex flex-wrap gap-1.5 font-['JetBrains_Mono'] text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-[#242a36] text-[#45f1ba] border border-[#3b4a43]">
                    Raast P2M
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#242a36] text-[#89ceff] border border-[#3b4a43]">
                    JazzCash
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#242a36] text-[#89ceff] border border-[#3b4a43]">
                    EasyPaisa
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#242a36] text-[#cbd7f7] border border-[#3b4a43]">
                    PayFast 3DS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#242a36] text-[#dde2f3] border border-[#3b4a43]">
                    Visa / Mastercard
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer matching code.html */}
      <footer className="w-full bg-[#080e19] pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col gap-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src={logoImg}
                  alt="DigiHisab Logo"
                  className="h-7 w-auto object-contain rounded-md"
                />
                <span className="font-['Space_Grotesk'] text-lg font-bold text-[#dde2f3]">DigiHisab</span>
              </div>
              <p className="text-xs text-[#bacac1] leading-relaxed">
                Institutional-grade ledger orchestration, SBP-aligned settlement compliance, and high-velocity reconciliation infrastructure for Pakistani enterprises.
              </p>
              <div className="flex items-center gap-2 pt-1 font-['JetBrains_Mono'] text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[#1a202b] text-[#45f1ba] border border-[#242a36]">
                  FBR Active NTN
                </span>
                <span className="px-2 py-0.5 rounded bg-[#1a202b] text-[#89ceff] border border-[#242a36]">
                  SECP Registered
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-[#dde2f3]">Corporate Headquarters</span>
              <div className="flex flex-col gap-1 text-xs text-[#bacac1]">
                <p className="text-[#dde2f3] font-semibold">Faisalabad Tech Campus:</p>
                <p>Executive Suites, Main Susan Road, Madina Town, Faisalabad, Punjab, Pakistan</p>
                <p className="text-[#dde2f3] font-semibold pt-2">Lahore Liaison Office:</p>
                <p>Gulberg III, Main Boulevard, Lahore, Pakistan</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-[#dde2f3]">Assurance &amp; Guarantees</span>
              <div className="p-4 rounded-xl bg-[#161c27] border border-[#242a36] flex flex-col gap-1.5">
                <span className="text-sm font-bold text-[#45f1ba]">7-Day Escrow Refund</span>
                <p className="text-xs text-[#bacac1] leading-relaxed">
                  Zero-lockin SLA guarantee for all subscription tiers. 100% cloud ledger audit exportability upon offboarding.
                </p>
                <span className="font-['JetBrains_Mono'] text-xs font-semibold text-[#89ceff] pt-1">
                  Helpline: +92 318 9663004
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-[#dde2f3]">National Payment Rails</span>
              <p className="text-xs text-[#bacac1]">
                Interoperable multi-rail transaction clearance supported across Pakistan.
              </p>
              <div className="flex flex-wrap gap-2 font-['JetBrains_Mono'] text-xs">
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#dde2f3] border border-[#242a36]">
                  RAAST P2M
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#dde2f3] border border-[#242a36]">
                  1LINK PayPak
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#dde2f3] border border-[#242a36]">
                  Visa / MC
                </span>
                <span className="px-2.5 py-1 rounded bg-[#1a202b] text-[#dde2f3] border border-[#242a36]">
                  Kuickpay API
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#1a202b] text-xs text-[#bacac1]">
            <p>© {new Date().getFullYear()} DigiHisab Technologies (Private) Limited. All sovereign and fiscal rights reserved.</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setActivePolicy('privacy');
                  document.getElementById('compliance-tabs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#dde2f3] transition-colors"
              >
                Privacy Policy
              </button>
              <button
                onClick={() => {
                  setActivePolicy('terms');
                  document.getElementById('compliance-tabs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#dde2f3] transition-colors"
              >
                Terms of Merchant Service
              </button>
              <button
                onClick={() => {
                  setActivePolicy('refund');
                  document.getElementById('compliance-tabs')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="hover:text-[#dde2f3] transition-colors"
              >
                SBP Regulatory Disclosures
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Onboarding & Checkout Modal */}
      {selectedPlanForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#161c27] border border-[#242a36] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#080e19] border-b border-[#242a36] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={logoImg}
                  alt="DigiHisab Logo"
                  className="w-6 h-6 object-contain rounded-md"
                />
                <h3 className="text-sm font-bold text-[#dde2f3]">
                  Activate {selectedPlanForModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPlanForModal(null)}
                className="text-[#bacac1] hover:text-[#dde2f3] p-1 rounded-lg hover:bg-[#1a202b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!checkoutComplete ? (
                <form onSubmit={handleSimulatedSubmit} className="space-y-4">
                  {/* Selected Plan Summary Banner */}
                  <div className="p-4 rounded-xl bg-[#080e19] border border-[#242a36] flex items-center justify-between">
                    <div>
                      <div className="text-xs text-[#bacac1]">Selected Subscription Tier</div>
                      <div className="text-sm font-bold text-[#dde2f3]">
                        {selectedPlanForModal.name}
                      </div>
                      <div className="text-[11px] text-[#45f1ba] font-urdu" dir="rtl">
                        {selectedPlanForModal.urduName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-[#45f1ba] font-['Space_Grotesk']">
                        {selectedPlanForModal.price}
                      </div>
                      <div className="text-[10px] text-[#bacac1]">
                        {selectedPlanForModal.billingPeriod}
                      </div>
                    </div>
                  </div>

                  {/* Customer Information Inputs */}
                  <div>
                    <label className="block text-xs font-semibold text-[#dde2f3] mb-1">
                      Subscriber Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Aslam"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080e19] border border-[#242a36] text-xs text-[#dde2f3] focus:outline-none focus:border-[#00d49f]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#dde2f3] mb-1">
                        Pakistani Mobile (+92)
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0318 1234567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080e19] border border-[#242a36] text-xs text-[#dde2f3] focus:outline-none focus:border-[#00d49f]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#dde2f3] mb-1">
                        Shop or Household Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Al-Madina Super Store"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#080e19] border border-[#242a36] text-xs text-[#dde2f3] focus:outline-none focus:border-[#00d49f]"
                      />
                    </div>
                  </div>

                  {/* Payment Channel Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-[#dde2f3] mb-1.5">
                      Select Payment Gateway Rail
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentRail('raast')}
                        className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                          paymentRail === 'raast'
                            ? 'bg-[#00d49f]/10 border-[#00d49f] text-[#45f1ba]'
                            : 'bg-[#080e19] border-[#242a36] text-[#bacac1] hover:border-slate-500'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <QrCode className="w-3.5 h-3.5 text-[#45f1ba]" />
                            Raast P2M
                          </span>
                          {paymentRail === 'raast' && <span className="text-[10px]">● Active</span>}
                        </div>
                        <div className="text-[10px] text-[#bacac1] mt-0.5">Instant SBP QR / ID</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentRail('jazzcash')}
                        className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                          paymentRail === 'jazzcash'
                            ? 'bg-red-500/10 border-red-500 text-red-400'
                            : 'bg-[#080e19] border-[#242a36] text-[#bacac1] hover:border-slate-500'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>JazzCash</span>
                          {paymentRail === 'jazzcash' && <span className="text-[10px]">● Active</span>}
                        </div>
                        <div className="text-[10px] text-[#bacac1] mt-0.5">Mobile Account MPIN</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentRail('easypaisa')}
                        className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                          paymentRail === 'easypaisa'
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-[#080e19] border-[#242a36] text-[#bacac1] hover:border-slate-500'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>EasyPaisa</span>
                          {paymentRail === 'easypaisa' && <span className="text-[10px]">● Active</span>}
                        </div>
                        <div className="text-[10px] text-[#bacac1] mt-0.5">In-App Push Approval</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentRail('card')}
                        className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${
                          paymentRail === 'card'
                            ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                            : 'bg-[#080e19] border-[#242a36] text-[#bacac1] hover:border-slate-500'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>Debit/Credit Card</span>
                          {paymentRail === 'card' && <span className="text-[10px]">● Active</span>}
                        </div>
                        <div className="text-[10px] text-[#bacac1] mt-0.5">Visa / Mastercard 3DS</div>
                      </button>
                    </div>
                  </div>

                  {/* Reassurance note */}
                  <div className="p-3 rounded-xl bg-[#080e19] border border-[#242a36] flex items-center gap-2 text-xs text-[#bacac1]">
                    <ShieldCheck className="w-4 h-4 text-[#45f1ba] shrink-0" />
                    <span>7-day unconditional refund applies to this payment.</span>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-[#00d49f] hover:bg-[#45f1ba] text-[#003828] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#00d49f]/20 transition-all"
                  >
                    Confirm &amp; Complete Activation
                  </button>
                </form>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#00d49f]/15 border border-[#00d49f]/30 flex items-center justify-center text-[#45f1ba] mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-[#dde2f3]">
                      Order Provisioned Successfully!
                    </h4>
                    <p className="text-xs text-[#bacac1] mt-1 max-w-sm mx-auto leading-relaxed">
                      Thank you, <strong className="text-white">{customerName || 'Subscriber'}</strong>. Your subscription to{' '}
                      <strong className="text-[#45f1ba]">{selectedPlanForModal.name}</strong> for{' '}
                      <span className="text-white">{businessName || 'your ledger'}</span> has been initialized.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#080e19] border border-[#242a36] text-left text-xs space-y-2">
                    <div className="flex justify-between text-[#bacac1]">
                      <span>Gateway Rail:</span>
                      <span className="font-semibold text-white uppercase">{paymentRail}</span>
                    </div>
                    <div className="flex justify-between text-[#bacac1]">
                      <span>Transaction Ref:</span>
                      <span className="font-['JetBrains_Mono'] text-[#45f1ba] font-bold">
                        DH-{Math.floor(100000 + Math.random() * 900000)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#bacac1]">
                      <span>Access Status:</span>
                      <span className="text-[#45f1ba] font-semibold">Instant Webhook Live</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#bacac1]">
                    A copy of the confirmation receipt has been dispatched to{' '}
                    <strong className="text-slate-200">{customerPhone || '+92 318 XXXXXXX'}</strong>.
                  </p>

                  <button
                    onClick={() => setSelectedPlanForModal(null)}
                    className="w-full py-3 rounded-xl bg-[#242a36] hover:bg-[#333946] text-[#dde2f3] text-xs font-semibold transition-colors border border-[#3b4a43]"
                  >
                    Done &amp; Return to Portal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
