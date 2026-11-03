import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  domesticRunwayApi,
  IJevRunwayTrajectory,
  IDomesticObligationItem,
  IWhatIfExpenseSimulationResult,
} from '../api/domesticRunway.api';

export interface DomesticKitchenRunwayModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenJevGuardian?: () => void;
}

export const DomesticKitchenRunwayModal: React.FC<DomesticKitchenRunwayModalProps> = ({
  visible,
  onClose,
  onOpenJevGuardian,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<'RADAR' | 'CALENDAR' | 'SIMULATOR'>('RADAR');
  const [loading, setLoading] = useState(false);
  const [trajectory, setTrajectory] = useState<IJevRunwayTrajectory | null>(null);

  // What-If Simulator state
  const [proposedExpenseInput, setProposedExpenseInput] = useState<string>('5000');
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<IWhatIfExpenseSimulationResult | null>(null);

  const loadRunwayData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await domesticRunwayApi.getRunwayStatus();
      setTrajectory(data);
    } catch (err: any) {
      console.error('[DomesticKitchenRunway] Failed to load runway data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadRunwayData();
      setSimulationResult(null);
    }
  }, [visible, loadRunwayData]);

  const handleRunSimulation = async (customAmt?: number) => {
    const amountToTest = customAmt !== undefined ? customAmt : parseFloat(proposedExpenseInput);
    if (isNaN(amountToTest) || amountToTest <= 0) return;

    try {
      setSimulating(true);
      const res = await domesticRunwayApi.simulateExpenseImpact(amountToTest);
      setSimulationResult(res);
    } catch (err: any) {
      console.error('[DomesticKitchenRunway] Simulation failed:', err);
    } finally {
      setSimulating(false);
    }
  };

  const getHealthBadgeStyle = (state?: string) => {
    switch (state) {
      case 'SAFE':
        return { bg: 'rgba(0, 212, 159, 0.12)', border: '#00d49f', text: '#00d49f' };
      case 'CAUTION':
        return { bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B', text: '#F59E0B' };
      case 'DEFICIT_CLIFF':
      default:
        return { bg: 'rgba(239, 68, 68, 0.12)', border: '#EF4444', text: '#EF4444' };
    }
  };

  const getObligationIcon = (sourceModule: string) => {
    switch (sourceModule) {
      case 'STAFF':
        return 'people-outline';
      case 'SCHOOL_FEE':
        return 'school-outline';
      case 'UTILITY':
        return 'flash-outline';
      case 'KAMETI':
        return 'sync-outline';
      case 'PERISHABLES':
      default:
        return 'basket-outline';
    }
  };

  const healthTheme = getHealthBadgeStyle(trajectory?.healthState);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Ionicons name="speedometer-outline" size={22} color="#00d49f" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.modalHeadingUrdu}>30-Day کچن رن وے اور خسارہ ریڈار</Text>
                <Text style={styles.modalHeadingEn}>Kitchen Runway & Deficit Radar</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'RADAR' && styles.tabItemActive]}
              onPress={() => setActiveTab('RADAR')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="airplane-outline"
                size={16}
                color={activeTab === 'RADAR' ? '#00d49f' : '#64748B'}
              />
              <Text style={[styles.tabLabel, activeTab === 'RADAR' && styles.tabLabelActive]}>
                رن وے ریڈار
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'CALENDAR' && styles.tabItemActive]}
              onPress={() => setActiveTab('CALENDAR')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={activeTab === 'CALENDAR' ? '#00d49f' : '#64748B'}
              />
              <Text style={[styles.tabLabel, activeTab === 'CALENDAR' && styles.tabLabelActive]}>
                واجبات کیلنڈر
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'SIMULATOR' && styles.tabItemActive]}
              onPress={() => setActiveTab('SIMULATOR')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calculator-outline"
                size={16}
                color={activeTab === 'SIMULATOR' ? '#00d49f' : '#64748B'}
              />
              <Text style={[styles.tabLabel, activeTab === 'SIMULATOR' && styles.tabLabelActive]}>
                خرچ سمیلیٹر
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16 }}>
            {loading ? (
              <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color="#00d49f" />
                <Text style={styles.loadingText}>گھریلو کیش رن وے اور واجبات کا تجزیہ جاری ہے...</Text>
              </View>
            ) : !trajectory ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="alert-circle-outline" size={40} color="#F59E0B" />
                <Text style={styles.emptyText}>رن وے کا ڈیٹا موصول نہیں ہو سکا۔</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={loadRunwayData}>
                  <Text style={styles.retryBtnText}>دوبارہ لوڈ کریں</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* TAB 1: RUNWAY RADAR & SIMULATIONS */}
                {activeTab === 'RADAR' && (
                  <View>
                    {/* Primary Runway Hero Card */}
                    <View
                      style={[
                        styles.heroCard,
                        { borderColor: healthTheme.border, backgroundColor: '#091322' },
                      ]}
                    >
                      <View style={styles.heroTopRow}>
                        <View
                          style={[
                            styles.healthPill,
                            { backgroundColor: healthTheme.bg, borderColor: healthTheme.border },
                          ]}
                        >
                          <Ionicons
                            name={
                              trajectory.healthState === 'SAFE'
                                ? 'shield-checkmark-outline'
                                : trajectory.healthState === 'CAUTION'
                                ? 'warning-outline'
                                : 'alert-circle-outline'
                            }
                            size={16}
                            color={healthTheme.text}
                          />
                          <Text style={[styles.healthPillText, { color: healthTheme.text }]}>
                            {trajectory.runwayBadgeUrdu}
                          </Text>
                        </View>
                        <Text style={styles.nextSalaryDateText}>
                          اگلی تنخواہ: {trajectory.nextSalaryDate} ({trajectory.daysToNextSalary} دن باقی)
                        </Text>
                      </View>

                      {/* Big Days Counter */}
                      <View style={styles.runwayCounterRow}>
                        <View style={{ alignItems: 'flex-start' }}>
                          <Text style={styles.metricSubUrdu}>محفوظ کیش رن وے</Text>
                          <Text style={styles.runwayBigNumber}>
                            {trajectory.runwayDaysCalculated}{' '}
                            <Text style={styles.runwayBigUnit}>دن</Text>
                          </Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={{ alignItems: 'flex-start' }}>
                          <Text style={styles.metricSubUrdu}>یومیہ محفوظ حد</Text>
                          <Text style={[styles.runwayBigNumber, { color: '#00d49f' }]}>
                            Rs. {trajectory.safeDailyLimit.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Visual Runway Days Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBarBg}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${Math.min(
                                  100,
                                  (trajectory.runwayDaysCalculated /
                                    Math.max(1, trajectory.daysToNextSalary)) *
                                    100
                                )}%`,
                                backgroundColor: healthTheme.border,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.progressLabelRow}>
                          <Text style={styles.progressLabel}>
                            رن وے کوریج: {trajectory.runwayDaysCalculated} دن / ضرورت {trajectory.daysToNextSalary} دن
                          </Text>
                          <Text style={[styles.progressLabel, { color: healthTheme.text }]}>
                            {Math.round(
                              (trajectory.runwayDaysCalculated /
                                Math.max(1, trajectory.daysToNextSalary)) *
                                100
                            )}
                            %
                          </Text>
                        </View>
                      </View>

                      {/* Urdu AI Guidance Banner */}
                      <View style={styles.guidanceBox}>
                        <Ionicons name="sparkles" size={18} color="#38BDF8" style={{ marginTop: 2 }} />
                        <Text style={styles.guidanceText}>
                          {trajectory.safeDailyLimitGuidanceUrdu}
                        </Text>
                      </View>
                    </View>

                    {/* Capital Breakdown Grid */}
                    <Text style={styles.sectionHeading}>گھریلو سرمائے اور واجبات کی تقسیم:</Text>
                    <View style={styles.gridRow}>
                      <View style={styles.gridCard}>
                        <Text style={styles.gridLabel}>کل دستیاب نقد و بینک</Text>
                        <Text style={styles.gridValue}>
                          Rs. {trajectory.totalLiquidCapital.toLocaleString()}
                        </Text>
                        <Text style={styles.gridSub}>دراز و بینک کھاتے</Text>
                      </View>
                      <View style={styles.gridCard}>
                        <Text style={styles.gridLabel}>محفوظ ایمرجنسی سنکنگ</Text>
                        <Text style={[styles.gridValue, { color: '#38BDF8' }]}>
                          Rs. {trajectory.totalLockedSinkingFunds.toLocaleString()}
                        </Text>
                        <Text style={styles.gridSub}>مرمت و طبی ریزرو</Text>
                      </View>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={styles.gridCard}>
                        <Text style={styles.gridLabel}>غیر ادا شدہ واجبات</Text>
                        <Text style={[styles.gridValue, { color: '#EF4444' }]}>
                          Rs. {trajectory.totalCommittedPending.toLocaleString()}
                        </Text>
                        <Text style={styles.gridSub}>تنخواہ، بلز، فیس، بی سی</Text>
                      </View>
                      <View style={styles.gridCard}>
                        <Text style={styles.gridLabel}>بقیہ ایام کا منڈی راشن</Text>
                        <Text style={[styles.gridValue, { color: '#F59E0B' }]}>
                          Rs. {trajectory.proRatedPerishablesNeeded.toLocaleString()}
                        </Text>
                        <Text style={styles.gridSub}>دودھ، سبزی و گوشت</Text>
                      </View>
                    </View>

                    <View style={styles.freeCapitalBanner}>
                      <View>
                        <Text style={styles.freeCapitalLabel}>خالص آزاد رقم (Net Discretionary):</Text>
                        <Text
                          style={[
                            styles.freeCapitalValue,
                            trajectory.netFreeDiscretionaryCapital < 0 && { color: '#EF4444' },
                          ]}
                        >
                          Rs. {trajectory.netFreeDiscretionaryCapital.toLocaleString()}
                        </Text>
                      </View>
                      {trajectory.projectedMonthEndSurplus >= 0 ? (
                        <View style={styles.surplusBadge}>
                          <Ionicons name="trending-up-outline" size={14} color="#00d49f" />
                          <Text style={styles.surplusBadgeText}>
                            ماہ کے اختتام پر بچت متوقع
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.surplusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                          <Ionicons name="trending-down-outline" size={14} color="#EF4444" />
                          <Text style={[styles.surplusBadgeText, { color: '#EF4444' }]}>
                            خسارہ متوقع
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* 3-Path Simulations Section */}
                    <Text style={styles.sectionHeading}>تین متبادل معاشی راستے (3-Path Scenarios):</Text>
                    {trajectory.simulations.map((sim, index) => (
                      <View
                        key={index}
                        style={[
                          styles.simulationCard,
                          sim.scenarioKey === 'REALISTIC' && styles.simCardRealistic,
                          sim.scenarioKey === 'FRUGAL' && styles.simCardFrugal,
                          sim.scenarioKey === 'STRESSED' && styles.simCardStressed,
                        ]}
                      >
                        <View style={styles.simHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons
                              name={
                                sim.scenarioKey === 'REALISTIC'
                                  ? 'speedometer-outline'
                                  : sim.scenarioKey === 'FRUGAL'
                                  ? 'shield-checkmark-outline'
                                  : 'warning-outline'
                              }
                              size={18}
                              color={
                                sim.scenarioKey === 'REALISTIC'
                                  ? '#38BDF8'
                                  : sim.scenarioKey === 'FRUGAL'
                                  ? '#00d49f'
                                  : '#EF4444'
                              }
                            />
                            <Text style={styles.simTitleUrdu}>{sim.nameUrdu}</Text>
                          </View>
                          <Text
                            style={[
                              styles.simRunwayBadge,
                              sim.scenarioKey === 'FRUGAL' && { color: '#00d49f' },
                              sim.scenarioKey === 'STRESSED' && { color: '#EF4444' },
                            ]}
                          >
                            ⏳ {sim.estimatedRunwayDays} دن رن وے
                          </Text>
                        </View>

                        <Text style={styles.simDescUrdu}>{sim.descriptionUrdu}</Text>

                        <View style={styles.simFooterRow}>
                          <Text style={styles.simFooterLabel}>
                            یومیہ خرچ: Rs. {sim.adjustedDailySpend.toLocaleString()}
                          </Text>
                          <Text
                            style={[
                              styles.simFooterLabel,
                              sim.monthEndSurplusOrDeficit >= 0
                                ? { color: '#00d49f' }
                                : { color: '#EF4444' },
                            ]}
                          >
                            {sim.surplusDeficitLabelUrdu}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* AI Advice Bullets */}
                    {trajectory.aiAdviceBulletsUrdu.length > 0 && (
                      <View style={styles.aiBulletsCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
                          <Text style={styles.aiBulletsTitle}>گھریلو کفایت شعاری و مشورے:</Text>
                        </View>
                        {trajectory.aiAdviceBulletsUrdu.map((bullet, bIdx) => (
                          <View key={bIdx} style={styles.bulletItemRow}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* TAB 2: COMMITTED OBLIGATIONS CALENDAR */}
                {activeTab === 'CALENDAR' && (
                  <View>
                    <View style={styles.calendarBanner}>
                      <View>
                        <Text style={styles.calendarBannerTitle}>
                          غیر ادا شدہ واجبات کا مجموعہ
                        </Text>
                        <Text style={styles.calendarBannerAmt}>
                          Rs. {trajectory.totalCommittedPending.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.pendingCountPill}>
                        <Text style={styles.pendingCountText}>
                          {trajectory.upcomingObligations.filter((o) => !o.isPaidThisCycle).length} واجبات باقی
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.sectionHeading}>
                      ماہانہ نان نیگوشئیبل شیڈول (Committed Radar):
                    </Text>

                    {trajectory.upcomingObligations.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.obligationCard,
                          item.isPaidThisCycle && styles.obligationPaidCard,
                        ]}
                      >
                        <View style={styles.obligationLeft}>
                          <View
                            style={[
                              styles.obligationIconCircle,
                              item.isPaidThisCycle
                                ? { backgroundColor: 'rgba(0, 212, 159, 0.15)' }
                                : { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
                            ]}
                          >
                            <Ionicons
                              name={getObligationIcon(item.sourceModule) as any}
                              size={18}
                              color={item.isPaidThisCycle ? '#00d49f' : '#EF4444'}
                            />
                          </View>
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={styles.obligationTitleUrdu}>{item.titleUrdu}</Text>
                            <Text style={styles.obligationDueDate}>
                              مقررہ تاریخ: ماہ کی {item.dueDayOfMonth} تاریخ
                            </Text>
                          </View>
                        </View>

                        <View style={styles.obligationRight}>
                          <Text
                            style={[
                              styles.obligationAmt,
                              item.isPaidThisCycle && { color: '#64748B' },
                            ]}
                          >
                            Rs. {item.estimatedAmount.toLocaleString()}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              item.isPaidThisCycle
                                ? styles.statusBadgePaid
                                : styles.statusBadgePending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                item.isPaidThisCycle
                                  ? { color: '#00d49f' }
                                  : { color: '#EF4444' },
                              ]}
                            >
                              {item.isPaidThisCycle ? '✓ ادا شدہ' : '⏳ غیر ادا شدہ'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* TAB 3: WHAT-IF EXPENSE SIMULATOR */}
                {activeTab === 'SIMULATOR' && (
                  <View>
                    <View style={styles.simIntroCard}>
                      <Ionicons name="analytics-outline" size={24} color="#38BDF8" />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.simIntroHeading}>
                          غیر متوقع خرچ کا اثر ٹیسٹ کریں (What-If Tester)
                        </Text>
                        <Text style={styles.simIntroSub}>
                          کوئی بھی نیا یا اضافی خرچ کرنے سے پہلے دیکھیں کہ اس سے آپ کی یومیہ حد اور رن وے پر کیا اثر پڑے گا۔
                        </Text>
                      </View>
                    </View>

                    {/* Quick Amount Suggestion Buttons */}
                    <Text style={styles.fieldLabel}>تجویز کردہ خرچ کی رقم (روپے):</Text>
                    <View style={styles.quickAmtRow}>
                      {[2000, 5000, 10000, 20000, 35000].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={[
                            styles.quickAmtBtn,
                            proposedExpenseInput === amt.toString() && styles.quickAmtBtnActive,
                          ]}
                          onPress={() => {
                            setProposedExpenseInput(amt.toString());
                            handleRunSimulation(amt);
                          }}
                        >
                          <Text
                            style={[
                              styles.quickAmtText,
                              proposedExpenseInput === amt.toString() && styles.quickAmtTextActive,
                            ]}
                          >
                            Rs. {amt >= 1000 ? `${amt / 1000}k` : amt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Custom Input & Action Button */}
                    <View style={styles.inputActionRow}>
                      <TextInput
                        style={styles.amountInput}
                        keyboardType="numeric"
                        value={proposedExpenseInput}
                        onChangeText={(t) => setProposedExpenseInput(t)}
                        placeholder="رقم درج کریں (مثلاً 7500)"
                        placeholderTextColor="#64748B"
                      />
                      <TouchableOpacity
                        style={styles.simulateBtn}
                        onPress={() => handleRunSimulation()}
                        disabled={simulating}
                        activeOpacity={0.8}
                      >
                        {simulating ? (
                          <ActivityIndicator size="small" color="#070d18" />
                        ) : (
                          <>
                            <Ionicons name="play" size={16} color="#070d18" />
                            <Text style={styles.simulateBtnText}>اثر دیکھیں</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Simulation Result Presentation */}
                    {simulationResult && (
                      <View style={styles.simResultCard}>
                        {/* Result Verdict Header */}
                        <View
                          style={[
                            styles.verdictBanner,
                            simulationResult.causesDeficit
                              ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }
                              : { backgroundColor: 'rgba(0, 212, 159, 0.15)', borderColor: '#00d49f' },
                          ]}
                        >
                          <Ionicons
                            name={
                              simulationResult.causesDeficit
                                ? 'close-circle-outline'
                                : 'checkmark-circle-outline'
                            }
                            size={22}
                            color={simulationResult.causesDeficit ? '#EF4444' : '#00d49f'}
                          />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text
                              style={[
                                styles.verdictTitle,
                                {
                                  color: simulationResult.causesDeficit ? '#EF4444' : '#00d49f',
                                },
                              ]}
                            >
                              {simulationResult.verdictUrdu}
                            </Text>
                            <Text style={styles.verdictSub}>{simulationResult.verdictEn}</Text>
                          </View>
                        </View>

                        {/* Comparative Metrics Deck */}
                        <View style={styles.comparisonTable}>
                          <View style={styles.compRowHeader}>
                            <Text style={styles.compHeadCell}>پیمانہ (Metric)</Text>
                            <Text style={styles.compHeadCell}>پہلے</Text>
                            <Text style={styles.compHeadCell}>خرچ کے بعد</Text>
                          </View>

                          <View style={styles.compRow}>
                            <Text style={styles.compMetricCell}>آزاد گھریلو گنجائش</Text>
                            <Text style={styles.compOldCell}>
                              Rs. {simulationResult.netFreeCapitalBefore.toLocaleString()}
                            </Text>
                            <Text
                              style={[
                                styles.compNewCell,
                                simulationResult.netFreeCapitalAfter < 0 && { color: '#EF4444' },
                              ]}
                            >
                              Rs. {simulationResult.netFreeCapitalAfter.toLocaleString()}
                            </Text>
                          </View>

                          <View style={styles.compRow}>
                            <Text style={styles.compMetricCell}>یومیہ محفوظ خرچ کی حد</Text>
                            <Text style={styles.compOldCell}>
                              Rs. {simulationResult.safeDailyLimitBefore.toLocaleString()}
                            </Text>
                            <Text
                              style={[
                                styles.compNewCell,
                                { color: simulationResult.causesDeficit ? '#EF4444' : '#00d49f' },
                              ]}
                            >
                              Rs. {simulationResult.safeDailyLimitAfter.toLocaleString()}
                            </Text>
                          </View>

                          <View style={styles.compRow}>
                            <Text style={styles.compMetricCell}>کیش رن وے کے ایام</Text>
                            <Text style={styles.compOldCell}>
                              {simulationResult.runwayDaysBefore} دن
                            </Text>
                            <Text
                              style={[
                                styles.compNewCell,
                                { color: simulationResult.causesDeficit ? '#EF4444' : '#38BDF8' },
                              ]}
                            >
                              {simulationResult.runwayDaysAfter} دن (
                              {simulationResult.deltaDays > 0 ? `-${simulationResult.deltaDays} دن` : 'کوئی کمی نہیں'}
                              )
                            </Text>
                          </View>
                        </View>

                        {/* Actionable Advice Box */}
                        <View style={styles.recommendationBox}>
                          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#F59E0B" />
                          <Text style={styles.recommendationText}>
                            {simulationResult.recommendationUrdu}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </>
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
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#070d18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#17233b',
    maxHeight: '92%',
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
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.25)',
  },
  modalHeadingUrdu: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  modalHeadingEn: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#0d1627',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0d1627',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#111d33',
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: '#00d49f',
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#00d49f',
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
  },
  loaderWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#00d49f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#070d18',
    fontWeight: '700',
    fontSize: 13,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  healthPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  nextSalaryDateText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  runwayCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  metricSubUrdu: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
  },
  runwayBigNumber: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
  },
  runwayBigUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1e293b',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#111d33',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 8,
  },
  guidanceText: {
    color: '#BAE6FD',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    textAlign: 'left',
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 10,
    textAlign: 'left',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 12,
    padding: 12,
  },
  gridLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  gridValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  gridSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  freeCapitalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#101d32',
    borderWidth: 1,
    borderColor: '#1e2e4a',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  freeCapitalLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  freeCapitalValue: {
    color: '#00d49f',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  surplusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  surplusBadgeText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '600',
  },
  simulationCard: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  simCardRealistic: {
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  simCardFrugal: {
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  simCardStressed: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  simHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  simTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  simRunwayBadge: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  simDescUrdu: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    textAlign: 'left',
  },
  simFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 8,
    marginTop: 8,
  },
  simFooterLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  aiBulletsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 20,
  },
  aiBulletsTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: 6,
  },
  bulletDot: {
    color: '#F59E0B',
    fontSize: 14,
    lineHeight: 18,
  },
  bulletText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    textAlign: 'left',
  },
  // Calendar Styles
  calendarBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  calendarBannerTitle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  calendarBannerAmt: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  pendingCountPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pendingCountText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  obligationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  obligationPaidCard: {
    opacity: 0.7,
    borderColor: 'rgba(0, 212, 159, 0.2)',
  },
  obligationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  obligationIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obligationTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'left',
  },
  obligationDueDate: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'left',
  },
  obligationRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  obligationAmt: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  statusBadgePaid: {
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Simulator Styles
  simIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  simIntroHeading: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  simIntroSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    textAlign: 'left',
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'left',
  },
  quickAmtRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  quickAmtBtn: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickAmtBtnActive: {
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
  },
  quickAmtText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  quickAmtTextActive: {
    color: '#00d49f',
  },
  inputActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  simulateBtn: {
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  simulateBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: '700',
  },
  simResultCard: {
    backgroundColor: '#091322',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  verdictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  verdictTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  verdictSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  comparisonTable: {
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 10,
  },
  compRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compHeadCell: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#101d32',
  },
  compMetricCell: {
    color: '#CBD5E1',
    fontSize: 12,
    flex: 1.2,
    textAlign: 'left',
  },
  compOldCell: {
    color: '#94A3B8',
    fontSize: 12,
    flex: 0.9,
    textAlign: 'left',
  },
  compNewCell: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  recommendationText: {
    color: '#FDE68A',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    textAlign: 'left',
  },
});
export default DomesticKitchenRunwayModal;
