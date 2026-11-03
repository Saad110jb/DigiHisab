import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/auth.store';
import { profileApi } from '../api/profile.api';
import { COLORS } from '../theme/colors';

interface ManagerPinSectionProps {
  initialPin?: string;
  cashierPinRequired?: boolean;
  onPinUpdated?: (newPin: string) => void;
  onCashierPinRequiredChange?: (val: boolean) => void;
}

export const ManagerPinSection: React.FC<ManagerPinSectionProps> = ({
  initialPin = '',
  cashierPinRequired = true,
  onPinUpdated,
  onCashierPinRequiredChange,
}) => {
  const { user } = useAuth();

  // STRICT RBAC Guard: Cashiers must NEVER see this section
  if (user?.role === 'CASHIER') {
    return null;
  }

  const [pin, setPin] = useState<string>(initialPin);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [localCashierPinReq, setLocalCashierPinReq] = useState<boolean>(cashierPinRequired);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSavePin = async () => {
    const cleanPin = pin.trim();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
      setErrorMsg('⚠️ منیجر پن لازمی طور پر 4 ہندسوں (4 Digits) پر مشتمل ہونا چاہیے۔');
      return;
    }

    try {
      setSaving(true);
      const res = await profileApi.updateManagerPin(cleanPin);
      if (res.success) {
        setSuccessMsg('✅ منیجر سیکیورٹی پن کامیابی سے اپ ڈیٹ ہو گیا۔');
        onPinUpdated?.(cleanPin);
        Alert.alert(
          'کامیابی (Success)',
          'Manager Override PIN has been securely updated and configured for override approvals.'
        );
      } else {
        setErrorMsg(res.message || 'پن اپ ڈیٹ کرنے میں مسئلہ پیش آیا۔');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || err.message || 'پن اپ ڈیٹ کرنے میں ناکامی ہوئی۔';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={18} color="#D97706" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Manager Override & PIN Security</Text>
          <Text style={styles.cardUrduTitle}>منیجر اوور رائیڈ سیکیورٹی پن کنٹرول</Text>
        </View>
      </View>

      <Text style={styles.cardDesc}>
        This 4-digit PIN is strictly required whenever cashiers attempt to exceed customer credit ceilings, unlock debt locks, or approve discretionary credit.
      </Text>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
        </View>
      )}

      {successMsg && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.successBannerText}>{successMsg}</Text>
        </View>
      )}

      <Text style={styles.inputLabel}>Manager Override PIN (4 Digits)</Text>
      <View style={styles.pinInputWrapper}>
        <TextInput
          style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
          value={pin}
          onChangeText={(val) => {
            setPin(val);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          placeholder="e.g. 1234"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry={!showPin}
        />
        <TouchableOpacity
          onPress={() => setShowPin(!showPin)}
          style={styles.eyeIconBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPin ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Save Button for PIN */}
      <TouchableOpacity
        style={[styles.savePinBtn, saving && { opacity: 0.7 }]}
        onPress={handleSavePin}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Ionicons name="key-outline" size={16} color="#FFF" />
            <Text style={styles.savePinBtnText}>Save Manager PIN (محفوظ کریں)</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Cashier Policy Switch */}
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.switchLabel}>Require Cashier PIN for Transactions</Text>
          <Text style={styles.switchSub}>Enforce staff authorization on high-value sales</Text>
        </View>
        <Switch
          value={localCashierPinReq}
          onValueChange={(val) => {
            setLocalCashierPinReq(val);
            onCashierPinRequiredChange?.(val);
          }}
          trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  cardUrduTitle: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 1,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  errorBannerText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  successBannerText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  pinInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 3,
  },
  eyeIconBtn: {
    position: 'absolute',
    right: 12,
    padding: 6,
  },
  savePinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 14,
  },
  savePinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
