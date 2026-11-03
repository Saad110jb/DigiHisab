import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  schoolFeeApi,
  ISchoolFeeRecord,
  ISchoolFeeAnalytics,
  EducationLevel,
  FeeFrequency,
  PaymentMode,
  CreateSchoolFeePayload,
} from '../api/schoolFee.api';

interface SchoolFeeTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

type TabFilter = 'ALL' | 'UNPAID' | 'DUE_SOON' | 'PAID';

const PAKISTANI_INSTITUTION_PRESETS = [
  { name: 'Army Public School (APS Cantt)', level: 'SCHOOL' as EducationLevel },
  { name: 'The City School (سٹی اسکول)', level: 'SCHOOL' as EducationLevel },
  { name: 'Beaconhouse School System', level: 'SCHOOL' as EducationLevel },
  { name: 'Lahore Grammar School (LGS)', level: 'SCHOOL' as EducationLevel },
  { name: 'Divisional Public School (DPS)', level: 'SCHOOL' as EducationLevel },
  { name: 'FAST-NUCES لاہور', level: 'UNIVERSITY' as EducationLevel },
  { name: 'NUST اسلام آباد', level: 'UNIVERSITY' as EducationLevel },
  { name: 'KIPS اکیڈمی (شام کوچنگ)', level: 'ACADEMY' as EducationLevel },
  { name: 'Stars اکیڈمی', level: 'ACADEMY' as EducationLevel },
];

export const SchoolFeeTrackerModal: React.FC<SchoolFeeTrackerModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [fees, setFees] = useState<ISchoolFeeRecord[]>([]);
  const [analytics, setAnalytics] = useState<ISchoolFeeAnalytics | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('ALL');

  // Mark Paid State
  const [selectedFeeForPay, setSelectedFeeForPay] = useState<ISchoolFeeRecord | null>(null);
  const [payMode, setPayMode] = useState<PaymentMode>('JAZZCASH');
  const [payVoucherNo, setPayVoucherNo] = useState<string>('');
  const [payTid, setPayTid] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [paySubmitting, setPaySubmitting] = useState<boolean>(false);

  // Add Challan State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addChildName, setAddChildName] = useState<string>('');
  const [addInstitution, setAddInstitution] = useState<string>('Army Public School (APS Cantt)');
  const [addGrade, setAddGrade] = useState<string>('');
  const [addEducationLevel, setAddEducationLevel] = useState<EducationLevel>('SCHOOL');
  const [addFrequency, setAddFrequency] = useState<FeeFrequency>('MONTHLY');
  const [addTuition, setAddTuition] = useState<string>('');
  const [addVan, setAddVan] = useState<string>('');
  const [addDriverName, setAddDriverName] = useState<string>('چاچا اسلم (اسکول وین)');
  const [addDriverPhone, setAddDriverPhone] = useState<string>('');
  const [addAcademy, setAddAcademy] = useState<string>('');
  const [addAcademyName, setAddAcademyName] = useState<string>('');
  const [addStationery, setAddStationery] = useState<string>('');
  const [addSiblingDiscount, setAddSiblingDiscount] = useState<string>('');
  const [addSurcharge, setAddSurcharge] = useState<string>('500');
  const [addDaysAhead, setAddDaysAhead] = useState<string>('7');
  const [addVoucherNo, setAddVoucherNo] = useState<string>('');
  const [addSubmitting, setAddSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [feeList, stats] = await Promise.all([
        schoolFeeApi.getFees(),
        schoolFeeApi.getAnalytics(),
      ]);
      setFees(feeList);
      setAnalytics(stats);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'فیس ڈیٹا لوڈ کرنے میں مسئلہ ہوا';
      if (onShowToast) onShowToast(msg);
      else Alert.alert('خطا', msg);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, fetchData]);

  // Unique Children list for filter
  const childrenList = useMemo(() => {
    const names = Array.from(new Set(fees.map((f) => f.childName)));
    return names;
  }, [fees]);

  // Filtered fee records
  const filteredFees = useMemo(() => {
    return fees.filter((f) => {
      if (selectedChildFilter !== 'ALL' && f.childName !== selectedChildFilter) return false;
      if (activeTab === 'UNPAID' && f.isPaid) return false;
      if (activeTab === 'PAID' && !f.isPaid) return false;
      if (activeTab === 'DUE_SOON') {
        if (f.isPaid) return false;
        if (!f.isDueSoon && !f.isOverdue) return false;
      }
      return true;
    });
  }, [fees, activeTab, selectedChildFilter]);

  // Handle Mark as Paid
  const handleConfirmPayment = async () => {
    if (!selectedFeeForPay) return;
    try {
      setPaySubmitting(true);
      const res = await schoolFeeApi.markPaid(selectedFeeForPay._id, {
        paymentMode: payMode,
        challanVoucherNo: payVoucherNo.trim() || undefined,
        bankTransactionId: payTid.trim() || undefined,
        notes: payNotes.trim() || undefined,
        recordInLedger: true,
      });

      setFees((prev) =>
        prev.map((f) => (f._id === res.feeRecord._id ? { ...f, ...res.feeRecord } : f))
      );
      setSelectedFeeForPay(null);
      setPayVoucherNo('');
      setPayTid('');
      setPayNotes('');
      if (onShowToast) {
        onShowToast(`✅ ${res.feeRecord.childName} کی فیس ادا شدہ نشان زد کر دی گئی۔`);
      }
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'ادائیگی محفوظ نہیں ہو سکی';
      Alert.alert('خطا', msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  // Send WhatsApp Van Driver Receipt
  const handleShareVanReceipt = async (feeId: string) => {
    try {
      const res = await schoolFeeApi.getVanReceipt(feeId);
      await Share.share({
        message: res.receiptText,
        title: 'School Van Driver Payment Receipt',
      });
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'وین رسید شیئر نہیں ہو سکی');
    }
  };

  // Handle Create Challan
  const handleCreateChallan = async () => {
    if (!addChildName.trim() || !addInstitution.trim() || !addGrade.trim()) {
      Alert.alert('ضروری معلومات', 'براہ کرم بچے کا نام، ادارہ اور کلاس درج کریں۔');
      return;
    }

    const tuitionNum = parseFloat(addTuition) || 0;
    const vanNum = parseFloat(addVan) || 0;
    const academyNum = parseFloat(addAcademy) || 0;
    const stationeryNum = parseFloat(addStationery) || 0;
    const discountNum = parseFloat(addSiblingDiscount) || 0;
    const surchargeNum = parseFloat(addSurcharge) || 500;

    const daysAhead = parseInt(addDaysAhead, 10) || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysAhead);

    const payload: CreateSchoolFeePayload = {
      childName: addChildName.trim(),
      childAvatarColor: '#818CF8',
      institutionName: addInstitution.trim(),
      gradeClass: addGrade.trim(),
      educationLevel: addEducationLevel,
      feeFrequency: addFrequency,
      tuitionFeeAmount: tuitionNum,
      vanTransportFeeAmount: vanNum,
      vanDriverName: addDriverName.trim() || undefined,
      vanDriverPhone: addDriverPhone.trim() || undefined,
      academyFeeAmount: academyNum,
      academyName: addAcademyName.trim() || undefined,
      stationeryUniformAmount: stationeryNum,
      siblingDiscountAmount: discountNum,
      surchargeAmount: surchargeNum,
      dueDate: dueDate.toISOString(),
      challanVoucherNo: addVoucherNo.trim() || undefined,
    };

    try {
      setAddSubmitting(true);
      await schoolFeeApi.createFee(payload);
      setShowAddModal(false);
      setAddChildName('');
      setAddGrade('');
      setAddTuition('');
      setAddVan('');
      setAddAcademy('');
      setAddStationery('');
      setAddSiblingDiscount('');
      setAddVoucherNo('');
      if (onShowToast) onShowToast('✅ اسکول فیس چالان کامیابی سے درج کر دیا گیا۔');
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'چالان شامل نہیں ہو سکا';
      Alert.alert('خطا', msg);
    } finally {
      setAddSubmitting(false);
    }
  };

  // Delete Challan
  const handleDeleteChallan = (fee: ISchoolFeeRecord) => {
    Alert.alert(
      'چالان حذف کریں',
      `کیا آپ واقعی ${fee.childName} کا ${fee.institutionName} چالان حذف کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'ہاں، حذف کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              await schoolFeeApi.deleteFee(fee._id);
              setFees((prev) => prev.filter((f) => f._id !== fee._id));
              fetchData();
              if (onShowToast) onShowToast('چالان کامیابی سے حذف کر دیا گیا۔');
            } catch (err: any) {
              Alert.alert('خطا', err.message || 'چالان حذف نہیں ہو سکا');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* ================= 1. TOP HEADER ================= */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerRow}>
              <Ionicons name="school" size={20} color="#818CF8" />
              <Text style={styles.headerTitle}>بچوں کی اسکول و اکیڈمی فیس</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              School, Van & Tuition Fee Schedule • Surcharge Radar
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addHeaderBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#070d18" />
            <Text style={styles.addHeaderBtnText}>نیا چالان</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#818CF8" />
            <Text style={styles.loadingText}>فیس شیڈول لوڈ ہو رہا ہے...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= 2. TOP METRIC DECK ================= */}
            <View style={styles.metricsContainer}>
              {/* Monthly Education Outflow */}
              <View style={[styles.metricCard, styles.metricCardPrimary]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>ماہانہ کل تعلیمی خرچ</Text>
                  <Ionicons name="school-outline" size={14} color="#818CF8" />
                </View>
                <Text style={[styles.metricVal, { color: '#818CF8' }]}>
                  Rs. {(analytics?.totalMonthlyOutflow || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>{fees.length} کل چالان و وین واجبات</Text>
              </View>

              {/* Unpaid Challans */}
              <View style={[styles.metricCard, styles.metricCardUnpaid]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>غیر ادا شدہ فیس</Text>
                  <Ionicons name="time-outline" size={14} color="#F59E0B" />
                </View>
                <Text style={[styles.metricVal, { color: '#F59E0B' }]}>
                  Rs. {(analytics?.totalUnpaid || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>{analytics?.unpaidCount || 0} چالان باقی</Text>
              </View>

              {/* Surcharge at Risk */}
              <View
                style={[
                  styles.metricCard,
                  analytics && analytics.totalSurchargeAtRisk > 0
                    ? styles.metricCardRisk
                    : styles.metricCardSafe,
                ]}
              >
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>⚠️ لیٹ فیس خطرہ</Text>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={analytics && analytics.totalSurchargeAtRisk > 0 ? '#EF4444' : '#00d49f'}
                  />
                </View>
                <Text
                  style={[
                    styles.metricVal,
                    {
                      color:
                        analytics && analytics.totalSurchargeAtRisk > 0 ? '#EF4444' : '#00d49f',
                    },
                  ]}
                >
                  Rs. {(analytics?.totalSurchargeAtRisk || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>
                  {analytics && analytics.totalSurchargeAtRisk > 0
                    ? `${analytics.dueSoonCount + analytics.overdueCount} چالان آخری تاریخ کے قریب!`
                    : 'کوئی جرمانہ خطرہ نہیں'}
                </Text>
              </View>
            </View>

            {/* ================= 3. SURCHARGE RADAR BANNER ================= */}
            {analytics && (analytics.dueSoonCount > 0 || analytics.overdueCount > 0) && (
              <View style={styles.urgencyAlertBanner}>
                <View style={styles.urgencyBannerIcon}>
                  <Ionicons name="warning" size={22} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.urgencyBannerTitle}>
                    {analytics.overdueCount > 0
                      ? `🚨 ${analytics.overdueCount} اسکول چالان کی آخری تاریخ گزر چکی ہے (لیٹ فیس لاگو)!`
                      : `⚠️ ${analytics.dueSoonCount} چالان کی آخری تاریخ میں 3 دن سے کم باقی ہیں!`}
                  </Text>
                  <Text style={styles.urgencyBannerSub}>
                    اسکول چالان اور وین فیس کی بروقت ادائیگی سے Rs.{' '}
                    {analytics.totalSurchargeAtRisk.toLocaleString()} جرمانہ بچائیں۔
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.urgencyPayNowBtn}
                  onPress={() => setActiveTab('DUE_SOON')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.urgencyPayNowText}>چیک کریں</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= 4. VISUAL TIMELINE STRIP ================= */}
            {Boolean(analytics?.timeline && analytics.timeline.length > 0) && (
              <View style={styles.timelineSection}>
                <View style={styles.timelineHeaderRow}>
                  <Ionicons name="calendar-outline" size={16} color="#818CF8" />
                  <Text style={styles.timelineHeaderTitle}>
                    فیس شیڈول ٹائم لائن (Upcoming Due Dates)
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
                  {analytics?.timeline.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.timelinePill,
                        item.isOverdue && styles.timelinePillOverdue,
                        item.isDueSoon && styles.timelinePillDueSoon,
                      ]}
                    >
                      <View style={styles.timelineDateBadge}>
                        <Text style={styles.timelineDateText}>
                          {new Date(item.dueDate).toLocaleDateString('en-PK', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.timelineChildName}>{item.childName}</Text>
                        <Text style={styles.timelineInstName}>{item.institutionName}</Text>
                        <Text style={styles.timelineAmount}>
                          Rs. {item.totalDue.toLocaleString()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.timelineUrgencyTag,
                          item.isOverdue && { backgroundColor: '#EF4444' },
                          item.isDueSoon && { backgroundColor: '#F59E0B' },
                        ]}
                      >
                        <Text style={styles.timelineUrgencyText}>
                          {item.isOverdue
                            ? 'Overdue'
                            : item.daysUntilDue === 0
                            ? 'آج'
                            : `${item.daysUntilDue} دن`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ================= 5. PER-CHILD INVESTMENT RADAR ================= */}
            {Boolean(analytics?.perChildBreakdown && analytics.perChildBreakdown.length > 0) && (
              <View style={styles.childRadarSection}>
                <View style={styles.childRadarHeaderRow}>
                  <Ionicons name="pie-chart-outline" size={16} color="#00d49f" />
                  <Text style={styles.childRadarTitle}>
                    بچہ وار تعلیمی سرمایہ کاری (Child Investment Radar)
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 10 }}>
                  {analytics?.perChildBreakdown.map((child, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.childRadarCard,
                        selectedChildFilter === child.childName && styles.childRadarCardActive,
                      ]}
                      onPress={() =>
                        setSelectedChildFilter(
                          selectedChildFilter === child.childName ? 'ALL' : child.childName
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <View style={styles.childCardTop}>
                        <View
                          style={[
                            styles.childAvatarCircle,
                            { backgroundColor: child.avatarColor + '30' },
                          ]}
                        >
                          <Text style={[styles.childAvatarLetter, { color: child.avatarColor }]}>
                            {child.childName.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.childCardName}>{child.childName}</Text>
                          <Text style={styles.childCardGrade}>{child.gradeClass}</Text>
                        </View>
                      </View>

                      <View style={styles.childTotalInvestBox}>
                        <Text style={styles.childTotalInvestLabel}>کل ماہانہ سرمایہ کاری</Text>
                        <Text style={styles.childTotalInvestVal}>
                          Rs. {child.totalInvestment.toLocaleString()}
                        </Text>
                      </View>

                      {/* Micro Breakdown Pills */}
                      <View style={styles.microPillsWrap}>
                        {child.tuition > 0 && (
                          <View style={styles.microPill}>
                            <Text style={styles.microPillText}>
                              🏫 ٹیوشن: Rs. {child.tuition.toLocaleString()}
                            </Text>
                          </View>
                        )}
                        {child.van > 0 && (
                          <View style={[styles.microPill, { borderColor: '#38BDF8' }]}>
                            <Text style={[styles.microPillText, { color: '#38BDF8' }]}>
                              🚐 وین: Rs. {child.van.toLocaleString()}
                            </Text>
                          </View>
                        )}
                        {child.academy > 0 && (
                          <View style={[styles.microPill, { borderColor: '#C084FC' }]}>
                            <Text style={[styles.microPillText, { color: '#C084FC' }]}>
                              📚 اکیڈمی: Rs. {child.academy.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ================= 6. STATUS TABS ================= */}
            <View style={styles.filterTabsRow}>
              {(
                [
                  { key: 'ALL', label: `سبھی (${fees.length})` },
                  { key: 'UNPAID', label: `غیر ادا (${analytics?.unpaidCount || 0})` },
                  {
                    key: 'DUE_SOON',
                    label: `🚨 جلد واجب (${(analytics?.dueSoonCount || 0) + (analytics?.overdueCount || 0)})`,
                  },
                  { key: 'PAID', label: `✅ رسیدیں (${analytics?.paidCount || 0})` },
                ] as const
              ).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.filterTab, activeTab === tab.key && styles.filterTabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      activeTab === tab.key && styles.filterTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ================= 7. CHILD CHIPS ROW ================= */}
            {childrenList.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.childChipsContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.childChip,
                    selectedChildFilter === 'ALL' && styles.childChipActive,
                  ]}
                  onPress={() => setSelectedChildFilter('ALL')}
                >
                  <Text
                    style={[
                      styles.childChipText,
                      selectedChildFilter === 'ALL' && styles.childChipTextActive,
                    ]}
                  >
                    تمام بچے
                  </Text>
                </TouchableOpacity>
                {childrenList.map((cName, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.childChip,
                      selectedChildFilter === cName && styles.childChipActive,
                    ]}
                    onPress={() => setSelectedChildFilter(cName)}
                  >
                    <Text
                      style={[
                        styles.childChipText,
                        selectedChildFilter === cName && styles.childChipTextActive,
                      ]}
                    >
                      {cName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* ================= 8. CHALLAN CARDS LIST ================= */}
            {filteredFees.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="school-outline" size={42} color="#64748B" />
                <Text style={styles.emptyTitle}>کوئی فیس چالان موجود نہیں</Text>
                <Text style={styles.emptySub}>
                  اوپر دیئے گئے "+ نیا چالان" بٹن پر کلک کر کے بچے کا اسکول یا کالج چالان شامل کریں۔
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.emptyActionBtnText}>➕ نیا چالان شامل کریں</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.feesList}>
                {filteredFees.map((fee) => {
                  const isPaid = fee.isPaid;
                  const isOverdue = !isPaid && fee.daysUntilDue < 0;
                  const isDueTomorrow = !isPaid && fee.daysUntilDue === 1;
                  const isDueToday = !isPaid && fee.daysUntilDue === 0;
                  const isUrgent = !isPaid && fee.daysUntilDue <= 3;

                  return (
                    <View
                      key={fee._id}
                      style={[
                        styles.feeCard,
                        isOverdue && styles.feeCardOverdue,
                        (isDueTomorrow || isDueToday) && styles.feeCardDueTomorrow,
                        isPaid && styles.feeCardPaid,
                      ]}
                    >
                      {/* Top Header of Fee Card */}
                      <View style={styles.feeCardHeader}>
                        <View style={styles.childIdentityRow}>
                          <View
                            style={[
                              styles.avatarCircle,
                              { backgroundColor: (fee.childAvatarColor || '#818CF8') + '30' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.avatarInitial,
                                { color: fee.childAvatarColor || '#818CF8' },
                              ]}
                            >
                              {fee.childName.charAt(0)}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.childTitleName}>{fee.childName}</Text>
                            <Text style={styles.institutionSubtitle}>
                              {fee.institutionName} • {fee.gradeClass}
                            </Text>
                          </View>
                        </View>

                        {/* Urgency Badge */}
                        <View
                          style={[
                            styles.urgencyBadge,
                            isPaid && styles.urgencyBadgePaid,
                            isOverdue && styles.urgencyBadgeOverdue,
                            (isDueTomorrow || isDueToday) && styles.urgencyBadgeDueTomorrow,
                            !isPaid &&
                              !isOverdue &&
                              !isDueTomorrow &&
                              !isDueToday &&
                              isUrgent &&
                              styles.urgencyBadgeUrgent,
                          ]}
                        >
                          <Ionicons
                            name={
                              isPaid
                                ? 'shield-checkmark'
                                : isOverdue
                                ? 'close-circle'
                                : isDueToday
                                ? 'time'
                                : isDueTomorrow
                                ? 'alert-circle'
                                : 'calendar-outline'
                            }
                            size={12}
                            color={
                              isPaid
                                ? '#00d49f'
                                : isOverdue || isDueTomorrow || isDueToday
                                ? '#EF4444'
                                : isUrgent
                                ? '#F59E0B'
                                : '#94A3B8'
                            }
                          />
                          <Text
                            style={[
                              styles.urgencyBadgeText,
                              isPaid && { color: '#00d49f' },
                              (isOverdue || isDueTomorrow || isDueToday) && { color: '#EF4444' },
                              !isPaid &&
                                !isOverdue &&
                                !isDueTomorrow &&
                                !isDueToday &&
                                isUrgent && { color: '#F59E0B' },
                            ]}
                          >
                            {isPaid
                              ? 'ادا شدہ'
                              : isOverdue
                              ? `میعاد ختم (${Math.abs(fee.daysUntilDue)} دن زائد)`
                              : isDueToday
                              ? '🚨 آج آخری تاریخ ہے!'
                              : isDueTomorrow
                              ? '🚨 کل آخری تاریخ ہے!'
                              : `${fee.daysUntilDue} دن باقی`}
                          </Text>
                        </View>
                      </View>

                      {/* Meta Info Row */}
                      <View style={styles.feeMetaRow}>
                        <View style={styles.feeMetaCol}>
                          <Text style={styles.feeMetaLabel}>ماہ / ٹرم</Text>
                          <Text style={styles.feeMetaVal}>{fee.termOrMonth}</Text>
                        </View>
                        <View style={styles.feeMetaCol}>
                          <Text style={styles.feeMetaLabel}>آخری تاریخ</Text>
                          <Text style={styles.feeMetaVal}>
                            {new Date(fee.dueDate).toLocaleDateString('en-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                        {Boolean(fee.challanVoucherNo) && (
                          <View style={styles.feeMetaCol}>
                            <Text style={styles.feeMetaLabel}>چالان نمبر</Text>
                            <Text style={styles.feeMetaVal}>{fee.challanVoucherNo}</Text>
                          </View>
                        )}
                      </View>

                      {/* Itemized Fee Breakdown Pill Strip */}
                      <View style={styles.breakdownStrip}>
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>ٹیوشن فیس</Text>
                          <Text style={styles.breakdownVal}>
                            Rs. {fee.tuitionFeeAmount.toLocaleString()}
                          </Text>
                        </View>
                        {fee.vanTransportFeeAmount > 0 && (
                          <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownLabel, { color: '#38BDF8' }]}>
                              وین فیس
                            </Text>
                            <Text style={[styles.breakdownVal, { color: '#38BDF8' }]}>
                              Rs. {fee.vanTransportFeeAmount.toLocaleString()}
                            </Text>
                          </View>
                        )}
                        {fee.academyFeeAmount > 0 && (
                          <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownLabel, { color: '#C084FC' }]}>
                              اکیڈمی فیس
                            </Text>
                            <Text style={[styles.breakdownVal, { color: '#C084FC' }]}>
                              Rs. {fee.academyFeeAmount.toLocaleString()}
                            </Text>
                          </View>
                        )}
                        {fee.siblingDiscountAmount > 0 && (
                          <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownLabel, { color: '#00d49f' }]}>
                              رعایت (ڈسکاؤنٹ)
                            </Text>
                            <Text style={[styles.breakdownVal, { color: '#00d49f' }]}>
                              -Rs. {fee.siblingDiscountAmount.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Total Amount Box */}
                      <View style={styles.amountBox}>
                        <View>
                          <Text style={styles.amountBoxLabel}>
                            {isPaid ? 'ادا شدہ کل رقم' : 'بروقت کل چالان'}
                          </Text>
                          <Text
                            style={[
                              styles.amountBoxVal,
                              isPaid ? { color: '#00d49f' } : { color: '#F8FAFC' },
                            ]}
                          >
                            Rs. {fee.totalDue.toLocaleString()}
                          </Text>
                        </View>

                        {!isPaid ? (
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.surchargeNotice}>
                              {isOverdue ? 'لیٹ فیس چالان' : 'بعد از تاریخ (+لیٹ فیس)'}
                            </Text>
                            <Text style={styles.surchargeNum}>
                              Rs. {fee.amountAfterDueDate.toLocaleString()}
                            </Text>
                            <Text style={styles.surchargeExtra}>
                              (+Rs. {fee.surchargeAmount.toLocaleString()} اسکول جرمانہ)
                            </Text>
                          </View>
                        ) : (
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.paidInfoLabel}>طریقہ ادائیگی</Text>
                            <Text style={styles.paidInfoVal}>{fee.paymentMode || 'ONLINE'}</Text>
                            {Boolean(fee.bankTransactionId) && (
                              <Text style={styles.paidTidText}>TID: {fee.bankTransactionId}</Text>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Card Action Buttons */}
                      <View style={styles.cardActionsRow}>
                        {!isPaid ? (
                          <TouchableOpacity
                            style={styles.payBtn}
                            onPress={() => {
                              setSelectedFeeForPay(fee);
                              setPayMode('JAZZCASH');
                              setPayTid('');
                            }}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="checkmark-done" size={16} color="#070d18" />
                            <Text style={styles.payBtnText}>💵 ادا کریں (Mark Paid)</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.paidVerifiedStrip}>
                            <Ionicons name="shield-checkmark" size={15} color="#00d49f" />
                            <Text style={styles.paidVerifiedText}>
                              فیس چالان تصدیق شدہ • والٹ میں محفوظ
                            </Text>
                          </View>
                        )}

                        {fee.vanTransportFeeAmount > 0 && (
                          <TouchableOpacity
                            style={styles.vanReceiptBtn}
                            onPress={() => handleShareVanReceipt(fee._id)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="logo-whatsapp" size={15} color="#22C55E" />
                            <Text style={styles.vanReceiptBtnText}>وین رسید</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.deleteMiniBtn}
                          onPress={() => handleDeleteChallan(fee)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ================= 9. MARK AS PAID MODAL ================= */}
        {Boolean(selectedFeeForPay) && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedFeeForPay(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>فیس ادائیگی محفوظ کریں</Text>
                    <Text style={styles.sheetSub}>
                      {selectedFeeForPay?.childName} • {selectedFeeForPay?.institutionName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setSelectedFeeForPay(null)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Amount Highlight */}
                <View style={styles.payAmountBox}>
                  <Text style={styles.payAmountLabel}>کل ادا شدہ چالان رقم</Text>
                  <Text style={styles.payAmountVal}>
                    Rs. {selectedFeeForPay?.totalDue.toLocaleString()}
                  </Text>
                  <Text style={styles.payAmountSub}>
                    (ٹیوشن، وین اور اکیڈمی فیس کا مجموعہ)
                  </Text>
                </View>

                {/* Payment Source Picker */}
                <Text style={styles.inputSectionTitle}>1. ادائیگی کا ذریعہ منتخب کریں:</Text>
                <View style={styles.paySourceGrid}>
                  {(
                    [
                      { key: 'JAZZCASH', label: 'JazzCash', color: '#EF4444' },
                      { key: 'EASYPAISA', label: 'EasyPaisa', color: '#10B981' },
                      { key: 'BANK_1BILL', label: '1Bill / Bank', color: '#38BDF8' },
                      { key: 'CASH', label: 'Cash (اسکول کاؤنٹر)', color: '#CBD5E1' },
                      { key: 'RAAST', label: 'Raast P2P', color: '#00d49f' },
                    ] as const
                  ).map((src) => (
                    <TouchableOpacity
                      key={src.key}
                      style={[
                        styles.sourceChip,
                        payMode === src.key && {
                          borderColor: src.color,
                          backgroundColor: src.color + '22',
                        },
                      ]}
                      onPress={() => setPayMode(src.key)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.sourceDot,
                          {
                            backgroundColor: payMode === src.key ? src.color : '#64748B',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.sourceChipText,
                          payMode === src.key && { color: '#F8FAFC', fontWeight: 'bold' },
                        ]}
                      >
                        {src.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Voucher / Scroll No */}
                <Text style={styles.inputSectionTitle}>2. چالان یا واؤچر نمبر (اختیاری):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="APS-VCH-882910 یا بینک اسکرول نمبر"
                  placeholderTextColor="#64748B"
                  value={payVoucherNo}
                  onChangeText={setPayVoucherNo}
                />

                {/* TID */}
                <Text style={styles.inputSectionTitle}>3. بینک یا JazzCash ٹرانزیکشن ID (TID):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: TID-9821849201"
                  placeholderTextColor="#64748B"
                  value={payTid}
                  onChangeText={setPayTid}
                />

                {/* Confirm Action Button */}
                <TouchableOpacity
                  style={[styles.confirmPayBtn, paySubmitting && { opacity: 0.6 }]}
                  onPress={handleConfirmPayment}
                  disabled={paySubmitting}
                  activeOpacity={0.85}
                >
                  {paySubmitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color="#070d18" />
                      <Text style={styles.confirmPayBtnText}>
                        ادائیگی تصدیق کریں اور کھاتے میں درج کریں
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= 10. ADD CHALLAN MODAL ================= */}
        {showAddModal && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowAddModal(false)}
          >
            <View style={styles.modalBackdrop}>
              <View
                style={[
                  styles.modalSheet,
                  isDesktop && styles.modalSheetDesktop,
                  { maxHeight: '90%' },
                ]}
              >
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>نیا اسکول فیس چالان درج کریں</Text>
                    <Text style={styles.sheetSub}>بچے کا نام، ادارہ اور فیس کی تفصیلات درج کریں</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                  {/* Child Name */}
                  <Text style={styles.inputSectionTitle}>بچے کا نام (Child Name):</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="مثال: علی سعد / عائشہ سعد"
                    placeholderTextColor="#64748B"
                    value={addChildName}
                    onChangeText={setAddChildName}
                  />

                  {/* Institution Presets */}
                  <Text style={styles.inputSectionTitle}>مشہور اسکول / یونیورسٹی منتخب کریں:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {PAKISTANI_INSTITUTION_PRESETS.map((p, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetChip,
                          addInstitution === p.name && styles.presetChipActive,
                        ]}
                        onPress={() => {
                          setAddInstitution(p.name);
                          setAddEducationLevel(p.level);
                        }}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            addInstitution === p.name && styles.presetChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Institution Name */}
                  <Text style={styles.inputSectionTitle}>ادارے کا نام (Institution Name):</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Army Public School / The City School / FAST"
                    placeholderTextColor="#64748B"
                    value={addInstitution}
                    onChangeText={setAddInstitution}
                  />

                  {/* Grade / Class */}
                  <Text style={styles.inputSectionTitle}>کلاس یا گریڈ (Grade / Class):</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Class 8-B / Matric / BS CS"
                    placeholderTextColor="#64748B"
                    value={addGrade}
                    onChangeText={setAddGrade}
                  />

                  {/* Fees Row: Tuition & Van */}
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>ٹیوشن فیس (روپے):</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="16500"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={addTuition}
                        onChangeText={setAddTuition}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>وین / پک اینڈ ڈراپ:</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="3500"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={addVan}
                        onChangeText={setAddVan}
                      />
                    </View>
                  </View>

                  {/* Van Driver Details */}
                  {parseFloat(addVan) > 0 && (
                    <View style={styles.twoColRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputSectionTitle}>وین ڈرائیور کا نام:</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="چاچا اسلم وین"
                          placeholderTextColor="#64748B"
                          value={addDriverName}
                          onChangeText={setAddDriverName}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputSectionTitle}>ڈرائیور فون (واٹس ایپ):</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="+923001234567"
                          placeholderTextColor="#64748B"
                          keyboardType="phone-pad"
                          value={addDriverPhone}
                          onChangeText={setAddDriverPhone}
                        />
                      </View>
                    </View>
                  )}

                  {/* Academy Fees & Sibling Discount */}
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>اکیڈمی کوچنگ فیس:</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="6000"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={addAcademy}
                        onChangeText={setAddAcademy}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>رعایت / سب لنگ ڈسکاؤنٹ:</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1400"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={addSiblingDiscount}
                        onChangeText={setAddSiblingDiscount}
                      />
                    </View>
                  </View>

                  {/* Surcharge & Due Days */}
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>لیٹ فیس سرچارج:</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="500"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={addSurcharge}
                        onChangeText={setAddSurcharge}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>چالان نمبر (اختیاری):</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="APS-VCH-8821"
                        placeholderTextColor="#64748B"
                        value={addVoucherNo}
                        onChangeText={setAddVoucherNo}
                      />
                    </View>
                  </View>

                  {/* Due Date Chips */}
                  <Text style={styles.inputSectionTitle}>آخری تاریخ (کتنے دن بعد ہے؟):</Text>
                  <View style={styles.daysAheadRow}>
                    {['2', '3', '5', '7', '10', '15'].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayAheadChip,
                          addDaysAhead === d && styles.dayAheadChipActive,
                        ]}
                        onPress={() => setAddDaysAhead(d)}
                      >
                        <Text
                          style={[
                            styles.dayAheadText,
                            addDaysAhead === d && styles.dayAheadTextActive,
                          ]}
                        >
                          {d} دن بعد
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.confirmAddBtn, addSubmitting && { opacity: 0.6 }]}
                    onPress={handleCreateChallan}
                    disabled={addSubmitting}
                    activeOpacity={0.85}
                  >
                    {addSubmitting ? (
                      <ActivityIndicator size="small" color="#070d18" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={18} color="#070d18" />
                        <Text style={styles.confirmAddBtnText}>چالان محفوظ کریں اور شیڈول میں لائیں</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070d18',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    backgroundColor: '#09111e',
    gap: 12,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0d1627',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#818CF8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addHeaderBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  // Metrics
  metricsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  metricCardPrimary: {
    borderColor: 'rgba(129, 140, 248, 0.35)',
    backgroundColor: 'rgba(129, 140, 248, 0.06)',
  },
  metricCardUnpaid: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  metricCardRisk: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  metricCardSafe: {
    borderColor: 'rgba(0, 212, 159, 0.3)',
    backgroundColor: 'rgba(0, 212, 159, 0.05)',
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricSub: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
  },
  // Urgency Banner
  urgencyAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
    padding: 12,
  },
  urgencyBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyBannerTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  urgencyBannerSub: {
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 2,
  },
  urgencyPayNowBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  urgencyPayNowText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Timeline Section
  timelineSection: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  timelineHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timelinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#070d18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 8,
    minWidth: 200,
  },
  timelinePillOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  timelinePillDueSoon: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  timelineDateBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  timelineDateText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timelineChildName: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timelineInstName: {
    color: '#94A3B8',
    fontSize: 9,
  },
  timelineAmount: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  timelineUrgencyTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timelineUrgencyText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  // Child Radar Section
  childRadarSection: {
    gap: 8,
  },
  childRadarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  childRadarTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  childRadarCard: {
    width: 220,
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    marginRight: 6,
  },
  childRadarCardActive: {
    borderColor: '#818CF8',
    backgroundColor: 'rgba(129, 140, 248, 0.08)',
  },
  childCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  childAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarLetter: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  childCardName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  childCardGrade: {
    color: '#94A3B8',
    fontSize: 10,
  },
  childTotalInvestBox: {
    backgroundColor: '#070d18',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  childTotalInvestLabel: {
    color: '#64748B',
    fontSize: 9,
  },
  childTotalInvestVal: {
    color: '#00d49f',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  microPillsWrap: {
    gap: 4,
  },
  microPill: {
    backgroundColor: '#09111e',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  microPillText: {
    color: '#818CF8',
    fontSize: 9,
    fontWeight: '600',
  },
  // Filter Tabs
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#09111e',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#818CF8',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#070d18',
    fontWeight: 'bold',
  },
  // Child Chips
  childChipsContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  childChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  childChipActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  childChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  childChipTextActive: {
    color: '#070d18',
    fontWeight: 'bold',
  },
  // Empty Card
  emptyCard: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    marginTop: 10,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySub: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },
  emptyActionBtn: {
    marginTop: 16,
    backgroundColor: '#818CF8',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Fee Cards List
  feesList: {
    gap: 12,
  },
  feeCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
  },
  feeCardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  feeCardDueTomorrow: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  feeCardPaid: {
    borderColor: 'rgba(0, 212, 159, 0.25)',
  },
  feeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  childIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  childTitleName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  institutionSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  urgencyBadgePaid: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderColor: 'rgba(0, 212, 159, 0.35)',
  },
  urgencyBadgeOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  urgencyBadgeDueTomorrow: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  urgencyBadgeUrgent: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  urgencyBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  feeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#09111e',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  feeMetaCol: {
    flex: 1,
  },
  feeMetaLabel: {
    color: '#64748B',
    fontSize: 9,
  },
  feeMetaVal: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  // Breakdown Strip
  breakdownStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  breakdownItem: {
    backgroundColor: '#070d18',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  breakdownLabel: {
    color: '#94A3B8',
    fontSize: 9,
  },
  breakdownVal: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 1,
  },
  amountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070d18',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    marginBottom: 10,
  },
  amountBoxLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  amountBoxVal: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 2,
  },
  surchargeNotice: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
  },
  surchargeNum: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  surchargeExtra: {
    color: '#F87171',
    fontSize: 9,
    marginTop: 1,
  },
  paidInfoLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  paidInfoVal: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  paidTidText: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#818CF8',
    paddingVertical: 9,
    borderRadius: 9,
  },
  payBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paidVerifiedStrip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  paidVerifiedText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '600',
  },
  vanReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  vanReceiptBtnText: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteMiniBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  // Modal Backdrop & Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0d1627',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  modalSheetDesktop: {
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 20,
    marginBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#17233b',
  },
  payAmountBox: {
    backgroundColor: '#070d18',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    alignItems: 'center',
    marginBottom: 14,
  },
  payAmountLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  payAmountVal: {
    color: '#818CF8',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
  },
  payAmountSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  inputSectionTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 8,
  },
  paySourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sourceChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  textInput: {
    backgroundColor: '#070d18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
  },
  confirmPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#818CF8',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  confirmPayBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Add Challan Specific
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    marginRight: 6,
  },
  presetChipActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  presetChipText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  presetChipTextActive: {
    color: '#070d18',
    fontWeight: 'bold',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  daysAheadRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 6,
  },
  dayAheadChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  dayAheadChipActive: {
    backgroundColor: '#818CF8',
    borderColor: '#818CF8',
  },
  dayAheadText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  dayAheadTextActive: {
    color: '#070d18',
    fontWeight: 'bold',
  },
  confirmAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#818CF8',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 18,
    marginBottom: 20,
  },
  confirmAddBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
