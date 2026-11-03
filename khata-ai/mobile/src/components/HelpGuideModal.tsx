import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

interface HelpGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenManageTill?: () => void;
  onOpenWasooliModal?: () => void;
  onOpenAddBillModal?: () => void;
  onOpenGallaBandiModal?: () => void;
  onOpenMunafaAnalyticsModal?: () => void;
  onOpenStaffPayrollModal?: () => void;
}

type GuideStepId =
  | 'opening'
  | 'sales'
  | 'procurement'
  | 'expenses'
  | 'wasooli'
  | 'closing'
  | 'hybrid';

interface IGuideStep {
  id: GuideStepId;
  icon: keyof typeof Ionicons.glyphMap;
  titleUrdu: string;
  titleEnglish: string;
  badgeRole: 'ALL' | 'OWNER_MANAGER' | 'OWNER_ONLY';
  accentColor: string;
}

const GUIDE_STEPS: IGuideStep[] = [
  {
    id: 'opening',
    icon: 'sunny-outline',
    titleUrdu: '1. صبح کا آغاز (گلہ کنٹرول)',
    titleEnglish: 'Shift Opening & Till Setup',
    badgeRole: 'ALL',
    accentColor: '#0284C7',
  },
  {
    id: 'sales',
    icon: 'cart-outline',
    titleUrdu: '2. دن کی بکری (نقد و ادھار ساودا)',
    titleEnglish: 'Counter Sales & Credit Limit',
    badgeRole: 'ALL',
    accentColor: '#059669',
  },
  {
    id: 'procurement',
    icon: 'cube-outline',
    titleUrdu: '3. مال کی خریداری (سٹاک و پیشگی)',
    titleEnglish: 'Stock Orders & Prepayment',
    badgeRole: 'OWNER_MANAGER',
    accentColor: '#7C3AED',
  },
  {
    id: 'expenses',
    icon: 'wallet-outline',
    titleUrdu: '4. دکان کے اخراجات و تنخواہ',
    titleEnglish: 'Expenses & Staff Payroll',
    badgeRole: 'OWNER_MANAGER',
    accentColor: '#D97706',
  },
  {
    id: 'wasooli',
    icon: 'send-outline',
    titleUrdu: '5. وصولی و تقاضا ڈسپیچ',
    titleEnglish: 'Debt Recovery & Taqaza',
    badgeRole: 'ALL',
    accentColor: '#10B981',
  },
  {
    id: 'closing',
    icon: 'moon-outline',
    titleUrdu: '6. شام کا اختتام (گلہ بندی و منافع)',
    titleEnglish: 'Galla Audit & Net Margin',
    badgeRole: 'OWNER_ONLY',
    accentColor: '#E11D48',
  },
  {
    id: 'hybrid',
    icon: 'home-outline',
    titleUrdu: '7. دکاندار و گھر (ڈوئل موڈ)',
    titleEnglish: 'Hybrid Business & Home Bridge',
    badgeRole: 'ALL',
    accentColor: '#3B82F6',
  },
];

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  visible,
  onClose,
  onOpenManageTill,
  onOpenWasooliModal,
  onOpenAddBillModal,
  onOpenGallaBandiModal,
  onOpenMunafaAnalyticsModal,
  onOpenStaffPayrollModal,
}) => {
  const [activeStep, setActiveStep] = useState<GuideStepId>('opening');

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="help-buoy" size={22} color="#0284C7" />
              <View>
                <Text style={styles.headerTitle}>مدد و عملی رہنمائی (DigiHisab Operating Guide)</Text>
                <Text style={styles.headerSubTitle}>
                  Step-by-Step Daily Workflow Guide for Owner, Manager & Cashier
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Step Selector Horizontal Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.stepBar}
            contentContainerStyle={styles.stepBarContent}
          >
            {GUIDE_STEPS.map((step) => {
              const isActive = activeStep === step.id;
              return (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.stepChip,
                    isActive && { backgroundColor: step.accentColor, borderColor: step.accentColor },
                  ]}
                  onPress={() => setActiveStep(step.id)}
                >
                  <Ionicons
                    name={step.icon}
                    size={15}
                    color={isActive ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text style={[styles.stepChipText, isActive && styles.stepChipTextActive]}>
                    {step.titleUrdu}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Guide Content Display Area */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeStep === 'opening' && (
              <View style={styles.contentSection}>
                <View style={styles.stepHeaderBox}>
                  <Text style={styles.stepTitle}>1. صبح کا آغاز: گلہ کنٹرول و شفٹ اوپننگ</Text>
                  <Text style={styles.roleTagAll}>👥 ALL ROLES (Owner, Manager, Cashier)</Text>
                </View>

                <View style={styles.flowDiagramBox}>
                  <Text style={styles.flowDiagramText}>
                    [ 1. PIN Auth ] ──► [ 2. Manage Till (گلہ کنٹرول) ] ──► [ 3. Verify Float Cash ]
                  </Text>
                </View>

                <Text style={styles.bulletTitle}>📋 عملی مراحل (Step-by-step Execution):</Text>
                <Text style={styles.bulletText}>
                  1. **رول لاگ ان (Role Login)**: 4 ہندسوں والے سیکور PIN سے لاگ ان کریں۔ سسٹم خودکار طور پر کیشیئر، منیجر یا مالک کے اختیارات لاگو کر دیتا ہے۔
                </Text>
                <Text style={styles.bulletText}>
                  2. **گلہ اوپننگ (Till Float Entry)**: "Manage Till" پر کلک کریں۔ صبح کا نقد کیش (مثلاً Rs. 5,000 چینج نقد) درج کر کے شفٹ اوپن کریں۔
                </Text>
                <Text style={styles.bulletText}>
                  3. **اکاؤنٹ چیک**: دکان گلہ، ڈیجیٹل والیٹ (JazzCash/Easypaisa) اور بینک کھاتے کا بیلنس چیک کریں۔
                </Text>

                {onOpenManageTill && (
                  <TouchableOpacity
                    style={[styles.actionLaunchBtn, { backgroundColor: '#0284C7' }]}
                    onPress={() => {
                      onClose();
                      onOpenManageTill();
                    }}
                  >
                    <Ionicons name="wallet-outline" size={16} color="#FFF" />
                    <Text style={styles.actionLaunchBtnText}>گلہ اوپن کریں (Manage Till Open)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeStep === 'sales' && (
              <View style={styles.contentSection}>
                <View style={styles.stepHeaderBox}>
                  <Text style={styles.stepTitle}>2. دن کی بکری: فوری نقد، سروس و ادھار سودا</Text>
                  <Text style={styles.roleTagAll}>👥 ALL ROLES (Owner, Manager, Cashier)</Text>
                </View>

                <View style={styles.flowDiagramBox}>
                  <Text style={styles.flowDiagramText}>
                    Counter Sale ──► Quick Cash (نقد) | POS Itemized | + Naya Udhaar (+نیا ادھار)
                  </Text>
                </View>

                <Text style={styles.bulletTitle}>📋 فروش کے اہم طریقے:</Text>
                <Text style={styles.bulletText}>
                  1. **فوری نقد / سروس سیل (Quick Cash Sale)**: نقد رقم درج کریں۔ حجام، درزی یا سروس کے لیے نوٹ لکھیں (مثلاً "Cutting & Beard")، سٹاک کم نہیں ہوگا۔
                </Text>
                <Text style={styles.bulletText}>
                  2. **پرچون و آئٹمائزڈ POS**: سامان فروخت کرتے وقت آئٹم سلیکٹ کریں تاکہ انوینٹری سے خودکار کٹوتی ہو۔
                </Text>
                <Text style={styles.bulletText}>
                  3. **نیا ادھار (+ Naya Udhaar)**: گاہک کی حد چیک ہوتی ہے۔ اگر کریڈٹ لمٹ کراس ہو تو منیجر PIN اوور رائڈ کی ضرورت ہوتی ہے۔
                </Text>
                <Text style={styles.bulletText}>
                  4. **ڈیجیٹل وصولی (QR & Merchant Pay)**: کاؤنٹر پر JazzCash / Easypaisa QR ڈسپلے کریں۔
                </Text>
              </View>
            )}

            {activeStep === 'procurement' && (
              <View style={styles.contentSection}>
                <View style={styles.stepHeaderBox}>
                  <Text style={styles.stepTitle}>3. مال کی خریداری: سٹاک آرڈر و سپلائر پیشگی</Text>
                  <Text style={styles.roleTagManager}>💼 MANAGER & OWNER ONLY</Text>
                </View>

                <View style={styles.formulaBox}>
                  <Text style={styles.formulaTitle}>📐 Supplier Prepayment Offset Formula:</Text>
                  <Text style={styles.formulaText}>
                    Net Payable Owed = Gross Bill - Advance Prepayment (پیشگی سکیورٹی)
                  </Text>
                </View>

                <Text style={styles.bulletTitle}>📋 خریداری کا مکمل عمل:</Text>
                <Text style={styles.bulletText}>
                  1. **سٹاک الرٹ (Reorder Radar)**: کم سٹاک والے آئٹمز خودکار طور پر فلیگ ہوتے ہیں۔
                </Text>
                <Text style={styles.bulletText}>
                  2. **ہول سیل واٹس ایپ آرڈر (Wholesale PO)**: سپلائر سلیکٹ کریں اور 1-ٹیکٹ واٹس ایپ آرڈر پرچ ارسال کریں۔
                </Text>
                <Text style={styles.bulletText}>
                  3. **انوائس کی انٹری (Add Bill)**: سپلائر کا بل درج کریں۔ اگر سابقہ پیشگی (Advance) موجود ہو تو خودکار طور پر منہا ہو جاتی ہے اور خالص واجب الادا رقم درج ہوتی ہے۔
                </Text>

                {onOpenAddBillModal && (
                  <TouchableOpacity
                    style={[styles.actionLaunchBtn, { backgroundColor: '#7C3AED' }]}
                    onPress={() => {
                      onClose();
                      onOpenAddBillModal();
                    }}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#FFF" />
                    <Text style={styles.actionLaunchBtnText}>انوائس درج کریں (Add Supplier Bill)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeStep === 'expenses' && (
              <View style={styles.contentSection}>
                <View style={styles.stepHeaderBox}>
                  <Text style={styles.stepTitle}>4. دکان کے اخراجات و ملازمین کی تنخواہ</Text>
                  <Text style={styles.roleTagManager}>💼 MANAGER & OWNER ONLY</Text>
                </View>

                <Text style={styles.bulletTitle}>📋 آؤٹ فلو کنٹرولز:</Text>
                <Text style={styles.bulletText}>
                  1. **روزانہ دکان خرچہ (Daily Expense)**: چائے، بجلی بل، دکان مرمت درج کریں۔ کٹوتی سے قبل نقد گلہ بیلنس چیک کیا جاتا ہے تاکہ منفی کیش سے بچا جا سکے۔
                </Text>
                <Text style={styles.bulletText}>
                  2. **ملازمین پیشگی و تنخواہ (Staff & Tankhwa)**: روزانہ کا خرچہ، پیشگی (Advance) اور ماہانہ نیٹ تنخواہ ادا کریں۔
                </Text>

                {onOpenStaffPayrollModal && (
                  <TouchableOpacity
                    style={[styles.actionLaunchBtn, { backgroundColor: '#D97706' }]}
                    onPress={() => {
                      onClose();
                      onOpenStaffPayrollModal();
                    }}
                  >
                    <Ionicons name="people-outline" size={16} color="#FFF" />
                    <Text style={styles.actionLaunchBtnText}>اسٹاف تنخواہ رجسٹر (Staff Payroll)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeStep === 'wasooli' && (
              <View style={styles.contentSection}>
                <View style={styles.stepHeaderBox}>
                  <Text style={styles.stepTitle}>5. وصولی و ادھار تقاضا ڈسپیچ</Text>
                  <Text style={styles.roleTagAll}>👥 ALL ROLES (Owner, Manager, Cashier)</Text>
                </View>

                <Text style={styles.bulletTitle}>📋 وصولی و تقاضا کا طریقہ:</Text>
                <Text style={styles.bulletText}>
                  1. **ریکوری ریڈار (Recovery Radar)**: واجب الادا بقایا جات والے گاہک دیکھیں۔
                </Text>
                <Text style={styles.bulletText}>
                  2. **تقاضا ٹون لیڈر (Reminder Tone)**:
                  {'\n'}• **نرم (Polite)**: دوستانہ ابتدائی یاد دہانی
                  {'\n'}• **واضح (Firm)**: تاریخ گزرنے پر فوری نوٹس
                  {'\n'}• **فائنل (Urgent)**: کھاتہ بلاک ہونے سے قبل حتمی پیغام
                </Text>
                <Text style={styles.bulletText}>
                  3. **وصولی اندراج (Wasooli)**: نقد، JazzCash یا بینک میں رقم موصول کر کے کھاتہ صاف کریں۔
                </Text>

                {onOpenWasooliModal && (
                  <TouchableOpacity
                    style={[styles.actionLaunchBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => {
                      onClose();
                      onOpenWasooliModal();
                    }}
                  >
                    <Ionicons name="cash-outline" size={16} color="#FFF" />
                    <Text style={styles.actionLaunchBtnText}>وصولی رجسٹر کریں (Record Wasooli)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {activeStep === 'closing' && (
              <View style={styles.contentSection}>
                <View style={styles.stepHeaderBox}>
                  <Text style={styles.stepTitle}>6. شام کا اختتام: گلہ بندی و روزنامچہ منافع</Text>
                  <Text style={styles.roleTagOwner}>👑 OWNER ONLY</Text>
                </View>

                <View style={styles.formulaBox}>
                  <Text style={styles.formulaTitle}>📐 Galla Audit Expected Formula:</Text>
                  <Text style={styles.formulaText}>
                    Expected Cash = Opening Float + Cash Sales + Wasooli - Expenses - Supplier Payments
                  </Text>
                </View>

                <Text style={styles.bulletTitle}>📋 روزانہ کا اختتامی آڈٹ:</Text>
                <Text style={styles.bulletText}>
                  1. **گلہ بندی (Galla Bandi)**: ہاتھ کا نقد گن کر سسٹم میں درج کریں۔ فرق (Shortage/Surplus) خودکار طور پر فلیگ ہوتا ہے۔
                </Text>
                <Text style={styles.bulletText}>
                  2. **خالص منافع رپورٹ (Munafa Statement)**: روزانہ، ماہانہ اور سالانہ خالص منافع (Net Profit) دیکھیں، تمام اخراجات کٹنے کے بعد۔
                </Text>
                <Text style={styles.bulletText}>
                  3. **PDF / Excel برآمد**: 1-کلک میں برانڈڈ PDF سٹیٹمنٹ یا Excel شیٹ ڈاؤن لوڈ کریں۔
                </Text>

                <View style={styles.btnRow}>
                  {onOpenGallaBandiModal && (
                    <TouchableOpacity
                      style={[styles.actionLaunchBtn, { backgroundColor: '#E11D48', flex: 1 }]}
                      onPress={() => {
                        onClose();
                        onOpenGallaBandiModal();
                      }}
                    >
                      <Ionicons name="calculator-outline" size={16} color="#FFF" />
                      <Text style={styles.actionLaunchBtnText}>گلہ بندی آڈٹ</Text>
                    </TouchableOpacity>
                  )}

                  {onOpenMunafaAnalyticsModal && (
                    <TouchableOpacity
                      style={[styles.actionLaunchBtn, { backgroundColor: '#059669', flex: 1 }]}
                      onPress={() => {
                        onClose();
                        onOpenMunafaAnalyticsModal();
                      }}
                    >
                      <Ionicons name="bar-chart-outline" size={16} color="#FFF" />
                      <Text style={styles.actionLaunchBtnText}>منافع رپورٹ</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {activeStep === 'hybrid' && (
              <View style={styles.contentSection}>
                <View style={styles.stepHeaderBox}>
                  <Text style={styles.stepTitle}>7. دکاندار و گھر: ڈوئل پر سونا برج</Text>
                  <Text style={styles.roleTagAll}>👥 HYBRID ACCOUNTS</Text>
                </View>

                <Text style={styles.bulletTitle}>📋 کاروبار و گھر کا الگ کھاتہ:</Text>
                <Text style={styles.bulletText}>
                  1. **ٹاپ سوئچر**: ایک ہی اکاؤنٹ میں `[ 🏪 دکاندار / Shop ]` اور `[ 🏠 گھر / Household ]` کے درمیان فوری سوئچ کریں۔
                </Text>
                <Text style={styles.bulletText}>
                  2. **گھر کا خرچہ (Inter-Account Transfer)**: جب مالک گلہ سے گھر کے راشن یا بل کے لیے رقم نکالے تو اسے "Inter-Account Transfer" درج کریں۔ یہ دکان کے پرافٹ مارجن کو خراب کیے بغیر گھریلو کھاتے میں کریڈٹ ہو جاتا ہے۔
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '95%',
    maxWidth: 620,
    maxHeight: '90%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubTitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  stepBar: {
    backgroundColor: '#1E293B',
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  stepBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  body: {
    padding: 16,
  },
  contentSection: {
    gap: 12,
  },
  stepHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#38BDF8',
    flex: 1,
  },
  roleTagAll: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagManager: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FDE047',
    backgroundColor: '#713F12',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleTagOwner: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FDA4AF',
    backgroundColor: '#881337',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  flowDiagramBox: {
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  flowDiagramText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  formulaBox: {
    backgroundColor: '#1E1B4B',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4338CA',
    marginBottom: 6,
  },
  formulaTitle: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '800',
  },
  formulaText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  bulletTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F1F5F9',
    marginTop: 4,
  },
  bulletText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  actionLaunchBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  actionLaunchBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
