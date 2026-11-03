import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  munafaForensicApi,
  IForensicAuditReport,
  ForensicPeriod,
} from '../api/munafaForensic.api';

interface MunafaAnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

type ForensicSubTab = 'WATERFALL' | 'CATEGORIES' | 'LOSS_LEADERS' | 'TAX_SHIELD';

export const MunafaAnalyticsModal: React.FC<MunafaAnalyticsModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<ForensicPeriod>('MAHANA');
  const [activeSubTab, setActiveSubTab] = useState<ForensicSubTab>('WATERFALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<IForensicAuditReport | null>(null);

  const fetchAudit = async (selectedPeriod = period) => {
    setLoading(true);
    try {
      const res = await munafaForensicApi.getAuditReport(selectedPeriod);
      if (res.success && res.data) {
        setAuditReport(res.data);
      }
    } catch (err: any) {
      console.warn('[MunafaAnalyticsModal] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAudit(period);
    }
  }, [visible, period]);

  const handlePeriodChange = (newPeriod: ForensicPeriod) => {
    setPeriod(newPeriod);
    fetchAudit(newPeriod);
  };

  const shareWhatsAppAuditReport = async () => {
    if (!auditReport) return;
    try {
      const m = auditReport.metrics;
      const text = `🔍 *DIGIHISAB — AI حقیقی منافع فارنزک آڈٹ رپورٹ*
🏢 دکان: *${auditReport.businessName}*
📅 مدت: *${auditReport.dateRangeLabel}*

----------------------------------------
💰 *سیلز و منافع خلاصہ (Executive Summary):*
• مجموعی سیلز (Gross Sales): Rs. ${m.grossSales.toLocaleString()}
• دکاندار کا روایتی خام اندازہ (Naive Surplus): Rs. ${m.naiveProfit.toLocaleString()}
• *حقیقی خالص منافع (True Net Munafa):* *Rs. ${m.trueNetMunafa.toLocaleString()}* (${m.trueNetMarginPercent}%)
⚠️ *پوشیدہ لیکیج و نقصانات (Hidden Bleed):* Rs. ${m.hiddenBleedVariance.toLocaleString()}

----------------------------------------
📊 *7-اسٹیج منافع واٹرفال (Waterfall Deductions):*
${auditReport.waterfall
  .map(
    (w) =>
      `• ${w.stageNameUrdu}: ${w.type === 'DEDUCTION' ? '(-)' : ''} Rs. ${w.amount.toLocaleString()} (${Math.round(
        w.percentageOfSales ?? 0
      )}%)`
  )
  .join('\n')}

----------------------------------------
⚠️ *نقصان دہ اشیاء (Loss Leaders Alert):*
${auditReport.lossLeaders
  .map(
    (l) =>
      `• *${l.itemName}*: نیٹ مارجن ${l.realNetMarginPercent}% (خالص نفع: Rs. ${l.realUnitNetProfit}/unit)\n  تشخیص: ${l.diagnosisUrdu}\n  تجویز: ${l.actionRecommendationUrdu}`
  )
  .join('\n\n')}

----------------------------------------
🏛️ *ایف بی آر ٹیکس کٹوتی (WHT Shield):*
• سالانہ متوقع ودہولڈنگ ٹیکس کریڈٹ: Rs. ${(auditReport.taxSummary.totalAdvanceTaxDeducted * 12).toLocaleString()}

_DigiHisab AI Munafa Forensic Auditor کے ذریعے تیار کردہ_`;

      await Share.share({
        message: text,
        title: '📊 DigiHisab AI Munafa Forensic Audit',
      });
      onShowToast?.('واٹس ایپ فارنزک رپورٹ شیئر کی گئی!');
    } catch (e: any) {
      Alert.alert('شیئر خرابی', e.message);
    }
  };

  const downloadCSVReport = async () => {
    if (!auditReport) return;
    try {
      const header = 'Stage ID,Stage Urdu,Stage English,Type,Amount (PKR),% of Sales\n';
      const rows = auditReport.waterfall
        .map(
          (w) =>
            `"${w.id}","${w.stageNameUrdu}","${w.stageNameEnglish}","${w.type}",${w.amount},${(
              w.percentageOfSales ?? 0
            ).toFixed(1)}%`
        )
        .join('\n');
      const csv = header + rows;

      await Share.share({
        message: csv,
        title: `DigiHisab_Munafa_Forensic_${period}.csv`,
      });
      onShowToast?.('CSV فائل ایکسپورٹ تیار ہے');
    } catch (err: any) {
      Alert.alert('CSV خرابی', err.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingTop: Math.max(16, insets.top) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="shield-checkmark" size={20} color="#006C4E" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle}>AI فارنزک منافع آڈیٹر</Text>
                  <View style={styles.proTag}>
                    <Text style={styles.proTagText}>⭐ FORENSIC AUDITOR</Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {auditReport?.businessName || 'ہماری دکان'} • حقیقی خالص منافع و ٹیکس بریک ڈاؤن
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Period Selector Tabs */}
          <View style={styles.periodTabsRow}>
            {[
              { key: 'ROZANA', label: 'روزانہ (Daily)' },
              { key: 'MAHANA', label: 'ماہانہ (Monthly)' },
              { key: 'SIX_MONTH', label: '6-ماہ (6-Month)' },
              { key: 'SALANA', label: 'سالانہ (Fiscal Year)' },
            ].map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.periodTab, period === t.key && styles.periodTabActive]}
                onPress={() => handlePeriodChange(t.key as ForensicPeriod)}
                activeOpacity={0.8}
              >
                <Text style={[styles.periodTabText, period === t.key && styles.periodTabTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading || !auditReport ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#006C4E" />
              <Text style={styles.loadingText}>
                مالیاتی انوائسز، بجلی بلوں، اور ادھار کے خطرات کا فارنزک آڈٹ جاری ہے...
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={[
                styles.content,
                { paddingBottom: Math.max(30, insets.bottom + 20) },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* Executive Discrepancy & True Net Munafa Card */}
              <View style={styles.executiveCard}>
                <View style={styles.execTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.execLabel}>حقیقی خالص منافع (True Net Munafa)</Text>
                    <Text style={styles.execProfitVal}>
                      Rs. {auditReport.metrics.trueNetMunafa.toLocaleString()}
                    </Text>
                    <Text style={styles.execMarginSub}>
                      خالص مارجن:{' '}
                      <Text style={{ fontWeight: '900', color: '#047857' }}>
                        {auditReport.metrics.trueNetMarginPercent}%
                      </Text>{' '}
                      (کل سیلز: Rs. {auditReport.metrics.grossSales.toLocaleString()})
                    </Text>
                  </View>
                  <View style={styles.badgeCircle}>
                    <Ionicons name="pie-chart" size={26} color="#006C4E" />
                  </View>
                </View>

                {/* The Bleed Reality Indicator */}
                <View style={styles.bleedIndicatorBox}>
                  <View style={styles.bleedRow}>
                    <View style={styles.bleedCol}>
                      <Text style={styles.bleedColLabel}>روایتی خام اندازہ (Naive)</Text>
                      <Text style={styles.bleedColValNaive}>
                        Rs. {auditReport.metrics.naiveProfit.toLocaleString()}
                      </Text>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#94A3B8" />
                    <View style={styles.bleedCol}>
                      <Text style={styles.bleedColLabel}>پوشیدہ لیکیج (Hidden Bleed)</Text>
                      <Text style={styles.bleedColValBleed}>
                        - Rs. {auditReport.metrics.hiddenBleedVariance.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.bleedNoticeText}>
                    ⚠️ روایتی سوچ (گلے کی نقد - انوائس) کے مقابلے میں بجلی، شاپر، ضیاع اور پرانے ادھار کے بعد اصل نفع نمایاں مختلف ہے۔
                  </Text>
                </View>
              </View>

              {/* Sub-Tabs Navigation */}
              <View style={styles.subTabsContainer}>
                <TouchableOpacity
                  style={[styles.subTabBtn, activeSubTab === 'WATERFALL' && styles.subTabBtnActive]}
                  onPress={() => setActiveSubTab('WATERFALL')}
                >
                  <Ionicons
                    name="water-outline"
                    size={14}
                    color={activeSubTab === 'WATERFALL' ? '#006C4E' : '#64748B'}
                  />
                  <Text
                    style={[styles.subTabText, activeSubTab === 'WATERFALL' && styles.subTabTextActive]}
                  >
                    منافع واٹرفال
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.subTabBtn, activeSubTab === 'CATEGORIES' && styles.subTabBtnActive]}
                  onPress={() => setActiveSubTab('CATEGORIES')}
                >
                  <Ionicons
                    name="grid-outline"
                    size={14}
                    color={activeSubTab === 'CATEGORIES' ? '#006C4E' : '#64748B'}
                  />
                  <Text
                    style={[styles.subTabText, activeSubTab === 'CATEGORIES' && styles.subTabTextActive]}
                  >
                    کیٹیگری مارجن
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subTabBtn,
                    activeSubTab === 'LOSS_LEADERS' && styles.subTabBtnActive,
                  ]}
                  onPress={() => setActiveSubTab('LOSS_LEADERS')}
                >
                  <Ionicons
                    name="warning-outline"
                    size={14}
                    color={activeSubTab === 'LOSS_LEADERS' ? '#DC2626' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.subTabText,
                      activeSubTab === 'LOSS_LEADERS' && styles.subTabTextActive,
                      activeSubTab === 'LOSS_LEADERS' && { color: '#DC2626' },
                    ]}
                  >
                    نقصان دہ اشیاء
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.subTabBtn, activeSubTab === 'TAX_SHIELD' && styles.subTabBtnActive]}
                  onPress={() => setActiveSubTab('TAX_SHIELD')}
                >
                  <Ionicons
                    name="business-outline"
                    size={14}
                    color={activeSubTab === 'TAX_SHIELD' ? '#006C4E' : '#64748B'}
                  />
                  <Text
                    style={[styles.subTabText, activeSubTab === 'TAX_SHIELD' && styles.subTabTextActive]}
                  >
                    ٹیکس و ودہولڈنگ
                  </Text>
                </TouchableOpacity>
              </View>

              {/* TAB 1: WATERFALL */}
              {activeSubTab === 'WATERFALL' && (
                <View style={styles.tabContentSection}>
                  <Text style={styles.sectionHeading}>
                    📊 7-اسٹیج حقیقی منافع واٹرفال (Step-by-Step Waterfall):
                  </Text>
                  {auditReport.waterfall.map((stage, idx) => {
                    const isIncome = stage.type === 'INCOME';
                    const isDeduction = stage.type === 'DEDUCTION';
                    const isFinal = stage.type === 'FINAL';

                    return (
                      <View
                        key={stage.id}
                        style={[
                          styles.waterfallCard,
                          isFinal && styles.waterfallCardFinal,
                          isIncome && styles.waterfallCardIncome,
                        ]}
                      >
                        <View style={styles.waterfallCardTop}>
                          <View style={styles.stageNumberBadge}>
                            <Text style={styles.stageNumberText}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text
                              style={[
                                styles.stageTitleUrdu,
                                isFinal && { color: '#047857', fontWeight: '900' },
                              ]}
                            >
                              {stage.stageNameUrdu}
                            </Text>
                            <Text style={styles.stageTitleEnglish}>{stage.stageNameEnglish}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text
                              style={[
                                styles.stageAmount,
                                isDeduction && styles.stageAmountDeduction,
                                isFinal && styles.stageAmountFinal,
                              ]}
                            >
                              {isDeduction ? '-' : ''} Rs. {stage.amount.toLocaleString()}
                            </Text>
                            <Text style={styles.stagePct}>
                              {(stage.percentageOfSales ?? 0).toFixed(1)}% of Sales
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.stageDesc}>{stage.descriptionUrdu}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* TAB 2: CATEGORY REAL MARGIN MATRIX */}
              {activeSubTab === 'CATEGORIES' && (
                <View style={styles.tabContentSection}>
                  <Text style={styles.sectionHeading}>
                    🏷️ کیٹیگری کے حقیقی منافع کا موازنہ (Gross vs Net Margin Matrix):
                  </Text>
                  {auditReport.categoryBreakdown.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyStateIcon}>📦</Text>
                      <Text style={styles.emptyStateTitle}>کوئی کیٹیگری سیلز موجود نہیں</Text>
                      <Text style={styles.emptyStateSub}>
                        اس منتخب دورانیے میں ابھی تک کوئی سیلز یا پروڈکٹ ٹرانزیکشن ریکارڈ نہیں ہوئی۔ سیلز لاگ ہونے کے بعد کیٹیگری مارجن کا تجزیہ یہاں ظاہر ہوگا۔
                      </Text>
                    </View>
                  ) : (
                    auditReport.categoryBreakdown.map((cat) => {
                      const isBleeder = cat.status === 'BLEEDER';
                    const isThin = cat.status === 'THIN';
                    const isPowerhouse = cat.status === 'POWERHOUSE';

                    return (
                      <View
                        key={cat.category}
                        style={[
                          styles.categoryCard,
                          isBleeder && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
                          isPowerhouse && { borderColor: '#10B981', backgroundColor: '#F0FDF4' },
                        ]}
                      >
                        <View style={styles.categoryCardHeader}>
                          <View>
                            <Text style={styles.catNameUrdu}>{cat.categoryUrdu}</Text>
                            <Text style={styles.catNameEng}>{cat.category}</Text>
                          </View>
                          <View
                            style={[
                              styles.catStatusBadge,
                              isBleeder && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
                              isThin && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
                              isPowerhouse && { backgroundColor: '#DCFCE7', borderColor: '#10B981' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.catStatusText,
                                isBleeder && { color: '#B91C1C' },
                                isThin && { color: '#B45309' },
                                isPowerhouse && { color: '#047857' },
                              ]}
                            >
                              {isBleeder
                                ? '🔴 نقصان دہ (Bleeder)'
                                : isThin
                                ? '🟡 باریک مارجن (Thin)'
                                : '🟢 منافع بخش (Powerhouse)'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.catStatsGrid}>
                          <View style={styles.catStatCol}>
                            <Text style={styles.catStatLabel}>سیلز</Text>
                            <Text style={styles.catStatVal}>Rs. {cat.grossSales.toLocaleString()}</Text>
                          </View>
                          <View style={styles.catStatCol}>
                            <Text style={styles.catStatLabel}>گراس مارجن</Text>
                            <Text style={styles.catStatVal}>{cat.grossMarginPercent}%</Text>
                          </View>
                          <View style={styles.catStatCol}>
                            <Text style={styles.catStatLabel}>اوورہیڈ لاگت</Text>
                            <Text style={styles.catStatVal}>Rs. {cat.allocatedOpex.toLocaleString()}</Text>
                          </View>
                          <View style={styles.catStatCol}>
                            <Text style={styles.catStatLabel}>خالص منافع %</Text>
                            <Text
                              style={[
                                styles.catStatVal,
                                isBleeder && { color: '#DC2626' },
                                isPowerhouse && { color: '#047857' },
                              ]}
                            >
                              {cat.netMarginPercent}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  }))}
                </View>
              )}

              {/* TAB 3: LOSS LEADERS RADAR */}
              {activeSubTab === 'LOSS_LEADERS' && (
                <View style={styles.tabContentSection}>
                  <Text style={styles.sectionHeading}>
                    ⚠️ نقصان دہ اشیاء کی نشاندہی (Loss Leaders & Margin Bleed Engine):
                  </Text>
                  <Text style={styles.sectionSub}>
                    یہ وہ پروڈکٹس ہیں جن کی سیلز زیادہ لگتی ہیں لیکن بجلی، شاپر اور ادھار تاخیر کے بعد یہ دکان کو نقصان پہنچا رہی ہیں:
                  </Text>

                  {auditReport.lossLeaders.length === 0 ? (
                    <View style={[styles.emptyStateCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                      <Text style={styles.emptyStateIcon}>✨</Text>
                      <Text style={[styles.emptyStateTitle, { color: '#047857' }]}>کوئی نقصان دہ آئٹم نہیں ملی!</Text>
                      <Text style={styles.emptyStateSub}>
                        ماشاءاللہ! تمام اشیاء نفع بخش مارجن کے ساتھ فروخت ہو رہی ہیں۔ اس دورانیے میں کوئی بھی پروڈکٹ منفی خالص مارجن یا ادھار کے نقصان میں نہیں ہے۔
                      </Text>
                    </View>
                  ) : (
                    auditReport.lossLeaders.map((item) => (
                      <View key={item.id} style={styles.lossLeaderCard}>
                        <View style={styles.llHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.llItemName}>{item.itemName}</Text>
                            <Text style={styles.llCategory}>{item.category}</Text>
                          </View>
                          <View style={styles.llSeverityPill}>
                            <Text style={styles.llSeverityText}>
                              {item.severity === 'CRITICAL_LOSS'
                                ? '🔴 حقیقی نقصان'
                                : item.severity === 'CREDIT_TRAP'
                                ? '🟡 ادھار ٹریپ'
                                : '⚪ زیرو مارجن'}
                            </Text>
                          </View>
                        </View>

                        {/* Financial Math Grid */}
                        <View style={styles.llMathBox}>
                          <View style={styles.llMathRow}>
                            <Text style={styles.llMathLabel}>ریٹیل قیمت فروخت:</Text>
                            <Text style={styles.llMathVal}>Rs. {item.retailPrice}</Text>
                          </View>
                          <View style={styles.llMathRow}>
                            <Text style={styles.llMathLabel}>ہول سیل لاگت (خرید):</Text>
                            <Text style={styles.llMathVal}>- Rs. {item.wholesaleCost}</Text>
                          </View>
                          <View style={styles.llMathRow}>
                            <Text style={styles.llMathLabel}>فریج بجلی + شاپر بیگز خرچ:</Text>
                            <Text style={styles.llMathVal}>- Rs. {item.packagingAndStorageCost}</Text>
                          </View>
                          <View style={[styles.llMathRow, styles.llMathRowFinal]}>
                            <Text style={styles.llMathLabelBold}>خالص منافع فی آئٹم:</Text>
                            <Text
                              style={[
                                styles.llMathValBold,
                                item.realUnitNetProfit < 0 ? { color: '#DC2626' } : { color: '#047857' },
                              ]}
                            >
                              Rs. {item.realUnitNetProfit} ({item.realNetMarginPercent}%)
                            </Text>
                          </View>
                        </View>

                        {/* Diagnosis & Action Advice */}
                        <View style={styles.llAdviceBox}>
                          <Text style={styles.llDiagnosisText}>
                            🔍 <Text style={{ fontWeight: '800' }}>تشخیص:</Text> {item.diagnosisUrdu}
                          </Text>
                          <Text style={styles.llActionText}>
                            💡 <Text style={{ fontWeight: '800' }}>AI تجویز:</Text>{' '}
                            {item.actionRecommendationUrdu}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB 4: TAX & WHT SHIELD */}
              {activeSubTab === 'TAX_SHIELD' && (
                <View style={styles.tabContentSection}>
                  <Text style={styles.sectionHeading}>
                    🏛️ ایف بی آر ایڈوانس ٹیکس و کٹوتیاں (Tax & WHT Shield):
                  </Text>
                  <View style={styles.taxSummaryCard}>
                    <View style={styles.taxRow}>
                      <Text style={styles.taxLabel}>کمرشل بجلی بل ودہولڈنگ ٹیکس (Section 235):</Text>
                      <Text style={styles.taxVal}>
                        Rs. {auditReport.taxSummary.electricityWhtSec235.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.taxRow}>
                      <Text style={styles.taxLabel}>ہول سیل سپلائی پر ایڈوانس ٹیکس (Section 236G/H):</Text>
                      <Text style={styles.taxVal}>
                        Rs. {auditReport.taxSummary.distributorWhtSec236.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.taxRow, styles.taxRowTotal]}>
                      <Text style={styles.taxLabelBold}>کل کٹا ہوا ایڈوانس ٹیکس:</Text>
                      <Text style={styles.taxValBold}>
                        Rs. {auditReport.taxSummary.totalAdvanceTaxDeducted.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.taxAdvisoryBox}>
                      <Ionicons name="information-circle" size={18} color="#0284C7" />
                      <Text style={styles.taxAdvisoryText}>{auditReport.taxSummary.advisoryUrdu}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionsBar}>
                <TouchableOpacity
                  style={styles.whatsAppShareBtn}
                  onPress={shareWhatsAppAuditReport}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnTextWhite}>واٹس ایپ آڈٹ رپورٹ شیئر کریں</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.csvExportBtn}
                  onPress={downloadCSVReport}
                  activeOpacity={0.85}
                >
                  <Ionicons name="download-outline" size={16} color="#006C4E" style={{ marginRight: 6 }} />
                  <Text style={styles.btnTextGreen}>CSV ایکسپورٹ</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  proTag: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  periodTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    minHeight: 38,
  },
  periodTabActive: {
    backgroundColor: '#006C4E',
  },
  periodTabText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  periodTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  content: {
    padding: 14,
  },
  executiveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#006C4E',
    padding: 14,
    marginBottom: 12,
  },
  execTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  execLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006C4E',
    textTransform: 'uppercase',
  },
  execProfitVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 2,
  },
  execMarginSub: {
    fontSize: 11,
    color: '#64748B',
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bleedIndicatorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
  },
  bleedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bleedCol: {
    alignItems: 'center',
  },
  bleedColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  bleedColValNaive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  bleedColValBleed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 2,
  },
  bleedNoticeText: {
    fontSize: 10,
    color: '#991B1B',
    lineHeight: 14,
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    minHeight: 38,
  },
  subTabBtnActive: {
    backgroundColor: '#E8F5EE',
  },
  subTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#006C4E',
    fontWeight: '800',
  },
  tabContentSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  waterfallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  waterfallCardIncome: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  waterfallCardFinal: {
    backgroundColor: '#E8F5EE',
    borderWidth: 2,
    borderColor: '#006C4E',
  },
  waterfallCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stageNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  stageTitleUrdu: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  stageTitleEnglish: {
    fontSize: 10,
    color: '#64748B',
  },
  stageAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  stageAmountDeduction: {
    color: '#DC2626',
  },
  stageAmountFinal: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '900',
  },
  stagePct: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  stageDesc: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 14,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 8,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  catNameUrdu: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  catNameEng: {
    fontSize: 10,
    color: '#64748B',
  },
  catStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  catStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  catStatsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-between',
  },
  catStatCol: {
    alignItems: 'center',
  },
  catStatLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  catStatVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  lossLeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    padding: 12,
    marginBottom: 10,
  },
  llHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  llItemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  llCategory: {
    fontSize: 10,
    color: '#64748B',
  },
  llSeverityPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  llSeverityText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  llMathBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    gap: 4,
  },
  llMathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  llMathRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#FECDD3',
    paddingTop: 4,
    marginTop: 2,
  },
  llMathLabel: {
    fontSize: 10.5,
    color: '#4C0519',
  },
  llMathVal: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#4C0519',
  },
  llMathLabelBold: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4C0519',
  },
  llMathValBold: {
    fontSize: 12,
    fontWeight: '900',
  },
  llAdviceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 4,
  },
  llDiagnosisText: {
    fontSize: 10.5,
    color: '#475569',
    lineHeight: 15,
  },
  llActionText: {
    fontSize: 10.5,
    color: '#065F46',
    fontWeight: '700',
    lineHeight: 15,
  },
  taxSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taxRowTotal: {
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  taxLabel: {
    fontSize: 11,
    color: '#475569',
  },
  taxVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  taxLabelBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  taxValBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006C4E',
  },
  taxAdvisoryBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  taxAdvisoryText: {
    flex: 1,
    fontSize: 10.5,
    color: '#0369A1',
    lineHeight: 15,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  whatsAppShareBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 46,
  },
  btnTextWhite: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  csvExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#006C4E',
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 46,
  },
  btnTextGreen: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006C4E',
  },
  emptyStateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
