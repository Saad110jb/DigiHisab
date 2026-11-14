import React, { useState, useEffect } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { counterpartyApi } from '../api/counterparty.api';
import { cashDrawerApi, ITillBalances } from '../api/cashDrawer.api';
import { responsiveTextProps, fontScale } from '../theme/responsive';

interface CustomerSummary {
  _id: string;
  name: string;
  phone?: string;
  currentBalance: number;
}

interface QuickWasoolModalProps {
  visible: boolean;
  customer: CustomerSummary | null;
  channelBalances?: {
    cashDrawer: number;
    bankAccount: number;
    digitalWallet: number;
  };
  onClose: () => void;
  onSuccess: (receiptData: {
    counterpartyId: string;
    counterpartyName: string;
    phone?: string;
    amountPaid: number;
    discountAmount: number;
    remainingBalance: number;
    paymentMode: 'CASH' | 'JAZZCASH' | 'BANK_TRANSFER';
    receiptMessage: string;
  }) => void;
}

type DestinationMode = 'CASH' | 'WALLET' | 'BANK';

export const QuickWasoolModal: React.FC<QuickWasoolModalProps> = ({
  visible,
  customer,
  channelBalances,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<DestinationMode>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveBalances, setLiveBalances] = useState<{
    cashDrawer: number;
    bankAccount: number;
    digitalWallet: number;
  }>({
    cashDrawer: channelBalances?.cashDrawer ?? 18450,
    bankAccount: channelBalances?.bankAccount ?? 45000,
    digitalWallet: channelBalances?.digitalWallet ?? 12000,
  });

  useEffect(() => {
    if (visible && customer) {
      setAmount(customer.currentBalance > 0 ? customer.currentBalance.toString() : '');
      setPaymentMode('CASH');
      setNotes('');
      setIsSubmitting(false);

      // Fetch live till balances
      cashDrawerApi
        .getTillBalances()
        .then((res) => {
          if (res.success && res.data) {
            setLiveBalances({
              cashDrawer: res.data.physicalCash,
              bankAccount: res.data.bankAccount,
              digitalWallet: res.data.digitalWallet,
            });
          }
        })
        .catch(() => {});
    }
  }, [visible, customer]);

  if (!customer) return null;

  const currentDebt = customer.currentBalance || 0;
  const safeWasool = Math.max(0, Number(amount) || 0);
  const newRemainingBalance = Math.max(0, currentDebt - safeWasool);

  // Active destination channel balance mapping
  const channelBalanceMap = {
    CASH: { name: 'نقد گلہ (Cash Drawer)', balance: liveBalances.cashDrawer },
    WALLET: { name: 'والٹ (JazzCash / EasyPaisa)', balance: liveBalances.digitalWallet },
    BANK: { name: 'بینک کھاتہ (Bank / Raast)', balance: liveBalances.bankAccount },
  };

  const handleChipSelect = (val: number) => {
    setAmount(val.toString());
  };

  const handleSubmitWasooli = async () => {
    if (safeWasool <= 0) {
      Alert.alert('غلط رقم', 'براہ کرم صحیح وصولی کی رقم درج کریں۔');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await counterpartyApi.recordWasooli(customer._id, {
        amount: safeWasool,
        paymentDestination: paymentMode,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        let modeEnum: 'CASH' | 'JAZZCASH' | 'BANK_TRANSFER' = 'CASH';
        if (paymentMode === 'WALLET') modeEnum = 'JAZZCASH';
        else if (paymentMode === 'BANK') modeEnum = 'BANK_TRANSFER';

        onSuccess({
          counterpartyId: customer._id,
          counterpartyName: customer.name,
          phone: customer.phone,
          amountPaid: safeWasool,
          discountAmount: 0,
          remainingBalance: newRemainingBalance,
          paymentMode: modeEnum,
          receiptMessage: `Rs. ${safeWasool.toLocaleString()} udhaar wasooli received from ${customer.name}.`,
        });
        onClose();
      } else {
        Alert.alert('خطا', res.message || 'وصولی درج کرنے میں ناکامی ہوئی۔');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Server error recording wasooli.';
      Alert.alert('خطا', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header & Customer Snapshot */}
          <View style={styles.modalHeader}>
            <View>
              <View style={styles.titleRow}>
                <Text style={styles.modalTitleUrdu}>وصولی و تصفیہ</Text>
                <Text style={styles.modalTitleEn}>(Wasooli & Settlement)</Text>
              </View>
              <Text style={styles.customerSubtitle}>
                {customer.name} {customer.phone ? `• ${customer.phone}` : ''}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Outstanding Balance Banner */}
            <View style={styles.debtBanner}>
              <Text style={styles.debtBannerLabel}>سابقہ کل واجب الادا (Sabqa Baqi Udhaar):</Text>
              <Text style={styles.debtBannerVal}>Rs. {currentDebt.toLocaleString()}</Text>
            </View>

            {/* Manual Numeric Entry with Quick Amount Chips */}
            <View style={styles.sectionBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>وصول شدہ رقم (Wasool Amount) *</Text>
              </View>

              {/* Quick Amount Chips */}
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chipPill, styles.chipPillFull]}
                  onPress={() => handleChipSelect(currentDebt)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipPillFullText}>مکمل حساب صاف (Full)</Text>
                </TouchableOpacity>

                {currentDebt >= 1000 ? (
                  <TouchableOpacity
                    style={styles.chipPill}
                    onPress={() => handleChipSelect(Math.round(currentDebt / 2))}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipPillText}>50%</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={styles.chipPill}
                  onPress={() => handleChipSelect(500)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipPillText}>Rs. 500</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.chipPill}
                  onPress={() => handleChipSelect(1000)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipPillText}>Rs. 1,000</Text>
                </TouchableOpacity>
              </View>

              {/* Numeric Amount Input Container */}
              <View style={styles.amountInputBox}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#64748B"
                  autoFocus
                />
              </View>
            </View>

            {/* Payment Destination Selector (ادائیگی کا ذریعہ) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.fieldLabel}>رقم جمع کرنے کا کھاتہ (Payment Destination Mode) *</Text>
              <View style={styles.destGrid}>
                {[
                  { id: 'CASH', label: 'نقد گلہ (Cash)', icon: 'cash-outline' },
                  { id: 'WALLET', label: 'JazzCash / EasyPaisa', icon: 'wallet-outline' },
                  { id: 'BANK', label: 'بینک کھاتہ (Bank / Raast)', icon: 'card-outline' },
                ].map((item) => {
                  const isSelected = paymentMode === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.destCard, isSelected && styles.destCardSelected]}
                      onPress={() => setPaymentMode(item.id as DestinationMode)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={isSelected ? '#10B981' : '#94A3B8'}
                      />
                      <Text style={[styles.destCardLabel, isSelected && styles.destCardLabelSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live Destination Balance Indicator */}
              <View style={styles.balanceIndicatorBadge}>
                <Text style={styles.balanceIndicatorLabel}>
                  {channelBalanceMap[paymentMode].name} میں موجودہ بیلنس:
                </Text>
                <Text style={styles.balanceIndicatorVal}>
                  Rs. {channelBalanceMap[paymentMode].balance.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Real-time Calculation Ledger Preview */}
            <View style={styles.previewBox}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>سابقہ بقایا (Previous Udhaar):</Text>
                <Text style={styles.previewVal}>Rs. {currentDebt.toLocaleString()}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabelGreen}>وصولی رقم (Wasooli Amount):</Text>
                <Text style={styles.previewValGreen}>- Rs. {safeWasool.toLocaleString()}</Text>
              </View>
              <View style={styles.previewDivider} />
              <View style={styles.previewRowTotal}>
                <Text style={styles.previewLabelTotal}>نیا بقایا (New Remaining Balance):</Text>
                <Text style={newRemainingBalance === 0 ? styles.previewValSuccess : styles.previewValWarning}>
                  {newRemainingBalance === 0 ? 'حساب صاف (Rs. 0)' : `Rs. ${newRemainingBalance.toLocaleString()}`}
                </Text>
              </View>
            </View>

            {/* Optional Notes */}
            <View style={styles.sectionBlock}>
              <Text style={styles.fieldLabelSub}>تفصیل / ریمارکس (Optional Notes / Slip Ref)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="مثلاً: Raast Transaction ID, Shop visit..."
                placeholderTextColor="#64748B"
              />
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              style={[styles.submitBtn, (isSubmitting || safeWasool <= 0) && styles.submitBtnDisabled]}
              onPress={handleSubmitWasooli}
              disabled={isSubmitting || safeWasool <= 0}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>✔ وصولی رجسٹر کریں (Confirm Wasooli)</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
    maxHeight: '94%',
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#020617',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitleUrdu: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  modalTitleEn: {
    fontSize: 12,
    color: '#94A3B8',
  },
  customerSubtitle: {
    fontSize: 12,
    color: '#34D399',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  formContainer: {
    padding: 20,
    gap: 16,
  },
  debtBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
  },
  debtBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  debtBannerVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FB7185',
  },
  sectionBlock: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  fieldLabelSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  chipPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    flexShrink: 1,
    minWidth: 0,
  },
  chipPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  chipPillFull: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderColor: '#059669',
  },
  chipPillFullText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  destGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  destCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#1E293B',
    gap: 6,
  },
  destCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  destCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },
  destCardLabelSelected: {
    color: '#6EE7B7',
  },
  balanceIndicatorBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  balanceIndicatorLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  balanceIndicatorVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },
  previewBox: {
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  previewVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  previewLabelGreen: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
  },
  previewValGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  previewDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 4,
  },
  previewRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabelTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  previewValSuccess: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34D399',
  },
  previewValWarning: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  notesInput: {
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#E2E8F0',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    minHeight: 48,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
