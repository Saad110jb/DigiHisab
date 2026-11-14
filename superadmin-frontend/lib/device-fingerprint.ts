/**
 * Device Fingerprint Utility for Zero-Trust Sentinel
 * Generates an immutable device identifier from Canvas, WebGL, Screen, and UserAgent
 */

export interface DeviceFingerprint {
  fingerprintId: string;
  canvasHash: string;
  webGlRenderer: string;
  screenResolution: string;
  userAgent: string;
  platform: string;
  language: string;
}

export function getDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return {
      fingerprintId: 'DFP_SERVER_SIDE_RENDER',
      canvasHash: 'SERVER',
      webGlRenderer: 'SERVER',
      screenResolution: '1920x1080',
      userAgent: 'Server',
      platform: 'Server',
      language: 'en',
    };
  }

  // 1. Screen resolution & color depth
  const screenResolution = `${window.screen.width}x${window.screen.height}@${window.screen.colorDepth}bpp`;

  // 2. Canvas Fingerprint Hash
  let canvasHash = 'NO_CANVAS';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial', sans-serif";
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#00d49f';
      ctx.fillRect(10, 10, 62, 20);
      ctx.fillStyle = '#070d18';
      ctx.fillText('DigiHisab Zero-Trust Sentinel 2.0', 12, 25);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Malik POS Verification', 4, 45);

      const dataUrl = canvas.toDataURL();
      // Simple 32-bit hash of canvas string
      let hash = 0;
      for (let i = 0; i < dataUrl.length; i++) {
        hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
        hash |= 0;
      }
      canvasHash = '0x' + Math.abs(hash).toString(16).padStart(8, '0');
    }
  } catch (e) {
    canvasHash = 'CANVAS_BLOCKED';
  }

  // 3. WebGL GPU Vendor & Renderer
  let webGlRenderer = 'STANDARD_GPU';
  try {
    const glCanvas = document.createElement('canvas');
    const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
    if (gl) {
      const dbg = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        webGlRenderer = (gl as any).getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'GENERIC_WEBGL';
      }
    }
  } catch (e) {
    webGlRenderer = 'GPU_MASKED';
  }

  const userAgent = navigator.userAgent;
  const platform = navigator.platform || 'UNKNOWN_OS';
  const language = navigator.language || 'en';

  // Composite Fingerprint Hash
  const rawComposite = `${canvasHash}::${webGlRenderer}::${screenResolution}::${userAgent}`;
  let compHash = 0;
  for (let i = 0; i < rawComposite.length; i++) {
    compHash = (compHash << 5) - compHash + rawComposite.charCodeAt(i);
    compHash |= 0;
  }
  const fingerprintId = `DFP_${Math.abs(compHash).toString(16).toUpperCase().padStart(12, '0')}`;

  return {
    fingerprintId,
    canvasHash,
    webGlRenderer,
    screenResolution,
    userAgent,
    platform,
    language,
  };
}
