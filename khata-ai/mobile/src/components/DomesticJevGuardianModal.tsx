import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  domesticJevGuardianApi,
  IJevValidationResult,
  IHouseholdBudgetRadarData,
  DomesticModuleKey,
} from '../api/domesticJevGuardian.api';

export interface DomesticJevGuardianModalProps {
  visible: boolean;
  onClose: () => void;
  // If provided, operates in Pre-Flight Interception Mode for a specific transaction
  transactionValidation?: IJevValidationResult | null;
  onConfirmPayment?: (useSinkingFundOffset: boolean) => Promise<void>;
  onTransferSuccess?: () => void;
}

const MODULE_URDU_TITLES: Record<DomesticModuleKey, string> = {
  RASHAN: 'ماہانہ راشن لسٹ',
  MANDI: 'سبزی و گوشت منڈی',
  UTILITY: 'بجلی و گیس کے بل',
  STAFF: 'ملازمہ و ڈرائیور تنخواہ',
  SCHOOL_FEE: 'اسکول و اکیڈمی فیس',
  HOME_REPAIR: 'گھر کی مرمت و سروسنگ',
  MEDICAL: 'طبی و ادویات فنڈ',
  KAMETI: 'کمیٹی و بی سی کھاتہ',
  GENERAL: 'متفرق گھریلو اخراجات',
};

export const DomesticJevGuardianModal: React.FC<DomesticJevGuardianModalProps> = ({
  visible,
  onClose,
  transactionValidation,
  onConfirmPayment,
  onTransferSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(false);
  const [radarData, setRadarData] = useState<IHouseholdBudgetRadarData | null>(null);
  const [useSinkingOffset, setUseSinkingOffset] = useState<boolean>(
    Boolean(transactionValidation?.sinkingFundStatus?.isAvailable)
  );
  const [executingTransfer, setExecutingTransfer] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Fetch Radar Overview if not in single-transaction pre-flight mode
  const loadBudgetRadar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await domesticJevGuardianApi.getBudgetRadar();
      setRadarData(data);
    } catch (err: any) {
      console.error('[DomesticJevGuardian] Failed to load budget radar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && !transactionValidation) {
      loadBudgetRadar();
    }
    if (transactionValidation?.sinkingFundStatus?.isAvailable) {
      setUseSinkingOffset(true);
    }
  }, [visible, transactionValidation, loadBudgetRadar]);

  // 1-Tap ATM Transfer Execution
  const handleExecuteAtmTransfer = async () => {
    const rec = transactionValidation?.recommendedTransfer;
    if (!rec) return;

    try {
      setExecutingTransfer(true);
      await domesticJevGuardianApi.resolveVaultShortage({
        fromVaultId: rec.fromVaultId,
        toVaultId: rec.toVaultId,
        amount: rec.suggestedTransferAmount,
        notes: 'JEV گارڈین خودکار ATM ٹرانسفر برائے گھریلو خرچ',
      });

      Alert.alert(
        '✅ رقم منتقل ہو گئی',
        `${rec.fromAccountTitle} سے Rs. ${rec.suggestedTransferAmount.toLocaleString()} کیش دراز میں منتقل ہو چکے ہیں۔ اب آپ ادائیگی مکمل کر سکتے ہیں۔`
      );

      if (onTransferSuccess) onTransferSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'رقم منتقل نہ ہو سکی');
    } finally {
      setExecutingTransfer(false);
    }
  };

  // Confirm Expense
  const handleProceedWithExpense = async () => {
    if (!onConfirmPayment) {
      onClose();
      return;
    }

    try {
      setSubmittingExpense(true);
      await onConfirmPayment(useSinkingOffset);
      onClose();
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'ادائیگی مکمل نہ ہو سکی');
    } finally {
      setSubmittingExpense(false);
    }
  };

  const isInterceptionMode = Boolean(transactionValidation);
  const val = transactionValidation;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* ================= 1. HEADER ================= */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={20} color="#00d49f" />
              </View>
              <View>
                <Text style={styles.headerTitle}>JEV Domestic Vault & Budget Guardian</Text>
                <Text style={styles.headerSubtitle}>
                  {isInterceptionMode
                    ? 'گھریلو والٹ اور بجٹ تحفظاتی جانچ'
                    : 'ماہانہ گھریلو بجٹ اور ویلوسٹی ریڈار'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* ================= MODE A: TRANSACTION INTERCEPTION ================= */}
            {isInterceptionMode && val && (
              <View style={{ gap: 14 }}>
                {/* 1. Solvency Check Card */}
                {!val.isSolvent ? (
                  <View style={styles.insolventAlertCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="warning" size={22} color="#EF4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertCardTitle}>
                          والٹ میں رقم ناکافی ہے (Insufficient Balance)
                        </Text>
                        <Text style={styles.alertCardSub}>
                          {val.channelInspected}: دستیاب بیلنس صرف Rs.{' '}
                          {val.availableChannelBalance.toLocaleString()} ہے
                        </Text>
                      </View>
                    </View>

                    <View style={styles.shortageRow}>
                      <View style={styles.shortageCol}>
                        <Text style={styles.shortageLabel}>مطلوبہ ادائیگی</Text>
                        <Text style={styles.shortageVal}>
                          Rs. {(val.availableChannelBalance + val.shortageAmount).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.dividerV} />
                      <View style={styles.shortageCol}>
                        <Text style={styles.shortageLabel}>کمی (Shortage)</Text>
                        <Text style={[styles.shortageVal, { color: '#EF4444' }]}>
                          Rs. {val.shortageAmount.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* 1-Tap ATM Resolution Suggestion */}
                    {val.recommendedTransfer && (
                      <View style={styles.atmResolutionBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                          <Text style={styles.atmResolutionTitle}>JEV ذہین حل (1-Tap ATM Transfer):</Text>
                        </View>
                        <Text style={styles.atmResolutionDesc}>
                          {val.recommendedTransfer.reasonUrdu}
                        </Text>

                        <TouchableOpacity
                          style={styles.atmTransferBtn}
                          onPress={handleExecuteAtmTransfer}
                          disabled={executingTransfer}
                          activeOpacity={0.85}
                        >
                          {executingTransfer ? (
                            <ActivityIndicator size="small" color="#070d18" />
                          ) : (
                            <>
                              <Ionicons name="card-outline" size={16} color="#070d18" />
                              <Text style={styles.atmTransferBtnText}>
                                {val.recommendedTransfer.fromAccountTitle} سے Rs.{' '}
                                {val.recommendedTransfer.suggestedTransferAmount.toLocaleString()} ATM
                                ٹرانسفر کریں
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.solventPillCard}>
                    <Ionicons name="checkmark-circle" size={20} color="#00d49f" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.solventPillTitle}>
                        والٹ سالونسی محفوظ ہے (100% Solvent)
                      </Text>
                      <Text style={styles.solventPillSub}>
                        {val.channelInspected} میں ادائیگی کے لیے مناسب کیش بیلنس موجود ہے۔
                      </Text>
                    </View>
                    <Text style={styles.voucherTag}>{val.voucherNumber}</Text>
                  </View>
                )}

                {/* 2. Sinking Fund Auto-Offset Box */}
                {val.sinkingFundStatus?.isAvailable && (
                  <View style={styles.sinkingFundBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sinkingTitle}>🛡️ مخصوص سنکنگ ریزرو سے رقم وضع کریں</Text>
                        <Text style={styles.sinkingSub}>
                          {val.sinkingFundStatus.bucketTitle} (دستیاب بچت: Rs.{' '}
                          {val.sinkingFundStatus.currentSavedAmount.toLocaleString()})
                        </Text>
                      </View>
                      <Switch
                        value={useSinkingOffset}
                        onValueChange={setUseSinkingOffset}
                        thumbColor={useSinkingOffset ? '#00d49f' : '#64748B'}
                        trackColor={{ false: '#17233b', true: 'rgba(0, 212, 159, 0.3)' }}
                      />
                    </View>
                    <Text style={styles.sinkingNote}>
                      {useSinkingOffset
                        ? '✅ یہ خرچ مخصوص بچت فنڈ سے منہا ہوگا — عام کچن کیش پر بوجھ نہیں پڑے گا۔'
                        : 'عام کیش دراز سے کٹوتی کی جائے گی، بچت فنڈ محفوظ رہے گا۔'}
                    </Text>
                  </View>
                )}

                {/* 3. Budget Headroom & Velocity Guidance Card */}
                <View
                  style={[
                    styles.budgetGuidanceCard,
                    val.budgetGuidance.isOverbudget && {
                      borderColor: '#EF4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    },
                  ]}
                >
                  <View style={styles.budgetHeader}>
                    <View>
                      <Text style={styles.budgetCatTitle}>
                        بجٹ گائیڈنس:{' '}
                        {MODULE_URDU_TITLES[val.budgetGuidance.categoryKey as DomesticModuleKey] ||
                          val.budgetGuidance.categoryKey}
                      </Text>
                      <Text style={styles.budgetCapSub}>
                        ماہانہ حد: Rs. {val.budgetGuidance.monthlyBudgetCap.toLocaleString()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.headroomBadge,
                        val.budgetGuidance.isOverbudget && {
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          borderColor: '#EF4444',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.headroomBadgeText,
                          val.budgetGuidance.isOverbudget && { color: '#EF4444' },
                        ]}
                      >
                        {val.budgetGuidance.isOverbudget
                          ? `🚨 ${val.budgetGuidance.overbudgetPercentage}% اوور بجٹ`
                          : `🟢 گنجائش: Rs. ${val.budgetGuidance.headroomRemaining.toLocaleString()}`}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(
                            100,
                            Math.round(
                              (val.budgetGuidance.projectedTotalAfterExpense /
                                val.budgetGuidance.monthlyBudgetCap) *
                                100
                            )
                          )}%`,
                          backgroundColor: val.budgetGuidance.isOverbudget
                            ? '#EF4444'
                            : val.budgetGuidance.burnVelocityRate === 'CRITICAL_SPIKE'
                            ? '#F59E0B'
                            : '#00d49f',
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.adviceText}>{val.budgetGuidance.adviceMessageUrdu}</Text>
                </View>

                {/* Bottom Decision Actions */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                    <Text style={styles.cancelBtnText}>منسوخ کریں</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.proceedBtn,
                      !val.isSolvent && { backgroundColor: '#F59E0B' },
                    ]}
                    onPress={handleProceedWithExpense}
                    disabled={submittingExpense}
                    activeOpacity={0.85}
                  >
                    {submittingExpense ? (
                      <ActivityIndicator size="small" color="#070d18" />
                    ) : (
                      <>
                        <Ionicons
                          name={val.isSolvent ? 'checkmark-circle' : 'alert-circle'}
                          size={18}
                          color="#070d18"
                        />
                        <Text style={styles.proceedBtnText}>
                          {val.isSolvent ? 'تصدیق و ادائیگی' : 'اوور ڈرافٹ پر بھی جاری رکھیں'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= MODE B: HOUSEHOLD BUDGET RADAR OVERVIEW ================= */}
            {!isInterceptionMode && (
              <View style={{ gap: 14 }}>
                {loading && !radarData ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#00d49f" />
                    <Text style={styles.loadingText}>گھریلو بجٹ ویلوسٹی لوڈ ہو رہی ہے...</Text>
                  </View>
                ) : (
                  radarData && (
                    <>
                      {/* Overall Spend Card */}
                      <View style={styles.overallSpendCard}>
                        <View style={styles.overallTopRow}>
                          <View>
                            <Text style={styles.overallLabel}>کل گھریلو ماہانہ بجٹ کیپ</Text>
                            <Text style={styles.overallVal}>
                              Rs. {radarData.totalHouseholdBudgetCap.toLocaleString()}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.overallLabel}>اب تک خرچ (MTD)</Text>
                            <Text style={[styles.overallVal, { color: '#F59E0B' }]}>
                              Rs. {radarData.totalSpentMtd.toLocaleString()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(100, radarData.overallPercentageUsed)}%`,
                                backgroundColor:
                                  radarData.overallPercentageUsed >= 85 ? '#EF4444' : '#00d49f',
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.monthTimelineRow}>
                          <Text style={styles.timelineText}>
                            ماہ کا دن: {radarData.dayOfMonth} / {radarData.daysInMonth}
                          </Text>
                          <Text style={styles.timelineText}>
                            بقیہ کل گنجائش: Rs. {radarData.overallHeadroom.toLocaleString()} (
                            {100 - radarData.overallPercentageUsed}% محفوظ)
                          </Text>
                        </View>
                      </View>

                      {/* Category-by-Category Progress List */}
                      <Text style={styles.sectionHeading}>تمام گھریلو شعبہ جات کی صورتحال:</Text>

                      {radarData.categoryBreakdown.map((item, idx) => (
                        <View key={idx} style={styles.categoryCard}>
                          <View style={styles.categoryHeader}>
                            <Text style={styles.categoryTitle}>
                              {MODULE_URDU_TITLES[item.categoryKey] || item.categoryKey}
                            </Text>
                            <Text
                              style={[
                                styles.categoryUsedPill,
                                item.isOverbudget && { color: '#EF4444' },
                              ]}
                            >
                              {item.percentageUsed}% (Rs. {item.spentMtd.toLocaleString()} / Rs.{' '}
                              {item.budgetCap.toLocaleString()})
                            </Text>
                          </View>

                          <View style={styles.progressBarTrack}>
                            <View
                              style={[
                                styles.progressBarFill,
                                {
                                  width: `${Math.min(100, item.percentageUsed)}%`,
                                  backgroundColor: item.isOverbudget ? '#EF4444' : '#00d49f',
                                },
                              ]}
                            />
                          </View>

                          <View style={styles.categoryFooter}>
                            <Text style={styles.categoryFooterText}>
                              {item.isOverbudget
                                ? `🚨 بجٹ سے تجاوز: Rs. ${Math.abs(item.headroomRemaining).toLocaleString()} اضافی`
                                : `باقی محفوظ گنجائش: Rs. ${item.headroomRemaining.toLocaleString()}`}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0d1627',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#17233b',
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    padding: 16,
  },

  // Solvency Cards
  insolventAlertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 14,
    gap: 12,
  },
  alertCardTitle: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  alertCardSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 1,
  },
  shortageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#070d18',
    borderRadius: 8,
    paddingVertical: 8,
  },
  shortageCol: {
    alignItems: 'center',
  },
  shortageLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  shortageVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 1,
  },
  dividerV: {
    width: 1,
    height: 20,
    backgroundColor: '#17233b',
  },
  atmResolutionBox: {
    backgroundColor: '#070d18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    padding: 10,
    gap: 8,
  },
  atmResolutionTitle: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  atmResolutionDesc: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  atmTransferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00d49f',
    paddingVertical: 9,
    borderRadius: 6,
  },
  atmTransferBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Solvent Pill Card
  solventPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00d49f',
    padding: 12,
  },
  solventPillTitle: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: 'bold',
  },
  solventPillSub: {
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 1,
  },
  voucherTag: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  // Sinking Fund Box
  sinkingFundBox: {
    backgroundColor: '#070d18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 6,
  },
  sinkingTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sinkingSub: {
    color: '#00d49f',
    fontSize: 11,
    marginTop: 1,
  },
  sinkingNote: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
  },

  // Budget Guidance Card
  budgetGuidanceCard: {
    backgroundColor: '#070d18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetCatTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  budgetCapSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  headroomBadge: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#00d49f',
  },
  headroomBadgeText: {
    color: '#00d49f',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#0d1627',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  adviceText: {
    color: '#E2E8F0',
    fontSize: 11,
    lineHeight: 16,
  },

  // Actions
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#070d18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  proceedBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00d49f',
    borderRadius: 8,
    paddingVertical: 11,
  },
  proceedBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Overview Radar
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  overallSpendCard: {
    backgroundColor: '#070d18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    gap: 10,
  },
  overallTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overallLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  overallVal: {
    color: '#00d49f',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  monthTimelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 6,
  },
  categoryCard: {
    backgroundColor: '#070d18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryUsedPill: {
    color: '#00d49f',
    fontSize: 10,
    fontWeight: '600',
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryFooterText: {
    color: '#94A3B8',
    fontSize: 10,
  },
});

export default DomesticJevGuardianModal;
