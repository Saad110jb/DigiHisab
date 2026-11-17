import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, getBackendBaseUrl } from '../config/env';

export const getBaseUrl = () => {
  return getApiBaseUrl();
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
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
