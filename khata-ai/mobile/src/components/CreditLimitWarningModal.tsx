import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { counterpartyApi } from '../api/counterparty.api';
import { profileApi } from '../api/profile.api';
import { useAuth } from '../store/auth.store';
import { IJevCreditEvaluation } from '../api/udhaar.api';

interface CreditLimitWarningModalProps {
  visible: boolean;
  customerName: string;
  customerId?: string;
  currentBalance: number;
  newAmount: number;
  creditLimit: number;
  evaluation?: IJevCreditEvaluation | null;
  onClose: () => void;
  onAllowOverride: (pin?: string) => void;
  onLimitUpdated?: (newLimit: number) => void;
}

export const CreditLimitWarningModal: React.FC<CreditLimitWarningModalProps> = ({
  visible,
  customerName,
  customerId,
  currentBalance,
  newAmount,
  creditLimit,
  evaluation,
  onClose,
  onAllowOverride,
  onLimitUpdated,
}) => {
  const { user } = useAuth();
  const isCashier = user?.role === 'CASHIER';

  const projectedBalance = currentBalance + newAmount;
  const excessAmount = Math.max(0, projectedBalance - creditLimit);

  const [showIncreaseForm, setShowIncreaseForm] = useState(false);
  const [newLimitInput, setNewLimitInput] = useState(
    evaluation?.credit_limit_recommendation
      ? String(evaluation.credit_limit_recommendation)
      : String(Math.ceil((projectedBalance + 5000) / 5000) * 5000)
  );
  const [updating, setUpdating] = useState(false);

  // PIN Override State
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [verifyingPin, setVerifyingPin] = useState(false);

  const isHardBlocked = evaluation?.action_verdict === 'HARD_BLOCK';
  const requiresManagerPin =
    evaluation?.action_verdict === 'REQUIRE_MANAGER_PIN' || isCashier;

  const handleAllowClick = () => {
    if (isHardBlocked) return;

    if (requiresManagerPin && !pinInput.trim()) {
      setShowPinInput(true);
      setPinError(null);
    } else {
      onAllowOverride(pinInput.trim() || undefined);
    }
  };

  const handleVerifyPinSubmit = async () => {
    if (!pinInput.trim()) {
      setPinError('براہ کرم سیکیورٹی پن درج کریں (Please enter Manager PIN).');
      return;
    }
    setVerifyingPin(true);
    setPinError(null);
    try {
      const res = await profileApi.verifyManagerPin(pinInput.trim());
      if (res.success) {
        const verifiedPin = pinInput.trim();
        setShowPinInput(false);
        setPinInput('');
        onAllowOverride(verifiedPin);
      } else {
        setPinError(res.message || 'غلط پن: منیجر کا پن غیر درست ہے۔');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'غلط پن: منیجر کا پن غیر درست ہے۔';
      setPinError(msg);
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleUpdateLimitSubmit = async (customLimit?: number) => {
    const numericLimit = customLimit || parseFloat(newLimitInput);
    if (isNaN(numericLimit) || numericLimit <= 0) return;

    setUpdating(true);
    try {
      if (customerId) {
        await counterpartyApi.update(customerId, { creditLimit: numericLimit });
      }
      onLimitUpdated?.(numericLimit);
      setShowIncreaseForm(false);
      onAllowOverride(pinInput.trim() || undefined);
    } catch (e) {
      onLimitUpdated?.(numericLimit);
      setShowIncreaseForm(false);
      onAllowOverride(pinInput.trim() || undefined);
    } finally {
      setUpdating(false);
    }
  };

  const defaultProbPct = evaluation
    ? Math.round(evaluation.default_probability * 100)
    : null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Top Header */}
          <View
            style={[
              styles.alertHeader,
              isHardBlocked ? styles.alertHeaderRed : styles.alertHeaderAmber,
            ]}
          >
            <View
              style={[
                styles.alertIconCircle,
                isHardBlocked ? styles.alertIconCircleRed : styles.alertIconCircleAmber,
              ]}
            >
              <Ionicons
                name={isHardBlocked ? 'hand-left' : 'shield-half'}
                size={22}
                color={isHardBlocked ? '#DC2626' : '#D97706'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.alertTitle,
                  { color: isHardBlocked ? '#991B1B' : '#92400E' },
                ]}
              >
                {isHardBlocked
                  ? 'Jev: Hard Credit Block (سخت پابندی)'
                  : 'Jev: Credit Limit & Risk Check'}
              </Text>
              <Text style={styles.alertSubtitle}>
                {isHardBlocked
                  ? 'گاہک پر مزید ادھار بند ہے • ڈیفالٹ کا خطرہ زیادہ'
                  : 'ادھار کی حد اور ادائیگی کے خطرے کی جانچ'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
            {/* Jev AI Risk Assessment Scorecard */}
            {evaluation && (
              <View
                style={[
                  styles.jevScorecard,
                  isHardBlocked
                    ? styles.jevScorecardRed
                    : evaluation.risk_tier === 'MEDIUM'
                    ? styles.jevScorecardAmber
                    : styles.jevScorecardGreen,
                ]}
              >
                <View style={styles.jevHeaderRow}>
                  <View style={styles.jevPill}>
                    <Ionicons name="sparkles" size={13} color="#4338CA" />
                    <Text style={styles.jevPillText}>Jev Credit AI Engine</Text>
                  </View>
                  <View
                    style={[
                      styles.tierBadge,
                      evaluation.risk_tier === 'HIGH'
                        ? styles.tierBadgeRed
                        : evaluation.risk_tier === 'MEDIUM'
                        ? styles.tierBadgeAmber
                        : styles.tierBadgeGreen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tierBadgeText,
                        evaluation.risk_tier === 'HIGH'
                          ? { color: '#991B1B' }
                          : evaluation.risk_tier === 'MEDIUM'
                          ? { color: '#92400E' }
                          : { color: '#065F46' },
                      ]}
                    >
                      {evaluation.risk_tier} RISK ({defaultProbPct}%)
                    </Text>
                  </View>
                </View>

                {/* Verdict Headline */}
                <Text style={styles.verdictUrdu}>{evaluation.reasons.urdu}</Text>
                <Text style={styles.verdictEnglish}>{evaluation.reasons.english}</Text>

                {/* Sub-Metrics Grid */}
                <View style={styles.jevSubGrid}>
                  <View style={styles.jevSubItem}>
                    <Text style={styles.jevSubLabel}>Repayment Velocity</Text>
                    <Text style={styles.jevSubValue}>
                      {Math.round(evaluation.metrics.repaymentVelocity * 100)}%
                    </Text>
                  </View>
                  <View style={styles.jevSubItem}>
                    <Text style={styles.jevSubLabel}>Overdue Lag</Text>
                    <Text style={styles.jevSubValue}>
                      {evaluation.metrics.maxOverdueDays} Din
                    </Text>
                  </View>
                  <View style={styles.jevSubItem}>
                    <Text style={styles.jevSubLabel}>Safe Ceiling</Text>
                    <Text style={[styles.jevSubValue, { color: '#059669' }]}>
                      Rs. {evaluation.credit_limit_recommendation.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* One-Click Apply Recommended Limit */}
                {evaluation.credit_limit_recommendation > 0 && !isHardBlocked && (
                  <TouchableOpacity
                    style={styles.applyRecLimitBtn}
                    onPress={() =>
                      handleUpdateLimitSubmit(evaluation.credit_limit_recommendation)
                    }
                  >
                    <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
                    <Text style={styles.applyRecLimitBtnText}>
                      تجویز کردہ حد لاگو کریں (Set Rs.{' '}
                      {evaluation.credit_limit_recommendation.toLocaleString()})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Financial Ledger Comparison Card */}
            <View style={styles.warningCard}>
              <Text style={styles.customerName}>گاہک (Customer): {customerName}</Text>

              <View style={styles.metricsGrid}>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Current Owed (موجودہ ادھار):</Text>
                  <Text style={styles.metricVal}>Rs. {currentBalance.toLocaleString()}</Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>New Transaction (نیا ادھار):</Text>
                  <Text style={[styles.metricVal, { color: '#E11D48' }]}>
                    + Rs. {newAmount.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Total Projected Balance:</Text>
                  <Text style={styles.metricBoldVal}>
                    Rs. {projectedBalance.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.metricRow}>
                  <Text style={styles.metricLabel}>Allowed Credit Limit (منظور شدہ حد):</Text>
                  <Text style={styles.metricVal}>Rs. {creditLimit.toLocaleString()}</Text>
                </View>

                {excessAmount > 0 && (
                  <View style={[styles.metricRow, styles.excessRow]}>
                    <Text style={styles.excessLabel}>🔴 Exceeded Excess (حد سے زائد):</Text>
                    <Text style={styles.excessVal}>
                      + Rs. {excessAmount.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Increase Limit Form View */}
            {showIncreaseForm && !isHardBlocked && (
              <View style={styles.increaseFormBox}>
                <Text style={styles.increaseLabel}>New Credit Limit (نئی حد):</Text>
                <View style={styles.increaseInputRow}>
                  <Text style={styles.currencyPrefix}>Rs.</Text>
                  <TextInput
                    style={styles.increaseInput}
                    keyboardType="numeric"
                    value={newLimitInput}
                    onChangeText={setNewLimitInput}
                  />
                  <TouchableOpacity
                    style={styles.saveLimitBtn}
                    onPress={() => handleUpdateLimitSubmit()}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.saveLimitBtnText}>Save Limit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Manager PIN Verification Form */}
            {(showPinInput || (requiresManagerPin && !isHardBlocked)) && (
              <View style={styles.pinFormBox}>
                <View style={styles.pinHeaderRow}>
                  <Ionicons name="key" size={16} color="#D97706" />
                  <Text style={styles.pinHeaderTitle}>
                    Manager Security PIN (منیجر کا سیکیورٹی پن):
                  </Text>
                </View>
                <Text style={styles.pinSubText}>
                  اوور رائیڈ کی توثیق کے لیے 4 یا 6 ہندسوں کا پن درج کریں
                </Text>
                {pinError && <Text style={styles.pinErrorText}>{pinError}</Text>}
                <View style={styles.pinInputRow}>
                  <TextInput
                    style={styles.pinInputField}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={6}
                    placeholder="••••"
                    placeholderTextColor="#94A3B8"
                    value={pinInput}
                    onChangeText={(val) => {
                      setPinInput(val);
                      setPinError(null);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.pinVerifyBtn}
                    onPress={handleVerifyPinSubmit}
                    disabled={verifyingPin}
                  >
                    {verifyingPin ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.pinVerifyBtnText}>توثیق کریں</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Options Footer */}
          <View style={styles.actionsContainer}>
            {isHardBlocked ? (
              /* Hard Block Action */
              <View style={styles.hardBlockNotice}>
                <Ionicons name="ban" size={20} color="#DC2626" />
                <Text style={styles.hardBlockNoticeText}>
                  ادھار کی اجازت نہیں ہے • صرف وصولی یا نقد فروخت کریں
                </Text>
              </View>
            ) : (
              <>
                {!showIncreaseForm && (
                  <TouchableOpacity
                    style={styles.increaseLimitBtn}
                    onPress={() => setShowIncreaseForm(true)}
                  >
                    <Ionicons name="create-outline" size={16} color="#0284C7" />
                    <Text style={styles.increaseLimitBtnText}>
                      ✏️ حد بڑھائیں (Adjust Credit Ceiling)
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.allowBtn}
                  onPress={handleAllowClick}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.allowBtnText}>
                    {requiresManagerPin
                      ? '🔑 Verify PIN & Allow Credit'
                      : '🟢 Approve Credit (منظوری دیں)'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={18} color="#64748B" />
              <Text style={styles.cancelBtnText}>
                {isHardBlocked ? 'بند کریں (Close)' : 'ادھار نہ دیں (Decline Credit)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    maxHeight: '90%',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  alertHeaderRed: {
    borderBottomColor: '#FEE2E2',
  },
  alertHeaderAmber: {
    borderBottomColor: '#FEF3C7',
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconCircleRed: {
    backgroundColor: '#FEE2E2',
  },
  alertIconCircleAmber: {
    backgroundColor: '#FEF3C7',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  alertSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  // Jev AI Scorecard
  jevScorecard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  jevScorecardGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  jevScorecardAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  jevScorecardRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  jevHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  jevPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  jevPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierBadgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  tierBadgeAmber: {
    backgroundColor: '#FEF3C7',
  },
  tierBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  verdictUrdu: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
    lineHeight: 18,
  },
  verdictEnglish: {
    fontSize: 11,
    color: '#475569',
    marginBottom: 8,
  },
  jevSubGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jevSubItem: {
    alignItems: 'center',
    flex: 1,
  },
  jevSubLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  jevSubValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  applyRecLimitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  applyRecLimitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  // Financial card
  warningCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  metricsGrid: {
    gap: 6,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  metricBoldVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  excessRow: {
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 6,
    marginTop: 2,
  },
  excessLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  excessVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  // Increase Limit
  increaseFormBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  increaseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 6,
  },
  increaseInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },
  increaseInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#7DD3FC',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  saveLimitBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveLimitBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // PIN Form
  pinFormBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  pinHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  pinSubText: {
    fontSize: 10,
    color: '#78350F',
    marginBottom: 8,
  },
  pinErrorText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinInputField: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    color: '#0F172A',
  },
  pinVerifyBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinVerifyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  // Actions
  actionsContainer: {
    gap: 8,
    marginTop: 4,
  },
  increaseLimitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingVertical: 10,
    borderRadius: 10,
  },
  increaseLimitBtnText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  allowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
  },
  allowBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  hardBlockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
  },
  hardBlockNoticeText: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
});
