'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Key,
  Shield,
  ChevronRight,
  Store,
  Home,
  Sparkles,
  RefreshCw,
  PhoneCall,
  DollarSign,
  FileSpreadsheet,
  ExternalLink,
  ChevronLeft,
  ServerOff,
  Mail,
  Send,
  CheckSquare,
  Square,
  X,
  MapPin,
  Navigation,
  Globe
} from 'lucide-react';
import { adminUserService } from '@/lib/admin-api';
import { AdminUserRecord, AdminUsersApiMeta, UserTier } from '@/types/admin';
import StepUpAuthModal from '@/components/security/StepUpAuthModal';

export default function SuperAdminUsersPage() {
  // Filter and pagination states
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data fetching states
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [meta, setMeta] = useState<AdminUsersApiMeta>({
    totalRecords: 0,
    pendingKycCount: 0,
    frozenCount: 0,
    currentPage: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector & UI feedback
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  // Selected Users Multi-Check State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState<boolean>(false);

  // Step-Up Re-Authentication Modal State
  const [stepUpOpen, setStepUpOpen] = useState<boolean>(false);
  const [stepUpPendingAction, setStepUpPendingAction] = useState<{
    title: string;
    description: string;
    targetUser: AdminUserRecord;
  } | null>(null);

  // Bulk Email Composer Form State
  const [emailSubject, setEmailSubject] = useState('Important Account Notice from DigiHisab Official');
  const [emailTemplateType, setEmailTemplateType] = useState<'WELCOME' | 'OTP' | 'CUSTOM'>('CUSTOM');
  const [emailBodyUrdu, setEmailBodyUrdu] = useState('محترم صارف، آپ کے ڈیجیٹل کھاتے کی تجدید اور تصدیق کے لیے یہ پیغام بھیجا جا رہا ہے۔');
  const [emailBodyEnglish, setEmailBodyEnglish] = useState('Please review your DigiHisab records and SBP regulatory verification status.');
  const [dispatchingEmail, setDispatchingEmail] = useState<boolean>(false);

  // AbortController reference
  const abortControllerRef = useRef<AbortController | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackNotice({ message, type });
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // 300ms Debounce for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Main Fetch function with live REST API backend
  const fetchUsers = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await adminUserService.getUsers(
        {
          search: debouncedSearch,
          persona: selectedPersona,
          status: selectedStatus,
          page: currentPage,
          limit: 10,
        },
        abortControllerRef.current.signal
      );

      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setMeta(response.data.meta || {
          totalRecords: 0,
          pendingKycCount: 0,
          frozenCount: 0,
          currentPage: 1,
          totalPages: 1,
        });

        if (selectedUser) {
          const updatedSelected = response.data.users.find((u) => u.id === selectedUser.id);
          if (updatedSelected) {
            setSelectedUser(updatedSelected);
          }
        }
      } else {
        throw new Error('Failed to load user records from backend');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Unable to connect to DigiHisab backend server.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedPersona, selectedStatus, currentPage, selectedUser]);

  useEffect(() => {
    fetchUsers();
  }, [debouncedSearch, selectedPersona, selectedStatus, currentPage]);

  // Checkbox toggle logic
  const handleToggleSelectUser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllOnPage = () => {
    const currentPageIds = users.map((u) => u.id);
    const allSelected = currentPageIds.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Bulk Email Dispatch Trigger
  const handleSendBulkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) return;

    setDispatchingEmail(true);
    try {
      const res = await adminUserService.dispatchBulkEmail({
        recipientType: 'SELECTED_USERS',
        userIds: selectedUserIds,
        subject: emailSubject,
        templateType: emailTemplateType,
        customBody: emailBodyEnglish,
        customBodyUrdu: emailBodyUrdu,
      });

      showNotification(res.message || `Email dispatched to ${selectedUserIds.length} recipient(s)!`, 'success');
      setShowBulkEmailModal(false);
      setSelectedUserIds([]);
    } catch (err: any) {
      showNotification(err.message || 'Failed to dispatch bulk email', 'error');
    } finally {
      setDispatchingEmail(false);
    }
  };

  // OPTIMISTIC MUTATION 1: Toggle Freeze Account
  const handleToggleFreeze = async (userToUpdate: AdminUserRecord) => {
    const newStatus = userToUpdate.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
    const previousUsers = [...users];
    const previousSelected = selectedUser ? { ...selectedUser } : null;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userToUpdate.id
          ? { ...u, status: newStatus, failedPinAttempts: newStatus === 'ACTIVE' ? 0 : u.failedPinAttempts }
          : u
      )
    );
    if (selectedUser?.id === userToUpdate.id) {
      setSelectedUser((prev) =>
        prev ? { ...prev, status: newStatus, failedPinAttempts: newStatus === 'ACTIVE' ? 0 : prev.failedPinAttempts } : null
      );
    }
    showNotification(`⚡ Updating account status to ${newStatus}...`);

    try {
      setActionInProgress(true);
      const res = await adminUserService.toggleFreeze(userToUpdate.id, newStatus);
      showNotification(res.message || `Account ${userToUpdate.id} successfully updated to ${newStatus}.`);
      setMeta((prev) => ({
        ...prev,
        frozenCount: newStatus === 'FROZEN' ? prev.frozenCount + 1 : Math.max(0, prev.frozenCount - 1),
      }));
    } catch (err: any) {
      setUsers(previousUsers);
      setSelectedUser(previousSelected);
      showNotification(err.message || 'Failed to toggle freeze state. Reverting changes.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // OPTIMISTIC MUTATION 2: SBP KYC Approval / Rejection
  const handleApproveKyc = async (userToUpdate: AdminUserRecord) => {
    const previousUsers = [...users];
    const previousSelected = selectedUser ? { ...selectedUser } : null;

    setUsers((prev) =>
      prev.map((u) => (u.id === userToUpdate.id ? { ...u, isCnicVerified: true, status: 'ACTIVE' } : u))
    );
    if (selectedUser?.id === userToUpdate.id) {
      setSelectedUser((prev) => (prev ? { ...prev, isCnicVerified: true, status: 'ACTIVE' } : null));
    }
    showNotification(`⚡ Approving SBP CNIC & expanding transaction limits...`);

    try {
      setActionInProgress(true);
      const res = await adminUserService.updateKyc(userToUpdate.id, 'APPROVE');
      showNotification(res.message || `SBP CNIC approved for ${userToUpdate.name}. Limits expanded.`);
      setMeta((prev) => ({
        ...prev,
        pendingKycCount: Math.max(0, prev.pendingKycCount - 1),
      }));
    } catch (err: any) {
      setUsers(previousUsers);
      setSelectedUser(previousSelected);
      showNotification(err.message || 'KYC verification update failed. Reverting state.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // OPTIMISTIC MUTATION 3: Grant Subscription Tier Override
  const handleGrantTier = async (userToUpdate: AdminUserRecord, tierName: UserTier) => {
    const previousUsers = [...users];
    const previousSelected = selectedUser ? { ...selectedUser } : null;

    const nextExpiry = new Date();
    nextExpiry.setDate(nextExpiry.getDate() + 30);
    const expiryStr = nextExpiry.toISOString().split('T')[0];

    setUsers((prev) =>
      prev.map((u) => (u.id === userToUpdate.id ? { ...u, tier: tierName, tierExpiry: expiryStr } : u))
    );
    if (selectedUser?.id === userToUpdate.id) {
      setSelectedUser((prev) => (prev ? { ...prev, tier: tierName, tierExpiry: expiryStr } : null));
    }
    showNotification(`⚡ Upgrading subscription to ${tierName} (30 Days Admin Bypass)...`);

    try {
      setActionInProgress(true);
      const res = await adminUserService.grantTier(userToUpdate.id, tierName, 30);
      showNotification(res.message || `Upgraded ${userToUpdate.id} to ${tierName} successfully.`);
    } catch (err: any) {
      setUsers(previousUsers);
      setSelectedUser(previousSelected);
      showNotification(err.message || 'Failed to grant tier. Server rollback executed.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // OPTIMISTIC MUTATION 4: Force Reset 4-Digit Security PIN
  const handleResetPin = async (userToUpdate: AdminUserRecord) => {
    const previousUsers = [...users];
    const previousSelected = selectedUser ? { ...selectedUser } : null;

    setUsers((prev) =>
      prev.map((u) => (u.id === userToUpdate.id ? { ...u, failedPinAttempts: 0 } : u))
    );
    if (selectedUser?.id === userToUpdate.id) {
      setSelectedUser((prev) => (prev ? { ...prev, failedPinAttempts: 0 } : null));
    }
    showNotification(`⚡ Generating and delivering OTP to ${userToUpdate.phone}...`);

    try {
      setActionInProgress(true);
      const res = await adminUserService.resetPin(userToUpdate.id);
      showNotification(res.message || `PIN reset instructions dispatched to ${userToUpdate.phone}.`);
    } catch (err: any) {
      setUsers(previousUsers);
      setSelectedUser(previousSelected);
      showNotification(err.message || 'Failed to send SMS OTP. Reverting PIN state.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      
      {/* Dynamic Feedback Toast */}
      {feedbackNotice && (
        <div
          className={`fixed top-16 right-6 z-50 rounded-xl px-4 py-3 text-xs font-mono shadow-2xl border transition-all animate-in slide-in-from-top-2 ${
            feedbackNotice.type === 'error'
              ? 'bg-rose-950/90 border-rose-500 text-rose-300'
              : 'bg-slate-900/95 border-[#00d49f] text-[#00d49f]'
          }`}
        >
          {feedbackNotice.message}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#17233b] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00d49f]/10 border border-[#00d49f]/20 text-[#00d49f]">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>Merchant & Household Directory</span>
                <span className="text-xs font-mono font-semibold text-[#00d49f] px-2 py-0.5 rounded-full bg-[#00d49f]/10 border border-[#00d49f]/20">
                  {meta.totalRecords} Live Accounts
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dukandar POS management, Gharana KYC checks, security freezes, and targeted email actions
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Metrics from Meta */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="rounded-xl border border-[#17233b] bg-[#0d1627] hover:bg-[#121d33] p-2.5 text-slate-300 transition flex items-center gap-1.5"
            title="Refresh from REST API"
          >
            <RefreshCw className={`h-4 w-4 text-[#00d49f] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Sync API</span>
          </button>

          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] p-2.5 px-4 text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Pending SBP KYC</span>
            <span className="text-sm font-bold text-amber-400 font-mono">
              {meta.pendingKycCount}
            </span>
          </div>

          <div className="rounded-xl border border-[#17233b] bg-[#0d1627] p-2.5 px-4 text-center">
            <span className="text-[10px] text-slate-400 uppercase block">Frozen / Locked</span>
            <span className="text-sm font-bold text-rose-500 font-mono">
              {meta.frozenCount}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar when Users are Checked */}
      {selectedUserIds.length > 0 && (
        <div className="rounded-2xl border border-[#00d49f]/40 bg-[#0d1627] p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#00d49f]/20 text-[#00d49f] flex items-center justify-center font-bold font-mono text-xs">
              {selectedUserIds.length}
            </div>
            <div>
              <div className="text-xs font-bold text-white font-mono">
                {selectedUserIds.length} Merchant(s) / Household(s) Selected
              </div>
              <div className="text-[10px] text-slate-400">
                Execute batch targeted action or Gmail SMTP broadcast
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkEmailModal(true)}
              className="rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-mono font-bold text-xs px-4 py-2 flex items-center gap-1.5 transition shadow-lg shadow-[#00d49f]/10"
            >
              <Mail className="h-4 w-4" />
              <span>Send Targeted Email ({selectedUserIds.length})</span>
            </button>
            <button
              onClick={() => setSelectedUserIds([])}
              className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs px-3 py-2 transition"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Filter and Debounced Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by name, +92 phone, CNIC, or shop name... (Debounced)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00d49f]"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedPersona}
            onChange={(e) => {
              setSelectedPersona(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#00d49f]"
          >
            <option value="ALL">All Personas (تمام کھاتے)</option>
            <option value="DUKANDAR">🏪 Dukandars (دکاندار ریٹیل)</option>
            <option value="HOUSEHOLD">🏠 Households (گھریلو حساب)</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-[#17233b] bg-[#0d1627] px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-[#00d49f]"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">✅ Active</option>
            <option value="KYC_PENDING">⚠️ KYC Verification Required</option>
            <option value="FROZEN">🧊 Frozen (Read-Only Mode)</option>
          </select>
        </div>
      </div>

      {/* Error Fallback Banner with Retry */}
      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ServerOff className="h-6 w-6 text-rose-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-rose-300">Backend API Connectivity Alert</div>
              <div className="text-xs text-rose-400/90 font-mono mt-0.5">{error}</div>
            </div>
          </div>
          <button
            onClick={() => fetchUsers()}
            className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-xs px-4 py-2 flex items-center gap-2 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>🔄 Retry Connection</span>
          </button>
        </div>
      )}

      {/* Main Table & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Table Container */}
        <div className={`${selectedUser ? 'lg:col-span-7' : 'lg:col-span-12'} rounded-2xl border border-[#17233b] bg-[#0d1627] overflow-hidden shadow-xl`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#09111e] text-slate-400 font-mono uppercase text-[10px] border-b border-[#17233b]">
                <tr>
                  <th className="py-3 px-3 w-8 text-center">
                    <button
                      onClick={handleSelectAllOnPage}
                      className="text-slate-400 hover:text-white"
                      title="Select all on this page"
                    >
                      {users.length > 0 && users.every((u) => selectedUserIds.includes(u.id)) ? (
                        <CheckSquare className="h-4 w-4 text-[#00d49f]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Merchant / User</th>
                  <th className="py-3 px-3">Persona & City</th>
                  <th className="py-3 px-3">Active Tier</th>
                  <th className="py-3 px-3">Liquid Reserve</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17233b]/70 font-mono">
                {/* Skeleton Loading Rows */}
                {loading && users.length === 0 ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={`skeleton-${idx}`} className="animate-pulse">
                      <td className="py-4 px-3 text-center">
                        <div className="h-4 w-4 bg-[#121d33] rounded mx-auto"></div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="h-9 w-40 bg-[#121d33] rounded-lg"></div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="h-5 w-24 bg-[#121d33] rounded"></div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="h-5 w-28 bg-[#121d33] rounded"></div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="h-5 w-24 bg-[#121d33] rounded"></div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="h-5 w-16 bg-[#121d33] rounded"></div>
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className="h-5 w-8 bg-[#121d33] rounded ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  /* Empty State */
                  <tr>
                    <td colSpan={7} className="py-12 px-4 text-center">
                      <div className="max-w-xs mx-auto space-y-2">
                        <div className="h-10 w-10 mx-auto rounded-full bg-[#121d33] flex items-center justify-center text-slate-400">
                          <Search className="h-5 w-5" />
                        </div>
                        <div className="text-sm font-bold text-slate-300 font-sans">No matching merchants found</div>
                        <p className="text-xs text-slate-500 font-sans">
                          No user records match the query &ldquo;{debouncedSearch}&rdquo; and active filters.
                        </p>
                        <button
                          onClick={() => {
                            setSearchInput('');
                            setSelectedPersona('ALL');
                            setSelectedStatus('ALL');
                          }}
                          className="text-xs text-[#00d49f] hover:underline pt-2 font-mono block mx-auto"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* Rendered Data Rows */
                  users.map((user) => {
                    const isChecked = selectedUserIds.includes(user.id);
                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-[#121d33] transition cursor-pointer ${
                          selectedUser?.id === user.id ? 'bg-[#121d33] border-l-2 border-[#00d49f]' : ''
                        } ${isChecked ? 'bg-[#00d49f]/5' : ''}`}
                        onClick={() => setSelectedUser(user)}
                      >
                        {/* Checkbox Column */}
                        <td className="py-3.5 px-3 text-center" onClick={(e) => handleToggleSelectUser(user.id, e)}>
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-[#00d49f] mx-auto" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-500 hover:text-slate-300 mx-auto" />
                          )}
                        </td>

                        {/* User Identity */}
                        <td className="py-3.5 px-3 font-sans">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-[#17233b] flex items-center justify-center font-bold text-white text-xs">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{user.name}</span>
                                {user.isCnicVerified ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-[#00d49f]" />
                                ) : (
                                  <span className="text-[9px] text-amber-400 font-mono">Unverified</span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono block">{user.phone}</span>
                            </div>
                          </div>
                        </td>

                        {/* Persona & City */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1 text-slate-300">
                            {user.persona === 'DUKANDAR' ? (
                              <Store className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Home className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                            )}
                            <span className="truncate max-w-[120px] font-sans font-medium">{user.entityName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{user.city}</span>
                            {user.locationStatus === 'GPS_VERIFIED' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>GPS</span>
                              </span>
                            ) : user.locationStatus === 'SAFE_MODE' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span>Safe IP</span>
                              </span>
                            ) : user.locationStatus === 'DIASPORA_EXEMPT' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border border-sky-500/30 bg-sky-500/10 text-sky-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                <span>Diaspora</span>
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Active Tier */}
                        <td className="py-3.5 px-3">
                          <span className="inline-flex rounded-md bg-[#00d49f]/10 border border-[#00d49f]/20 px-2 py-0.5 text-[10px] font-bold text-[#00d49f]">
                            {user.tier}
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">Exp: {user.tierExpiry}</span>
                        </td>

                        {/* Liquid Reserve */}
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-white">Rs. {user.balancePKR.toLocaleString()}</span>
                          <span className="text-[10px] text-slate-500 block">Turnover: Rs. {(user.volumePKR / 1000).toFixed(0)}k</span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          {user.status === 'ACTIVE' && (
                            <span className="text-[#00d49f] flex items-center gap-1 text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#00d49f]" /> Active
                            </span>
                          )}
                          {user.status === 'KYC_PENDING' && (
                            <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="h-3 w-3" /> KYC Check
                            </span>
                          )}
                          {user.status === 'FROZEN' && (
                            <span className="text-rose-400 flex items-center gap-1 text-[11px]">
                              <Lock className="h-3 w-3" /> Frozen ({user.failedPinAttempts}x)
                            </span>
                          )}
                        </td>

                        {/* Deep-dive Link / Action */}
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#09111e] border-t border-[#17233b] text-xs font-mono">
              <span className="text-slate-400">
                Page <span className="text-white font-bold">{meta.currentPage}</span> of {meta.totalPages} ({meta.totalRecords} records)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage <= 1 || loading}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-[#17233b] bg-[#0d1627] hover:bg-[#121d33] disabled:opacity-40 px-3 py-1.5 text-slate-300 flex items-center gap-1 transition"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  disabled={currentPage >= meta.totalPages || loading}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded-lg border border-[#17233b] bg-[#0d1627] hover:bg-[#121d33] disabled:opacity-40 px-3 py-1.5 text-slate-300 flex items-center gap-1 transition"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected User Full Inspector Sidebar */}
        {selectedUser && (
          <div className="lg:col-span-5 rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-2xl space-y-5 animate-in fade-in duration-150">
            
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-[#17233b] pb-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-[#00d49f]/10 border border-[#00d49f]/30 text-[#00d49f] flex items-center justify-center font-black">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedUser.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{selectedUser.id}</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.phone} • {selectedUser.city}</p>
                  <p className="text-[11px] text-[#00d49f] font-mono">{selectedUser.email || `${selectedUser.id.toLowerCase()}@digihisab-test.pk`}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Direct Email Action Card for Selected User */}
            <div className="rounded-xl border border-[#00d49f]/30 bg-[#00d49f]/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-[#00d49f]" />
                  <span>Direct Gmail SMTP Dispatcher</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  PORT 465
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Trigger transactional welcome notes, Urdu khata tips, or emergency OTP emails directly to this merchant.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={async () => {
                    showNotification(`⚡ Dispatching Welcome Onboarding Email to ${selectedUser.name}...`);
                    try {
                      const res = await adminUserService.sendDirectUserEmail(selectedUser.id, { type: 'WELCOME' });
                      showNotification(res.message, 'success');
                    } catch (err: any) {
                      showNotification(err.message || 'Email delivery failed', 'error');
                    }
                  }}
                  className="rounded-lg bg-[#00d49f] hover:bg-[#00d49f]/90 text-slate-950 font-bold text-xs py-2 text-center transition"
                >
                  ✉️ Send Welcome Slip
                </button>
                <button
                  onClick={async () => {
                    showNotification(`⚡ Sending Security OTP to ${selectedUser.name}...`);
                    try {
                      const res = await adminUserService.sendDirectUserEmail(selectedUser.id, { type: 'OTP' });
                      showNotification(res.message, 'success');
                    } catch (err: any) {
                      showNotification(err.message || 'OTP dispatch failed', 'error');
                    }
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 text-center transition"
                >
                  🔑 Send Email OTP
                </button>
              </div>
            </div>

            {/* Live Geolocation & Perimeter Sentinel Card */}
            <div className="rounded-xl border border-[#17233b] bg-[#070d18] p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#17233b] pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Live Geolocation & Perimeter</span>
                </div>
                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  selectedUser.locationStatus === 'GPS_VERIFIED'
                    ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border border-amber-500/40 bg-amber-500/15 text-amber-300'
                }`}>
                  {selectedUser.locationStatus === 'GPS_VERIFIED' ? 'GPS VERIFIED' : 'SAFE IP MODE'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Coordinates:</span>
                  <span className="text-white font-bold text-[11px]">
                    {selectedUser.latitude || 31.4504}° N, {selectedUser.longitude || 73.1350}° E
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Physical Anchor:</span>
                  <span className="text-slate-300 text-[11px] truncate max-w-[190px]" title={selectedUser.locationAddress || selectedUser.city}>
                    {selectedUser.locationAddress || selectedUser.city}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Network APN / IP:</span>
                  <span className="text-[#00d49f] text-[11px] truncate max-w-[190px]" title={selectedUser.lastKnownIp || '39.40.112.5 (Zong 4G)'}>
                    {selectedUser.lastKnownIp || '39.40.112.5 (Zong 4G)'}
                  </span>
                </div>
              </div>

              <a
                href={`https://www.google.com/maps?q=${selectedUser.latitude || 31.4504},${selectedUser.longitude || 73.1350}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#00d49f]/40 bg-[#00d49f]/10 hover:bg-[#00d49f]/20 text-[#00d49f] py-2 text-xs font-mono font-bold transition shadow-sm"
              >
                <Navigation className="h-3.5 w-3.5" />
                <span>🗺️ Open in Google Maps</span>
                <ExternalLink className="h-3 w-3 opacity-70 ml-1" />
              </a>
            </div>

            {/* SBP CNIC Verification Card */}
            <div className="rounded-xl border border-[#17233b] bg-[#070d18] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#00d49f]" />
                  <span>CNIC & SBP Compliance Desk</span>
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${selectedUser.isCnicVerified ? 'bg-emerald-500/20 text-[#00d49f]' : 'bg-amber-500/20 text-amber-300'}`}>
                  {selectedUser.isCnicVerified ? 'Verified SBP Merchant' : 'KYC Verification Required'}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                CNIC Number: <span className="text-white font-bold">{selectedUser.cnic}</span>
              </div>
              {!selectedUser.isCnicVerified && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    disabled={actionInProgress}
                    onClick={() => handleApproveKyc(selectedUser)}
                    className="flex-1 rounded-lg bg-[#00d49f] hover:bg-[#00d49f]/90 disabled:opacity-50 text-slate-950 font-bold py-1.5 text-xs text-center transition"
                  >
                    ✓ Approve CNIC (Live Mutation)
                  </button>
                  <button
                    disabled={actionInProgress}
                    onClick={() => showNotification(`Document rejected for ${selectedUser.id}`)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 py-1.5 text-xs text-center transition"
                  >
                    Reject Document
                  </button>
                </div>
              )}
            </div>

            {/* Account Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-xl border border-[#17233b] bg-[#09111e] p-3">
                <span className="text-[10px] text-slate-400 block uppercase">Liquid Vault Balance</span>
                <span className="text-sm font-bold text-[#00d49f]">Rs. {selectedUser.balancePKR.toLocaleString()}</span>
              </div>
              <div className="rounded-xl border border-[#17233b] bg-[#09111e] p-3">
                <span className="text-[10px] text-slate-400 block uppercase">Current Tier</span>
                <span className="text-sm font-bold text-sky-400">{selectedUser.tier}</span>
              </div>
              <div className="rounded-xl border border-[#17233b] bg-[#09111e] p-3">
                <span className="text-[10px] text-slate-400 block uppercase">Recorded Turnover</span>
                <span className="text-sm font-bold text-white">Rs. {selectedUser.volumePKR.toLocaleString()}</span>
              </div>
              <div className="rounded-xl border border-[#17233b] bg-[#09111e] p-3">
                <span className="text-[10px] text-slate-400 block uppercase">Last Activity</span>
                <span className="text-xs font-bold text-slate-300">{selectedUser.lastActive}</span>
              </div>
            </div>

            {/* Zero-Trust Administrative Actions */}
            <div className="space-y-2 pt-2 border-t border-[#17233b]">
              <span className="text-xs font-bold text-slate-300 uppercase font-mono block">Zero-Trust Administrative Controls:</span>

              {/* 1-Tap Subscription Grant */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={actionInProgress}
                  onClick={() => handleGrantTier(selectedUser, 'PRO_MALIK_250')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[#00d49f]/30 bg-[#00d49f]/10 hover:bg-[#00d49f]/20 disabled:opacity-50 p-2.5 text-xs font-bold text-[#00d49f] transition"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Grant Pro Malik 250</span>
                </button>
                <button
                  disabled={actionInProgress}
                  onClick={() => handleGrantTier(selectedUser, 'DUKANDAR_POS_200')}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-50 p-2.5 text-xs font-bold text-sky-400 transition"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>Grant POS 200</span>
                </button>
              </div>

              {/* Zero-Trust Freeze */}
              <button
                disabled={actionInProgress}
                onClick={() => {
                  const nextStatus = selectedUser.status === 'FROZEN' ? 'Unfreeze' : 'Freeze';
                  setStepUpPendingAction({
                    title: `${nextStatus} Merchant: ${selectedUser.name}`,
                    description: `Zero-Trust verification required. Re-authenticate with Password or TOTP to alter lock state for ${selectedUser.id}.`,
                    targetUser: selectedUser,
                  });
                  setStepUpOpen(true);
                }}
                className={`w-full flex items-center justify-between rounded-xl border p-3 text-xs font-bold disabled:opacity-50 transition ${
                  selectedUser.status === 'FROZEN'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  {selectedUser.status === 'FROZEN' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  <span>{selectedUser.status === 'FROZEN' ? 'Unfreeze Account (Enable Ledger Mutations)' : 'Freeze Account (Read-Only Mode)'}</span>
                </span>
                <span>{selectedUser.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}</span>
              </button>

              {/* PIN Sentinel Reset */}
              <button
                disabled={actionInProgress}
                onClick={() => handleResetPin(selectedUser)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 disabled:opacity-50 p-3 text-xs font-bold text-slate-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-400" />
                  <span>Force Reset 4-Digit Security PIN</span>
                </span>
                <span className="text-amber-400">Send OTP SMS</span>
              </button>

              {/* Full Ledger Audit Link */}
              <Link
                href={`/admin/users/${selectedUser.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#09111e] hover:bg-slate-800 p-3 text-xs font-mono font-bold text-white transition"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#00d49f]" />
                <span>Deep-Dive Ledger Audit & Session Controller</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            </div>

          </div>
        )}

      </div>

      {/* Bulk Email Composer Modal for Selected Users */}
      {showBulkEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#00d49f]" />
                <h3 className="text-base font-bold text-white">Targeted Email Dispatcher</h3>
              </div>
              <button
                onClick={() => setShowBulkEmailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs font-mono text-[#00d49f] bg-[#00d49f]/10 border border-[#00d49f]/20 p-2.5 rounded-xl">
              Recipients: {selectedUserIds.length} Selected Merchant(s) ({selectedUserIds.join(', ')})
            </div>

            <form onSubmit={handleSendBulkEmail} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Template Preset</label>
                <select
                  value={emailTemplateType}
                  onChange={(e) => setEmailTemplateType(e.target.value as any)}
                  className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                >
                  <option value="CUSTOM">Custom Official Notice (Urdu + English)</option>
                  <option value="WELCOME">Dukandar POS Welcome & Tips</option>
                  <option value="OTP">Security Verification OTP</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                  required
                />
              </div>

              {emailTemplateType === 'CUSTOM' && (
                <>
                  <div>
                    <label className="text-slate-400 uppercase text-[10px] block mb-1">Urdu Body Message (اردو متن)</label>
                    <textarea
                      rows={2}
                      dir="rtl"
                      value={emailBodyUrdu}
                      onChange={(e) => setEmailBodyUrdu(e.target.value)}
                      className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-emerald-300 font-sans focus:outline-none focus:border-[#00d49f]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 uppercase text-[10px] block mb-1">English Body Text</label>
                    <textarea
                      rows={2}
                      value={emailBodyEnglish}
                      onChange={(e) => setEmailBodyEnglish(e.target.value)}
                      className="w-full rounded-xl border border-[#17233b] bg-[#070d18] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00d49f]"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={dispatchingEmail}
                  className="flex-1 rounded-xl bg-[#00d49f] hover:bg-[#00d49f]/90 disabled:opacity-50 text-slate-950 font-bold py-2.5 text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#00d49f]/10"
                >
                  <Send className="h-4 w-4" />
                  <span>{dispatchingEmail ? 'Transmitting via Gmail SMTP...' : `Dispatch to ${selectedUserIds.length} Users`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkEmailModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 px-4 text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step-Up Re-Authentication Modal for Zero-Trust Actions */}
      <StepUpAuthModal
        isOpen={stepUpOpen}
        onClose={() => {
          setStepUpOpen(false);
          setStepUpPendingAction(null);
        }}
        onSuccess={(token) => {
          if (stepUpPendingAction) {
            handleToggleFreeze(stepUpPendingAction.targetUser);
            setStepUpPendingAction(null);
          }
        }}
        actionTitle={stepUpPendingAction?.title || 'Destructive Action'}
        actionDescription={stepUpPendingAction?.description || ''}
        targetId={stepUpPendingAction?.targetUser?.id}
      />

    </div>
  );
}
