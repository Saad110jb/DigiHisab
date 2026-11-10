import { Request, Response, NextFunction } from 'express';

// Corporate Office & Diaspora Developer IP Whitelist
const CORPORATE_VPN_IPS = new Set<string>([
  '127.0.0.1',
  '::1',
  '::ffff:127.0.0.1',
  '119.160.67.21', // Primary Nayatel Office Static Fiber
  '39.40.112.5',   // Secondary Zong Corporate APN
]);

// Configured Diaspora Developer IPs (Dubai, Riyadh, London, Silicon Valley)
const DIASPORA_DEV_WHITELIST = new Set<string>([
  '86.96.1.1',     // UAE Etisalat Dev Node
  '212.118.142.1', // KSA STC Dev Node
  '185.86.151.1',  // UK London Remote Relay
]);

export interface GeoInfo {
  ip: string;
  country: string;
  isPakistan: boolean;
  isAllowedCorporateVpn: boolean;
  isAllowedDiasporaDev: boolean;
  isPrivateNetwork: boolean;
}

declare global {
  namespace Express {
    interface Request {
      geoInfo?: GeoInfo;
    }
  }
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('172.3')
  );
}

export const geoFenceSentinel = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Resolve remote IP
  const rawIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const cleanIp = rawIp.replace(/^::ffff:/, '');
  const privateNet = isPrivateIp(cleanIp);

  // 2. Resolve country code from edge headers
  const countryHeader = (req.headers['cf-ipcountry'] as string || req.headers['x-country-code'] as string || '').toUpperCase();
  const country = countryHeader || (privateNet ? 'PK' : 'PK'); // Default to PK on private dev networks

  const isPakistan = country === 'PK' || privateNet;
  const isAllowedCorporateVpn = CORPORATE_VPN_IPS.has(cleanIp) || privateNet;
  const isAllowedDiasporaDev = DIASPORA_DEV_WHITELIST.has(cleanIp);

  req.geoInfo = {
    ip: cleanIp,
    country: isPakistan ? 'PK' : country,
    isPakistan,
    isAllowedCorporateVpn,
    isAllowedDiasporaDev,
    isPrivateNetwork: privateNet,
  };

  // Allow localhost / private development networks unconditionally
  if (privateNet || process.env.NODE_ENV === 'development') {
    return next();
  }

  // Reject strictly if outside Pakistan and not on allowlists
  if (!isPakistan && !isAllowedCorporateVpn && !isAllowedDiasporaDev) {
    res.status(403).json({
      success: false,
      code: 'ACCESS_DENIED_GEO_FENCE',
      message: 'Access denied: System is geofenced to Pakistan and authorized corporate VPNs.',
      ip: cleanIp,
      detectedCountry: country,
    });
    return;
  }

  next();
};
