import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * DigiHisab Centralized Dual-Environment Configuration
 *
 * Toggle `USE_LOCALHOST`:
 * - `false` (Default for Standalone APK / Production): Routes to live Render services.
 * - `true` (Local Development): Routes to local PC development IP or localhost.
 */
export const USE_LOCALHOST = false;

// 1. Production live endpoints on Render
export const PRODUCTION_API_URL = 'https://digi-hisab.onrender.com';
export const PRODUCTION_FASTAPI_URL = 'https://digihisab.onrender.com';

// 2. Local development endpoints (Local PC IP & ports)
export const LOCAL_DEV_IP = '192.168.110.106';
export const LOCAL_API_URL = `http://${LOCAL_DEV_IP}:5000`;
export const LOCAL_FASTAPI_URL = `http://${LOCAL_DEV_IP}:8000`;

/**
 * Dynamically extract PC Wi-Fi IP address when running inside Expo Go
 */
const getExpoHostIp = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return null;
};

/**
 * Returns root backend URL without trailing slash (e.g. "https://digi-hisab.onrender.com")
 */
export const getBackendBaseUrl = (): string => {
  // If explicitly overridden via environment variable (e.g. in eas.json or .env)
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envApiUrl && envApiUrl.trim().length > 0) {
    return envApiUrl.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }

  // Production APK mode: always return live Render backend
  if (!USE_LOCALHOST) {
    return PRODUCTION_API_URL;
  }

  // Local development resolution:
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:5000`;
  }

  const expoIp = getExpoHostIp();
  if (expoIp) {
    return `http://${expoIp}:5000`;
  }

  if (Platform.OS === 'android') {
    return `http://${LOCAL_DEV_IP}:5000`;
  }

  return LOCAL_API_URL;
};

/**
 * Returns full API V1 endpoint URL (e.g. "https://digi-hisab.onrender.com/api/v1")
 */
export const getApiBaseUrl = (): string => {
  return `${getBackendBaseUrl()}/api/v1`;
};

/**
 * Returns WebSocket / Socket.io gateway root URL
 */
export const getSocketBaseUrl = (): string => {
  return getBackendBaseUrl();
};

/**
 * Returns FastAPI live service URL (e.g. "https://digihisab.onrender.com")
 */
export const getFastApiUrl = (): string => {
  const envFastApi = process.env.EXPO_PUBLIC_FASTAPI_URL;
  if (envFastApi && envFastApi.trim().length > 0) {
    return envFastApi.trim().replace(/\/$/, '');
  }

  if (!USE_LOCALHOST) {
    return PRODUCTION_FASTAPI_URL;
  }

  return LOCAL_FASTAPI_URL;
};
