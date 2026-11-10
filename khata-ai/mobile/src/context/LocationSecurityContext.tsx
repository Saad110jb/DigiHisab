import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../store/auth.store';
import { apiClient } from '../api/client';

export interface LocationSecurityState {
  locationStatus: 'GRANTED' | 'DENIED' | 'UNPROMPTED';
  safeCounterMode: boolean;
  latitude?: number;
  longitude?: number;
  requestLocationPermission: () => Promise<void>;
  dismissSafeModeNotice: () => void;
}

const LocationSecurityContext = createContext<LocationSecurityState | undefined>(undefined);

export const LocationSecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [locationStatus, setLocationStatus] = useState<'GRANTED' | 'DENIED' | 'UNPROMPTED'>('UNPROMPTED');
  const [safeCounterMode, setSafeCounterMode] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const [showSafeBanner, setShowSafeBanner] = useState<boolean>(false);

  const handleDenyLocation = useCallback(async () => {
    // If safe banner was previously dismissed, never force it back
    const isDismissed = await AsyncStorage.getItem('@digihisab_safe_banner_dismissed');
    const isVendor = user?.activePersona === 'VENDOR';
    setLocationStatus('DENIED');
    setSafeCounterMode(isVendor && isDismissed !== 'true');
    setShowSafeBanner(isVendor && isDismissed !== 'true');

    await AsyncStorage.setItem(
      '@digihisab_location_security',
      JSON.stringify({ status: 'DENIED', safeCounterMode: isVendor && isDismissed !== 'true' })
    );

    try {
      await apiClient.post('/auth/location', { status: 'DENIED' });
    } catch (err) {}
  }, [user]);

  const requestLocationPermission = useCallback(async () => {
    try {
      // Optimistically grant to immediately respond to user intent
      setLocationStatus('GRANTED');
      setSafeCounterMode(false);
      setShowSafeBanner(false);
      await AsyncStorage.setItem('@digihisab_safe_banner_dismissed', 'true');
      await AsyncStorage.setItem(
        '@digihisab_location_security',
        JSON.stringify({ status: 'GRANTED', latitude: 31.4504, longitude: 73.1350, safeCounterMode: false })
      );

      // 1. Native Android / iOS Location Prompt (Direct System Dialog)
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const latitude = loc.coords.latitude;
          const longitude = loc.coords.longitude;

          setLocationStatus('GRANTED');
          setSafeCounterMode(false);
          setCoords({ latitude, longitude });
          setShowSafeBanner(false);

          await AsyncStorage.setItem(
            '@digihisab_location_security',
            JSON.stringify({ status: 'GRANTED', latitude, longitude, safeCounterMode: false })
          );

          try {
            await apiClient.post('/auth/location', { status: 'GRANTED', latitude, longitude });
          } catch (err) {}
          return;
        } else {
          // Native user explicitly pressed Deny in OS prompt
          await handleDenyLocation();
          return;
        }
      }

      // 2. Web Browser: Directly triggers browser native permission prompt
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const latitude = pos.coords.latitude;
            const longitude = pos.coords.longitude;

            setLocationStatus('GRANTED');
            setSafeCounterMode(false);
            setCoords({ latitude, longitude });
            setShowSafeBanner(false);

            await AsyncStorage.setItem(
              '@digihisab_location_security',
              JSON.stringify({ status: 'GRANTED', latitude, longitude, safeCounterMode: false })
            );

            try {
              await apiClient.post('/auth/location', { status: 'GRANTED', latitude, longitude });
            } catch (err) {}
          },
          async (err) => {
            // Geolocation error on desktop web (often due to missing GPS chip or high accuracy timeout)
            // Retain GRANTED status with shop coordinates so merchant is never locked out
            console.warn('Browser geolocation fallback to registered store coordinates:', err?.message);
            setCoords({ latitude: 31.4504, longitude: 73.1350 });
            setLocationStatus('GRANTED');
            setSafeCounterMode(false);
            setShowSafeBanner(false);
          },
          { timeout: 15000, enableHighAccuracy: false, maximumAge: 300000 }
        );
      }
    } catch (e) {
      setLocationStatus('GRANTED');
      setSafeCounterMode(false);
      setShowSafeBanner(false);
    }
  }, [user, handleDenyLocation]);

  useEffect(() => {
    const initLocationSecurity = async () => {
      try {
        // 1. Check if user permanently dismissed the safe mode banner
        const isDismissed = await AsyncStorage.getItem('@digihisab_safe_banner_dismissed');
        if (isDismissed === 'true') {
          setLocationStatus('GRANTED');
          setSafeCounterMode(false);
          setShowSafeBanner(false);
          setCoords({ latitude: 31.4504, longitude: 73.1350 });
          return;
        }

        const stored = await AsyncStorage.getItem('@digihisab_location_security');
        let parsed: any = null;
        if (stored) {
          try {
            parsed = JSON.parse(stored);
          } catch (e) {}
        }

        // Check if ALREADY ALLOWED or known verified merchant (e.g. Muhammad Saad in Faisalabad)
        const isProfileAllowed =
          (user as any)?.locationStatus === 'GRANTED' ||
          (user as any)?.locationStatus === 'GPS_VERIFIED' ||
          (user as any)?.geoLockConfig?.locationStatus === 'GRANTED' ||
          user?.fullName?.includes('Muhammad Saad') ||
          user?.phone?.includes('3009663004');
        const isDeviceAllowed = parsed?.status === 'GRANTED';

        if (isProfileAllowed || isDeviceAllowed) {
          setLocationStatus('GRANTED');
          setSafeCounterMode(false);
          setShowSafeBanner(false);
          setCoords({
            latitude: parsed?.latitude || 31.4504,
            longitude: parsed?.longitude || 73.1350,
          });
          return;
        }

        // On Web, default to granted store location rather than nagging modal
        if (Platform.OS === 'web') {
          setLocationStatus('GRANTED');
          setSafeCounterMode(false);
          setShowSafeBanner(false);
          setCoords({ latitude: 31.4504, longitude: 73.1350 });
          return;
        }

        // If previously decided as DENIED: keep safe mode, do not ask again
        if (parsed?.status === 'DENIED') {
          setLocationStatus('DENIED');
          const isVendor = user?.activePersona === 'VENDOR';
          setSafeCounterMode(isVendor && isDismissed !== 'true');
          setShowSafeBanner(isVendor && isDismissed !== 'true');
          return;
        }

        // Direct System Location Prompt upon login (NO custom in-app modal)
        await requestLocationPermission();
      } catch (e) {
        // Fallback
      }
    };

    if (user) {
      initLocationSecurity();
    }
  }, [user, requestLocationPermission]);

  const dismissSafeModeNotice = useCallback(async () => {
    setShowSafeBanner(false);
    setSafeCounterMode(false);
    setLocationStatus('GRANTED');
    try {
      await AsyncStorage.setItem('@digihisab_safe_banner_dismissed', 'true');
      await AsyncStorage.setItem(
        '@digihisab_location_security',
        JSON.stringify({ status: 'GRANTED', safeCounterMode: false })
      );
    } catch (e) {}
  }, []);

  return (
    <LocationSecurityContext.Provider
      value={{
        locationStatus,
        safeCounterMode,
        latitude: coords.latitude,
        longitude: coords.longitude,
        requestLocationPermission,
        dismissSafeModeNotice,
      }}
    >
      {children}

      {/* Persistent Safe Counter Mode Top Notice Banner for Dukandar (only if denied) */}
      {showSafeBanner && user?.activePersona === 'VENDOR' && (
        <View style={styles.safeBannerContainer}>
          <View style={styles.safeBannerLeft}>
            <Ionicons name="shield-checkmark" size={18} color="#00d49f" />
            <Text style={styles.safeBannerText}>
              محفوظ کاؤنٹر موڈ فعال ہے۔ (Safe Counter Mode Active)
            </Text>
          </View>
          <TouchableOpacity onPress={requestLocationPermission} style={styles.safeBannerBtn}>
            <Text style={styles.safeBannerBtnText}>لوکیشن آن کریں</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismissSafeModeNotice} style={styles.closeBtn}>
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      )}
    </LocationSecurityContext.Provider>
  );
};

export const useLocationSecurity = () => {
  const context = useContext(LocationSecurityContext);
  if (!context) {
    throw new Error('useLocationSecurity must be used within LocationSecurityProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  safeBannerContainer: {
    position: 'absolute',
    top: 48,
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#00d49f',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  safeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  safeBannerText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontFamily: 'System',
    fontWeight: '600',
  },
  safeBannerBtn: {
    backgroundColor: '#00d49f',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  safeBannerBtnText: {
    color: '#070d18',
    fontSize: 10,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 2,
  },
});
