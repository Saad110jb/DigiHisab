export interface IAppVersionRecord {
  id: string; // e.g. "BUILD-241"
  versionString: string; // e.g. "2.4.1"
  versionCode: number; // e.g. 241
  releaseDate: string;
  persona: 'DUKANDAR' | 'HOUSEHOLD' | 'ALL';
  platform: 'ANDROID' | 'IOS' | 'WEB';
  activeInstallsCount: number;
  adoptionPercentage: number;
  status: 'ACTIVE' | 'DEPRECATED' | 'BLOCKED';
  changelogUrdu: string;
  changelogEn: string;
  apkDownloadUrl?: string;
}

export type FeatureFlagCategory =
  | 'PAYMENTS'
  | 'CONNECTIVITY'
  | 'AI_FEATURES'
  | 'UTILITIES'
  | 'TAX_LEGAL'
  | 'MESSAGING'
  | 'HOUSEHOLD'
  | 'FRAUD_PREVENTION';

export interface IFeatureFlag {
  key: string;
  title: string;
  description: string;
  descriptionUrdu: string;
  category: FeatureFlagCategory;
  isEnabled: boolean;
  rolloutPercentage: number; // 0 to 100
  affectedPersonas: ('DUKANDAR' | 'HOUSEHOLD')[];
  lastModifiedBy: string;
  lastModifiedAt: string;
}

export interface IMaintenanceConfig {
  isActive: boolean;
  scheduledStartTime?: string;
  estimatedEndTime?: string;
  durationMinutes: number;
  urduMessage: string;
  englishMessage: string;
  allowedIpWhitelist: string[];
  allowAdminBypass: boolean;
  lastToggledBy: string;
  lastToggledAt: string;
}

export interface IVersionControlSettings {
  dukanMinVersion: string;
  dukanLatestVersion: string;
  gharMinVersion: string;
  gharLatestVersion: string;
  playStoreUrl: string;
  apkDirectUrl: string;
}

export interface IClientHandshakeResponse {
  maintenance: {
    isActive: boolean;
    urduMessage?: string;
    englishMessage?: string;
    estimatedEndTime?: string;
  };
  updateStatus: 'UP_TO_DATE' | 'SOFT_UPDATE' | 'FORCED_UPDATE';
  clientVersion: string;
  minSupportedVersion: string;
  latestVersion: string;
  updateUrl: string;
  changelogUrdu?: string;
  changelogEn?: string;
  featureFlags: Record<string, boolean>;
  subscriptionEnforcementActive?: boolean;
  enforcePaywalls?: boolean;
}
