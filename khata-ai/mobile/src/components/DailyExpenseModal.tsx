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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ledgerApi, ILedgerEntry } from '../api/ledger.api';
import { profileApi, IPaymentChannels } from '../api/profile.api';
import { financeApi } from '../api/finance.api';
import { useAuth } from '../store/auth.store';
import { useFinancialMetrics } from '../context/FinancialMetricsContext';
import { JevBudgetEngine, JevBudgetGuidance, BudgetState } from '../services/jevBudget.service';

interface DailyExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (amount: number, targetAccount: string, category: string, note?: string) => void;
}

type DestinationAccount = 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT';

interface ExpenseCategory {
  id: string;
  name: string;
  urduName: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'chai',
    name: 'Chai & Refreshment',
    urduName: 'چائے و پانی',
    icon: 'cafe-outline',
    color: '#B45309',
    bgColor: '#FEF3C7',
  },
  {
    id: 'petrol',
    name: 'Generator Petrol / Fuel',
    urduName: 'جنریٹر پیٹرول',
    icon: 'flame-outline',
    color: '#E11D48',
    bgColor: '#FFE4E6',
  },
  {
    id: 'safai',
    name: 'Sweeping / Safai',
    urduName: 'صفائی کا خرچہ',
    icon: 'sparkles-outline',
    color: '#0284C7',
    bgColor: '#E0F2FE',
  },
  {
    id: 'shopper',
    name: 'Shopper Bags & Packing',
    urduName: 'شاپر و پیکنگ',
    icon: 'bag-handle-outline',
    color: '#7E22CE',
    bgColor: '#F3E8FF',
  },
  {
    id: 'repairs',
    name: 'Shop Repairs & Electricity',
    urduName: 'دکان مرمت و بجلی',
    icon: 'build-outline',
    color: '#D97706',
    bgColor: '#FEF3C7',
  },
  {
    id: 'other',
    name: 'Other Shop Expense',
    urduName: 'دیگر دکان خرچہ',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#475569',
    bgColor: '#F1F5F9',
  },
];

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

const getCategoryMeta = (categoryName: string): ExpenseCategory => {
  const found = EXPENSE_CATEGORIES.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase() || c.urduName === categoryName
  );
  return (
    found || {
      id: 'other',
      name: categoryName || 'Other Shop Expense',
      urduName: categoryName || 'دیگر دکان خرچہ',
      icon: 'receipt-outline',
      color: '#E11D48',
      bgColor: '#FFE4E6',
    }
  );
};

export const DailyExpenseModal: React.FC<DailyExpenseModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { metrics } = useFinancialMetrics();
  const isCashier = user?.role === 'CASHIER';

  const [amount, setAmount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>(EXPENSE_CATEGORIES[0]);
  const [targetAccount, setTargetAccount] = useState<DestinationAccount>('PHYSICAL_CASH');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [paymentChannels, setPaymentChannels] = useState<IPaymentChannels>({
    cashDrawer: 45000,
    bankAccount: 125000,
    digitalWallet: 32000,
  });

  // Sub-panel Monthly History State
  const [history, setHistory] = useState<ILedgerEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyExpanded, setHistoryExpanded] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Jev Daily Safe OPEX Guidance State
  const [budgetGuidance, setBudgetGuidance] = useState<JevBudgetGuidance | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState<boolean>(false);

  // Cashier Manager PIN Override Prompt State
  const [showManagerPinModal, setShowManagerPinModal] = useState<boolean>(false);
  const [managerPinInput, setManagerPinInput] = useState<string>('');
  const [showPinPlain, setShowPinPlain] = useState<boolean>(false);
  const [verifyingPin, setVerifyingPin] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const fetchProfileChannels = async () => {
    try {
      const prof = await profileApi.getProfile();
      if (prof.paymentChannels) {
        setPaymentChannels(prof.paymentChannels);
      }
    } catch (e) {
      // Offline fallback
    }
  };

  const fetchBudgetGuidance = async () => {
    setLoadingGuidance(true);
    try {
      const res = await financeApi.getDailyOpexGuidance();
      if (res.success && res.data) {
        setBudgetGuidance(res.data);
      } else {
        fallbackLocalGuidance();
      }
    } catch (e) {
      fallbackLocalGuidance();
    } finally {
      setLoadingGuidance(false);
    }
  };

  const fallbackLocalGuidance = () => {
    const today = new Date().toDateString();
    const todaySpent = history
      .filter((h) => new Date(h.createdAt).toDateString() === today)
      .reduce((sum, h) => sum + (h.amount || 0), 0);
    const local = JevBudgetEngine.evaluateLocal(todaySpent);
    setBudgetGuidance(local);
  };

  const fetchMonthlyHistory = async () => {
    setLoadingHistory(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const res = await ledgerApi.getAll({
        entryType: 'CASH_OUT',
        startDate: startOfMonth.toISOString(),
        limit: 100,
      });

      if (res.success && res.data) {
        setHistory(res.data);
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setAmount('');
      setSelectedCategory(EXPENSE_CATEGORIES[0]);
      setTargetAccount('PHYSICAL_CASH');
      setNote('');
      setErrorMsg(null);
      setShowManagerPinModal(false);
      setManagerPinInput('');
      setPinError(null);
      fetchMonthlyHistory();
      fetchProfileChannels();
      fetchBudgetGuidance();
    }
  }, [visible]);

  const monthlySum = history.reduce((sum, item) => sum + (item.amount || 0), 0);

  const getAvailableBalance = (account: DestinationAccount): number => {
    if (account === 'PHYSICAL_CASH') return paymentChannels.cashDrawer;
    if (account === 'BANK_ACCOUNT') return paymentChannels.bankAccount;
    if (account === 'DIGITAL_WALLET') return paymentChannels.digitalWallet;
    return 0;
  };

  const currentChannelBalance = getAvailableBalance(targetAccount);
  const numericAmount = parseFloat(amount) || 0;
  const isInsufficientFunds = numericAmount > 0 && numericAmount > currentChannelBalance;

  // Real-time dynamic budget simulation
  const safeDailyLimit = budgetGuidance?.daily_safe_opex_limit || 2500;
  const todayAlreadySpent = budgetGuidance?.today_spent_amount || 0;
  const simulatedTotalSpent = todayAlreadySpent + numericAmount;
  const simulatedBurnRate = safeDailyLimit > 0 ? simulatedTotalSpent / safeDailyLimit : 1.0;
  const simulatedBurnPercentage = Math.round(simulatedBurnRate * 100);

  let simulatedState: BudgetState = 'WITHIN_LIMIT';
  if (simulatedTotalSpent > safeDailyLimit) {
    simulatedState = 'OVERBUDGET';
  } else if (simulatedBurnRate >= 0.75) {
    simulatedState = 'THRESHOLD_WARNING';
  }

  const handleSave = async (overrideVerifiedPin?: string) => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Baraye meherbani sahi rakam darj karein (Valid expense amount required).');
      return;
    }

    if (isInsufficientFunds) {
      setErrorMsg(`⚠️ Is account mein raqam na-kafi hai (Available: Rs. ${currentChannelBalance.toLocaleString()}). Pehle account mein raqam jama karein ya doosra zariya chunein.`);
      return;
    }

    // Cashier Policy & Manager Override:
    // If Cashier attempts an expense > Rs. 500 OR enters an expense that pushes today overbudget,
    // require Manager/Owner PIN override verification before proceeding!
    if (isCashier && !overrideVerifiedPin && (parsedAmount > 500 || simulatedState === 'OVERBUDGET')) {
      setShowManagerPinModal(true);
      setPinError(null);
      setManagerPinInput('');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const outflowRes = await financeApi.recordOutflow({
        outflowType: 'Dukan Kharcha',
        amount: parsedAmount,
        paymentMode: targetAccount,
        category: selectedCategory.name,
        description: note.trim()
          ? `Dukan Kharcha (${selectedCategory.urduName}): ${note.trim()}`
          : `Dukan Kharcha (${selectedCategory.urduName})`,
      });

      if (!outflowRes.success) {
        setErrorMsg(outflowRes.message || '⚠️ Outflow payment failed due to insufficient funds.');
        setSubmitting(false);
        return;
      }

      if (outflowRes.data?.updatedChannels) {
        setPaymentChannels(outflowRes.data.updatedChannels);
      }

      if (outflowRes.data?.entry) {
        setHistory((prev) => [outflowRes.data!.entry, ...prev]);
      }

      // Re-fetch budget guidance so live meter updates immediately
      fetchBudgetGuidance();

      onSuccess(parsedAmount, targetAccount, selectedCategory.name, note.trim() || undefined);
      setAmount('');
      setNote('');
      setShowManagerPinModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing outflow expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyManagerPinSubmit = async () => {
    const cleanPin = managerPinInput.trim();
    if (!cleanPin || !/^\d{4}$/.test(cleanPin)) {
      setPinError('⚠️ برائے مہربانی 4 ہندسوں پر مشتمل درست منیجر پن درج کریں۔');
      return;
    }

    setVerifyingPin(true);
    setPinError(null);
    try {
      const res = await profileApi.verifyManagerPin(cleanPin);
      if (res.success) {
        setShowManagerPinModal(false);
        setManagerPinInput('');
        // Proceed with save with approved override pin
        await handleSave(cleanPin);
      } else {
        setPinError(res.message || '⚠️ غلط پن: منیجر کا سیکیورٹی پن غیر درست ہے۔');
      }
    } catch (err: any) {
      setPinError(err.response?.data?.message || err.message || '⚠️ غلط پن: تصدیق میں ناکامی ہوئی۔');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleDeleteExpense = (entry: ILedgerEntry) => {
    Alert.alert(
      'Kharcha Delete & Rollback (خرچہ ڈیلیٹ)',
      `Kya aap PKR ${entry.amount.toLocaleString()} ka kharcha delete karna chahte hain? Raqam wapis till balance mein shamil ho jayegi.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete & Refund (ڈیلیٹ کریں)',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(entry._id);
            try {
              await ledgerApi.delete(entry._id);

              // Optimistically filter out deleted expense row
              setHistory((prev) => prev.filter((item) => item._id !== entry._id));

              // Trigger parent state update to refresh dashboard balances
              onSuccess(0, targetAccount, selectedCategory.name, 'Rollback Refund');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete expense.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeText = d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    return isToday ? `Today, ${timeText}` : `${d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })}, ${timeText}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="receipt" size={20} color="#E11D48" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Dukan Daily Kharcha</Text>
                <Text style={styles.headerSubtitle}>دکان کا یومیہ خرچہ • چائے، پیٹرول و صفائی</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#991B1B" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* JEV Cash Flow & Runway Throttling Guidance */}
          {metrics.runwayDays < 7 && (
            <View style={styles.runwayWarningBanner}>
              <Ionicons name="warning" size={18} color="#B45309" />
              <View style={{ flex: 1 }}>
                <Text style={styles.runwayWarningTitle}>
                  دکان کا کیش رن وے کم ہے ({metrics.runwayDays} دن باقی)
                </Text>
                <Text style={styles.runwayWarningSub}>
                  غیر ضروری اخراجات روکیں تاکہ سپلائر بل متاثر نہ ہوں۔
                </Text>
              </View>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* JEV LIVE SAFE OPEX BUDGET METER */}
            <View style={styles.budgetMeterCard}>
              <View style={styles.budgetMeterHeader}>
                <View style={styles.budgetTitleGroup}>
                  <Ionicons
                    name={
                      simulatedState === 'OVERBUDGET'
                        ? 'flame'
                        : simulatedState === 'THRESHOLD_WARNING'
                        ? 'warning'
                        : 'shield-checkmark'
                    }
                    size={18}
                    color={
                      simulatedState === 'OVERBUDGET'
                        ? '#DC2626'
                        : simulatedState === 'THRESHOLD_WARNING'
                        ? '#D97706'
                        : '#059669'
                    }
                  />
                  <View>
                    <Text style={styles.budgetTitle}>Daily Safe OPEX Budget (روزانہ محفوظ بجٹ)</Text>
                    <Text style={styles.budgetSubtitle}>30 روزہ منافع سے حساب شدہ یومیہ حد</Text>
                  </View>
                </View>

                {/* Status Pill Badge */}
                <View
                  style={[
                    styles.budgetStatusPill,
                    simulatedState === 'OVERBUDGET'
                      ? styles.budgetStatusOver
                      : simulatedState === 'THRESHOLD_WARNING'
                      ? styles.budgetStatusWarning
                      : styles.budgetStatusSafe,
                  ]}
                >
                  <Text
                    style={[
                      styles.budgetStatusText,
                      simulatedState === 'OVERBUDGET'
                        ? styles.budgetStatusTextOver
                        : simulatedState === 'THRESHOLD_WARNING'
                        ? styles.budgetStatusTextWarning
                        : styles.budgetStatusTextSafe,
                    ]}
                  >
                    {simulatedState === 'OVERBUDGET'
                      ? '🔴 بجٹ ختم (Overbudget)'
                      : simulatedState === 'THRESHOLD_WARNING'
                      ? `🟡 انتباہ (${simulatedBurnPercentage}%)`
                      : '🟢 محفوظ حد (Safe)'}
                  </Text>
                </View>
              </View>

              {/* Progress Gauge */}
              <View style={styles.gaugeTrack}>
                <View
                  style={[
                    styles.gaugeFill,
                    {
                      width: `${Math.min(100, Math.max(0, simulatedBurnPercentage))}%`,
                      backgroundColor:
                        simulatedState === 'OVERBUDGET'
                          ? '#DC2626'
                          : simulatedState === 'THRESHOLD_WARNING'
                          ? '#D97706'
                          : '#059669',
                    },
                  ]}
                />
              </View>

              {/* Financial Metrics Row */}
              <View style={styles.budgetNumbersRow}>
                <Text style={styles.budgetNumberText}>
                  آج خرچ:{' '}
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                    Rs. {simulatedTotalSpent.toLocaleString()}
                  </Text>{' '}
                  / حد:{' '}
                  <Text style={{ fontWeight: '700', color: '#0F172A' }}>
                    Rs. {safeDailyLimit.toLocaleString()}
                  </Text>
                </Text>
                <Text
                  style={[
                    styles.budgetRemainingText,
                    simulatedState === 'OVERBUDGET' && { color: '#DC2626' },
                  ]}
                >
                  {simulatedTotalSpent <= safeDailyLimit
                    ? `باقی: Rs. ${(safeDailyLimit - simulatedTotalSpent).toLocaleString()}`
                    : `اضافی: Rs. ${(simulatedTotalSpent - safeDailyLimit).toLocaleString()}`}
                </Text>
              </View>
            </View>

            {/* Large Amount Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Enter Expense Amount (Rs.) / خرچہ کی رقم *</Text>
              <View style={[styles.largeAmountBox, isInsufficientFunds && styles.largeAmountBoxError]}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.largeAmountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus={true}
                />
              </View>
            </View>

            {/* Quick Preset Amount Tap Chips */}
            <View style={styles.presetRow}>
              {PRESET_AMOUNTS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetChip,
                    amount === String(preset) && styles.presetChipActive,
                  ]}
                  onPress={() => setAmount(String(preset))}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      amount === String(preset) && styles.presetChipTextActive,
                    ]}
                  >
                    + Rs. {preset}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category Chips Grid */}
            <Text style={styles.sectionLabel}>🏷️ Expense Category (خرچہ کی قسم):</Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      { backgroundColor: isSelected ? cat.bgColor : '#F8FAFC' },
                      isSelected && { borderColor: cat.color, borderWidth: 1.5 },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={16}
                      color={isSelected ? cat.color : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && { color: cat.color, fontWeight: '800' },
                      ]}
                    >
                      {cat.urduName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Payment Source Account Selector */}
            <Text style={styles.sectionLabel}>💳 Deduct From Payment Source (ادائیگی کا کھاتہ):</Text>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  targetAccount === 'PHYSICAL_CASH' && styles.segmentTabActive,
                ]}
                onPress={() => setTargetAccount('PHYSICAL_CASH')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={targetAccount === 'PHYSICAL_CASH' ? '#E11D48' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentTabText,
                    targetAccount === 'PHYSICAL_CASH' && styles.segmentTabTextActive,
                  ]}
                >
                  Cash Galla (نقد گلہ)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  targetAccount === 'BANK_ACCOUNT' && styles.segmentTabActive,
                ]}
                onPress={() => setTargetAccount('BANK_ACCOUNT')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="card-outline"
                  size={16}
                  color={targetAccount === 'BANK_ACCOUNT' ? '#E11D48' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentTabText,
                    targetAccount === 'BANK_ACCOUNT' && styles.segmentTabTextActive,
                  ]}
                >
                  Bank Transfer / Raast (بینک)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  targetAccount === 'DIGITAL_WALLET' && styles.segmentTabActive,
                ]}
                onPress={() => setTargetAccount('DIGITAL_WALLET')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={targetAccount === 'DIGITAL_WALLET' ? '#E11D48' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentTabText,
                    targetAccount === 'DIGITAL_WALLET' && styles.segmentTabTextActive,
                  ]}
                >
                  Digital Wallet (JazzCash / Easypaisa)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Real-Time Available Balance Badge Pill */}
            <View style={styles.balanceBadgePill}>
              <Ionicons name="wallet" size={14} color="#059669" />
              <Text style={styles.balanceBadgeText}>
                Dastyab Balance (Available): Rs. {currentChannelBalance.toLocaleString()}
              </Text>
            </View>

            {/* Pre-Submit Insufficient Funds Warning Banner */}
            {isInsufficientFunds && (
              <View style={styles.insufficientWarningBox}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.insufficientWarningText}>
                  ⚠️ Is account mein raqam na-kafi hai (Available: Rs. {currentChannelBalance.toLocaleString()}). Pehle account mein raqam jama karein ya doosra zariya chunein.
                </Text>
              </View>
            )}

            {/* Optional Short Note */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Short Detail / تفصیل (Optional):</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. 2 Liter petrol for generator"
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Dynamic Simulated Advisory Notice */}
            {simulatedState === 'OVERBUDGET' && (
              <View style={styles.advisoryAlertBoxOver}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.advisoryAlertTextOver}>
                  ⚠️ انتباہ: آج کا دکان خرچہ منافع کی حد سے تجاوز کر رہا ہے۔ صرف اشد ضروری ادائیگی ہی گلہ سے کی جائے۔
                </Text>
              </View>
            )}

            {simulatedState === 'THRESHOLD_WARNING' && (
              <View style={styles.advisoryAlertBoxWarning}>
                <Ionicons name="information-circle" size={18} color="#B45309" />
                <Text style={styles.advisoryAlertTextWarning}>
                  🟡 انتباہ: آج کے دکان خرچے کا بجٹ {simulatedBurnPercentage}% استعمال ہو چکا ہے۔ متفرق ادائیگیاں احتیاط سے کریں۔
                </Text>
              </View>
            )}

            {/* Record & Deduct Button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                simulatedState === 'OVERBUDGET' && styles.saveBtnOverbudget,
                simulatedState === 'THRESHOLD_WARNING' && styles.saveBtnWarning,
                (submitting || isInsufficientFunds) && styles.btnDisabled,
              ]}
              onPress={() => handleSave()}
              disabled={submitting || isInsufficientFunds}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={simulatedState === 'OVERBUDGET' ? 'warning' : 'remove-circle'}
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.saveBtnText}>
                    {simulatedState === 'OVERBUDGET'
                      ? 'غیر معمولی خرچہ درج کریں (Log Overbudget Expense)'
                      : 'Record & Deduct from Till (خرچہ منہا کریں)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* PERSISTENT SUB-PANEL: Collapsible Monthly Kharcha History */}
            <View style={styles.subPanelCard}>
              <TouchableOpacity
                style={styles.subPanelHeaderRow}
                onPress={() => setHistoryExpanded(!historyExpanded)}
                activeOpacity={0.8}
              >
                <View style={styles.subPanelTitleGroup}>
                  <Ionicons name="calendar-outline" size={18} color="#E11D48" />
                  <Text style={styles.subPanelTitle}>Is Mahinay Ke Kharchay (Current Month Expenses)</Text>
                </View>
                <Ionicons
                  name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {/* Monthly Running Total Summary Badge */}
              <View style={styles.monthlySummaryBadge}>
                <Text style={styles.monthlySummaryText}>
                  Total Kharcha: <Text style={styles.monthlySummaryBold}>Rs. {monthlySum.toLocaleString()}</Text>
                </Text>
                <Text style={styles.monthlyCountText}>{history.length} Entries Logged</Text>
              </View>

              {historyExpanded && (
                <View style={styles.historyContainer}>
                  {loadingHistory ? (
                    <ActivityIndicator color="#E11D48" size="small" style={{ marginVertical: 14 }} />
                  ) : history.length === 0 ? (
                    <View style={styles.emptyHistoryBox}>
                      <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
                      <Text style={styles.emptyHistoryText}>Is mahinay abhi tak koi kharcha darj nahi hua.</Text>
                    </View>
                  ) : (
                    history.map((item) => {
                      const meta = getCategoryMeta(item.category);
                      const isDeleting = deletingId === item._id;

                      let sourceBadge = 'Cash (دکان گلہ)';
                      if (item.paymentMode === 'JAZZCASH' || item.paymentMode === 'EASYPAISA') sourceBadge = 'Wallet (والٹ)';
                      else if (item.paymentMode === 'BANK_TRANSFER') sourceBadge = 'Bank (بینک)';

                      return (
                        <View key={item._id} style={styles.historyRow}>
                          <View style={[styles.historyCategoryCircle, { backgroundColor: meta.bgColor }]}>
                            <Ionicons name={meta.icon} size={16} color={meta.color} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <View style={styles.rowTopLine}>
                              <Text style={styles.historyCatTitle}>{meta.urduName}</Text>
                              <Text style={styles.historyAmountText}>- Rs. {item.amount.toLocaleString()}</Text>
                            </View>

                            <View style={styles.rowMetaLine}>
                              <Text style={styles.timeBadge}>{formatTimeAgo(item.createdAt)}</Text>
                              <View style={styles.sourceTag}>
                                <Text style={styles.sourceTagText}>{sourceBadge}</Text>
                              </View>
                            </View>

                            {item.description ? (
                              <Text style={styles.notePreview} numberOfLines={1}>
                                {item.description.replace(/^Dukan Kharcha \([^)]+\):\s*/i, '')}
                              </Text>
                            ) : null}
                          </View>

                          {/* Red Trash Delete Action Button */}
                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteExpense(item)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <ActivityIndicator size="small" color="#E11D48" />
                            ) : (
                              <Ionicons name="trash-outline" size={18} color="#E11D48" />
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Manager PIN Override Modal for Cashier */}
          <Modal
            visible={showManagerPinModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowManagerPinModal(false)}
          >
            <View style={styles.pinModalOverlay}>
              <View style={styles.pinModalCard}>
                <View style={styles.pinModalHeader}>
                  <View style={styles.pinIconCircle}>
                    <Ionicons name="shield-checkmark" size={24} color="#D97706" />
                  </View>
                  <Text style={styles.pinModalTitle}>منیجر سیکیورٹی پن (Manager PIN Required)</Text>
                  <Text style={styles.pinModalSub}>
                    کیشیئر کے لیے حد سے زیادہ / غیر معمولی خرچہ (Rs. {numericAmount.toLocaleString()}) درج کرنے کے لیے منیجر یا دکان مالک کی منظوری درکار ہے۔
                  </Text>
                </View>

                {pinError && (
                  <View style={styles.pinErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.pinErrorText}>{pinError}</Text>
                  </View>
                )}

                <View style={styles.pinInputRow}>
                  <TextInput
                    style={styles.pinInputField}
                    placeholder="••••"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry={!showPinPlain}
                    value={managerPinInput}
                    onChangeText={setManagerPinInput}
                    autoFocus={true}
                  />
                  <TouchableOpacity
                    style={styles.pinEyeBtn}
                    onPress={() => setShowPinPlain(!showPinPlain)}
                  >
                    <Ionicons
                      name={showPinPlain ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.pinModalActions}>
                  <TouchableOpacity
                    style={styles.pinCancelBtn}
                    onPress={() => {
                      setShowManagerPinModal(false);
                      setManagerPinInput('');
                    }}
                    disabled={verifyingPin}
                  >
                    <Text style={styles.pinCancelBtnText}>منسوخ (Cancel)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pinConfirmBtn, verifyingPin && styles.btnDisabled]}
                    onPress={handleVerifyManagerPinSubmit}
                    disabled={verifyingPin}
                  >
                    {verifyingPin ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.pinConfirmBtnText}>تصدیق اور خرچہ درج کریں</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  largeAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    borderWidth: 2,
    borderColor: '#E11D48',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '800',
    color: '#E11D48',
    marginRight: 8,
  },
  largeAmountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#E11D48',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  presetChipTextActive: {
    color: '#E11D48',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryChip: {
    flexGrow: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#E11D48',
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTabTextActive: {
    color: '#E11D48',
    fontWeight: '800',
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  saveBtn: {
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  /* Sub-Panel History Styles */
  subPanelCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
  },
  subPanelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPanelTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subPanelTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthlySummaryBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  monthlySummaryText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  monthlySummaryBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  monthlyCountText: {
    fontSize: 11,
    color: '#E11D48',
    fontWeight: '700',
  },
  historyContainer: {
    marginTop: 12,
    gap: 8,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  historyCategoryCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  timeBadge: {
    fontSize: 10,
    color: '#64748B',
  },
  sourceTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  notePreview: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 3,
  },
  deleteBtn: {
    padding: 8,
  },
  largeAmountBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  balanceBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  balanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  insufficientWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  insufficientWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    flex: 1,
  },
  runwayWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  runwayWarningTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  runwayWarningSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
    fontWeight: '600',
  },
  // Budget Meter Styles
  budgetMeterCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  budgetMeterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  budgetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  budgetSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  budgetStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  budgetStatusSafe: {
    backgroundColor: '#DCFCE7',
  },
  budgetStatusWarning: {
    backgroundColor: '#FEF3C7',
  },
  budgetStatusOver: {
    backgroundColor: '#FEE2E2',
  },
  budgetStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  budgetStatusTextSafe: {
    color: '#15803D',
  },
  budgetStatusTextWarning: {
    color: '#B45309',
  },
  budgetStatusTextOver: {
    color: '#DC2626',
  },
  gaugeTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  budgetNumberText: {
    fontSize: 11,
    color: '#475569',
  },
  budgetRemainingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  advisoryAlertBoxOver: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  advisoryAlertTextOver: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
    fontWeight: '600',
  },
  advisoryAlertBoxWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  advisoryAlertTextWarning: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
    fontWeight: '600',
  },
  saveBtnOverbudget: {
    backgroundColor: '#DC2626',
  },
  saveBtnWarning: {
    backgroundColor: '#D97706',
  },
  // Manager PIN Override Modal Styles
  pinModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  pinModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pinIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pinModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  pinModalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  pinErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  pinErrorText: {
    flex: 1,
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  pinInputField: {
    flex: 1,
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0F172A',
    paddingVertical: 10,
  },
  pinEyeBtn: {
    padding: 6,
  },
  pinModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pinCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  pinCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pinConfirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D97706',
    alignItems: 'center',
  },
  pinConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
