import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { IPushNotification } from '../types/notification';
import { apiClient, getBaseUrl } from '../api/client';

// Check if running inside Expo Go (where SDK 53+ removed native remote push APIs)
const isExpoGo = Constants.appOwnership === 'expo' || (Constants as any).executionEnvironment === 'storeClient';

// Lazy load expo-notifications ONLY outside of Expo Go to prevent SDK 53 red screen error
let Notifications: any = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    if (Notifications && Notifications.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch (e) {
    Notifications = null;
  }
}

interface NotificationContextValue {
  notifications: IPushNotification[];
  dismissNotification: (id: string) => void;
  dispatchNotification: (notification: IPushNotification) => void;
  triggerTestNotification: (category?: string) => Promise<void>;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<IPushNotification[]>([]);

  useEffect(() => {
    if (Platform.OS === 'android' && Notifications) {
      try {
        Notifications.setNotificationChannelAsync('digihisab-default', {
          name: 'DigiHisab Realtime Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0284C7',
          enableVibrate: true,
          showBadge: true,
          sound: 'default',
          lockscreenVisibility: (Notifications as any).AndroidNotificationVisibility
            ? (Notifications as any).AndroidNotificationVisibility.PUBLIC
            : 1,
        }).catch(() => {});

        Notifications.requestPermissionsAsync().catch(() => {});
      } catch (e) {}
    }

    // Auto-request browser Notification permission on Web
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dispatchNotification = useCallback((notification: IPushNotification) => {
    setNotifications((prev) => {
      // Avoid duplicate notification IDs
      const filtered = prev.filter((n) => n.id !== notification.id);
      // Keep maximum 3 stacked active notifications
      return [notification, ...filtered].slice(0, 3);
    });

    // Fire Native Android / iOS System Tray Notification (when not in Expo Go)
    if (Notifications && Notifications.scheduleNotificationAsync) {
      try {
        Notifications.scheduleNotificationAsync({
          content: {
            title: notification.titleUrdu ? `${notification.titleEnglish} • ${notification.titleUrdu}` : notification.titleEnglish,
            body: notification.messageUrdu || notification.messageEnglish,
            data: { route: notification.actionRoute, category: notification.category },
            sound: 'default',
          },
          trigger: {
            channelId: 'digihisab-default',
          },
        }).catch(() => {});
      } catch (e) {}
    }

    // Fire Web Browser Native OS Notification (Windows Notification Center / Mobile Chrome)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'granted') {
          new Notification(
            notification.titleUrdu
              ? `${notification.titleEnglish} • ${notification.titleUrdu}`
              : notification.titleEnglish,
            {
              body: notification.messageUrdu || notification.messageEnglish,
            }
          );
        }
      } catch (e) {}
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const triggerTestNotification = useCallback(async (category?: string) => {
    try {
      await apiClient.post('/notifications/test', {
        category: category || 'STOCK_ALERT',
        priority: category === 'GALLA_DISCREPANCY' ? 'CRITICAL' : 'WARNING',
      });
    } catch (err) {
      // Fallback local test notification if backend is unreachable
      dispatchNotification({
        id: `local-test-${Date.now()}`,
        category: (category as any) || 'STOCK_ALERT',
        priority: 'WARNING',
        titleUrdu: 'ٹیسٹ پش نوٹیفکیشن',
        titleEnglish: 'Test Push Notification',
        messageUrdu: 'یہ ایک ٹیسٹ پش نوٹیفکیشن بینر ہے۔',
        messageEnglish: 'This is a test push-down notification banner.',
        timestamp: new Date().toISOString(),
        actionLabel: 'تفصیلات',
        actionRoute: 'WholesalePoModal',
        durationMs: 5000,
      });
    }
  }, [dispatchNotification]);

  // Setup Real-time SSE subscriber for Web & React Native
  useEffect(() => {
    let sseSource: any = null;
    let xhr: XMLHttpRequest | null = null;
    let isMounted = true;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSseStream = async () => {
      try {
        const token = await AsyncStorage.getItem('user_token');
        if (!token || !isMounted) return;

        const baseUrl = getBaseUrl();
        const streamUrl = `${baseUrl}/notifications/stream?token=${encodeURIComponent(token)}`;

        if (typeof EventSource !== 'undefined') {
          sseSource = new EventSource(streamUrl);

          sseSource.addEventListener('notification', (event: any) => {
            if (!isMounted) return;
            try {
              const data: IPushNotification = JSON.parse(event.data);
              if (data && data.category === 'FINANCIAL_METRICS_SYNC') {
                DeviceEventEmitter.emit('FINANCIAL_METRICS_SYNC', data.metadata);
              } else {
                dispatchNotification(data);
              }
            } catch (e) {}
          });

          sseSource.addEventListener('FINANCIAL_METRICS_SYNC', (event: any) => {
            if (!isMounted) return;
            try {
              const data = JSON.parse(event.data);
              DeviceEventEmitter.emit('FINANCIAL_METRICS_SYNC', data);
            } catch (e) {
              DeviceEventEmitter.emit('FINANCIAL_METRICS_SYNC');
            }
          });

          sseSource.onerror = () => {
            if (sseSource) {
              sseSource.close();
              sseSource = null;
            }
            if (isMounted) {
              reconnectTimeout = setTimeout(connectSseStream, 5000);
            }
          };
        } else {
          // React Native streaming via XMLHttpRequest
          xhr = new XMLHttpRequest();
          xhr.open('GET', streamUrl, true);
          xhr.setRequestHeader('Accept', 'text/event-stream');

          let seenBytes = 0;
          xhr.onreadystatechange = () => {
            if (!isMounted) return;
            if (xhr && (xhr.readyState === 3 || xhr.readyState === 4)) {
              const responseText = xhr.responseText || '';
              const newChunk = responseText.substring(seenBytes);
              seenBytes = responseText.length;

              const lines = newChunk.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  try {
                    const rawJson = trimmed.substring(6);
                    const data: any = JSON.parse(rawJson);
                    if (data && data.category === 'FINANCIAL_METRICS_SYNC') {
                      DeviceEventEmitter.emit('FINANCIAL_METRICS_SYNC', data.metadata);
                    } else if (data && data.id && data.category) {
                      dispatchNotification(data);
                    }
                  } catch (e) {}
                }
              }
            }

            if (xhr && xhr.readyState === 4) {
              if (isMounted) {
                reconnectTimeout = setTimeout(connectSseStream, 5000);
              }
            }
          };

          xhr.onerror = () => {
            if (isMounted) {
              reconnectTimeout = setTimeout(connectSseStream, 5000);
            }
          };

          xhr.send();
        }
      } catch (err) {}
    };

    connectSseStream();

    return () => {
      isMounted = false;
      if (sseSource) sseSource.close();
      if (xhr) xhr.abort();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [dispatchNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        dismissNotification,
        dispatchNotification,
        triggerTestNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
