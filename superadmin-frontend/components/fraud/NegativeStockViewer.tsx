'use client';

import React from 'react';
import { PackageX, AlertOctagon, Search, ArrowRight, ShieldAlert, CheckCircle2, ShoppingBag } from 'lucide-react';
import { INegativeStockRecord } from '@/types/fraud';

interface Props {
  records: INegativeStockRecord[];
  onDismissRecord?: (id: string) => void;
}

export default function NegativeStockViewer({ records }: Props) {
  const totalPhantomValue = records.reduce((acc, r) => acc + r.phantomSaleValuePKR, 0);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              SHADOW INVENTORY &amp; TAX EVASION MONITOR
            </span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">Negative Inventory POS Checkout Sentinel</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Detects POS counter sales executed on items with zero or negative inventory balances. Unrecorded supplier deliveries and off-the-books stock checkouts are automatically isolated.
          </p>
        </div>

        <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">Total Phantom Sales Value</p>
          <p className="text-base font-bold font-mono text-amber-400">
            Rs. {totalPhantomValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Negative Stock Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-slate-400 bg-slate-950/80 border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Item SKU &amp; Barcode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Store &amp; Cashier</th>
                <th className="py-3 px-4 text-center">Sold Qty</th>
                <th className="py-3 px-4 text-center">Stock Post-Sale</th>
                <th className="py-3 px-4 text-right">Phantom Value</th>
                <th className="py-3 px-4 text-center">Timestamp</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {records.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white text-sm">{item.skuName}</div>
                    <div className="text-[11px] text-slate-400">Barcode: {item.barcode}</div>
                    <div className="text-[10px] text-slate-500">Unit: Rs. {item.unitPricePKR.toLocaleString()}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {item.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{item.storeName}</div>
                    <div className="text-[11px] text-slate-400">Cashier: {item.cashierName}</div>
                    <div className="text-[10px] text-slate-500">{item.city}</div>
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-white">
                    {item.quantitySold} units
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold text-[11px]">
                      {item.stockLevelAfterSale} units
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right font-bold text-amber-400">
                    Rs. {item.phantomSaleValuePKR.toLocaleString()}
                  </td>

                  <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                    {item.timestamp}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
