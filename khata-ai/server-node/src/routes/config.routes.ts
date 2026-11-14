import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const CANDIDATE_STATE_PATHS = [
  path.resolve(__dirname, '../../../../superadmin-frontend/.app-versions-state.json'),
  path.resolve(__dirname, '../../../superadmin-frontend/.app-versions-state.json'),
  path.resolve(process.cwd(), '../superadmin-frontend/.app-versions-state.json'),
  path.resolve(process.cwd(), 'superadmin-frontend/.app-versions-state.json'),
  'd:/Digi_Hisab/superadmin-frontend/.app-versions-state.json'
];

function getStateFilePath(): string | null {
  for (const p of CANDIDATE_STATE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function compareVersions(v1: string, v2: string): number {
  const parts1 = (v1 || '').replace(/[^0-9.]/g, '').split('.').map(Number);
  const parts2 = (v2 || '').replace(/[^0-9.]/g, '').split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

router.get('/app-version', (req: Request, res: Response) => {
  try {
    let state: any = null;
    const filePath = getStateFilePath();
    if (filePath && fs.existsSync(filePath)) {
      state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    const maintenance = state?.MAINTENANCE_CONFIG_STORE || { isActive: false };
    const settings = state?.VERSION_SETTINGS_STORE || {
      dukanMinVersion: '2.2.0',
      dukanLatestVersion: '2.4.1',
      gharMinVersion: '1.8.0',
      gharLatestVersion: '2.4.1',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=pk.digihisab.app',
    };
    const featureFlagsStore = state?.FEATURE_FLAGS_STORE || [];

    const clientVersion = (req.query.version as string) || (req.headers['x-client-version'] as string) || '2.4.1';
    const persona = ((req.query.persona as string) || (req.headers['x-persona'] as string) || 'DUKANDAR') as 'DUKANDAR' | 'HOUSEHOLD';

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress;
    const isWhitelisted = clientIp && maintenance.allowedIpWhitelist && maintenance.allowedIpWhitelist.includes(clientIp);

    // Maintenance check
    if (maintenance.isActive && !isWhitelisted) {
      return res.json({
        success: true,
        data: {
          maintenance: {
            isActive: true,
            urduMessage: maintenance.urduMessage,
            englishMessage: maintenance.englishMessage,
            estimatedEndTime: maintenance.estimatedEndTime,
          },
          updateStatus: 'UP_TO_DATE',
          clientVersion,
          minSupportedVersion: settings.dukanMinVersion,
          latestVersion: settings.dukanLatestVersion,
          updateUrl: settings.playStoreUrl,
          featureFlags: {},
        },
      });
    }

    // Version deprecation check
    const minVer = persona === 'DUKANDAR' ? settings.dukanMinVersion : settings.gharMinVersion;
    const latestVer = persona === 'DUKANDAR' ? settings.dukanLatestVersion : settings.gharLatestVersion;

    let updateStatus = 'UP_TO_DATE';
    if (compareVersions(clientVersion, minVer) < 0) {
      updateStatus = 'FORCED_UPDATE';
    } else if (compareVersions(clientVersion, latestVer) < 0) {
      updateStatus = 'SOFT_UPDATE';
    }

    const flags: Record<string, boolean> = {};
    featureFlagsStore.forEach((f: any) => {
      if (f.affectedPersonas && f.affectedPersonas.includes(persona)) {
        flags[f.key] = f.isEnabled;
      }
    });

    // Check paywall enforcement state from superadmin files
    let paywallEnforced = true;
    try {
      const CANDIDATE_SUB_PATHS = [
        path.resolve(__dirname, '../../../../superadmin-frontend/.admin-subscriptions-state.json'),
        path.resolve(__dirname, '../../../superadmin-frontend/.admin-subscriptions-state.json'),
        path.resolve(process.cwd(), '../superadmin-frontend/.admin-subscriptions-state.json'),
        'd:/Digi_Hisab/superadmin-frontend/.admin-subscriptions-state.json'
      ];
      for (const sp of CANDIDATE_SUB_PATHS) {
        if (fs.existsSync(sp)) {
          const subData = JSON.parse(fs.readFileSync(sp, 'utf8'));
          if (subData.GLOBAL_SYSTEM_FLAGS?.subscriptionEnforcementActive !== undefined) {
            paywallEnforced = Boolean(subData.GLOBAL_SYSTEM_FLAGS.subscriptionEnforcementActive);
            break;
          }
        }
      }
    } catch (e) {}

    return res.json({
      success: true,
      data: {
        maintenance: { isActive: false },
        updateStatus,
        clientVersion,
        minSupportedVersion: minVer,
        latestVersion: latestVer,
        updateUrl: settings.playStoreUrl,
        featureFlags: flags,
        subscriptionEnforcementActive: paywallEnforced,
        enforcePaywalls: paywallEnforced,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
