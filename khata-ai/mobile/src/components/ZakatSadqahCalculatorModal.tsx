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
  zakatApi,
  IZakatAssessment,
  ICharityDisbursement,
  IVaultOption,
  IFitranaEstimate,
  NisabStandard,
  WeightUnit,
  GoldPurity,
  CharityType,
  MustahiqCategory,
  CharityPaymentMode,
} from '../api/zakat.api';

interface ZakatSadqahCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

type TabKey = 'CASH' | 'METALS' | 'RECEIVABLES' | 'DEBTS' | 'FITRANA' | 'LOG';

const MUSTAHIQ_CATEGORIES: {
  key: MustahiqCategory;
  labelUrdu: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'RELATIVES', labelUrdu: 'مستحق رشتے دار', icon: 'people-outline', color: '#38bdf8' },
  { key: 'DOMESTIC_STAFF', labelUrdu: 'گھریلو ملازمین', icon: 'hand-left-outline', color: '#f59e0b' },
  { key: 'WIDOW_ORPHAN', labelUrdu: 'یتامیٰ و بیوگان', icon: 'heart-outline', color: '#ec4899' },
  { key: 'MEDICAL_PATIENT', labelUrdu: 'علاج معالجہ و ادویات', icon: 'medkit-outline', color: '#ef4444' },
  { key: 'MADRASSA_STUDENT', labelUrdu: 'طلبہ دینی مدارس', icon: 'school-outline', color: '#a855f7' },
  { key: 'DEBTOR_RELIEF', labelUrdu: 'مقروض کی مدد', icon: 'shield-outline', color: '#0ea5e9' },
  { key: 'GENERAL_NEED', labelUrdu: 'عام ضرورت مند', icon: 'leaf-outline', color: '#2dd4bf' },
];

export const ZakatSadqahCalculatorModal: React.FC<ZakatSadqahCalculatorModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>('METALS');

  // Assessment & Vault State
  const [assessment, setAssessment] = useState<IZakatAssessment | null>(null);
  const [availableVaults, setAvailableVaults] = useState<IVaultOption[]>([]);

  // Sub-modal: Disburse Charity
  const [showDisburseModal, setShowDisburseModal] = useState<boolean>(false);
  const [disburseRecipient, setDisburseRecipient] = useState<string>('');
  const [disburseCategory, setDisburseCategory] = useState<MustahiqCategory>('RELATIVES');
  const [disbursePurpose, setDisbursePurpose] = useState<string>('بچوں کے اسکول فیس و تعلیمی اخراجات');
  const [disburseAmount, setDisburseAmount] = useState<string>('');
  const [disburseCharityType, setDisburseCharityType] = useState<CharityType>('ZAKAT');
  const [disburseVaultId, setDisburseVaultId] = useState<string>('');
  const [disbursePaymentMode, setDisbursePaymentMode] = useState<CharityPaymentMode>('CASH');
  const [disburseAnonymous, setDisburseAnonymous] = useState<boolean>(true);
  const [disburseNotes, setDisburseNotes] = useState<string>('');

  // Editable Form Inputs for Assets / Liabilities
  const [cashVal, setCashVal] = useState<string>('0');
  const [bankVal, setBankVal] = useState<string>('0');
  const [walletsVal, setWalletsVal] = useState<string>('0');
  const [inventoryVal, setInventoryVal] = useState<string>('0');

  const [goldWeight, setGoldWeight] = useState<string>('0');
  const [goldUnit, setGoldUnit] = useState<WeightUnit>('TOLA');
  const [goldPurity, setGoldPurity] = useState<GoldPurity>('22K');
  const [goldRate, setGoldRate] = useState<string>('275000');

  const [silverWeight, setSilverWeight] = useState<string>('0');
  const [silverUnit, setSilverUnit] = useState<WeightUnit>('TOLA');
  const [silverRate, setSilverRate] = useState<string>('3100');

  const [kametiVal, setKametiVal] = useState<string>('0');
  const [loansVal, setLoansVal] = useState<string>('0');

  const [utilityDebts, setUtilityDebts] = useState<string>('0');
  const [schoolDebts, setSchoolDebts] = useState<string>('0');
  const [staffDebts, setStaffDebts] = useState<string>('0');
  const [otherDebts, setOtherDebts] = useState<string>('0');

  // Fitrana State
  const [householdHeads, setHouseholdHeads] = useState<number>(5);
  const [fitranaEstimates, setFitranaEstimates] = useState<IFitranaEstimate[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await zakatApi.getAssessment();
      if (res && res.assessment) {
        setAssessment(res.assessment);
        setAvailableVaults(res.availableVaults || []);

        if (res.availableVaults && res.availableVaults.length > 0) {
          setDisburseVaultId((prev) => (prev ? prev : res.availableVaults[0].id));
        }

        // Populate local form fields from assessment
        const a = res.assessment;
        setCashVal(String(a.cashInHand || 0));
        setBankVal(String(a.bankBalances || 0));
        setWalletsVal(String(a.digitalWallets || 0));
        setInventoryVal(String(a.businessInventoryValue || 0));

        if (a.goldHoldings) {
          setGoldWeight(String(a.goldHoldings.weight || 0));
          setGoldUnit(a.goldHoldings.unit || 'TOLA');
          setGoldPurity(a.goldHoldings.purity || '22K');
        }
        setGoldRate(String(a.goldRatePerTola || 275000));

        if (a.silverHoldings) {
          setSilverWeight(String(a.silverHoldings.weight || 0));
          setSilverUnit(a.silverHoldings.unit || 'TOLA');
        }
        setSilverRate(String(a.silverRatePerTola || 3100));

        setKametiVal(String(a.kametiReceivables || 0));
        setLoansVal(String(a.recoverableLoans || 0));

        setUtilityDebts(String(a.unpaidUtilityBills || 0));
        setSchoolDebts(String(a.unpaidSchoolFees || 0));
        setStaffDebts(String(a.unpaidStaffSalaries || 0));
        setOtherDebts(String(a.otherShortTermDebts || 0));
      }

      // Load initial Fitrana safely
      try {
        const fit = await zakatApi.getFitranaEstimate(householdHeads);
        if (fit && fit.estimates) {
          setFitranaEstimates(fit.estimates);
        }
      } catch (fitErr) {
        console.warn('[Fitrana] Initial load warning:', fitErr);
      }
    } catch (err: any) {
      console.error('[ZakatSadqahModal] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [householdHeads]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
    else Alert.alert('ڈیجی حساب', msg);
  };

  // 1-Tap Auto-Sync with live Vaults
  const handleSyncWithVaults = async () => {
    try {
      setSyncing(true);
      const updated = await zakatApi.syncWithVaults();
      setAssessment(updated);
      setCashVal(String(updated.cashInHand || 0));
      setBankVal(String(updated.bankBalances || 0));
      setWalletsVal(String(updated.digitalWallets || 0));
      setKametiVal(String(updated.kametiReceivables || 0));
      setUtilityDebts(String(updated.unpaidUtilityBills || 0));
      setSchoolDebts(String(updated.unpaidSchoolFees || 0));
      setStaffDebts(String(updated.unpaidStaffSalaries || 0));
      notify('والٹس، کمیٹی اور یوٹیلیٹی بلز سے ڈیٹا خودکار طور پر ہم آہنگ ہو گیا ہے۔');
    } catch (err: any) {
      Alert.alert('خرابی', err?.message || 'والٹس سے ڈیٹا ہم آہنگ نہیں ہو سکا۔');
    } finally {
      setSyncing(false);
    }
  };

  // Recalculate Assessment
  const handleRecalculate = async () => {
    try {
      setSubmitting(true);
      const updated = await zakatApi.calculate({
        cashInHand: parseFloat(cashVal) || 0,
        bankBalances: parseFloat(bankVal) || 0,
        digitalWallets: parseFloat(walletsVal) || 0,
        businessInventoryValue: parseFloat(inventoryVal) || 0,

        goldRatePerTola: parseFloat(goldRate) || 275000,
        silverRatePerTola: parseFloat(silverRate) || 3100,

        goldHoldings: {
          weight: parseFloat(goldWeight) || 0,
          unit: goldUnit,
          purity: goldPurity,
          ratePerTola: parseFloat(goldRate) || 275000,
          calculatedValue: 0,
        },

        silverHoldings: {
          weight: parseFloat(silverWeight) || 0,
          unit: silverUnit,
          ratePerTola: parseFloat(silverRate) || 3100,
          calculatedValue: 0,
        },

        kametiReceivables: parseFloat(kametiVal) || 0,
        recoverableLoans: parseFloat(loansVal) || 0,

        unpaidUtilityBills: parseFloat(utilityDebts) || 0,
        unpaidSchoolFees: parseFloat(schoolDebts) || 0,
        unpaidStaffSalaries: parseFloat(staffDebts) || 0,
        otherShortTermDebts: parseFloat(otherDebts) || 0,
      });

      setAssessment(updated);
      notify('زکوٰۃ کا نیا حساب محفوظ ہو گیا ہے۔');
    } catch (err: any) {
      Alert.alert('خرابی', err?.message || 'حساب اپڈیٹ نہیں ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Disburse Charity Submit
  const handleDisburseSubmit = async () => {
    const num = parseFloat(disburseAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('انتباہ', 'براہ کرم ادائیگی کی درست رقم درج کریں۔');
      return;
    }
    if (!disburseRecipient.trim()) {
      Alert.alert('انتباہ', 'مستحق کا نام یا شناخت درج کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      const res = await zakatApi.disburse({
        recipientName: disburseRecipient.trim(),
        recipientCategory: disburseCategory,
        purpose: disbursePurpose.trim(),
        amount: num,
        charityType: disburseCharityType,
        debitedFromVaultAccountId: disburseVaultId || undefined,
        paymentMode: disbursePaymentMode,
        isAnonymous: disburseAnonymous,
        notes: disburseNotes.trim(),
      });

      setAssessment(res.assessment);
      setShowDisburseModal(false);
      setDisburseAmount('');
      setDisburseNotes('');
      notify(
        `ادائیگی بحساب Rs. ${num.toLocaleString()} واؤچر ${res.voucherNumber} کے تحت محفوظ ہو گئی ہے۔`
      );
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || err.message || 'ادائیگی لاگ نہیں ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete/Revert Disbursement
  const handleDeleteDisbursement = (id: string, voucherNo: string) => {
    Alert.alert(
      'ادائیگی حذف کریں',
      `کیا آپ واقعی واؤچر ${voucherNo} کی ادائیگی کو حذف کرنا چاہتے ہیں؟ اگر والٹ سے رقم کاٹی گئی تھی تو وہ خودکار واپس جمع ہو جائے گی۔`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'ہاں، حذف کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = await zakatApi.deleteDisbursement(id);
              setAssessment(updated);
              notify('ادائیگی کا ریکارڈ حذف ہو گیا اور بیلنس بحال ہو گیا۔');
            } catch (err: any) {
              Alert.alert('خرابی', err?.message || 'ریکارڈ حذف نہیں ہو سکا۔');
            }
          },
        },
      ]
    );
  };

  // WhatsApp Share Slip
  const handleShareSlip = async (id: string) => {
    try {
      const res = await zakatApi.getShareText(id);
      await Share.share({ message: res.shareText });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Fitrana Head Count Change
  const handleHeadsChange = async (delta: number) => {
    const nextHeads = Math.max(1, householdHeads + delta);
    setHouseholdHeads(nextHeads);
    try {
      const res = await zakatApi.getFitranaEstimate(nextHeads);
      setFitranaEstimates(res.estimates || []);
    } catch (err) {
      console.warn('Fitrana estimate error:', err);
    }
  };

  // Progress Percent
  const progressPercent = useMemo(() => {
    if (!assessment || assessment.totalZakatDue <= 0) return 0;
    return Math.min(
      100,
      Math.round((assessment.totalZakatDistributed / assessment.totalZakatDue) * 100)
    );
  }, [assessment]);

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
              <Ionicons name="heart-circle" size={20} color="#2dd4bf" />
              <Text style={styles.headerTitle}>زکوٰۃ، صدقات و فطرانہ کیلکولیٹر</Text>
            </View>
            <Text style={styles.headerSub}>Zakat, Sadqah & Fitrana Auto-Calculator • 1448ھ</Text>
          </View>

          <TouchableOpacity style={styles.refreshBtn} onPress={loadData} activeOpacity={0.7}>
            <Ionicons name="refresh" size={18} color="#2dd4bf" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2dd4bf" />
            <Text style={styles.loadingText}>زکوٰۃ، نصاب اور والٹس کا حساب لگایا جا رہا ہے...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= 2. TOP NISAB & PROGRESS DECK ================= */}
            {assessment && (
              <View style={styles.topNisabDeck}>
                {/* Hijri & Nisab Status Banner */}
                <View style={styles.nisabBannerRow}>
                  <View style={styles.hijriPill}>
                    <Ionicons name="moon" size={12} color="#f59e0b" />
                    <Text style={styles.hijriPillText}>{assessment.hijriYear}</Text>
                  </View>

                  <View
                    style={[
                      styles.nisabStatusBadge,
                      {
                        backgroundColor: assessment.isEligibleForZakat
                          ? 'rgba(45, 212, 191, 0.15)'
                          : 'rgba(148, 163, 184, 0.15)',
                        borderColor: assessment.isEligibleForZakat ? '#2dd4bf' : '#64748b',
                      },
                    ]}
                  >
                    <Ionicons
                      name={assessment.isEligibleForZakat ? 'checkmark-circle' : 'information-circle'}
                      size={14}
                      color={assessment.isEligibleForZakat ? '#2dd4bf' : '#94a3b8'}
                    />
                    <Text
                      style={[
                        styles.nisabStatusBadgeText,
                        { color: assessment.isEligibleForZakat ? '#2dd4bf' : '#94a3b8' },
                      ]}
                    >
                      {assessment.isEligibleForZakat
                        ? 'صاحبِ نصاب • زکوٰۃ واجب ہے'
                        : 'زیرِ نصاب • زکوٰۃ معاف ہے'}
                    </Text>
                  </View>
                </View>

                {/* Nisab Rate Explanation */}
                <Text style={styles.nisabDetailText}>
                  ⚖️ چاندی نصاب (52.5 تولہ): <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Rs. {assessment.nisabThresholdValue.toLocaleString()}</Text> (شریعہ معیار برائے مخلوط اموال)
                </Text>

                {/* 3-Card Summary Strip */}
                <View style={styles.summaryDeckRow}>
                  {/* Card 1: Net Taxable Wealth */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardLabel}>قابلِ زکوٰۃ خالص مال</Text>
                    <Text style={[styles.summaryCardVal, { color: '#ffffff' }]}>
                      Rs. {assessment.netTaxableWealth.toLocaleString()}
                    </Text>
                    <Text style={styles.summaryCardSub}>اثاثے منفی قرضے</Text>
                  </View>

                  {/* Card 2: 2.5% Zakat Due */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardLabel}>سالانہ زکوٰۃ (2.5%)</Text>
                    <Text style={[styles.summaryCardVal, { color: '#f59e0b' }]}>
                      Rs. {assessment.totalZakatDue.toLocaleString()}
                    </Text>
                    <Text style={styles.summaryCardSub}>1/40 واں حصہ</Text>
                  </View>

                  {/* Card 3: Remaining Obligation */}
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardLabel}>باقی رقم برائے تقسیم</Text>
                    <Text style={[styles.summaryCardVal, { color: '#2dd4bf' }]}>
                      Rs. {assessment.remainingZakatBalance.toLocaleString()}
                    </Text>
                    <Text style={styles.summaryCardSub}>
                      {assessment.remainingZakatBalance === 0 ? '✅ 100% مکمل' : 'تقسیم باقی'}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressWrap}>
                  <View style={styles.progressBarTrack}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                  </View>
                  <View style={styles.progressInfoRow}>
                    <Text style={styles.progressText}>
                      ادا شدہ: Rs. {assessment.totalZakatDistributed.toLocaleString()} ({progressPercent}%)
                    </Text>
                    <Text style={styles.progressTextRight}>
                      کل واجب: Rs. {assessment.totalZakatDue.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons: 1-Tap Vault Sync & Disburse */}
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={[styles.syncVaultBtn, syncing && { opacity: 0.6 }]}
                    onPress={handleSyncWithVaults}
                    disabled={syncing}
                    activeOpacity={0.8}
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color="#38bdf8" />
                    ) : (
                      <>
                        <Ionicons name="sync-outline" size={16} color="#38bdf8" />
                        <Text style={styles.syncVaultBtnText}>والٹس و بلز سے خودکار امپورٹ کریں</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.disburseActionBtn}
                    onPress={() => setShowDisburseModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="gift-outline" size={16} color="#070d18" />
                    <Text style={styles.disburseActionBtnText}>+ مستحق کو رقم ادا کریں</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ================= 3. SCROLLABLE CALCULATOR TABS ================= */}
            <View style={styles.tabScrollWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.touchScrollStrip}
              >
                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'METALS' && styles.touchTabActive]}
                  onPress={() => setActiveTab('METALS')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="sparkles-outline"
                    size={15}
                    color={activeTab === 'METALS' ? '#f59e0b' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'METALS' && styles.touchTabTextActive,
                    ]}
                  >
                    🥇 سونا و چاندی
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'CASH' && styles.touchTabActive]}
                  onPress={() => setActiveTab('CASH')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="cash-outline"
                    size={15}
                    color={activeTab === 'CASH' ? '#2dd4bf' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'CASH' && styles.touchTabTextActive,
                    ]}
                  >
                    💰 نقد و والٹس
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'RECEIVABLES' && styles.touchTabActive]}
                  onPress={() => setActiveTab('RECEIVABLES')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="people-outline"
                    size={15}
                    color={activeTab === 'RECEIVABLES' ? '#38bdf8' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'RECEIVABLES' && styles.touchTabTextActive,
                    ]}
                  >
                    🤝 کمیٹی و قرضے
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'DEBTS' && styles.touchTabActive]}
                  onPress={() => setActiveTab('DEBTS')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="trending-down-outline"
                    size={15}
                    color={activeTab === 'DEBTS' ? '#ef4444' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'DEBTS' && styles.touchTabTextActive,
                    ]}
                  >
                    📉 منفی واجبات
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'FITRANA' && styles.touchTabActive]}
                  onPress={() => setActiveTab('FITRANA')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="nutrition-outline"
                    size={15}
                    color={activeTab === 'FITRANA' ? '#00d49f' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'FITRANA' && styles.touchTabTextActive,
                    ]}
                  >
                    🎁 فطرانہ و صدقات
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.touchTab, activeTab === 'LOG' && styles.touchTabActive]}
                  onPress={() => setActiveTab('LOG')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={15}
                    color={activeTab === 'LOG' ? '#a855f7' : '#94a3b8'}
                  />
                  <Text
                    style={[
                      styles.touchTabText,
                      activeTab === 'LOG' && styles.touchTabTextActive,
                    ]}
                  >
                    📜 تقسیم کا لاگ ({assessment?.disbursements?.length || 0})
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* ================= TAB 1: GOLD & SILVER (سونا و چاندی) ================= */}
            {activeTab === 'METALS' && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="sparkles" size={17} color="#f59e0b" />
                    <Text style={styles.cardTitle}>سونے اور چاندی کا وزن و مالیت</Text>
                  </View>
                  <Text style={styles.metalRatesTag}>
                    مارکیٹ ریٹ: سونا Rs. {parseInt(goldRate).toLocaleString()}/تولہ
                  </Text>
                </View>

                {/* Gold Section */}
                <View style={styles.metalBox}>
                  <View style={styles.metalBoxHeader}>
                    <Text style={styles.metalBoxTitle}>🥇 سونے کے اثاثے (Gold Holdings)</Text>
                    {/* Unit Switcher: Tola / Gram */}
                    <View style={styles.unitToggleWrap}>
                      <TouchableOpacity
                        style={[styles.unitBtn, goldUnit === 'TOLA' && styles.unitBtnActive]}
                        onPress={() => setGoldUnit('TOLA')}
                      >
                        <Text style={[styles.unitBtnText, goldUnit === 'TOLA' && styles.unitBtnTextActive]}>
                          تولہ (Tola)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitBtn, goldUnit === 'GRAM' && styles.unitBtnActive]}
                        onPress={() => setGoldUnit('GRAM')}
                      >
                        <Text style={[styles.unitBtnText, goldUnit === 'GRAM' && styles.unitBtnTextActive]}>
                          گرام (Gram)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Weight Input */}
                  <Text style={styles.inputLabel}>کل وزن ({goldUnit === 'TOLA' ? 'تولہ' : 'گرام'}):</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 16, color: '#f59e0b', fontWeight: 'bold' }]}
                    value={goldWeight}
                    onChangeText={setGoldWeight}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  {/* Gold Purity Carat Selector */}
                  <Text style={styles.inputLabel}>قیراط / خالصیت (Purity Tier):</Text>
                  <View style={styles.chipRow}>
                    {[
                      { key: '24K', label: '24K خالص (100%)' },
                      { key: '22K', label: '22K زیور (91.6%)' },
                      { key: '21K', label: '21K (87.5%)' },
                      { key: '18K', label: '18K (75%)' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        style={[styles.purityChip, goldPurity === p.key && styles.purityChipActive]}
                        onPress={() => setGoldPurity(p.key as GoldPurity)}
                      >
                        <Text style={[styles.purityChipText, goldPurity === p.key && styles.purityChipTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.calculatedValuePill}>
                    <Text style={styles.calcValueLabel}>سونے کی قابلِ زکوٰۃ مالیت:</Text>
                    <Text style={styles.calcValueText}>
                      Rs. {assessment?.goldHoldings?.calculatedValue?.toLocaleString() || '0'}
                    </Text>
                  </View>
                </View>

                {/* Silver Section */}
                <View style={[styles.metalBox, { marginTop: 12 }]}>
                  <View style={styles.metalBoxHeader}>
                    <Text style={styles.metalBoxTitle}>🥈 چاندی کے اثاثے (Silver Holdings)</Text>
                    <View style={styles.unitToggleWrap}>
                      <TouchableOpacity
                        style={[styles.unitBtn, silverUnit === 'TOLA' && styles.unitBtnActive]}
                        onPress={() => setSilverUnit('TOLA')}
                      >
                        <Text style={[styles.unitBtnText, silverUnit === 'TOLA' && styles.unitBtnTextActive]}>
                          تولہ
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.unitBtn, silverUnit === 'GRAM' && styles.unitBtnActive]}
                        onPress={() => setSilverUnit('GRAM')}
                      >
                        <Text style={[styles.unitBtnText, silverUnit === 'GRAM' && styles.unitBtnTextActive]}>
                          گرام
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>چاندی کا وزن ({silverUnit === 'TOLA' ? 'تولہ' : 'گرام'}):</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 16, color: '#CBD5E1', fontWeight: 'bold' }]}
                    value={silverWeight}
                    onChangeText={setSilverWeight}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  <View style={styles.calculatedValuePill}>
                    <Text style={styles.calcValueLabel}>چاندی کی قابلِ زکوٰۃ مالیت:</Text>
                    <Text style={[styles.calcValueText, { color: '#CBD5E1' }]}>
                      Rs. {assessment?.silverHoldings?.calculatedValue?.toLocaleString() || '0'}
                    </Text>
                  </View>
                </View>

                {/* Recalculate Button */}
                <TouchableOpacity
                  style={[styles.recalcBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleRecalculate}
                  disabled={submitting}
                >
                  <Ionicons name="calculator-outline" size={17} color="#070d18" />
                  <Text style={styles.recalcBtnText}>نیا حساب لاگو کریں (Recalculate)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 2: CASH & VAULTS (نقد و والٹس) ================= */}
            {activeTab === 'CASH' && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="cash" size={17} color="#2dd4bf" />
                    <Text style={styles.cardTitle}>گھریلو نقد، بینک اور موبائل والٹس</Text>
                  </View>
                  <TouchableOpacity onPress={handleSyncWithVaults} activeOpacity={0.7}>
                    <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: 'bold' }}>🔄 آٹو سنک</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>گھریلو نقدی / دراز میں کیش (Cash in Hand):</Text>
                <TextInput
                  style={styles.textInput}
                  value={cashVal}
                  onChangeText={setCashVal}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>کمرشل بینک بیلنس (Meezan, HBL, Alfalah):</Text>
                <TextInput
                  style={styles.textInput}
                  value={bankVal}
                  onChangeText={setBankVal}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>موبائل والٹس (JazzCash, EasyPaisa, SadaPay):</Text>
                <TextInput
                  style={styles.textInput}
                  value={walletsVal}
                  onChangeText={setWalletsVal}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>تجارتی سامان / دکان مالِ تجارت (Business Inventory):</Text>
                <TextInput
                  style={styles.textInput}
                  value={inventoryVal}
                  onChangeText={setInventoryVal}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={[styles.recalcBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleRecalculate}
                  disabled={submitting}
                >
                  <Ionicons name="calculator-outline" size={17} color="#070d18" />
                  <Text style={styles.recalcBtnText}>رقم محفوظ کریں (Update Balances)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 3: KAMETI & RECEIVABLES (کمیٹی و قرضے) ================= */}
            {activeTab === 'RECEIVABLES' && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="people" size={17} color="#38bdf8" />
                    <Text style={styles.cardTitle}>کمیٹی و وصول طلب قرض حسنہ</Text>
                  </View>
                </View>

                <Text style={styles.inputLabel}>کمیٹی کھاتہ جو وصول ہونی ہے (Kameti Receivables):</Text>
                <TextInput
                  style={styles.textInput}
                  value={kametiVal}
                  onChangeText={setKametiVal}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <Text style={styles.hintSub}>
                  وہ رقم جو آپ نے کمیٹی میں جمع کروا رکھی ہے اور مستقبل میں آپ کو وصول ہونی ہے۔
                </Text>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                  قرض حسنہ جو کسی کو دیا ہوا ہے (Recoverable Loans):
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={loansVal}
                  onChangeText={setLoansVal}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />
                <Text style={styles.hintSub}>
                  وہ قرض جو کسی عزیز یا دوست کو دیا گیا ہو اور واپسی کی قوی امید ہو۔
                </Text>

                <TouchableOpacity
                  style={[styles.recalcBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleRecalculate}
                  disabled={submitting}
                >
                  <Ionicons name="calculator-outline" size={17} color="#070d18" />
                  <Text style={styles.recalcBtnText}>محفوظ کریں (Save Receivables)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 4: DEDUCTIBLE DEBTS (منفی واجبات) ================= */}
            {activeTab === 'DEBTS' && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="trending-down" size={17} color="#ef4444" />
                    <Text style={styles.cardTitle}>منفی واجبات و فوری گھریلو قرضے</Text>
                  </View>
                  <TouchableOpacity onPress={handleSyncWithVaults} activeOpacity={0.7}>
                    <Text style={{ fontSize: 11, color: '#38bdf8', fontWeight: 'bold' }}>🔄 بلز امپورٹ</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>غیر ادا شدہ یوٹیلیٹی بلز (Utility Bills Due):</Text>
                <TextInput
                  style={styles.textInput}
                  value={utilityDebts}
                  onChangeText={setUtilityDebts}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>بچوں کی اسکول و اکیڈمی فیس (School Challans):</Text>
                <TextInput
                  style={styles.textInput}
                  value={schoolDebts}
                  onChangeText={setSchoolDebts}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>ملازمین کی واجب الادا تنخواہیں (Staff Salaries):</Text>
                <TextInput
                  style={styles.textInput}
                  value={staffDebts}
                  onChangeText={setStaffDebts}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>دیگر فوری گھریلو قرضے (Short-Term Debt):</Text>
                <TextInput
                  style={styles.textInput}
                  value={otherDebts}
                  onChangeText={setOtherDebts}
                  placeholder="Rs. 0"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={[styles.recalcBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleRecalculate}
                  disabled={submitting}
                >
                  <Ionicons name="calculator-outline" size={17} color="#070d18" />
                  <Text style={styles.recalcBtnText}>واجبات منہا کریں (Deduct Liabilities)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 5: FITRANA & SADQAH (فطرانہ و صدقات) ================= */}
            {activeTab === 'FITRANA' && (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Ionicons name="nutrition" size={17} color="#00d49f" />
                    <Text style={styles.cardTitle}>صدقۃ الفطر آٹو کیلکولیٹر (Fitrana)</Text>
                  </View>
                </View>

                {/* Family Head Counter */}
                <View style={styles.headsCounterRow}>
                  <View>
                    <Text style={styles.headsTitle}>خاندان کے کل افراد (Household Members):</Text>
                    <Text style={styles.headsSub}>بشمول بچے و سرپرست</Text>
                  </View>

                  <View style={styles.counterBtns}>
                    <TouchableOpacity
                      style={styles.countBtn}
                      onPress={() => handleHeadsChange(-1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove" size={18} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.countText}>{householdHeads}</Text>
                    <TouchableOpacity
                      style={styles.countBtn}
                      onPress={() => handleHeadsChange(1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 4 Commodity Cards */}
                <View style={styles.fitranaGrid}>
                  {fitranaEstimates.map((item) => (
                    <View key={item.id} style={styles.commodityCard}>
                      <View style={styles.commodityTop}>
                        <Text style={styles.commodityName}>{item.nameUrdu}</Text>
                        <Text style={styles.commodityRate}>Rs. {item.ratePerHead} / فرد</Text>
                      </View>
                      <Text style={styles.commodityDesc}>{item.description}</Text>

                      <View style={styles.commodityFooter}>
                        <View>
                          <Text style={styles.totalFitranaLabel}>کل فطرانہ ({householdHeads} افراد):</Text>
                          <Text style={styles.totalFitranaVal}>Rs. {item.totalFitrana.toLocaleString()}</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.payFitranaBtn}
                          onPress={() => {
                            setDisburseCharityType('FITRANA');
                            setDisbursePurpose(`فطرانہ (${item.nameUrdu} - ${householdHeads} افراد)`);
                            setDisburseAmount(String(item.totalFitrana));
                            setShowDisburseModal(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.payFitranaBtnText}>ادائیگی درج کریں</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ================= TAB 6: DISBURSEMENT REGISTER (تقسیم کا لاگ) ================= */}
            {activeTab === 'LOG' && (
              <View style={styles.tabContent}>
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => setShowDisburseModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#070d18" />
                  <Text style={styles.primaryActionBtnText}>+ نئی زکوٰۃ یا صدقہ ادائیگی درج کریں</Text>
                </TouchableOpacity>

                <Text style={styles.sectionHeaderTitle}>مستحقین کو تقسیم کی گئی رقوم (Charity Distributions):</Text>

                {assessment?.disbursements?.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Ionicons name="gift-outline" size={36} color="#64748b" />
                    <Text style={styles.emptyCardText}>ابھی کوئی خیرات یا زکوٰۃ لاگ نہیں ہوئی۔</Text>
                  </View>
                ) : (
                  assessment?.disbursements?.map((d: any) => {
                    const catMeta = MUSTAHIQ_CATEGORIES.find((c) => c.key === d.recipientCategory) || MUSTAHIQ_CATEGORIES[0];
                    const typeUrdu = d.charityType === 'FITRANA' ? 'فطرانہ' : d.charityType === 'SADQAH' ? 'صدقہ' : 'زکوٰۃ';

                    return (
                      <View key={d._id} style={styles.disbursementCard}>
                        <View style={styles.disbursementTop}>
                          <View
                            style={[
                              styles.catIconWrap,
                              { backgroundColor: catMeta.color + '22', borderColor: catMeta.color + '55' },
                            ]}
                          >
                            <Ionicons name={catMeta.icon} size={18} color={catMeta.color} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <View style={styles.disbursementTitleRow}>
                              <Text style={styles.disbursementName} numberOfLines={1}>
                                {d.isAnonymous ? 'پردہ داری میں محفوظ مستحق' : d.recipientName}
                              </Text>
                              <View style={[styles.typePill, { borderColor: catMeta.color + '44' }]}>
                                <Text style={[styles.typePillText, { color: catMeta.color }]}>{typeUrdu}</Text>
                              </View>
                            </View>
                            <Text style={styles.disbursementPurposeSub}>{d.purpose}</Text>
                          </View>
                          <Text style={styles.disbursementAmount}>
                            Rs. {d.amount.toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.disbursementFooter}>
                          <View style={styles.voucherPill}>
                            <Text style={styles.voucherPillText}>{d.voucherNumber}</Text>
                          </View>

                          <Text style={styles.disbursementDateText}>
                            {new Date(d.disbursementDate).toLocaleDateString('ur-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>

                          <View style={styles.cardActionsRow}>
                            {/* WhatsApp Slip */}
                            <TouchableOpacity
                              style={styles.iconMiniBtn}
                              onPress={() => handleShareSlip(d._id)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="logo-whatsapp" size={15} color="#22c55e" />
                            </TouchableOpacity>

                            {/* Delete */}
                            <TouchableOpacity
                              style={[styles.iconMiniBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                              onPress={() => handleDeleteDisbursement(d._id, d.voucherNumber)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="trash-outline" size={14} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* ================= SUB-MODAL: DISBURSE CHARITY ================= */}
        {showDisburseModal && (
          <Modal visible={true} transparent={true} animationType="slide">
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>🤲 مستحق کو ادائیگی کا اندراج (Disburse Charity)</Text>
                  <TouchableOpacity onPress={() => setShowDisburseModal(false)}>
                    <Ionicons name="close" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                  {/* Charity Type Selector */}
                  <Text style={styles.inputLabel}>خیرات کی قسم (Charity Type):</Text>
                  <View style={styles.chipRow}>
                    {[
                      { key: 'ZAKAT', label: 'زکوٰۃ (2.5% واجب)' },
                      { key: 'SADQAH', label: 'نفلی صدقہ' },
                      { key: 'FITRANA', label: 'صدقۃ الفطر' },
                    ].map((t) => (
                      <TouchableOpacity
                        key={t.key}
                        style={[
                          styles.sourceChip,
                          disburseCharityType === t.key && styles.sourceChipActive,
                        ]}
                        onPress={() => setDisburseCharityType(t.key as CharityType)}
                      >
                        <Text
                          style={[
                            styles.sourceChipText,
                            disburseCharityType === t.key && styles.sourceChipTextActive,
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Recipient Category */}
                  <Text style={styles.inputLabel}>مستحق کی کیٹیگری (Mustahiq Category):</Text>
                  <View style={styles.chipRow}>
                    {MUSTAHIQ_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.sourceChip,
                          disburseCategory === cat.key && styles.sourceChipActive,
                        ]}
                        onPress={() => setDisburseCategory(cat.key)}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={13}
                          color={disburseCategory === cat.key ? '#2dd4bf' : '#94a3b8'}
                        />
                        <Text
                          style={[
                            styles.sourceChipText,
                            disburseCategory === cat.key && styles.sourceChipTextActive,
                          ]}
                        >
                          {cat.labelUrdu}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Recipient Name */}
                  <Text style={styles.inputLabel}>مستحق کا نام / شناخت:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={disburseRecipient}
                    onChangeText={setDisburseRecipient}
                    placeholder="مثال: بیوہ خالہ، نسیم بی بی (ملازمہ)، جامعہ اشرفیہ"
                    placeholderTextColor="#64748b"
                  />

                  {/* Purpose */}
                  <Text style={styles.inputLabel}>مقصد / مد:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={disbursePurpose}
                    onChangeText={setDisbursePurpose}
                    placeholder="مثال: بچوں کی اسکول فیس، ماہانہ راشن پیکج"
                    placeholderTextColor="#64748b"
                  />

                  {/* Quick Purpose Chips */}
                  <View style={styles.quickPurposeRow}>
                    {['بچوں کے تعلیمی اخراجات', 'ماہانہ راشن پیکج', 'علاج و ادویات', 'عید کفالت'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={styles.quickPurposeBtn}
                        onPress={() => setDisbursePurpose(p)}
                      >
                        <Text style={styles.quickPurposeBtnText}>{p}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Amount */}
                  <Text style={styles.inputLabel}>رقم (PKR):</Text>
                  <TextInput
                    style={[styles.textInput, { fontSize: 18, color: '#2dd4bf', fontWeight: 'bold' }]}
                    value={disburseAmount}
                    onChangeText={setDisburseAmount}
                    placeholder="Rs. 10,000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                  />

                  {/* Quick Amount Chips */}
                  <View style={styles.quickAmountRow}>
                    {[5000, 10000, 15000, 25000, 50000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.quickAmtBtn}
                        onPress={() => setDisburseAmount(String(amt))}
                      >
                        <Text style={styles.quickAmtBtnText}>+{amt / 1000}k</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 1-Tap Debit from Vault Account */}
                  <Text style={styles.inputLabel}>کس والٹ سے کٹوتی کرنی ہے؟ (Debit From Vault):</Text>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      style={[
                        styles.vaultSelectChip,
                        !disburseVaultId && styles.vaultSelectChipActive,
                      ]}
                      onPress={() => setDisburseVaultId('')}
                    >
                      <Text
                        style={[
                          styles.vaultSelectChipText,
                          !disburseVaultId && styles.vaultSelectChipTextActive,
                        ]}
                      >
                        والٹ کٹوتی نہیں (صرف اندراج)
                      </Text>
                    </TouchableOpacity>

                    {availableVaults.map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.vaultSelectChip,
                          disburseVaultId === v.id && styles.vaultSelectChipActive,
                        ]}
                        onPress={() => setDisburseVaultId(v.id)}
                      >
                        <Text
                          style={[
                            styles.vaultSelectChipText,
                            disburseVaultId === v.id && styles.vaultSelectChipTextActive,
                          ]}
                        >
                          {v.accountTitle} (Rs. {v.currentBalance.toLocaleString()})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Confidentiality / Anonymous Toggle */}
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>پردہ داری / رازداری (Confidential / Anonymous)</Text>
                      <Text style={styles.switchSub}>مستحق کی عزتِ نفس کی حفاظت کے لیے رسید میں نام مخفی رہے گا</Text>
                    </View>
                    <Switch
                      value={disburseAnonymous}
                      onValueChange={setDisburseAnonymous}
                      trackColor={{ false: '#1e293b', true: '#2dd4bf' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  {/* Notes */}
                  <Text style={styles.inputLabel}>اضافی نوٹ (اختیاری):</Text>
                  <TextInput
                    style={styles.textInput}
                    value={disburseNotes}
                    onChangeText={setDisburseNotes}
                    placeholder="کوئی خفیہ تفصیل..."
                    placeholderTextColor="#64748b"
                  />
                </ScrollView>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleDisburseSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>ادائیگی تصدیق کریں (Confirm & Disburse)</Text>
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

  /* Top Nisab & Progress Deck */
  topNisabDeck: {
    backgroundColor: '#09111e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    marginBottom: 14,
  },
  nisabBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hijriPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  hijriPillText: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  nisabStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  nisabStatusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  nisabDetailText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
    lineHeight: 18,
  },
  summaryDeckRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0d1627',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  summaryCardLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  summaryCardVal: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginVertical: 2,
  },
  summaryCardSub: {
    fontSize: 9.5,
    color: '#64748b',
  },

  progressWrap: {
    marginTop: 4,
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#17233b',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2dd4bf',
    borderRadius: 4,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#2dd4bf',
    fontWeight: '500',
  },
  progressTextRight: {
    fontSize: 11,
    color: '#94a3b8',
  },

  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  syncVaultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingVertical: 10,
    borderRadius: 10,
  },
  syncVaultBtnText: {
    fontSize: 11.5,
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  disburseActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#2dd4bf',
    paddingVertical: 10,
    borderRadius: 10,
  },
  disburseActionBtnText: {
    fontSize: 11.5,
    color: '#070d18',
    fontWeight: 'bold',
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
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    borderColor: '#2dd4bf',
  },
  touchTabText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  touchTabTextActive: {
    color: '#2dd4bf',
    fontWeight: 'bold',
  },

  /* Cards & Forms */
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
    marginBottom: 12,
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
  metalRatesTag: {
    fontSize: 10.5,
    color: '#f59e0b',
  },

  metalBox: {
    backgroundColor: '#09111e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
  },
  metalBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metalBoxTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  unitToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#17233b',
    borderRadius: 6,
    padding: 2,
  },
  unitBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  unitBtnActive: {
    backgroundColor: '#2dd4bf',
  },
  unitBtnText: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  unitBtnTextActive: {
    color: '#070d18',
    fontWeight: 'bold',
  },

  inputLabel: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: '#ffffff',
  },
  hintSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 14,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  purityChip: {
    backgroundColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  purityChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  purityChipText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  purityChipTextActive: {
    color: '#f59e0b',
    fontWeight: 'bold',
  },

  calculatedValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },
  calcValueLabel: {
    fontSize: 11,
    color: '#94a3b8',
  },
  calcValueText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#f59e0b',
    fontFamily: 'monospace',
  },

  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2dd4bf',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  recalcBtnText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#070d18',
  },

  /* Fitrana Section */
  headsCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#09111e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    marginBottom: 12,
  },
  headsTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headsSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  counterBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#17233b',
    borderRadius: 8,
    padding: 4,
  },
  countBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#0d1627',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2dd4bf',
    minWidth: 22,
    textAlign: 'center',
  },
  fitranaGrid: {
    gap: 10,
  },
  commodityCard: {
    backgroundColor: '#09111e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
  },
  commodityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commodityName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  commodityRate: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  commodityDesc: {
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 8,
  },
  commodityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 8,
  },
  totalFitranaLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  totalFitranaVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00d49f',
    fontFamily: 'monospace',
  },
  payFitranaBtn: {
    backgroundColor: '#00d49f',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  payFitranaBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#070d18',
  },

  /* Disbursements Log */
  tabContent: {
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2dd4bf',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionHeaderTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#CBD5E1',
    marginTop: 4,
  },
  disbursementCard: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
  },
  disbursementTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disbursementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disbursementName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  typePill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    marginLeft: 6,
  },
  typePillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  disbursementPurposeSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  disbursementAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2dd4bf',
    fontFamily: 'monospace',
    marginLeft: 8,
  },
  disbursementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#17233b',
  },
  voucherPill: {
    backgroundColor: '#09111e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  voucherPillText: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  disbursementDateText: {
    fontSize: 10.5,
    color: '#64748b',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  iconMiniBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },

  /* Empty State */
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

  /* Sub Modal */
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
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#09111e',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  sourceChipActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: '#2dd4bf',
  },
  sourceChipText: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  sourceChipTextActive: {
    color: '#2dd4bf',
    fontWeight: 'bold',
  },
  quickPurposeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
  },
  quickPurposeBtn: {
    backgroundColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickPurposeBtnText: {
    fontSize: 10,
    color: '#38bdf8',
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  quickAmtBtn: {
    backgroundColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickAmtBtnText: {
    fontSize: 10.5,
    color: '#2dd4bf',
    fontWeight: 'bold',
  },
  vaultSelectChip: {
    backgroundColor: '#09111e',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  vaultSelectChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  vaultSelectChipText: {
    fontSize: 10.5,
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
    marginTop: 10,
  },
  switchTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  switchSub: {
    fontSize: 9.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  modalSubmitBtn: {
    backgroundColor: '#2dd4bf',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#070d18',
  },
});
