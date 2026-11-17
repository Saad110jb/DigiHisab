import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, setUnauthenticatedHandler } from '../api/client';
import { IMerchantPaymentSettings } from '../api/profile.api';

export type PersonaType = 'HOUSEHOLD' | 'VENDOR' | 'HYBRID';

export interface UserProfile {
  id: string;
  subAccountId?: string;
  fullName: string;
  phone: string;
  businessName?: string;
  address?: string;
  city?: string;
  activePersona: PersonaType;
  role?: 'OWNER' | 'MANAGER' | 'CASHIER' | string;
  paymentSettings?: IMerchantPaymentSettings;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  activePersona: PersonaType;
  isLoading: boolean;
  checkPhoneExists: (phone: string) => Promise<{
    success: boolean;
    exists: boolean;
    message?: string;
    data?: {
      fullName: string;
      phone: string;
      maskedPhone: string;
      businessName?: string;
      activePersona?: PersonaType;
      role?: string;
    };
  }>;
  login: (phone: string, pin: string) => Promise<{ success: boolean; message?: string }>;
  requestRegisterEmailOtp: (email: string, phone: string, persona: PersonaType) => Promise<{ success: boolean; message?: string; otpHint?: string }>;
  register: (data: {
    fullName: string;
    phone: string;
    email?: string;
    otp?: string;
    pin: string;
    activePersona: PersonaType;
    businessName?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  requestPinResetOtp: (phone: string) => Promise<{ success: boolean; message?: string; otpHint?: string }>;
  resetPinWithOtp: (phone: string, otp: string, newPin: string) => Promise<{ success: boolean; message?: string }>;
  switchPersona: (persona: PersonaType) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<PersonaType>('VENDOR');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      setToken(null);
      setUser(null);
    });
    loadPersistedAuth();

    return () => {
      setUnauthenticatedHandler(null);
    };
  }, []);

  const loadPersistedAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('user_token');
      const storedUser = await AsyncStorage.getItem('user_profile');

      if (storedToken && storedUser && storedToken !== 'null' && storedToken !== 'undefined') {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setActivePersona(parsedUser.activePersona || 'VENDOR');
      } else {
        await AsyncStorage.removeItem('user_token');
        await AsyncStorage.removeItem('user_profile');
        setToken(null);
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to load auth state', e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPhoneExists = async (phone: string) => {
    try {
      const res = await apiClient.post('/auth/check-phone', { phone });
      return res.data;
    } catch (err: any) {
      return {
        success: false,
        exists: false,
        message: err.response?.data?.message || 'Network error verifying phone number.',
      };
    }
  };

  const login = async (phone: string, pin: string) => {
    try {
      const res = await apiClient.post('/auth/login-pin', { phone, pin });
      if (res.data.success) {
        const authToken = res.data.token;
        const profileData = res.data.data;

        const profile: UserProfile = {
          id: profileData.profileId,
          subAccountId: profileData.subAccountId,
          fullName: profileData.fullName || profileData.name || 'User',
          phone: profileData.phone,
          businessName: profileData.businessName,
          address: profileData.address,
          city: profileData.city,
          activePersona: profileData.activePersona || 'VENDOR',
          role: profileData.role || 'OWNER',
        };

        await AsyncStorage.setItem('user_token', authToken);
        await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
        await AsyncStorage.setItem(
          'last_remembered_user',
          JSON.stringify({
            fullName: profile.fullName,
            phone: profile.phone,
            role: profile.role,
            businessName: profile.businessName,
          })
        );
        if (pin) {
          const cleanPhone = profile.phone.replace(/[^0-9+]/g, '');
          await AsyncStorage.setItem(`biometric_pin_${cleanPhone}`, pin);
        }

        setToken(authToken);
        setUser(profile);
        setActivePersona(profile.activePersona);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check network connection.',
      };
    }
  };

  const requestRegisterEmailOtp = async (email: string, phone: string, persona: PersonaType) => {
    try {
      const res = await apiClient.post('/auth/register/request-email-otp', {
        email: email.trim().toLowerCase(),
        phone,
        persona,
      });
      return {
        success: res.data.success,
        message: res.data.message,
        otpHint: res.data.otpHint,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Could not send verification OTP to email.',
      };
    }
  };

  const register = async (data: {
    fullName: string;
    phone: string;
    email?: string;
    otp?: string;
    pin: string;
    activePersona: PersonaType;
    businessName?: string;
  }) => {
    try {
      const res = await apiClient.post(data.otp ? '/auth/register/verify-and-create' : '/auth/register', data);
      if (res.data.success) {
        const authToken = res.data.token;
        const profileData = res.data.data;

        const profile: UserProfile = {
          id: profileData.profileId,
          fullName: data.fullName,
          phone: data.phone,
          businessName: data.businessName,
          activePersona: data.activePersona,
        };

        await AsyncStorage.setItem('user_token', authToken);
        await AsyncStorage.setItem('user_profile', JSON.stringify(profile));

        setToken(authToken);
        setUser(profile);
        setActivePersona(profile.activePersona);
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Registration failed.',
      };
    }
  };

  const requestPinResetOtp = async (phone: string) => {
    try {
      const res = await apiClient.post('/auth/forgot-pin/request-otp', { phone });
      return {
        success: true,
        message: res.data.message,
        otpHint: res.data.data?.otpHint,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to request OTP code.',
      };
    }
  };

  const resetPinWithOtp = async (phone: string, otp: string, newPin: string) => {
    try {
      const res = await apiClient.post('/auth/forgot-pin/reset', { phone, otp, newPin });
      return {
        success: true,
        message: res.data.message,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Failed to reset security PIN.',
      };
    }
  };

  const switchPersona = async (persona: PersonaType) => {
    if (persona === activePersona) return;
    setActivePersona(persona);
    if (user) {
      const updatedUser = { ...user, activePersona: persona };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_profile', JSON.stringify(updatedUser));
    }
    try {
      await apiClient.patch('/profile/persona', { activePersona: persona });
    } catch {
      // Safe fallback
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await apiClient.get('/profile');
      if (res.data?.data) {
        const prof = res.data.data;
        const updatedUser: UserProfile = {
          id: prof._id || prof.id,
          subAccountId: prof.subAccountId,
          fullName: prof.fullName,
          phone: prof.phone,
          businessName: prof.businessName,
          address: prof.businessAddress || prof.address,
          city: prof.shopAddress?.city,
          activePersona: prof.activePersona || 'VENDOR',
          role: user?.role || 'OWNER',
          paymentSettings: prof.paymentSettings,
        };
        setUser(updatedUser);
        await AsyncStorage.setItem('user_profile', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.warn('refreshProfile failed:', e);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user_token');
    await AsyncStorage.removeItem('user_profile');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        activePersona,
        isLoading,
        checkPhoneExists,
        login,
        requestRegisterEmailOtp,
        register,
        requestPinResetOtp,
        resetPinWithOtp,
        switchPersona,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
