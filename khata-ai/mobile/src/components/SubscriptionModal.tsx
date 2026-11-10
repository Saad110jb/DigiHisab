import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../store/auth.store';
import { subscriptionService, PlanIdentifier } from '../services/subscription.service';
import { COLORS } from '../theme/colors';

export interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  featureKeyRequired?: string;
  featureTitleUrdu?: string;
  onPlanSelected?: (planKey: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  visible,
  onClose,
  featureKeyRequired,
  featureTitleUrdu,
  onPlanSelected
}) => {
  const { user } = useAuth();
  const [selectedPersona, setSelectedPersona] = useState<'DUKANDAR' | 'HOUSEHOLD' | 'DUAL'>('DUKANDAR');
  const [selectedPlanKey, setSelectedPlanKey] = useState<string>('DUKAN_BASIC_250');
  const [promoCode, setPromoCode] = useState<string>('');
  const [discountApplied, setDiscountApplied] = useState<number>(0);
  const [promoValidated, setPromoValidated] = useState<boolean>(false);
  const [isValidatingPromo, setIsValidatingPromo] = useState<boolean>(false);

  useEffect(() => {
    if (featureKeyRequired) {
      if (featureKeyRequired === 'FEATURE_CHOR_NAZAR_AUDIT' || featureKeyRequired === 'FEATURE_AI_STOCK_PREDICTOR') {
        setSelectedPersona('DUKANDAR');
        setSelectedPlanKey('DUKAN_PRO_MALIK_400');
      } else if (featureKeyRequired === 'FEATURE_VOICE_AI_ENTRY' || featureKeyRequired === 'FEATURE_AI_TAGAZA_TONES') {
        setSelectedPersona('DUKANDAR');
        setSelectedPlanKey('DUKAN_BASIC_250');
      } else if (featureKeyRequired === 'FEATURE_LESCO_SUBMETER' || featureKeyRequired === 'FEATURE_KAMETI_TRACKER') {
        setSelectedPersona('HOUSEHOLD');
        setSelectedPlanKey('GHAR_AI_PRO_200');
      }
    }
  }, [featureKeyRequired]);

  const handleSkip = async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem('@digihisab_last_subscription_prompt_at', now);
      await AsyncStorage.setItem('@digihisab_subscription_initial_dismissed', 'true');
    } catch (err) {}
    onClose();
  };

  const handleApplyPromo = () => {
    if (!promoCode.trim()) return;
    setIsValidatingPromo(true);

    setTimeout(() => {
      const clean = promoCode.trim().toUpperCase();
      if (clean === 'FAISAL_MANDI_20' || clean === 'AZADI2026' || clean === 'LAHORE_PROMO') {
        setDiscountApplied(50); // 50% off
        setPromoValidated(true);
        Alert.alert('واؤچر لاگو ہو گیا!', `پرومو کوڈ "${clean}" کے ذریعے 50% رعایت شامل کر دی گئی ہے۔`);
      } else if (clean === 'MANDI50') {
        setDiscountApplied(25);
        setPromoValidated(true);
        Alert.alert('واؤچر لاگو ہو گیا!', '500 مفت واٹس ایپ ایس ایم ایس کریڈٹ حاصل ہو گئے۔');
      } else {
        Alert.alert('غلط پرومو کوڈ', 'یہ پرومو کوڈ غیر فعال ہے یا زائد المیعاد ہو چکا ہے۔');
      }
      setIsValidatingPromo(false);
    }, 600);
  };

  const getPrice = (basePrice: number) => {
    if (!promoValidated || discountApplied === 0) return basePrice;
    return Math.round(basePrice * (1 - discountApplied / 100));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleSkip}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header with Skip Button */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>💎 ڈیجی حساب پریمیم پلانز</Text>
              <Text style={styles.headerSubtitle}>Upgrade your business &amp; domestic ledger</Text>
            </View>

            {/* Clean Skip Button */}
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>ابھی نہیں (Skip)</Text>
              <Ionicons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Contextual Alert if triggered by a specific feature */}
          {featureTitleUrdu && (
            <View style={styles.featureTriggerAlert}>
              <Ionicons name="lock-closed" size={16} color="#F59E0B" />
              <Text style={styles.featureTriggerText}>
                یہ فیچر <Text style={{ fontWeight: 'bold', color: '#FFF' }}>{featureTitleUrdu}</Text> استعمال کرنے کے لیے پیکیج اپگریڈ کریں۔
              </Text>
            </View>
          )}

          {/* Persona Segment Tabs */}
          <View style={styles.personaTabs}>
            <TouchableOpacity
              style={[styles.personaTab, selectedPersona === 'DUKANDAR' && styles.personaTabActive]}
              onPress={() => {
                setSelectedPersona('DUKANDAR');
                setSelectedPlanKey('DUKAN_BASIC_250');
              }}
            >
              <Ionicons name="storefront" size={14} color={selectedPersona === 'DUKANDAR' ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.personaTabText, selectedPersona === 'DUKANDAR' && styles.personaTabTextActive]}>
                دکاندار (POS)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.personaTab, selectedPersona === 'HOUSEHOLD' && styles.personaTabActive]}
              onPress={() => {
                setSelectedPersona('HOUSEHOLD');
                setSelectedPlanKey('GHAR_AI_PRO_200');
              }}
            >
              <Ionicons name="home" size={14} color={selectedPersona === 'HOUSEHOLD' ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.personaTabText, selectedPersona === 'HOUSEHOLD' && styles.personaTabTextActive]}>
                گھر کا حساب
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.personaTab, selectedPersona === 'DUAL' && styles.personaTabActive]}
              onPress={() => {
                setSelectedPersona('DUAL');
                setSelectedPlanKey('DUAL_VIP_750');
              }}
            >
              <Ionicons name="ribbon" size={14} color={selectedPersona === 'DUAL' ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.personaTabText, selectedPersona === 'DUAL' && styles.personaTabTextActive]}>
                ڈوئل VIP (دکان+گھر)
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* DUKANDAR TIERS */}
            {selectedPersona === 'DUKANDAR' && (
              <View style={styles.plansContainer}>
                {/* Tier 1: Dukandar Retail Standard (Rs. 250) */}
                <TouchableOpacity
                  style={[styles.planCard, selectedPlanKey === 'DUKAN_BASIC_250' && styles.planCardActive]}
                  onPress={() => setSelectedPlanKey('DUKAN_BASIC_250')}
                >
                  <View style={styles.planCardHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.planCardTitle}>Dukandar Standard</Text>
                        <Text style={styles.popularBadge}>POPULAR</Text>
                      </View>
                      <Text style={styles.planCardUrdu}>بنیادی ریٹیل کھاتہ</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceNumber}>Rs. {getPrice(250)}<Text style={styles.perMonth}>/ماہ</Text></Text>
                      {promoValidated && <Text style={styles.originalPrice}>Rs. 250</Text>}
                    </View>
                  </View>

                  <View style={styles.featureList}>
                    <Text style={styles.featureItem}>✨ <Text style={{ fontWeight: 'bold', color: '#00D49F' }}>رومن اردو وائس کھاتہ:</Text> بول کر نقد و ادھار اندراج</Text>
                    <Text style={styles.featureItem}>✨ <Text style={{ fontWeight: 'bold', color: '#00D49F' }}>اے آئی تقاضا ٹونز:</Text> خودکار نرم / سخت واٹس ایپ پیغامات</Text>
                    <Text style={styles.featureItem}>⚡ لامحدود کسٹمر کھاتے (No 20-Khata limit)</Text>
                    <Text style={styles.featureItem}>🖨️ بلوٹوتھ تھرمل رسید پرنٹنگ</Text>
                    <Text style={styles.featureItem}>👥 1 کیشئر ملازم سب اکاؤنٹ</Text>
                  </View>
                </TouchableOpacity>

                {/* Tier 2: Dukandar Pro Malik (Rs. 400) */}
                <TouchableOpacity
                  style={[styles.planCard, selectedPlanKey === 'DUKAN_PRO_MALIK_400' && styles.planCardActive]}
                  onPress={() => setSelectedPlanKey('DUKAN_PRO_MALIK_400')}
                >
                  <View style={styles.planCardHeader}>
                    <View>
                      <Text style={styles.planCardTitle}>Pro Malik Sentinel</Text>
                      <Text style={styles.planCardUrdu}>پرو مالک و چور نظر پیک</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceNumber}>Rs. {getPrice(400)}<Text style={styles.perMonth}>/ماہ</Text></Text>
                      {promoValidated && <Text style={styles.originalPrice}>Rs. 400</Text>}
                    </View>
                  </View>

                  <View style={styles.featureList}>
                    <Text style={styles.featureItem}>🛡️ <Text style={{ fontWeight: 'bold', color: '#00D49F' }}>چور نظر اے آئی آڈٹ:</Text> کیش دراز فرق و غبن الرٹ</Text>
                    <Text style={styles.featureItem}>📈 <Text style={{ fontWeight: 'bold', color: '#00D49F' }}>اے آئی منشی اسٹاک:</Text> گھی، چینی، دالوں کی خریداری پیشگوئی</Text>
                    <Text style={styles.featureItem}>🔑 مینجر ماسٹر پن اوور رائیڈ</Text>
                    <Text style={styles.featureItem}>👥 3 کیشئر ٹرمینل سب اکاؤنٹس</Text>
                    <Text style={styles.featureItem}>✨ تمام اسٹینڈرڈ وائس کھاتہ فیچرز شامل ہیں</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* HOUSEHOLD TIER */}
            {selectedPersona === 'HOUSEHOLD' && (
              <View style={styles.plansContainer}>
                <TouchableOpacity
                  style={[styles.planCard, selectedPlanKey === 'GHAR_AI_PRO_200' && styles.planCardActive]}
                  onPress={() => setSelectedPlanKey('GHAR_AI_PRO_200')}
                >
                  <View style={styles.planCardHeader}>
                    <View>
                      <Text style={styles.planCardTitle}>Ghar Ka Hisab AI Pro</Text>
                      <Text style={styles.planCardUrdu}>گھر کا حساب پرو وائس پیک</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceNumber}>Rs. {getPrice(200)}<Text style={styles.perMonth}>/ماہ</Text></Text>
                      {promoValidated && <Text style={styles.originalPrice}>Rs. 200</Text>}
                    </View>
                  </View>

                  <View style={styles.featureList}>
                    <Text style={styles.featureItem}>🗣️ رومن اردو وائس اے آئی معاون (گھریلو اخراجات)</Text>
                    <Text style={styles.featureItem}>🛒 سمارٹ راشن بجٹ فورکاسٹر و مہنگائی تحفظ</Text>
                    <Text style={styles.featureItem}>⚡ کرایہ دار سب میٹر نیپرا سلیب بل کیلکولیٹر</Text>
                    <Text style={styles.featureItem}>💰 کمیٹی و ملازمین تنخواہ و ایڈوانس ٹریکر</Text>
                    <Text style={styles.featureItem}>👥 2 فیملی ممبر سب اکاؤنٹس</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* DUAL VIP TIER */}
            {selectedPersona === 'DUAL' && (
              <View style={styles.plansContainer}>
                <TouchableOpacity
                  style={[styles.planCard, selectedPlanKey === 'DUAL_VIP_750' && styles.planCardActive, { borderColor: '#F59E0B' }]}
                  onPress={() => setSelectedPlanKey('DUAL_VIP_750')}
                >
                  <View style={styles.planCardHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.planCardTitle}>Dual-Persona VIP</Text>
                        <Text style={[styles.popularBadge, { backgroundColor: '#F59E0B' }]}>UNLIMITED</Text>
                      </View>
                      <Text style={styles.planCardUrdu}>ڈوئل وی آئی پی (دکان + گھر)</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.priceNumber}>Rs. {getPrice(750)}<Text style={styles.perMonth}>/ماہ</Text></Text>
                      {promoValidated && <Text style={styles.originalPrice}>Rs. 750</Text>}
                    </View>
                  </View>

                  <View style={styles.featureList}>
                    <Text style={styles.featureItem}>👑 <Text style={{ fontWeight: 'bold', color: '#F59E0B' }}>تمام فیچرز انلاک:</Text> دکان کا مکمل کھاتہ + گھرانہ ہب</Text>
                    <Text style={styles.featureItem}>🔄 1-ٹیپ دکان و گھر فاسٹ پروفائل سوئچ</Text>
                    <Text style={styles.featureItem}>👥 10 کیشئر و فیملی سب اکاؤنٹس</Text>
                    <Text style={styles.featureItem}>🤖 مکمل اردو اے آئی، وائس معاون و چور نظر آڈٹ</Text>
                    <Text style={styles.featureItem}>💼 مشترکہ کیش دراز و فیملی والٹ سیونگز</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Promo Code Input Box */}
            <View style={styles.promoContainer}>
              <Text style={styles.promoLabel}>پرومو کوڈ یا واؤچر کوڈ درج کریں:</Text>
              <View style={styles.promoInputRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="e.g. FAISAL_MANDI_20"
                  placeholderTextColor="#64748B"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={handleApplyPromo}
                  disabled={isValidatingPromo || !promoCode}
                  style={styles.applyPromoBtn}
                >
                  {isValidatingPromo ? (
                    <ActivityIndicator size="small" color="#0F172A" />
                  ) : (
                    <Text style={styles.applyPromoText}>لاگو کریں</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Subscribe Action Button */}
            <TouchableOpacity
              style={styles.subscribeBtn}
              onPress={async () => {
                const finalPrice = getPrice(
                  selectedPlanKey === 'DUAL_VIP_750'
                    ? 750
                    : selectedPlanKey === 'DUKAN_PRO_MALIK_400'
                    ? 400
                    : selectedPlanKey === 'DUKAN_BASIC_250'
                    ? 250
                    : 200
                );

                try {
                  // Activate 30-day subscription
                  await subscriptionService.activateSubscription(
                    selectedPlanKey as PlanIdentifier,
                    'JAZZCASH',
                    finalPrice,
                    promoValidated ? promoCode : undefined,
                    30 // 30-day monthly validity
                  );

                  Alert.alert(
                    'ادائیگی اور پیکج فعال ہو گیا! 🎉',
                    `آپ کا پریمیم پلان "${selectedPlanKey}" 30 دن کے لیے فعال کر دیا گیا ہے۔ تمام منتخب اے آئی فیچرز اب دستیاب ہیں۔\n\nادا شدہ رقم: Rs. ${finalPrice}`,
                    [
                      {
                        text: 'ٹھیک ہے / شکریہ',
                        onPress: () => {
                          onPlanSelected?.(selectedPlanKey);
                          onClose();
                        },
                      },
                    ]
                  );
                } catch (e) {
                  Alert.alert('خرابی', 'پیکیج ایکٹیویشن میں مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔');
                }
              }}
            >
              <Text style={styles.subscribeBtnText}>ابھی اپگریڈ کریں (JazzCash / PayFast)</Text>
              <Ionicons name="arrow-forward" size={18} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSkip} style={styles.bottomSkipBtn}>
              <Text style={styles.bottomSkipText}>بعد میں فیصلہ کریں (Continue Free Trial)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 13, 24, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0D1627',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#17233B',
    maxHeight: '90%',
    padding: 20,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#17233B',
    paddingBottom: 14,
    marginBottom: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#17233B',
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  featureTriggerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  featureTriggerText: {
    color: '#FCD34D',
    fontSize: 11,
    flex: 1,
  },
  personaTabs: {
    flexDirection: 'row',
    backgroundColor: '#070D18',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#17233B',
  },
  personaTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 9,
  },
  personaTabActive: {
    backgroundColor: '#00D49F',
  },
  personaTabText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  personaTabTextActive: {
    color: '#0F172A',
    fontWeight: '900',
  },
  bodyScroll: {
    maxHeight: 460,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#070E1B',
    borderWidth: 1.5,
    borderColor: '#17233B',
    borderRadius: 16,
    padding: 16,
  },
  planCardActive: {
    borderColor: '#00D49F',
    backgroundColor: 'rgba(0, 212, 159, 0.04)',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#17233B',
    paddingBottom: 10,
    marginBottom: 10,
  },
  planCardTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  popularBadge: {
    backgroundColor: '#00D49F',
    color: '#0F172A',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  planCardUrdu: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  priceNumber: {
    color: '#00D49F',
    fontSize: 17,
    fontWeight: '900',
  },
  originalPrice: {
    color: '#64748B',
    fontSize: 10,
    textDecorationLine: 'line-through',
  },
  perMonth: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'normal',
  },
  featureList: {
    gap: 6,
  },
  featureItem: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  promoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#070D18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233B',
  },
  promoLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  promoInput: {
    flex: 1,
    backgroundColor: '#0D1627',
    borderWidth: 1,
    borderColor: '#17233B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  applyPromoBtn: {
    backgroundColor: '#00D49F',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  applyPromoText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '900',
  },
  subscribeBtn: {
    backgroundColor: '#00D49F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 18,
    shadowColor: '#00D49F',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  subscribeBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '900',
  },
  bottomSkipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  bottomSkipText: {
    color: '#64748B',
    fontSize: 11,
  },
});
