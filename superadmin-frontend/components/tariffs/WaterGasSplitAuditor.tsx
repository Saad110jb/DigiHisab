'use client';

import React, { useState } from 'react';
import {
  Droplets,
  Flame,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown,
  Building,
  User,
  Zap,
  RotateCcw
} from 'lucide-react';
import {
  calculateWaterPumpShare,
  calculateGasPointsShare
} from '@/lib/tariffs-store';
import { ISharedUtilityDisputeRecord } from '@/types/tariffs';

interface Props {
  disputes: ISharedUtilityDisputeRecord[];
  onArbitrateDispute: (
    disputeId: string,
    action: 'RESOLVE' | 'ORDER_ADJUSTMENT',
    fairSharePKR?: number
  ) => Promise<void>;
  actionInProgress: boolean;
}

export default function WaterGasSplitAuditor({ disputes, onArbitrateDispute, actionInProgress }: Props) {
  // Water Calculator State
  const [waterBillPKR, setWaterBillPKR] = useState<number>(18400);
  const [groundMins, setGroundMins] = useState<number>(85); // 85 mins daily
  const [upperMins, setUpperMins] = useState<number>(35); // 35 mins daily

  // Gas Calculator State
  const [gasBillPKR, setGasBillPKR] = useState<number>(29500);
  const [landlordBurners, setLandlordBurners] = useState<number>(4);
  const [landlordGeysers, setLandlordGeysers] = useState<number>(1);
  const [landlordHeaters, setLandlordHeaters] = useState<number>(2);

  const [tenantBurners, setTenantBurners] = useState<number>(2);
  const [tenantGeysers, setTenantGeysers] = useState<number>(1);
  const [tenantHeaters, setTenantHeaters] = useState<number>(0);

  // Compute live calculations
  const waterResult = calculateWaterPumpShare(2.0, waterBillPKR, groundMins, upperMins);
  const gasResult = calculateGasPointsShare(
    gasBillPKR,
    { burners: landlordBurners, geysers: landlordGeysers, heaters: landlordHeaters },
    { burners: tenantBurners, geysers: tenantGeysers, heaters: tenantHeaters }
  );

  return (
    <div className="space-y-6">
      {/* 2 Interactive Calculators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Water Pump Tube-Well Calculator */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Water Pump &amp; Tube-Well Runtime Inspector</h4>
                <p className="text-xs text-slate-400">1.5 - 2.0 HP Motor Runtime vs Flat 50/50 Split</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Total Dedicated Motor Electricity Bill (PKR)</label>
                <input
                  type="number"
                  value={waterBillPKR}
                  onChange={(e) => setWaterBillPKR(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Ground Lawn Runtime (Mins/Day)</label>
                  <input
                    type="number"
                    value={groundMins}
                    onChange={(e) => setGroundMins(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Upper Tank Fill (Mins/Day)</label>
                  <input
                    type="number"
                    value={upperMins}
                    onChange={(e) => setUpperMins(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Box */}
          <div className="mt-5 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Ground Floor Share ({waterResult.groundPct}%):</span>
              <span className="text-amber-400 font-bold">Rs. {waterResult.groundSharePKR.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Upper Portion Fair Share ({waterResult.upperPct}%):</span>
              <span className="text-emerald-400 font-bold">Rs. {waterResult.upperSharePKR.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500">
              💡 Flat 50% split would overcharge the upper portion by Rs. {(waterBillPKR / 2 - waterResult.upperSharePKR).toLocaleString()}!
            </div>
          </div>
        </div>

        {/* 2. SNGPL Winter Gas Split Calculator */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">SNGPL Shared Winter Gas Burner &amp; Geyser Split</h4>
                <p className="text-xs text-slate-400">Weighting: Burner (1x) &bull; Geyser (3x) &bull; Room Heater (4x)</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Total SNGPL Shared Gas Bill (PKR)</label>
                <input
                  type="number"
                  value={gasBillPKR}
                  onChange={(e) => setGasBillPKR(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Landlord Appliances */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-amber-400 font-bold uppercase">Landlord / Ground</span>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Burners:</span>
                    <input
                      type="number"
                      value={landlordBurners}
                      onChange={(e) => setLandlordBurners(Number(e.target.value))}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Geysers:</span>
                    <input
                      type="number"
                      value={landlordGeysers}
                      onChange={(e) => setLandlordGeysers(Number(e.target.value))}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Heaters:</span>
                    <input
                      type="number"
                      value={landlordHeaters}
                      onChange={(e) => setLandlordHeaters(Number(e.target.value))}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white"
                    />
                  </div>
                </div>

                {/* Tenant Appliances */}
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase">Tenant / Upper</span>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Burners:</span>
                    <input
                      type="number"
                      value={tenantBurners}
                      onChange={(e) => setTenantBurners(Number(e.target.value))}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Geysers:</span>
                    <input
                      type="number"
                      value={tenantGeysers}
                      onChange={(e) => setTenantGeysers(Number(e.target.value))}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Heaters:</span>
                    <input
                      type="number"
                      value={tenantHeaters}
                      onChange={(e) => setTenantHeaters(Number(e.target.value))}
                      className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Box */}
          <div className="mt-5 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Landlord Gas Share ({gasResult.landlordPct}%):</span>
              <span className="text-amber-400 font-bold">Rs. {gasResult.landlordSharePKR.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tenant Fair Gas Share ({gasResult.tenantPct}%):</span>
              <span className="text-emerald-400 font-bold">Rs. {gasResult.tenantSharePKR.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tenancy Disputes Desk Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Active Shared Utility Tenancy Disputes ({disputes.length})</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Total Overcharged Difference: Rs. {disputes.reduce((acc, d) => acc + d.contestedDifferencePKR, 0).toLocaleString()}
          </span>
        </div>

        <div className="space-y-3">
          {disputes.map((disp) => {
            const isResolved = disp.status === 'RESOLVED';
            const isAdjustmentOrdered = disp.status === 'ADJUSTMENT_ORDERED';

            return (
              <div
                key={disp.id}
                className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {disp.id}
                      </span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {disp.utilityType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500">&bull;</span>
                      <span className="text-xs text-slate-400 font-mono">{disp.timestamp}</span>
                    </div>

                    <h5 className="text-sm font-bold text-white">
                      {disp.tenantName} ({disp.tenantPortion}) vs {disp.landlordName}
                    </h5>
                    <p className="text-xs text-slate-400 font-mono">{disp.propertyAddress}</p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                        isResolved
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isAdjustmentOrdered
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-red-500/20 text-red-300 border-red-500/40'
                      }`}
                    >
                      {disp.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Dispute Reason (Bilingual) */}
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800/80 text-xs space-y-1">
                  <p className="text-slate-300">{disp.disputeReason}</p>
                  <p className="text-amber-300/90 font-medium">{disp.disputeReasonUrdu}</p>
                </div>

                {/* Dispute Numbers & Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-slate-500 block">Master Bill:</span>
                      <span className="text-white font-bold">Rs. {disp.masterBillAmountPKR.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Landlord Demanded:</span>
                      <span className="text-red-400 font-bold">Rs. {disp.demandedSharePKR.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Digi Hisab Fair Share:</span>
                      <span className="text-emerald-400 font-bold">Rs. {disp.fairCalculatedSharePKR.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Overcharged Excess:</span>
                      <span className="text-amber-400 font-bold">Rs. {disp.contestedDifferencePKR.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Arbitration Buttons */}
                  {!isResolved && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onArbitrateDispute(disp.id, 'ORDER_ADJUSTMENT', disp.fairCalculatedSharePKR)
                        }
                        disabled={actionInProgress}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition"
                      >
                        Order Fair Adjustment
                      </button>
                      <button
                        onClick={() => onArbitrateDispute(disp.id, 'RESOLVE')}
                        disabled={actionInProgress}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
