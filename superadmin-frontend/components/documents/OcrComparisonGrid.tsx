'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Calendar,
  User,
  CreditCard,
  Check
} from 'lucide-react';
import { ICnicOcrDetails } from '@/types/admin';

interface OcrComparisonGridProps {
  ocrDetails: ICnicOcrDetails;
  profileName: string;
  profileCnic: string;
  profileComparison: {
    cnicMatch: boolean;
    nameMatch: boolean;
    dobMatch: boolean;
    overallConfidence: number;
  };
}

export default function OcrComparisonGrid({
  ocrDetails,
  profileName,
  profileCnic,
  profileComparison
}: OcrComparisonGridProps) {
  const isConfidenceHigh = profileComparison.overallConfidence >= 90;

  return (
    <div className="rounded-2xl border border-[#17233b] bg-[#0d1627] p-5 shadow-xl space-y-4 font-mono text-xs">
      
      {/* Header & Confidence Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#17233b] pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00d49f]" />
            <span>Dual-Sided CNIC OCR Intelligence Radar</span>
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Automated field cross-reference against merchant registration inputs
          </p>
        </div>

        {/* Confidence Meter Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block">OCR Match Score</span>
            <span className={`text-base font-bold ${isConfidenceHigh ? 'text-[#00d49f]' : 'text-amber-400'}`}>
              {profileComparison.overallConfidence}% Match
            </span>
          </div>
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
            isConfidenceHigh
              ? 'border-[#00d49f]/30 bg-[#00d49f]/10 text-[#00d49f]'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          }`}>
            {isConfidenceHigh ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[#09111e] text-slate-400 uppercase text-[10px] border-b border-[#17233b]">
            <tr>
              <th className="py-2.5 px-3">Field Identity</th>
              <th className="py-2.5 px-3">OCR Extracted from Card</th>
              <th className="py-2.5 px-3">Registered Profile Data</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#17233b]/60">
            
            {/* CNIC Number */}
            <tr className="hover:bg-[#121d33] transition">
              <td className="py-3 px-3 text-slate-400 flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-[#00d49f]" />
                <span>CNIC Number</span>
              </td>
              <td className="py-3 px-3 font-bold text-white">
                {ocrDetails.cnicNumber}
              </td>
              <td className="py-3 px-3 text-slate-200">
                {profileCnic}
              </td>
              <td className="py-3 px-3 text-center">
                {profileComparison.cnicMatch ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <Check className="h-3.5 w-3.5" /> Exact
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                    <XCircle className="h-3.5 w-3.5" /> Mismatch
                  </span>
                )}
              </td>
            </tr>

            {/* Full Name */}
            <tr className="hover:bg-[#121d33] transition">
              <td className="py-3 px-3 text-slate-400 flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-sky-400" />
                <span>Cardholder Name</span>
              </td>
              <td className="py-3 px-3 font-bold text-white">
                {ocrDetails.fullName}
              </td>
              <td className="py-3 px-3 text-slate-200">
                {profileName}
              </td>
              <td className="py-3 px-3 text-center">
                {profileComparison.nameMatch ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <Check className="h-3.5 w-3.5" /> Matched
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5" /> Variance
                  </span>
                )}
              </td>
            </tr>

            {/* Father / Husband Name */}
            <tr className="hover:bg-[#121d33] transition">
              <td className="py-3 px-3 text-slate-400">
                Father / Husband Name
              </td>
              <td className="py-3 px-3 text-slate-200">
                {ocrDetails.fatherOrHusbandName}
              </td>
              <td className="py-3 px-3 text-slate-400">
                (Verified against card)
              </td>
              <td className="py-3 px-3 text-center">
                <span className="text-[10px] text-emerald-400 font-bold">Captured</span>
              </td>
            </tr>

            {/* Date of Birth */}
            <tr className="hover:bg-[#121d33] transition">
              <td className="py-3 px-3 text-slate-400 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                <span>Date of Birth</span>
              </td>
              <td className="py-3 px-3 text-slate-200">
                {ocrDetails.dateOfBirth}
              </td>
              <td className="py-3 px-3 text-slate-400">
                Age 18+ Verified
              </td>
              <td className="py-3 px-3 text-center">
                <span className="text-[10px] text-emerald-400 font-bold">Adult SBP OK</span>
              </td>
            </tr>

            {/* Issue & Expiry Dates */}
            <tr className="hover:bg-[#121d33] transition">
              <td className="py-3 px-3 text-slate-400">
                Validity Window
              </td>
              <td className="py-3 px-3 text-slate-200">
                Issue: {ocrDetails.issueDate} • Exp: <strong className="text-white">{ocrDetails.expiryDate}</strong>
              </td>
              <td className="py-3 px-3 text-slate-400">
                Gender: {ocrDetails.gender === 'M' ? 'Male' : 'Female'}
              </td>
              <td className="py-3 px-3 text-center">
                <span className="text-[10px] text-cyan-400 font-bold">Active Card</span>
              </td>
            </tr>

          </tbody>
        </table>
      </div>

      {/* Urdu Address Card */}
      {ocrDetails.addressUrdu && (
        <div className="rounded-xl border border-[#17233b] bg-[#070d18] p-3 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[10px] uppercase">Urdu Address on Smart Card:</span>
          <span className="text-emerald-300 font-sans font-medium text-sm" dir="rtl">
            {ocrDetails.addressUrdu}
          </span>
        </div>
      )}

    </div>
  );
}
