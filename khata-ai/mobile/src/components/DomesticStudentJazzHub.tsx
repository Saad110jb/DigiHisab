import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type DomesticCategory = 'HOUSEHOLD' | 'STUDENT';

export interface ServiceTileItem {
  id: string;
  modalKey: string;
  title: string;
  titleUrdu: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  contextPill?: string;
  pillColor?: string;
  pillBg?: string;
  category: DomesticCategory;
}

interface DomesticStudentJazzHubProps {
  initialCategory?: DomesticCategory;
  onCategoryChange?: (category: DomesticCategory) => void;
  onOpenRashan?: () => void;
  onOpenMilkRegister?: () => void;
}

export const DomesticStudentJazzHub: React.FC<DomesticStudentJazzHubProps> = ({
  initialCategory = 'HOUSEHOLD',
  onCategoryChange,
  onOpenRashan,
  onOpenMilkRegister,
}) => {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<DomesticCategory>(initialCategory);
  const [balanceVisible, setBalanceVisible] = useState<boolean>(true);
  const [activeModalKey, setActiveModalKey] = useState<string | null>(null);

  // Switch Category
  const handleSelectCategory = (cat: DomesticCategory) => {
    setActiveCategory(cat);
    if (onCategoryChange) {
      onCategoryChange(cat);
    }
  };

  // 1. Household 3x3 Grid Services
  const householdServices: ServiceTileItem[] = [
    {
      id: 'hh-1',
      modalKey: 'MonthlyRashanPlannerModal',
      title: 'Rashan Planner',
      titleUrdu: 'ماہانہ راشن لسٹ',
      icon: 'cart',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34D399',
      contextPill: '38 اشیاء',
      pillColor: '#34D399',
      pillBg: 'rgba(16, 185, 129, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-2',
      modalKey: 'DailyMilkBreadRegisterModal',
      title: 'Milk & Bread',
      titleUrdu: 'دودھ و نان بائی',
      icon: 'pint',
      iconBg: 'rgba(56, 189, 248, 0.15)',
      iconColor: '#38BDF8',
      contextPill: 'Daily POS',
      pillColor: '#38BDF8',
      pillBg: 'rgba(56, 189, 248, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-3',
      modalKey: 'UtilityBillsTrackerModal',
      title: 'Utility Bills',
      titleUrdu: 'بجلی و گیس کے بل',
      icon: 'flash',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#FBBF24',
      contextPill: 'نیوندرا / سولر',
      pillColor: '#FBBF24',
      pillBg: 'rgba(245, 158, 11, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-4',
      modalKey: 'KametiCommitteeModal',
      title: 'Kameti / BC',
      titleUrdu: 'کمیٹی کھاتہ',
      icon: 'people',
      iconBg: 'rgba(168, 85, 247, 0.15)',
      iconColor: '#C084FC',
      contextPill: 'Month 2/5',
      pillColor: '#C084FC',
      pillBg: 'rgba(168, 85, 247, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-5',
      modalKey: 'ChronicMedicationModal',
      title: 'Medical & Rx',
      titleUrdu: 'بزرگوں کی ادویات',
      icon: 'medkit',
      iconBg: 'rgba(244, 63, 94, 0.15)',
      iconColor: '#FB7185',
      contextPill: 'Refill Alert',
      pillColor: '#FB7185',
      pillBg: 'rgba(244, 63, 94, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-6',
      modalKey: 'DomesticHelpSalaryModal',
      title: 'Staff & Maid',
      titleUrdu: 'ملازمہ تنخواہ',
      icon: 'person',
      iconBg: 'rgba(14, 165, 233, 0.15)',
      iconColor: '#38BDF8',
      contextPill: '1st of Month',
      pillColor: '#38BDF8',
      pillBg: 'rgba(14, 165, 233, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-7',
      modalKey: 'ZakatFitranaModal',
      title: 'Zakat & Sadqah',
      titleUrdu: 'زکوٰۃ کیلکولیٹر',
      icon: 'heart',
      iconBg: 'rgba(20, 184, 166, 0.15)',
      iconColor: '#2DD4BF',
      contextPill: '2.5% Nisab',
      pillColor: '#2DD4BF',
      pillBg: 'rgba(20, 184, 166, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-8',
      modalKey: 'VehicleMaintenanceModal',
      title: 'Fuel & Maint',
      titleUrdu: 'گاڑی و دیکھ بھال',
      icon: 'car',
      iconBg: 'rgba(249, 115, 22, 0.15)',
      iconColor: '#FB923C',
      contextPill: 'Tuning Due',
      pillColor: '#FB923C',
      pillBg: 'rgba(249, 115, 22, 0.12)',
      category: 'HOUSEHOLD',
    },
    {
      id: 'hh-9',
      modalKey: 'HouseholdMoreSheet',
      title: 'More Features',
      titleUrdu: 'مزید سہولیات',
      icon: 'ellipsis-horizontal',
      iconBg: 'rgba(148, 163, 184, 0.15)',
      iconColor: '#CBD5E1',
      contextPill: '+6 Tools',
      pillColor: '#CBD5E1',
      pillBg: 'rgba(148, 163, 184, 0.12)',
      category: 'HOUSEHOLD',
    },
  ];

  // 2. Student 3x3 Grid Services
  const studentServices: ServiceTileItem[] = [
    {
      id: 'st-1',
      modalKey: 'RoommateSplitterModal',
      title: 'Room Split',
      titleUrdu: 'کمرہ و بل تقسیم',
      icon: 'pie-chart',
      iconBg: 'rgba(99, 102, 241, 0.15)',
      iconColor: '#818CF8',
      contextPill: 'Equal Split',
      pillColor: '#818CF8',
      pillBg: 'rgba(99, 102, 241, 0.12)',
      category: 'STUDENT',
    },
    {
      id: 'st-2',
      modalKey: 'HostelMessKhataModal',
      title: 'Dhaba & Mess',
      titleUrdu: 'میس و چائے ادھار',
      icon: 'cafe',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      iconColor: '#FBBF24',
      contextPill: 'Chai Khata',
      pillColor: '#FBBF24',
      pillBg: 'rgba(245, 158, 11, 0.12)',
      category: 'STUDENT',
    },
    {
      id: 'st-3',
      modalKey: 'AllowanceRunwayModal',
      title: 'Allowance Run',
      titleUrdu: 'پاکٹ منی رن وے',
      icon: 'hourglass',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#34D399',
      contextPill: '18 Din Safe',
      pillColor: '#34D399',
      pillBg: 'rgba(16, 185, 129, 0.15)',
      category: 'STUDENT',
    },
    {
      id: 'st-4',
      modalKey: 'ExamChallanFeeModal',
      title: 'Semester & Fee',
      titleUrdu: 'کورس و چالان فیس',
      icon: 'document-text',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#60A5FA',
      contextPill: 'Challan Due',
      pillColor: '#60A5FA',
      pillBg: 'rgba(59, 130, 246, 0.12)',
      category: 'STUDENT',
    },
    {
      id: 'st-5',
      modalKey: 'StudentBikeTrackerModal',
      title: 'Bike Petrol',
      titleUrdu: 'موٹرسائیکل فیول',
      icon: 'bicycle',
      iconBg: 'rgba(6, 182, 212, 0.15)',
      iconColor: '#22D3EE',
      contextPill: 'Mileage Log',
      pillColor: '#22D3EE',
      pillBg: 'rgba(6, 182, 212, 0.12)',
      category: 'STUDENT',
    },
    {
      id: 'st-6',
      modalKey: 'EventPartyPoolModal',
      title: 'Party & Pool',
      titleUrdu: 'برتھ ڈے / چندہ فنڈ',
      icon: 'gift',
      iconBg: 'rgba(236, 72, 153, 0.15)',
      iconColor: '#F472B6',
      contextPill: 'Fund Pool',
      pillColor: '#F472B6',
      pillBg: 'rgba(236, 72, 153, 0.12)',
      category: 'STUDENT',
    },
    {
      id: 'st-7',
      modalKey: 'FastFoodEntertainmentModal',
      title: 'Cafe & Dining',
      titleUrdu: 'کیفے و ہینگ آؤٹ',
      icon: 'fast-food',
      iconBg: 'rgba(249, 115, 22, 0.15)',
      iconColor: '#FB923C',
      contextPill: 'Weekend Treat',
      pillColor: '#FB923C',
      pillBg: 'rgba(249, 115, 22, 0.12)',
      category: 'STUDENT',
    },
    {
      id: 'st-8',
      modalKey: 'StudentIncomeModal',
      title: 'Gig & Freelance',
      titleUrdu: 'پارٹ ٹائم آمدن',
      icon: 'cash',
      iconBg: 'rgba(34, 197, 94, 0.15)',
      iconColor: '#4ADE80',
      contextPill: 'Upwork / Gigs',
      pillColor: '#4ADE80',
      pillBg: 'rgba(34, 197, 94, 0.12)',
      category: 'STUDENT',
    },
    {
      id: 'st-9',
      modalKey: 'StudentMoreSheet',
      title: 'More Student',
      titleUrdu: 'دیگر ٹولز',
      icon: 'ellipsis-horizontal',
      iconBg: 'rgba(148, 163, 184, 0.15)',
      iconColor: '#CBD5E1',
      contextPill: '+5 Tools',
      pillColor: '#CBD5E1',
      pillBg: 'rgba(148, 163, 184, 0.12)',
      category: 'STUDENT',
    },
  ];

  const currentServices = activeCategory === 'HOUSEHOLD' ? householdServices : studentServices;

  // Handle Tile Tap
  const handleTilePress = (tile: ServiceTileItem) => {
    if (tile.modalKey === 'MonthlyRashanPlannerModal' && onOpenRashan) {
      onOpenRashan();
      return;
    }
    if (tile.modalKey === 'DailyMilkBreadRegisterModal' && onOpenMilkRegister) {
      onOpenMilkRegister();
      return;
    }
    setActiveModalKey(tile.modalKey);
  };

  return (
    <View style={styles.rootContainer}>
      {/* ================= 1. TOP IDENTITY & LIQUID BALANCE DECK ================= */}
      <View style={styles.topIdentityBanner}>
        {/* Subtle Jazz Red Accent Line */}
        <View style={styles.jazzAccentLine} />

        {/* Identity & Status Row */}
        <View style={styles.identityRow}>
          {/* Avatar and Name */}
          <View style={styles.avatarBlock}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>MS</Text>
              {/* Active connectivity dot */}
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.nameWrap}>
              <Text style={styles.displayName}>Muhammad Saad</Text>
              <Text style={styles.personaSubtitle}>
                {activeCategory === 'HOUSEHOLD'
                  ? 'گھر کا حساب • Family Head'
                  : 'طالب علم و ہاسٹل • FAST-NUCES'}
              </Text>
            </View>
          </View>

          {/* Month Tag */}
          <View style={styles.monthBadge}>
            <Ionicons name="calendar-outline" size={12} color="#F59E0B" />
            <Text style={styles.monthBadgeText}>Oct 2026</Text>
          </View>
        </View>

        {/* Liquid Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceInfoCol}>
            <Text style={styles.balanceLabel}>
              {activeCategory === 'HOUSEHOLD'
                ? 'گھریلو محفوظ فنڈ (Reserve Pool)'
                : 'اسٹوڈنٹ پاکٹ منی بیلنس (Active Fund)'}
            </Text>
            <Text style={styles.balanceAmount}>
              {balanceVisible
                ? activeCategory === 'HOUSEHOLD'
                  ? 'Rs. 84,500'
                  : 'Rs. 16,800'
                : '••••••••'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.eyeToggleBtn}
            onPress={() => setBalanceVisible((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color="#F8FAFC"
            />
            <Text style={styles.eyeToggleText}>
              {balanceVisible ? 'چھپائیں' : 'دیکھیں'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= 2. DUAL-CARD INTERACTIVE SELECTION DECK ================= */}
      <View style={styles.dualDeckContainer}>
        {/* Card 1: Household (گھریلو حساب) */}
        <TouchableOpacity
          style={[
            styles.personaCard,
            activeCategory === 'HOUSEHOLD'
              ? styles.personaCardHouseholdActive
              : styles.personaCardInactive,
          ]}
          onPress={() => handleSelectCategory('HOUSEHOLD')}
          activeOpacity={0.85}
        >
          <View style={styles.personaCardHeader}>
            <View
              style={[
                styles.personaIconContainer,
                { backgroundColor: 'rgba(16, 185, 129, 0.18)' },
              ]}
            >
              <Ionicons
                name={activeCategory === 'HOUSEHOLD' ? 'home' : 'home-outline'}
                size={22}
                color="#10B981"
              />
            </View>
            {activeCategory === 'HOUSEHOLD' && (
              <View style={styles.activeCheckPill}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.personaTitle,
              activeCategory === 'HOUSEHOLD' && styles.personaTitleActive,
            ]}
          >
            گھریلو حساب
          </Text>
          <Text style={styles.personaSub}>راشن، دودھ، بلز، میڈیسن اور کمیٹی</Text>
        </TouchableOpacity>

        {/* Card 2: Student & Hostel (طالب علم / ہاسٹل) */}
        <TouchableOpacity
          style={[
            styles.personaCard,
            activeCategory === 'STUDENT'
              ? styles.personaCardStudentActive
              : styles.personaCardInactive,
          ]}
          onPress={() => handleSelectCategory('STUDENT')}
          activeOpacity={0.85}
        >
          <View style={styles.personaCardHeader}>
            <View
              style={[
                styles.personaIconContainer,
                { backgroundColor: 'rgba(99, 102, 241, 0.18)' },
              ]}
            >
              <Ionicons
                name={activeCategory === 'STUDENT' ? 'school' : 'school-outline'}
                size={22}
                color="#818CF8"
              />
            </View>
            {activeCategory === 'STUDENT' && (
              <View style={styles.activeCheckPill}>
                <Ionicons name="checkmark-circle" size={14} color="#818CF8" />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.personaTitle,
              activeCategory === 'STUDENT' && styles.personaTitleActive,
            ]}
          >
            طالب علم / ہاسٹل
          </Text>
          <Text style={styles.personaSub}>روم میٹ اسپلٹ، میس، پاکٹ منی رن وے</Text>
        </TouchableOpacity>
      </View>

      {/* ================= 3. DYNAMIC 3x3 SERVICE GRID MATRIX ================= */}
      <View style={styles.matrixWrapper}>
        <View style={styles.matrixHeaderRow}>
          <Text style={styles.matrixSectionTitle}>
            {activeCategory === 'HOUSEHOLD'
              ? '🏡 گھریلو سہولیات (Domestic Services)'
              : '🎓 اسٹوڈنٹ ٹولز (Campus & Hostel Hub)'}
          </Text>
          <Text style={styles.matrixCounterText}>9 سروسز فعال</Text>
        </View>

        <View style={styles.gridContainer}>
          {currentServices.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={styles.gridTile}
              onPress={() => handleTilePress(tile)}
              activeOpacity={0.78}
            >
              {/* Optional contextual pill badge */}
              {Boolean(tile.contextPill) && (
                <View
                  style={[
                    styles.contextPillWrap,
                    { backgroundColor: tile.pillBg || 'rgba(51, 65, 85, 0.5)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.contextPillText,
                      { color: tile.pillColor || '#CBD5E1' },
                    ]}
                  >
                    {tile.contextPill}
                  </Text>
                </View>
              )}

              {/* Icon badge */}
              <View
                style={[
                  styles.tileIconBadge,
                  { backgroundColor: tile.iconBg, borderColor: tile.iconColor + '40' },
                ]}
              >
                <Ionicons name={tile.icon} size={20} color={tile.iconColor} />
              </View>

              {/* Titles */}
              <Text style={styles.tileTitle} numberOfLines={1}>
                {tile.title}
              </Text>
              <Text style={styles.tileUrdu} numberOfLines={1}>
                {tile.titleUrdu}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ================= 4. SERVICE DETAIL MODALS / BOTTOM SHEETS ================= */}
      <Modal
        visible={activeModalKey !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModalKey(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header with dismiss */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderInfo}>
                <Text style={styles.sheetTitle}>
                  {currentServices.find((s) => s.modalKey === activeModalKey)?.title ||
                    'سروس تفصیل'}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {currentServices.find((s) => s.modalKey === activeModalKey)?.titleUrdu ||
                    'ڈیجی حساب پاکستان'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setActiveModalKey(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Dynamic Modal Content by key */}
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {renderModalContent(activeModalKey, () => setActiveModalKey(null))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ================= COMPONENT: DYNAMIC MODAL CONTENT RENDERER =================
function renderModalContent(modalKey: string | null, onClose: () => void) {
  if (!modalKey) return null;

  switch (modalKey) {
    case 'UtilityBillsTrackerModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="flash" size={32} color="#FBBF24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>بجلی و گیس کے بل (Utility Bills)</Text>
              <Text style={styles.serviceHeroSub}>LESCO, SNGPL اور سب میٹر بل تقسیم ماڈیول</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>کل واجب الادا بل</Text>
              <Text style={[styles.statValue, { color: '#FBBF24' }]}>Rs. 45,000</Text>
              <Text style={styles.statSub}>500 کل یونٹس</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>کرایہ دار حصہ</Text>
              <Text style={[styles.statValue, { color: '#38BDF8' }]}>Rs. 25,000</Text>
              <Text style={styles.statSub}>300 یونٹس (Adaa)</Text>
            </View>
          </View>

          <View style={styles.infoActionStrip}>
            <Ionicons name="sunny-outline" size={18} color="#10B981" />
            <Text style={styles.infoActionText}>
              سولر نیٹ میٹرنگ: رواں ماہ 120 یونٹس گرڈ کو واپس بھیجے گئے۔
            </Text>
          </View>

          <TouchableOpacity style={styles.modalPrimaryBtn} onPress={onClose}>
            <Ionicons name="receipt-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>بل ادا کریں / اندراج کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'KametiCommitteeModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Ionicons name="people" size={32} color="#C084FC" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>کمیٹی و بی سی کھاتہ (Kameti Pool)</Text>
              <Text style={styles.serviceHeroSub}>فیملی گولڈ کمیٹی • ماہ 2 از 5</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ماہانہ قسط (Installment)</Text>
              <Text style={[styles.statValue, { color: '#C084FC' }]}>Rs. 10,000</Text>
              <Text style={styles.statSub}>5 ممبران</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>آپ کی قرعہ اندازی</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>ماہ 4</Text>
              <Text style={styles.statSub}>وصولی: Rs. 50,000</Text>
            </View>
          </View>

          <View style={styles.infoActionStrip}>
            <Ionicons name="time-outline" size={18} color="#FBBF24" />
            <Text style={styles.infoActionText}>اگلی قرعہ اندازی: 25 اکتوبر 2026</Text>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#C084FC' }]}
            onPress={onClose}
          >
            <Ionicons name="wallet-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>قسط جمع کروائیں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'ChronicMedicationModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
              <Ionicons name="medkit" size={32} color="#FB7185" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>بزرگوں کی ادویات (Rx Manager)</Text>
              <Text style={styles.serviceHeroSub}>شوگر، بلڈ پریشر و ماہانہ میڈیکل سٹاک</Text>
            </View>
          </View>

          <View style={styles.pillListWrap}>
            <View style={styles.pillItemRow}>
              <Ionicons name="flask-outline" size={18} color="#FB7185" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pillItemName}>Glucophage 500mg</Text>
                <Text style={styles.pillItemMeta}>والد صاحب • صبح و شام</Text>
              </View>
              <Text style={[styles.pillItemDays, { color: '#EF4444' }]}>5 دن باقی</Text>
            </View>

            <View style={styles.pillItemRow}>
              <Ionicons name="heart-circle-outline" size={18} color="#FB7185" />
              <View style={{ flex: 1 }}>
                <Text style={styles.pillItemName}>Concor 2.5mg</Text>
                <Text style={styles.pillItemMeta}>والدہ صاحبہ • روزانہ صبح</Text>
              </View>
              <Text style={[styles.pillItemDays, { color: '#10B981' }]}>18 دن باقی</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#FB7185' }]}
            onPress={onClose}
          >
            <Ionicons name="cart-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>میڈیسن ری فل آرڈر لسٹ</Text>
          </TouchableOpacity>
        </View>
      );

    case 'DomesticHelpSalaryModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(14, 165, 233, 0.15)' }]}>
              <Ionicons name="person" size={32} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>ملازمہ و اسٹاف تنخواہ (Salary Log)</Text>
              <Text style={styles.serviceHeroSub}>گھریلو ہیلپ، ڈرائیور، ادھار اور چھٹیوں کا حساب</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>نسیم بی بی (صفائی)</Text>
              <Text style={[styles.statValue, { color: '#38BDF8' }]}>Rs. 14,000</Text>
              <Text style={styles.statSub}>ایڈوانس: Rs. 2,000</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>چھٹیاں (Leaves)</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>1 دن</Text>
              <Text style={styles.statSub}>باقی تنخواہ: Rs. 12,000</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#38BDF8' }]}
            onPress={onClose}
          >
            <Ionicons name="cash-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>تنخواہ ادا کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'ZakatFitranaModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(20, 184, 166, 0.15)' }]}>
              <Ionicons name="heart" size={32} color="#2DD4BF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>زکوٰۃ و فطرانہ کیلکولیٹر (Zakat & Charity)</Text>
              <Text style={styles.serviceHeroSub}>سونے و چاندی کے نصاب کے مطابق 2.5% حساب</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>قابلِ زکوٰۃ اثاثے</Text>
              <Text style={[styles.statValue, { color: '#2DD4BF' }]}>Rs. 850,000</Text>
              <Text style={styles.statSub}>نقد رقم + سونا</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>سالانہ زکوٰۃ (2.5%)</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>Rs. 21,250</Text>
              <Text style={styles.statSub}>ادائیگی واجب ہے</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#2DD4BF' }]}
            onPress={onClose}
          >
            <Ionicons name="calculator-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>زکوٰۃ تفصیلات ایڈٹ کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'VehicleMaintenanceModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
              <Ionicons name="car" size={32} color="#FB923C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>گاڑی و موٹرسائیکل فیول (Vehicle Care)</Text>
              <Text style={styles.serviceHeroSub}>آئل چینج، ٹیوننگ اور ماہانہ پیٹرول خرچہ</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>پچھلا آئل چینج</Text>
              <Text style={[styles.statValue, { color: '#FB923C' }]}>4,200 KM</Text>
              <Text style={styles.statSub}>اگلا آئل: 5,000 KM</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>رواں ماہ پیٹرول</Text>
              <Text style={[styles.statValue, { color: '#F8FAFC' }]}>Rs. 18,500</Text>
              <Text style={styles.statSub}>65 لیٹرز</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#FB923C' }]}
            onPress={onClose}
          >
            <Ionicons name="speedometer-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>فیول لاگ شامل کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'HouseholdMoreSheet':
      return (
        <View style={styles.modalContentCard}>
          <Text style={styles.serviceHeroTitle}>مزید گھریلو سہولیات (More Features)</Text>
          <Text style={styles.serviceHeroSub}>اضافی رجسٹرز اور خاندانی ریکارڈ</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {[
              { title: 'نیوندرا رجسٹر (Shadi Niyondra / Salami)', icon: 'gift-outline' },
              { title: 'پانی کا ٹینکر رجسٹر (Water Tanker)', icon: 'water-outline' },
              { title: 'لانڈری و استری کھاتہ (Dhobi Ledger)', icon: 'shirt-outline' },
              { title: 'سالانہ قربانی حصہ دار کھاتہ (Qurbani Pool)', icon: 'ribbon-outline' },
            ].map((f, i) => (
              <View key={i} style={styles.miniToolItem}>
                <Ionicons name={f.icon as any} size={18} color="#38BDF8" />
                <Text style={styles.miniToolText}>{f.title}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    // ================= STUDENT MODALS =================
    case 'RoommateSplitterModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Ionicons name="pie-chart" size={32} color="#818CF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>کمرہ و بل تقسیم (Roommate Splitter)</Text>
              <Text style={styles.serviceHeroSub}>فلیٹ کا کرایہ، وائی فائی اور گروسری بل</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>کل فلیٹ خرچ (Oct)</Text>
              <Text style={[styles.statValue, { color: '#818CF8' }]}>Rs. 36,000</Text>
              <Text style={styles.statSub}>3 روم میٹس</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>آپ کا حصہ (Your Share)</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>Rs. 12,000</Text>
              <Text style={styles.statSub}>ادائیگی: پیڈ (Cleared)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#818CF8' }]}
            onPress={onClose}
          >
            <Ionicons name="add-circle-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>نیا بل اسپلٹ درج کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'HostelMessKhataModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="cafe" size={32} color="#FBBF24" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>ڈھابہ و میس کھاتہ (Mess & Chai Khata)</Text>
              <Text style={styles.serviceHeroSub}>ہاسٹل میس، چائے پراٹھا اور ادھار رجسٹر</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>میس واجب الادا</Text>
              <Text style={[styles.statValue, { color: '#FBBF24' }]}>Rs. 6,400</Text>
              <Text style={styles.statSub}>24 دن کھایا</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>شفیق چائے والا</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>Rs. 1,150</Text>
              <Text style={styles.statSub}>23 چائے ادھار</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#FBBF24' }]}
            onPress={onClose}
          >
            <Ionicons name="receipt-outline" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>کھاتہ صاف کریں (Pay Due)</Text>
          </TouchableOpacity>
        </View>
      );

    case 'AllowanceRunwayModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="hourglass" size={32} color="#34D399" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>پاکٹ منی رن وے (Allowance Runway)</Text>
              <Text style={styles.serviceHeroSub}>
                ماہانہ الاؤنس کب تک چلے گا اور یومیہ سیف خرچ
              </Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>باقی رقم (Remaining)</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>Rs. 16,800</Text>
              <Text style={styles.statSub}>18 دن محفوظ (Safe)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>یومیہ سیف حد (Daily Limit)</Text>
              <Text style={[styles.statValue, { color: '#38BDF8' }]}>Rs. 933 / دن</Text>
              <Text style={styles.statSub}>خرچ قابو میں ہے</Text>
            </View>
          </View>

          <View style={styles.infoActionStrip}>
            <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            <Text style={styles.infoActionText}>
              سبز سگنل: آپ اپنے یومیہ بجٹ سے 15% کم خرچ کر رہے ہیں۔
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#34D399' }]}
            onPress={onClose}
          >
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>آج کا خرچ درج کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'ExamChallanFeeModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="document-text" size={32} color="#60A5FA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>سیمسٹر و چالان فیس (Fee Challans)</Text>
              <Text style={styles.serviceHeroSub}>ٹیوشن، ہاسٹل چالان اور امتحانی فیس</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>مڈٹرم فیس چالان</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>Rs. 12,500</Text>
              <Text style={styles.statSub}>آخری تاریخ: 28 اکتوبر</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>سیمسٹر فیس (Installment)</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>Rs. 75,000</Text>
              <Text style={styles.statSub}>ادا شدہ (Paid)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#60A5FA' }]}
            onPress={onClose}
          >
            <Ionicons name="checkmark-done" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>چالان تصدیق و رسید محفوظ کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'StudentBikeTrackerModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <Ionicons name="bicycle" size={32} color="#22D3EE" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>موٹرسائیکل فیول ٹریکر (70cc Mileage)</Text>
              <Text style={styles.serviceHeroSub}>یونیورسٹی آمد و رفت، مائلیج اور پیٹرول لاگ</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>اوسط مائلیج (Average)</Text>
              <Text style={[styles.statValue, { color: '#22D3EE' }]}>46 KM/L</Text>
              <Text style={styles.statSub}>Honda CD 70</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ہفتہ وار فیول</Text>
              <Text style={[styles.statValue, { color: '#F8FAFC' }]}>Rs. 1,400</Text>
              <Text style={styles.statSub}>5 لیٹر پیٹرول</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#22D3EE' }]}
            onPress={onClose}
          >
            <Ionicons name="water" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>پیٹرول اندراج کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'EventPartyPoolModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
              <Ionicons name="gift" size={32} color="#F472B6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>پارٹی و پول فنڈ (Birthday / Pool Fund)</Text>
              <Text style={styles.serviceHeroSub}>کلاس برتھ ڈے ٹریٹ، فیئر ویل اور بی بی کیو پول</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>بیچ ٹور فنڈ (Kallar Kahar)</Text>
              <Text style={[styles.statValue, { color: '#F472B6' }]}>Rs. 24,000</Text>
              <Text style={styles.statSub}>8 ممبرز چندہ</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>فی کس حصہ (Per Head)</Text>
              <Text style={[styles.statValue, { color: '#34D399' }]}>Rs. 3,000</Text>
              <Text style={styles.statSub}>جمع ہو چکا ہے</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#F472B6' }]}
            onPress={onClose}
          >
            <Ionicons name="people" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>چندہ اندراج کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'FastFoodEntertainmentModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
              <Ionicons name="fast-food" size={32} color="#FB923C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>کیفے و ہینگ آؤٹ (Dining & Fun)</Text>
              <Text style={styles.serviceHeroSub}>برگر، پیزا، مووی اور دوستوں کے ساتھ ٹریٹ</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ماہانہ کیفے بجٹ</Text>
              <Text style={[styles.statValue, { color: '#FB923C' }]}>Rs. 5,000</Text>
              <Text style={styles.statSub}>مختص رقم</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>اب تک خرچ ہوا</Text>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>Rs. 3,850</Text>
              <Text style={styles.statSub}>باقی: Rs. 1,150</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#FB923C' }]}
            onPress={onClose}
          >
            <Ionicons name="pizza" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>کیفے خرچہ لاگ کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'StudentIncomeModal':
      return (
        <View style={styles.modalContentCard}>
          <View style={styles.serviceHeroIconRow}>
            <View style={[styles.serviceHeroIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="cash" size={32} color="#4ADE80" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceHeroTitle}>پارٹ ٹائم آمدن (Gigs & Tuition)</Text>
              <Text style={styles.serviceHeroSub}>ٹیوشن فیس، فری لانسنگ اور پارٹ ٹائم آمدنی</Text>
            </View>
          </View>

          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ہوم ٹیوشن (Metric)</Text>
              <Text style={[styles.statValue, { color: '#4ADE80' }]}>Rs. 15,000</Text>
              <Text style={styles.statSub}>وصولی: 5 تاریخ</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>فری لانسنگ گگز</Text>
              <Text style={[styles.statValue, { color: '#38BDF8' }]}>Rs. 22,500</Text>
              <Text style={styles.statSub}>Upwork / Direct</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.modalPrimaryBtn, { backgroundColor: '#4ADE80' }]}
            onPress={onClose}
          >
            <Ionicons name="wallet" size={18} color="#0F172A" />
            <Text style={styles.modalPrimaryBtnText}>آمدن کا اندراج کریں</Text>
          </TouchableOpacity>
        </View>
      );

    case 'StudentMoreSheet':
      return (
        <View style={styles.modalContentCard}>
          <Text style={styles.serviceHeroTitle}>مزید اسٹوڈنٹ ٹولز (More Student Tools)</Text>
          <Text style={styles.serviceHeroSub}>ہاسٹل اور کیمپس کے متفرق ضروری ٹولز</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            {[
              { title: 'ہاسٹل لانڈری ٹریکر (Dhobi Counter)', icon: 'shirt-outline' },
              { title: 'لائبریری کتب و جرمانہ (Library Books)', icon: 'book-outline' },
              { title: 'جم ممبرشپ لاگ (Gym Fee & Attendance)', icon: 'barbell-outline' },
              { title: 'انٹرنیٹ و وائی فائی پول (Hostel WiFi Share)', icon: 'wifi-outline' },
            ].map((f, i) => (
              <View key={i} style={styles.miniToolItem}>
                <Ionicons name={f.icon as any} size={18} color="#818CF8" />
                <Text style={styles.miniToolText}>{f.title}</Text>
              </View>
            ))}
          </View>
        </View>
      );

    default:
      return (
        <View style={styles.modalContentCard}>
          <Text style={styles.serviceHeroTitle}>سروس منتخب کی گئی</Text>
          <Text style={styles.serviceHeroSub}>یہ فیچر جلد آن لائن کھاتے کے ساتھ منسلک ہو رہا ہے۔</Text>
          <TouchableOpacity style={styles.modalPrimaryBtn} onPress={onClose}>
            <Text style={styles.modalPrimaryBtnText}>بند کریں</Text>
          </TouchableOpacity>
        </View>
      );
  }
}

// ================= STYLESHEET (JAZZCASH & DUKANDAR POS AESTHETIC) =================
const styles = StyleSheet.create({
  rootContainer: {
    width: '100%',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#020617', // bg-slate-950
    borderWidth: 1,
    borderColor: '#1E293B',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },

  // 1. Top Identity & Balance Deck
  topIdentityBanner: {
    backgroundColor: '#160B0E', // Deep burgundy / red-950 tone
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    position: 'relative',
  },
  jazzAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#EF4444', // Jazz Cash red accent
  },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#991B1B', // Red-800
    borderWidth: 1.5,
    borderColor: '#F87171',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E', // Green connectivity
    borderWidth: 2,
    borderColor: '#160B0E',
  },
  nameWrap: {
    flex: 1,
  },
  displayName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  personaSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  monthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  monthBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceInfoCol: {
    flex: 1,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  eyeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  eyeToggleText: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },

  // 2. Dual-Card Selection Deck
  dualDeckContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  personaCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  personaCardHouseholdActive: {
    backgroundColor: '#0F172A',
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  personaCardStudentActive: {
    backgroundColor: '#0F172A',
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  personaCardInactive: {
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderColor: '#1E293B',
    opacity: 0.65,
  },
  personaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  personaIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCheckPill: {
    padding: 2,
  },
  personaTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  personaTitleActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  personaSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },

  // 3. Dynamic 3x3 Service Grid Matrix
  matrixWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  matrixSectionTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: 'bold',
  },
  matrixCounterText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.8)',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    padding: 12,
  },
  gridTile: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '32%',
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.8)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  contextPillWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  contextPillText: {
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  tileIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tileTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    width: '100%',
  },
  tileUrdu: {
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
    width: '100%',
  },

  // 4. Modal / Bottom Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
    marginBottom: 14,
  },
  sheetHeaderInfo: {
    flex: 1,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  sheetSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  sheetCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  sheetScroll: {
    maxHeight: 460,
  },
  modalContentCard: {
    paddingTop: 6,
  },
  serviceHeroIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  serviceHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceHeroTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  serviceHeroSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  statBoxRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
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
  infoActionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: 10,
    marginBottom: 16,
  },
  infoActionText: {
    color: '#34D399',
    fontSize: 11,
    flex: 1,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBBF24',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  modalPrimaryBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pillListWrap: {
    gap: 8,
    marginBottom: 16,
  },
  pillItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pillItemName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillItemMeta: {
    color: '#94A3B8',
    fontSize: 10,
  },
  pillItemDays: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  miniToolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  miniToolText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
});
