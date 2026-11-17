import React, { useState } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, PersonaType } from '../../store/auth.store';
import { COLORS } from '../../theme/colors';
import { CnicScannerModal } from '../../components/CnicScannerModal';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { register, requestRegisterEmailOtp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [activePersona, setActivePersona] = useState<PersonaType>('VENDOR');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showCnicModal, setShowCnicModal] = useState(false);
  const [cnicScanned, setCnicScanned] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);

  /**
   * Security Check: Weak PIN Detector
   * Disallows simple sequences and repeated digits.
   */
  const checkPinStrength = (p: string): { isSecure: boolean; reason?: string } => {
    if (!/^\d{4}$/.test(p)) {
      return { isSecure: false, reason: 'سیکیورٹی PIN ٹھیک 4 ہندسوں پر مشتمل ہونا چاہیے۔ (PIN must be exactly 4 digits)' };
    }

    // Check all same digits (e.g. 0000, 1111, 999999)
    if (/^(\d)\1+$/.test(p)) {
      return { isSecure: false, reason: 'Weak PIN: Repeated identical digits (e.g. 1111, 0000) are not allowed.' };
    }

    // Check common sequential patterns
    const commonSequences = [
      '1234', '2345', '3456', '4567', '5678', '6789',
      '4321', '5432', '6543', '7654', '8765', '9876',
      '12345', '23456', '54321', '65432',
      '123456', '654321',
    ];

    if (commonSequences.includes(p)) {
      return { isSecure: false, reason: 'Weak PIN: Simple sequential numbers (e.g. 123456) are easily guessed.' };
    }

    return { isSecure: true };
  };

  /**
   * Security Check: Pakistani Mobile Phone Validation
   */
  const validatePhone = (raw: string): { isValid: boolean; normalized: string; error?: string } => {
    const cleaned = raw.replace(/[^0-9+]/g, '');
    if (!cleaned) {
      return { isValid: false, normalized: '', error: 'Mobile phone number is required.' };
    }

    const pakistaniPhoneRegex = /^((\+92)?(0)?3[0-9]{9})$/;
    if (!pakistaniPhoneRegex.test(cleaned)) {
      return {
        isValid: false,
        normalized: cleaned,
        error: 'Please enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567).',
      };
    }

    return { isValid: true, normalized: cleaned };
  };

  /**
   * Security Check: Email Format Validation
   */
  const validateEmail = (raw: string): { isValid: boolean; normalized: string; error?: string } => {
    const clean = raw.trim().toLowerCase();
    if (!clean) {
      return { isValid: false, normalized: '', error: 'Email address is required for OTP verification.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      return { isValid: false, normalized: clean, error: 'Please enter a valid email address (e.g. name@gmail.com).' };
    }
    return { isValid: true, normalized: clean };
  };

  const handleRegister = async () => {
    setErrorMessage(null);

    // 1. Full Name Validation
    if (!fullName || fullName.trim().length < 3) {
      setErrorMessage('Please enter your full name (minimum 3 characters).');
      return;
    }

    if (!/^[a-zA-Z\s\.\'-]{3,50}$/.test(fullName.trim())) {
      setErrorMessage('Full name should only contain letters and standard characters.');
      return;
    }

    // 2. Phone Validation
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.isValid) {
      setErrorMessage(phoneCheck.error || 'Invalid phone format.');
      return;
    }

    // 3. Email Validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setErrorMessage(emailCheck.error || 'Invalid email format.');
      return;
    }

    // 4. PIN Security & Strength
    const pinCheck = checkPinStrength(pin);
    if (!pinCheck.isSecure) {
      setErrorMessage(pinCheck.reason || 'Weak PIN provided.');
      return;
    }

    // 5. Confirm PIN Check
    if (pin !== confirmPin) {
      setErrorMessage('Security PIN and Confirm PIN do not match.');
      return;
    }

    // 6. Terms Agreement
    if (!agreeTerms) {
      setErrorMessage('Please accept the encrypted ledger security terms to continue.');
      return;
    }

    setIsLoading(true);

    // Request Registration Email OTP
    const otpRes = await requestRegisterEmailOtp(
      emailCheck.normalized,
      phoneCheck.normalized,
      activePersona
    );

    setIsLoading(false);

    if (otpRes.success) {
      setOtp('');
      setOtpErrorMessage(null);
      setShowOtpModal(true);
      setOtpCooldown(60);
    } else {
      setErrorMessage(otpRes.message || 'Failed to dispatch verification OTP to your email.');
    }
  };

  const handleVerifyOtpAndComplete = async () => {
    setOtpErrorMessage(null);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setOtpErrorMessage('Baraye meherbani 6 hinson ka durust OTP code darj karein.');
      return;
    }

    const phoneCheck = validatePhone(phone);
    const emailCheck = validateEmail(email);

    setIsVerifyingOtp(true);

    const res = await register({
      fullName: fullName.trim(),
      phone: phoneCheck.normalized,
      email: emailCheck.normalized,
      otp: cleanOtp,
      pin,
      activePersona,
      businessName: businessName ? businessName.trim() : undefined,
    });

    setIsVerifyingOtp(false);

    if (res.success) {
      setShowOtpModal(false);
    } else {
      setOtpErrorMessage(res.message || 'OTP verification failed. Please check code or try again.');
    }
  };

  const handleResendOtp = async () => {
    if (otpCooldown > 0) return;
    const phoneCheck = validatePhone(phone);
    const emailCheck = validateEmail(email);

    setIsLoading(true);
    const res = await requestRegisterEmailOtp(
      emailCheck.normalized,
      phoneCheck.normalized,
      activePersona
    );
    setIsLoading(false);

    if (res.success) {
      setOtpCooldown(60);
      Alert.alert('کامیابی', `نیا OTP کوڈ آپ کے ای میل ${emailCheck.normalized} پر بھیج دیا گیا ہے۔`);
    } else {
      setOtpErrorMessage(res.message || 'Failed to resend OTP.');
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
        {/* Brand Header & Logo */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <Text style={styles.appTitle}>Digi حساب</Text>
          <Text style={styles.tagline}>Create Encrypted Khata Profile</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Naya Khata Account</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Persona Mode Switcher Selector */}
          <Text style={styles.label}>Select Primary Account Type</Text>
          <View style={styles.personaSelectorRow}>
            <TouchableOpacity
              style={[
                styles.personaChoiceBtn,
                activePersona === 'VENDOR' && styles.personaChoiceVendorActive,
              ]}
              onPress={() => setActivePersona('VENDOR')}
            >
              <Ionicons
                name="storefront"
                size={18}
                color={activePersona === 'VENDOR' ? '#FFF' : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.personaChoiceText,
                  activePersona === 'VENDOR' && styles.personaChoiceTextActive,
                ]}
              >
                🏪 Dukandar (Shop)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.personaChoiceBtn,
                activePersona === 'HOUSEHOLD' && styles.personaChoiceHouseholdActive,
              ]}
              onPress={() => setActivePersona('HOUSEHOLD')}
            >
              <Ionicons
                name="home"
                size={18}
                color={activePersona === 'HOUSEHOLD' ? '#FFF' : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.personaChoiceText,
                  activePersona === 'HOUSEHOLD' && styles.personaChoiceTextActive,
                ]}
              >
                🏠 Household (Ghar)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name / Mukammal Naam</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Muhammad Ali"
                placeholderTextColor="#94A3B8"
                value={fullName}
                onChangeText={(val) => {
                  setFullName(val);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>
          </View>

          {/* Mobile Phone with +92 Badge */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Phone Number</Text>
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
                maxLength={14}
              />
            </View>
            <Text style={styles.microHint}>Format: 03001234567</Text>
          </View>

          {/* Email Address with OTP Notice */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.label}>Email Address / ای میل پتہ *</Text>
              <Text style={{ fontSize: 10, color: '#00d49f', fontWeight: '700' }}>🔒 OTP تصدیق لازمی ہے</Text>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="muhammad.ali@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
            </View>
            <Text style={styles.microHint}>اکاؤنٹ کی تصدیق کے لیے اس ای میل پر 6 ہندسوں کا OTP کوڈ بھیجا جائے گا۔</Text>
          </View>

          {/* Business Name (Shown especially for Dukandar) */}
          {activePersona === 'VENDOR' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business / Dukaan Ka Naam</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Bismillah Kiryana Store & Traders"
                  placeholderTextColor="#94A3B8"
                  value={businessName}
                  onChangeText={setBusinessName}
                />
              </View>
            </View>
          )}

          {/* Security PIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Set Security PIN (4 Digits)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { letterSpacing: showPin ? 4 : 8 }]}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                secureTextEntry={!showPin}
                maxLength={4}
                value={pin}
                onChangeText={(val) => {
                  const num = val.replace(/[^0-9]/g, '').slice(0, 4);
                  setPin(num);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPin ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.microHint}>Aasan PIN jaise 1234 ya 1111 qabil-e-qubool nahi hain.</Text>
          </View>

          {/* Confirm PIN */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Security PIN (4 Digits)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={pin && confirmPin === pin ? COLORS.primary : COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { letterSpacing: showPin ? 4 : 8 }]}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                secureTextEntry={!showPin}
                maxLength={4}
                value={confirmPin}
                onChangeText={(val) => {
                  const num = val.replace(/[^0-9]/g, '').slice(0, 4);
                  setConfirmPin(num);
                  if (errorMessage) setErrorMessage(null);
                }}
              />
              {confirmPin.length >= 4 && (
                <Ionicons
                  name={confirmPin === pin ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={confirmPin === pin ? COLORS.primary : COLORS.danger}
                />
              )}
            </View>
          </View>

          {/* Smart CNIC Scanner Card (Dual-Sided CNIC step with Skip option) */}
          <View style={styles.cnicCardContainer}>
            <View style={styles.cnicCardHeader}>
              <Ionicons name="card-outline" size={20} color={cnicScanned ? '#00d49f' : COLORS.cyan} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cnicCardTitle}>Smart CNIC (شناختی کارڈ) — اختیاری</Text>
                <Text style={styles.cnicCardSub}>
                  {cnicScanned
                    ? 'دونوں رخ اسکین ہو چکے ہیں (Front & Back Scanned)'
                    : 'ابھی اسکین کریں یا بعد میں ڈیش بورڈ سے مکمل کریں (Optional)'}
                </Text>
              </View>
              {cnicScanned && <Ionicons name="checkmark-circle" size={22} color="#00d49f" />}
            </View>

            <TouchableOpacity
              style={[styles.cnicScanBtn, cnicScanned && styles.cnicScanBtnSuccess]}
              onPress={() => setShowCnicModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={cnicScanned ? 'checkmark' : 'camera-outline'}
                size={18}
                color={cnicScanned ? '#00d49f' : '#FFF'}
              />
              <Text style={[styles.cnicScanBtnText, cnicScanned && { color: '#00d49f' }]}>
                {cnicScanned ? 'دوبارہ اسکین کریں (Re-scan)' : 'شناختی کارڈ اسکین کریں (Scan Smart CNIC)'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Terms Agreement */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={agreeTerms ? 'checkbox' : 'square-outline'}
              size={20}
              color={agreeTerms ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={styles.termsText}>
              Main Digi Hisab ke Shariah aur Mehfooz Financial Ledger Qawaneen se ittefaq karta hoon.
            </Text>
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, (!agreeTerms || pin.length < 4) && styles.disabledBtn]}
            onPress={handleRegister}
            disabled={isLoading || !agreeTerms || pin.length < 4}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.btnContentRow}>
                <Ionicons name="person-add-outline" size={18} color="#FFF" />
                <Text style={styles.submitBtnText}>Create Profile & Open Khata</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Pehle se account mojood hai? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Dual-Sided CNIC Scanner Modal */}
      <CnicScannerModal
        visible={showCnicModal}
        onClose={() => setShowCnicModal(false)}
        onScanComplete={() => setCnicScanned(true)}
        userName={fullName || 'Merchant'}
      />

      {/* Email OTP Verification Bottom Sheet Modal */}
      <Modal
        visible={showOtpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOtpModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.otpModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.otpModalCard}>
            <View style={styles.otpHeaderRow}>
              <View style={styles.otpIconCircle}>
                <Ionicons name="shield-checkmark" size={24} color="#00d49f" />
              </View>
              <TouchableOpacity
                onPress={() => setShowOtpModal(false)}
                style={styles.otpCloseBtn}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.otpTitle}>Email Verification</Text>
            <Text style={styles.otpSubtitle}>ای میل تصدیقی کوڈ (OTP)</Text>
            <Text style={styles.otpDesc}>
              ہم نے آپ کے ای میل{' '}
              <Text style={{ fontWeight: '700', color: '#00d49f' }}>{email}</Text>{' '}
              پر 6 ہندسوں کا کوڈ بھیجا ہے۔ تصدیق مکمل کرنے کے لیے کوڈ نیچے درج کریں:
            </Text>

            {otpErrorMessage && (
              <View style={[styles.errorBox, { marginTop: 12 }]}>
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                <Text style={styles.errorText}>{otpErrorMessage}</Text>
              </View>
            )}

            <View style={styles.otpInputBox}>
              <TextInput
                style={styles.otpInputField}
                placeholder="••••••"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={(val) => {
                  const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtp(cleaned);
                  if (otpErrorMessage) setOtpErrorMessage(null);
                }}
                autoFocus={true}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.otpSubmitBtn,
                (otp.length !== 6 || isVerifyingOtp) && styles.disabledBtn,
              ]}
              onPress={handleVerifyOtpAndComplete}
              disabled={otp.length !== 6 || isVerifyingOtp}
              activeOpacity={0.85}
            >
              {isVerifyingOtp ? (
                <ActivityIndicator color="#070d18" />
              ) : (
                <Text style={styles.otpSubmitBtnText}>Verify & Create Account (اکاؤنٹ بنائیں)</Text>
              )}
            </TouchableOpacity>

            <View style={styles.otpResendRow}>
              <Text style={styles.otpResendPrompt}>کوڈ موصول نہیں ہوا؟ </Text>
              <TouchableOpacity onPress={handleResendOtp} disabled={otpCooldown > 0}>
                <Text
                  style={[
                    styles.otpResendBtnText,
                    otpCooldown > 0 && { color: '#64748B' },
                  ]}
                >
                  {otpCooldown > 0 ? `دوبارہ بھیجیں (${otpCooldown}s)` : 'کوڈ دوبارہ بھیجیں'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.cyan,
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.navy,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    width: '100%',
    maxWidth: 460,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 14,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  personaSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  personaChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.lightBg,
    gap: 6,
  },
  personaChoiceHouseholdActive: {
    backgroundColor: COLORS.household,
    borderColor: COLORS.household,
  },
  personaChoiceVendorActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  personaChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  personaChoiceTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.lightBg,
    paddingHorizontal: 12,
    height: 50,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    marginRight: 10,
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.navy,
    fontWeight: '600',
  },
  microHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  eyeBtn: {
    padding: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 12,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  submitBtn: {
    backgroundColor: COLORS.navy,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 2,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
    flexWrap: 'wrap',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cnicCardContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginVertical: 10,
    gap: 10,
  },
  cnicCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cnicCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  cnicCardSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cnicScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.navy,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cnicScanBtnSuccess: {
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    borderWidth: 1,
    borderColor: '#00d49f',
  },
  cnicScanBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 13, 24, 0.75)',
    justifyContent: 'flex-end',
  },
  otpModalCard: {
    backgroundColor: '#0d1627',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#17233b',
    borderBottomWidth: 0,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  otpIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  otpCloseBtn: {
    padding: 8,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  otpSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  otpDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 10,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  otpInputBox: {
    backgroundColor: '#070d18',
    borderWidth: 1.5,
    borderColor: '#00d49f',
    borderRadius: 14,
    marginVertical: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  otpInputField: {
    fontSize: 28,
    fontWeight: '800',
    color: '#00d49f',
    textAlign: 'center',
    letterSpacing: 12,
  },
  otpSubmitBtn: {
    backgroundColor: '#00d49f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSubmitBtnText: {
    color: '#070d18',
    fontSize: 14,
    fontWeight: '800',
  },
  otpResendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  otpResendPrompt: {
    fontSize: 12,
    color: '#94A3B8',
  },
  otpResendBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00d49f',
  },
});

