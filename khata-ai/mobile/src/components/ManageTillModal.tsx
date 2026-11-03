import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cashDrawerApi, ITillBalances } from '../api/cashDrawer.api';

interface ManageTillModalProps {
  visible: boolean;
  balances: ITillBalances;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManageTillModal: React.FC<ManageTillModalProps> = ({
  visible,
  balances,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedAccount, setSelectedAccount] = useState<'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT'>('PHYSICAL_CASH');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTopUp = async () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('غلط رقم', 'براہ کرم صحیح نقد رقم درج کریں۔ (Valid amount required)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await cashDrawerApi.topUpTill({
        targetAccount: selectedAccount,
        amount: numAmt,
        note: note.trim() || undefined,
      });

      if (res.success) {
        Alert.alert('گلہ ڈپازٹ کامیاب (Till Top-Up Successful)', res.message);
        setAmount('');
        setNote('');
        onSuccess();
        onClose();
      } else {
        Alert.alert('خطا (Error)', res.message || 'Deposit not processed.');
      }
    } catch (err: any) {
      Alert.alert('خطا (Error)', err.response?.data?.message || err.message || 'Deposit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="wallet" size={20} color="#00D2B4" />
              </View>
              <View>
                <Text style={styles.headerTitle}>3-Way Liquid Cash Till (گلہ بندی)</Text>
                <Text style={styles.headerSubtitle}>دکان گلہ، ڈیجیٹل والٹ اور بینک اکاؤنٹس کا مکمل کنٹرول</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Total Liquid Capital Summary Banner */}
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryLabel}>TOTAL LIQUID CAPITAL (مجموعی مائع سرمایہ)</Text>
              <Text style={styles.summaryValue}>Rs. {balances.totalLiquidCapital.toLocaleString()}</Text>
            </View>

            {/* 3 Separate Balances Cards */}
            <Text style={styles.sectionHeading}>💼 Liquid Account Balances (موجودہ بیلنس):</Text>
            <View style={styles.accountsGrid}>
              <TouchableOpacity
                style={[
                  styles.accountCard,
                  selectedAccount === 'PHYSICAL_CASH' && styles.accountCardActive,
                ]}
                onPress={() => setSelectedAccount('PHYSICAL_CASH')}
              >
                <Ionicons name="cash" size={22} color="#006C4E" />
                <Text style={styles.accountTitle}>Physical Cash</Text>
                <Text style={styles.accountUrdu}>دکان گلہ</Text>
                <Text style={styles.accountBalance}>Rs. {balances.physicalCash.toLocaleString()}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accountCard,
                  selectedAccount === 'DIGITAL_WALLET' && styles.accountCardActive,
                ]}
                onPress={() => setSelectedAccount('DIGITAL_WALLET')}
              >
                <Ionicons name="phone-portrait" size={22} color="#0284C7" />
                <Text style={styles.accountTitle}>Digital Wallet</Text>
                <Text style={styles.accountUrdu}>JazzCash / EasyPaisa</Text>
                <Text style={styles.accountBalance}>Rs. {balances.digitalWallet.toLocaleString()}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.accountCard,
                  selectedAccount === 'BANK_ACCOUNT' && styles.accountCardActive,
                ]}
                onPress={() => setSelectedAccount('BANK_ACCOUNT')}
              >
                <Ionicons name="card" size={22} color="#7E22CE" />
                <Text style={styles.accountTitle}>Bank Account</Text>
                <Text style={styles.accountUrdu}>آن لائن / بینک</Text>
                <Text style={styles.accountBalance}>Rs. {balances.bankAccount.toLocaleString()}</Text>
              </TouchableOpacity>
            </View>

            {/* Top-up Form */}
            <View style={styles.topUpForm}>
              <Text style={styles.formHeading}>
                ➕ Add to Till (اکاؤنٹ میں رقم شامل کریں): {selectedAccount.replace('_', ' ')}
              </Text>

              <Text style={styles.label}>رقم (Deposit Amount):</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <Text style={styles.label}>تفصیل / کیش ذریعہ Note (Optional):</Text>
              <TextInput
                style={styles.inputSimple}
                placeholder="e.g. Counter Cash Top-Up / Owner Capital Deposit"
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleTopUp}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#00201A" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={18} color="#00201A" />
                  <Text style={styles.submitBtnText}>Add Funds to Selected Till</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 34, 57, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 210, 180, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 16,
  },
  summaryBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00D2B4',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8FF6CA',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  accountsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  accountCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  accountCardActive: {
    borderColor: '#00D2B4',
    backgroundColor: '#ECFDF5',
  },
  accountTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  accountUrdu: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  accountBalance: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006C4E',
    marginTop: 6,
  },
  topUpForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#006C4E',
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputSimple: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#00D2B4',
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00201A',
  },
});
