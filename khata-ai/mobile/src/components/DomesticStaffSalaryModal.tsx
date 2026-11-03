import React, { useState, useEffect, useCallback } from 'react';
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
  domesticStaffApi,
  IDomesticStaffMember,
  IDomesticStaffAnalytics,
  DomesticStaffRole,
  AttendanceStatus,
  SalaryPaymentMode,
  CreateStaffPayload,
} from '../api/domesticStaff.api';

interface DomesticStaffSalaryModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

const ROLE_CONFIG: Record<
  DomesticStaffRole,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  MAID: { label: 'صفائی و دھلائی (Maid)', icon: 'sparkles', color: '#FB7185', bg: 'rgba(251, 113, 133, 0.16)' },
  DRIVER: { label: 'ڈرائیور (Driver)', icon: 'car', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.16)' },
  COOK: { label: 'باورچی (Cook)', icon: 'restaurant', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.16)' },
  GUARD: { label: 'چوکیدار (Guard)', icon: 'shield', color: '#818CF8', bg: 'rgba(129, 140, 248, 0.16)' },
  GARDENER: { label: 'مالی (Gardener)', icon: 'leaf', color: '#34D399', bg: 'rgba(52, 211, 153, 0.16)' },
  NANNY: { label: 'آیا / آیا نگہبان', icon: 'heart', color: '#F472B6', bg: 'rgba(244, 114, 182, 0.16)' },
  OTHER: { label: 'دیگر ملازم', icon: 'person', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.16)' },
};

const PESHGI_REASONS = ['بچے کی دوائی', 'راشن خریداری', 'گاؤں کا کرایہ', 'عید شاپنگ', 'اسکول فیس', 'ہنگامی ضرورت'];

export const DomesticStaffSalaryModal: React.FC<DomesticStaffSalaryModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [staffList, setStaffList] = useState<IDomesticStaffMember[]>([]);
  const [analytics, setAnalytics] = useState<IDomesticStaffAnalytics | null>(null);

  // Advance (Peshgi) Sheet State
  const [selectedStaffForAdvance, setSelectedStaffForAdvance] = useState<IDomesticStaffMember | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceReason, setAdvanceReason] = useState<string>('بچے کی دوائی');
  const [advancePaymentMode, setAdvancePaymentMode] = useState<SalaryPaymentMode>('CASH');
  const [advanceSubmitting, setAdvanceSubmitting] = useState<boolean>(false);

  // Attendance Sheet State
  const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState<IDomesticStaffMember | null>(null);
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('PRESENT');
  const [attendanceNotes, setAttendanceNotes] = useState<string>('');
  const [attendanceSubmitting, setAttendanceSubmitting] = useState<boolean>(false);

  // Settle Salary Sheet State
  const [selectedStaffForSettle, setSelectedStaffForSettle] = useState<IDomesticStaffMember | null>(null);
  const [bonusAmount, setBonusAmount] = useState<string>('0');
  const [settlePaymentMode, setSettlePaymentMode] = useState<SalaryPaymentMode>('CASH');
  const [settleSubmitting, setSettleSubmitting] = useState<boolean>(false);

  // Add Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState<boolean>(false);
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [newStaffRole, setNewStaffRole] = useState<DomesticStaffRole>('MAID');
  const [newStaffPhone, setNewStaffPhone] = useState<string>('');
  const [newStaffSalary, setNewStaffSalary] = useState<string>('18000');
  const [addStaffSubmitting, setAddStaffSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [members, stats] = await Promise.all([
        domesticStaffApi.getStaff(),
        domesticStaffApi.getAnalytics(),
      ]);
      setStaffList(members);
      setAnalytics(stats);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'ملازمین کا ڈیٹا لوڈ کرنے میں مسئلہ ہوا';
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

  // Log Peshgi Advance
  const handleLogAdvance = async () => {
    if (!selectedStaffForAdvance) return;
    const num = parseFloat(advanceAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('خطا', 'براہ کرم درست پیشگی رقم درج کریں۔');
      return;
    }

    try {
      setAdvanceSubmitting(true);
      await domesticStaffApi.logAdvance(selectedStaffForAdvance._id, {
        amount: num,
        reason: advanceReason.trim() || undefined,
        paymentMode: advancePaymentMode,
      });

      setSelectedStaffForAdvance(null);
      setAdvanceAmount('');
      if (onShowToast) {
        onShowToast(`✅ ${selectedStaffForAdvance.staffName} کو Rs. ${num.toLocaleString()} پیشگی درج ہو گئی۔`);
      }
      fetchData();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'پیشگی درج نہیں ہو سکی');
    } finally {
      setAdvanceSubmitting(false);
    }
  };

  // Record Attendance
  const handleRecordAttendance = async () => {
    if (!selectedStaffForAttendance) return;
    try {
      setAttendanceSubmitting(true);
      await domesticStaffApi.recordAttendance(selectedStaffForAttendance._id, {
        date: attendanceDate,
        status: attendanceStatus,
        notes: attendanceNotes.trim() || undefined,
      });

      setSelectedStaffForAttendance(null);
      setAttendanceNotes('');
      if (onShowToast) {
        onShowToast(`✅ ${selectedStaffForAttendance.staffName} کی حاضری محفوظ ہو گئی۔`);
      }
      fetchData();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'حاضری محفوظ نہیں ہو سکی');
    } finally {
      setAttendanceSubmitting(false);
    }
  };

  // Settle Salary
  const handleSettleSalary = async () => {
    if (!selectedStaffForSettle) return;
    try {
      setSettleSubmitting(true);
      const res = await domesticStaffApi.settleSalary(selectedStaffForSettle._id, {
        bonusOrEidiAmount: parseFloat(bonusAmount) || 0,
        paymentMode: settlePaymentMode,
      });

      setSelectedStaffForSettle(null);
      setBonusAmount('0');
      if (onShowToast) {
        onShowToast(`✅ ${res.staff.staffName} کی تنخواہ کامیابی سے ادا اور کلیئر کر دی گئی۔`);
      }
      fetchData();

      // Offer to share WhatsApp Slip
      Alert.alert(
        'تنخواہ ادا ہو گئی',
        `کیا آپ ${res.staff.staffName} کو واٹس ایپ پر باضابطہ تنخواہ رسید بھیجنا چاہتے ہیں؟`,
        [
          { text: 'بعد میں', style: 'cancel' },
          {
            text: 'واٹس ایپ پر بھیجیں',
            onPress: () => {
              Share.share({ message: res.slipText, title: 'Domestic Staff Salary Slip' });
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'تنخواہ ادا نہیں ہو سکی');
    } finally {
      setSettleSubmitting(false);
    }
  };

  // Share Slip
  const handleShareSlip = async (staffId: string) => {
    try {
      const res = await domesticStaffApi.getSalarySlip(staffId);
      await Share.share({ message: res.slipText, title: 'Salary Slip' });
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'رسید نہیں بن سکی');
    }
  };

  // Create Staff
  const handleCreateStaff = async () => {
    if (!newStaffName.trim() || !newStaffSalary.trim()) {
      Alert.alert('ضروری معلومات', 'براہ کرم ملازم کا نام اور بنیادی تنخواہ درج کریں۔');
      return;
    }

    const salaryNum = parseFloat(newStaffSalary);
    if (isNaN(salaryNum) || salaryNum <= 0) {
      Alert.alert('خطا', 'براہ کرم درست بنیادی تنخواہ درج کریں۔');
      return;
    }

    const payload: CreateStaffPayload = {
      staffName: newStaffName.trim(),
      role: newStaffRole,
      phone: newStaffPhone.trim() || undefined,
      baseMonthlySalary: salaryNum,
      avatarColor: ROLE_CONFIG[newStaffRole].color,
    };

    try {
      setAddStaffSubmitting(true);
      await domesticStaffApi.createStaff(payload);
      setShowAddStaffModal(false);
      setNewStaffName('');
      setNewStaffPhone('');
      setNewStaffSalary('18000');
      if (onShowToast) onShowToast('✅ نیا گھریلو ملازم کامیابی سے شامل ہو گیا۔');
      fetchData();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'ملازم شامل نہیں ہو سکا');
    } finally {
      setAddStaffSubmitting(false);
    }
  };

  // Delete Staff
  const handleDeleteStaff = (staff: IDomesticStaffMember) => {
    Alert.alert(
      'ملازم حذف کریں',
      `کیا آپ واقعی ${staff.staffName} کا ریکارڈ حذف کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'ہاں، حذف کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              await domesticStaffApi.deleteStaff(staff._id);
              setStaffList((prev) => prev.filter((s) => s._id !== staff._id));
              fetchData();
              if (onShowToast) onShowToast('ملازم کامیابی سے حذف کر دیا گیا۔');
            } catch (err: any) {
              Alert.alert('خطا', err.message || 'ملازم حذف نہیں ہو سکا');
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
              <Ionicons name="people" size={20} color="#38BDF8" />
              <Text style={styles.headerTitle}>ملازمہ اور ڈرائیور تنخواہ</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Domestic Help Wages • Attendance & Peshgi Advance Vault
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddStaffModal(true)}
            style={styles.addHeaderBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add" size={16} color="#070d18" />
            <Text style={styles.addHeaderBtnText}>نیا ملازم</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>ملازمین کا حساب لوڈ ہو رہا ہے...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= 2. TOP METRIC DECK ================= */}
            <View style={styles.metricsContainer}>
              {/* Total Base Wages */}
              <View style={[styles.metricCard, styles.metricCardPrimary]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>کل بنیادی تنخواہیں</Text>
                  <Ionicons name="wallet-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={[styles.metricVal, { color: '#38BDF8' }]}>
                  Rs. {(analytics?.totalBaseSalary || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>{analytics?.totalStaffCount || 0} فعال ملازمین</Text>
              </View>

              {/* Active Peshgi Pool */}
              <View
                style={[
                  styles.metricCard,
                  analytics && analytics.totalActivePeshgiPool > 0
                    ? styles.metricCardRisk
                    : styles.metricCardSafe,
                ]}
              >
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>جاری پیشگی ایڈوانس</Text>
                  <Ionicons
                    name="hourglass-outline"
                    size={14}
                    color={analytics && analytics.totalActivePeshgiPool > 0 ? '#F59E0B' : '#00d49f'}
                  />
                </View>
                <Text
                  style={[
                    styles.metricVal,
                    {
                      color:
                        analytics && analytics.totalActivePeshgiPool > 0 ? '#F59E0B' : '#00d49f',
                    },
                  ]}
                >
                  Rs. {(analytics?.totalActivePeshgiPool || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>
                  {analytics?.staffWithActiveAdvanceCount || 0} ملازمین نے پیشگی لی
                </Text>
              </View>

              {/* Net Payable This Month */}
              <View style={[styles.metricCard, styles.metricCardNet]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>خالص واجب الادا</Text>
                  <Ionicons name="cash-outline" size={14} color="#00d49f" />
                </View>
                <Text style={[styles.metricVal, { color: '#00d49f' }]}>
                  Rs. {(analytics?.totalNetPayable || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>یکم کو ادائیگی واجب</Text>
              </View>
            </View>

            {/* ================= 3. PESHGI NOTICE BANNER ================= */}
            {analytics && analytics.totalActivePeshgiPool > 0 && (
              <View style={styles.peshgiNoticeBanner}>
                <View style={styles.peshgiBannerIcon}>
                  <Ionicons name="alert-circle" size={22} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.peshgiBannerTitle}>
                    پیشگی الرٹ: اس ماہ Rs. {analytics.totalActivePeshgiPool.toLocaleString()} کی پیشگی دی گئی ہے!
                  </Text>
                  <Text style={styles.peshgiBannerSub}>
                    یکم کی تنخواہ بناتے وقت یہ پیشگیاں خودکار طور پر منہا (Deduct) ہو جائیں گی تاکہ کوئی تنازعہ نہ ہو۔
                  </Text>
                </View>
              </View>
            )}

            {/* ================= 4. STAFF CARDS LIST ================= */}
            <View style={styles.staffListContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>گھریلو ملازمین کی تفصیل و حاضریاں</Text>
                <Text style={styles.sectionCounter}>{staffList.length} ملازمین</Text>
              </View>

              {staffList.map((staff) => {
                const rConfig = ROLE_CONFIG[staff.role] || ROLE_CONFIG.OTHER;
                const hasAdvance = staff.totalAdvancesPending > 0;
                const hasAbsent = staff.attendanceStats.absentDays > 0;

                return (
                  <View key={staff._id} style={styles.staffCard}>
                    {/* Header Row */}
                    <View style={styles.staffCardHeader}>
                      <View style={styles.staffIdentityRow}>
                        <View
                          style={[
                            styles.staffRoleIconCircle,
                            { backgroundColor: rConfig.bg, borderColor: rConfig.color + '40' },
                          ]}
                        >
                          <Ionicons name={rConfig.icon} size={20} color={rConfig.color} />
                        </View>
                        <View>
                          <Text style={styles.staffName}>{staff.staffName}</Text>
                          <Text style={styles.roleTitle}>{rConfig.label}</Text>
                        </View>
                      </View>

                      {/* Status Badges */}
                      <View style={styles.badgesRow}>
                        {hasAdvance && (
                          <View style={styles.advanceBadge}>
                            <Ionicons name="time" size={11} color="#F59E0B" />
                            <Text style={styles.advanceBadgeText}>
                              Rs. {staff.totalAdvancesPending.toLocaleString()} پیشگی
                            </Text>
                          </View>
                        )}
                        {hasAbsent ? (
                          <View style={styles.absentBadge}>
                            <Text style={styles.absentBadgeText}>
                              {staff.attendanceStats.absentDays} چھٹی
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.presentBadge}>
                            <Text style={styles.presentBadgeText}>پوری حاضری</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Financial Math Box */}
                    <View style={styles.salaryMathBox}>
                      <View style={styles.mathRow}>
                        <View>
                          <Text style={styles.mathLabel}>بنیادی تنخواہ</Text>
                          <Text style={styles.mathValBase}>
                            Rs. {staff.baseMonthlySalary.toLocaleString()}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'center' }}>
                          <Text style={styles.mathLabel}>منفی پیشگی</Text>
                          <Text style={[styles.mathValDeduct, { color: '#F59E0B' }]}>
                            -Rs. {staff.totalAdvancesPending.toLocaleString()}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.mathLabel}>خالص قابلِ ادا</Text>
                          <Text style={styles.mathValNet}>
                            Rs. {staff.liveNetSalaryPayable.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Recent Advances Log Strip */}
                    {staff.activeAdvances.length > 0 && (
                      <View style={styles.advancesHistoryStrip}>
                        <Text style={styles.advancesStripTitle}>تاریخ وار پیشگی لاگ:</Text>
                        {staff.activeAdvances.map((adv, idx) => (
                          <View key={idx} style={styles.advanceItemRow}>
                            <Ionicons name="arrow-redo" size={12} color="#F59E0B" />
                            <Text style={styles.advDate}>
                              {new Date(adv.disbursementDate).toLocaleDateString('en-PK', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              :
                            </Text>
                            <Text style={styles.advAmount}>Rs. {adv.amount.toLocaleString()}</Text>
                            <Text style={styles.advReason}>({adv.reason || 'پیشگی'})</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.peshgiBtn}
                        onPress={() => setSelectedStaffForAdvance(staff)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cash-outline" size={15} color="#F59E0B" />
                        <Text style={styles.peshgiBtnText}>💵 پیشگی دیں</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.attendanceBtn}
                        onPress={() => setSelectedStaffForAttendance(staff)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={15} color="#38BDF8" />
                        <Text style={styles.attendanceBtnText}>📅 حاضری</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.settleBtn}
                        onPress={() => setSelectedStaffForSettle(staff)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark-done" size={15} color="#070d18" />
                        <Text style={styles.settleBtnText}>تنخواہ ادا کریں</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.whatsappSlipBtn}
                        onPress={() => handleShareSlip(staff._id)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#22C55E" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteMiniBtn}
                        onPress={() => handleDeleteStaff(staff)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ================= 5. LOG PESHGI ADVANCE SHEET ================= */}
        {Boolean(selectedStaffForAdvance) && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedStaffForAdvance(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>پیشگی ایڈوانس اندراج (Log Peshgi)</Text>
                    <Text style={styles.sheetSub}>
                      {selectedStaffForAdvance?.staffName} • بنیادی تنخواہ: Rs.{' '}
                      {selectedStaffForAdvance?.baseMonthlySalary.toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setSelectedStaffForAdvance(null)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <Text style={styles.inputSectionTitle}>پیشگی رقم (روپے):</Text>
                <TextInput
                  style={[styles.textInput, { fontSize: 18, fontWeight: 'bold', color: '#F59E0B' }]}
                  placeholder="مثال: 2000"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={advanceAmount}
                  onChangeText={setAdvanceAmount}
                  autoFocus={true}
                />

                {/* Quick Amount Chips */}
                <View style={styles.quickChipsRow}>
                  {['1000', '1500', '2000', '3000', '5000'].map((amt) => (
                    <TouchableOpacity
                      key={amt}
                      style={[styles.quickChip, advanceAmount === amt && styles.quickChipActive]}
                      onPress={() => setAdvanceAmount(amt)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          advanceAmount === amt && styles.quickChipTextActive,
                        ]}
                      >
                        Rs. {amt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick Reason Chips */}
                <Text style={styles.inputSectionTitle}>پیشگی کی وجہ / مقصد:</Text>
                <View style={styles.quickChipsRow}>
                  {PESHGI_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.quickChip, advanceReason === r && styles.quickChipActive]}
                      onPress={() => setAdvanceReason(r)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          advanceReason === r && styles.quickChipTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Payment Mode */}
                <Text style={styles.inputSectionTitle}>ادائیگی کا ذریعہ:</Text>
                <View style={styles.quickChipsRow}>
                  {(
                    [
                      { key: 'CASH', label: 'نقد (Cash)' },
                      { key: 'JAZZCASH', label: 'JazzCash' },
                      { key: 'EASYPAISA', label: 'EasyPaisa' },
                    ] as const
                  ).map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.quickChip,
                        advancePaymentMode === m.key && styles.quickChipActive,
                      ]}
                      onPress={() => setAdvancePaymentMode(m.key)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          advancePaymentMode === m.key && styles.quickChipTextActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Submit Peshgi */}
                <TouchableOpacity
                  style={[styles.confirmActionBtn, advanceSubmitting && { opacity: 0.6 }]}
                  onPress={handleLogAdvance}
                  disabled={advanceSubmitting}
                  activeOpacity={0.85}
                >
                  {advanceSubmitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="save" size={18} color="#070d18" />
                      <Text style={styles.confirmActionBtnText}>
                        پیشگی محفوظ کریں اور کٹوتی شیڈول کریں
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= 6. RECORD ATTENDANCE SHEET ================= */}
        {Boolean(selectedStaffForAttendance) && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedStaffForAttendance(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>روزانہ حاضری اندراج</Text>
                    <Text style={styles.sheetSub}>
                      {selectedStaffForAttendance?.staffName} • تاریخ: {attendanceDate}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setSelectedStaffForAttendance(null)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputSectionTitle}>حاضری اسٹیٹس منتخب کریں:</Text>
                <View style={styles.attendanceOptionsGrid}>
                  {(
                    [
                      { key: 'PRESENT', label: '🟢 حاضر (Present)', desc: 'پورا دن کام کیا', color: '#10B981' },
                      { key: 'HALF_DAY', label: '🟡 آدھا دن (Half Day)', desc: 'آدھا دن کام کیا', color: '#F59E0B' },
                      { key: 'ABSENT', label: '🔴 چھٹی (Absent)', desc: 'بغیر اطلاع یا رخصت', color: '#EF4444' },
                      { key: 'PAID_LEAVE', label: '🔵 بااجرت رخصت (Paid)', desc: 'رعایتی چھٹی (بغیر کٹوتی)', color: '#38BDF8' },
                    ] as const
                  ).map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.attOptionCard,
                        attendanceStatus === opt.key && {
                          borderColor: opt.color,
                          backgroundColor: opt.color + '18',
                        },
                      ]}
                      onPress={() => setAttendanceStatus(opt.key)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.attOptionTitle,
                          attendanceStatus === opt.key && { color: opt.color, fontWeight: 'bold' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.attOptionDesc}>{opt.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes */}
                <Text style={styles.inputSectionTitle}>اضافی نوٹس (اختیاری):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: بیٹے کے اسکول جانا تھا..."
                  placeholderTextColor="#64748B"
                  value={attendanceNotes}
                  onChangeText={setAttendanceNotes}
                />

                {/* Submit Attendance */}
                <TouchableOpacity
                  style={[styles.confirmActionBtn, attendanceSubmitting && { opacity: 0.6 }]}
                  onPress={handleRecordAttendance}
                  disabled={attendanceSubmitting}
                  activeOpacity={0.85}
                >
                  {attendanceSubmitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="calendar" size={18} color="#070d18" />
                      <Text style={styles.confirmActionBtnText}>حاضری محفوظ کریں</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= 7. SETTLE MONTHLY SALARY SHEET ================= */}
        {Boolean(selectedStaffForSettle) && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedStaffForSettle(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>ماہانہ تنخواہ ادائیگی و کلیئرنس</Text>
                    <Text style={styles.sheetSub}>
                      {selectedStaffForSettle?.staffName} • {ROLE_CONFIG[selectedStaffForSettle!.role].label}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setSelectedStaffForSettle(null)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Math Breakdown Box */}
                <View style={styles.settleSummaryBox}>
                  <View style={styles.settleRow}>
                    <Text style={styles.settleRowLabel}>بنیادی ماہانہ تنخواہ</Text>
                    <Text style={styles.settleRowVal}>
                      Rs. {selectedStaffForSettle?.baseMonthlySalary.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.settleRow}>
                    <Text style={[styles.settleRowLabel, { color: '#F59E0B' }]}>
                      منہا: کل پیشگی ایڈوانس
                    </Text>
                    <Text style={[styles.settleRowVal, { color: '#F59E0B' }]}>
                      -Rs. {selectedStaffForSettle?.totalAdvancesPending.toLocaleString()}
                    </Text>
                  </View>
                  {selectedStaffForSettle!.attendanceStats.leaveDeduction > 0 && (
                    <View style={styles.settleRow}>
                      <Text style={[styles.settleRowLabel, { color: '#EF4444' }]}>
                        منہا: چھٹی کٹوتی ({selectedStaffForSettle?.attendanceStats.absentDays} دن)
                      </Text>
                      <Text style={[styles.settleRowVal, { color: '#EF4444' }]}>
                        -Rs. {selectedStaffForSettle?.attendanceStats.leaveDeduction.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {parseFloat(bonusAmount) > 0 && (
                    <View style={styles.settleRow}>
                      <Text style={[styles.settleRowLabel, { color: '#10B981' }]}>
                        جمع: عید الاؤنس / بونس
                      </Text>
                      <Text style={[styles.settleRowVal, { color: '#10B981' }]}>
                        +Rs. {parseFloat(bonusAmount).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.settleDivider} />

                  <View style={styles.settleRow}>
                    <Text style={styles.settleNetTotalLabel}>خالص ادا شدہ تنخواہ</Text>
                    <Text style={styles.settleNetTotalVal}>
                      Rs.{' '}
                      {(
                        selectedStaffForSettle!.liveNetSalaryPayable +
                        (parseFloat(bonusAmount) || 0)
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Bonus / Eidi Input */}
                <Text style={styles.inputSectionTitle}>عید الاؤنس یا اضافی بونس (اختیاری):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={bonusAmount}
                  onChangeText={setBonusAmount}
                />

                {/* Payment Mode */}
                <Text style={styles.inputSectionTitle}>ادائیگی کا ذریعہ:</Text>
                <View style={styles.quickChipsRow}>
                  {(
                    [
                      { key: 'CASH', label: 'نقد (Cash)' },
                      { key: 'JAZZCASH', label: 'JazzCash' },
                      { key: 'EASYPAISA', label: 'EasyPaisa' },
                    ] as const
                  ).map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.quickChip,
                        settlePaymentMode === m.key && styles.quickChipActive,
                      ]}
                      onPress={() => setSettlePaymentMode(m.key)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          settlePaymentMode === m.key && styles.quickChipTextActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Settle Action Button */}
                <TouchableOpacity
                  style={[styles.confirmActionBtn, settleSubmitting && { opacity: 0.6 }]}
                  onPress={handleSettleSalary}
                  disabled={settleSubmitting}
                  activeOpacity={0.85}
                >
                  {settleSubmitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#070d18" />
                      <Text style={styles.confirmActionBtnText}>
                        تنخواہ کلیئر کریں اور رسید بنائیں
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= 8. ADD NEW STAFF MODAL ================= */}
        {showAddStaffModal && (
          <Modal
            visible={true}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowAddStaffModal(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>نیا گھریلو ملازم شامل کریں</Text>
                    <Text style={styles.sheetSub}>ملازمہ، ڈرائیور، باورچی یا مالی کا اندراج کریں</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setShowAddStaffModal(false)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Staff Name */}
                <Text style={styles.inputSectionTitle}>ملازم کا نام:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: نسیم بی بی / محمد اسلم"
                  placeholderTextColor="#64748B"
                  value={newStaffName}
                  onChangeText={setNewStaffName}
                />

                {/* Role Picker */}
                <Text style={styles.inputSectionTitle}>ذمہ داری / شعبہ (Role):</Text>
                <View style={styles.quickChipsRow}>
                  {(
                    [
                      { key: 'MAID', label: 'صفائی ملازمہ (Maid)' },
                      { key: 'DRIVER', label: 'ڈرائیور (Driver)' },
                      { key: 'COOK', label: 'باورچی (Cook)' },
                      { key: 'GUARD', label: 'چوکیدار (Guard)' },
                      { key: 'GARDENER', label: 'مالی (Gardener)' },
                    ] as const
                  ).map((r) => (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.quickChip, newStaffRole === r.key && styles.quickChipActive]}
                      onPress={() => setNewStaffRole(r.key)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          newStaffRole === r.key && styles.quickChipTextActive,
                        ]}
                      >
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Base Salary */}
                <Text style={styles.inputSectionTitle}>ماہانہ بنیادی تنخواہ (روپے):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="18000"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={newStaffSalary}
                  onChangeText={setNewStaffSalary}
                />

                {/* Phone */}
                <Text style={styles.inputSectionTitle}>موبائل نمبر (واٹس ایپ رسید کیلئے):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+923001234567"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  value={newStaffPhone}
                  onChangeText={setNewStaffPhone}
                />

                {/* Submit Add */}
                <TouchableOpacity
                  style={[styles.confirmActionBtn, addStaffSubmitting && { opacity: 0.6 }]}
                  onPress={handleCreateStaff}
                  disabled={addStaffSubmitting}
                  activeOpacity={0.85}
                >
                  {addStaffSubmitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={18} color="#070d18" />
                      <Text style={styles.confirmActionBtnText}>ملازم رجسٹر کریں</Text>
                    </>
                  )}
                </TouchableOpacity>
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
    backgroundColor: '#38BDF8',
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
    borderColor: 'rgba(56, 189, 248, 0.35)',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
  },
  metricCardRisk: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  metricCardSafe: {
    borderColor: 'rgba(0, 212, 159, 0.3)',
    backgroundColor: 'rgba(0, 212, 159, 0.05)',
  },
  metricCardNet: {
    borderColor: 'rgba(0, 212, 159, 0.35)',
    backgroundColor: 'rgba(0, 212, 159, 0.06)',
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
  // Notice Banner
  peshgiNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 12,
    padding: 12,
  },
  peshgiBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peshgiBannerTitle: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  peshgiBannerSub: {
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 2,
  },
  // Staff List
  staffListContainer: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionCounter: {
    color: '#94A3B8',
    fontSize: 11,
  },
  staffCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    gap: 10,
  },
  staffCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  staffRoleIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  roleTitle: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  advanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  advanceBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  absentBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  absentBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
  },
  presentBadge: {
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  presentBadgeText: {
    color: '#00d49f',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Salary Math Box
  salaryMathBox: {
    backgroundColor: '#070d18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
  },
  mathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mathLabel: {
    color: '#94A3B8',
    fontSize: 9,
  },
  mathValBase: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  mathValDeduct: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  mathValNet: {
    color: '#00d49f',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Advances History Strip
  advancesHistoryStrip: {
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  advancesStripTitle: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  advanceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advDate: {
    color: '#94A3B8',
    fontSize: 10,
  },
  advAmount: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  advReason: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  peshgiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  peshgiBtnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  attendanceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  attendanceBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  settleBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#00d49f',
    paddingVertical: 8,
    borderRadius: 8,
  },
  settleBtnText: {
    color: '#070d18',
    fontSize: 11,
    fontWeight: 'bold',
  },
  whatsappSlipBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  deleteMiniBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  // Modal Backdrops & Sheets
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
  inputSectionTitle: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 8,
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
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  quickChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  quickChipText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  quickChipTextActive: {
    color: '#070d18',
    fontWeight: 'bold',
  },
  confirmActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  confirmActionBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Attendance Sheet Options
  attendanceOptionsGrid: {
    gap: 6,
    marginBottom: 10,
  },
  attOptionCard: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  attOptionTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  attOptionDesc: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  // Settle Summary Box
  settleSummaryBox: {
    backgroundColor: '#070d18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 6,
    marginBottom: 10,
  },
  settleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settleRowLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  settleRowVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  settleDivider: {
    height: 1,
    backgroundColor: '#17233b',
    marginVertical: 4,
  },
  settleNetTotalLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  settleNetTotalVal: {
    color: '#00d49f',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
