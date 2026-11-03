import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cashDrawerApi, ExpectedCashBreakdown } from '../api/cashDrawer.api';

interface GallaBandiModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GallaBandiModal: React.FC<GallaBandiModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [breakdown, setBreakdown] = useState<ExpectedCashBreakdown | null>(null);
  const [openingFloat, setOpeningFloat] = useState<string>('5000');
  const [physicalCash, setPhysicalCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showDenomCounter, setShowDenomCounter] = useState(false);
  const [denomCounts, setDenomCounts] = useState<{ [denom: string]: string }>({
    '5000': '',
    '1000': '',
    '500': '',
    '100': '',
    '50': '',
    '20': '',
    '10': '',
  });

  const handleDenomChange = (denom: string, val: string) => {
    const updated = { ...denomCounts, [denom]: val };
    setDenomCounts(updated);
    let total = 0;
    for (const [d, count] of Object.entries(updated)) {
      const qty = parseInt(count, 10) || 0;
      total += parseInt(d, 10) * qty;
    }
    setPhysicalCash(total > 0 ? String(total) : '');
  };

  useEffect(() => {
    if (visible) {
      fetchExpectedCash();
    }
  }, [visible]);

  const fetchExpectedCash = async () => {
    setLoading(true);
    try {
      const openVal = parseFloat(openingFloat) || 0;
      const res = await cashDrawerApi.calculateExpectedCash({ openingBalance: openVal });
      if (res.success && res.data) {
        setBreakdown(res.data);
        if (res.data.openingBalance > 0) {
          setOpeningFloat(String(res.data.openingBalance));
        }
      }
    } catch (err: any) {
      console.error('Error fetching expected cash:', err);
      const openFloatNum = parseFloat(openingFloat) || 0;
      setBreakdown({
        openingBalance: openFloatNum,
        cashInTotal: 0,
        cashOutTotal: 0,
        settlementsCashTotal: 0,
        systemExpectedCash: openFloatNum,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    const counted = parseFloat(physicalCash);
    if (isNaN(counted) || counted < 0) {
      Alert.alert('غلط رقم', 'براہ کرم صحیح نقد رقم درج کریں۔ (Please enter a valid physical cash amount)');
      return;
    }

    setSubmitting(true);
    try {
      const effectiveOpen = parseFloat(openingFloat) || 0;
      const res = await cashDrawerApi.submitReconciliation({
        physicalCountedCash: counted,
        openingBalance: effectiveOpen,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        const variance = res.data.reconciliation.discrepancyAmount;
        let statusMsg = 'گلہ بندی کی تصدیق ہو گئی ہے۔';
        if (variance > 0) {
          statusMsg = `گلہ بندی کی تصدیق ہو گئی۔ (روپے +${variance} زیادہ)`;
        } else if (variance < 0) {
          statusMsg = `گلہ بندی کی تصدیق ہو گئی۔ (روپے ${variance} کم)`;
        }

        Alert.alert('گلہ بندی مکمل (Galla Reconciliation Complete)', statusMsg, [
          {
            text: 'ٹھیک ہے (OK)',
            onPress: () => {
              setPhysicalCash('');
              setNotes('');
              onSuccess?.();
              onClose();
            },
          },
        ]);
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'گلہ بندی میں ناکامی';
      Alert.alert('خطا (Error)', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveOpening = parseFloat(openingFloat) || 0;
  const cashInTotal = (breakdown?.cashInTotal || 0) + (breakdown?.settlementsCashTotal || 0);
  const cashOutTotal = breakdown?.cashOutTotal || 0;
  const systemExpected = effectiveOpening + cashInTotal - cashOutTotal;
  const countedNum = parseFloat(physicalCash) || 0;
  const discrepancy = physicalCash !== '' ? countedNum - systemExpected : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="lock-closed-outline" size={24} color="#1E293B" style={styles.headerIcon} />
              <View>
                <Text style={styles.headerTitle}>گلہ بندی (Evening Cash Reconciliation)</Text>
                <Text style={styles.headerSubtitle}>شام کا کیش رجسٹر اور گلہ چیک کریں</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={styles.loadingText}>حساب کتاب لوڈ ہو رہا ہے...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              {/* Editable Opening Float Input */}
              <View style={[styles.inputGroup, { marginBottom: 12 }]}>
                <Text style={styles.inputLabel}>صبح کا ابتدائی بیلنس / کیش فلوٹ (Opening Float Balance):</Text>
                <View style={[styles.textInputWrapper, { backgroundColor: '#F0F9FF', borderColor: '#0284C7' }]}>
                  <Text style={[styles.currencyPrefix, { color: '#0284C7' }]}>Rs.</Text>
                  <TextInput
                    style={[styles.textInput, { color: '#0369A1' }]}
                    placeholder="5000"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={openingFloat}
                    onChangeText={setOpeningFloat}
                  />
                </View>
              </View>

              {/* Summary Cards */}
              <View style={[styles.summaryBox, systemExpected < 0 && { borderColor: '#FDA4AF', backgroundColor: '#FFF1F2' }]}>
                <Text style={styles.summaryLabel}>سسٹم کے مطابق متوقع نقد رقم (System Expected Cash):</Text>
                <Text style={[styles.summaryValue, systemExpected < 0 && { color: '#E11D48' }]}>
                  Rs. {systemExpected.toLocaleString()}
                </Text>
                {systemExpected < 0 && (
                  <Text style={{ fontSize: 11, color: '#BE123C', marginTop: 4, fontWeight: '700' }}>
                    ⚠️ Expected cash is negative! Adjust starting Opening Float above to balance early cash out.
                  </Text>
                )}
              </View>

              {breakdown && (
                <View style={styles.breakdownContainer}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>ابتدائی بیلنس (Opening Float):</Text>
                    <Text style={styles.breakdownValue}>Rs. {effectiveOpening.toLocaleString()}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>آمدن / وصولی (Cash In):</Text>
                    <Text style={[styles.breakdownValue, { color: '#16A34A' }]}>
                      +Rs. {cashInTotal.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>ادائیگی / اخراجات (Cash Out):</Text>
                    <Text style={[styles.breakdownValue, { color: '#DC2626' }]}>
                      -Rs. {cashOutTotal.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}

              {/* Denomination Counter Toggle & 2-Column Grid */}
              <View style={styles.denomSection}>
                <TouchableOpacity
                  style={styles.denomToggleBtn}
                  onPress={() => setShowDenomCounter(!showDenomCounter)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="calculator-outline" size={17} color="#0284C7" />
                    <Text style={styles.denomToggleText}>
                      {showDenomCounter
                        ? 'نوٹوں کی گنتی چھپائیں (Hide)'
                        : 'نوٹوں کی گنتی سے رقم بنائیں (Denominations)'}
                    </Text>
                  </View>
                  <Ionicons
                    name={showDenomCounter ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#0284C7"
                  />
                </TouchableOpacity>

                {showDenomCounter && (
                  <View style={styles.denomGrid}>
                    {[
                      { label: 'Rs. 5,000', key: '5000' },
                      { label: 'Rs. 1,000', key: '1000' },
                      { label: 'Rs. 500', key: '500' },
                      { label: 'Rs. 100', key: '100' },
                      { label: 'Rs. 50', key: '50' },
                      { label: 'Rs. 20', key: '20' },
                      { label: 'Rs. 10 / Coins', key: '10' },
                    ].map((item) => {
                      const countVal = denomCounts[item.key] || '';
                      const subTotal = (parseInt(item.key, 10) || 0) * (parseInt(countVal, 10) || 0);

                      return (
                        <View key={item.key} style={styles.denomCard}>
                          <Text style={styles.denomLabel}>{item.label}</Text>
                          <View style={styles.denomInputRow}>
                            <Text style={styles.denomMultiplier}>×</Text>
                            <TextInput
                              style={styles.denomInput}
                              placeholder="0"
                              placeholderTextColor="#94A3B8"
                              keyboardType="numeric"
                              value={countVal}
                              onChangeText={(val) => handleDenomChange(item.key, val)}
                            />
                          </View>
                          {subTotal > 0 ? (
                            <Text style={styles.denomSubTotal}>
                              = Rs. {subTotal.toLocaleString()}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Input Physical Count */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>گلہ میں موجود نقد رقم (Physical Counted Cash):</Text>
                <View style={styles.textInputWrapper}>
                  <Text style={styles.currencyPrefix}>Rs.</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={physicalCash}
                    onChangeText={setPhysicalCash}
                  />
                </View>
              </View>

              {/* Live Discrepancy Indicator */}
              {physicalCash !== '' && (
                <View
                  style={[
                    styles.discrepancyBox,
                    discrepancy === 0
                      ? styles.discMatched
                      : discrepancy > 0
                      ? styles.discSurplus
                      : styles.discShortage,
                  ]}
                >
                  <Ionicons
                    name={
                      discrepancy === 0
                        ? 'checkmark-circle'
                        : discrepancy > 0
                        ? 'trending-up'
                        : 'alert-circle'
                    }
                    size={22}
                    color={
                      discrepancy === 0
                        ? '#15803D'
                        : discrepancy > 0
                        ? '#0369A1'
                        : '#B91C1C'
                    }
                  />
                  <Text
                    style={[
                      styles.discrepancyText,
                      {
                        color:
                          discrepancy === 0
                            ? '#15803D'
                            : discrepancy > 0
                            ? '#0369A1'
                            : '#B91C1C',
                      },
                    ]}
                  >
                    {discrepancy === 0
                      ? 'حساب بالکل درست ہے! (Exact Match)'
                      : discrepancy > 0
                      ? `گلہ میں Rs. ${Math.abs(discrepancy).toLocaleString()} زائد ہے (Surplus)`
                      : `گلہ میں Rs. ${Math.abs(discrepancy).toLocaleString()} کی کمی ہے (Shortage)`}
                  </Text>
                </View>
              )}

              {/* Notes Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>نوٹس / تفصیل (Notes - Optional):</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="مثلاً: 500 کا نوٹ فالتو پایا گیا..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.btnDisabled]}
                onPress={handleReconcile}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>گلہ بند کریں اور محفوظ کریں (Submit Reconciliation)</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: 450,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  content: {
    padding: 20,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  breakdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 16,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#475569',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  textArea: {
    fontSize: 14,
    fontWeight: '400',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    minHeight: 60,
  },
  discrepancyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  discMatched: {
    backgroundColor: '#DCFCE7',
  },
  discSurplus: {
    backgroundColor: '#E0F2FE',
  },
  discShortage: {
    backgroundColor: '#FEE2E2',
  },
  discrepancyText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  denomSection: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  denomToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  denomToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  denomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    gap: 8,
  },
  denomCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  denomLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  denomInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    height: 36,
  },
  denomMultiplier: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 4,
    fontWeight: '600',
  },
  denomInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    paddingVertical: 4,
  },
  denomSubTotal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
    textAlign: 'right',
  },
});
