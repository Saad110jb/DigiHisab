import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/store/auth.store';
import { NotificationProvider } from './src/context/NotificationContext';
import { FinancialMetricsProvider } from './src/context/FinancialMetricsContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'digihisab-global-containment';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          html, body, #root, [data-testid="root"] {
            max-width: 100vw !important;
            overflow-x: hidden !important;
            position: relative;
            -webkit-overflow-scrolling: touch;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          * {
            box-sizing: border-box;
          }
          /* Touch-Scrollable Strips without ugly scrollbars */
          .touch-scroll-row {
            display: flex;
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }
          .touch-scroll-row::-webkit-scrollbar {
            display: none;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <FinancialMetricsProvider>
            <NavigationContainer>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </FinancialMetricsProvider>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
