import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinancialMetrics } from '../context/FinancialMetricsContext';
import { jevRunwayApi, IJevLiquidityHorizon } from '../api/jevRunway.api';
import { TaqazaPolicyClassifier } from '../services/taqazaClassifier.service';

interface LiquidityRadarModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenWasooli?: (customerId: string, name: string) => void;
}

export const LiquidityRadarModal: React.FC<LiquidityRadarModalProps> = ({
  visible,
  onClose,
  onOpenWasooli,
}) => {
  const insets = useSafeAreaInsets();
  const { metrics, refreshMetricsFromServer } = useFinancialMetrics();
  const [loading, setLoading] = useState(false);
  const [activeScope, setActiveScope] = useState<'ALL_CHANNELS' | 'TILL_ONLY'>('ALL_CHANNELS');
  const [horizon, setHorizon] = useState<IJevLiquidityHorizon | null>(
    metrics.liquidityHorizon || null
  );

  const fetchHorizon = async (scope: 'ALL_CHANNELS' | 'TILL_ONLY' = activeScope) => {
    setLoading(true);
    try {
      const res = await jevRunwayApi.getLiquidityRadar(scope);
      if (res.success && res.data) {
        setHorizon(res.data);
      }
    } catch (e) {
      // Offline fallback to current context
    } finally {
      setLoading(false);
    }
  };

  const handleScopeChange = (newScope: 'ALL_CHANNELS' | 'TILL_ONLY') => {
    setActiveScope(newScope);
    fetchHorizon(newScope);
  };

  useEffect(() => {
    if (visible) {
      if (metrics.liquidityHorizon) {
        setHorizon(metrics.liquidityHorizon);
      }
      fetchHorizon(activeScope);
    }
  }, [visible]);

  const activeHorizon = horizon || metrics.liquidityHorizon;
  const runwayDays = activeHorizon ? activeHorizon.safe_runway_days : metrics.runwayDays;
  const runwayState = activeHorizon ? activeHorizon.runway_state : metrics.runwayState;
  const hazardPercent = activeHorizon ? Math.round(activeHorizon.stockout_hazard_within_7d * 100) : 12;

  const getStatusColor = () => {
    if (runwayState === 'CRITICAL') return '#DC2626';
    if (runwayState === 'WARNING') return '#D97706';
    return '#059669';
  };

  const getStatusBg = () => {
    if (runwayState === 'CRITICAL') return '#FEF2F2';
    if (runwayState === 'WARNING') return '#FFFBEB';
    return '#ECFDF5';
  };

  const handleWhatsAppTaqaza = (customer: { name: string; phone: string; owedAmount: number }) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone;
    const policy = TaqazaPolicyClassifier.evaluate({
      customerName: customer.name,
      currentBalance: customer.owedAmount,
      creditLimit: 15000,
      daysPastDue: 7,
      phone: customer.phone,
    });
    const msg = policy.prefilledUrduMessage;
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp Not Available', `Message for ${customer.name}:\n\n"${msg}"`);
        }
      })
      .catch(() => {
        Alert.alert('Notice', `Payment reminder copied for ${customer.name}`);
      });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(20, insets.bottom) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconCircle, { backgroundColor: getStatusBg() }]}>
                <Ionicons name="speedometer-outline" size={22} color={getStatusColor()} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Galla Runway & Liquidity Radar</Text>
                <Text style={styles.headerSubtitle}>
                  کیش رن وے ریڈار • Jev Time-Series Engine
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Scope Selector: All Channels vs Till Only */}
            <View style={styles.scopeSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.scopeSelectorBtn,
                  activeScope === 'ALL_CHANNELS' && styles.scopeSelectorBtnActive,
                ]}
                onPress={() => handleScopeChange('ALL_CHANNELS')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="wallet-outline"
                  size={15}
                  color={activeScope === 'ALL_CHANNELS' ? '#047857' : '#64748B'}
                />
                <Text
                  style={[
                    styles.scopeSelectorBtnText,
                    activeScope === 'ALL_CHANNELS' && styles.scopeSelectorBtnTextActive,
                  ]}
                >
                  🏦 تمام اکاؤنٹس و والٹس (All Channels)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeSelectorBtn,
                  activeScope === 'TILL_ONLY' && styles.scopeSelectorBtnActive,
                ]}
                onPress={() => handleScopeChange('TILL_ONLY')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="cash-outline"
                  size={15}
                  color={activeScope === 'TILL_ONLY' ? '#047857' : '#64748B'}
                />
                <Text
                  style={[
                    styles.scopeSelectorBtnText,
                    activeScope === 'TILL_ONLY' && styles.scopeSelectorBtnTextActive,
                  ]}
                >
                  💵 صرف نقد گلہ (Till Only)
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1. Hero Runway Days Card */}
            <View style={[styles.heroRunwayCard, { borderColor: getStatusColor(), backgroundColor: getStatusBg() }]}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={styles.heroLabel}>SAFE OPERATIONAL RUNWAY</Text>
                  <View style={styles.heroValueRow}>
                    <Text style={[styles.heroValueNumber, { color: getStatusColor() }]}>
                      {runwayDays}
                    </Text>
                    <Text style={[styles.heroValueUnit, { color: getStatusColor() }]}>
                      Din / دن
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                  <Ionicons
                    name={
                      runwayState === 'CRITICAL'
                        ? 'alert-circle'
                        : runwayState === 'WARNING'
                        ? 'warning'
                        : 'shield-checkmark'
                    }
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.statusBadgeText}>
                    {runwayState === 'CRITICAL'
                      ? 'CRITICAL (خطرناک)'
                      : runwayState === 'WARNING'
                      ? 'WARNING (توجہ طلب)'
                      : 'SAFE (محفوظ)'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroMessageUrdu}>
                {activeHorizon?.messages.ur ||
                  `دکان کے موجودہ گلہ اور متوقع اخراجات کے مطابق رن وے ${runwayDays} دن محفوظ ہے۔`}
              </Text>
              <Text style={styles.heroMessageEn}>
                {activeHorizon?.messages.en ||
                  `Reserves are projected to cover ${runwayDays} days of obligations before hitting minimum float.`}
              </Text>
            </View>

            {/* 2. Stockout Hazard within 7 Days */}
            <View style={styles.hazardCard}>
              <View style={styles.hazardHeader}>
                <Ionicons
                  name={hazardPercent > 60 ? 'flame' : hazardPercent > 30 ? 'warning-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color={hazardPercent > 60 ? '#DC2626' : hazardPercent > 30 ? '#D97706' : '#059669'}
                />
                <Text style={styles.hazardTitle}>7-Day Stockout Hazard (مال ختم ہونے کا خطرہ):</Text>
                <Text
                  style={[
                    styles.hazardPercentVal,
                    { color: hazardPercent > 60 ? '#DC2626' : hazardPercent > 30 ? '#D97706' : '#059669' },
                  ]}
                >
                  {hazardPercent}% {hazardPercent > 60 ? 'High' : hazardPercent > 30 ? 'Moderate' : 'Low'}
                </Text>
              </View>

              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(5, hazardPercent))}%`,
                      backgroundColor: hazardPercent > 60 ? '#DC2626' : hazardPercent > 30 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>
              <Text style={styles.hazardSubText}>
                {hazardPercent > 60
                  ? '⚠️ کیش کی تنگی کی وجہ سے اگلے 7 دنوں میں سپلائر سے نیا مال اٹھانا مشکل ہو سکتا ہے۔'
                  : 'اگلے 7 دنوں میں کریٹیکل اسٹاک کی دوبارہ خریداری کے لیے کیش کافی ہے۔'}
              </Text>
            </View>

            {/* 3. Detailed Liquidity Horizon Breakdown */}
            <Text style={styles.sectionHeader}>مالیاتی تناسب و بریک ڈاؤن (Cash Horizon Breakdown):</Text>
            <View style={styles.breakdownCard}>
              {/* Physical Cash Galla */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="cash-outline" size={14} color="#059669" />
                  <Text style={styles.breakdownLabel}>موجودہ نقد گلہ (Physical Cash):</Text>
                </View>
                <Text style={styles.breakdownValueGreen}>
                  Rs. {(activeHorizon?.breakdown.current_galla_cash ?? metrics.channels.physicalCash).toLocaleString()}
                </Text>
              </View>

              {/* Digital Wallet */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="phone-portrait-outline" size={14} color="#0284C7" />
                  <Text style={styles.breakdownLabel}>ڈیجیٹل والٹ (JazzCash / EasyPaisa):</Text>
                </View>
                <Text style={styles.breakdownValueBlue}>
                  Rs. {(activeHorizon?.breakdown.digital_wallet ?? metrics.channels.digitalWallet).toLocaleString()}
                </Text>
              </View>

              {/* Bank Account */}
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="business-outline" size={14} color="#6366F1" />
                  <Text style={styles.breakdownLabel}>بینک کھاتہ (Bank Account):</Text>
                </View>
                <Text style={[styles.breakdownValue, { color: '#6366F1', fontWeight: '700' }]}>
                  Rs. {(activeHorizon?.breakdown.bank_account ?? metrics.channels.bankAccount).toLocaleString()}
                </Text>
              </View>

              {/* Total Liquid Reserves Highlight */}
              <View style={[styles.breakdownRow, styles.totalLiquidHighlightRow]}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="diamond-outline" size={15} color="#065F46" />
                  <Text style={[styles.breakdownLabel, { fontWeight: '700', color: '#065F46' }]}>
                    مجموعی مائع سرمایہ (Total Liquid Reserves):
                  </Text>
                </View>
                <Text style={[styles.breakdownValueGreen, { fontWeight: '800', fontSize: 14 }]}>
                  Rs. {(activeHorizon?.breakdown.total_liquid_reserves ?? (metrics.channels.physicalCash + metrics.channels.digitalWallet + metrics.channels.bankAccount)).toLocaleString()}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="shield-outline" size={14} color="#0284C7" />
                  <Text style={styles.breakdownLabel}>محفوظ کم از کم فلوٹ (Min Float Buffer):</Text>
                </View>
                <Text style={styles.breakdownValueBlue}>
                  Rs. {(activeHorizon?.recommended_min_float ?? 5000).toLocaleString()}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="calendar-outline" size={14} color="#DC2626" />
                  <Text style={styles.breakdownLabel}>اگلے 7 دن کے واجبات (Maine Dene + Tankhwa):</Text>
                </View>
                <Text style={styles.breakdownValueRed}>
                  Rs. {(activeHorizon?.breakdown.scheduled_payables_next_7d ?? 15000).toLocaleString()}
                </Text>
              </View>

              {Boolean(activeHorizon?.breakdown?.staff_payroll_obligations_next_7d && activeHorizon.breakdown.staff_payroll_obligations_next_7d > 0) && (
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelGroup}>
                    <Ionicons name="people-outline" size={14} color="#D97706" />
                    <Text style={styles.breakdownLabel}>شامل عملے کی تنخواہیں (Staff Tankhwa):</Text>
                  </View>
                  <Text style={[styles.breakdownValueRed, { color: '#D97706' }]}>
                    Rs. {(activeHorizon?.breakdown?.staff_payroll_obligations_next_7d || 0).toLocaleString()}
                  </Text>
                </View>
              )}

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="cube-outline" size={14} color="#7C3AED" />
                  <Text style={styles.breakdownLabel}>ضروری اسٹاک خریداری خرچہ (Reorder Need):</Text>
                </View>
                <Text style={styles.breakdownValuePurple}>
                  Rs. {(activeHorizon?.breakdown.critical_stock_reorder_cost ?? 12000).toLocaleString()}
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="trending-up-outline" size={14} color="#059669" />
                  <Text style={styles.breakdownLabel}>اوسط یومیہ کیش آمدن (Sales + Wasooli):</Text>
                </View>
                <Text style={styles.breakdownValueGreen}>
                  +Rs. {(activeHorizon?.breakdown.expected_daily_cash_inflow ?? 3050).toLocaleString()}/دن
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <View style={styles.breakdownLabelGroup}>
                  <Ionicons name="trending-down-outline" size={14} color="#EF4444" />
                  <Text style={styles.breakdownLabel}>اوسط یومیہ اخراجات (Dukan OPEX):</Text>
                </View>
                <Text style={styles.breakdownValueRed}>
                  -Rs. {(activeHorizon?.breakdown.expected_daily_burn_rate ?? 950).toLocaleString()}/دن
                </Text>
              </View>
            </View>

            {/* 4. Multi-Path Simulation Comparison */}
            <Text style={styles.sectionHeader}>Jev 30-Day Forward Simulation Paths:</Text>
            <View style={styles.simRow}>
              <View style={styles.simCard}>
                <Text style={styles.simTitle}>Conservative</Text>
                <Text style={styles.simDays}>
                  {activeHorizon?.breakdown.simulation_paths.conservative_runway_days ?? 9} Din
                </Text>
                <Text style={styles.simSub}>Low sales & slow wasooli</Text>
              </View>

              <View style={[styles.simCard, styles.simCardActive]}>
                <Text style={[styles.simTitle, { color: '#0284C7' }]}>Expected (Base)</Text>
                <Text style={[styles.simDays, { color: '#0284C7' }]}>
                  {activeHorizon?.breakdown.simulation_paths.expected_runway_days ?? 16} Din
                </Text>
                <Text style={styles.simSub}>Mean sales & terms</Text>
              </View>

              <View style={styles.simCard}>
                <Text style={[styles.simTitle, { color: '#DC2626' }]}>Pessimistic</Text>
                <Text style={[styles.simDays, { color: '#DC2626' }]}>
                  {activeHorizon?.breakdown.simulation_paths.pessimistic_runway_days ?? 4} Din
                </Text>
                <Text style={styles.simSub}>Emergency restock + 0 wasooli</Text>
              </View>
            </View>

            {/* 5. RECOVERY RADAR (گاہک وصولی ریڈار - 1-Tap WhatsApp Taqaza) */}
            <View style={styles.recoverySectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeader}>
                  وصولی ریڈار (Recovery Radar - 1-Tap Taqaza):
                </Text>
                <Text style={styles.recoverySubText}>
                  رن وے بڑھانے کے لیے ان گاہکوں سے فوری ادھار وصول کریں:
                </Text>
              </View>
              <View style={styles.radarPill}>
                <Ionicons name="radio-outline" size={12} color="#0284C7" />
                <Text style={styles.radarPillText}>AI Ranked</Text>
              </View>
            </View>

            {activeHorizon?.urgent_recovery_customers &&
            activeHorizon.urgent_recovery_customers.length > 0 ? (
              activeHorizon.urgent_recovery_customers.map((cust) => (
                <View key={cust.customerId} style={styles.debtorCard}>
                  <View style={styles.debtorInfoCol}>
                    <Text style={styles.debtorName}>{cust.name}</Text>
                    <Text style={styles.debtorSub}>
                      واجب الادا: <Text style={styles.debtorAmount}>Rs. {cust.owedAmount.toLocaleString()}</Text> • تاخیر: {cust.lagDays} دن
                    </Text>
                  </View>

                  <View style={styles.debtorActionRow}>
                    <TouchableOpacity
                      style={styles.whatsappBtn}
                      onPress={() => handleWhatsAppTaqaza(cust)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                      <Text style={styles.whatsappBtnText}>تقاضا</Text>
                    </TouchableOpacity>

                    {onOpenWasooli && (
                      <TouchableOpacity
                        style={styles.wasoolBtn}
                        onPress={() => {
                          onClose();
                          onOpenWasooli(cust.customerId, cust.name);
                        }}
                      >
                        <Ionicons name="checkmark-done" size={14} color="#047857" />
                        <Text style={styles.wasoolBtnText}>وصول</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyDebtorsBox}>
                <Ionicons name="checkmark-circle-outline" size={24} color="#059669" />
                <Text style={styles.emptyDebtorsText}>
                  تمام گاہک ادھار کی حد کے اندر ہیں اور واجبات قابو میں ہیں۔
                </Text>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
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
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scopeSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  scopeSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    minHeight: 44,
  },
  scopeSelectorBtnActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  scopeSelectorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  scopeSelectorBtnTextActive: {
    color: '#065F46',
    fontWeight: '800',
  },
  totalLiquidHighlightRow: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroRunwayCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  heroValueNumber: {
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
  },
  heroValueUnit: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroMessageUrdu: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
    marginBottom: 4,
  },
  heroMessageEn: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  hazardCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  hazardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  hazardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  hazardPercentVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  hazardSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 15,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 4,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  breakdownValueGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  breakdownValueBlue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  breakdownValueRed: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  breakdownValuePurple: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7C3AED',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
  },
  simRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  simCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  simCardActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  simTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  simDays: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  simSub: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
  },
  recoverySectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recoverySubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  radarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  radarPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  debtorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  debtorInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  debtorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  debtorSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  debtorAmount: {
    fontWeight: '800',
    color: '#DC2626',
  },
  debtorActionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  whatsappBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wasoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  wasoolBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  emptyDebtorsBox: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  emptyDebtorsText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'center',
  },
});
