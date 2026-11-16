import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DailyProvisionRegisterModal } from './DailyProvisionRegisterModal';
import { RashanGroceryPlannerModal } from './RashanGroceryPlannerModal';
import { MandiRateTrackerModal } from './MandiRateTrackerModal';
import { PantryDepletionModal } from './PantryDepletionModal';
import { UtilityBillsTrackerModal } from './UtilityBillsTrackerModal';
import { SchoolFeeTrackerModal } from './SchoolFeeTrackerModal';
import { DomesticStaffSalaryModal } from './DomesticStaffSalaryModal';
import { HouseholdIncomeVaultModal } from './HouseholdIncomeVaultModal';
import { ZakatSadqahCalculatorModal } from './ZakatSadqahCalculatorModal';
import { KametiCommitteeModal } from './KametiCommitteeModal';
import { SeasonalHomeRepairModal } from './SeasonalHomeRepairModal';
import { DomesticJevGuardianModal } from './DomesticJevGuardianModal';
import { DomesticKitchenRunwayModal } from './DomesticKitchenRunwayModal';
import { DomesticVoiceAssistantModal } from './DomesticVoiceAssistantModal';
import { DomesticAuditAndCorrectionModal } from './DomesticAuditAndCorrectionModal';
import { SubscriptionModal } from './SubscriptionModal';
import { GharanaMoreToolsModal, GharanaToolItem } from './GharanaMoreToolsModal';
import { subscriptionService } from '../services/subscription.service';

export type DomesticCategory = 'HOUSEHOLD';

const GHARANA_PINNED_STORAGE_KEY = '@digihisab_gharana_pinned_tools';
const DEFAULT_GHARANA_PINNED_IDS = [
  'rozana_kharcha',
  'smart_rashan',
  'sub_meter',
  'kameti',
  'maid_staff',
];

export const DomesticDashboardHub: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [balanceVisible, setBalanceVisible] = useState<boolean>(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [subModalVisible, setSubModalVisible] = useState<boolean>(false);
  const [subTrigger, setSubTrigger] = useState<{ key?: string; title?: string }>({});

  const handleProtectedModal = async (modalKey: string) => {
    if (modalKey === 'voice_assistant') {
      const res = await subscriptionService.checkFeatureAccess('FEATURE_DOMESTIC_VOICE_AI', 'HOUSEHOLD');
      if (!res.allowed) {
        setSubTrigger({ key: res.featureKey, title: res.featureTitleUrdu });
        setSubModalVisible(true);
        return;
      }
    } else if (modalKey === 'kameti') {
      const res = await subscriptionService.checkFeatureAccess('FEATURE_KAMETI_TRACKER', 'HOUSEHOLD');
      if (!res.allowed) {
        setSubTrigger({ key: res.featureKey, title: res.featureTitleUrdu });
        setSubModalVisible(true);
        return;
      }
    } else if (modalKey === 'rashan') {
      const res = await subscriptionService.checkFeatureAccess('FEATURE_RASHAN_FORECASTER', 'HOUSEHOLD');
      if (!res.allowed) {
        setSubTrigger({ key: res.featureKey, title: res.featureTitleUrdu });
        setSubModalVisible(true);
        return;
      }
    }
    setActiveModal(modalKey);
  };

  const [pinnedToolIds, setPinnedToolIds] = useState<string[]>(DEFAULT_GHARANA_PINNED_IDS);
  const [gharanaMoreModalVisible, setGharanaMoreModalVisible] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(GHARANA_PINNED_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPinnedToolIds(parsed.slice(0, 5));
          }
        }
      } catch (e) {}
    })();
  }, []);

  const handleTogglePinTool = async (toolId: string) => {
    let next: string[];
    if (pinnedToolIds.includes(toolId)) {
      if (pinnedToolIds.length <= 1) {
        Alert.alert('کم از کم ایک ٹول', 'ڈیش بورڈ پر کم از کم 1 ٹول پن رہنا ضروری ہے۔');
        return;
      }
      next = pinnedToolIds.filter((id) => id !== toolId);
    } else {
      if (pinnedToolIds.length >= 5) {
        Alert.alert(
          'پن کی حد مکمل (Pin Limit Reached)',
          'ڈیش بورڈ پر زیادہ سے زیادہ 5 ٹولز پن کیے جا سکتے ہیں۔ کسی دوسرے ٹول کو ان پن کر کے دوبارہ کوشش کریں۔'
        );
        return;
      }
      next = [...pinnedToolIds, toolId];
    }
    setPinnedToolIds(next);
    try {
      await AsyncStorage.setItem(GHARANA_PINNED_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  // Complete Catalog of 15 Domestic (Gharana) Services
  const allGharanaTools: GharanaToolItem[] = useMemo(() => [
    {
      id: 'rozana_kharcha',
      title: 'Rozana Kharcha',
      titleUrdu: 'روزانہ گھریلو خرچہ',
      icon: 'receipt',
      iconBg: '#FFE4E6',
      iconColor: '#E11D48',
      onPress: () => setActiveModal('kitchen_runway'),
    },
    {
      id: 'smart_rashan',
      title: 'Smart Rashan',
      titleUrdu: 'راشن لسٹ اور بجٹ',
      icon: 'cart',
      iconBg: 'rgba(0, 212, 159, 0.12)',
      iconColor: '#00d49f',
      badge: '38 اشیاء',
      badgeColor: '#00d49f',
      badgeBg: 'rgba(0, 212, 159, 0.15)',
      onPress: () => handleProtectedModal('rashan'),
    },
    {
      id: 'sub_meter',
      title: 'Sub-Meter Bill',
      titleUrdu: 'بجلی سب میٹر حساب',
      icon: 'flash',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      badge: 'الرٹ',
      badgeColor: '#EF4444',
      badgeBg: '#FEE2E2',
      onPress: () => setActiveModal('utility'),
    },
    {
      id: 'kameti',
      title: 'Kameti Tracker',
      titleUrdu: 'کمیٹی و اقساط',
      icon: 'people',
      iconBg: '#F3E8FF',
      iconColor: '#9333EA',
      badge: 'Month 2/5',
      badgeColor: '#9333EA',
      badgeBg: '#F3E8FF',
      onPress: () => handleProtectedModal('kameti'),
    },
    {
      id: 'maid_staff',
      title: 'Maid & Staff',
      titleUrdu: 'ملازمین تنخواہ',
      icon: 'person',
      iconBg: '#EEF2FF',
      iconColor: '#4F46E5',
      badge: 'تنخواہ',
      badgeColor: '#F59E0B',
      badgeBg: '#FEF3C7',
      onPress: () => setActiveModal('staff_maid'),
    },
    {
      id: 'doodh_roti',
      title: 'Milk & Bread',
      titleUrdu: 'دودھ و نان بائی',
      icon: 'pint',
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
      badge: 'Daily POS',
      badgeColor: '#0284C7',
      badgeBg: '#E0F2FE',
      onPress: () => setActiveModal('milk_bread'),
    },
    {
      id: 'repair_ac',
      title: 'Home & AC Repair',
      titleUrdu: 'گھر مرمت و سروس',
      icon: 'construct',
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      badge: 'پری سیزن',
      badgeColor: '#D97706',
      badgeBg: '#FEF3C7',
      onPress: () => setActiveModal('seasonal_repair'),
    },
    {
      id: 'mandi_sabzi',
      title: 'Sabzi & Gosht',
      titleUrdu: 'سبزی و گوشت منڈی',
      icon: 'basket',
      iconBg: 'rgba(0, 212, 159, 0.12)',
      iconColor: '#00d49f',
      onPress: () => setActiveModal('mandi_budget'),
    },
    {
      id: 'medical_rx',
      title: 'Medical & Rx',
      titleUrdu: 'بزرگوں کی ادویات',
      icon: 'medkit',
      iconBg: '#FFE4E6',
      iconColor: '#E11D48',
      onPress: () => setActiveModal('medical'),
    },
    {
      id: 'zakat_sadqah',
      title: 'Zakat & Sadqah',
      titleUrdu: 'زکوٰۃ و صدقات',
      icon: 'heart',
      iconBg: '#CCFBF1',
      iconColor: '#0D9488',
      badge: '2.5% نصاب',
      badgeColor: '#0D9488',
      badgeBg: '#CCFBF1',
      onPress: () => setActiveModal('zakat'),
    },
    {
      id: 'school_fee',
      title: 'School Fees',
      titleUrdu: 'بچوں کی اسکول فیس',
      icon: 'school',
      iconBg: '#F1F5F9',
      iconColor: '#475569',
      onPress: () => setActiveModal('school_fee'),
    },
    {
      id: 'income_vault',
      title: 'Income & Vault',
      titleUrdu: 'آمدن، والٹ و بچت',
      icon: 'wallet',
      iconBg: '#ECFDF5',
      iconColor: '#059669',
      onPress: () => setActiveModal('income_vault'),
    },
    {
      id: 'jev_guardian',
      title: 'JEV Guardian',
      titleUrdu: 'JEV والٹ گارڈین',
      icon: 'shield-checkmark',
      iconBg: '#EFF6FF',
      iconColor: '#2563EB',
      badge: 'تحفظ',
      badgeColor: '#2563EB',
      badgeBg: '#DBEAFE',
      onPress: () => setActiveModal('jev_guardian'),
    },
    {
      id: 'voice_assistant',
      title: 'Voice Assistant',
      titleUrdu: 'رومن اردو صوتی معاون',
      icon: 'mic',
      iconBg: 'rgba(0, 212, 159, 0.12)',
      iconColor: '#00d49f',
      badge: 'بولیں',
      badgeColor: '#00d49f',
      badgeBg: 'rgba(0, 212, 159, 0.15)',
      onPress: () => handleProtectedModal('voice_assistant'),
    },
    {
      id: 'domestic_audit',
      title: 'Audit & Log',
      titleUrdu: 'گھریلو حساب آڈٹ',
      icon: 'document-text',
      iconBg: '#F3E8FF',
      iconColor: '#7E22CE',
      badge: 'آڈٹ',
      badgeColor: '#7E22CE',
      badgeBg: '#F3E8FF',
      onPress: () => setActiveModal('domestic_audit'),
    },
  ], []);

  const displayedPinnedTools = useMemo(() => {
    return pinnedToolIds
      .map((id) => allGharanaTools.find((t) => t.id === id))
      .filter(Boolean) as GharanaToolItem[];
  }, [pinnedToolIds, allGharanaTools]);

  return (
    <View
      style={[
        styles.rootContainer,
        {
          paddingTop: Math.max(insets.top, 8),
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <View style={styles.mainWrapper}>
        {/* ================= 1. TOP IDENTITY & BALANCE BANNER ================= */}
        <View style={styles.identityBanner}>
          <View style={styles.identityRow}>
            {/* Avatar & Persona Subtitle */}
            <View style={styles.userBlock}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>MS</Text>
                <View style={styles.onlineBadge} />
              </View>
              <View style={styles.nameCol}>
                <Text style={styles.userName}>Muhammad Saad</Text>
                <Text style={styles.personaTag}>گھر کا حساب • Family Head</Text>
              </View>
            </View>

            {/* Date Tag */}
            <View style={styles.dateTag}>
              <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
              <Text style={styles.dateTagText}>Oct 2026</Text>
            </View>
          </View>

          {/* Liquid Reserve Pool Card */}
          <TouchableOpacity
            style={styles.balanceDeck}
            onPress={() => setActiveModal('income_vault')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={styles.balanceLabel}>Reserve Pool (گھریلو محفوظ فنڈ)</Text>
                <View
                  style={{
                    backgroundColor: 'rgba(0, 212, 159, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(0, 212, 159, 0.3)',
                  }}
                >
                  <Text style={{ fontSize: 9.5, color: '#00d49f', fontWeight: 'bold' }}>
                    والٹ و بجٹ ➔
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setActiveModal('jev_guardian');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield-checkmark" size={10} color="#38BDF8" />
                  <Text style={{ fontSize: 9.5, color: '#38BDF8', fontWeight: 'bold' }}>
                    JEV گارڈین
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setActiveModal('kitchen_runway');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="speedometer-outline" size={10} color="#F59E0B" />
                  <Text style={{ fontSize: 9.5, color: '#F59E0B', fontWeight: 'bold' }}>
                    کچن رن وے
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(0, 212, 159, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(0, 212, 159, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    handleProtectedModal('voice_assistant');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mic" size={10} color="#00d49f" />
                  <Text style={{ fontSize: 9.5, color: '#00d49f', fontWeight: 'bold' }}>
                    بولیں 🎙️
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setActiveModal('domestic_audit');
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shield-checkmark" size={10} color="#38BDF8" />
                  <Text style={{ fontSize: 9.5, color: '#38BDF8', fontWeight: 'bold' }}>
                    آڈٹ و تصحیح 🛡️
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceAmount}>
                {balanceVisible ? 'Rs. 84,500' : '••••••••'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.balanceToggleBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                setBalanceVisible((prev) => !prev);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={15}
                color="#CBD5E1"
              />
              <Text style={styles.balanceToggleText}>
                {balanceVisible ? 'چھپائیں' : 'دیکھیں'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* ================= 2. GHARANA HUB (PINNED 5 ACTIONS + 6TH MORE TOOLS TILE) ================= */}
        <View style={styles.gridSection}>
          <View style={styles.gridHeaderRow}>
            <View style={styles.gharanaTitleLeft}>
              <View style={styles.mintBarStripe} />
              <Text style={styles.gridSectionTitle}>Gharana Hub (گھریلو ٹولز)</Text>
            </View>
            <TouchableOpacity
              style={styles.allToolsHeaderPill}
              onPress={() => setGharanaMoreModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="apps-outline" size={13} color="#00d49f" />
              <Text style={styles.servicesCountText}>
                {allGharanaTools.length} Services ({allGharanaTools.length - displayedPinnedTools.length} More)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridMatrix}>
            {/* First 5 Slots: Pinned Square Cards */}
            {displayedPinnedTools.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                style={styles.tileCard}
                onPress={tile.onPress}
                activeOpacity={0.8}
              >
                {/* Feature Pill Badge at Top-Right */}
                {Boolean(tile.badge) && (
                  <View
                    style={[
                      styles.tileBadge,
                      { backgroundColor: tile.badgeBg || '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tileBadgeText,
                        { color: tile.badgeColor || '#B45309' },
                      ]}
                      numberOfLines={1}
                    >
                      {tile.badge}
                    </Text>
                  </View>
                )}

                {/* Centered Soft Icon Badge */}
                <View
                  style={[
                    styles.tileIconContainer,
                    { backgroundColor: tile.iconBg },
                  ]}
                >
                  <Ionicons
                    name={tile.icon}
                    size={20}
                    color={tile.iconColor}
                  />
                </View>

                {/* Primary English Title */}
                <Text
                  style={styles.tilePrimaryTitle}
                  numberOfLines={1}
                >
                  {tile.title}
                </Text>

                {/* Crisp Urdu Subtitle */}
                <Text
                  style={styles.tileUrduSub}
                  numberOfLines={1}
                >
                  {tile.titleUrdu}
                </Text>
              </TouchableOpacity>
            ))}

            {/* 6th Slot: Dedicated Interactive Dashed-Border Square Card */}
            <TouchableOpacity
              style={[styles.tileCard, styles.tileCardMore]}
              onPress={() => setGharanaMoreModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.tileIconContainer, { backgroundColor: '#E0F2FE', marginBottom: 6 }]}>
                <Ionicons name="apps" size={20} color="#0284C7" />
              </View>
              <Text style={[styles.tilePrimaryTitle, { color: '#0284C7' }]} numberOfLines={1}>
                {`+${Math.max(1, allGharanaTools.length - displayedPinnedTools.length)} More`}
              </Text>
              <Text style={styles.tileUrduSub} numberOfLines={1}>
                تمام ٹولز
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating Urdu Household Voice Assistant Action Button */}
      <TouchableOpacity
        style={styles.floatingVoiceFab}
        onPress={() => handleProtectedModal('voice_assistant')}
        activeOpacity={0.85}
      >
        <View style={styles.fabPulseGlow}>
          <Ionicons name="mic" size={20} color="#070d18" />
        </View>
        <Text style={styles.fabText}>بولیں 🎙️</Text>
      </TouchableOpacity>

      {/* ================= 4. MODAL ROUTER (PURE OVERLAYS ONLY) ================= */}
      {/* 1. Milk & Bread Register */}
      {activeModal === 'milk_bread' && (
        <DailyProvisionRegisterModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 2. Monthly Rashan & Grocery Planner */}
      {activeModal === 'rashan' && (
        <RashanGroceryPlannerModal
          visible={true}
          onClose={() => setActiveModal(null)}
          onOpenPantryDepletion={() => setActiveModal('pantry_depletion')}
        />
      )}

      {/* 2B. Mandi Rate Tracker & Sabzi/Gosht Budget Modal */}
      {activeModal === 'mandi_budget' && (
        <MandiRateTrackerModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 2C. Pantry Depletion & Auto-Restock Checklist Modal */}
      {activeModal === 'pantry_depletion' && (
        <PantryDepletionModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 3. Utility Bills Tracker Modal */}
      {activeModal === 'utility' && (
        <UtilityBillsTrackerModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 3B. School & College Fee Tracker Modal */}
      {activeModal === 'school_fee' && (
        <SchoolFeeTrackerModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 4. Kameti / BC Modal */}
      {activeModal === 'kameti' && (
        <KametiCommitteeModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 5. Medical & Rx Modal */}
      {activeModal === 'medical' && (
        <SimpleServiceModal
          title="Medical & Rx"
          titleUrdu="بزرگوں کی ادویات (Chronic Refills)"
          icon="medkit"
          iconColor="#FB7185"
          iconBg="rgba(244, 63, 94, 0.16)"
          onClose={() => setActiveModal(null)}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.pillListWrap}>
              <View style={styles.pillRow}>
                <Ionicons name="flask-outline" size={16} color="#FB7185" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pillName}>Glucophage 500mg</Text>
                  <Text style={styles.pillSub}>والد صاحب • صبح و شام</Text>
                </View>
                <Text style={[styles.pillAlert, { color: '#EF4444' }]}>5 دن باقی</Text>
              </View>
              <View style={styles.pillRow}>
                <Ionicons name="heart-circle-outline" size={16} color="#FB7185" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pillName}>Concor 2.5mg</Text>
                  <Text style={styles.pillSub}>والدہ صاحبہ • صبح</Text>
                </View>
                <Text style={[styles.pillAlert, { color: '#10B981' }]}>18 دن باقی</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: '#FB7185' }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.modalActionBtnText}>میڈیسن آرڈر کریں</Text>
            </TouchableOpacity>
          </View>
        </SimpleServiceModal>
      )}

      {/* 6. Staff & Maid Modal */}
      {activeModal === 'staff_maid' && (
        <DomesticStaffSalaryModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 7. Zakat & Sadqah Modal */}
      {activeModal === 'zakat' && (
        <ZakatSadqahCalculatorModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 8. Seasonal Appliance Servicing & Home Repair Modal */}
      {activeModal === 'seasonal_repair' && (
        <SeasonalHomeRepairModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 9. More Features Modal */}
      {activeModal === 'more' && (
        <SimpleServiceModal
          title="More Features"
          titleUrdu="مزید گھریلو سہولیات (Additional Registers)"
          icon="ellipsis-horizontal"
          iconColor="#CBD5E1"
          iconBg="rgba(148, 163, 184, 0.16)"
          onClose={() => setActiveModal(null)}
        >
          <View style={{ gap: 8 }}>
            {[
              {
                title: 'آمدن، والٹ و محفوظ فنڈ (Income & Vault Allocator)',
                icon: 'wallet-outline',
                badge: 'لیکویڈیٹی',
                action: () => setActiveModal('income_vault'),
              },
              {
                title: 'بچوں کی اسکول و اکیڈمی فیس (School & Tuition Fee)',
                icon: 'school-outline',
                badge: '⚠️ فیس شیڈول',
                action: () => setActiveModal('school_fee'),
              },
              {
                title: 'راشن پینٹری و پیشگوئی (Pantry Restock Checklist)',
                icon: 'hourglass-outline',
                badge: '3 دن الرٹ',
                action: () => setActiveModal('pantry_depletion'),
              },
              {
                title: 'JEV والٹ و بجٹ گارڈین (JEV Solvency & Budget Radar)',
                icon: 'shield-checkmark-outline',
                badge: '🛡️ تحفظ',
                action: () => setActiveModal('jev_guardian'),
              },
              {
                title: '30-Day کچن رن وے اور خسارہ ریڈار (Kitchen Runway & Deficit Radar)',
                icon: 'speedometer-outline',
                badge: '⏳ رن وے',
                action: () => setActiveModal('kitchen_runway'),
              },
              {
                title: 'اردو بول چال گھریلو کھاتہ (Urdu Voice Assistant)',
                icon: 'mic-outline',
                badge: '🎙️ بولیں',
                action: () => setActiveModal('voice_assistant'),
              },
              {
                title: 'گھریلو آڈٹ لاگ اور ڈیٹا تصحیح (Household Audit & Correction Hub)',
                icon: 'shield-checkmark-outline',
                badge: '🛡️ آڈٹ لاگ',
                action: () => setActiveModal('domestic_audit'),
              },
            ].map((f, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.miniItem,
                  {
                    borderColor: 'rgba(0, 212, 159, 0.4)',
                    backgroundColor: 'rgba(0, 212, 159, 0.06)',
                  },
                ]}
                onPress={() => f.action()}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={f.icon as any}
                  size={18}
                  color="#00d49f"
                />
                <Text
                  style={[
                    styles.miniItemText,
                    { color: '#00d49f', fontWeight: 'bold', flex: 1 },
                  ]}
                >
                  {f.title}
                </Text>
                {Boolean(f.badge) && (
                  <View
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: 'rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: 'bold' }}>
                      {f.badge}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color="#00d49f" />
              </TouchableOpacity>
            ))}
          </View>
        </SimpleServiceModal>
      )}

      {/* 10. Household Treasury & Vault Allocator */}
      {(activeModal === 'income' || activeModal === 'income_vault') && (
        <HouseholdIncomeVaultModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 11. JEV Domestic Vault & Budget Guardian */}
      {activeModal === 'jev_guardian' && (
        <DomesticJevGuardianModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 12. Domestic Kitchen Runway & Deficit Radar */}
      {activeModal === 'kitchen_runway' && (
        <DomesticKitchenRunwayModal
          visible={true}
          onClose={() => setActiveModal(null)}
          onOpenJevGuardian={() => setActiveModal('jev_guardian')}
        />
      )}

      {/* 13. Urdu Household Voice Assistant */}
      {activeModal === 'voice_assistant' && (
        <DomesticVoiceAssistantModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 14. Domestic Record Audit & Data Updation Hub */}
      {activeModal === 'domestic_audit' && (
        <DomesticAuditAndCorrectionModal
          visible={true}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* 15. Dynamic Domestic Subscription & Feature Paywall Modal */}
      <SubscriptionModal
        visible={subModalVisible}
        currentPersona="HOUSEHOLD"
        onClose={() => {
          setSubModalVisible(false);
          setSubTrigger({});
        }}
        featureKeyRequired={subTrigger.key}
        featureTitleUrdu={subTrigger.title}
        onPlanSelected={async (plan) => {
          setSubModalVisible(false);
          setSubTrigger({});
        }}
      />

      {/* 16. Gharana All Tools Drawer / Modal */}
      <GharanaMoreToolsModal
        visible={gharanaMoreModalVisible}
        onClose={() => setGharanaMoreModalVisible(false)}
        tools={allGharanaTools}
        pinnedToolIds={pinnedToolIds}
        onTogglePin={handleTogglePinTool}
        onSelectTool={(tool) => tool.onPress()}
      />
    </View>
  );
};

// ================= REUSABLE OVERLAY SHEET COMPONENT =================
interface SimpleServiceModalProps {
  title: string;
  titleUrdu: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  onClose: () => void;
  children: React.ReactNode;
}

const SimpleServiceModal: React.FC<SimpleServiceModalProps> = ({
  title,
  titleUrdu,
  icon,
  iconColor,
  iconBg,
  onClose,
  children,
}) => {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetCard}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={[styles.sheetIconBadge, { backgroundColor: iconBg }]}>
              <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitleText}>{title}</Text>
              <Text style={styles.sheetUrduText}>{titleUrdu}</Text>
            </View>
            <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ================= STYLESHEET (FULL-SCREEN FLUID VIEWPORT) =================
const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#070d18', // Deep dark slate-navy
    paddingHorizontal: 12,
  },
  mainWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },

  // 1. Top Identity & Balance Banner
  identityBanner: {
    backgroundColor: '#0d1627', // Dark navy container
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00d49f',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#070d18',
    fontWeight: '900',
    fontSize: 13.5,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00d49f',
    borderWidth: 1.5,
    borderColor: '#0d1627',
  },
  nameCol: {
    flex: 1,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 14.5,
    fontWeight: 'bold',
  },
  personaTag: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 1,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  dateTagText: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  balanceDeck: {
    backgroundColor: 'rgba(15, 29, 54, 0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceLabel: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '700',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 1,
  },
  balanceToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.6)',
  },
  balanceToggleText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },

  // 2. Expanded 3x3 Service Grid (flex-1)
  gridSection: {
    marginBottom: 16,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  gharanaTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mintBarStripe: {
    width: 4,
    height: 16,
    backgroundColor: '#00d49f',
    borderRadius: 2,
  },
  gridSectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  allToolsHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  servicesCountText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '700',
  },
  gridMatrix: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  tileCard: {
    width: '31.4%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tileCardMore: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    backgroundColor: 'rgba(240, 249, 255, 0.7)',
  },
  tileBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    zIndex: 10,
  },
  tileBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  tileIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tilePrimaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 14,
    width: '100%',
  },
  tileUrduSub: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
    width: '100%',
  },

  // 4. Modal Overlays
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
    marginBottom: 14,
  },
  sheetIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitleText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetUrduText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  modalContentCard: {
    paddingTop: 4,
  },
  statBoxRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 10,
    marginBottom: 14,
  },
  infoStripText: {
    color: '#34D399',
    fontSize: 11,
    flex: 1,
  },
  modalActionBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pillListWrap: {
    gap: 8,
    marginBottom: 14,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillSub: {
    color: '#94A3B8',
    fontSize: 10,
  },
  pillAlert: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniItemText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  floatingVoiceFab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    shadowColor: '#00d49f',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    gap: 8,
    zIndex: 99,
  },
  fabPulseGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: '800',
  },
});
