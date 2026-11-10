import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
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
import { subscriptionService } from '../services/subscription.service';

export type DomesticCategory = 'HOUSEHOLD';

export interface DomesticServiceTile {
  id: string;
  modalKey: string;
  title: string;
  titleUrdu: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  category: DomesticCategory;
}

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

  // Household 3x3 Grid Services (9 Core Items)
  const householdTiles: DomesticServiceTile[] = [
    {
      id: 'rashan',
      modalKey: 'MonthlyRashanPlannerModal',
      title: 'Rashan Planner',
      titleUrdu: 'ماہانہ راشن لسٹ',
      icon: 'cart',
      iconBg: 'rgba(16, 185, 129, 0.16)',
      iconColor: '#34D399',
      badge: '38 اشیاء',
      badgeColor: '#34D399',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'milk_bread',
      modalKey: 'DailyMilkBreadRegisterModal',
      title: 'Milk & Bread',
      titleUrdu: 'دودھ و نان بائی',
      icon: 'pint',
      iconBg: 'rgba(56, 189, 248, 0.16)',
      iconColor: '#38BDF8',
      badge: 'Daily POS',
      badgeColor: '#38BDF8',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'utility',
      modalKey: 'UtilityBillsTrackerModal',
      title: 'Utility Bills',
      titleUrdu: 'بجلی و گیس کے بل',
      icon: 'flash',
      iconBg: 'rgba(245, 158, 11, 0.16)',
      iconColor: '#FBBF24',
      badge: '🚨 3 دن الرٹ',
      badgeColor: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'kameti',
      modalKey: 'KametiCommitteeModal',
      title: 'Kameti / BC',
      titleUrdu: 'کمیٹی کھاتہ',
      icon: 'people',
      iconBg: 'rgba(168, 85, 247, 0.16)',
      iconColor: '#C084FC',
      badge: 'Month 2/5',
      badgeColor: '#C084FC',
      badgeBg: 'rgba(168, 85, 247, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'seasonal_repair',
      modalKey: 'SeasonalHomeRepairModal',
      title: 'Home & AC Repair',
      titleUrdu: 'گھر کی مرمت و سروسنگ',
      icon: 'construct',
      iconBg: 'rgba(56, 189, 248, 0.16)',
      iconColor: '#38BDF8',
      badge: '⚡ پری سیزن',
      badgeColor: '#38BDF8',
      badgeBg: 'rgba(56, 189, 248, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'staff_maid',
      modalKey: 'DomesticStaffSalaryModal',
      title: 'Staff & Maid',
      titleUrdu: 'ملازمہ تنخواہ',
      icon: 'person',
      iconBg: 'rgba(14, 165, 233, 0.16)',
      iconColor: '#38BDF8',
      badge: 'پیشگی و تنخواہ',
      badgeColor: '#F59E0B',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'mandi_budget',
      modalKey: 'MandiRateTrackerModal',
      title: 'Sabzi & Gosht',
      titleUrdu: 'سبزی و گوشت منڈی',
      icon: 'basket',
      iconBg: 'rgba(0, 212, 159, 0.16)',
      iconColor: '#00d49f',
      badge: 'ہفتہ وار بجٹ',
      badgeColor: '#00d49f',
      badgeBg: 'rgba(0, 212, 159, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'zakat',
      modalKey: 'ZakatSadqahCalculatorModal',
      title: 'Zakat & Sadqah',
      titleUrdu: 'زکوٰۃ و صدقات',
      icon: 'heart',
      iconBg: 'rgba(45, 212, 191, 0.16)',
      iconColor: '#2DD4BF',
      badge: '2.5% نصاب',
      badgeColor: '#2DD4BF',
      badgeBg: 'rgba(45, 212, 191, 0.15)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'more',
      modalKey: 'DomesticMoreToolsModal',
      title: 'More Features',
      titleUrdu: 'مزید سہولیات',
      icon: 'ellipsis-horizontal',
      iconBg: 'rgba(148, 163, 184, 0.16)',
      iconColor: '#CBD5E1',
      badge: '+3 Tools',
      badgeColor: '#CBD5E1',
      badgeBg: 'rgba(148, 163, 184, 0.15)',
      category: 'HOUSEHOLD',
    },
  ];

  const currentTiles = householdTiles;

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

        {/* ================= 2. THE EXPANDED 3x3 SERVICE GRID (FLEX-1) ================= */}
        <View style={styles.gridSection}>
          <View style={styles.gridHeaderRow}>
            <Text style={styles.gridSectionTitle}>🏡 گھریلو سہولیات (Domestic Services)</Text>
            <Text style={styles.gridCounter}>9 سروسز مکمل فعال</Text>
          </View>

          <View style={styles.gridMatrix}>
            {currentTiles.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                style={[
                  styles.tileCard,
                  isDesktop && styles.tileCardDesktop,
                ]}
                onPress={() => handleProtectedModal(tile.id)}
                activeOpacity={0.8}
              >
                {/* Status Pill Badge at Top-Right */}
                {Boolean(tile.badge) && (
                  <View style={styles.tileBadge}>
                    <Text
                      style={[
                        styles.tileBadgeText,
                        { color: tile.badgeColor || '#CBD5E1' },
                      ]}
                    >
                      {tile.badge}
                    </Text>
                  </View>
                )}

                {/* Centered Soft Icon Badge */}
                <View
                  style={[
                    styles.tileIconContainer,
                    isDesktop && styles.tileIconContainerDesktop,
                    { backgroundColor: tile.iconBg, borderColor: tile.iconColor + '40' },
                  ]}
                >
                  <Ionicons
                    name={tile.icon}
                    size={isDesktop ? 26 : 22}
                    color={tile.iconColor}
                  />
                </View>

                {/* Primary Title */}
                <Text
                  style={[
                    styles.tilePrimaryTitle,
                    isDesktop && styles.tilePrimaryTitleDesktop,
                  ]}
                  numberOfLines={1}
                >
                  {tile.title}
                </Text>

                {/* Urdu Subtitle */}
                <Text
                  style={[
                    styles.tileUrduSub,
                    isDesktop && styles.tileUrduSubDesktop,
                  ]}
                  numberOfLines={1}
                >
                  {tile.titleUrdu}
                </Text>
              </TouchableOpacity>
            ))}
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
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  gridSectionTitle: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  gridCounter: {
    color: '#00d49f',
    fontSize: 10.5,
    fontWeight: '700',
  },
  gridMatrix: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#17233b',
    backgroundColor: 'rgba(9, 17, 30, 0.6)',
    padding: 10,
    justifyContent: 'space-between',
    alignContent: 'stretch',
  },
  tileCard: {
    width: '31.6%',
    flexGrow: 1,
    minHeight: 106,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    backgroundColor: '#0d1627',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tileCardDesktop: {
    minHeight: 136,
    paddingVertical: 14,
    borderRadius: 20,
  },
  tileBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.6)',
  },
  tileBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  tileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileIconContainerDesktop: {
    width: 52,
    height: 52,
    borderRadius: 16,
    marginBottom: 8,
  },
  tilePrimaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    width: '100%',
  },
  tilePrimaryTitleDesktop: {
    fontSize: 13,
  },
  tileUrduSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },
  tileUrduSubDesktop: {
    fontSize: 11,
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
