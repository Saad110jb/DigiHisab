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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  householdVaultApi,
  IVaultAccount,
  ISavingsBucket,
  IHouseholdIncomeRecord,
  IHouseholdSolvencyReport,
  IncomeSourceType,
  VaultAccountType,
} from '../api/householdVault.api';

interface HouseholdIncomeVaultModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

type MainTab = 'INCOME' | 'VAULTS' | 'SAVINGS' | 'SOLVENCY';

const INCOME_SOURCE_PRESETS: {
  type: IncomeSourceType;
  labelEn: string;
  labelUrdu: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    type: 'SALARY',
    labelEn: 'Primary Salary',
    labelUrdu: 'ملازمت / ماہانہ تنخواہ',
    icon: 'briefcase-outline',
    color: '#00d49f',
  },
  {
    type: 'SHOP_PROFIT_DRAWING',
    labelEn: 'Shop Profit Drawing',
    labelUrdu: 'دکان کا ذاتی منافع / نکلوائی',
    icon: 'storefront-outline',
    color: '#38bdf8',
  },
  {
    type: 'RENTAL_YIELD',
    labelEn: 'Rental Property Yield',
    labelUrdu: 'کرایہ مکان یا پلاٹ',
    icon: 'home-outline',
    color: '#a855f7',
  },
  {
    type: 'FOREIGN_REMITTANCE',
    labelEn: 'Foreign Remittance',
    labelUrdu: 'بیرونِ ملک ترسیلات',
    icon: 'airplane-outline',
    color: '#f59e0b',
  },
  {
    type: 'AGRICULTURE',
    labelEn: 'Agricultural Yield',
    labelUrdu: 'زرعی فصل و اجناس آمدن',
    icon: 'leaf-outline',
    color: '#84cc16',
  },
  {
    type: 'FREELANCE_TUITION',
    labelEn: 'Freelance / Tuition',
    labelUrdu: 'ٹیوشن و فری لانس آمدن',
    icon: 'laptop-outline',
    color: '#ec4899',
  },
  {
    type: 'OTHER',
    labelEn: 'Other Inflow',
    labelUrdu: 'دیگر گھریلو آمدن',
    icon: 'wallet-outline',
    color: '#94a3b8',
  },
];

const VAULT_TYPE_META: Record<
  VaultAccountType,
  { labelUrdu: string; icon: keyof typeof Ionicons.glyphMap; color: string; badge: string }
> = {
  PHYSICAL_CASH_SAFE: {
    labelUrdu: 'گھریلو نقدی / دراز',
    icon: 'cash-outline',
    color: '#00d49f',
    badge: 'Unbanked Float',
  },
  COMMERCIAL_BANK: {
    labelUrdu: 'کمرشل بینک اکاؤنٹ',
    icon: 'business-outline',
    color: '#38bdf8',
    badge: '1Link / Raast',
  },
  MOBILE_WALLET: {
    labelUrdu: 'موبائل والٹ',
    icon: 'phone-portrait-outline',
    color: '#f59e0b',
    badge: 'Digital Cash',
  },
  DIGITAL_GOLD: {
    labelUrdu: 'گولڈ و سونا سیونگز',
    icon: 'cube-outline',
    color: '#eab308',
    badge: '24K Liquid Asset',
  },
};

const SAVINGS_CATEGORY_META: Record<
  ISavingsBucket['category'],
  { labelUrdu: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  EMERGENCY_MEDICAL: {
    labelUrdu: 'ہنگامی طبی فنڈ',
    icon: 'medkit-outline',
    color: '#ef4444',
  },
  QURBANI_EID: {
    labelUrdu: 'قربانی و عید سیونگز',
    icon: 'ribbon-outline',
    color: '#f59e0b',
  },
  KAMETI_POOL: {
    labelUrdu: 'کمیٹی و بی سی سرمایہ کاری',
    icon: 'people-outline',
    color: '#a855f7',
  },
  HOME_REPAIR: {
    labelUrdu: 'مرمت و دیکھ بھال فنڈ',
    icon: 'construct-outline',
    color: '#38bdf8',
  },
  CHILD_EDUCATION: {
    labelUrdu: 'بچوں کی اعلیٰ تعلیم فنڈ',
    icon: 'school-outline',
    color: '#00d49f',
  },
};

export const HouseholdIncomeVaultModal: React.FC<HouseholdIncomeVaultModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<MainTab>('SOLVENCY');

  // Core Data
  const [vaultAccounts, setVaultAccounts] = useState<IVaultAccount[]>([]);
  const [savingsBuckets, setSavingsBuckets] = useState<ISavingsBucket[]>([]);
  const [incomeRecords, setIncomeRecords] = useState<IHouseholdIncomeRecord[]>([]);
  const [solvencyReport, setSolvencyReport] = useState<IHouseholdSolvencyReport | null>(null);

  // Sub-modal states
  const [showLogIncomeModal, setShowLogIncomeModal] = useState<boolean>(false);
  const [showAddVaultModal, setShowAddVaultModal] = useState<boolean>(false);
  const [showAdjustVaultModal, setShowAdjustVaultModal] = useState<IVaultAccount | null>(null);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showAddBucketModal, setShowAddBucketModal] = useState<boolean>(false);
  const [showDepositBucketModal, setShowDepositBucketModal] = useState<ISavingsBucket | null>(null);

  // Log Income Form States
  const [incomeSource, setIncomeSource] = useState<IncomeSourceType>('SALARY');
  const [incomeTitle, setIncomeTitle] = useState<string>('ماہانہ تنخواہ (Primary Salary)');
  const [incomeAmount, setIncomeAmount] = useState<string>('');
  const [incomeDestVaultId, setIncomeDestVaultId] = useState<string>('');
  const [incomeRecurring, setIncomeRecurring] = useState<boolean>(true);
  const [incomeNotes, setIncomeNotes] = useState<string>('');

  // Add Vault Form States
  const [newVaultTitle, setNewVaultTitle] = useState<string>('');
  const [newVaultType, setNewVaultType] = useState<VaultAccountType>('COMMERCIAL_BANK');
  const [newVaultInstitution, setNewVaultInstitution] = useState<string>('');
  const [newVaultIdentifier, setNewVaultIdentifier] = useState<string>('');
  const [newVaultBalance, setNewVaultBalance] = useState<string>('');

  // Adjust Balance Form States
  const [adjustBalanceVal, setAdjustBalanceVal] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Inter-Vault Transfer States
  const [transferFromVaultId, setTransferFromVaultId] = useState<string>('');
  const [transferToVaultId, setTransferToVaultId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');

  // Add Bucket Form States
  const [newBucketTitle, setNewBucketTitle] = useState<string>('');
  const [newBucketCategory, setNewBucketCategory] = useState<ISavingsBucket['category']>('EMERGENCY_MEDICAL');
  const [newBucketTarget, setNewBucketTarget] = useState<string>('');
  const [newBucketMonthly, setNewBucketMonthly] = useState<string>('');

  // Deposit into Bucket States
  const [depositSourceVaultId, setDepositSourceVaultId] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await householdVaultApi.getOverview();
      setVaultAccounts(data.vaultAccounts || []);
      setSavingsBuckets(data.savingsBuckets || []);
      setIncomeRecords(data.incomeRecords || []);
      setSolvencyReport(data.solvencyReport || null);

      if (data.vaultAccounts && data.vaultAccounts.length > 0) {
        if (!incomeDestVaultId) setIncomeDestVaultId(data.vaultAccounts[0].id);
        if (!transferFromVaultId) setTransferFromVaultId(data.vaultAccounts[0].id);
        if (!transferToVaultId && data.vaultAccounts.length > 1) {
          setTransferToVaultId(data.vaultAccounts[1].id);
        }
        if (!depositSourceVaultId) setDepositSourceVaultId(data.vaultAccounts[0].id);
      }
    } catch (err: any) {
      console.error('[HouseholdIncomeVaultModal] Load error:', err);
      Alert.alert('خرابی', 'آمدن و والٹ کا ڈیٹا حاصل نہیں ہو سکا۔');
    } finally {
      setLoading(false);
    }
  }, [incomeDestVaultId, transferFromVaultId, transferToVaultId, depositSourceVaultId]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
    else Alert.alert('ڈیجی حساب', msg);
  };

  // 1. Submit New Income Record
  const handleLogIncomeSubmit = async () => {
    const num = parseFloat(incomeAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('انتباہ', 'براہ کرم آمدنی کی درست رقم درج کریں۔');
      return;
    }
    if (!incomeTitle.trim()) {
      Alert.alert('انتباہ', 'آمدنی کا عنوان یا تفصیل لکھیں۔');
      return;
    }
    if (!incomeDestVaultId) {
      Alert.alert('انتباہ', 'رقم منتقل کرنے کے لیے والٹ اکاؤنٹ منتخب کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      const res = await householdVaultApi.logIncome({
        sourceType: incomeSource,
        title: incomeTitle.trim(),
        amount: num,
        depositedToAccountId: incomeDestVaultId,
        isRecurringMonthly: incomeRecurring,
        notes: incomeNotes.trim(),
      });

      notify(
        `آمدن بحساب ${incomeTitle} (Rs. ${num.toLocaleString()}) والٹ میں جمع ہو گئی ہے۔`
      );
      setShowLogIncomeModal(false);
      setIncomeAmount('');
      setIncomeNotes('');
      await loadData();
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || err.message || 'آمدن لاگ نہیں ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit New Vault Account
  const handleAddVaultSubmit = async () => {
    if (!newVaultTitle.trim() || !newVaultInstitution.trim()) {
      Alert.alert('انتباہ', 'اکاؤنٹ کا نام اور ادارے کا نام درج کرنا ضروری ہے۔');
      return;
    }
    const balance = parseFloat(newVaultBalance) || 0;

    try {
      setSubmitting(true);
      await householdVaultApi.createVaultAccount({
        accountTitle: newVaultTitle.trim(),
        accountType: newVaultType,
        institutionName: newVaultInstitution.trim(),
        accountIdentifier: newVaultIdentifier.trim(),
        currentBalance: balance,
      });

      notify(`نیا والٹ اکاؤنٹ ${newVaultTitle} شامل کر دیا گیا ہے۔`);
      setShowAddVaultModal(false);
      setNewVaultTitle('');
      setNewVaultInstitution('');
      setNewVaultIdentifier('');
      setNewVaultBalance('');
      await loadData();
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || err.message || 'والٹ نہیں بن سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Adjust Vault Balance
  const handleAdjustBalanceSubmit = async () => {
    if (!showAdjustVaultModal) return;
    const num = parseFloat(adjustBalanceVal);
    if (isNaN(num) || num < 0) {
      Alert.alert('انتباہ', 'درست بیلنس درج کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      await householdVaultApi.adjustVaultBalance(showAdjustVaultModal.id, {
        newBalance: num,
        reason: adjustReason.trim(),
      });

      notify(`${showAdjustVaultModal.accountTitle} کا بیلنس کامیابی سے درست ہو گیا۔`);
      setShowAdjustVaultModal(null);
      setAdjustBalanceVal('');
      setAdjustReason('');
      await loadData();
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || err.message || 'بیلنس اپڈیٹ نہیں ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Inter-Vault Transfer Submit
  const handleTransferSubmit = async () => {
    const num = parseFloat(transferAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('انتباہ', 'منتقلی کے لیے درست رقم درج کریں۔');
      return;
    }
    if (!transferFromVaultId || !transferToVaultId) {
      Alert.alert('انتباہ', 'ماخذ اور منزل والٹ منتخب کریں۔');
      return;
    }
    if (transferFromVaultId === transferToVaultId) {
      Alert.alert('انتباہ', 'ماخذ اور منزل والٹ اکاؤنٹ ایک جیسے نہیں ہو سکتے۔');
      return;
    }

    try {
      setSubmitting(true);
      await householdVaultApi.transferBetweenVaults({
        fromVaultId: transferFromVaultId,
        toVaultId: transferToVaultId,
        amount: num,
        notes: transferNotes.trim(),
      });

      notify(`Rs. ${num.toLocaleString()} کامیابی سے منتقل ہو گئے۔`);
      setShowTransferModal(false);
      setTransferAmount('');
      setTransferNotes('');
      await loadData();
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || err.message || 'رقم منتقل نہیں ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Submit New Savings Bucket
  const handleAddBucketSubmit = async () => {
    if (!newBucketTitle.trim()) {
      Alert.alert('انتباہ', 'بچت فنڈ کا عنوان درج کریں۔');
      return;
    }
    const target = parseFloat(newBucketTarget);
    if (isNaN(target) || target <= 0) {
      Alert.alert('انتباہ', 'کل ہدف کی رقم درج کریں۔');
      return;
    }
    const monthly = parseFloat(newBucketMonthly) || 0;

    try {
      setSubmitting(true);
      await householdVaultApi.createSavingsBucket({
        title: newBucketTitle.trim(),
        category: newBucketCategory,
        targetAmount: target,
        monthlyDepositTarget: monthly,
      });

      notify(`نیا بچت فنڈ "${newBucketTitle}" قائم ہو گیا۔`);
      setShowAddBucketModal(false);
      setNewBucketTitle('');
      setNewBucketTarget('');
      setNewBucketMonthly('');
      await loadData();
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || err.message || 'بچت فنڈ نہیں بن سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Deposit to Savings Bucket
  const handleDepositBucketSubmit = async () => {
    if (!showDepositBucketModal) return;
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('انتباہ', 'فنڈ میں جمع کرنے کی درست رقم درج کریں۔');
      return;
    }
    if (!depositSourceVaultId) {
      Alert.alert('انتباہ', 'رقم کٹوتی کے لیے ماخذ والٹ منتخب کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      await householdVaultApi.depositToSavingsBucket(showDepositBucketModal.id, {
        sourceVaultAccountId: depositSourceVaultId,
        amount: num,
      });

      notify(`Rs. ${num.toLocaleString()} بچت فنڈ "${showDepositBucketModal.title}" میں جمع ہو گئے۔`);
      setShowDepositBucketModal(null);
      setDepositAmount('');
      await loadData();
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || err.message || 'فنڈ میں رقم منتقل نہیں ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Share Solvency Summary on WhatsApp
  const handleShareSolvency = async () => {
    if (!solvencyReport) return;
    const isSolvent = solvencyReport.isSolvent;
    const statusEmoji = isSolvent ? '🟢' : '🔴';
    const statusText = isSolvent
      ? `محفوظ و مستحکم بجٹ (سرپلس: Rs. ${solvencyReport.netFreeCashflow.toLocaleString()})`
      : `خسارے کا خطرہ (خسارہ: Rs. ${solvencyReport.deficitAmount.toLocaleString()})`;

    const text = `📊 *ڈیجی حساب — گھریلو لیکویڈیٹی و بجٹ رپورٹ*
---------------------------------
🏦 *کل دستیاب کیش و والٹس*: Rs. ${solvencyReport.totalLiquidCapital.toLocaleString()}
💵 *اس ماہ کی آمدن*: Rs. ${solvencyReport.totalMonthlyIncome.toLocaleString()}
🎯 *محفوظ بچت فنڈز*: Rs. ${solvencyReport.totalLockedSavings.toLocaleString()}
🛒 *ماہانہ مختص اخراجات*: Rs. ${solvencyReport.totalCommittedEnvelopes.toLocaleString()}
---------------------------------
${statusEmoji} *بجٹ کی حتمی کیفیت*: ${statusText}
⏳ *لیکویڈیٹی رن وے*: ${solvencyReport.runwayDays} دن

📑 *اخراجات کی تفصیل*:
• راشن و کریانہ: Rs. ${solvencyReport.breakdown.rashanCommitment.toLocaleString()}
• یوٹیلیٹی بلز: Rs. ${solvencyReport.breakdown.utilityBillsCommitment.toLocaleString()}
• بچوں کی فیس: Rs. ${solvencyReport.breakdown.schoolFeesCommitment.toLocaleString()}
• ملازمہ تنخواہ: Rs. ${solvencyReport.breakdown.maidSalaryCommitment.toLocaleString()}
• دودھ و روٹی: Rs. ${solvencyReport.breakdown.milkBreadCommitment.toLocaleString()}
• بچت ہدف: Rs. ${solvencyReport.breakdown.savingsCommitment.toLocaleString()}
---------------------------------
✅ DigiHisab Domestic Ledger • خاندانی مالی تحفظ`;

    try {
      await Share.share({ message: text });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}
      >
        {/* ================= 1. HEADER BAR ================= */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="shield-checkmark" size={18} color="#00d49f" />
              <Text style={styles.headerTitle}>آمدن، بینک والٹ و بچت کھاتہ</Text>
            </View>
            <Text style={styles.headerSub}>Household Income, Bank Vaults & Solvency Engine</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadData} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color="#00d49f" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00d49f" />
            <Text style={styles.loadingText}>والٹس اور آمدنی کا تخمینہ لوڈ ہو رہا ہے...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= 2. TOP LIQUIDITY OVERVIEW STRIP (4 METRIC BLOCKS) ================= */}
            {/* Strictly adhering to: grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-[#09111e] rounded-2xl border border-[#17233b] */}
            <View style={styles.liquidityStrip}>
              {/* Metric 1: Total Liquid Funds */}
              <View style={styles.metricBlock}>
                <View style={styles.metricLabelRow}>
                  <Ionicons name="cash" size={13} color="#00d49f" />
                  <Text style={styles.metricLabel}>کل دستیاب رقم</Text>
                </View>
                <Text style={[styles.metricValue, { color: '#00d49f' }]}>
                  Rs. {solvencyReport?.totalLiquidCapital.toLocaleString() || '0'}
                </Text>
                <Text style={styles.metricSub}>نقد، بینک و والٹس</Text>
              </View>

              {/* Metric 2: Monthly Income */}
              <View style={styles.metricBlock}>
                <View style={styles.metricLabelRow}>
                  <Ionicons name="trending-up" size={13} color="#ffffff" />
                  <Text style={styles.metricLabel}>اس ماہ کی آمدن</Text>
                </View>
                <Text style={[styles.metricValue, { color: '#ffffff' }]}>
                  Rs. {solvencyReport?.totalMonthlyIncome.toLocaleString() || '0'}
                </Text>
                <Text style={styles.metricSub}>تنخواہ، کرایہ، منافع</Text>
              </View>

              {/* Metric 3: Locked Savings */}
              <View style={styles.metricBlock}>
                <View style={styles.metricLabelRow}>
                  <Ionicons name="lock-closed" size={13} color="#0ea5e9" />
                  <Text style={styles.metricLabel}>محفوظ فنڈز</Text>
                </View>
                <Text style={[styles.metricValue, { color: '#0ea5e9' }]}>
                  Rs. {solvencyReport?.totalLockedSavings.toLocaleString() || '0'}
                </Text>
                <Text style={styles.metricSub}>طبی، قربانی، کمیٹی</Text>
              </View>

              {/* Metric 4: Committed Budget */}
              <View style={styles.metricBlock}>
                <View style={styles.metricLabelRow}>
                  <Ionicons name="calendar" size={13} color="#f59e0b" />
                  <Text style={styles.metricLabel}>مختص اخراجات</Text>
                </View>
                <Text style={[styles.metricValue, { color: '#f59e0b' }]}>
                  Rs. {solvencyReport?.totalCommittedEnvelopes.toLocaleString() || '0'}
                </Text>
                <Text style={styles.metricSub}>راشن، بلز، فیس</Text>
              </View>
            </View>

            {/* ================= 3. SCROLLABLE TOUCH-TAB NAVIGATION ================= */}
            <View style={styles.tabScrollWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.touchScrollStrip}
              >
                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'SOLVENCY' && styles.touchTabActive]}
                  onPress={() => setActiveTab('SOLVENCY')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="pie-chart-outline"
                    size={16}
                    color={activeTab === 'SOLVENCY' ? '#00d49f' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'SOLVENCY' && styles.touchTabTextActive,
                    ]}
                  >
                    📊 بجٹ جانچ و لیکویڈیٹی
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'INCOME' && styles.touchTabActive]}
                  onPress={() => setActiveTab('INCOME')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={activeTab === 'INCOME' ? '#00d49f' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'INCOME' && styles.touchTabTextActive,
                    ]}
                  >
                    💵 آمدن لاگ کریں ({incomeRecords.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'VAULTS' && styles.touchTabActive]}
                  onPress={() => setActiveTab('VAULTS')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={activeTab === 'VAULTS' ? '#00d49f' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'VAULTS' && styles.touchTabTextActive,
                    ]}
                  >
                    🏦 بینک و کیش والٹس ({vaultAccounts.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'SAVINGS' && styles.touchTabActive]}
                  onPress={() => setActiveTab('SAVINGS')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="golf-outline"
                    size={16}
                    color={activeTab === 'SAVINGS' ? '#00d49f' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'SAVINGS' && styles.touchTabTextActive,
                    ]}
                  >
                    🎯 بچت و ہنگامی فنڈز ({savingsBuckets.length})
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* ================= TAB 4: SOLVENCY & BUDGET RUNWAY (DEFAULT) ================= */}
            {activeTab === 'SOLVENCY' && solvencyReport && (
              <View style={styles.tabContent}>
                {/* 1. Glowing Solvency Status Banner */}
                {solvencyReport.isSolvent ? (
                  <View style={styles.solvencySurplusCard}>
                    <View style={styles.solvencyHeaderRow}>
                      <View style={styles.solvencyBadgeIcon}>
                        <Ionicons name="shield-checkmark" size={24} color="#00d49f" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.solvencySurplusTitle}>
                          محفوظ بجٹ: Rs. {solvencyReport.netFreeCashflow.toLocaleString()} بچت کی گنجائش موجود ہے
                        </Text>
                        <Text style={styles.solvencySurplusSub}>
                          (Solvent & Financially Stable • گھر کے تمام ضروری اخراجات بآسانی پورے ہو سکتے ہیں)
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.solvencyDeficitCard}>
                    <View style={styles.solvencyHeaderRow}>
                      <View style={[styles.solvencyBadgeIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                        <Ionicons name="warning" size={24} color="#ef4444" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.solvencyDeficitTitle}>
                          خطرے کا الرٹ: مختص کردہ گھریلو اخراجات دستیاب رقم سے Rs. {solvencyReport.deficitAmount.toLocaleString()} زیادہ ہیں
                        </Text>
                        <Text style={styles.solvencyDeficitSub}>
                          (Deficit Hazard • فوری طور پر غیر ضروری خرچے محدود کریں یا آمدن بڑھائیں)
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 2. Runway Metric Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleWrap}>
                      <Ionicons name="hourglass-outline" size={18} color="#0ea5e9" />
                      <Text style={styles.cardTitle}>گھریلو لیکویڈیٹی رن وے (Runway Radar)</Text>
                    </View>
                    <View style={styles.runwayDaysPill}>
                      <Text style={styles.runwayDaysPillText}>{solvencyReport.runwayDays} دن محفوظ</Text>
                    </View>
                  </View>

                  <Text style={styles.runwayExplanation}>
                    اگر کوئی نئی آمدن نہ بھی آئے، تو موجودہ کیش و بینک والٹس (Rs. {solvencyReport.totalLiquidCapital.toLocaleString()}) کی بنیاد پر آپ کا خاندان تقریباً <Text style={{ color: '#00d49f', fontWeight: 'bold' }}>{solvencyReport.runwayDays} دن</Text> تک معمول کے اخراجات چلا سکتا ہے۔
                  </Text>
                </View>

                {/* 3. Financial Formulas Breakdown */}
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardTitleWrap}>
                      <Ionicons name="calculator-outline" size={18} color="#a855f7" />
                      <Text style={styles.cardTitle}>حسابی فارمولا و تفصیلی تجزیہ</Text>
                    </View>
                  </View>

                  <View style={styles.formulaEquationCard}>
                    <Text style={styles.formulaEquationText}>
                      آزاد لیکویڈیٹی = (کل دستیاب والٹس + ماہانہ آمدن) − مختص اخراجات
                    </Text>
                    <Text style={styles.formulaEquationMath}>
                      Rs. {solvencyReport.netFreeCashflow.toLocaleString()} = (Rs. {solvencyReport.totalLiquidCapital.toLocaleString()} + Rs. {solvencyReport.totalMonthlyIncome.toLocaleString()}) − Rs. {solvencyReport.totalCommittedEnvelopes.toLocaleString()}
                    </Text>
                  </View>

                  {/* Committed Envelopes List */}
                  <Text style={styles.subHeading}>ماہانہ مختص اخراجات کا بریک ڈاؤن (Committed Envelopes):</Text>
                  <View style={styles.envelopeList}>
                    <View style={styles.envelopeRow}>
                      <View style={styles.envelopeLeft}>
                        <Ionicons name="cart-outline" size={16} color="#00d49f" />
                        <Text style={styles.envelopeName}>راشن، کریانہ و منڈی سبزی</Text>
                      </View>
                      <Text style={styles.envelopeVal}>
                        Rs. {solvencyReport.breakdown.rashanCommitment.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.envelopeRow}>
                      <View style={styles.envelopeLeft}>
                        <Ionicons name="flash-outline" size={16} color="#f59e0b" />
                        <Text style={styles.envelopeName}>بجلی، گیس، پانی و انٹرنیٹ بلز</Text>
                      </View>
                      <Text style={styles.envelopeVal}>
                        Rs. {solvencyReport.breakdown.utilityBillsCommitment.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.envelopeRow}>
                      <View style={styles.envelopeLeft}>
                        <Ionicons name="school-outline" size={16} color="#38bdf8" />
                        <Text style={styles.envelopeName}>بچوں کی اسکول، وین و اکیڈمی فیس</Text>
                      </View>
                      <Text style={styles.envelopeVal}>
                        Rs. {solvencyReport.breakdown.schoolFeesCommitment.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.envelopeRow}>
                      <View style={styles.envelopeLeft}>
                        <Ionicons name="water-outline" size={16} color="#a855f7" />
                        <Text style={styles.envelopeName}>دودھ و تندور روٹی کا ماہانہ کھاتہ</Text>
                      </View>
                      <Text style={styles.envelopeVal}>
                        Rs. {solvencyReport.breakdown.milkBreadCommitment.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.envelopeRow}>
                      <View style={styles.envelopeLeft}>
                        <Ionicons name="people-outline" size={16} color="#ec4899" />
                        <Text style={styles.envelopeName}>ملازمہ، کوک و ڈرائیور تنخواہیں</Text>
                      </View>
                      <Text style={styles.envelopeVal}>
                        Rs. {solvencyReport.breakdown.maidSalaryCommitment.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.envelopeRow}>
                      <View style={styles.envelopeLeft}>
                        <Ionicons name="golf-outline" size={16} color="#0ea5e9" />
                        <Text style={styles.envelopeName}>محفوظ بچت و ہنگامی فنڈز ہدف</Text>
                      </View>
                      <Text style={styles.envelopeVal}>
                        Rs. {solvencyReport.breakdown.savingsCommitment.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 4. WhatsApp Share Action */}
                <TouchableOpacity
                  style={styles.whatsappShareBtn}
                  onPress={handleShareSolvency}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  <Text style={styles.whatsappShareBtnText}>
                    بجٹ رپورٹ واٹس ایپ پر شیئر کریں (Share Liquidity Statement)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 1: LOG INCOME (آمدن لاگ کریں) ================= */}
            {activeTab === 'INCOME' && (
              <View style={styles.tabContent}>
                {/* Header Action Button */}
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setShowLogIncomeModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#070d18" />
                  <Text style={styles.primaryActionBtnText}>نئی آمدن لاگ کریں (Log Income Voucher)</Text>
                </TouchableOpacity>

                {/* Incomes List */}
                <Text style={styles.sectionHeaderTitle}>ریکارڈ شدہ آمدن کی تاریخ (Income Cash Receipts)</Text>
                {incomeRecords.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="wallet-outline" size={36} color="#64748b" />
                    <Text style={styles.emptyCardText}>ابھی کوئی آمدن لاگ نہیں ہوئی۔</Text>
                  </View>
                ) : (
                  incomeRecords.map((inc) => {
                    const preset = INCOME_SOURCE_PRESETS.find((p) => p.type === inc.sourceType) || INCOME_SOURCE_PRESETS[0];
                    const destVault = vaultAccounts.find((v) => v.id === inc.depositedToAccountId);

                    return (
                      <View key={inc.id} style={styles.incomeRecordCard}>
                        <View style={styles.incomeRecordTop}>
                          <View
                            style={[
                              styles.incomeIconWrap,
                              { backgroundColor: preset.color + '22', borderColor: preset.color + '55' },
                            ]}
                          >
                            <Ionicons name={preset.icon} size={20} color={preset.color} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={styles.incomeTitleRow}>
                              <Text style={styles.incomeRecordTitle} numberOfLines={1}>
                                {inc.title}
                              </Text>
                              {inc.isRecurringMonthly && (
                                <View style={styles.recurringPill}>
                                  <Text style={styles.recurringPillText}>ماہانہ باقاعدہ</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.incomeSourceSub}>{preset.labelUrdu}</Text>
                          </View>
                          <Text style={styles.incomeRecordAmount}>
                            +Rs. {inc.amount.toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.incomeRecordFooter}>
                          <View style={styles.crvPill}>
                            <Text style={styles.crvPillText}>{inc.crvNumber || 'CRV-AUTO'}</Text>
                          </View>
                          <View style={styles.destVaultPill}>
                            <Ionicons name="arrow-forward" size={11} color="#38bdf8" />
                            <Text style={styles.destVaultPillText} numberOfLines={1}>
                              {destVault ? destVault.accountTitle : 'نامعلوم والٹ'}
                            </Text>
                          </View>
                          <Text style={styles.incomeDateText}>
                            {new Date(inc.dateReceived).toLocaleDateString('ur-PK', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* ================= TAB 2: VAULT ACCOUNTS (بینک و کیش والٹس) ================= */}
            {activeTab === 'VAULTS' && (
              <View style={styles.tabContent}>
                <View style={styles.rowBtns}>
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { flex: 1 }]}
                    onPress={() => setShowAddVaultModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#070d18" />
                    <Text style={styles.primaryActionBtnText}>نیا اکاؤنٹ / والٹ شامل کریں</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryActionBtn, { flex: 1 }]}
                    onPress={() => setShowTransferModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="swap-horizontal-outline" size={18} color="#38bdf8" />
                    <Text style={styles.secondaryActionBtnText}>والٹ ٹرانسفر (Inter-Vault)</Text>
                  </TouchableOpacity>
                </View>

                {/* 4 Isolated Vault Categories Cards */}
                {vaultAccounts.map((vault) => {
                  const meta = VAULT_TYPE_META[vault.accountType] || VAULT_TYPE_META.PHYSICAL_CASH_SAFE;

                  return (
                    <View key={vault.id} style={styles.vaultCard}>
                      <View style={styles.vaultCardHeader}>
                        <View
                          style={[
                            styles.vaultIconWrap,
                            { backgroundColor: meta.color + '22', borderColor: meta.color + '55' },
                          ]}
                        >
                          <Ionicons name={meta.icon} size={22} color={meta.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={styles.vaultTitleRow}>
                            <Text style={styles.vaultTitle} numberOfLines={1}>
                              {vault.accountTitle}
                            </Text>
                            <View style={[styles.vaultBadgePill, { borderColor: meta.color + '44' }]}>
                              <Text style={[styles.vaultBadgePillText, { color: meta.color }]}>
                                {meta.badge}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.vaultInstitution}>
                            {vault.institutionName}
                            {vault.accountIdentifier ? ` • ${vault.accountIdentifier}` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Vault Balance Display */}
                      <View style={styles.vaultBalanceRow}>
                        <View>
                          <Text style={styles.vaultBalanceLabel}>موجودہ دستیاب بیلنس</Text>
                          <Text style={[styles.vaultBalanceValue, { color: meta.color }]}>
                            Rs. {vault.currentBalance.toLocaleString()}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.adjustBalanceBtn}
                          onPress={() => {
                            setShowAdjustVaultModal(vault);
                            setAdjustBalanceVal(String(vault.currentBalance));
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={15} color="#CBD5E1" />
                          <Text style={styles.adjustBalanceBtnText}>بیلنس ایڈجسٹ</Text>
                        </TouchableOpacity>
                      </View>

                      {vault.notes ? (
                        <Text style={styles.vaultNotesText}>💬 {vault.notes}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ================= TAB 3: SAVINGS BUCKETS (بچت و ہنگامی فنڈز) ================= */}
            {activeTab === 'SAVINGS' && (
              <View style={styles.tabContent}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setShowAddBucketModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#070d18" />
                  <Text style={styles.primaryActionBtnText}>نیا بچت یا ہنگامی فنڈ قائم کریں</Text>
                </TouchableOpacity>

                {savingsBuckets.map((bucket) => {
                  const meta = SAVINGS_CATEGORY_META[bucket.category] || SAVINGS_CATEGORY_META.EMERGENCY_MEDICAL;
                  const pct = Math.min(
                    100,
                    Math.round((bucket.currentSavedAmount / Math.max(1, bucket.targetAmount)) * 100)
                  );

                  return (
                    <View key={bucket.id} style={styles.bucketCard}>
                      <View style={styles.bucketCardTop}>
                        <View
                          style={[
                            styles.bucketIconWrap,
                            { backgroundColor: meta.color + '22', borderColor: meta.color + '55' },
                          ]}
                        >
                          <Ionicons name={meta.icon} size={22} color={meta.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.bucketTitle}>{bucket.title}</Text>
                          <Text style={styles.bucketCategorySub}>{meta.labelUrdu}</Text>
                        </View>
                        <View style={styles.pctBadge}>
                          <Text style={[styles.pctBadgeText, { color: meta.color }]}>{pct}%</Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${pct}%`, backgroundColor: meta.color },
                          ]}
                        />
                      </View>

                      {/* Amounts Info */}
                      <View style={styles.bucketAmountsRow}>
                        <View>
                          <Text style={styles.bucketAmountSub}>جمع شدہ رقم</Text>
                          <Text style={[styles.bucketCurrentVal, { color: meta.color }]}>
                            Rs. {bucket.currentSavedAmount.toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.bucketAmountSub}>کل ہدف</Text>
                          <Text style={styles.bucketTargetVal}>
                            Rs. {bucket.targetAmount.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.bucketFooterRow}>
                        <Text style={styles.monthlyTargetText}>
                          🎯 ماہانہ بچت ہدف: Rs. {bucket.monthlyDepositTarget.toLocaleString()}
                        </Text>

                        {/* 1-Tap Deposit Button */}
                        <TouchableOpacity
                          style={[styles.depositActionBtn, { backgroundColor: meta.color }]}
                          onPress={() => {
                            setShowDepositBucketModal(bucket);
                            setDepositAmount(String(bucket.monthlyDepositTarget || 5000));
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-down-circle-outline" size={15} color="#070d18" />
                          <Text style={styles.depositActionBtnText}>فنڈ میں رقم جمع کریں</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ================= SUB-MODAL 1: LOG INCOME MODAL ================= */}
        {showLogIncomeModal && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>💵 نئی آمدن لاگ کریں (Log Income Voucher)</Text>
                  <TouchableOpacity onPress={() => setShowLogIncomeModal(false)}>
                    <Ionicons name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* Source Category Picker */}
                  <Text style={styles.inputLabel}>آمدنی کا ذریعہ منتخب کریں:</Text>
                  <View style={styles.chipRow}>
                    {INCOME_SOURCE_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.type}
                        style={[
                          styles.sourceChip,
                          incomeSource === preset.type && styles.sourceChipActive,
                        ]}
                        onPress={() => {
                          setIncomeSource(preset.type);
                          setIncomeTitle(preset.labelUrdu);
                        }}
                      >
                        <Ionicons
                          name={preset.icon}
                          size={14}
                          color={incomeSource === preset.type ? '#00d49f' : '#94a3b8'}
                        />
                        <Text
                          style={[
                            styles.sourceChipText,
                            incomeSource === preset.type && styles.sourceChipTextActive,
                          ]}
                        >
                          {preset.labelUrdu}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Title Input */}
                  <Text style={styles.inputLabel}>عنوان / تفصیل:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={incomeTitle}
                    onChangeText={setIncomeTitle}
                    placeholder="مثال: ملازمت تنخواہ، گراؤنڈ فلور کرایہ"
                    placeholderTextColor="#64748b"
                  />

                  {/* Amount Input */}
                  <Text style={styles.inputLabel}>رقم (PKR):</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 18, color: '#00d49f', fontWeight: 'bold' }]}
                    value={incomeAmount}
                    onChangeText={setIncomeAmount}
                    placeholder="Rs. 50,000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  {/* Quick Amount Chips */}
                  <View style={styles.quickAmountRow}>
                    {[25000, 50000, 100000, 150000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.quickAmtBtn}
                        onPress={() => setIncomeAmount(String(amt))}
                      >
                        <Text style={styles.quickAmtBtnText}>+{amt / 1000}k</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Destination Vault Selector */}
                  <Text style={styles.inputLabel}>منتقل کرنے کا والٹ اکاؤنٹ (Deposit To):</Text>
                  <View style={styles.chipRow}>
                    {vaultAccounts.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.vaultSelectChip,
                          incomeDestVaultId === v.id && styles.vaultSelectChipActive,
                        ]}
                        onPress={() => setIncomeDestVaultId(v.id)}
                      >
                        <Ionicons
                          name="wallet-outline"
                          size={14}
                          color={incomeDestVaultId === v.id ? '#38bdf8' : '#94a3b8'}
                        />
                        <Text
                          style={[
                            styles.vaultSelectChipText,
                            incomeDestVaultId === v.id && styles.vaultSelectChipTextActive,
                          ]}
                        >
                          {v.accountTitle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Recurring Monthly Switch */}
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>ماہانہ باقاعدہ آمدن ہے؟ (Recurring Monthly)</Text>
                      <Text style={styles.switchSub}>خودکار گھریلو بجٹ کے لیے شمار ہوگا</Text>
                    </View>
                    <Switch
                      value={incomeRecurring}
                      onValueChange={setIncomeRecurring}
                      trackColor={{ false: '#1e293b', true: '#00d49f' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  {/* Notes */}
                  <Text style={styles.inputLabel}>اضافی نوٹ / رسید نمبر (اختیاری):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={incomeNotes}
                    onChangeText={setIncomeNotes}
                    placeholder="کوئی اضافی وضاحت..."
                    placeholderTextColor="#64748b"
                  />
                </ScrollView>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleLogIncomeSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>آمدن والٹ میں کریڈٹ کریں (Credit to Vault)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= SUB-MODAL 2: ADD VAULT MODAL ================= */}
        {showAddVaultModal && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>🏦 نیا والٹ / بینک اکاؤنٹ شامل کریں</Text>
                  <TouchableOpacity onPress={() => setShowAddVaultModal(false)}>
                    <Ionicons name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* Account Type Chips */}
                  <Text style={styles.inputLabel}>والٹ کی قسم منتخب کریں:</Text>
                  <View style={styles.chipRow}>
                    {(Object.keys(VAULT_TYPE_META) as VaultAccountType[]).map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.sourceChip,
                          newVaultType === t && styles.sourceChipActive,
                        ]}
                        onPress={() => setNewVaultType(t)}
                      >
                        <Text
                          style={[
                            styles.sourceChipText,
                            newVaultType === t && styles.sourceChipTextActive,
                          ]}
                        >
                          {VAULT_TYPE_META[t].labelUrdu}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>اکاؤنٹ کا نام / عنوان:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newVaultTitle}
                    onChangeText={setNewVaultTitle}
                    placeholder="مثال: Meezan Bank Current Account"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>ادارے کا نام:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newVaultInstitution}
                    onChangeText={setNewVaultInstitution}
                    placeholder="مثال: Meezan Bank, JazzCash, گھر کا دراز"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>اکاؤنٹ نمبر یا موبائل نمبر (آخری 4 ہندسے):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newVaultIdentifier}
                    onChangeText={setNewVaultIdentifier}
                    placeholder="مثال: IBAN ...8912 یا 0300-XXXXX"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>ابتدائی بیلنس (PKR):</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 16, color: '#00d49f', fontWeight: 'bold' }]}
                    value={newVaultBalance}
                    onChangeText={setNewVaultBalance}
                    placeholder="Rs. 0"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                </ScrollView>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleAddVaultSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>والٹ اکاؤنٹ بنائیں</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= SUB-MODAL 3: ADJUST BALANCE MODAL ================= */}
        {showAdjustVaultModal && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>
                    بیلنس ایڈجسٹ: {showAdjustVaultModal.accountTitle}
                  </Text>
                  <TouchableOpacity onPress={() => setShowAdjustVaultModal(null)}>
                    <Ionicons name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>نیا درست بیلنس درج کریں (PKR):</Text>
                <TextInput
                  style={[styles.textInput, { fontSize: 20, color: '#00d49f', fontWeight: 'bold' }]}
                  value={adjustBalanceVal}
                  onChangeText={setAdjustBalanceVal}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>ایڈجسٹمنٹ کی وجہ (اختیاری):</Text>
                <TextInput
                  style={styles.textInput}
                  value={adjustReason}
                  onChangeText={setAdjustReason}
                  placeholder="مثال: بینک اسٹیٹمنٹ مصالحت / اے ٹی ایم نقد کیش چیک"
                  placeholderTextColor="#64748b"
                />

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleAdjustBalanceSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>بیلنس محفوظ کریں (Update Balance)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= SUB-MODAL 4: INTER-VAULT TRANSFER MODAL ================= */}
        {showTransferModal && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>🔄 والٹ سے والٹ رقم منتقلی (Inter-Vault)</Text>
                  <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                    <Ionicons name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* From Vault */}
                  <Text style={styles.inputLabel}>ماخذ والٹ (جہاں سے کٹوتی ہوگی):</Text>
                  <View style={styles.chipRow}>
                    {vaultAccounts.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.vaultSelectChip,
                          transferFromVaultId === v.id && styles.vaultSelectChipActive,
                        ]}
                        onPress={() => setTransferFromVaultId(v.id)}
                      >
                        <Text
                          style={[
                            styles.vaultSelectChipText,
                            transferFromVaultId === v.id && styles.vaultSelectChipTextActive,
                          ]}
                        >
                          {v.accountTitle} (Rs. {v.currentBalance.toLocaleString()})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* To Vault */}
                  <Text style={styles.inputLabel}>منزل والٹ (جہاں رقم جمع ہوگی):</Text>
                  <View style={styles.chipRow}>
                    {vaultAccounts.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.vaultSelectChip,
                          transferToVaultId === v.id && styles.vaultSelectChipActive,
                        ]}
                        onPress={() => setTransferToVaultId(v.id)}
                      >
                        <Text
                          style={[
                            styles.vaultSelectChipText,
                            transferToVaultId === v.id && styles.vaultSelectChipTextActive,
                          ]}
                        >
                          {v.accountTitle}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Transfer Amount */}
                  <Text style={styles.inputLabel}>منتقلی کی رقم (PKR):</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 18, color: '#38bdf8', fontWeight: 'bold' }]}
                    value={transferAmount}
                    onChangeText={setTransferAmount}
                    placeholder="Rs. 10,000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  {/* Notes */}
                  <Text style={styles.inputLabel}>تفصیل (مثال: اے ٹی ایم سے کیش نکلوایا):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={transferNotes}
                    onChangeText={setTransferNotes}
                    placeholder="ATM withdrawal / Mobile transfer..."
                    placeholderTextColor="#64748b"
                  />
                </ScrollView>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleTransferSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>رقم منتقل کریں (Execute Transfer)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= SUB-MODAL 5: ADD SAVINGS BUCKET MODAL ================= */}
        {showAddBucketModal && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>🎯 نیا بچت فنڈ بنائیں</Text>
                  <TouchableOpacity onPress={() => setShowAddBucketModal(false)}>
                    <Ionicons name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* Category Chips */}
                  <Text style={styles.inputLabel}>فنڈ کی کیٹیگری:</Text>
                  <View style={styles.chipRow}>
                    {(Object.keys(SAVINGS_CATEGORY_META) as ISavingsBucket['category'][]).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.sourceChip,
                          newBucketCategory === cat && styles.sourceChipActive,
                        ]}
                        onPress={() => {
                          setNewBucketCategory(cat);
                          setNewBucketTitle(SAVINGS_CATEGORY_META[cat].labelUrdu);
                        }}
                      >
                        <Text
                          style={[
                            styles.sourceChipText,
                            newBucketCategory === cat && styles.sourceChipTextActive,
                          ]}
                        >
                          {SAVINGS_CATEGORY_META[cat].labelUrdu}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>فنڈ کا نام / ہدف:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newBucketTitle}
                    onChangeText={setNewBucketTitle}
                    placeholder="مثال: ہنگامی طبی فنڈ، قربانی سیونگز"
                    placeholderTextColor="#64748b"
                  />

                  <Text style={styles.inputLabel}>کل ہدف کی رقم (PKR):</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 16, color: '#f59e0b', fontWeight: 'bold' }]}
                    value={newBucketTarget}
                    onChangeText={setNewBucketTarget}
                    placeholder="Rs. 100,000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>ماہانہ جمع کرنے کا ہدف (PKR):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={newBucketMonthly}
                    onChangeText={setNewBucketMonthly}
                    placeholder="Rs. 10,000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />
                </ScrollView>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleAddBucketSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>بچت فنڈ قائم کریں</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ================= SUB-MODAL 6: DEPOSIT INTO BUCKET ================= */}
        {showDepositBucketModal && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>
                    📥 رقم جمع کریں: {showDepositBucketModal.title}
                  </Text>
                  <TouchableOpacity onPress={() => setShowDepositBucketModal(null)}>
                    <Ionicons name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                {/* Source Vault Picker */}
                <Text style={styles.inputLabel}>ماخذ والٹ اکاؤنٹ منتخب کریں:</Text>
                <View style={styles.chipRow}>
                  {vaultAccounts.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.vaultSelectChip,
                        depositSourceVaultId === v.id && styles.vaultSelectChipActive,
                      ]}
                      onPress={() => setDepositSourceVaultId(v.id)}
                    >
                      <Text
                        style={[
                          styles.vaultSelectChipText,
                          depositSourceVaultId === v.id && styles.vaultSelectChipTextActive,
                        ]}
                      >
                        {v.accountTitle} (Rs. {v.currentBalance.toLocaleString()})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Amount */}
                <Text style={styles.inputLabel}>جمع کرنے کی رقم (PKR):</Text>
                <TextInput
                  style={[styles.textInput, { fontSize: 20, color: '#00d49f', fontWeight: 'bold' }]}
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  placeholder="Rs. 5,000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleDepositBucketSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>1-ٹیپ فنڈ میں ٹرانسفر کریں</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    backgroundColor: '#070d18',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 13,
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },

  /* Top Liquidity Overview Strip (4 Metric Blocks) */
  liquidityStrip: {
    backgroundColor: '#09111e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metricBlock: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#0d1627',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 9.5,
    color: '#64748b',
  },

  /* Tab Navigation */
  tabScrollWrap: {
    marginBottom: 14,
  },
  touchScrollStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  touchTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  touchTabActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderColor: '#00d49f',
  },
  touchTabText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  touchTabTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },

  tabContent: {
    gap: 12,
  },

  /* Cards */
  card: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  /* Solvency Banners */
  solvencySurplusCard: {
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00d49f',
    padding: 14,
  },
  solvencyDeficitCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    padding: 14,
  },
  solvencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  solvencyBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 212, 159, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  solvencySurplusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00d49f',
    lineHeight: 20,
  },
  solvencySurplusSub: {
    fontSize: 11,
    color: '#a7f3d0',
    marginTop: 2,
    lineHeight: 16,
  },
  solvencyDeficitTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef4444',
    lineHeight: 20,
  },
  solvencyDeficitSub: {
    fontSize: 11,
    color: '#fca5a5',
    marginTop: 2,
    lineHeight: 16,
  },

  runwayDaysPill: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  runwayDaysPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  runwayExplanation: {
    fontSize: 12.5,
    color: '#94a3b8',
    lineHeight: 19,
  },

  /* Formulas */
  formulaEquationCard: {
    backgroundColor: '#09111e',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    marginBottom: 12,
  },
  formulaEquationText: {
    fontSize: 11.5,
    color: '#38bdf8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  formulaEquationMath: {
    fontSize: 11,
    color: '#CBD5E1',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#CBD5E1',
    marginBottom: 8,
  },
  envelopeList: {
    gap: 7,
  },
  envelopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(23, 35, 59, 0.5)',
  },
  envelopeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  envelopeName: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  envelopeVal: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#f59e0b',
    fontFamily: 'monospace',
  },

  /* Buttons */
  whatsappShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 12,
  },
  whatsappShareBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00d49f',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryActionBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rowBtns: {
    flexDirection: 'row',
    gap: 8,
  },

  /* Incomes */
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#CBD5E1',
    marginTop: 6,
    marginBottom: 4,
  },
  incomeRecordCard: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
  },
  incomeRecordTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  incomeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incomeRecordTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  recurringPill: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recurringPillText: {
    fontSize: 9.5,
    color: '#00d49f',
    fontWeight: 'bold',
  },
  incomeSourceSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  incomeRecordAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00d49f',
    fontFamily: 'monospace',
  },
  incomeRecordFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#17233b',
  },
  crvPill: {
    backgroundColor: '#09111e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  crvPillText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  destVaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '45%',
  },
  destVaultPillText: {
    fontSize: 10,
    color: '#38bdf8',
  },
  incomeDateText: {
    fontSize: 10.5,
    color: '#64748b',
  },

  /* Vault Cards */
  vaultCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
  },
  vaultCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vaultTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  vaultBadgePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  vaultBadgePillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  vaultInstitution: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  vaultBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#09111e',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  vaultBalanceLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  vaultBalanceValue: {
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  adjustBalanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  adjustBalanceBtnText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  vaultNotesText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
  },

  /* Savings Buckets */
  bucketCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
  },
  bucketCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bucketIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bucketTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  bucketCategorySub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  pctBadge: {
    backgroundColor: '#09111e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#17233b',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bucketAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bucketAmountSub: {
    fontSize: 10,
    color: '#64748b',
  },
  bucketCurrentVal: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  bucketTargetVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  bucketFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#17233b',
  },
  monthlyTargetText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  depositActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  depositActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#070d18',
  },

  /* Empty state */
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  emptyCardText: {
    color: '#64748b',
    marginTop: 8,
    fontSize: 12,
  },

  /* Sub Modals */
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  subModalCard: {
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 16,
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  subModalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 11.5,
    color: '#CBD5E1',
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#09111e',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#ffffff',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#09111e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  sourceChipActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderColor: '#00d49f',
  },
  sourceChipText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  sourceChipTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  quickAmtBtn: {
    backgroundColor: '#17233b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickAmtBtnText: {
    fontSize: 11,
    color: '#00d49f',
    fontWeight: 'bold',
  },
  vaultSelectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#09111e',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  vaultSelectChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  vaultSelectChipText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  vaultSelectChipTextActive: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#09111e',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    marginTop: 12,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  switchSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalSubmitBtn: {
    backgroundColor: '#00d49f',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#070d18',
  },
});
