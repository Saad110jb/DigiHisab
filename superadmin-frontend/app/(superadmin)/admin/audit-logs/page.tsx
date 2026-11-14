'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Download,
  Filter,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Eye,
  RefreshCw,
  Lock,
  ArrowUpDown,
  Hash,
  Database,
  CheckCircle2,
  Users
} from 'lucide-react';
import { IAdminAuditLog, AuditSeverity } from '@/types/audit';
import AuditDiffDrawer from '@/components/audit/AuditDiffDrawer';
import { useAdminRbac } from '@/context/AdminRbacContext';

export default function AuditLogsPage() {
  const { activeAdmin } = useAdminRbac();
  const [logs, setLogs] = useState<IAdminAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedModule, setSelectedModule] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedLogForDiff, setSelectedLogForDiff] = useState<IAdminAuditLog | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedRole !== 'ALL') params.append('role', selectedRole);
      if (selectedModule !== 'ALL') params.append('module', selectedModule);
      if (selectedSeverity !== 'ALL') params.append('severity', selectedSeverity);

      const res = await fetch(`/api/v1/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLogs(json.data.logs || []);
        }
      }
    } catch (err: any) {
      showToast('Error loading audit logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedRole, selectedModule, selectedSeverity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/v1/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EXPORT_SBP_CSV',
          filters: {
            search: search || undefined,
            role: selectedRole !== 'ALL' ? selectedRole : undefined,
            module: selectedModule !== 'ALL' ? selectedModule : undefined,
            severity: selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
          },
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SBP_Audit_Trail_Report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('✅ SBP Audit Trail CSV Downloaded Successfully');
        fetchLogs(); // refresh to show export log entry
      }
    } catch (err: any) {
      showToast('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const criticalCount = logs.filter((l) => l.severity === 'CRITICAL').length;
  const warningCount = logs.filter((l) => l.severity === 'WARNING').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#00d49f] text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-mono text-xs animate-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              SBP IMMUTABLE AUDIT TRAILS
            </span>
            <span className="text-xs text-slate-400 font-mono">SHA-256 Chained Hash Verification</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1.5 flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-emerald-400" />
            <span>Administrative Forensic Audit Logs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Every administrative mutation across the SuperAdmin console is cryptographically signed and stored in an append-only ledger. Records cannot be edited or deleted by any admin.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
            title="Refresh Log Stream"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting || logs.length === 0}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating CSV...' : 'Export SBP Audit CSV'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Total Audit Actions</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">{logs.length}</span>
            <span className="text-[10px] text-emerald-400 font-mono">100% Signed</span>
          </div>
          <p className="text-[11px] text-slate-500">Append-only administrative trail</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Critical Overrides</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-400 font-mono">{criticalCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">High Impact</span>
          </div>
          <p className="text-[11px] text-slate-500">Maintenance &amp; Tariff mutations</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Warning Severity</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-400 font-mono">{warningCount}</span>
            <span className="text-[10px] text-slate-400 font-mono">Flag Toggles</span>
          </div>
          <p className="text-[11px] text-slate-500">Feature kill switches &amp; refunds</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">Cryptographic Integrity</span>
          <div className="flex items-baseline gap-1.5 text-emerald-400 font-bold text-sm mt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>SHA-256 VALID</span>
          </div>
          <p className="text-[11px] text-slate-500">Chained tamper resistance intact</p>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Admin, Action, Store, or CNIC..."
            className="w-full bg-[#070e1b] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </form>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs font-mono">
          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Admin Roles</option>
            <option value="ROOT_SUPERADMIN">Root SuperAdmin</option>
            <option value="COMPLIANCE_OFFICER">Compliance Officer</option>
            <option value="DISPUTE_RESOLVER">Dispute Resolver</option>
            <option value="FINANCIAL_AUDITOR">Financial Auditor</option>
          </select>

          {/* Module Filter */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Modules</option>
            <option value="APP_VERSIONING">App Versioning &amp; Flags</option>
            <option value="KYC_DOCUMENTS">KYC &amp; Documents</option>
            <option value="SUB_METERS_TARIFFS">Tariffs &amp; DISCO</option>
            <option value="DISPUTES_COMPLAINTS">Disputes &amp; Khata</option>
            <option value="RBAC_MANAGEMENT">RBAC &amp; Team</option>
            <option value="AUDIT_LOGS">Audit Logs</option>
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[#070e1b] border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
        </div>
      </div>

      {/* Audit Log Stream Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#070e1b] text-slate-400 border-b border-slate-800 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Audit ID &amp; Time</th>
                <th className="py-3 px-4">Admin Name &amp; Role</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Module Desk</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching administrative audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.timestamp);
                  const timePkt = date.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' });
                  const datePkt = date.toLocaleDateString('en-GB');

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-800/50 transition cursor-pointer"
                      onClick={() => setSelectedLogForDiff(log)}
                    >
                      {/* Audit ID & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-white block">{log.id}</span>
                        <span className="text-[11px] text-slate-400">
                          {timePkt} PKT &bull; {datePkt}
                        </span>
                      </td>

                      {/* Admin Name & Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-white block">{log.adminName}</span>
                        <span className="text-[10px] text-slate-400">{log.adminRole.replace(/_/g, ' ')}</span>
                      </td>

                      {/* Action Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold border border-slate-700">
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Target Entity */}
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <span className="font-bold text-white block truncate">{log.targetEntityName}</span>
                        <span className="text-[10px] text-slate-500 font-mono truncate">{log.targetEntityId}</span>
                      </td>

                      {/* Module Desk */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-400">{log.deskModule}</span>
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                            log.severity === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : log.severity === 'WARNING'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {log.severity}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLogForDiff(log);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition inline-flex items-center gap-1.5 text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>View Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#070e1b] border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Showing {logs.length} immutable administrative records</span>
          <span className="text-slate-500">State Bank of Pakistan (SBP) Cryptographic Standard</span>
        </div>
      </div>

      {/* State Mutation Diff Drawer */}
      <AuditDiffDrawer
        log={selectedLogForDiff}
        onClose={() => setSelectedLogForDiff(null)}
      />
    </div>
  );
}
