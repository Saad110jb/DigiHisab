import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useAuth } from '../store/auth.store';
import { useNotifications } from './NotificationContext';
import { IPushNotification } from '../types/notification';

export interface IMaintenanceState {
  isActive: boolean;
  urduMessage?: string;
  englishMessage?: string;
  estimatedEndTime?: string;
}

export type UpdateStatus = 'UP_TO_DATE' | 'SOFT_UPDATE' | 'FORCED_UPDATE';

export interface AppVersionContextType {
  clientVersion: string;
  minSupportedVersion: string;
  latestVersion: string;
  updateStatus: UpdateStatus;
  updateUrl: string;
  maintenance: IMaintenanceState;
  featureFlags: Record<string, boolean>;
  changelogUrdu?: string;
  changelogEn?: string;
  bypassMaintenance: boolean;
  setBypassMaintenance: (bypassed: boolean) => void;
  isFeatureEnabled: (flagKey: string, defaultValue?: boolean) => boolean;
  refreshHandshake: () => Promise<void>;
  isChecking: boolean;
  dismissSoftUpdate: () => void;
  isSoftUpdateDismissed: boolean;
  isPaywallEnforced: boolean;
}

const AppVersionContext = createContext<AppVersionContextType | undefined>(undefined);

// Fallback client app version if not dynamically injected
const CURRENT_APP_BUILD_VERSION = '2.4.1';

// Dictionary of friendly titles for real-time notification alerts
const FLAG_TITLES: Record<string, { en: string; urdu: string }> = {
  jazzcash_qr_scanner: { en: 'JazzCash QR Payment Gateway', urdu: 'جاز کیش کیو آر گیٹ وے' },
  easypaisa_merchant_gateway: { en: 'EasyPaisa Dynamic QR & USSD API', urdu: 'ایزی پیسہ کیو آر گیٹ وے' },
  raast_p2m_instant_rail: { en: 'SBP Raast Instant P2M Payments', urdu: 'اسٹیٹ بینک راست فوری ادائیگی' },
  offline_local_sync: { en: 'Offline Local SQLite Sync Mode', urdu: 'آف لائن ڈیٹا سنک' },
  fbr_pos_digital_invoicing: { en: 'FBR Tier-1 POS e-Invoicing (PRAL)', urdu: 'ایف بی آر کمپیوٹرائزڈ انوائسنگ' },
  urdu_voice_khata_ai: { en: 'Urdu AI Voice-based Ledger Input', urdu: 'اردو آواز سے کھاتہ اندراج' },
  submeter_lesco_ocr: { en: 'LESCO/K-Electric Sub-Meter OCR Scanner', urdu: 'بجلی میٹر اور بل اسکینر' },
  whatsapp_invoice_messenger: { en: 'WhatsApp Cloud Automated Tagaza & Receipts', urdu: 'واٹس ایپ تقاضا اور رسیدیں' },
  kameti_auto_debit_ledger: { en: 'Domestic Kameti Auto-Debit Scheduler', urdu: 'گھریلو کمیٹی خودکار اندراج' },
  chor_nazar_cash_skimming_guard: { en: 'Chor Nazar Till Skimming Blocker', urdu: 'چور نظر کیش دراز پروٹیکشن' },
};

// Helper to resolve device IP for Expo Go physical Wi-Fi connection
const getHostIp = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return null;
};

// Function to resolve candidate endpoints across superadmin ports (3001, 3000) and Express server (5000)
const getCandidateUrls = (): string[] => {
  const hostIp = getHostIp();
  const webHost =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : null;

  const candidates: string[] = [];

  // 1. If physical device connected via Expo Go (e.g. 192.168.x.x)
  if (hostIp) {
    candidates.push(`http://${hostIp}:5000/api/v1/config/app-version`);
    candidates.push(`http://${hostIp}:3001/api/v1/config/app-version`);
    candidates.push(`http://${hostIp}:3000/api/v1/config/app-version`);
  }

  // 2. Web browser
  if (webHost) {
    candidates.push(`http://${webHost}:5000/api/v1/config/app-version`);
    candidates.push(`http://${webHost}:3001/api/v1/config/app-version`);
    candidates.push(`http://${webHost}:3000/api/v1/config/app-version`);
  }

  // 3. Android emulator loopback
  if (Platform.OS === 'android') {
    candidates.push(`http://10.0.2.2:5000/api/v1/config/app-version`);
    candidates.push(`http://10.0.2.2:3001/api/v1/config/app-version`);
    candidates.push(`http://10.0.2.2:3000/api/v1/config/app-version`);
  }

  // 4. Localhost fallback
  candidates.push(`http://127.0.0.1:5000/api/v1/config/app-version`);
  candidates.push(`http://127.0.0.1:3001/api/v1/config/app-version`);
  candidates.push(`http://127.0.0.1:3000/api/v1/config/app-version`);

  return candidates;
};

export const AppVersionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, activePersona } = useAuth();
  const { dispatchNotification } = useNotifications();

  const [clientVersion] = useState<string>(CURRENT_APP_BUILD_VERSION);
  const [minSupportedVersion, setMinSupportedVersion] = useState<string>('2.2.0');
  const [latestVersion, setLatestVersion] = useState<string>('2.4.1');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('UP_TO_DATE');
  const [updateUrl, setUpdateUrl] = useState<string>('https://play.google.com/store/apps/details?id=pk.digihisab.app');
  const [maintenance, setMaintenance] = useState<IMaintenanceState>({ isActive: false });
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    jazzcash_qr_scanner: true,
    easypaisa_merchant_gateway: true,
    raast_p2m_instant_rail: true,
    offline_local_sync: true,
    fbr_pos_digital_invoicing: true,
    urdu_voice_khata_ai: true,
    submeter_lesco_ocr: true,
    whatsapp_invoice_messenger: true,
    kameti_auto_debit_ledger: true,
    chor_nazar_cash_skimming_guard: true,
  });
  const [changelogUrdu, setChangelogUrdu] = useState<string>();
  const [changelogEn, setChangelogEn] = useState<string>();
  const [bypassMaintenance, setBypassMaintenance] = useState<boolean>(false);
  const [isSoftUpdateDismissed, setIsSoftUpdateDismissed] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isPaywallEnforced, setIsPaywallEnforced] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem('@digihisab_paywall_enforced')
      .then((val) => {
        if (val !== null) {
          setIsPaywallEnforced(val === 'true');
        }
      })
      .catch(() => {});
  }, []);

  // Transition Tracking Refs to trigger notifications upon real-time state changes
  const prevMaintenanceActive = useRef<boolean | null>(null);
  const prevFeatureFlags = useRef<Record<string, boolean> | null>(null);
  const prevUpdateStatus = useRef<UpdateStatus | null>(null);
  const prevPaywallEnforced = useRef<boolean | null>(null);

  const personaCode = activePersona === 'HOUSEHOLD' ? 'HOUSEHOLD' : 'DUKANDAR';

  const checkVersionAndMaintenance = useCallback(async () => {
    setIsChecking(true);
    const candidateUrls = getCandidateUrls();

    let fetchedData: any = null;

    for (const url of candidateUrls) {
      try {
        const queryUrl = `${url}?version=${encodeURIComponent(clientVersion)}&persona=${encodeURIComponent(personaCode)}&_t=${Date.now()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch(queryUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            fetchedData = json.data;
            break; // Stop at first successful candidate
          }
        }
      } catch (err) {
        // Try next candidate endpoint
      }
    }

    if (fetchedData) {
      const isMaintActive = Boolean(fetchedData.maintenance?.isActive);

      // 1. Check for Emergency Maintenance Transitions
      if (prevMaintenanceActive.current !== null && prevMaintenanceActive.current !== isMaintActive) {
        if (isMaintActive) {
          // Maintenance was JUST ACTIVATED -> Trigger High-Priority Alert & Lock Screen
          dispatchNotification({
            id: `maint-active-${Date.now()}`,
            category: 'SYSTEM_BROADCAST',
            priority: 'CRITICAL',
            titleUrdu: '🚨 ایمرجنسی سسٹم مینٹیننس - Digi Hisab',
            titleEnglish: 'Emergency System Maintenance Active',
            messageUrdu:
              fetchedData.maintenance?.urduMessage ||
              'سسٹم اپ گریڈ جاری ہے۔ آپ کا کھاتہ، کسٹمر بیلنس اور ڈیٹا 100% محفوظ ہے۔',
            messageEnglish: 'Scheduled database maintenance is in progress. Counter paused.',
            timestamp: new Date().toISOString(),
            actionLabel: 'تفصیلات',
            durationMs: 8000,
          });
        } else {
          // Maintenance was DEACTIVATED -> Trigger Restoration Alert
          dispatchNotification({
            id: `maint-restored-${Date.now()}`,
            category: 'SYSTEM_BROADCAST',
            priority: 'SUCCESS',
            titleUrdu: '✅ سسٹم سروس بحال ہو گئی ہے - Digi Hisab',
            titleEnglish: 'System Restored - POS Online',
            messageUrdu: 'دیکھ بھال کا کام مکمل ہو چکا ہے۔ تمام کاؤنٹر سیل اور کھاتہ سروسز بحال ہیں۔',
            messageEnglish: 'Maintenance completed. Cashier transactions and ledger active.',
            timestamp: new Date().toISOString(),
            actionLabel: 'کاؤنٹر سیل',
            actionRoute: 'QuickSaleModal',
            durationMs: 6000,
          });
        }
      }
      prevMaintenanceActive.current = isMaintActive;

      if (fetchedData.maintenance) {
        setMaintenance(fetchedData.maintenance);
      }

      // 2. Check for Feature Flag Kill Switch Transitions
      if (fetchedData.featureFlags) {
        const incomingFlags: Record<string, boolean> = fetchedData.featureFlags;

        if (prevFeatureFlags.current !== null) {
          Object.keys(incomingFlags).forEach((key) => {
            const oldVal = prevFeatureFlags.current ? prevFeatureFlags.current[key] : undefined;
            const newVal = incomingFlags[key];

            if (oldVal !== undefined && oldVal !== newVal) {
              const meta = FLAG_TITLES[key] || { en: key, urdu: key };
              if (!newVal) {
                // Flag was KILLED / DISABLED -> Alert merchant
                dispatchNotification({
                  id: `flag-disabled-${key}-${Date.now()}`,
                  category: 'SYSTEM_BROADCAST',
                  priority: 'WARNING',
                  titleUrdu: `⚠️ فیچر معطل: ${meta.urdu}`,
                  titleEnglish: `⚠️ Gateway Paused: ${meta.en}`,
                  messageUrdu: `${meta.urdu} عارضی دیکھ بھال کے لیے بند کیا گیا ہے۔ وقتی طور پر متبادل طریقہ استعمال کریں۔`,
                  messageEnglish: `${meta.en} has been temporarily paused for gateway maintenance.`,
                  timestamp: new Date().toISOString(),
                  actionLabel: 'سمجھ گئے',
                  durationMs: 6500,
                });
              } else {
                // Flag was RE-ENABLED -> Notify merchant
                dispatchNotification({
                  id: `flag-enabled-${key}-${Date.now()}`,
                  category: 'SYSTEM_BROADCAST',
                  priority: 'SUCCESS',
                  titleUrdu: `✅ فیچر بحال: ${meta.urdu}`,
                  titleEnglish: `✅ Feature Active: ${meta.en}`,
                  messageUrdu: `${meta.urdu} دوبارہ فعال ہو چکا ہے۔ کاؤنٹر پر وصولی جاری رکھیں۔`,
                  messageEnglish: `${meta.en} is online and operational.`,
                  timestamp: new Date().toISOString(),
                  actionLabel: 'کاؤنٹر',
                  durationMs: 5000,
                });
              }
            }
          });
        }

        prevFeatureFlags.current = { ...incomingFlags };
        setFeatureFlags((prev) => ({
          ...prev,
          ...incomingFlags,
        }));
      }

      // 3. Check for Forced Update Transitions
      const currentUpdateStatus = fetchedData.updateStatus || 'UP_TO_DATE';
      if (
        prevUpdateStatus.current !== null &&
        prevUpdateStatus.current !== currentUpdateStatus &&
        currentUpdateStatus === 'FORCED_UPDATE'
      ) {
        dispatchNotification({
          id: `update-forced-${Date.now()}`,
          category: 'SYSTEM_BROADCAST',
          priority: 'CRITICAL',
          titleUrdu: `🚨 اہم سیکیورٹی اپ ڈیٹ لازمی ہے (v${fetchedData.latestVersion || '2.4.1'})`,
          titleEnglish: 'Critical App Update Required',
          messageUrdu: 'اسٹیٹ بینک سیکیورٹی قوانین کے تحت نیا ورژن لازمی ہے۔ گوگل پلے سے فوری اپ ڈیٹ کریں۔',
          messageEnglish: 'Legacy version deprecated. App update required to continue.',
          timestamp: new Date().toISOString(),
          actionLabel: 'اپ ڈیٹ کریں',
          actionRoute: 'ForcedUpdateModal',
          durationMs: 8000,
        });
      }
      prevUpdateStatus.current = currentUpdateStatus;

      setUpdateStatus(currentUpdateStatus);
      if (fetchedData.minSupportedVersion) setMinSupportedVersion(fetchedData.minSupportedVersion);
      if (fetchedData.latestVersion) setLatestVersion(fetchedData.latestVersion);
      if (fetchedData.updateUrl) setUpdateUrl(fetchedData.updateUrl);
      if (fetchedData.changelogUrdu) setChangelogUrdu(fetchedData.changelogUrdu);
      if (fetchedData.changelogEn) setChangelogEn(fetchedData.changelogEn);

      // 4. Check Paywall / Subscription Enforcement from SuperAdmin
      if (fetchedData.subscriptionEnforcementActive !== undefined || fetchedData.enforcePaywalls !== undefined) {
        const incomingPaywall = Boolean(
          fetchedData.subscriptionEnforcementActive ?? fetchedData.enforcePaywalls
        );
        if (prevPaywallEnforced.current !== null && prevPaywallEnforced.current !== incomingPaywall) {
          if (!incomingPaywall) {
            dispatchNotification({
              id: `paywall-unlocked-${Date.now()}`,
              category: 'SYSTEM_BROADCAST',
              priority: 'SUCCESS',
              titleUrdu: '🎉 تمام فیچرز مفت دستیاب ہیں!',
              titleEnglish: 'All Features Unlocked for Free',
              messageUrdu: 'سپر ایڈمن کی طرف سے تمام پریمیم و اے آئی فیچرز تمام صارفین کے لیے مفت کر دیے گئے ہیں۔',
              messageEnglish: 'SuperAdmin has unlocked all premium and AI features for free.',
              timestamp: new Date().toISOString(),
              actionLabel: 'شکریہ',
              durationMs: 6000,
            });
          }
        }
        prevPaywallEnforced.current = incomingPaywall;
        setIsPaywallEnforced(incomingPaywall);
        AsyncStorage.setItem('@digihisab_paywall_enforced', String(incomingPaywall)).catch(() => {});
      }
    }
    setIsChecking(false);
  }, [clientVersion, personaCode, dispatchNotification]);

  // Initial fetch and dynamic polling every 5 seconds so SuperAdmin actions reflect immediately
  useEffect(() => {
    checkVersionAndMaintenance();
    const interval = setInterval(checkVersionAndMaintenance, 5000);
    return () => clearInterval(interval);
  }, [checkVersionAndMaintenance]);

  const isFeatureEnabled = useCallback(
    (flagKey: string, defaultValue: boolean = true): boolean => {
      if (featureFlags[flagKey] !== undefined) {
        return featureFlags[flagKey];
      }
      return defaultValue;
    },
    [featureFlags]
  );

  const dismissSoftUpdate = () => {
    setIsSoftUpdateDismissed(true);
  };

  return (
    <AppVersionContext.Provider
      value={{
        clientVersion,
        minSupportedVersion,
        latestVersion,
        updateStatus,
        updateUrl,
        maintenance,
        featureFlags,
        changelogUrdu,
        changelogEn,
        bypassMaintenance,
        setBypassMaintenance,
        isFeatureEnabled,
        refreshHandshake: checkVersionAndMaintenance,
        isChecking,
        dismissSoftUpdate,
        isSoftUpdateDismissed,
        isPaywallEnforced,
      }}
    >
      {children}
    </AppVersionContext.Provider>
  );
};

export const useAppVersion = (): AppVersionContextType => {
  const context = useContext(AppVersionContext);
  if (!context) {
    throw new Error('useAppVersion must be used within an AppVersionProvider');
  }
  return context;
};
