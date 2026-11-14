import React, { useState, useEffect, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  dailyProvisionApi,
  IReconciliationReport,
  IReconciliationDayItem,
  IDailyProvisionSettings,
} from '../api/dailyProvision.api';

interface DailyProvisionRegisterModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

type ActiveTab = 'COUNTER' | 'PARCHA' | 'SETTINGS';

export const DailyProvisionRegisterModal: React.FC<DailyProvisionRegisterModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ActiveTab>('COUNTER');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Month Key for reconciliation
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);

  // Reconciliation Report & Settings State
  const [report, setReport] = useState<IReconciliationReport | null>(null);
  const [settings, setSettings] = useState<IDailyProvisionSettings | null>(null);

  // Daily Counter Form State
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  }, []);

  const [logDate, setLogDate] = useState<string>(todayStr);
  const [milkLiters, setMilkLiters] = useState<number>(1.5);
  const [isMilkSkipped, setIsMilkSkipped] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // Milk Rate Adjustment System
  const [customMilkRate, setCustomMilkRate] = useState<number | null>(null);
  const [showRateEditor, setShowRateEditor] = useState<boolean>(false);
  const [tempMilkRate, setTempMilkRate] = useState<string>('210');
  const [saveAsDefaultRate, setSaveAsDefaultRate] = useState<boolean>(true);
  const [savingRate, setSavingRate] = useState<boolean>(false);

  // Settle Bill Sub-Modal
  const [showSettleModal, setShowSettleModal] = useState<boolean>(false);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleChannel, setSettleChannel] = useState<'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK'>('CASH');
  const [settleNotes, setSettleNotes] = useState<string>('');

  // Advance Sub-Modal
  const [showAdvanceModal, setShowAdvanceModal] = useState<boolean>(false);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceChannel, setAdvanceChannel] = useState<'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK'>('CASH');
  const [advanceNotes, setAdvanceNotes] = useState<string>('');

  // Selected Day Micro-Editor for Parcha
  const [selectedParchaDay, setSelectedParchaDay] = useState<IReconciliationDayItem | null>(null);

  // In-Modal Success Feedback Banner
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<{
    message: string;
    date: string;
    liters: number;
    cost: number;
    isSkipped: boolean;
  } | null>(null);

  // Current day's log entry from reconciliation report
  const currentDayLog = useMemo(() => {
    return report?.calendarDays.find((d) => d.date === logDate);
  }, [report, logDate]);

  // Fetch reconciliation and settings
  const fetchData = async () => {
    setLoading(true);
    try {
      const repRes = await dailyProvisionApi.getMonthReconciliation(selectedMonthKey);
      if (repRes.success && repRes.data) {
        setReport(repRes.data);
        setSettings(repRes.data.settings);
        if (repRes.data.settings && customMilkRate === null) {
          setTempMilkRate(String(repRes.data.settings.baseMilkRate || 210));
        }
      }
    } catch (err: any) {
      console.warn('Failed to load daily provisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, selectedMonthKey]);

  // Sync form inputs when logDate changes or when report updates
  useEffect(() => {
    if (!report) return;
    const day = report.calendarDays.find((d) => d.date === logDate);
    if (day && day.isLogged) {
      setIsMilkSkipped(day.isMilkSkipped);
      setMilkLiters(day.isMilkSkipped ? (settings?.defaultMilkLiters || 1.5) : day.milkLiters);
      setNotes(day.notes || '');
      if (day.milkRate) {
        setCustomMilkRate(day.milkRate);
        setTempMilkRate(String(day.milkRate));
      }
    } else {
      setIsMilkSkipped(false);
      setMilkLiters(settings?.defaultMilkLiters || 1.5);
      setNotes('');
    }
  }, [logDate, report]);

  // Real-time Active Milk Rate
  const currentMilkRate = customMilkRate !== null ? customMilkRate : (settings?.baseMilkRate || 210);

  // Real-time Daily Cost calculation (Purely Milk)
  const liveMilkCost = isMilkSkipped ? 0 : Math.round(milkLiters * currentMilkRate);
  const liveDailyTotal = liveMilkCost;

  // Save / Update Milk Rate
  const handleSaveMilkRate = async () => {
    const rateNum = parseFloat(tempMilkRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      Alert.alert('غلط ریٹ', 'براہ کرم درست دودھ کا ریٹ درج کریں۔');
      return;
    }

    setSavingRate(true);
    try {
      setCustomMilkRate(rateNum);

      if (saveAsDefaultRate) {
        await dailyProvisionApi.updateSettings({ baseMilkRate: rateNum });
        onShowToast?.(`دودھ کا نیا ریٹ Rs. ${rateNum}/L محفوظ ہو گیا!`);
        await fetchData();
      } else {
        onShowToast?.(`آج کے لیے دودھ کا ریٹ Rs. ${rateNum}/L منتخب ہو گیا!`);
      }
      setShowRateEditor(false);
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'ریٹ محفوظ کرنے میں مسئلہ پیش آیا۔');
    } finally {
      setSavingRate(false);
    }
  };

  // Save Daily Provision
  const handleSaveDailyCounter = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await dailyProvisionApi.logDailyProvision({
        date: logDate,
        milkLiters: isMilkSkipped ? 0 : milkLiters,
        isMilkSkipped,
        milkRate: currentMilkRate,
        rotiCount: 0,
        isRotiSkipped: false,
        rotiRate: 0,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        const costStr = isMilkSkipped ? '0' : liveDailyTotal.toLocaleString();
        const successMsg = isMilkSkipped
          ? `تاریخ ${logDate} کی چھٹی (0L) کامیابی سے محفوظ ہو گئی!`
          : `تاریخ ${logDate} کا اندراج کامیابی سے محفوظ ہو گیا: ${milkLiters}L (Rs. ${costStr})`;

        setSaveSuccessBanner({
          message: successMsg,
          date: logDate,
          liters: isMilkSkipped ? 0 : milkLiters,
          cost: liveDailyTotal,
          isSkipped: isMilkSkipped,
        });

        onShowToast?.(successMsg);
        await fetchData();
      } else {
        Alert.alert('خرابی', res.message || 'اندراج محفوظ کرنے میں ناکامی۔');
      }
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'نیٹ ورک خرابی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Chutti from Kacha Parcha Grid
  const handleToggleDayChutti = async (day: IReconciliationDayItem) => {
    try {
      const res = await dailyProvisionApi.toggleChutti(day.date, 'MILK');
      if (res.success) {
        onShowToast?.(`${day.dayNumber} تاریخ کی چھٹی تبدیل کر دی گئی`);
        await fetchData();
      }
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'چھٹی تبدیل کرنے میں مسئلہ۔');
    }
  };

  // Submit Bill Settlement
  const handleExecuteSettle = async () => {
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('غلط رقم', 'براہ کرم درست ادائیگی کی رقم درج کریں۔');
      return;
    }

    setSubmitting(true);
    try {
      const res = await dailyProvisionApi.settleMonthlyBill({
        monthKey: selectedMonthKey,
        amount: amt,
        paymentChannel: settleChannel,
        notes: settleNotes.trim() || undefined,
      });

      if (res.success) {
        setShowSettleModal(false);
        setSettleAmount('');
        setSettleNotes('');
        onShowToast?.(res.message || 'بل ادا ہو گیا اور کھاتے میں درج کر دیا گیا ہے۔');
        await fetchData();
      } else {
        Alert.alert('خرابی', res.message || 'بل کلیئر کرنے میں ناکامی۔');
      }
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'نیٹ ورک خرابی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Advance
  const handleExecuteAdvance = async () => {
    const amt = parseFloat(advanceAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('غلط رقم', 'براہ کرم درست پیشگی رقم درج کریں۔');
      return;
    }

    setSubmitting(true);
    try {
      const res = await dailyProvisionApi.recordAdvance({
        date: logDate,
        amount: amt,
        paymentChannel: advanceChannel,
        notes: advanceNotes.trim() || undefined,
      });

      if (res.success) {
        setShowAdvanceModal(false);
        setAdvanceAmount('');
        setAdvanceNotes('');
        onShowToast?.('پیشگی ادائیگی محفوظ ہو گئی۔');
        await fetchData();
      } else {
        Alert.alert('خرابی', res.message || 'پیشگی رقم محفوظ کرنے میں ناکامی۔');
      }
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'نیٹ ورک خرابی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Tap WhatsApp Audit Slip Dispatch to Milkman / Tandoor
  const handleShareWhatsAppSlip = async () => {
    if (!report) return;

    const m = report.metrics;
    const vendorName = settings?.milkmanName || 'گوالہ';

    const text = `🥛 *ڈیجی حساب - گوالہ ماہانہ کچا پرچہ*
----------------------------------------
محترم ${vendorName} صاحب!
ماہ: ${report.monthNameUrdu} (${report.monthKey})

📊 *دودھ سپلائی و استعمال کی تفصیل:*
• کل ڈلیوری کے دن: *${m.activeDeliveredDays} دن*
• کل دودھ آیا: *${m.totalMilkLiters} لٹر*
• موجودہ ریٹ: *Rs. ${currentMilkRate} فی لٹر*
• ناغہ / چھٹیاں: *${m.milkSkippedDays} دن* (کوئی دودھ نہیں آیا)
• دودھ کا مجموعی بل: Rs. ${m.totalMilkCost.toLocaleString()}

----------------------------------------
💰 *بل و ادائیگی کا حساب:*
• مجموعی بل: Rs. ${m.totalGrossBill.toLocaleString()}
• دورانِ ماہ پیشگی ادائیگیاں (Advances): (-) Rs. ${m.totalAdvancesDeducted.toLocaleString()}
⭐ *خالص واجب الادا بل (Net Payable):* *Rs. ${m.netPayable.toLocaleString()}*

براہ کرم اپنے کچے پرچے کے ساتھ تصدیق کر لیں۔ شکریہ!
_Digi Hisab Domestic Ledger کے ذریعے تیار کردہ_`;

    try {
      await Share.share({
        message: text,
        title: `DigiHisab_Gwalah_Parcha_${report.monthKey}`,
      });
      onShowToast?.('واٹس ایپ کچا پرچہ شیئر کیا گیا!');
    } catch (e: any) {
      Alert.alert('شیئر خرابی', e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
          {/* Top Bar with Live Accumulated Ticker */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.headerTitleRow}>
                <View style={styles.posIconBadge}>
                  <Ionicons name="pint" size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.headerTitleUrdu}>دودھ کا روزانہ رجسٹر (گوالہ کچا پرچہ)</Text>
                  <Text style={styles.headerSubtitle}>Gwalah Milk Delivery & Daily Register</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* High-Contrast Live Billing Ticker Header Banner */}
          <View style={styles.liveTickerBanner}>
            <View style={styles.tickerRow}>
              <View>
                <Text style={styles.tickerLabel}>ماہانہ واجب الادا کھاتہ (Month-to-Date Net):</Text>
                <Text style={styles.tickerValue}>
                  Rs. {report?.metrics.netPayable.toLocaleString() ?? '0'}
                </Text>
              </View>
              <View style={styles.tickerMetricsCol}>
                <View style={styles.tickerMetricPill}>
                  <Ionicons name="water-outline" size={13} color="#6EE7B7" />
                  <Text style={styles.tickerMetricPillText}>
                    {report?.metrics.totalMilkLiters ?? 0} L دودھ
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.tickerMetricPill, { borderColor: '#34D399', borderWidth: 1 }]}
                  onPress={() => {
                    setActiveTab('COUNTER');
                    setShowRateEditor(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil" size={12} color="#34D399" />
                  <Text style={[styles.tickerMetricPillText, { color: '#34D399', fontWeight: '800' }]}>
                    Rs. {currentMilkRate}/L
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Segment Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'COUNTER' && styles.tabBtnActive]}
              onPress={() => setActiveTab('COUNTER')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="speedometer-outline"
                size={16}
                color={activeTab === 'COUNTER' ? '#10B981' : '#94A3B8'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'COUNTER' && styles.tabBtnTextActive]}
              >
                روزانہ کاؤنٹر (Daily)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'PARCHA' && styles.tabBtnActive]}
              onPress={() => setActiveTab('PARCHA')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={activeTab === 'PARCHA' ? '#10B981' : '#94A3B8'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'PARCHA' && styles.tabBtnTextActive]}
              >
                کچا پرچہ میچر (Parcha)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'SETTINGS' && styles.tabBtnActive]}
              onPress={() => setActiveTab('SETTINGS')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="settings-outline"
                size={16}
                color={activeTab === 'SETTINGS' ? '#10B981' : '#94A3B8'}
              />
              <Text
                style={[styles.tabBtnText, activeTab === 'SETTINGS' && styles.tabBtnTextActive]}
              >
                ریٹس و ایڈوانس
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderCenter}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loaderText}>کھاتے کی معلومات لوڈ ہو رہی ہے...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={{ paddingBottom: Math.max(28, insets.bottom + 16) }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ======================================================== */}
              {/* TAB 1: DAILY POS COUNTER LOGGING                        */}
              {/* ======================================================== */}
              {activeTab === 'COUNTER' && (
                <View style={styles.tabContent}>
                  {/* In-Modal Prominent Success Banner */}
                  {saveSuccessBanner && (
                    <View style={styles.savedSuccessBanner}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={styles.savedSuccessIconBadge}>
                          <Ionicons name="checkmark-done" size={22} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.savedSuccessTitle}>
                            ✅ اندراج محفوظ ہو گیا ہے! (Saved Successfully)
                          </Text>
                          <Text style={styles.savedSuccessSub}>
                            {saveSuccessBanner.message}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setSaveSuccessBanner(null)}
                        style={{ padding: 4 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={18} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Quick Back-Dating Chips */}
                  <View style={styles.dateSelectorRow}>
                    <TouchableOpacity
                      style={[
                        styles.dateChip,
                        logDate === todayStr && styles.dateChipActive,
                      ]}
                      onPress={() => setLogDate(todayStr)}
                    >
                      <Text
                        style={[
                          styles.dateChipText,
                          logDate === todayStr && styles.dateChipTextActive,
                        ]}
                      >
                        آج (Today)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.dateChip,
                        logDate === yesterdayStr && styles.dateChipActive,
                      ]}
                      onPress={() => setLogDate(yesterdayStr)}
                    >
                      <Text
                        style={[
                          styles.dateChipText,
                          logDate === yesterdayStr && styles.dateChipTextActive,
                        ]}
                      >
                        کل (Yesterday)
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.customDateBadge}>
                      <Ionicons name="calendar" size={14} color="#94A3B8" />
                      <Text style={styles.customDateText}>{logDate}</Text>
                    </View>
                  </View>

                  {/* Current Selected Date Logged Status Indicator */}
                  {currentDayLog?.isLogged ? (
                    <View style={styles.loggedStatusBadgeGreen}>
                      <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                      <Text style={styles.loggedStatusTextGreen}>
                        ✅ اس تاریخ ({logDate}) کا اندراج محفوظ ہے: {currentDayLog.isMilkSkipped ? 'ناغہ / چھٹی (0L)' : `${currentDayLog.milkLiters} لٹر • Rs. ${currentDayLog.milkCost.toLocaleString()}`}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.loggedStatusBadgeAmber}>
                      <Ionicons name="time-outline" size={16} color="#F59E0B" />
                      <Text style={styles.loggedStatusTextAmber}>
                        ⏳ اس تاریخ ({logDate}) کا اندراج ابھی باقی ہے (Not yet logged)
                      </Text>
                    </View>
                  )}

                  {/* Section A: Milk Counter */}
                  <View style={styles.posSectionCard}>
                    <View style={styles.posSectionHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="water" size={18} color="#6EE7B7" />
                        <Text style={styles.posSectionTitle}>دودھ کی مقدار (Milk Volume)</Text>
                      </View>
                      
                      {/* Rate Display & Quick Edit Trigger */}
                      <TouchableOpacity
                        style={styles.ratePillTrigger}
                        onPress={() => setShowRateEditor(!showRateEditor)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="pencil" size={13} color="#10B981" />
                        <Text style={styles.ratePillTriggerText}>
                          ریٹ: Rs. {currentMilkRate}/L (تبدیل کریں)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Quick Inline Milk Rate Editor Panel */}
                    {showRateEditor && (
                      <View style={styles.inlineRateCard}>
                        <View style={styles.inlineRateHeader}>
                          <Ionicons name="pricetag" size={15} color="#34D399" />
                          <Text style={styles.inlineRateTitle}>
                            دودھ کا ریٹ فی لٹر تبدیل کریں (Adjust Milk Rate)
                          </Text>
                        </View>

                        <View style={styles.inlineRateRow}>
                          <View style={styles.rateInputWrap}>
                            <Text style={styles.rateCurrencyPrefix}>Rs.</Text>
                            <TextInput
                              style={styles.rateTextInput}
                              value={tempMilkRate}
                              onChangeText={setTempMilkRate}
                              keyboardType="numeric"
                              placeholder="210"
                              placeholderTextColor="#64748B"
                              selectTextOnFocus
                            />
                            <Text style={styles.ratePerLText}>/ لٹر</Text>
                          </View>

                          <TouchableOpacity
                            style={styles.saveRateActionBtn}
                            onPress={handleSaveMilkRate}
                            disabled={savingRate}
                            activeOpacity={0.85}
                          >
                            {savingRate ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text style={styles.saveRateActionBtnText}>لاگو کریں</Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.cancelRateBtn}
                            onPress={() => setShowRateEditor(false)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.cancelRateBtnText}>منسوخ</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.rateOptionItem}
                          onPress={() => setSaveAsDefaultRate(!saveAsDefaultRate)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={saveAsDefaultRate ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={saveAsDefaultRate ? '#34D399' : '#94A3B8'}
                          />
                          <Text style={styles.rateOptionText}>
                            مستقل بنیادی ریٹ بنائیں (Save as Base Rate in Settings)
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Volume Fast Chips */}
                    <View style={styles.chipsGrid}>
                      {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0].map((vol) => {
                        const isSelected = !isMilkSkipped && milkLiters === vol;
                        return (
                          <TouchableOpacity
                            key={vol}
                            style={[styles.volChip, isSelected && styles.volChipActive]}
                            onPress={() => {
                              setIsMilkSkipped(false);
                              setMilkLiters(vol);
                            }}
                          >
                            <Text
                              style={[
                                styles.volChipText,
                                isSelected && styles.volChipTextActive,
                              ]}
                            >
                              {vol} L
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Stepper & Chutti Toggle */}
                    <View style={styles.stepperAndChuttiRow}>
                      <View style={styles.stepperBox}>
                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => {
                            setIsMilkSkipped(false);
                            setMilkLiters((prev) => Math.max(0.25, prev - 0.25));
                          }}
                        >
                          <Ionicons name="remove" size={18} color="#F8FAFC" />
                        </TouchableOpacity>

                        <Text style={styles.stepperDisplay}>
                          {isMilkSkipped ? '0 L' : `${milkLiters} L`}
                        </Text>

                        <TouchableOpacity
                          style={styles.stepperBtn}
                          onPress={() => {
                            setIsMilkSkipped(false);
                            setMilkLiters((prev) => prev + 0.25);
                          }}
                        >
                          <Ionicons name="add" size={18} color="#F8FAFC" />
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.chuttiBtn,
                          isMilkSkipped && styles.chuttiBtnActive,
                        ]}
                        onPress={() => setIsMilkSkipped(!isMilkSkipped)}
                      >
                        <Ionicons
                          name={isMilkSkipped ? 'close-circle' : 'ban-outline'}
                          size={18}
                          color={isMilkSkipped ? '#FFFFFF' : '#F87171'}
                        />
                        <Text
                          style={[
                            styles.chuttiBtnText,
                            isMilkSkipped && styles.chuttiBtnTextActive,
                          ]}
                        >
                          {isMilkSkipped ? 'چھٹی درج شدہ (0L)' : '0L / ناغہ (چھٹی)'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Section C: Live Bill Calculator & Notes (Purely Milk) */}
                  <View style={styles.calculationCard}>
                    <Text style={styles.calculationTitle}>
                      💡 آج کا کل خرچہ (Today's Live Cost):
                    </Text>
                    <View style={styles.calcMathRow}>
                      <Text style={styles.calcFormula}>
                        {isMilkSkipped ? '0' : milkLiters} L × Rs. {currentMilkRate} / لٹر
                      </Text>
                      <Text style={styles.calcTotalVal}>
                        Rs. {liveDailyTotal.toLocaleString()}
                      </Text>
                    </View>

                    {/* Notes Input */}
                    <TextInput
                      style={styles.notesInput}
                      placeholder="اضافی نوٹ لکھیں (مثلاً مہمان آئے تھے، چائے زیادہ بنی)"
                      placeholderTextColor="#64748B"
                      value={notes}
                      onChangeText={setNotes}
                    />
                  </View>

                  {/* Save Daily Counter Button */}
                  <TouchableOpacity
                    style={[styles.saveCounterBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSaveDailyCounter}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.saveCounterBtnText}>
                          {currentDayLog?.isLogged
                            ? `اندراج تبدیل / اپ ڈیٹ کریں (Rs. ${liveDailyTotal.toLocaleString()})`
                            : `آج کا اندراج محفوظ کریں (Rs. ${liveDailyTotal.toLocaleString()})`}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ======================================================== */}
              {/* TAB 2: 30-DAY KACHA PARCHA MATCHER                       */}
              {/* ======================================================== */}
              {activeTab === 'PARCHA' && report && (
                <View style={styles.tabContent}>
                  {/* Parchment Card Header */}
                  <View style={styles.parchaSlipCard}>
                    <View style={styles.parchaHeaderRow}>
                      <View>
                        <Text style={styles.parchaTitleUrdu}>گوالے کا ماہانہ کچا پرچہ</Text>
                        <Text style={styles.parchaSubtitle}>
                          {report.monthNameUrdu} • {settings?.milkmanName || 'گوالہ (Gwalah)'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.shareSlipBtn}
                        onPress={handleShareWhatsAppSlip}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                        <Text style={styles.shareSlipBtnText}>واٹس ایپ پرچہ</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.parchaTip}>
                      💡 کسی بھی تاریخ پر ٹیپ کر کے دودھ کی چھٹی (ناغہ) مارک کریں۔
                    </Text>

                    {/* 30-Day Grid Mirroring Physical Cardboard */}
                    <View style={styles.calendarGrid}>
                      {report.calendarDays.map((day) => {
                        const isChutti = day.isMilkSkipped;

                        return (
                          <TouchableOpacity
                            key={day.dayNumber}
                            style={[
                              styles.calendarCell,
                              day.isLogged && styles.calendarCellLogged,
                              isChutti && styles.calendarCellChutti,
                              day.isFuture && styles.calendarCellFuture,
                            ]}
                            onPress={() => setSelectedParchaDay(day)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.cellDayNumRow}>
                              <Text
                                style={[
                                  styles.cellDayNum,
                                  isChutti && { color: '#EF4444' },
                                  day.isFuture && { color: '#64748B' },
                                ]}
                              >
                                {day.dayNumber}
                              </Text>
                              <Text style={styles.cellDayName}>{day.dayName}</Text>
                            </View>

                            {day.isFuture ? (
                              <Text style={styles.cellFutureDot}>-</Text>
                            ) : isChutti ? (
                              <Text style={styles.cellChuttiLabel}>چھٹی</Text>
                            ) : (
                              <View style={styles.cellValuesBox}>
                                <Text style={styles.cellMilkValOnly}>
                                  {day.milkLiters} L
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Financial Statement Summary Card */}
                  <View style={styles.statementSummaryCard}>
                    <Text style={styles.statementTitle}>
                      📑 ماہانہ مفاہمت اسٹیٹمنٹ (Month Financial Summary)
                    </Text>

                    <View style={styles.statementRow}>
                      <Text style={styles.statementLabel}>کل دودھ ڈلیوری:</Text>
                      <Text style={styles.statementVal}>
                        {report.metrics.totalMilkLiters} Liters (Rs.{' '}
                        {report.metrics.totalMilkCost.toLocaleString()})
                      </Text>
                    </View>

                    <View style={styles.statementRow}>
                      <Text style={styles.statementLabel}>دودھ کا ریٹ:</Text>
                      <Text style={styles.statementVal}>
                        Rs. {currentMilkRate} / لٹر
                      </Text>
                    </View>

                    <View style={styles.statementRow}>
                      <Text style={styles.statementLabel}>کل ناغے / چھٹیاں:</Text>
                      <Text style={[styles.statementVal, { color: '#F87171' }]}>
                        {report.metrics.milkSkippedDays} دن (کوئی دودھ نہیں آیا)
                      </Text>
                    </View>

                    <View style={styles.statementRow}>
                      <Text style={styles.statementLabel}>مجموعی بل:</Text>
                      <Text style={styles.statementValBold}>
                        Rs. {report.metrics.totalGrossBill.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.statementRow}>
                      <Text style={styles.statementLabel}>پیشگی ادائیگیاں (Advances):</Text>
                      <Text style={[styles.statementVal, { color: '#6EE7B7' }]}>
                        - Rs. {report.metrics.totalAdvancesDeducted.toLocaleString()}
                      </Text>
                    </View>

                    <View style={[styles.statementRow, styles.statementRowFinal]}>
                      <Text style={styles.statementLabelFinal}>
                        خالص واجب الادا رقم (Net Payable):
                      </Text>
                      <Text style={styles.statementValFinal}>
                        Rs. {report.metrics.netPayable.toLocaleString()}
                      </Text>
                    </View>

                    {/* Settle Bill Action Button */}
                    <TouchableOpacity
                      style={styles.settleActionBtn}
                      onPress={() => {
                        setSettleAmount(String(report.metrics.netPayable));
                        setShowSettleModal(true);
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="cash" size={20} color="#FFFFFF" />
                      <Text style={styles.settleActionBtnText}>
                        💵 حساب صاف کریں (Pay & Clear Bill)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ======================================================== */}
              {/* TAB 3: SETTINGS, BASE RATES & ADVANCES                   */}
              {/* ======================================================== */}
              {activeTab === 'SETTINGS' && (
                <View style={styles.tabContent}>
                  <View style={styles.posSectionCard}>
                    <Text style={styles.posSectionTitle}>
                      ⚙️ دودھ کا بنیادی ریٹ و ترتیبات
                    </Text>

                    {/* Direct Rate Setting Box */}
                    <View style={styles.settingBoxCard}>
                      <Text style={styles.settingBoxTitle}>
                        دودھ کا مستقل بنیادی ریٹ (Base Milk Rate / Liter):
                      </Text>
                      <View style={styles.inlineRateRow}>
                        <View style={styles.rateInputWrap}>
                          <Text style={styles.rateCurrencyPrefix}>Rs.</Text>
                          <TextInput
                            style={styles.rateTextInput}
                            value={tempMilkRate}
                            onChangeText={setTempMilkRate}
                            keyboardType="numeric"
                            placeholder="210"
                            placeholderTextColor="#64748B"
                            selectTextOnFocus
                          />
                          <Text style={styles.ratePerLText}>/ لٹر</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.saveRateActionBtn}
                          onPress={handleSaveMilkRate}
                          disabled={savingRate}
                          activeOpacity={0.85}
                        >
                          {savingRate ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.saveRateActionBtnText}>ریٹ محفوظ کریں</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.settingHelpText}>
                        یہ ریٹ تمام روزانہ اندراجات اور غیر درج شدہ دنوں کے لیے بنیادی طور پر لاگو ہوگا۔
                      </Text>
                    </View>

                    <View style={styles.settingItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.settingLabel}>روزانہ کی معمول کی مقدار:</Text>
                        <Text style={styles.settingSub}>
                          {settings?.defaultMilkLiters || 1.5} لٹر دودھ
                        </Text>
                      </View>
                    </View>

                    <View style={styles.settingItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.settingLabel}>گوالے کا نام:</Text>
                        <Text style={styles.settingSub}>
                          {settings?.milkmanName || 'گوالہ (Gwalah)'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Monthly Advances Card */}
                  <View style={styles.posSectionCard}>
                    <View style={styles.posSectionHeader}>
                      <Text style={styles.posSectionTitle}>
                        💳 گوالے کو پیشگی ادائیگی (Advances)
                      </Text>
                      <TouchableOpacity
                        style={styles.addAdvanceChip}
                        onPress={() => setShowAdvanceModal(true)}
                      >
                        <Ionicons name="add" size={14} color="#10B981" />
                        <Text style={styles.addAdvanceChipText}>+ پیشگی شامل کریں</Text>
                      </TouchableOpacity>
                    </View>

                    {report?.advances && report.advances.length > 0 ? (
                      report.advances.map((adv, idx) => (
                        <View key={idx} style={styles.advanceItemRow}>
                          <View>
                            <Text style={styles.advanceItemDate}>{adv.date}</Text>
                            <Text style={styles.advanceItemChannel}>{adv.paymentChannel} {adv.notes ? `• ${adv.notes}` : ''}</Text>
                          </View>
                          <Text style={styles.advanceItemAmt}>
                            Rs. {adv.amount.toLocaleString()}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyAdvancesNotice}>
                        اس ماہ ابھی تک کوئی پیشگی ادائیگی (Advance) درج نہیں ہوئی۔
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {/* Micro-Modal: Single Day Inspector / Editor from Parcha */}
          {selectedParchaDay && (
            <Modal transparent animationType="fade">
              <View style={styles.microModalOverlay}>
                <View style={styles.microModalCard}>
                  <Text style={styles.microModalTitle}>
                    📅 {selectedParchaDay.date} ({selectedParchaDay.dayName})
                  </Text>
                  <Text style={styles.microModalSub}>
                    دودھ: {selectedParchaDay.isMilkSkipped ? '0L (چھٹی)' : `${selectedParchaDay.milkLiters} L`} • ریٹ: Rs. {selectedParchaDay.milkRate || currentMilkRate}/L
                  </Text>
                  <Text style={styles.microModalCost}>
                    اس دن کا بل: Rs. {(selectedParchaDay.isMilkSkipped ? 0 : selectedParchaDay.milkCost).toLocaleString()}
                  </Text>

                  <View style={styles.microModalActionsRow}>
                    <TouchableOpacity
                      style={styles.microChuttiBtn}
                      onPress={() => {
                        handleToggleDayChutti(selectedParchaDay);
                        setSelectedParchaDay(null);
                      }}
                    >
                      <Ionicons name="ban" size={16} color="#FFFFFF" />
                      <Text style={styles.microChuttiBtnText}>
                        {selectedParchaDay.isMilkSkipped ? 'چھٹی منسوخ کریں (دودھ شامل کریں)' : 'ناغہ / چھٹی مارک کریں (0L)'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.microCloseBtn}
                      onPress={() => setSelectedParchaDay(null)}
                    >
                      <Text style={styles.microCloseBtnText}>بند کریں</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Micro-Modal: Settle Bill (Hisab Saaf Karein) */}
          {showSettleModal && (
            <Modal transparent animationType="fade">
              <View style={styles.microModalOverlay}>
                <View style={styles.microModalCard}>
                  <Text style={styles.microModalTitle}>
                    💵 بل ادا کریں اور حساب صاف کریں
                  </Text>
                  <Text style={styles.microModalSub}>
                    ماہ: {report?.monthNameUrdu} ({report?.monthKey})
                  </Text>

                  <View style={{ marginVertical: 12 }}>
                    <Text style={styles.inputModalLabel}>ادائیگی کی رقم (PKR):</Text>
                    <TextInput
                      style={styles.modalInput}
                      keyboardType="numeric"
                      value={settleAmount}
                      onChangeText={setSettleAmount}
                      placeholder="رقم درج کریں"
                      placeholderTextColor="#64748B"
                    />
                  </View>

                  <Text style={styles.inputModalLabel}>ادائیگی کا ذریعہ (Channel):</Text>
                  <View style={styles.channelPickerRow}>
                    {(['CASH', 'JAZZCASH', 'EASYPAISA', 'BANK'] as const).map((ch) => (
                      <TouchableOpacity
                        key={ch}
                        style={[
                          styles.channelChip,
                          settleChannel === ch && styles.channelChipActive,
                        ]}
                        onPress={() => setSettleChannel(ch)}
                      >
                        <Text
                          style={[
                            styles.channelChipText,
                            settleChannel === ch && styles.channelChipTextActive,
                          ]}
                        >
                          {ch === 'CASH'
                            ? 'کیش گلہ'
                            : ch === 'JAZZCASH'
                            ? 'JazzCash'
                            : ch === 'EASYPAISA'
                            ? 'EasyPaisa'
                            : 'بینک'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.modalInput, { marginTop: 10 }]}
                    placeholder="کوئی نوٹ لکھیں (اختیاری)"
                    placeholderTextColor="#64748B"
                    value={settleNotes}
                    onChangeText={setSettleNotes}
                  />

                  <View style={styles.microModalActionsRow}>
                    <TouchableOpacity
                      style={styles.modalConfirmBtn}
                      onPress={handleExecuteSettle}
                      disabled={submitting}
                    >
                      <Text style={styles.modalConfirmBtnText}>تصدیق اور کھاتے میں درج کریں</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.microCloseBtn}
                      onPress={() => setShowSettleModal(false)}
                    >
                      <Text style={styles.microCloseBtnText}>منسوخ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Micro-Modal: Record Advance */}
          {showAdvanceModal && (
            <Modal transparent animationType="fade">
              <View style={styles.microModalOverlay}>
                <View style={styles.microModalCard}>
                  <Text style={styles.microModalTitle}>
                    💳 پیشگی ادائیگی درج کریں (Record Advance)
                  </Text>

                  <View style={{ marginVertical: 12 }}>
                    <Text style={styles.inputModalLabel}>پیشگی رقم (PKR):</Text>
                    <TextInput
                      style={styles.modalInput}
                      keyboardType="numeric"
                      value={advanceAmount}
                      onChangeText={setAdvanceAmount}
                      placeholder="مثلاً 1000"
                      placeholderTextColor="#64748B"
                    />
                  </View>

                  <Text style={styles.inputModalLabel}>ادائیگی کا ذریعہ:</Text>
                  <View style={styles.channelPickerRow}>
                    {(['CASH', 'JAZZCASH', 'EASYPAISA'] as const).map((ch) => (
                      <TouchableOpacity
                        key={ch}
                        style={[
                          styles.channelChip,
                          advanceChannel === ch && styles.channelChipActive,
                        ]}
                        onPress={() => setAdvanceChannel(ch)}
                      >
                        <Text
                          style={[
                            styles.channelChipText,
                            advanceChannel === ch && styles.channelChipTextActive,
                          ]}
                        >
                          {ch === 'CASH' ? 'کیش' : ch}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.modalInput, { marginTop: 10 }]}
                    placeholder="تفصیل لکھیں (مثلاً گوالے کو پیشگی دی)"
                    placeholderTextColor="#64748B"
                    value={advanceNotes}
                    onChangeText={setAdvanceNotes}
                  />

                  <View style={styles.microModalActionsRow}>
                    <TouchableOpacity
                      style={styles.modalConfirmBtn}
                      onPress={handleExecuteAdvance}
                      disabled={submitting}
                    >
                      <Text style={styles.modalConfirmBtnText}>پیشگی محفوظ کریں</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.microCloseBtn}
                      onPress={() => setShowAdvanceModal(false)}
                    >
                      <Text style={styles.microCloseBtnText}>منسوخ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '94%',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  posIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleUrdu: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 18,
  },
  liveTickerBanner: {
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tickerLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  tickerValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#34D399',
    marginTop: 2,
  },
  tickerMetricsCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tickerMetricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tickerMetricPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#1E293B',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#34D399',
  },
  loaderCenter: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 10,
  },
  scrollArea: {
    paddingHorizontal: 16,
  },
  tabContent: {
    paddingTop: 14,
  },
  /* Daily Counter Styles */
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateChipActive: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  dateChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },
  customDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    backgroundColor: '#020617',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  customDateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  posSectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  posSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  posSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  rateNotice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
  },
  ratePillTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  ratePillTriggerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  inlineRateCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#10B981',
    marginBottom: 12,
  },
  inlineRateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  inlineRateTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  inlineRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rateInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
  },
  rateCurrencyPrefix: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34D399',
    marginRight: 4,
  },
  rateTextInput: {
    flex: 1,
    height: 38,
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  ratePerLText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 4,
  },
  saveRateActionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveRateActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelRateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelRateBtnText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  rateOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  rateOptionText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  settingBoxCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  settingBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  settingHelpText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
  },
  cellMilkValOnly: {
    fontSize: 11,
    fontWeight: '900',
    color: '#34D399',
    marginTop: 2,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  volChip: {
    width: '31%',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  volChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  volChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E2E8F0',
  },
  volChipTextActive: {
    color: '#34D399',
  },
  stepperAndChuttiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  stepperBox: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisplay: {
    fontSize: 14,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  chuttiBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
  },
  chuttiBtnActive: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  chuttiBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F87171',
  },
  chuttiBtnTextActive: {
    color: '#FFFFFF',
  },
  rotiStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickStepChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStepChipText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  rotiCountDisplayBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rotiCountDisplayVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FDE68A',
  },
  rotiCountDisplaySub: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '700',
  },
  homeCookedChip: {
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeCookedChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#F59E0B',
  },
  homeCookedChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  homeCookedChipTextActive: {
    color: '#FFFFFF',
  },
  calculationCard: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  calculationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 6,
  },
  calcMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calcFormula: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  calcTotalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#34D399',
  },
  notesInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#F8FAFC',
  },
  saveCounterBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveCounterBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  /* Parcha Tab Styles */
  parchaSlipCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  parchaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  parchaTitleUrdu: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  parchaSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  shareSlipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareSlipBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  parchaTip: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginBottom: 12,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  calendarCell: {
    width: '13%',
    aspectRatio: 0.85,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarCellLogged: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  calendarCellChutti: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  calendarCellFuture: {
    opacity: 0.4,
    borderColor: '#1E293B',
  },
  cellDayNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cellDayNum: {
    fontSize: 10,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  cellDayName: {
    fontSize: 7.5,
    color: '#64748B',
    fontWeight: '600',
  },
  cellFutureDot: {
    fontSize: 12,
    color: '#64748B',
  },
  cellChuttiLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#F87171',
  },
  cellValuesBox: {
    alignItems: 'center',
  },
  cellMilkVal: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  cellRotiVal: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FDE68A',
  },
  statementSummaryCard: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14,
  },
  statementTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  statementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  statementRowFinal: {
    borderBottomWidth: 0,
    paddingTop: 10,
    marginTop: 4,
  },
  statementLabel: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
  statementVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  statementValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statementLabelFinal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  statementValFinal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#34D399',
  },
  settleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#006C4E',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  settleActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  /* Settings Tab Styles */
  settingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  settingSub: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  settingValTag: {
    fontSize: 13,
    fontWeight: '900',
    color: '#34D399',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addAdvanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addAdvanceChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  advanceItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  advanceItemDate: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  advanceItemChannel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  advanceItemAmt: {
    fontSize: 13,
    fontWeight: '900',
    color: '#34D399',
  },
  emptyAdvancesNotice: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 10,
  },
  /* Micro Modals */
  microModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  microModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  microModalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  microModalSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  microModalCost: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34D399',
    marginTop: 4,
    marginBottom: 12,
  },
  microModalActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  microChuttiBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 10,
  },
  microChuttiBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  microCloseBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
  },
  microCloseBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
  },
  inputModalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#F8FAFC',
  },
  channelPickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  channelChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  channelChipActive: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  channelChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  channelChipTextActive: {
    color: '#FFFFFF',
  },
  modalConfirmBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
  },
  modalConfirmBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // In-Modal Success Banner Styles
  savedSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  savedSuccessIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedSuccessTitle: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '800',
  },
  savedSuccessSub: {
    color: '#A7F3D0',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  // Current Day Logged Status Indicators
  loggedStatusBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  loggedStatusTextGreen: {
    color: '#34D399',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
  loggedStatusBadgeAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  loggedStatusTextAmber: {
    color: '#FBBF24',
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
});
