import fs from 'fs';
import path from 'path';
import {
  IAppVersionRecord,
  IFeatureFlag,
  IMaintenanceConfig,
  IVersionControlSettings,
  IClientHandshakeResponse
} from '@/types/app-versions';

const STATE_FILE_PATH = path.join(process.cwd(), '.app-versions-state.json');

function saveStateToDisk() {
  try {
    const data = {
      APP_VERSIONS_STORE,
      VERSION_SETTINGS_STORE,
      FEATURE_FLAGS_STORE,
      MAINTENANCE_CONFIG_STORE
    };
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    // Ignore file write errors in restricted environments
  }
}

function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.APP_VERSIONS_STORE) APP_VERSIONS_STORE = parsed.APP_VERSIONS_STORE;
      if (parsed.VERSION_SETTINGS_STORE) VERSION_SETTINGS_STORE = parsed.VERSION_SETTINGS_STORE;
      if (parsed.FEATURE_FLAGS_STORE) {
        const diskKeys = new Set(parsed.FEATURE_FLAGS_STORE.map((f: any) => f.key));
        const newFlags = FEATURE_FLAGS_STORE.filter((f) => !diskKeys.has(f.key));
        FEATURE_FLAGS_STORE = [...parsed.FEATURE_FLAGS_STORE, ...newFlags];
      }
      if (parsed.MAINTENANCE_CONFIG_STORE) MAINTENANCE_CONFIG_STORE = parsed.MAINTENANCE_CONFIG_STORE;
    }
  } catch (err) {
    // Fall back to in-memory initial state
  }
}

// 1. Version History & Market Distribution
export let APP_VERSIONS_STORE: IAppVersionRecord[] = [
  {
    id: 'BUILD-241',
    versionString: '2.4.1',
    versionCode: 241,
    releaseDate: '2026-10-25',
    persona: 'ALL',
    platform: 'ANDROID',
    activeInstallsCount: 5410,
    adoptionPercentage: 64.2,
    status: 'ACTIVE',
    changelogUrdu: 'نئی سمارٹ شناختی کارڈ تصدیق، تیز رفتار کلاؤڈ سنک اور LESCO سب میٹر بلنگ کا اضافہ۔',
    changelogEn: 'Smart CNIC OCR verification, enhanced offline SQLite ledger synchronization, and NEPRA-compliant LESCO sub-meter billing.',
    apkDownloadUrl: 'https://cdn.digihisab.pk/apk/digi-hisab-v2.4.1.apk'
  },
  {
    id: 'BUILD-230',
    versionString: '2.3.0',
    versionCode: 230,
    releaseDate: '2026-09-10',
    persona: 'ALL',
    platform: 'ANDROID',
    activeInstallsCount: 1920,
    adoptionPercentage: 22.8,
    status: 'ACTIVE',
    changelogUrdu: 'جاز کیش کیو آر اسکینر کی رفتار میں بہتری اور اردو آواز کے ذریعے اندراج کا ابتدائی فیچر۔',
    changelogEn: 'JazzCash Dynamic QR scanner latency improvements and initial Urdu Voice AI Khata beta.',
    apkDownloadUrl: 'https://cdn.digihisab.pk/apk/digi-hisab-v2.3.0.apk'
  },
  {
    id: 'BUILD-210',
    versionString: '2.1.0',
    versionCode: 210,
    releaseDate: '2026-06-15',
    persona: 'DUKANDAR',
    platform: 'ANDROID',
    activeInstallsCount: 715,
    adoptionPercentage: 8.5,
    status: 'DEPRECATED',
    changelogUrdu: 'پرانا ورژن: اسٹیٹ بینک کے نئے سیکیورٹی رولز کے لیے فوری اپ ڈیٹ تجویز کی جاتی ہے۔',
    changelogEn: 'Legacy POS engine. Security update recommended for SBP 2026 cryptographic audit compliance.',
    apkDownloadUrl: 'https://cdn.digihisab.pk/apk/digi-hisab-v2.1.0.apk'
  },
  {
    id: 'BUILD-190',
    versionString: '1.9.0',
    versionCode: 190,
    releaseDate: '2026-01-20',
    persona: 'ALL',
    platform: 'ANDROID',
    activeInstallsCount: 380,
    adoptionPercentage: 4.5,
    status: 'BLOCKED',
    changelogUrdu: 'ناکارہ ورژن: یہ ورژن بلاک کر دیا گیا ہے۔ نیا ورژن لازمی انسٹال کریں۔',
    changelogEn: 'Hard Deprecated. Legacy REST endpoints permanently decommissioned. App update strictly required.',
    apkDownloadUrl: 'https://cdn.digihisab.pk/apk/digi-hisab-v2.4.1.apk'
  }
];

// 2. Persona Min Version Cutoff Settings
export let VERSION_SETTINGS_STORE: IVersionControlSettings = {
  dukanMinVersion: '2.2.0',
  dukanLatestVersion: '2.4.1',
  gharMinVersion: '1.8.0',
  gharLatestVersion: '2.4.1',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=pk.digihisab.app',
  apkDirectUrl: 'https://cdn.digihisab.pk/apk/digi-hisab-latest.apk'
};

// 3. Remote Feature Flags & Kill Switches
export let FEATURE_FLAGS_STORE: IFeatureFlag[] = [
  {
    key: 'jazzcash_qr_scanner',
    title: 'JazzCash QR Payment Gateway',
    description: 'Enables 1-tap customer checkout via dynamic merchant QR codes on Android POS.',
    descriptionUrdu: 'کاؤنٹر سیل پر جاز کیش کیو آر اسکین کے ذریعے فوری ڈیجیٹل وصولی',
    category: 'PAYMENTS',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['DUKANDAR'],
    lastModifiedBy: 'SuperAdmin Sentinel',
    lastModifiedAt: '2026-11-04 12:00 PKT'
  },
  {
    key: 'offline_local_sync',
    title: 'Offline Local SQLite Sync Mode',
    description: 'Caches vouchers locally and queues sync for rural stores with intermittent 2G/3G connectivity in Sindh & Southern Punjab.',
    descriptionUrdu: 'کمزور انٹرنیٹ والے علاقوں کے لیے آف لائن کھاتہ اندراج اور بعد میں خودکار سنک',
    category: 'CONNECTIVITY',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['DUKANDAR', 'HOUSEHOLD'],
    lastModifiedBy: 'Network Sentinel',
    lastModifiedAt: '2026-11-04 10:30 PKT'
  },
  {
    key: 'urdu_voice_khata_ai',
    title: 'Urdu AI Voice-based Ledger Input',
    description: 'Allows merchants to dictate udhaar transactions verbally in Urdu (Whisper-v3 fine-tuned on Pakistani dialects).',
    descriptionUrdu: 'اردو آواز کے ذریعے کھاتہ لکھوانے کی سہولت (مثال: اکرم کو 500 کا گھی ادھار دیا)',
    category: 'AI_FEATURES',
    isEnabled: true,
    rolloutPercentage: 35, // Beta group
    affectedPersonas: ['DUKANDAR'],
    lastModifiedBy: 'AI Product Lead',
    lastModifiedAt: '2026-11-04 16:15 PKT'
  },
  {
    key: 'submeter_lesco_ocr',
    title: 'LESCO/K-Electric Sub-Meter OCR Scanner',
    description: 'Extracts WAPDA bill units and consumer numbers from camera snapshots for automated household splits.',
    descriptionUrdu: 'بجلی کے بل کی تصویر سے خودکار یونٹس اور میٹر ریڈنگ کی شناخت',
    category: 'UTILITIES',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['HOUSEHOLD'],
    lastModifiedBy: 'Utility Desk',
    lastModifiedAt: '2026-11-04 14:00 PKT'
  },
  {
    key: 'easypaisa_merchant_gateway',
    title: 'EasyPaisa Dynamic QR & USSD API',
    description: 'Telenor Microfinance Bank QR gateway, direct till checkout, and USSD mobile push debits.',
    descriptionUrdu: 'کاؤنٹر سیل پر ایزی پیسہ کیو آر کوڈ اور یو ایس ایس ڈی کے ذریعے رقم کی وصولی',
    category: 'PAYMENTS',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['DUKANDAR'],
    lastModifiedBy: 'Payment Sentinel',
    lastModifiedAt: '2026-11-04 20:00 PKT'
  },
  {
    key: 'raast_p2m_instant_rail',
    title: 'SBP Raast Instant P2M Payments',
    description: 'Zero-fee National Payment Rail (State Bank of Pakistan) merchant QR scans via 1-Link interoperability.',
    descriptionUrdu: 'اسٹیٹ بینک راست فوری ادائیگی ریل (بغیر کسی اضافی چارجز کے فوری بینک ٹرانسفر)',
    category: 'PAYMENTS',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['DUKANDAR', 'HOUSEHOLD'],
    lastModifiedBy: 'SBP Compliance Desk',
    lastModifiedAt: '2026-11-04 20:30 PKT'
  },
  {
    key: 'fbr_pos_digital_invoicing',
    title: 'FBR Tier-1 POS e-Invoicing (PRAL)',
    description: 'Live PRAL fiscal invoice stamping, sales tax verification QR code printing, and daily tax ledger sync.',
    descriptionUrdu: 'ایف بی آر کمپیوٹرائزڈ سیلز ٹیکس انوائسنگ اور پرال کیو آر کوڈ کی تصدیق',
    category: 'TAX_LEGAL',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['DUKANDAR'],
    lastModifiedBy: 'Tax Compliance Lead',
    lastModifiedAt: '2026-11-04 21:00 PKT'
  },
  {
    key: 'whatsapp_invoice_messenger',
    title: 'WhatsApp Cloud Automated Tagaza & Receipts',
    description: 'Meta Business Cloud API for automated customer balance reminders, payment links, and PDF thermal receipts.',
    descriptionUrdu: 'گاہکوں کو بقایا جات کا خودکار واٹس ایپ میسج اور رسیدیں بھیجنے کی سہولت',
    category: 'MESSAGING',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['DUKANDAR'],
    lastModifiedBy: 'Growth Sentinel',
    lastModifiedAt: '2026-11-04 21:15 PKT'
  },
  {
    key: 'kameti_auto_debit_ledger',
    title: 'Domestic Kameti Auto-Debit Scheduler',
    description: 'Auto-deducts monthly kameti pool dues into domestic balance ledgers with SMS receipt broadcasting.',
    descriptionUrdu: 'گھریلو کمیٹی اقساط کا خودکار کھاتہ اندراج اور ممبران کو ایس ایم ایس الرٹ',
    category: 'HOUSEHOLD',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['HOUSEHOLD'],
    lastModifiedBy: 'Domestic Product Lead',
    lastModifiedAt: '2026-11-04 21:30 PKT'
  },
  {
    key: 'chor_nazar_cash_skimming_guard',
    title: 'Chor Nazar Till Skimming Blocker',
    description: 'Real-time transaction freeze and supervisor OTP lock when cash drawer discrepancy exceeds 5%.',
    descriptionUrdu: 'کیش دراز میں چوری یا 5 فیصد سے زیادہ کمی پر فوری کاؤنٹر لاک اور الرٹ',
    category: 'FRAUD_PREVENTION',
    isEnabled: true,
    rolloutPercentage: 100,
    affectedPersonas: ['DUKANDAR'],
    lastModifiedBy: 'Security Sentinel',
    lastModifiedAt: '2026-11-04 21:45 PKT'
  }
];

// 4. Emergency Maintenance Screen Configuration
export let MAINTENANCE_CONFIG_STORE: IMaintenanceConfig = {
  isActive: false,
  scheduledStartTime: '2026-11-04T23:00:00.000Z',
  estimatedEndTime: '2026-11-04T23:45:00.000Z',
  durationMinutes: 45,
  urduMessage: 'سسٹم اپ گریڈ جاری ہے: برائے مہربانی کچھ دیر بعد دوبارہ کوشش کریں۔ آپ کا کھاتہ، بیلنس اور کسٹمر ریکارڈ محفوظ ہے۔',
  englishMessage: 'Scheduled System Maintenance: Digi Hisab is currently upgrading database clusters. All your ledger balances and merchant records are secure. Service will resume shortly.',
  allowedIpWhitelist: ['39.40.112.5'],
  allowAdminBypass: true,
  lastToggledBy: 'SuperAdmin Root',
  lastToggledAt: '2026-11-04 18:00 PKT'
};

// Helper: Semantic Version Comparator
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
  const parts2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

// Ensure initial disk state is loaded
loadStateFromDisk();

export function getMaintenanceConfig(): IMaintenanceConfig {
  loadStateFromDisk();
  return MAINTENANCE_CONFIG_STORE;
}

export function getFeatureFlags(): IFeatureFlag[] {
  loadStateFromDisk();
  return FEATURE_FLAGS_STORE;
}

export function getVersionMatrixData() {
  loadStateFromDisk();
  return {
    versions: APP_VERSIONS_STORE,
    settings: VERSION_SETTINGS_STORE
  };
}

// 5. Client Boot Handshake Evaluator
export function evaluateClientHandshake(
  clientVersion: string = '2.4.1',
  persona: 'DUKANDAR' | 'HOUSEHOLD' = 'DUKANDAR',
  clientIp?: string
): IClientHandshakeResponse {
  loadStateFromDisk();
  const isWhitelisted = clientIp && MAINTENANCE_CONFIG_STORE.allowedIpWhitelist.includes(clientIp);

  // 1. Maintenance Check
  if (MAINTENANCE_CONFIG_STORE.isActive && !isWhitelisted) {
    return {
      maintenance: {
        isActive: true,
        urduMessage: MAINTENANCE_CONFIG_STORE.urduMessage,
        englishMessage: MAINTENANCE_CONFIG_STORE.englishMessage,
        estimatedEndTime: MAINTENANCE_CONFIG_STORE.estimatedEndTime
      },
      updateStatus: 'UP_TO_DATE',
      clientVersion,
      minSupportedVersion: VERSION_SETTINGS_STORE.dukanMinVersion,
      latestVersion: VERSION_SETTINGS_STORE.dukanLatestVersion,
      updateUrl: VERSION_SETTINGS_STORE.playStoreUrl,
      featureFlags: {}
    };
  }

  // 2. Version Deprecation Check
  const minVer = persona === 'DUKANDAR'
    ? VERSION_SETTINGS_STORE.dukanMinVersion
    : VERSION_SETTINGS_STORE.gharMinVersion;
  const latestVer = persona === 'DUKANDAR'
    ? VERSION_SETTINGS_STORE.dukanLatestVersion
    : VERSION_SETTINGS_STORE.gharLatestVersion;

  let updateStatus: 'UP_TO_DATE' | 'SOFT_UPDATE' | 'FORCED_UPDATE' = 'UP_TO_DATE';

  if (compareVersions(clientVersion, minVer) < 0) {
    updateStatus = 'FORCED_UPDATE'; // Hard block
  } else if (compareVersions(clientVersion, latestVer) < 0) {
    updateStatus = 'SOFT_UPDATE'; // Dismissible prompt
  }

  // 3. Filter Active Feature Flags for this persona
  const flags: Record<string, boolean> = {};
  FEATURE_FLAGS_STORE.forEach((f) => {
    if (f.affectedPersonas.includes(persona)) {
      flags[f.key] = f.isEnabled;
    }
  });

  // 4. Check Global Paywall / Subscription Enforcement Status
  let paywallEnforced = true;
  try {
    const subStatePath = path.join(process.cwd(), '.admin-subscriptions-state.json');
    if (fs.existsSync(subStatePath)) {
      const parsedSub = JSON.parse(fs.readFileSync(subStatePath, 'utf8'));
      if (parsedSub.GLOBAL_SYSTEM_FLAGS?.subscriptionEnforcementActive !== undefined) {
        paywallEnforced = Boolean(parsedSub.GLOBAL_SYSTEM_FLAGS.subscriptionEnforcementActive);
      }
    }
    const redisStatePath = path.join(process.cwd(), '.redis-cache-state.json');
    if (fs.existsSync(redisStatePath)) {
      const parsedRedis = JSON.parse(fs.readFileSync(redisStatePath, 'utf8'));
      if (parsedRedis.config?.enforcePaywalls !== undefined) {
        paywallEnforced = Boolean(parsedRedis.config.enforcePaywalls) && paywallEnforced;
      }
    }
  } catch (e) {}

  return {
    maintenance: { isActive: false },
    updateStatus,
    clientVersion,
    minSupportedVersion: minVer,
    latestVersion: latestVer,
    updateUrl: VERSION_SETTINGS_STORE.playStoreUrl,
    changelogUrdu: APP_VERSIONS_STORE[0]?.changelogUrdu,
    changelogEn: APP_VERSIONS_STORE[0]?.changelogEn,
    featureFlags: flags,
    subscriptionEnforcementActive: paywallEnforced,
    enforcePaywalls: paywallEnforced
  };
}

// 6. Mutation Methods
export function updateVersionSettings(newSettings: Partial<IVersionControlSettings>) {
  loadStateFromDisk();
  VERSION_SETTINGS_STORE = { ...VERSION_SETTINGS_STORE, ...newSettings };
  saveStateToDisk();
  return VERSION_SETTINGS_STORE;
}

export function toggleFeatureFlag(key: string, isEnabled: boolean, rolloutPercentage?: number) {
  loadStateFromDisk();
  const flag = FEATURE_FLAGS_STORE.find((f) => f.key === key);
  if (flag) {
    flag.isEnabled = isEnabled;
    if (rolloutPercentage !== undefined) flag.rolloutPercentage = rolloutPercentage;
    flag.lastModifiedAt = new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' }) + ' PKT';
    flag.lastModifiedBy = 'SuperAdmin Sentinel';
    saveStateToDisk();
    return flag;
  }
  return null;
}

export function setMaintenanceMode(
  isActive: boolean,
  durationMinutes: number = 45,
  customUrduMsg?: string
) {
  loadStateFromDisk();
  MAINTENANCE_CONFIG_STORE.isActive = isActive;
  MAINTENANCE_CONFIG_STORE.durationMinutes = durationMinutes;
  if (customUrduMsg) MAINTENANCE_CONFIG_STORE.urduMessage = customUrduMsg;

  if (isActive) {
    const end = new Date(Date.now() + durationMinutes * 60 * 1000);
    MAINTENANCE_CONFIG_STORE.estimatedEndTime = end.toISOString();
  } else {
    MAINTENANCE_CONFIG_STORE.estimatedEndTime = undefined;
  }

  MAINTENANCE_CONFIG_STORE.lastToggledAt = new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' }) + ' PKT';
  saveStateToDisk();
  return MAINTENANCE_CONFIG_STORE;
}
