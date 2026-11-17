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
  utilityBillApi,
  IUtilityBill,
  IUtilityBillSummary,
  UtilityProviderType,
  PaymentSourceTag,
  CreateBillPayload,
} from '../api/utilityBill.api';

export interface UtilityBillsTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
  segmentedHubMode?: boolean;
  currentHubSegment?: 'KAMETI' | 'SUB_METER';
  onSwitchHubSegment?: (seg: 'KAMETI' | 'SUB_METER') => void;
}

type TabFilter = 'ALL' | 'UNPAID' | 'DUE_SOON' | 'PAID';
type ProviderFilter = 'ALL' | UtilityProviderType;

const PAKISTANI_PROVIDER_PRESETS: {
  name: string;
  type: UtilityProviderType;
  defaultSurchargePct: number;
}[] = [
  { name: 'LESCO (لاہور الیکٹرک)', type: 'ELECTRICITY', defaultSurchargePct: 0.09 },
  { name: 'K-Electric (کے الیکٹرک کراچی)', type: 'ELECTRICITY', defaultSurchargePct: 0.1 },
  { name: 'FESCO (فیصل آباد الیکٹرک)', type: 'ELECTRICITY', defaultSurchargePct: 0.09 },
  { name: 'IESCO (اسلام آباد الیکٹرک)', type: 'ELECTRICITY', defaultSurchargePct: 0.09 },
  { name: 'MEPCO (ملتان الیکٹرک)', type: 'ELECTRICITY', defaultSurchargePct: 0.09 },
  { name: 'SNGPL (سوئی ناردرن گیس)', type: 'GAS', defaultSurchargePct: 0.1 },
  { name: 'SSGC (سوئی سدرن گیس)', type: 'GAS', defaultSurchargePct: 0.1 },
  { name: 'WASA (واسا پانی و سیوریج)', type: 'WATER', defaultSurchargePct: 0.12 },
  { name: 'Nayatel Fiber (نیاٹیل انٹرنیٹ)', type: 'INTERNET', defaultSurchargePct: 0.13 },
  { name: 'PTCL Flash Fiber (پی ٹی سی ایل)', type: 'INTERNET', defaultSurchargePct: 0.1 },
  { name: 'StormFiber (اسٹارم فائبر)', type: 'INTERNET', defaultSurchargePct: 0.1 },
];

export const UtilityBillsTrackerModal: React.FC<UtilityBillsTrackerModalProps> = ({
  visible,
  onClose,
  onShowToast,
  segmentedHubMode = false,
  currentHubSegment = 'SUB_METER',
  onSwitchHubSegment,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [bills, setBills] = useState<IUtilityBill[]>([]);
  const [summary, setSummary] = useState<IUtilityBillSummary | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [activeProvider, setActiveProvider] = useState<ProviderFilter>('ALL');

  // Mark As Paid Modal State
  const [selectedBillForPay, setSelectedBillForPay] = useState<IUtilityBill | null>(null);
  const [paySource, setPaySource] = useState<PaymentSourceTag>('JAZZCASH');
  const [payTransactionId, setPayTransactionId] = useState<string>('');
  const [paidByName, setPaidByName] = useState<string>('Muhammad Saad');
  const [payNotes, setPayNotes] = useState<string>('');
  const [paySubmitting, setPaySubmitting] = useState<boolean>(false);

  // Add Bill Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addProviderType, setAddProviderType] = useState<UtilityProviderType>('ELECTRICITY');
  const [addProviderName, setAddProviderName] = useState<string>('LESCO (لاہور الیکٹرک)');
  const [addConsumerNo, setAddConsumerNo] = useState<string>('');
  const [addMeterNo, setAddMeterNo] = useState<string>('');
  const [addAmount, setAddAmount] = useState<string>('');
  const [addSurcharge, setAddSurcharge] = useState<string>('');
  const [addDueDaysAhead, setAddDueDaysAhead] = useState<string>('7');
  const [addNotes, setAddNotes] = useState<string>('');
  const [addSubmitting, setAddSubmitting] = useState<boolean>(false);

  // Fetch Bills
  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await utilityBillApi.getBills();
      setBills(data.bills);
      setSummary(data.summary);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'بل ڈیٹا لوڈ کرنے میں مسئلہ ہوا';
      if (onShowToast) onShowToast(msg);
      else Alert.alert('خطا', msg);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    if (visible) {
      fetchBills();
    }
  }, [visible, fetchBills]);

  // Auto-calculate surcharge on amount change in Add Bill form
  const handleAmountChange = (val: string) => {
    setAddAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const matched = PAKISTANI_PROVIDER_PRESETS.find((p) => p.name === addProviderName);
      const pct = matched ? matched.defaultSurchargePct : 0.1;
      setAddSurcharge(Math.round(num * pct).toString());
    } else {
      setAddSurcharge('');
    }
  };

  // Submit Mark as Paid
  const handleConfirmPayment = async () => {
    if (!selectedBillForPay) return;
    try {
      setPaySubmitting(true);
      const updated = await utilityBillApi.payBill(selectedBillForPay._id, {
        paymentSource: paySource,
        transactionId: payTransactionId.trim() || undefined,
        paidByUserName: paidByName.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });

      // Update in state
      setBills((prev) => prev.map((b) => (b._id === updated._id ? { ...b, ...updated } : b)));
      setSelectedBillForPay(null);
      setPayTransactionId('');
      setPayNotes('');
      if (onShowToast) {
        onShowToast(`✅ ${updated.providerName} کا بل کامیابی سے ادا شدہ محفوظ ہو گیا۔`);
      }
      fetchBills();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'ادائیگی محفوظ نہیں ہو سکی';
      Alert.alert('خطا', msg);
    } finally {
      setPaySubmitting(false);
    }
  };

  // Share WhatsApp Proof
  const handleShareReceipt = async (billId: string) => {
    try {
      const res = await utilityBillApi.getShareText(billId);
      await Share.share({
        message: res.shareText,
        title: 'Utility Bill Payment Proof',
      });
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'رسید شیئر نہیں ہو سکی');
    }
  };

  // Submit Add Bill
  const handleCreateBill = async () => {
    if (!addProviderName.trim() || !addConsumerNo.trim() || !addAmount.trim()) {
      Alert.alert('ضروری معلومات', 'براہ کرم ادارہ، کنزیومر نمبر اور بل کی رقم درج کریں۔');
      return;
    }

    const amountNum = parseFloat(addAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('خطا', 'براہ کرم درست بل کی رقم درج کریں۔');
      return;
    }

    const daysAhead = parseInt(addDueDaysAhead, 10) || 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysAhead);

    const payload: CreateBillPayload = {
      providerType: addProviderType,
      providerName: addProviderName.trim(),
      consumerNumber: addConsumerNo.trim(),
      meterNumber: addMeterNo.trim() || undefined,
      billingAmount: amountNum,
      surchargeAmount: parseFloat(addSurcharge) || Math.round(amountNum * 0.1),
      billDueDate: dueDate.toISOString(),
      notes: addNotes.trim() || undefined,
    };

    try {
      setAddSubmitting(true);
      await utilityBillApi.createBill(payload);
      setShowAddModal(false);
      setAddConsumerNo('');
      setAddMeterNo('');
      setAddAmount('');
      setAddSurcharge('');
      setAddNotes('');
      if (onShowToast) onShowToast('✅ نیا یوٹیلیٹی بل کامیابی سے درج کر دیا گیا۔');
      fetchBills();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'بل شامل نہیں ہو سکا';
      Alert.alert('خطا', msg);
    } finally {
      setAddSubmitting(false);
    }
  };

  // Delete Bill
  const handleDeleteBill = (bill: IUtilityBill) => {
    Alert.alert(
      'بل حذف کریں',
      `کیا آپ واقعی ${bill.providerName} (کنزیومر: ${bill.consumerNumber}) کا بل حذف کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'ہاں، حذف کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              await utilityBillApi.deleteBill(bill._id);
              setBills((prev) => prev.filter((b) => b._id !== bill._id));
              fetchBills();
              if (onShowToast) onShowToast('بل کامیابی سے حذف کر دیا گیا۔');
            } catch (err: any) {
              Alert.alert('خطا', err.message || 'بل حذف نہیں ہو سکا');
            }
          },
        },
      ]
    );
  };

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      // Tab filter
      if (activeTab === 'UNPAID' && b.status === 'PAID') return false;
      if (activeTab === 'PAID' && b.status !== 'PAID') return false;
      if (activeTab === 'DUE_SOON') {
        if (b.status === 'PAID') return false;
        if (!b.isDueSoon && !b.isOverdue) return false;
      }

      // Provider filter
      if (activeProvider !== 'ALL' && b.providerType !== activeProvider) return false;

      return true;
    });
  }, [bills, activeTab, activeProvider]);

  // Provider icon helper
  const getProviderIcon = (type: UtilityProviderType) => {
    switch (type) {
      case 'ELECTRICITY':
        return { name: 'flash', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.16)' };
      case 'GAS':
        return { name: 'flame', color: '#FB923C', bg: 'rgba(249, 115, 22, 0.16)' };
      case 'WATER':
        return { name: 'water', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.16)' };
      case 'INTERNET':
        return { name: 'wifi', color: '#00d49f', bg: 'rgba(0, 212, 159, 0.16)' };
      default:
        return { name: 'receipt', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.16)' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 10) }]}>
        {/* ================= 1. TOP HEADER BAR ================= */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerRow}>
              <Ionicons name="flash-outline" size={20} color="#F59E0B" />
              <Text style={styles.headerTitle}>بجلی، گیس اور پانی کے بل</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Utility Bills Tracker • Surcharge Prevention & Receipt Vault
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addHeaderBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#070d18" />
            <Text style={styles.addHeaderBtnText}>نیا بل</Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Switch for Combined Kameti & Bills Hub */}
        {segmentedHubMode && (
          <View style={styles.hubSegmentContainer}>
            <TouchableOpacity
              style={[
                styles.hubSegmentTab,
                currentHubSegment === 'KAMETI' && styles.hubSegmentTabActive,
              ]}
              onPress={() => onSwitchHubSegment?.('KAMETI')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="wallet"
                size={14}
                color={currentHubSegment === 'KAMETI' ? '#38BDF8' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.hubSegmentTabText,
                  currentHubSegment === 'KAMETI' && styles.hubSegmentTabTextActive,
                ]}
              >
                کمیٹی (Kameti Savings)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.hubSegmentTab,
                currentHubSegment === 'SUB_METER' && styles.hubSegmentTabActive,
              ]}
              onPress={() => onSwitchHubSegment?.('SUB_METER')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="flash"
                size={14}
                color={currentHubSegment === 'SUB_METER' ? '#38BDF8' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.hubSegmentTabText,
                  currentHubSegment === 'SUB_METER' && styles.hubSegmentTabTextActive,
                ]}
              >
                سب میٹر و بجلی (Sub-Meter)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#00d49f" />
            <Text style={styles.loadingText}>یوٹیلیٹی بلز لوڈ ہو رہے ہیں...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= 2. FINANCIAL SURCHARGE RISK DECK ================= */}
            <View style={styles.metricsContainer}>
              {/* Surcharge at Risk Card */}
              <View
                style={[
                  styles.metricCard,
                  summary && summary.totalSurchargeAtRisk > 0
                    ? styles.metricCardRisk
                    : styles.metricCardSafe,
                ]}
              >
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>⚠️ لیٹ فیس خطرہ</Text>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={summary && summary.totalSurchargeAtRisk > 0 ? '#EF4444' : '#10B981'}
                  />
                </View>
                <Text
                  style={[
                    styles.metricVal,
                    {
                      color:
                        summary && summary.totalSurchargeAtRisk > 0 ? '#EF4444' : '#10B981',
                    },
                  ]}
                >
                  Rs. {(summary?.totalSurchargeAtRisk || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>
                  {summary && summary.totalSurchargeAtRisk > 0
                    ? `${summary.dueSoonCount + summary.overdueCount} بل آخری تاریخ کے قریب!`
                    : 'تمام بل محفوظ و کلیئر'}
                </Text>
              </View>

              {/* Total Unpaid */}
              <View style={[styles.metricCard, styles.metricCardUnpaid]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>کل واجب الادا</Text>
                  <Ionicons name="receipt-outline" size={14} color="#F59E0B" />
                </View>
                <Text style={[styles.metricVal, { color: '#F59E0B' }]}>
                  Rs. {(summary?.totalUnpaidAmount || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>{summary?.unpaidCount || 0} غیر ادا شدہ بل</Text>
              </View>

              {/* Total Paid This Month */}
              <View style={[styles.metricCard, styles.metricCardPaid]}>
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>ادا شدہ رسیدیں</Text>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#00d49f" />
                </View>
                <Text style={[styles.metricVal, { color: '#00d49f' }]}>
                  Rs. {(summary?.totalPaidThisMonth || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>{summary?.paidCount || 0} بل والٹ میں محفوظ</Text>
              </View>
            </View>

            {/* ================= 3. SURCHARGE PREVENTION RADAR BANNER ================= */}
            {summary && (summary.dueSoonCount > 0 || summary.overdueCount > 0) && (
              <View style={styles.urgencyAlertBanner}>
                <View style={styles.urgencyBannerIcon}>
                  <Ionicons name="warning" size={22} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.urgencyBannerTitle}>
                    {summary.overdueCount > 0
                      ? `🚨 ${summary.overdueCount} بل کی آخری تاریخ گزر چکی ہے (جرمانہ لاگو)!`
                      : `⚠️ ${summary.dueSoonCount} بلوں کی آخری تاریخ میں 3 دن سے کم باقی ہیں!`}
                  </Text>
                  <Text style={styles.urgencyBannerSub}>
                    بجلی و گیس کمپنیوں کے بھاری لیٹ سرچارج سے بچنے کیلئے وقت پر ادائیگی فائنل کریں۔
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

            {/* ================= 4. FILTER TABS ================= */}
            <View style={styles.filterTabsRow}>
              {(
                [
                  { key: 'ALL', label: `سبھی (${bills.length})` },
                  { key: 'UNPAID', label: `غیر ادا (${summary?.unpaidCount || 0})` },
                  {
                    key: 'DUE_SOON',
                    label: `🚨 جلد واجب (${(summary?.dueSoonCount || 0) + (summary?.overdueCount || 0)})`,
                  },
                  { key: 'PAID', label: `✅ رسیدیں (${summary?.paidCount || 0})` },
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

            {/* ================= 5. PROVIDER CATEGORY CHIPS ================= */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.providerChipsContainer}
            >
              {[
                { key: 'ALL', label: 'تمام اقسام', icon: 'grid-outline' },
                { key: 'ELECTRICITY', label: '⚡ بجلی (Power)', icon: 'flash' },
                { key: 'GAS', label: '🔥 سوئی گیس', icon: 'flame' },
                { key: 'WATER', label: '💧 واسا و پانی', icon: 'water' },
                { key: 'INTERNET', label: '🌐 انٹرنیٹ و فائبر', icon: 'wifi' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.providerChip,
                    activeProvider === p.key && styles.providerChipActive,
                  ]}
                  onPress={() => setActiveProvider(p.key as ProviderFilter)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={14}
                    color={activeProvider === p.key ? '#070d18' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.providerChipText,
                      activeProvider === p.key && styles.providerChipTextActive,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ================= 6. BILLS LIST ================= */}
            {filteredBills.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={42} color="#64748B" />
                <Text style={styles.emptyTitle}>کوئی یوٹیلیٹی بل موجود نہیں</Text>
                <Text style={styles.emptySub}>
                  اوپر دیئے گئے "نیا بل" بٹن پر کلک کر کے بجلی، گیس یا انٹرنیٹ بل درج کریں۔
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.emptyActionBtnText}>➕ نیا بل شامل کریں</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.billsList}>
                {filteredBills.map((bill) => {
                  const pConfig = getProviderIcon(bill.providerType);
                  const isPaid = bill.status === 'PAID';
                  const isOverdue = !isPaid && bill.daysUntilDue < 0;
                  const isDueTomorrow = !isPaid && bill.daysUntilDue === 1;
                  const isDueToday = !isPaid && bill.daysUntilDue === 0;
                  const isUrgent = !isPaid && bill.daysUntilDue <= 3;

                  return (
                    <View
                      key={bill._id}
                      style={[
                        styles.billCard,
                        isOverdue && styles.billCardOverdue,
                        (isDueTomorrow || isDueToday) && styles.billCardDueTomorrow,
                        isPaid && styles.billCardPaid,
                      ]}
                    >
                      {/* Top Header of Bill Card */}
                      <View style={styles.billCardHeader}>
                        <View style={styles.billCardProviderWrap}>
                          <View
                            style={[
                              styles.providerIconCircle,
                              { backgroundColor: pConfig.bg, borderColor: pConfig.color + '40' },
                            ]}
                          >
                            <Ionicons name={pConfig.name as any} size={20} color={pConfig.color} />
                          </View>
                          <View>
                            <Text style={styles.providerTitle}>{bill.providerName}</Text>
                            <Text style={styles.consumerNumber}>
                              ریفرنس: {bill.consumerNumber}
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
                              ? 'محفوظ ادا شدہ'
                              : isOverdue
                              ? `میعاد ختم (${Math.abs(bill.daysUntilDue)} دن زائد)`
                              : isDueToday
                              ? '🚨 آج آخری تاریخ ہے!'
                              : isDueTomorrow
                              ? '🚨 کل آخری تاریخ ہے!'
                              : `${bill.daysUntilDue} دن باقی`}
                          </Text>
                        </View>
                      </View>

                      {/* Bill Meta Strip */}
                      <View style={styles.billMetaRow}>
                        <View style={styles.billMetaCol}>
                          <Text style={styles.billMetaLabel}>بلنگ ماہ</Text>
                          <Text style={styles.billMetaVal}>{bill.billingMonth}</Text>
                        </View>
                        <View style={styles.billMetaCol}>
                          <Text style={styles.billMetaLabel}>آخری تاریخ</Text>
                          <Text style={styles.billMetaVal}>
                            {new Date(bill.billDueDate).toLocaleDateString('en-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                        {Boolean(bill.meterNumber) && (
                          <View style={styles.billMetaCol}>
                            <Text style={styles.billMetaLabel}>میٹر نمبر</Text>
                            <Text style={styles.billMetaVal}>{bill.meterNumber}</Text>
                          </View>
                        )}
                      </View>

                      {/* Amount & Surcharge Breakdown Card */}
                      <View style={styles.amountBreakdownCard}>
                        <View style={styles.amountRow}>
                          <View>
                            <Text style={styles.amountLabel}>
                              {isPaid ? 'ادا شدہ رقم' : 'بروقت ادائیگی رقم'}
                            </Text>
                            <Text
                              style={[
                                styles.amountMain,
                                isPaid ? { color: '#00d49f' } : { color: '#F8FAFC' },
                              ]}
                            >
                              Rs. {bill.billingAmount.toLocaleString()}
                            </Text>
                          </View>

                          {!isPaid ? (
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.surchargeWarningLabel}>
                                {isOverdue ? 'لاگو شدہ لیٹ فیس' : 'بعد از تاریخ (+لیٹ فیس)'}
                              </Text>
                              <Text style={styles.surchargeVal}>
                                Rs. {bill.amountAfterDueDate.toLocaleString()}
                              </Text>
                              <Text style={styles.surchargeSub}>
                                (+Rs. {bill.surchargeAmount.toLocaleString()} اضافی جرمانہ)
                              </Text>
                            </View>
                          ) : (
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.paidViaLabel}>ذریعہ ادائیگی</Text>
                              <Text style={styles.paidViaVal}>{bill.paymentSource || 'ONLINE'}</Text>
                              {Boolean(bill.transactionId) && (
                                <Text style={styles.paidTidVal}>TID: {bill.transactionId}</Text>
                              )}
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Anti-Double Billing Proof Strip for Paid Bills */}
                      {isPaid && (
                        <View style={styles.paidProofStrip}>
                          <Ionicons name="shield-checkmark" size={15} color="#00d49f" />
                          <Text style={styles.paidProofText}>
                            اینٹی ڈبل بلنگ والٹ میں محفوظ • ادا کنندہ: {bill.paidByUserName || 'صارف'}
                          </Text>
                        </View>
                      )}

                      {/* Card Action Buttons */}
                      <View style={styles.cardActionsRow}>
                        {!isPaid ? (
                          <TouchableOpacity
                            style={styles.payBtn}
                            onPress={() => {
                              setSelectedBillForPay(bill);
                              setPaySource('JAZZCASH');
                              setPayTransactionId('');
                            }}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="checkmark-done" size={16} color="#070d18" />
                            <Text style={styles.payBtnText}>💵 ادا کریں (Mark Paid)</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.shareReceiptBtn}
                            onPress={() => handleShareReceipt(bill._id)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="logo-whatsapp" size={16} color="#22C55E" />
                            <Text style={styles.shareReceiptBtnText}>واٹس ایپ رسید شیئر کریں</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.deleteMiniBtn}
                          onPress={() => handleDeleteBill(bill)}
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

        {/* ================= 7. MARK AS PAID MODAL ================= */}
        {Boolean(selectedBillForPay) && (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setSelectedBillForPay(null)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
                {/* Sheet Header */}
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetTitle}>بل ادائیگی محفوظ کریں</Text>
                    <Text style={styles.sheetSub}>
                      {selectedBillForPay?.providerName} • ریفرنس:{' '}
                      {selectedBillForPay?.consumerNumber}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setSelectedBillForPay(null)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Payable Amount Highlight */}
                <View style={styles.payAmountBox}>
                  <Text style={styles.payAmountLabel}>کل ادا شدہ رقم</Text>
                  <Text style={styles.payAmountVal}>
                    Rs. {selectedBillForPay?.billingAmount.toLocaleString()}
                  </Text>
                  <Text style={styles.payAmountSub}>
                    (ماہ {selectedBillForPay?.billingMonth} کا باضابطہ بل)
                  </Text>
                </View>

                {/* Payment Source Picker */}
                <Text style={styles.inputSectionTitle}>1. ادائیگی کا ذریعہ منتخب کریں:</Text>
                <View style={styles.paySourceGrid}>
                  {(
                    [
                      { key: 'JAZZCASH', label: 'JazzCash', color: '#EF4444' },
                      { key: 'EASYPAISA', label: 'EasyPaisa', color: '#10B981' },
                      { key: 'BANK_TRANSFER', label: '1Link / Raast', color: '#38BDF8' },
                      { key: 'SADAPAY', label: 'SadaPay', color: '#FB923C' },
                      { key: 'NAYAPAY', label: 'NayaPay', color: '#00d49f' },
                      { key: 'CASH', label: 'Cash (نقد)', color: '#CBD5E1' },
                    ] as const
                  ).map((src) => (
                    <TouchableOpacity
                      key={src.key}
                      style={[
                        styles.sourceChip,
                        paySource === src.key && {
                          borderColor: src.color,
                          backgroundColor: src.color + '22',
                        },
                      ]}
                      onPress={() => setPaySource(src.key)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.sourceDot,
                          {
                            backgroundColor: paySource === src.key ? src.color : '#64748B',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.sourceChipText,
                          paySource === src.key && { color: '#F8FAFC', fontWeight: 'bold' },
                        ]}
                      >
                        {src.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Transaction ID / Bank Reference */}
                <Text style={styles.inputSectionTitle}>
                  2. بینک یا JazzCash ٹرانزیکشن ID (Anti-Double-Billing TID):
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: TID-9821849201 یا 1Link Ref"
                  placeholderTextColor="#64748B"
                  value={payTransactionId}
                  onChangeText={setPayTransactionId}
                />
                <Text style={styles.inputHelp}>
                  * ٹرانزیکشن آئی ڈی محفوظ رکھنے سے بجلی کمپنی کاؤنٹر پر واجبات کا دعویٰ نہیں کر سکتی۔
                </Text>

                {/* Paid By Name */}
                <Text style={styles.inputSectionTitle}>3. کس نے ادا کیا؟ (Paid By):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="محمد سعد / والد صاحب"
                  placeholderTextColor="#64748B"
                  value={paidByName}
                  onChangeText={setPaidByName}
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
                        ادائیگی محفوظ کریں اور والٹ میں شامل کریں
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= 8. ADD NEW BILL MODAL ================= */}
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
                    <Text style={styles.sheetTitle}>نیا یوٹیلیٹی بل شامل کریں</Text>
                    <Text style={styles.sheetSub}>
                      بجلی، گیس، واسا یا انٹرنیٹ بل کی تفصیل درج کریں
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sheetCloseBtn}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                  {/* Pakistani Provider Presets */}
                  <Text style={styles.inputSectionTitle}>مشہور پاکستانی ادارے منتخب کریں:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    {PAKISTANI_PROVIDER_PRESETS.map((p, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetChip,
                          addProviderName === p.name && styles.presetChipActive,
                        ]}
                        onPress={() => {
                          setAddProviderName(p.name);
                          setAddProviderType(p.type);
                          if (addAmount) {
                            const num = parseFloat(addAmount);
                            if (!isNaN(num)) {
                              setAddSurcharge(Math.round(num * p.defaultSurchargePct).toString());
                            }
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            addProviderName === p.name && styles.presetChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Provider Name Input */}
                  <Text style={styles.inputSectionTitle}>ادارے کا نام (Provider Name):</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="LESCO / SNGPL / WASA / Nayatel"
                    placeholderTextColor="#64748B"
                    value={addProviderName}
                    onChangeText={setAddProviderName}
                  />

                  {/* Consumer Reference Number */}
                  <Text style={styles.inputSectionTitle}>
                    14-ہندسوں کا کنزیومر / ریفرنس نمبر (Consumer ID):
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="04 11524 0849200 U"
                    placeholderTextColor="#64748B"
                    value={addConsumerNo}
                    onChangeText={setAddConsumerNo}
                  />

                  {/* Meter Number */}
                  <Text style={styles.inputSectionTitle}>میٹر نمبر (اختیاری):</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="MTR-77291"
                    placeholderTextColor="#64748B"
                    value={addMeterNo}
                    onChangeText={setAddMeterNo}
                  />

                  {/* Amounts Row */}
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>بل کی رقم (روپے):</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="18450"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={addAmount}
                        onChangeText={handleAmountChange}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSectionTitle}>لیٹ فیس سرچارج:</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="1650"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={addSurcharge}
                        onChangeText={setAddSurcharge}
                      />
                    </View>
                  </View>

                  {/* Due Date (Days Ahead Selector) */}
                  <Text style={styles.inputSectionTitle}>
                    آخری تاریخ (کتنے دن بعد واجب الادا ہے؟):
                  </Text>
                  <View style={styles.daysAheadRow}>
                    {['2', '3', '5', '7', '10', '15'].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayAheadChip,
                          addDueDaysAhead === d && styles.dayAheadChipActive,
                        ]}
                        onPress={() => setAddDueDaysAhead(d)}
                      >
                        <Text
                          style={[
                            styles.dayAheadText,
                            addDueDaysAhead === d && styles.dayAheadTextActive,
                          ]}
                        >
                          {d} دن بعد
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Notes */}
                  <Text style={styles.inputSectionTitle}>اضافی نوٹس (اختیاری):</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="اوپر والی منزل کا سب میٹر حصہ شامل ہے..."
                    placeholderTextColor="#64748B"
                    value={addNotes}
                    onChangeText={setAddNotes}
                  />

                  {/* Submit Add Bill */}
                  <TouchableOpacity
                    style={[styles.confirmAddBtn, addSubmitting && { opacity: 0.6 }]}
                    onPress={handleCreateBill}
                    disabled={addSubmitting}
                    activeOpacity={0.85}
                  >
                    {addSubmitting ? (
                      <ActivityIndicator size="small" color="#070d18" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={18} color="#070d18" />
                        <Text style={styles.confirmAddBtnText}>بل محفوظ کریں اور ٹریک کریں</Text>
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
    backgroundColor: '#00d49f',
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
  // Metric Deck
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
  metricCardRisk: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  metricCardSafe: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  metricCardUnpaid: {
    borderColor: 'rgba(245, 158, 11, 0.3)',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  metricCardPaid: {
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
  // Tabs
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
    backgroundColor: '#00d49f',
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
  // Provider Chips
  providerChipsContainer: {
    gap: 8,
    paddingVertical: 2,
  },
  providerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  providerChipActive: {
    backgroundColor: '#00d49f',
    borderColor: '#00d49f',
  },
  providerChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  providerChipTextActive: {
    color: '#070d18',
    fontWeight: 'bold',
  },
  // Empty State
  emptyCard: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    marginTop: 16,
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
    backgroundColor: '#00d49f',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Bill Cards
  billsList: {
    gap: 12,
  },
  billCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
  },
  billCardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  billCardDueTomorrow: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  billCardPaid: {
    borderColor: 'rgba(0, 212, 159, 0.25)',
  },
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billCardProviderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  providerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  consumerNumber: {
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
  // Meta Row
  billMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#09111e',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  billMetaCol: {
    flex: 1,
  },
  billMetaLabel: {
    color: '#64748B',
    fontSize: 9,
  },
  billMetaVal: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  // Amount Breakdown
  amountBreakdownCard: {
    backgroundColor: '#070d18',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  amountMain: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 2,
  },
  surchargeWarningLabel: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
  },
  surchargeVal: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  surchargeSub: {
    color: '#F87171',
    fontSize: 9,
    marginTop: 1,
  },
  paidViaLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  paidViaVal: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  paidTidVal: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 1,
  },
  paidProofStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.2)',
    padding: 7,
    borderRadius: 8,
    marginBottom: 10,
  },
  paidProofText: {
    color: '#00d49f',
    fontSize: 10,
    flex: 1,
  },
  // Card Actions
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
    backgroundColor: '#00d49f',
    paddingVertical: 9,
    borderRadius: 9,
  },
  payBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shareReceiptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    paddingVertical: 9,
    borderRadius: 9,
  },
  shareReceiptBtnText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteMiniBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  // Modals / Sheets
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
    color: '#00d49f',
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
  inputHelp: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 4,
    marginBottom: 6,
  },
  confirmPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00d49f',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  confirmPayBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Add Bill Specific
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
    backgroundColor: '#00d49f',
    borderColor: '#00d49f',
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
    backgroundColor: '#00d49f',
    borderColor: '#00d49f',
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
    backgroundColor: '#00d49f',
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
  hubSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 3,
    gap: 4,
  },
  hubSegmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 6,
  },
  hubSegmentTabActive: {
    backgroundColor: '#1e293b',
  },
  hubSegmentTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  hubSegmentTabTextActive: {
    color: '#38BDF8',
  },
});
