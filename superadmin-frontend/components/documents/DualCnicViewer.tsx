'use client';

import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Eye
} from 'lucide-react';

interface DualCnicViewerProps {
  frontUrl: string;
  backUrl: string;
  cnicNumber: string;
  holderName: string;
}

export default function DualCnicViewer({
  frontUrl,
  backUrl,
  cnicNumber,
  holderName
}: DualCnicViewerProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [selectedSide, setSelectedSide] = useState<'BOTH' | 'FRONT' | 'BACK'>('BOTH');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(2.2, prev + 0.2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(0.8, prev - 0.2));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      
      {/* Viewer Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border border-[#17233b] bg-[#070d18]">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">View Mode:</span>
          <button
            onClick={() => setSelectedSide('BOTH')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              selectedSide === 'BOTH'
                ? 'bg-[#00d49f] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#0d1627] border border-[#17233b]'
            }`}
          >
            Dual Side-by-Side
          </button>
          <button
            onClick={() => setSelectedSide('FRONT')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              selectedSide === 'FRONT'
                ? 'bg-[#00d49f] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#0d1627] border border-[#17233b]'
            }`}
          >
            Front Only
          </button>
          <button
            onClick={() => setSelectedSide('BACK')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
              selectedSide === 'BACK'
                ? 'bg-[#00d49f] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white bg-[#0d1627] border border-[#17233b]'
            }`}
          >
            Back Only
          </button>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-[#0d1627] border border-[#17233b] hover:text-[#00d49f] transition"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-[#0d1627] border border-[#17233b] hover:text-[#00d49f] transition"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg bg-[#0d1627] border border-[#17233b] hover:text-[#00d49f] transition"
            title="Rotate 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 rounded-lg bg-[#0d1627] border border-[#17233b] hover:text-white text-[10px] transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Side-by-Side Image Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* CNIC FRONT */}
        {(selectedSide === 'BOTH' || selectedSide === 'FRONT') && (
          <div className="rounded-2xl border border-[#17233b] bg-[#09111e] p-3 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-2 text-[11px]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#00d49f]" />
                <span className="font-bold text-white">Smart CNIC — Front Side</span>
              </div>
              <button
                onClick={() => setFullscreenImage(frontUrl)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Full Res</span>
              </button>
            </div>

            {/* Image Preview with Zoom & Rotation */}
            <div className="h-64 sm:h-72 rounded-xl bg-[#050b14] border border-[#17233b]/80 flex items-center justify-center overflow-hidden relative">
              {/* Simulated Smart CNIC Card Container */}
              <div
                className="w-full h-full p-2 flex items-center justify-center transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                }}
              >
                <img
                  src={frontUrl}
                  alt="CNIC Front"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-700/50"
                />
              </div>

              {/* Watermark Overlay Tag */}
              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur border border-slate-800 px-2.5 py-1 rounded-md text-[10px] text-slate-300 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Chip & Photo Visible</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Cardholder: <strong className="text-white">{holderName}</strong></span>
              <span className="text-[#00d49f] font-mono font-bold">{cnicNumber}</span>
            </div>
          </div>
        )}

        {/* CNIC BACK */}
        {(selectedSide === 'BOTH' || selectedSide === 'BACK') && (
          <div className="rounded-2xl border border-[#17233b] bg-[#09111e] p-3 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#17233b] pb-2 text-[11px]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <span className="font-bold text-white">Smart CNIC — Back Side</span>
              </div>
              <button
                onClick={() => setFullscreenImage(backUrl)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
              >
                <Maximize2 className="h-3 w-3" />
                <span>Full Res</span>
              </button>
            </div>

            {/* Image Preview with Zoom & Rotation */}
            <div className="h-64 sm:h-72 rounded-xl bg-[#050b14] border border-[#17233b]/80 flex items-center justify-center overflow-hidden relative">
              <div
                className="w-full h-full p-2 flex items-center justify-center transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                }}
              >
                <img
                  src={backUrl}
                  alt="CNIC Back"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-slate-700/50"
                />
              </div>

              {/* Watermark Overlay Tag */}
              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur border border-slate-800 px-2.5 py-1 rounded-md text-[10px] text-slate-300 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                <span>Issue & Expiry Dates Legible</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>Urdu Address & Barcode</span>
              <span className="text-sky-400 font-mono">Micro-QR Verified</span>
            </div>
          </div>
        )}

      </div>

      {/* Fullscreen Modal View */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute -top-10 right-0 text-white font-mono text-xs bg-slate-800 px-3 py-1 rounded-lg border border-slate-700"
            >
              Close ✕
            </button>
            <img
              src={fullscreenImage}
              alt="Full Resolution CNIC Scan"
              className="max-h-[80vh] max-w-full object-contain rounded-xl border border-slate-700 shadow-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
