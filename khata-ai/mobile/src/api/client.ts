import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getHostIp = (): string | null => {
  // Dynamically extract PC Wi-Fi IP address from Expo Go connection string
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoGo?.developer?.tool;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  return null;
};

export const getBaseUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:5000/api/v1`;
  }

  const hostIp = getHostIp();
  if (hostIp) {
    return `http://${hostIp}:5000/api/v1`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api/v1';
  }
  return 'http://localhost:5000/api/v1';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export type UnauthenticatedCallback = () => void;
let unauthenticatedHandler: UnauthenticatedCallback | null = null;

export const setUnauthenticatedHandler = (callback: UnauthenticatedCallback | null) => {
  unauthenticatedHandler = callback;
};

// Interceptor to attach Bearer token to all outgoing requests
apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('user_token');
  if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle 401 Unauthorized token validation failures globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid persisted auth tokens
      await AsyncStorage.removeItem('user_token');
      await AsyncStorage.removeItem('user_profile');
      if (unauthenticatedHandler) {
        unauthenticatedHandler();
      }
    }
    return Promise.reject(error);
  }
);

export const getImageUrl = (urlOrPath?: string): string => {
  if (!urlOrPath) return '';
  if (
    urlOrPath.startsWith('http://') ||
    urlOrPath.startsWith('https://') ||
    urlOrPath.startsWith('data:image/') ||
    urlOrPath.startsWith('file://')
  ) {
    return urlOrPath;
  }
  const baseUrl = getBaseUrl().replace('/api/v1', '');
  return `${baseUrl}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
};
