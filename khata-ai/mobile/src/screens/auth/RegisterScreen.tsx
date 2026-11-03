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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, PersonaType } from '../../store/auth.store';
import { COLORS } from '../../theme/colors';

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [activePersona, setActivePersona] = useState<PersonaType>('VENDOR');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    // 3. PIN Security & Strength
    const pinCheck = checkPinStrength(pin);
    if (!pinCheck.isSecure) {
      setErrorMessage(pinCheck.reason || 'Weak PIN provided.');
      return;
    }

    // 4. Confirm PIN Check
    if (pin !== confirmPin) {
      setErrorMessage('Security PIN and Confirm PIN do not match.');
      return;
    }

    // 5. Terms Agreement
    if (!agreeTerms) {
      setErrorMessage('Please accept the encrypted ledger security terms to continue.');
      return;
    }

    setIsLoading(true);

    const res = await register({
      fullName: fullName.trim(),
      phone: phoneCheck.normalized,
      pin,
      activePersona,
      businessName: businessName ? businessName.trim() : undefined,
    });

    setIsLoading(false);

    if (!res.success) {
      setErrorMessage(res.message || 'Registration failed. An account may already exist with this number.');
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
});

