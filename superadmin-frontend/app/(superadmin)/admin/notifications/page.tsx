'use client';

import React, { useState } from 'react';
import {
  Bell,
  Send,
  Smartphone,
  Radio,
  Sparkles,
  Users,
  Store,
  Home,
  CheckCircle2,
  Volume2,
  Layers,
  ArrowRight,
  Mail
} from 'lucide-react';
import { adminUserService } from '@/lib/admin-api';

export default function NotificationDispatcherPage() {
  const [activeTab, setActiveTab] = useState<'FCM_PUSH' | 'EMAIL_MARKETING'>('FCM_PUSH');

  // FCM Push Notification Form State
  const [title, setTitle] = useState('New Stock Inward Alert & Udhaar Due Notice');
  const [titleUrdu, setTitleUrdu] = useState('محترم دکاندار! بقایا ادھار کی وصولی کے لیے نیا پیغام');
  const [body, setBody] = useState('Your customer payment is overdue by 5 days. Tap to send free automated WhatsApp reminder with 1-tap JazzCash link.');
  const [bodyUrdu, setBodyUrdu] = useState('آپ کے گاہک کے بقایا جات 5 دن سے واجب الادا ہیں۔ کسٹمر کو واٹس ایپ میسج بھیجنے کے لیے کلک کریں۔');
  const [channel, setChannel] = useState<'FCM_PUSH' | 'IN_APP_TOAST' | 'BOTH'>('BOTH');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'DUKANDAR' | 'HOUSEHOLD'>('DUKANDAR');
  const [deepLinkRoute, setDeepLinkRoute] = useState('/retail/khata/pending-receivables');
  const [soundAlert, setSoundAlert] = useState('alert_high.mp3');
  const [isUrduPreview, setIsUrduPreview] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Email Marketing Form State
  const [emailSubject, setEmailSubject] = useState('DigiHisab Special Dukandar POS Offer & SBP Raast Guide');
  const [emailAudience, setEmailAudience] = useState<'ALL' | 'DUKANDAR' | 'HOUSEHOLD'>('DUKANDAR');
  const [emailTemplate, setEmailTemplate] = useState<'CUSTOM' | 'WELCOME' | 'OTP'>('CUSTOM');
  const [emailBodyUrdu, setEmailBodyUrdu] = useState('محترم دکاندار بھائی، اب آپ کے کاؤنٹر پر راست (Raast P2M) اور جاز کیش کی تمام ٹرانزیکشنز پر 0% فیس ہے۔ کسٹمر سے ادھار کی آن لائن وصولی کے لیے کھاتہ اوپن کریں۔');
  const [emailBodyEnglish, setEmailBodyEnglish] = useState('Zero transaction interchange fees on all Raast P2M settlements this month. Upgrade your store POS today.');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<string | null>(null);

  // Push Broadcast Status State
  const [pushSending, setPushSending] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  const handleDispatchPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setPushSending(true);
    setPushResult(null);

    try {
      const res = await adminUserService.dispatchNotificationBroadcast({
        title,
        body,
        titleUrdu,
        bodyUrdu,
        targetAudience,
        channel,
        deepLinkRoute,
        soundAlert,
      });

      setBroadcastSent(true);
      const sseCount = res?.data?.liveSseClientsDispatched ?? 0;
      const reachCount = res?.data?.estimatedDevicesReached ?? (targetAudience === 'ALL' ? 9302 : targetAudience === 'DUKANDAR' ? 3410 : 5892);
      setPushResult(`🚀 Broadcast live! Dispatched to ${reachCount.toLocaleString()} devices (${sseCount} active real-time SSE stream${sseCount === 1 ? '' : 's'}).`);
      setTimeout(() => setBroadcastSent(false), 5500);
    } catch (err: any) {
      setPushResult(`Broadcast failed: ${err.message}`);
    } finally {
      setPushSending(false);
    }
  };

  const handleDispatchEmailMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSending(true);
    setEmailResult(null);

    try {
      const res = await adminUserService.dispatchBulkEmail({
        recipientType: 'AUDIENCE',
        audience: emailAudience,
        subject: emailSubject,
        templateType: emailTemplate,
        customBody: emailBodyEnglish,
        customBodyUrdu: emailBodyUrdu,
      });

      setEmailResult(res.message || 'Email marketing campaign successfully dispatched via Gmail SMTP!');
    } catch (err: any) {
      setEmailResult(`Failed: ${err.message}`);
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      {/* Toast Notice */}
      {broadcastSent && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{pushResult || `FCM Push & In-App Banner dispatched for ${targetAudience === 'ALL' ? '9,302' : targetAudience === 'DUKANDAR' ? '3,410' : '5,892'} devices!`}</span>
        </div>
      )}

      {emailResult && (
        <div className="fixed top-16 right-6 z-50 rounded-xl bg-slate-900 border border-[#00d49f] px-4 py-3 text-xs font-mono text-[#00d49f] shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          <span>{emailResult}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/20 text-[#00d49f]">
              <Bell className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Broadcast & Communication Dispatcher</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch urgent FCM mobile push announcements, in-app tickers, and bilingual Gmail SMTP newsletters
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#0d1627] border border-[#17233b] text-xs font-mono">
          <button
            onClick={() => setActiveTab('FCM_PUSH')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'FCM_PUSH'
                ? 'bg-[#00d49f] text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>FCM Push + Android Frame</span>
          </button>
          <button
            onClick={() => setActiveTab('EMAIL_MARKETING')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'EMAIL_MARKETING'
                ? 'bg-[#00d49f] text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Marketing (SMTP)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FCM Mobile Push Notification View */}
      {activeTab === 'FCM_PUSH' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-150">
          
          {/* Left Form */}
          <div className="lg:col-span-7 rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#00d49f]" />
              <span>FCM Push Campaign Configuration</span>
            </h2>

            <form onSubmit={handleDispatchPush} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1.5">1. Target Audience Segmentation</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetAudience('DUKANDAR')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      targetAudience === 'DUKANDAR'
                        ? 'border-[#00d49f] bg-[#00d49f]/10 text-white'
                        : 'border-[#17233b] bg-[#070d18] text-slate-400'
                    }`}
                  >
                    <Store className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold">🏪 Dukandars</span>
                    <span className="text-[9px] text-slate-500">Retail Stores (3,410)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('HOUSEHOLD')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      targetAudience === 'HOUSEHOLD'
                        ? 'border-sky-400 bg-sky-500/10 text-white'
                        : 'border-[#17233b] bg-[#070d18] text-slate-400'
                    }`}
                  >
                    <Home className="h-4 w-4 text-sky-400" />
                    <span className="font-bold">🏠 Ghar Ka Hisab</span>
                    <span className="text-[9px] text-slate-500">Households (5,892)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('ALL')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      targetAudience === 'ALL'
                        ? 'border-purple-400 bg-purple-500/10 text-white'
                        : 'border-[#17233b] bg-[#070d18] text-slate-400'
                    }`}
                  >
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="font-bold">🌐 All Users</span>
                    <span className="text-[9px] text-slate-500">Total (9,302)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1.5">2. Dispatch Channels</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'BOTH', label: 'FCM Push + In-App' },
                    { id: 'FCM_PUSH', label: 'System Tray Push (FCM)' },
                    { id: 'IN_APP_TOAST', label: 'In-App Ticker (SSE)' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setChannel(c.id as any)}
                      className={`py-2 px-3 rounded-xl border text-center font-bold transition text-[11px] ${
                        channel === c.id
                          ? 'border-[#00d49f] bg-[#00d49f]/20 text-[#00d49f]'
                          : 'border-[#17233b] bg-[#070d18] text-slate-400'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-slate-400 uppercase text-[10px] block mb-1">Title (English)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                  />
                </div>

                <div>
                  <label className="text-slate-400 uppercase text-[10px] block mb-1">Body Text (English)</label>
                  <textarea
                    rows={2}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#17233b]">
                <div>
                  <label className="text-slate-400 uppercase text-[10px] block mb-1">عنوان (اردو - اختیاری)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={titleUrdu}
                    onChange={(e) => setTitleUrdu(e.target.value)}
                    className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2.5 text-xs text-emerald-300 font-sans focus:outline-none focus:border-[#00d49f]"
                  />
                </div>

                <div>
                  <label className="text-slate-400 uppercase text-[10px] block mb-1">پیغام کی تفصیل (اردو)</label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={bodyUrdu}
                    onChange={(e) => setBodyUrdu(e.target.value)}
                    className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2.5 text-xs text-emerald-300 font-sans focus:outline-none focus:border-[#00d49f]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-slate-400 uppercase text-[10px] block mb-1">In-App Deep Link Route</label>
                  <input
                    type="text"
                    value={deepLinkRoute}
                    onChange={(e) => setDeepLinkRoute(e.target.value)}
                    className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#00d49f]"
                  />
                </div>
                <div>
                  <label className="text-slate-400 uppercase text-[10px] block mb-1">Sound Chime</label>
                  <select
                    value={soundAlert}
                    onChange={(e) => setSoundAlert(e.target.value)}
                    className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#00d49f]"
                  >
                    <option value="alert_high.mp3">alert_high.mp3 (Urgent)</option>
                    <option value="cash_chime.mp3">cash_chime.mp3 (Payment)</option>
                    <option value="default_bell.mp3">default_bell.mp3 (Standard)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={pushSending}
                className="w-full rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 disabled:opacity-50 text-slate-950 font-black py-3 text-xs tracking-wider uppercase transition shadow-lg shadow-[#00d49f]/10 flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{pushSending ? 'Broadcasting via SSE & FCM...' : 'Broadcast Mobile Notification'}</span>
              </button>
            </form>
          </div>

          {/* Right Android Device Mock Simulator */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono text-slate-400">Preview Language:</span>
              <button
                type="button"
                onClick={() => setIsUrduPreview(false)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  !isUrduPreview ? 'bg-[#00d49f] text-slate-950' : 'bg-[#0d1627] text-slate-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setIsUrduPreview(true)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                  isUrduPreview ? 'bg-[#00d49f] text-slate-950' : 'bg-[#0d1627] text-slate-400'
                }`}
              >
                اردو (Urdu)
              </button>
            </div>

            {/* Android Frame */}
            <div className="w-[320px] h-[640px] rounded-[42px] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl relative flex flex-col justify-between overflow-hidden">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-800 border border-slate-700"></div>
                <div className="h-1.5 w-12 rounded-full bg-slate-800"></div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-3 pt-5">
                <span>12:45 PM</span>
                <div className="flex items-center gap-1.5">
                  <span>Jazz 4G</span>
                  <span>88%</span>
                </div>
              </div>

              <div className="mt-4 space-y-3 z-20">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur space-y-2 animate-bounce">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-lg bg-[#00d49f] flex items-center justify-center font-black text-slate-950 text-[10px]">
                        DH
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white leading-tight">Digi Hisab</div>
                        <div className="text-[9px] text-slate-400">Just now • High Priority</div>
                      </div>
                    </div>
                    <Volume2 className="h-3.5 w-3.5 text-[#00d49f]" />
                  </div>

                  <div className={`${isUrduPreview ? 'text-right font-sans' : 'text-left font-sans'}`}>
                    <div className="text-xs font-bold text-white">
                      {isUrduPreview ? titleUrdu : title}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 leading-snug">
                      {isUrduPreview ? bodyUrdu : body}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#00d49f] font-bold">TAP TO OPEN KHATA</span>
                    <ArrowRight className="h-3 w-3 text-[#00d49f]" />
                  </div>
                </div>

                <div className="rounded-xl border border-[#00d49f]/40 bg-[#00d49f]/10 p-2 text-center text-[10px] font-mono text-[#00d49f]">
                  In-App Push Banner Trigger: Active
                </div>
              </div>

              <div className="rounded-2xl bg-[#070d18] border border-slate-800 p-4 space-y-3 my-auto">
                <div className="text-[11px] font-bold text-slate-400 uppercase">Retail Counter POS</div>
                <div className="h-8 rounded bg-slate-800/60"></div>
                <div className="h-8 rounded bg-slate-800/60"></div>
                <div className="h-8 rounded bg-slate-800/60"></div>
              </div>

              <div className="flex justify-center pb-2">
                <div className="h-1 w-28 rounded-full bg-slate-600"></div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Email Marketing Dispatcher View */}
      {activeTab === 'EMAIL_MARKETING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-150">
          
          <div className="lg:col-span-7 rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#00d49f]" />
                <span>Bulk Email Campaign Composer</span>
              </h2>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Gmail Relay: 465 SSL
              </span>
            </div>

            <form onSubmit={handleDispatchEmailMarketing} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1.5">1. Target Recipient Segment</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailAudience('DUKANDAR')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      emailAudience === 'DUKANDAR'
                        ? 'border-[#00d49f] bg-[#00d49f]/10 text-white'
                        : 'border-[#17233b] bg-[#070d18] text-slate-400'
                    }`}
                  >
                    <Store className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold">Dukandars (3,410)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailAudience('HOUSEHOLD')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      emailAudience === 'HOUSEHOLD'
                        ? 'border-sky-400 bg-sky-500/10 text-white'
                        : 'border-[#17233b] bg-[#070d18] text-slate-400'
                    }`}
                  >
                    <Home className="h-4 w-4 text-sky-400" />
                    <span className="font-bold">Households (5,892)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailAudience('ALL')}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                      emailAudience === 'ALL'
                        ? 'border-purple-400 bg-purple-500/10 text-white'
                        : 'border-[#17233b] bg-[#070d18] text-slate-400'
                    }`}
                  >
                    <Users className="h-4 w-4 text-purple-400" />
                    <span className="font-bold">All Accounts (9,302)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Template Preset</label>
                <select
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value as any)}
                  className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                >
                  <option value="CUSTOM">Custom Campaign (Bilingual Urdu/English)</option>
                  <option value="WELCOME">Dukandar POS Welcome Newsletter</option>
                  <option value="OTP">Security & KYC Pin Verification Notice</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Email Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Urdu Message (اردو پیغام)</label>
                <textarea
                  rows={3}
                  dir="rtl"
                  value={emailBodyUrdu}
                  onChange={(e) => setEmailBodyUrdu(e.target.value)}
                  className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-emerald-300 font-sans focus:outline-none focus:border-[#00d49f]"
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">English Message Details</label>
                <textarea
                  rows={3}
                  value={emailBodyEnglish}
                  onChange={(e) => setEmailBodyEnglish(e.target.value)}
                  className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                />
              </div>

              <button
                type="submit"
                disabled={emailSending}
                className="w-full rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 disabled:opacity-50 text-slate-950 font-black py-3 text-xs tracking-wider uppercase transition shadow-lg shadow-[#00d49f]/10 flex items-center justify-center gap-2 mt-4"
              >
                <Send className="h-4 w-4" />
                <span>{emailSending ? 'Transmitting via Gmail SMTP...' : 'Transmit Bulk Email Broadcast'}</span>
              </button>
            </form>
          </div>

          {/* Right Live HTML Email Card Simulator */}
          <div className="lg:col-span-5 rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <span className="text-xs font-mono text-slate-400 uppercase">Live Desktop Email Client Simulator</span>
              <span className="text-[10px] font-mono text-[#00d49f]">HTML Responsive</span>
            </div>

            <div className="rounded-xl border border-slate-700 bg-[#070d18] p-5 space-y-4 font-sans text-slate-200">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between text-xs font-mono text-slate-400">
                <div>From: <span className="text-white font-bold">DigiHisab Official</span> &lt;hisabdigi@gmail.com&gt;</div>
                <div>To: <span className="text-[#00d49f] font-bold">{emailAudience === 'ALL' ? 'all-users@...' : emailAudience === 'DUKANDAR' ? 'dukandars@...' : 'households@...'}</span></div>
              </div>

              <div className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                {emailSubject}
              </div>

              <div className="space-y-3 pt-1">
                <div className="h-8 w-28 rounded bg-[#00d49f]/20 border border-[#00d49f]/30 flex items-center justify-center font-bold text-[#00d49f] text-xs">
                  DigiHisab
                </div>

                <div dir="rtl" className="text-xs text-emerald-300 font-sans leading-relaxed bg-[#0d1627] p-3 rounded-lg border border-[#17233b]">
                  {emailBodyUrdu}
                </div>

                <div className="text-xs text-slate-300 leading-relaxed">
                  {emailBodyEnglish}
                </div>

                <div className="pt-3 text-center">
                  <div className="inline-block bg-[#00d49f] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs font-mono">
                    Open Khata App
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center font-mono">
                  DigiHisab Technologies • Zero-Trust Financial Administration • Pakistan
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
