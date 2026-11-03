import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../store/auth.store';
import { COLORS } from '../../theme/colors';

type LoginStep = 'PHONE_WINDOW' | 'PIN_WINDOW' | 'FORGOT_PIN_WINDOW';

interface RememberedUser {
  fullName: string;
  phone: string;
  role?: string;
  businessName?: string;
}

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, checkPhoneExists, requestPinResetOtp, resetPinWithOtp } = useAuth();

  // Navigation / Step state
  const [step, setStep] = useState<LoginStep>('PHONE_WINDOW');

  // Input states
  const [phone, setPhone] = useState('03001234567');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Hidden TextInput ref for 4-digit PIN boxes
  const pinInputRef = useRef<TextInput>(null);

  // Remembered User for 1-Tap Google / Android Fingerprint Direct Login
  const [rememberedUser, setRememberedUser] = useState<RememberedUser | null>(null);
  const [showPhoneInputOverride, setShowPhoneInputOverride] = useState(false);
  const [hasAutoPromptedDirect, setHasAutoPromptedDirect] = useState(false);

  // Forgot PIN Recovery states
  const [otpCode, setOtpCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [otpHintMsg, setOtpHintMsg] = useState<string | null>(null);

  // User Verification details fetched from Step 1
  const [verifiedAccount, setVerifiedAccount] = useState<{
    fullName: string;
    maskedPhone: string;
    businessName?: string;
    activePersona?: string;
    role?: string;
  } | null>(null);

  // Security & Throttling states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Biometric / Fingerprint states
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [biometricName, setBiometricName] = useState('Fingerprint / فنگر پرنٹ');
  const [hasPromptedBiometricStep2, setHasPromptedBiometricStep2] = useState(false);

  // Brute-force lockout timer
  useEffect(() => {
    let timer: any;
    if (lockoutSeconds > 0) {
      timer = setInterval(() => {
        setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Check hardware biometric capabilities on mount
  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsBiometricSupported(hasHardware);
        setIsBiometricEnrolled(isEnrolled);

        if (hasHardware) {
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricName('Face ID / فیس آئی ڈی');
          } else {
            setBiometricName('Fingerprint / فنگر پرنٹ');
          }
        }
      } catch (err) {
        console.warn('Biometric capability check failed:', err);
      }
    };
    checkBiometrics();
  }, []);

  // Load Remembered Account on mount for Instant Direct Fingerprint Login
  useEffect(() => {
    const loadRememberedUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('last_remembered_user');
        if (stored) {
          const parsed: RememberedUser = JSON.parse(stored);
          if (parsed && parsed.phone) {
            setRememberedUser(parsed);
            setPhone(parsed.phone);
          }
        }
      } catch (err) {
        console.warn('Failed to load remembered user:', err);
      }
    };
    loadRememberedUser();
  }, []);

  // DIRECT GOOGLE / ANDROID FINGERPRINT AUTO-PROMPT ON APP OPEN / LOGIN SCREEN
  useEffect(() => {
    if (
      step === 'PHONE_WINDOW' &&
      rememberedUser &&
      !showPhoneInputOverride &&
      !hasAutoPromptedDirect
    ) {
      setHasAutoPromptedDirect(true);
      // Automatically prompt Android's native Google BiometricPrompt
      if (Platform.OS !== 'web' && isBiometricSupported && isBiometricEnrolled) {
        const timer = setTimeout(() => {
          handleDirectBiometricLogin(rememberedUser);
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [
    step,
    rememberedUser,
    showPhoneInputOverride,
    hasAutoPromptedDirect,
    isBiometricSupported,
    isBiometricEnrolled,
  ]);

  // When step changes to PIN_WINDOW on mobile, automatically prompt biometric authentication
  useEffect(() => {
    if (step === 'PIN_WINDOW' && !hasPromptedBiometricStep2) {
      setHasPromptedBiometricStep2(true);
      if (Platform.OS !== 'web' && isBiometricSupported && isBiometricEnrolled) {
        const t = setTimeout(() => {
          handleStep2BiometricUnlock();
        }, 350);
        return () => clearTimeout(t);
      }
    }
  }, [step, isBiometricSupported, isBiometricEnrolled, hasPromptedBiometricStep2]);

  /**
   * Validate Pakistani Mobile Number
   */
  const validatePhone = (raw: string): { isValid: boolean; normalized: string; error?: string } => {
    const cleaned = raw.replace(/[^0-9+]/g, '');
    if (!cleaned) {
      return { isValid: false, normalized: '', error: 'موبائل فون نمبر درج کریں۔ (Phone number required)' };
    }

    const pakistaniPhoneRegex = /^((\+92)?(0)?3[0-9]{9})$/;
    if (!pakistaniPhoneRegex.test(cleaned)) {
      return {
        isValid: false,
        normalized: cleaned,
        error: 'درست پاکستانی موبائل نمبر درج کریں (مثلاً 03001234567 یا +923001234567)',
      };
    }

    return { isValid: true, normalized: cleaned };
  };

  /**
   * Core Login Execution Helper
   */
  const executeLogin = async (phoneToUse: string, pinToUse: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const res = await login(phoneToUse, pinToUse);
    setIsLoading(false);

    if (!res.success) {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);
      setPin('');

      if (nextFailures >= 3) {
        setLockoutSeconds(60);
        setErrorMessage('سیکیورٹی الرٹ: 3 غلط کوششیں۔ کھاتہ 60 سیکنڈ کے لیے لاک کر دیا گیا ہے۔');
      } else {
        const remaining = 3 - nextFailures;
        setErrorMessage(
          `غلط سیکیورٹی PIN۔ عارضی لاک سے پہلے ${remaining} کوشش باقی ہے۔`
        );
      }
    } else {
      setFailedAttempts(0);
      try {
        const cleanPhone = phoneToUse.replace(/[^0-9+]/g, '');
        await AsyncStorage.setItem(`biometric_pin_${cleanPhone}`, pinToUse);
      } catch (err) {
        // non-blocking
      }
    }
  };

  /**
   * DIRECT 1-TAP GOOGLE / ANDROID FINGERPRINT LOGIN (App Open)
   */
  const handleDirectBiometricLogin = async (targetUser: RememberedUser) => {
    if (lockoutSeconds > 0) {
      Alert.alert('سیکیورٹی لاک', `عارضی لاک لاگو ہے: ${lockoutSeconds} سیکنڈ بعد کوشش کریں۔`);
      return;
    }

    // Web / Simulator Fallback
    if (Platform.OS === 'web' || !isBiometricSupported) {
      Alert.alert(
        '👆 گوگل / اینڈرائیڈ فنگر پرنٹ انلاک',
        `محترم ${targetUser.fullName}! کیا آپ محفوظ بائیومیٹرک تصدیق سے براہ راست کھاتہ کھولنا چاہتے ہیں؟`,
        [
          { text: 'منسوخ کریں', style: 'cancel' },
          {
            text: 'براہ راست لاگ ان کریں',
            onPress: async () => {
              const cleanPhone = targetUser.phone.replace(/[^0-9+]/g, '');
              const savedPin = (await AsyncStorage.getItem(`biometric_pin_${cleanPhone}`)) || '1234';
              await executeLogin(targetUser.phone, savedPin);
            },
          },
        ]
      );
      return;
    }

    try {
      // Android Native Google BiometricPrompt
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Digi Hisab — ${targetUser.fullName}`,
        promptSubtitle: 'اینڈرائیڈ اسکرین لاک یا فنگر پرنٹ سے براہ راست کھاتہ کھولیں',
        fallbackLabel: '4-Digit PIN استعمال کریں',
        cancelLabel: 'منسوخ کریں',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const cleanPhone = targetUser.phone.replace(/[^0-9+]/g, '');
        const savedPin = await AsyncStorage.getItem(`biometric_pin_${cleanPhone}`);

        if (savedPin && savedPin.length === 4) {
          await executeLogin(targetUser.phone, savedPin);
        } else {
          // If PIN not cached on device yet, switch to PIN step to enter PIN once
          setPhone(targetUser.phone);
          await proceedToPinStep(targetUser.phone);
        }
      }
    } catch (e: any) {
      console.warn('Direct Biometric Login Error:', e);
    }
  };

  /**
   * Helper to proceed directly to PIN step for a given phone
   */
  const proceedToPinStep = async (phoneNumber: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await checkPhoneExists(phoneNumber);
      setIsLoading(false);
      if (result.success && result.exists && result.data) {
        setVerifiedAccount({
          fullName: result.data.fullName,
          maskedPhone: result.data.maskedPhone || phoneNumber,
          businessName: result.data.businessName,
          activePersona: result.data.activePersona,
          role: result.data.role || 'OWNER',
        });
        setPin('');
        setStep('PIN_WINDOW');
      } else {
        setShowPhoneInputOverride(true);
        setErrorMessage('اس نمبر پر کوئی اکاؤنٹ نہیں ملا۔ براہ کرم نیا کھاتہ بنائیں۔');
      }
    } catch (e: any) {
      setIsLoading(false);
      setShowPhoneInputOverride(true);
      setErrorMessage('نیٹ ورک خرابی۔ انٹرنیٹ کنکشن چیک کریں۔');
    }
  };

  /**
   * STEP 1: Phone Security Verification & Existence Check
   */
  const handleVerifyPhone = async () => {
    setErrorMessage(null);

    if (lockoutSeconds > 0) {
      setErrorMessage(`سیکیورٹی لاک: دوبارہ کوشش کریں ${lockoutSeconds} سیکنڈ بعد۔`);
      return;
    }

    const { isValid, normalized, error } = validatePhone(phone);
    if (!isValid) {
      setErrorMessage(error || 'درست فون نمبر فارمیٹ درج کریں۔');
      return;
    }

    await proceedToPinStep(normalized);
  };

  /**
   * STEP 2: Dedicated 4-Digit PIN Authentication
   */
  const handleUnlockPin = async () => {
    if (lockoutSeconds > 0) {
      setErrorMessage(`سیکیورٹی لاک: برائے مہربانی ${lockoutSeconds} سیکنڈ انتظار کریں۔`);
      return;
    }

    if (!pin || pin.length !== 4) {
      setErrorMessage('براہ کرم مکمل 4 ہندسوں کا سیکیورٹی PIN درج کریں۔');
      return;
    }

    await executeLogin(phone, pin);
  };

  /**
   * Handle PIN typing with instant 4-digit auto-unlock
   */
  const handlePinChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numeric);
    if (errorMessage) setErrorMessage(null);

    if (numeric.length === 4 && lockoutSeconds === 0) {
      executeLogin(phone, numeric);
    }
  };

  /**
   * Biometric Unlock inside Step 2 (PIN Window)
   */
  const handleStep2BiometricUnlock = async () => {
    if (lockoutSeconds > 0) {
      Alert.alert('سیکیورٹی لاک', `عارضی لاک لاگو ہے: ${lockoutSeconds} سیکنڈ بعد کوشش کریں۔`);
      return;
    }

    if (Platform.OS === 'web' || !isBiometricSupported) {
      Alert.alert(
        '👆 فنگر پرنٹ انلاک',
        'محفوظ بائیومیٹرک تصدیق سے لاگ ان کریں؟',
        [
          { text: 'منسوخ کریں', style: 'cancel' },
          {
            text: 'انلاک کریں',
            onPress: async () => {
              const cleanPhone = phone.replace(/[^0-9+]/g, '');
              const savedPin = (await AsyncStorage.getItem(`biometric_pin_${cleanPhone}`)) || '1234';
              setPin(savedPin);
              await executeLogin(phone, savedPin);
            },
          },
        ]
      );
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Digi Hisab سیکیورٹی انلاک',
        promptSubtitle: 'گوگل / اینڈرائیڈ فنگر پرنٹ یا اسکرین لاک سے کھاتہ کھولیں',
        fallbackLabel: '4-Digit PIN درج کریں',
        cancelLabel: 'منسوخ کریں',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        const savedPin = await AsyncStorage.getItem(`biometric_pin_${cleanPhone}`);

        if (savedPin && savedPin.length === 4) {
          setPin(savedPin);
          await executeLogin(phone, savedPin);
        } else {
          Alert.alert(
            'فنگر پرنٹ تصدیق کامیاب! ✅',
            'پہلی بار فنگر پرنٹ انلاک سیٹ کرنے کے لیے اپنا 4 ہندسوں کا PIN درج کریں۔ اگلی بار فنگر پرنٹ سے خودکار لاگ ان ہو جائے گا۔',
            [{ text: 'ٹھیک ہے', onPress: () => pinInputRef.current?.focus() }]
          );
        }
      }
    } catch (e: any) {
      console.warn('Biometric error:', e);
    }
  };

  /**
   * FORGOT PIN STEP 1: Request Security OTP
   */
  const handleStartForgotPin = async () => {
    setErrorMessage(null);
    setOtpHintMsg(null);
    setIsLoading(true);

    try {
      const res = await requestPinResetOtp(phone);
      setIsLoading(false);
      if (res.success) {
        setOtpHintMsg(res.otpHint || 'OTP کوڈ بذریعہ SMS آپ کے رجسٹرڈ نمبر پر بھیج دیا گیا ہے۔');
        setStep('FORGOT_PIN_WINDOW');
      } else {
        setErrorMessage(res.message || 'OTP کوڈ بھیجنے میں ناکامی۔ دوبارہ کوشش کریں۔');
      }
    } catch (e: any) {
      setIsLoading(false);
      setErrorMessage('OTP کوڈ کی درخواست کے دوران نیٹ ورک خرابی پیش آئی۔');
    }
  };

  /**
   * FORGOT PIN STEP 2: Verify OTP and Reset to 4-Digit PIN
   */
  const handleExecuteResetPin = async () => {
    setErrorMessage(null);

    if (!otpCode || otpCode.length < 6) {
      setErrorMessage('براہ کرم مکمل 6 ہندسوں کا سیکیورٹی OTP کوڈ درج کریں۔');
      return;
    }
    if (!newPin || newPin.length !== 4) {
      setErrorMessage('نیا سیکیورٹی PIN لازمی طور پر ٹھیک 4 ہندسوں پر مشتمل ہونا چاہیے۔');
      return;
    }
    if (newPin !== confirmNewPin) {
      setErrorMessage('نیا PIN اور تصدیقی PIN آپس میں مماثلت نہیں رکھتے۔');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetPinWithOtp(phone, otpCode, newPin);
      if (res.success) {
        const resetPinValue = newPin;
        setPin(resetPinValue);
        setOtpCode('');
        setNewPin('');
        setConfirmNewPin('');
        setLockoutSeconds(0);
        setFailedAttempts(0);
        setErrorMessage(null);

        const loginRes = await login(phone, resetPinValue);
        setIsLoading(false);

        if (!loginRes.success) {
          setStep('PIN_WINDOW');
          Alert.alert(
            'PIN تبدیل ہو گیا ✅',
            'آپ کا نیا 4 ہندسوں کا سیکیورٹی PIN کامیابی سے سیٹ ہو گیا۔ لاگ ان کرنے کے لیے پن درج کریں۔',
            [{ text: 'ٹھیک ہے' }]
          );
        }
      } else {
        setIsLoading(false);
        setErrorMessage(res.message || 'غلط یا زائد المیعاد (Expired) OTP کوڈ۔');
      }
    } catch (e: any) {
      setIsLoading(false);
      setErrorMessage('PIN ری سیٹ کے دوران نیٹ ورک خرابی۔');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoWrapper}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.appTitle}>Digi حساب</Text>
            <Text style={styles.tagline}>Smart Ledger & Financial Assistant</Text>
          </View>

          {/* ======================================================== */}
          {/* WINDOW 1: PHONE VERIFICATION & DIRECT BIOMETRIC WINDOW   */}
          {/* ======================================================== */}
          {step === 'PHONE_WINDOW' && (
            <View style={styles.card}>
              {/* Option A: Returning User DIRECT FINGERPRINT LOGIN Card */}
              {rememberedUser && !showPhoneInputOverride ? (
                <View>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.directBioBadge}>
                      <Ionicons name="sparkles" size={13} color="#006C4E" />
                      <Text style={styles.directBioBadgeText}>Quick 1-Tap Unlock</Text>
                    </View>
                    <Text style={styles.cardHeaderTitle}>براہ راست لاگ ان</Text>
                  </View>

                  <Text style={styles.helperText}>
                    آپ کے اس ڈیوائس پر محفوظ اکاؤنٹ کی شناخت ہو چکی ہے۔ اینڈرائیڈ فنگر پرنٹ سے براہ راست لاگ ان کریں۔
                  </Text>

                  {/* Remembered User Profile Box */}
                  <View style={styles.rememberedUserBox}>
                    <View style={styles.rememberedAvatarCircle}>
                      <Text style={styles.rememberedAvatarText}>
                        {rememberedUser.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rememberedGreeting}>خوش آمدید! Welcome back,</Text>
                      <Text style={styles.rememberedName}>{rememberedUser.fullName}</Text>
                      <Text style={styles.rememberedPhone}>
                        {rememberedUser.phone}{' '}
                        {rememberedUser.businessName ? `• ${rememberedUser.businessName}` : ''}
                      </Text>
                    </View>
                    <View style={styles.verifiedCheckBadge}>
                      <Ionicons name="shield-checkmark" size={20} color="#006C4E" />
                    </View>
                  </View>

                  {errorMessage && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  )}

                  {/* Big Primary Google/Android Fingerprint Direct Button */}
                  <TouchableOpacity
                    style={[styles.directBioPrimaryBtn, isLoading && styles.disabledBtn]}
                    onPress={() => handleDirectBiometricLogin(rememberedUser)}
                    disabled={isLoading || lockoutSeconds > 0}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Ionicons name="finger-print" size={24} color="#FFFFFF" />
                        <Text style={styles.directBioPrimaryBtnText}>
                          فنگر پرنٹ سے براہ راست کھولیں (1-Tap Unlock)
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Secondary: Enter 4-Digit PIN manually */}
                  <TouchableOpacity
                    style={styles.manualPinBtn}
                    onPress={() => proceedToPinStep(rememberedUser.phone)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="keypad-outline" size={18} color="#006C4E" />
                    <Text style={styles.manualPinBtnText}>یا 4-Digit PIN سے لاگ ان کریں</Text>
                  </TouchableOpacity>

                  {/* Switch to a different account/number */}
                  <TouchableOpacity
                    style={styles.switchAccountBtn}
                    onPress={() => setShowPhoneInputOverride(true)}
                  >
                    <Ionicons name="swap-horizontal" size={16} color="#64748B" />
                    <Text style={styles.switchAccountText}>
                      کسی اور نمبر سے لاگ ان کریں (Use another number)
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Option B: Standard Phone Number Verification Form */
                <View>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
                    </View>
                    <Text style={styles.cardHeaderTitle}>Enter Phone Number</Text>
                  </View>

                  <Text style={styles.helperText}>
                    اپنا رجسٹرڈ موبائل نمبر درج کریں تاکہ اکاؤنٹ کی تصدیق کی جا سکے۔
                  </Text>

                  {rememberedUser && (
                    <TouchableOpacity
                      style={styles.returnToRememberedBtn}
                      onPress={() => setShowPhoneInputOverride(false)}
                    >
                      <Ionicons name="arrow-back" size={14} color="#006C4E" />
                      <Text style={styles.returnToRememberedText}>
                        محفوظ اکاؤنٹ ({rememberedUser.fullName}) پر واپس جائیں
                      </Text>
                    </TouchableOpacity>
                  )}

                  {errorMessage && (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                      <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                  )}

                  {/* Phone Input with Pakistan Flag / Prefix */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>موبائل فون نمبر (Mobile Phone)</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.flagEmoji}>🇵🇰</Text>
                        <Text style={styles.countryCodeText}>+92</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="03001234567"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={(val) => {
                          setPhone(val);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        autoCapitalize="none"
                        maxLength={14}
                      />
                    </View>
                    <Text style={styles.microHint}>فارمیٹ: 03001234567 یا +923001234567</Text>
                  </View>

                  {/* Continue Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, lockoutSeconds > 0 && styles.disabledBtn]}
                    onPress={handleVerifyPhone}
                    disabled={isLoading || lockoutSeconds > 0}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={styles.btnContentRow}>
                        <Text style={styles.submitBtnText}>
                          {lockoutSeconds > 0 ? `Locked (${lockoutSeconds}s)` : 'تصدیق کریں اور آگے بڑھیں (Continue)'}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Switch to Register */}
                  <View style={styles.footerRow}>
                    <Text style={styles.footerText}>پہلی مرتبہ استعمال کر رہے ہیں؟ </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                      <Text style={styles.registerLink}>نیا اکاؤنٹ بنائیں (Create Khata)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ======================================================== */}
          {/* WINDOW 2: DEDICATED 4-DIGIT SECURE PIN WINDOW            */}
          {/* ======================================================== */}
          {step === 'PIN_WINDOW' && (
            <View style={styles.card}>
              {/* Top Back / Switch Account Bar */}
              <View style={styles.pinHeaderBar}>
                <TouchableOpacity
                  style={styles.changePhoneBtn}
                  onPress={() => {
                    setStep('PHONE_WINDOW');
                    setPin('');
                    setErrorMessage(null);
                  }}
                >
                  <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                  <Text style={styles.changePhoneText}>نمبر بدلیں (Change)</Text>
                </TouchableOpacity>

                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
                </View>
              </View>

              {/* Verified Account Card Info */}
              <View style={styles.verifiedProfileCard}>
                <View
                  style={[
                    styles.avatarCircle,
                    verifiedAccount?.role !== 'OWNER' && { backgroundColor: COLORS.cyan },
                  ]}
                >
                  <Ionicons
                    name={verifiedAccount?.role === 'CASHIER' ? 'person-outline' : 'person'}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.verifiedName}>{verifiedAccount?.fullName || 'Khata User'}</Text>
                    <View
                      style={[
                        styles.roleBadge,
                        verifiedAccount?.role !== 'OWNER' && { backgroundColor: '#E0F2FE' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          verifiedAccount?.role !== 'OWNER' && { color: COLORS.navy },
                        ]}
                      >
                        {verifiedAccount?.role || 'OWNER'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.verifiedPhone}>
                    {verifiedAccount?.maskedPhone}{' '}
                    {verifiedAccount?.businessName ? `• ${verifiedAccount?.businessName}` : ''}
                  </Text>
                </View>
                <View style={styles.verifiedCheckBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                </View>
              </View>

              <Text style={styles.cardHeaderTitle}>Enter Security PIN</Text>
              <Text style={styles.helperText}>
                اپنے ڈیجی حساب کھاتے کو کھولنے کے لیے 4 ہندسوں کا سیکیورٹی PIN درج کریں۔
              </Text>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="lock-closed" size={18} color={COLORS.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* 4-PIN Digits Interactive Container */}
              <Pressable
                style={styles.pinBoxesContainer}
                onPress={() => pinInputRef.current?.focus()}
              >
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = pin.length > index;
                  const isCurrent = pin.length === index;
                  const char = pin[index];

                  return (
                    <View
                      key={index}
                      style={[
                        styles.pinBox,
                        isCurrent && styles.pinBoxActive,
                        isFilled && styles.pinBoxFilled,
                      ]}
                    >
                      {isFilled ? (
                        showPin ? (
                          <Text style={styles.pinDigitText}>{char}</Text>
                        ) : (
                          <View style={styles.pinDot} />
                        )
                      ) : isCurrent ? (
                        <View style={styles.pinCursor} />
                      ) : null}
                    </View>
                  );
                })}

                {/* Concealed Native Numeric Input Overlay */}
                <TextInput
                  ref={pinInputRef}
                  style={styles.hiddenPinInput}
                  keyboardType="numeric"
                  maxLength={4}
                  value={pin}
                  onChangeText={handlePinChange}
                  autoFocus={true}
                  caretHidden={true}
                />
              </Pressable>

              {/* Show/Hide PIN Toggle */}
              <View style={styles.pinOptionsRow}>
                <TouchableOpacity
                  style={styles.showPinToggle}
                  onPress={() => setShowPin(!showPin)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPin ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.showPinText}>
                    {showPin ? 'PIN چھپائیں (Hide)' : 'PIN دیکھیں (Show)'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleStartForgotPin} disabled={isLoading}>
                  <Text style={styles.forgotPinText}>PIN بھول گئے؟ (Forgot?)</Text>
                </TouchableOpacity>
              </View>

              {/* Biometric Prompt Button in Step 2 */}
              <TouchableOpacity
                style={styles.biometricCardBtn}
                onPress={handleStep2BiometricUnlock}
                activeOpacity={0.8}
              >
                <View style={styles.biometricIconBadge}>
                  <Ionicons name="finger-print" size={22} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.biometricTitle}>
                    {biometricName} سے انلاک کریں
                  </Text>
                  <Text style={styles.biometricSubtitle}>1-Tap Quick Biometric Unlock</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              </TouchableOpacity>

              {/* Unlock Khata Primary Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (pin.length !== 4 || lockoutSeconds > 0) && styles.disabledBtn,
                ]}
                onPress={handleUnlockPin}
                disabled={isLoading || pin.length !== 4 || lockoutSeconds > 0}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Ionicons name="lock-open-outline" size={18} color="#FFF" />
                    <Text style={styles.submitBtnText}>
                      {lockoutSeconds > 0
                        ? `Locked (${lockoutSeconds}s)`
                        : 'کھاتہ کھولیں • Unlock Khata'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ======================================================== */}
          {/* WINDOW 3: FORGOT PIN & OTP RECOVERY WINDOW               */}
          {/* ======================================================== */}
          {step === 'FORGOT_PIN_WINDOW' && (
            <View style={styles.card}>
              <View style={styles.pinHeaderBar}>
                <TouchableOpacity
                  style={styles.changePhoneBtn}
                  onPress={() => {
                    setStep('PIN_WINDOW');
                    setErrorMessage(null);
                  }}
                >
                  <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
                  <Text style={styles.changePhoneText}>PIN اسکرین پر واپس</Text>
                </TouchableOpacity>

                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>4-PIN Reset</Text>
                </View>
              </View>

              <Text style={styles.cardHeaderTitle}>Reset Security PIN</Text>
              <Text style={styles.helperText}>
                آپ کے رجسٹرڈ فون ({verifiedAccount?.maskedPhone || phone}) پر موصول شدہ 6-digit OTP درج کر کے نیا 4-digit PIN سیٹ کریں۔
              </Text>

              {otpHintMsg && (
                <TouchableOpacity
                  style={[
                    styles.errorBox,
                    { backgroundColor: COLORS.cyanLight, borderColor: COLORS.cyan },
                  ]}
                  onPress={() => {
                    const match = otpHintMsg.match(/\b\d{6}\b/);
                    if (match) {
                      setOtpCode(match[0]);
                      if (errorMessage) setErrorMessage(null);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="key" size={18} color={COLORS.navy} />
                  <Text style={[styles.errorText, { color: COLORS.navy }]}>
                    {otpHintMsg} • (Auto-fill tap کریں)
                  </Text>
                </TouchableOpacity>
              )}

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* OTP Code Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>6-Digit Security OTP Code</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="key-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { letterSpacing: 4 }]}
                    placeholder="123456"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={(val) => {
                      const numeric = val.replace(/[^0-9]/g, '');
                      setOtpCode(numeric);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoFocus={true}
                  />
                </View>
              </View>

              {/* New 4-Digit PIN Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>نیا 4-Digit سیکیورٹی PIN</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { letterSpacing: 6 }]}
                    placeholder="••••"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    secureTextEntry={!showPin}
                    maxLength={4}
                    value={newPin}
                    onChangeText={(val) => {
                      const numeric = val.replace(/[^0-9]/g, '').slice(0, 4);
                      setNewPin(numeric);
                      if (errorMessage) setErrorMessage(null);
                    }}
                  />
                </View>
              </View>

              {/* Confirm New 4-Digit PIN Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>نئے PIN کی تصدیق کریں (Confirm 4-Digit PIN)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { letterSpacing: 6 }]}
                    placeholder="••••"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    secureTextEntry={!showPin}
                    maxLength={4}
                    value={confirmNewPin}
                    onChangeText={(val) => {
                      const numeric = val.replace(/[^0-9]/g, '').slice(0, 4);
                      setConfirmNewPin(numeric);
                      if (errorMessage) setErrorMessage(null);
                    }}
                  />
                </View>
              </View>

              {/* Resend OTP Button */}
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginBottom: 14 }}
                onPress={handleStartForgotPin}
                disabled={isLoading}
              >
                <Text style={styles.resendOtpText}>دوبارہ OTP بھیجیں (Resend Code)</Text>
              </TouchableOpacity>

              {/* Save & Reset PIN Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!otpCode || newPin.length !== 4 || confirmNewPin.length !== 4) &&
                    styles.disabledBtn,
                ]}
                onPress={handleExecuteResetPin}
                disabled={
                  isLoading ||
                  !otpCode ||
                  newPin.length !== 4 ||
                  confirmNewPin.length !== 4
                }
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.btnContentRow}>
                    <Ionicons name="refresh-circle-outline" size={20} color="#FFF" />
                    <Text style={styles.submitBtnText}>نیا 4-Digit PIN محفوظ کریں</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 440,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrapper: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#006C4E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#006C4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  appTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0B2239',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B6449',
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B2239',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 19,
  },
  /* Direct Biometric / Remembered User Card */
  directBioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  directBioBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006C4E',
  },
  rememberedUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  rememberedAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#006C4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberedAvatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  rememberedGreeting: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
  rememberedName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B2239',
    marginTop: 1,
  },
  rememberedPhone: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  directBioPrimaryBtn: {
    backgroundColor: '#006C4E',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#006C4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  directBioPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  manualPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#006C4E',
    backgroundColor: '#F0FDF4',
    minHeight: 46,
    borderRadius: 14,
    marginBottom: 12,
  },
  manualPinBtnText: {
    color: '#006C4E',
    fontSize: 13,
    fontWeight: '800',
  },
  switchAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  switchAccountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  returnToRememberedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 14,
  },
  returnToRememberedText: {
    fontSize: 12,
    color: '#006C4E',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B2239',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 52,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    marginRight: 10,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2239',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0B2239',
    fontWeight: '700',
  },
  microHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
  },
  submitBtn: {
    backgroundColor: '#006C4E',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#006C4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  disabledBtn: {
    opacity: 0.55,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '800',
    color: '#108A65',
  },
  pinHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  changePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  changePhoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#108A65',
  },
  verifiedProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16,
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#006C4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2239',
  },
  roleBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B6449',
  },
  verifiedPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  verifiedCheckBadge: {
    padding: 2,
  },
  /* 4-PIN Box UI Elements */
  pinBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginVertical: 16,
    position: 'relative',
  },
  pinBox: {
    width: 60,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxActive: {
    borderColor: '#006C4E',
    backgroundColor: '#F0FDF4',
    shadowColor: '#006C4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  pinBoxFilled: {
    borderColor: '#006C4E',
    backgroundColor: '#FFFFFF',
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#006C4E',
  },
  pinDigitText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B2239',
  },
  pinCursor: {
    width: 2,
    height: 22,
    backgroundColor: '#006C4E',
    borderRadius: 1,
  },
  hiddenPinInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  pinOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  showPinToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  showPinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  forgotPinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  biometricCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  biometricIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006C4E',
  },
  biometricSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  resendOtpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
});
