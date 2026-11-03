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
  Linking,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  seasonalMaintenanceApi,
  ISeasonalDashboardData,
  IHouseholdAppliance,
  ITechnicianContact,
  IActiveWarrantyItem,
  ApplianceCategory,
  MaintenanceSeason,
  TechnicianTrade,
  IReplacedPart,
} from '../api/seasonalMaintenance.api';
import { householdVaultApi, IVaultAccount } from '../api/householdVault.api';

interface SeasonalHomeRepairModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

type MainTab = 'RADAR' | 'PORTFOLIO' | 'LOG_JOB' | 'KARIGARS';

const CATEGORY_META: Record<
  ApplianceCategory,
  { labelUrdu: string; labelEn: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  AC_INVERTER: {
    labelUrdu: 'ایئر کنڈیشنر انورٹر',
    labelEn: 'Inverter AC',
    icon: 'snow-outline',
    color: '#38BDF8',
  },
  GEYSER_GAS_ELECTRIC: {
    labelUrdu: 'گیزر و واٹر ہیٹر',
    labelEn: 'Gas/Electric Geyser',
    icon: 'flame-outline',
    color: '#F59E0B',
  },
  UPS_BATTERY: {
    labelUrdu: 'یو پی ایس و بیٹری',
    labelEn: 'UPS & Battery',
    icon: 'battery-charging-outline',
    color: '#10B981',
  },
  WATER_MOTOR_PUMP: {
    labelUrdu: 'پانی کی موٹر و ڈونکی پمپ',
    labelEn: 'Water Pump & Motor',
    icon: 'water-outline',
    color: '#06B6D4',
  },
  SOLAR_SYSTEM: {
    labelUrdu: 'سولر پینلز و انورٹر',
    labelEn: 'Solar Panels & Inverter',
    icon: 'sunny-outline',
    color: '#FBBF24',
  },
  REFRIGERATOR_FREEZER: {
    labelUrdu: 'فریج و ڈیپ فریزر',
    labelEn: 'Fridge & Freezer',
    icon: 'cube-outline',
    color: '#A855F7',
  },
  WASHING_MACHINE: {
    labelUrdu: 'واشنگ مشین و ڈرائر',
    labelEn: 'Washing Machine',
    icon: 'shirt-outline',
    color: '#EC4899',
  },
  GENERATOR: {
    labelUrdu: 'جنریٹر',
    labelEn: 'Generator',
    icon: 'hardware-chip-outline',
    color: '#EF4444',
  },
  ELECTRONICS: {
    labelUrdu: 'الیکٹرانکس',
    labelEn: 'Electronics',
    icon: 'tv-outline',
    color: '#6366F1',
  },
  APPLIANCE: {
    labelUrdu: 'گھریلو مشینری',
    labelEn: 'Home Appliance',
    icon: 'construct-outline',
    color: '#14B8A6',
  },
  FURNITURE: {
    labelUrdu: 'فرنیچر',
    labelEn: 'Furniture',
    icon: 'home-outline',
    color: '#84CC16',
  },
  VEHICLE: {
    labelUrdu: 'گاڑی / بائیک',
    labelEn: 'Vehicle',
    icon: 'car-outline',
    color: '#F97316',
  },
  OTHER: {
    labelUrdu: 'دیگر سامان',
    labelEn: 'Other Equipment',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#94A3B8',
  },
};

const TRADE_META: Record<TechnicianTrade, { labelUrdu: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  AC_TECHNICIAN: { labelUrdu: 'AC ماسٹر و کولنگ', icon: 'snow-outline', color: '#38BDF8' },
  PLUMBER: { labelUrdu: 'پلمبر و گیزر اسپیشلسٹ', icon: 'water-outline', color: '#06B6D4' },
  ELECTRICIAN: { labelUrdu: 'الیکٹریشن و وائرنگ', icon: 'flash-outline', color: '#F59E0B' },
  MOTOR_WINDER: { labelUrdu: 'موٹر وائنڈر و مکینک', icon: 'build-outline', color: '#EC4899' },
  SOLAR_TECH: { labelUrdu: 'سولر انجینئر', icon: 'sunny-outline', color: '#FBBF24' },
  GENERAL: { labelUrdu: 'جنرل مستری', icon: 'construct-outline', color: '#94A3B8' },
};

export const SeasonalHomeRepairModal: React.FC<SeasonalHomeRepairModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<MainTab>('RADAR');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<ISeasonalDashboardData | null>(null);
  const [appliances, setAppliances] = useState<IHouseholdAppliance[]>([]);
  const [technicians, setTechnicians] = useState<ITechnicianContact[]>([]);
  const [activeWarranties, setActiveWarranties] = useState<IActiveWarrantyItem[]>([]);
  const [vaultAccounts, setVaultAccounts] = useState<IVaultAccount[]>([]);

  // Add Appliance Form State
  const [showAddApplianceModal, setShowAddApplianceModal] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');
  const [newCategory, setNewCategory] = useState<ApplianceCategory>('AC_INVERTER');
  const [newRoomLocation, setNewRoomLocation] = useState('');
  const [newBrandModel, setNewBrandModel] = useState('');
  const [newPurchasePrice, setNewPurchasePrice] = useState('');
  const [newPreSeasonMonth, setNewPreSeasonMonth] = useState('4');
  const [newServiceInterval, setNewServiceInterval] = useState('180');
  const [savingAppliance, setSavingAppliance] = useState(false);

  // Log Job Form State
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobCost, setJobCost] = useState('');
  const [jobSeasonType, setJobSeasonType] = useState<MaintenanceSeason>('PRE_SUMMER_AC');
  const [jobTechName, setJobTechName] = useState('');
  const [jobTechPhone, setJobTechPhone] = useState('');
  const [jobTechTrade, setJobTechTrade] = useState<TechnicianTrade>('AC_TECHNICIAN');
  const [deductFromVault, setDeductFromVault] = useState(true);
  const [selectedVaultId, setSelectedVaultId] = useState<string>('');
  const [savingJob, setSavingJob] = useState(false);

  // Replaced Parts state in Job
  const [newPartName, setNewPartName] = useState('');
  const [newPartCost, setNewPartCost] = useState('');
  const [newPartWarrantyMonths, setNewPartWarrantyMonths] = useState('');
  const [newPartShop, setNewPartShop] = useState('');
  const [partsList, setPartsList] = useState<IReplacedPart[]>([]);

  // Load Data
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [dash, apps, techs, warps, vaultOverview] = await Promise.all([
        seasonalMaintenanceApi.getDashboard().catch(() => null),
        seasonalMaintenanceApi.getAppliances().catch(() => []),
        seasonalMaintenanceApi.getTechnicianDirectory().catch(() => []),
        seasonalMaintenanceApi.getActiveWarranties().catch(() => []),
        householdVaultApi.getOverview().catch(() => null),
      ]);

      if (dash) setDashboardData(dash);
      if (apps) {
        setAppliances(apps);
        if (apps.length > 0 && !selectedAssetId) {
          setSelectedAssetId(apps[0]._id);
        }
      }
      if (techs) setTechnicians(techs);
      if (warps) setActiveWarranties(warps);
      if (vaultOverview && vaultOverview.vaultAccounts && vaultOverview.vaultAccounts.length > 0) {
        setVaultAccounts(vaultOverview.vaultAccounts);
        if (!selectedVaultId) setSelectedVaultId(vaultOverview.vaultAccounts[0].id);
      }
    } catch (err: any) {
      console.error('[SeasonalHomeRepair] Error loading data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAssetId, selectedVaultId]);

  useEffect(() => {
    if (visible) {
      loadAllData();
    }
  }, [visible, loadAllData]);

  // Quick 1-Tap Call
  const handleCallTechnician = (phone: string) => {
    if (!phone) {
      Alert.alert('فون نمبر غائب', 'اس کاریگر کا رابطہ نمبر موجود نہیں ہے۔');
      return;
    }
    const clean = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('کال کی خرابی', 'براہِ کرم ڈیوائس کا ڈائلر چیک کریں۔');
    });
  };

  // Quick 1-Tap WhatsApp
  const handleWhatsAppTechnician = (phone: string, techName: string) => {
    if (!phone) {
      Alert.alert('فون نمبر غائب', 'اس کاریگر کا رابطہ نمبر موجود نہیں ہے۔');
      return;
    }
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '92' + clean.slice(1);

    const message = encodeURIComponent(
      `السلام علیکم ${techName || 'استاد جی'}!\nمیں ڈیجی حساب ایپ سے گھریلو مرمت و سروسنگ کے سلسلے میں رابطہ کر رہا ہوں۔ کیا آپ دستیاب ہیں؟`
    );

    Linking.openURL(`whatsapp://send?phone=${clean}&text=${message}`).catch(() => {
      Linking.openURL(`https://wa.me/${clean}?text=${message}`).catch(() => {
        Alert.alert('واٹس ایپ کی خرابی', 'واٹس ایپ ایپلیکیشن کھولنے میں دشواری پیش آئی۔');
      });
    });
  };

  // Quick 1-Tap UPS Water Refilled
  const handleQuickUPSWaterRefilled = async () => {
    const ups = appliances.find((a) => a.category === 'UPS_BATTERY');
    if (!ups) {
      Alert.alert('یو پی ایس موجود نہیں', 'سامان کی فہرست میں پہلے یو پی ایس بیٹری شامل کریں۔');
      return;
    }

    try {
      setLoading(true);
      await seasonalMaintenanceApi.logMaintenanceJob({
        assetId: ups._id,
        maintenanceType: 'ELECTRICAL',
        seasonType: 'UPS_BATTERY_CYCLE',
        description: 'بیٹری سیلز میں مقطر پانی (Distilled Water) کا لیول چیک و ری فل کیا گیا۔',
        cost: 250, // Typical bottle cost
        technicianName: 'میں خود (Self Refill)',
        technicianTrade: 'ELECTRICIAN',
        syncToLedger: false,
      });

      Alert.alert(
        '✅ مقطر پانی ری فل ہو گیا',
        'یو پی ایس بیٹری کا شیڈول کامیابی کے ساتھ ری سیٹ کر دیا گیا ہے۔ اگلی سروس 45 دن بعد شیڈول ہے۔'
      );
      loadAllData();
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'لاگ درج نہ ہو سکا');
    } finally {
      setLoading(false);
    }
  };

  // Add Part to Job List
  const handleAddPart = () => {
    if (!newPartName.trim()) {
      Alert.alert('نام درکار ہے', 'تبدیل شدہ اسپیئر پارٹ کا نام درج کریں۔');
      return;
    }
    const costNum = Number(newPartCost) || 0;
    const monthsNum = Number(newPartWarrantyMonths) || 0;

    setPartsList((prev) => [
      ...prev,
      {
        partName: newPartName.trim(),
        cost: costNum,
        warrantyMonths: monthsNum,
        vendorShopName: newPartShop.trim() || 'لوکل دکان',
      },
    ]);

    setNewPartName('');
    setNewPartCost('');
    setNewPartWarrantyMonths('');
    setNewPartShop('');
  };

  // Remove Part from Job List
  const handleRemovePart = (index: number) => {
    setPartsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Job
  const handleSubmitJob = async () => {
    if (!selectedAssetId) {
      Alert.alert('سامان منتخب کریں', 'براہِ کرم وہ سامان منتخب کریں جس کی مرمت یا سروسنگ ہوئی ہے۔');
      return;
    }
    if (!jobDescription.trim()) {
      Alert.alert('تفصیل درکار ہے', 'کام کی مختصر تفصیل درج کریں (مثلاً: کیمیکل واش، گیس ٹاپ اپ)۔');
      return;
    }
    const costNum = Number(jobCost);
    if (isNaN(costNum) || costNum < 0) {
      Alert.alert('لاگت درکار ہے', 'مرمت یا سروس کی درست لاگت (PKR) درج کریں۔');
      return;
    }

    try {
      setSavingJob(true);
      await seasonalMaintenanceApi.logMaintenanceJob({
        assetId: selectedAssetId,
        maintenanceType:
          jobSeasonType === 'PRE_SUMMER_AC'
            ? 'HVAC_AC'
            : jobSeasonType === 'PRE_WINTER_GEYSER'
            ? 'PLUMBING'
            : jobSeasonType === 'UPS_BATTERY_CYCLE'
            ? 'ELECTRICAL'
            : 'GENERAL_REPAIR',
        seasonType: jobSeasonType,
        description: jobDescription.trim(),
        cost: costNum,
        technicianName: jobTechName.trim() || undefined,
        technicianPhone: jobTechPhone.trim() || undefined,
        technicianTrade: jobTechTrade,
        partsReplaced: partsList,
        vaultAccountId: deductFromVault ? selectedVaultId || undefined : undefined,
        sinkingFundBucket: 'Home & Vehicle Sinking Reserve',
        syncToLedger: deductFromVault,
      });

      Alert.alert('✅ سروس لاگ محفوظ ہو گیا', 'مرمت کا لاگ اور وارنٹی کامیابی سے رجسٹرڈ ہو گئی ہے۔');

      // Reset Form
      setJobDescription('');
      setJobCost('');
      setJobTechName('');
      setJobTechPhone('');
      setPartsList([]);
      setActiveTab('RADAR');
      loadAllData();
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'سروس لاگ محفوظ نہ ہو سکا');
    } finally {
      setSavingJob(false);
    }
  };

  // Add Appliance
  const handleAddAppliance = async () => {
    if (!newAssetName.trim()) {
      Alert.alert('نام درکار ہے', 'سامان کا نام درج کریں (مثلاً: Dawlance 1.5 Ton AC)۔');
      return;
    }

    try {
      setSavingAppliance(true);
      await seasonalMaintenanceApi.createAppliance({
        assetName: newAssetName.trim(),
        category: newCategory,
        roomLocation: newRoomLocation.trim() || undefined,
        brandModel: newBrandModel.trim() || undefined,
        purchasePrice: Number(newPurchasePrice) || 0,
        preSeasonReminderMonth: Number(newPreSeasonMonth) || 4,
        serviceIntervalDays: Number(newServiceInterval) || 180,
      });

      Alert.alert('✅ نیا سامان شامل ہو گیا', `${newAssetName} گھریلو پورٹ فولیو میں شامل کر دیا گیا ہے۔`);
      setShowAddApplianceModal(false);
      setNewAssetName('');
      setNewRoomLocation('');
      setNewBrandModel('');
      setNewPurchasePrice('');
      loadAllData();
    } catch (err: any) {
      Alert.alert('خرابی', err.message || 'سامان شامل نہ ہو سکا');
    } finally {
      setSavingAppliance(false);
    }
  };

  // Share Service Slip
  const handleShareServiceSlip = async (applianceName: string, desc: string, cost: number, tech: string) => {
    try {
      const slip = `🔧 *ڈیجی حساب — گھریلو سروسنگ و مرمت سلپ*\n━━━━━━━━━━━━━━━━━━\n📦 *سامان:* ${applianceName}\n🛠️ *کام کی تفصیل:* ${desc}\n💰 *کل لاگت:* Rs. ${cost.toLocaleString()}\n👨‍🔧 *کاریگر / مستری:* ${tech || 'لوکل مستری'}\n📅 *تاریخ:* ${new Date().toLocaleDateString('ur-PK')}\n━━━━━━━━━━━━━━━━━━\n_ڈیجی حساب: پاکستان کا مستند گھریلو کھاتہ_`;
      await Share.share({ message: slip });
    } catch (err) {
      console.error(err);
    }
  };

  const wave = dashboardData?.seasonalWave;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* ================= 1. HEADER ================= */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#CBD5E1" />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitleUrdu}>گھر کی مرمت اور سروسنگ کھاتہ</Text>
            <Text style={styles.headerSubtitleEn}>Seasonal Appliance Servicing & Home Repair</Text>
          </View>

          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadAllData}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#00d49f" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color="#00d49f" />
            )}
          </TouchableOpacity>
        </View>

        {/* ================= 2. SINKING FUND & EXPENSE STRIP ================= */}
        <View style={styles.sinkingFundStrip}>
          <View style={styles.sinkingFundItem}>
            <Ionicons name="shield-checkmark" size={16} color="#00d49f" />
            <Text style={styles.sinkingFundLabel}>مرمت محفوظ فنڈ:</Text>
            <Text style={styles.sinkingFundVal}>
              Rs. {(dashboardData?.summary.sinkingFundReserve || 35000).toLocaleString()}
            </Text>
          </View>
          <View style={styles.dividerV} />
          <View style={styles.sinkingFundItem}>
            <Ionicons name="receipt-outline" size={16} color="#FB7185" />
            <Text style={styles.sinkingFundLabel}>رواں ماہ خرچ:</Text>
            <Text style={[styles.sinkingFundVal, { color: '#FB7185' }]}>
              Rs. {(dashboardData?.summary.currentMonthSpend || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* ================= 3. NAVIGATION TABS ================= */}
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'RADAR' && styles.tabBtnActive]}
            onPress={() => setActiveTab('RADAR')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="compass-outline"
              size={15}
              color={activeTab === 'RADAR' ? '#00d49f' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'RADAR' && styles.tabBtnTextActive]}>
              موسمی الرٹس
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'PORTFOLIO' && styles.tabBtnActive]}
            onPress={() => setActiveTab('PORTFOLIO')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cube-outline"
              size={15}
              color={activeTab === 'PORTFOLIO' ? '#00d49f' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'PORTFOLIO' && styles.tabBtnTextActive]}>
              گھریلو سامان ({appliances.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'LOG_JOB' && styles.tabBtnActive]}
            onPress={() => setActiveTab('LOG_JOB')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add-circle-outline"
              size={15}
              color={activeTab === 'LOG_JOB' ? '#00d49f' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'LOG_JOB' && styles.tabBtnTextActive]}>
              + سروس لاگ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'KARIGARS' && styles.tabBtnActive]}
            onPress={() => setActiveTab('KARIGARS')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people-outline"
              size={15}
              color={activeTab === 'KARIGARS' ? '#00d49f' : '#94A3B8'}
            />
            <Text style={[styles.tabBtnText, activeTab === 'KARIGARS' && styles.tabBtnTextActive]}>
              ماہر کاریگر
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= 4. MAIN CONTENT AREA ================= */}
        {loading && !dashboardData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00d49f" />
            <Text style={styles.loadingText}>گھریلو سروس و سامان لوڈ ہو رہا ہے...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 20 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ================= TAB 1: SEASONAL RADAR ================= */}
            {activeTab === 'RADAR' && (
              <View style={{ gap: 14 }}>
                {/* A. Active Seasonal Wave Banner */}
                {wave && (
                  <View
                    style={[
                      styles.waveCard,
                      { borderColor: wave.accentColor, backgroundColor: `${wave.accentColor}12` },
                    ]}
                  >
                    <View style={styles.waveHeader}>
                      <View
                        style={[styles.waveIconCircle, { backgroundColor: `${wave.accentColor}25` }]}
                      >
                        <Ionicons
                          name={
                            wave.seasonKey === 'PRE_SUMMER_AC'
                              ? 'snow'
                              : wave.seasonKey === 'PRE_WINTER_GEYSER'
                              ? 'flame'
                              : 'water'
                          }
                          size={24}
                          color={wave.accentColor}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.waveUrduTitle, { color: wave.accentColor }]}>
                            {wave.titleUrdu}
                          </Text>
                          <View
                            style={[styles.urgencyBadge, { backgroundColor: `${wave.accentColor}20` }]}
                          >
                            <Text style={[styles.urgencyText, { color: wave.accentColor }]}>
                              {wave.urgency === 'URGENT' ? '🚨 فوری ضرورت' : '⚠️ پیشگی اطلاع'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.waveEnTitle}>{wave.titleEnglish}</Text>
                      </View>
                    </View>

                    <Text style={styles.waveDescription}>{wave.descriptionUrdu}</Text>

                    <View style={styles.waveActionRow}>
                      <TouchableOpacity
                        style={[styles.waveActionBtn, { backgroundColor: wave.accentColor }]}
                        onPress={() => {
                          setJobSeasonType(wave.seasonKey);
                          setActiveTab('LOG_JOB');
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="construct" size={15} color="#070d18" />
                        <Text style={styles.waveActionBtnText}>سروس لاگ درج کریں</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.waveCallBtn}
                        onPress={() => setActiveTab('KARIGARS')}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="call-outline" size={15} color="#00d49f" />
                        <Text style={styles.waveCallBtnText}>کاریگر تلاش کریں</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* B. UPS Battery 45-Day Radar Card */}
                {dashboardData?.upsStatus && (
                  <View style={styles.upsCard}>
                    <View style={styles.upsCardHeader}>
                      <View style={styles.upsIconBox}>
                        <Ionicons name="battery-charging" size={22} color="#10B981" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.upsTitle}>45-Day UPS Battery Water Radar</Text>
                        <Text style={styles.upsSubtitle}>
                          {dashboardData.upsStatus.assetName}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.upsCountdownPill,
                          dashboardData.upsStatus.isDue && {
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            borderColor: '#EF4444',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.upsCountdownText,
                            dashboardData.upsStatus.isDue && { color: '#EF4444' },
                          ]}
                        >
                          {dashboardData.upsStatus.daysRemaining !== null
                            ? dashboardData.upsStatus.daysRemaining <= 0
                              ? '🚨 آج ہی پانی ڈالیں!'
                              : `باقی ${dashboardData.upsStatus.daysRemaining} دن`
                            : 'شیڈول فعال'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.upsDesc}>
                      ٹیوبلر بیٹری میں ہر 45 دن بعد مقطر پانی (Distilled water) کا لیول چیک کرنا ضروری
                      ہے تاکہ Rs. 55,000 کی بیٹری خراب ہونے سے بچ سکے۔
                    </Text>

                    <TouchableOpacity
                      style={styles.upsWaterRefillBtn}
                      onPress={handleQuickUPSWaterRefilled}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#070d18" />
                      <Text style={styles.upsWaterRefillText}>
                        ✅ مقطر پانی بھر دیا (Reset 45-Day Timer)
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* C. Money-Pit Warning Banner */}
                {dashboardData?.summary.moneyPitCount ? (
                  dashboardData.summary.moneyPitCount > 0 && (
                    <View style={styles.moneyPitAlertCard}>
                      <Ionicons name="warning" size={22} color="#EF4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.moneyPitTitle}>
                          ⚠️ الرٹ: {dashboardData.summary.moneyPitCount} گھریلو مشین پر بھاری خرچ
                        </Text>
                        <Text style={styles.moneyPitSub}>
                          ان اشیاء کی مرمت کی لاگت ان کی اصل قیمت کے 50% سے تجاوز کر چکی ہے۔ مزید
                          خرچ کے بجائے نئی خریدنا زیادہ فائدہ مند ہو سکتا ہے۔
                        </Text>
                      </View>
                    </View>
                  )
                ) : null}

                {/* D. Active Parts & Repair Warranties Radar */}
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#00d49f" />
                    <Text style={styles.sectionHeading}>فعال اسپیئر پارٹس وارنٹی کھاتہ</Text>
                  </View>
                  <Text style={styles.sectionBadge}>
                    {dashboardData?.activeWarranties.length || 0} پارٹس زیرِ وارنٹی
                  </Text>
                </View>

                {dashboardData?.activeWarranties && dashboardData.activeWarranties.length > 0 ? (
                  dashboardData.activeWarranties.map((w, idx) => (
                    <View key={idx} style={styles.warrantyCard}>
                      <View style={styles.warrantyTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.warrantyPartName}>{w.partName}</Text>
                          <Text style={styles.warrantyAsset}>{w.assetName}</Text>
                        </View>
                        <View
                          style={[
                            styles.warrantyDaysPill,
                            w.daysRemaining <= 15 && {
                              backgroundColor: 'rgba(245, 158, 11, 0.2)',
                              borderColor: '#F59E0B',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.warrantyDaysText,
                              w.daysRemaining <= 15 && { color: '#F59E0B' },
                            ]}
                          >
                            🛡️ {w.daysRemaining} دن باقی
                          </Text>
                        </View>
                      </View>

                      <View style={styles.warrantyMetaRow}>
                        <Text style={styles.warrantyMeta}>
                          🏪 دکان: <Text style={{ color: '#E2E8F0' }}>{w.vendorShopName}</Text>
                        </Text>
                        <Text style={styles.warrantyMeta}>
                          💰 قیمت: <Text style={{ color: '#00d49f' }}>Rs. {w.cost}</Text>
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>کوئی فعال پارٹس وارنٹی موجود نہیں ہے۔</Text>
                  </View>
                )}
              </View>
            )}

            {/* ================= TAB 2: APPLIANCE PORTFOLIO ================= */}
            {activeTab === 'PORTFOLIO' && (
              <View style={{ gap: 14 }}>
                <View style={styles.portfolioTopRow}>
                  <View>
                    <Text style={styles.sectionHeading}>گھریلو سامان و مشینری پورٹ فولیو</Text>
                    <Text style={styles.sectionSub}>کل {appliances.length} رجسٹرڈ اشیاء</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addApplianceBtn}
                    onPress={() => setShowAddApplianceModal(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#070d18" />
                    <Text style={styles.addApplianceBtnText}>نیا سامان شامل کریں</Text>
                  </TouchableOpacity>
                </View>

                {appliances.map((item) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.APPLIANCE;
                  return (
                    <View
                      key={item._id}
                      style={[
                        styles.applianceCard,
                        item.isMoneyPit && { borderColor: 'rgba(239, 68, 68, 0.5)' },
                      ]}
                    >
                      <View style={styles.applianceCardHeader}>
                        <View
                          style={[styles.applianceIconWrap, { backgroundColor: `${meta.color}20` }]}
                        >
                          <Ionicons name={meta.icon} size={22} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.applianceName}>{item.assetName}</Text>
                          </View>
                          <Text style={styles.applianceLocation}>
                            📍 {item.roomLocation || 'گھر'} • {item.brandModel || meta.labelUrdu}
                          </Text>
                        </View>

                        {item.isMoneyPit && (
                          <View style={styles.moneyPitTag}>
                            <Text style={styles.moneyPitTagText}>⚠️ مرمت لاگت 50% زائد</Text>
                          </View>
                        )}
                      </View>

                      {/* Stat Breakdown Row */}
                      <View style={styles.applianceStatsRow}>
                        <View style={styles.applianceStatCol}>
                          <Text style={styles.applianceStatLabel}>اصل قیمت</Text>
                          <Text style={styles.applianceStatVal}>
                            Rs. {(item.purchasePrice || 0).toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.dividerV} />

                        <View style={styles.applianceStatCol}>
                          <Text style={styles.applianceStatLabel}>مجموعی مرمت</Text>
                          <Text
                            style={[
                              styles.applianceStatVal,
                              item.isMoneyPit ? { color: '#EF4444' } : { color: '#F59E0B' },
                            ]}
                          >
                            Rs. {(item.cumulativeRepairCost || 0).toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.dividerV} />

                        <View style={styles.applianceStatCol}>
                          <Text style={styles.applianceStatLabel}>اگلی سروس</Text>
                          <Text
                            style={[
                              styles.applianceStatVal,
                              item.isDueSoon ? { color: '#EF4444' } : { color: '#00d49f' },
                            ]}
                          >
                            {item.daysRemaining !== null && item.daysRemaining !== undefined
                              ? item.daysRemaining <= 0
                                ? '🚨 واجب الادا'
                                : `${item.daysRemaining} دن باقی`
                              : 'شیڈول فعال'}
                          </Text>
                        </View>
                      </View>

                      {/* Bottom Action Strip */}
                      <View style={styles.applianceCardFooter}>
                        <TouchableOpacity
                          style={styles.applianceServiceBtn}
                          onPress={() => {
                            setSelectedAssetId(item._id);
                            setActiveTab('LOG_JOB');
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="hammer-outline" size={14} color="#00d49f" />
                          <Text style={styles.applianceServiceBtnText}>مرمت لاگ درج کریں</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.applianceDeleteBtn}
                          onPress={() => {
                            Alert.alert(
                              'سامان خارج کریں',
                              `کیا آپ "${item.assetName}" کو پورٹ فولیو سے ہٹانا چاہتے ہیں؟`,
                              [
                                { text: 'منسوخ', style: 'cancel' },
                                {
                                  text: 'ہٹائیں',
                                  style: 'destructive',
                                  onPress: async () => {
                                    await seasonalMaintenanceApi.deleteAppliance(item._id);
                                    loadAllData();
                                  },
                                },
                              ]
                            );
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#FB7185" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* ================= TAB 3: LOG MAINTENANCE JOB ================= */}
            {activeTab === 'LOG_JOB' && (
              <View style={styles.formContainer}>
                <Text style={styles.formSectionTitle}>نئی سروس و مرمت لاگ درج کریں</Text>
                <Text style={styles.formSectionSubtitle}>
                  مرمت کی تفصیل، اسپیئر پارٹس وارنٹی اور والٹ اکاؤنٹ سے ادائیگی کو محفوظ بنائیں
                </Text>

                {/* 1. Appliance Picker */}
                <Text style={styles.inputLabel}>سامان منتخب کریں (Select Appliance):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {appliances.map((app) => (
                      <TouchableOpacity
                        key={app._id}
                        style={[
                          styles.appliancePill,
                          selectedAssetId === app._id && styles.appliancePillActive,
                        ]}
                        onPress={() => setSelectedAssetId(app._id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.appliancePillText,
                            selectedAssetId === app._id && styles.appliancePillTextActive,
                          ]}
                        >
                          {app.assetName}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* 2. Season Type */}
                <Text style={styles.inputLabel}>موسمی لہر یا نوعیت (Season / Type):</Text>
                <View style={styles.seasonTypeRow}>
                  {[
                    { key: 'PRE_SUMMER_AC', label: '☀️ پری سمر AC' },
                    { key: 'PRE_WINTER_GEYSER', label: '❄️ پری ونٹر گیزر' },
                    { key: 'UPS_BATTERY_CYCLE', label: '🔋 UPS پانی' },
                    { key: 'MONSOON_WATER', label: '🌧️ موٹر و پمپ' },
                    { key: 'ROUTINE', label: '🔧 عمومی سروس' },
                  ].map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[
                        styles.seasonPill,
                        jobSeasonType === s.key && styles.seasonPillActive,
                      ]}
                      onPress={() => setJobSeasonType(s.key as MaintenanceSeason)}
                    >
                      <Text
                        style={[
                          styles.seasonPillText,
                          jobSeasonType === s.key && styles.seasonPillTextActive,
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 3. Description & Cost */}
                <Text style={styles.inputLabel}>کام کی تفصیل (Job Scope):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثلاً: اؤٹ ڈور کیمیکل واش، فین موٹر بیئرنگ و گیس چیک"
                  placeholderTextColor="#64748B"
                  value={jobDescription}
                  onChangeText={setJobDescription}
                />

                <Text style={styles.inputLabel}>کل لاگت (Total Cost PKR):</Text>
                <TextInput
                  style={[styles.textInput, { fontSize: 18, color: '#00d49f', fontWeight: 'bold' }]}
                  placeholder="مثلاً: 4500"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={jobCost}
                  onChangeText={setJobCost}
                />

                {/* 4. Technician Details */}
                <Text style={styles.inputLabel}>کاریگر کا نام و رابطہ (Technician Info):</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="استاد کا نام"
                    placeholderTextColor="#64748B"
                    value={jobTechName}
                    onChangeText={setJobTechName}
                  />
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="موبائل نمبر (0300...)"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                    value={jobTechPhone}
                    onChangeText={setJobTechPhone}
                  />
                </View>

                {/* 5. Parts Replaced Subsection */}
                <View style={styles.partsSubSection}>
                  <Text style={styles.subSectionTitle}>🛡️ تبدیل شدہ پارٹس و وارنٹی (Replaced Parts):</Text>

                  {partsList.map((part, pIdx) => (
                    <View key={pIdx} style={styles.partItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.partItemName}>{part.partName}</Text>
                        <Text style={styles.partItemSub}>
                          لاگت: Rs. {part.cost} • وارنٹی: {part.warrantyMonths} ماہ • دکان:{' '}
                          {part.vendorShopName}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemovePart(pIdx)}>
                        <Ionicons name="close-circle" size={18} color="#FB7185" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={{ gap: 6, marginTop: 6 }}>
                    <TextInput
                      style={styles.textInputSmall}
                      placeholder="پارٹ کا نام (مثلاً: 55uF کپیسیٹر)"
                      placeholderTextColor="#64748B"
                      value={newPartName}
                      onChangeText={setNewPartName}
                    />
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        style={[styles.textInputSmall, { flex: 1 }]}
                        placeholder="لاگت PKR"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={newPartCost}
                        onChangeText={setNewPartCost}
                      />
                      <TextInput
                        style={[styles.textInputSmall, { flex: 1 }]}
                        placeholder="وارنٹی (ماہ)"
                        placeholderTextColor="#64748B"
                        keyboardType="numeric"
                        value={newPartWarrantyMonths}
                        onChangeText={setNewPartWarrantyMonths}
                      />
                    </View>
                    <TextInput
                      style={styles.textInputSmall}
                      placeholder="دکان کا نام (اختیاری)"
                      placeholderTextColor="#64748B"
                      value={newPartShop}
                      onChangeText={setNewPartShop}
                    />
                    <TouchableOpacity style={styles.addPartBtn} onPress={handleAddPart}>
                      <Ionicons name="add" size={14} color="#00d49f" />
                      <Text style={styles.addPartBtnText}>+ یہ پارٹ شامل کریں</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 6. Vault & Sinking Fund Deduction */}
                <View style={styles.vaultDeductionBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.vaultDeductTitle}>بینک / کیش والٹ سے رقم وضع کریں</Text>
                      <Text style={styles.vaultDeductSub}>
                        مرمت فنڈ سے کٹوتی اور ڈبل انٹری کیش آؤٹ لاگ
                      </Text>
                    </View>
                    <Switch
                      value={deductFromVault}
                      onValueChange={setDeductFromVault}
                      thumbColor={deductFromVault ? '#00d49f' : '#64748B'}
                      trackColor={{ false: '#17233b', true: 'rgba(0, 212, 159, 0.3)' }}
                    />
                  </View>

                  {deductFromVault && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {vaultAccounts.map((v) => (
                          <TouchableOpacity
                            key={v.id}
                            style={[
                              styles.vaultPill,
                              selectedVaultId === v.id && styles.vaultPillActive,
                            ]}
                            onPress={() => setSelectedVaultId(v.id)}
                          >
                            <Text
                              style={[
                                styles.vaultPillText,
                                selectedVaultId === v.id && styles.vaultPillTextActive,
                              ]}
                            >
                              {v.accountTitle} (Rs. {v.currentBalance.toLocaleString()})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                </View>

                {/* 7. Action Button */}
                <TouchableOpacity
                  style={styles.submitJobBtn}
                  onPress={handleSubmitJob}
                  disabled={savingJob}
                  activeOpacity={0.85}
                >
                  {savingJob ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={18} color="#070d18" />
                      <Text style={styles.submitJobBtnText}>سروس لاگ محفوظ کریں</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ================= TAB 4: TRUSTED KARIGAR DIRECTORY ================= */}
            {activeTab === 'KARIGARS' && (
              <View style={{ gap: 14 }}>
                <View style={styles.portfolioTopRow}>
                  <View>
                    <Text style={styles.sectionHeading}>معتبر کاریگر و مستری ڈائریکٹری</Text>
                    <Text style={styles.sectionSub}>ضرورت کے وقت 1-ٹیپ کال اور واٹس ایپ</Text>
                  </View>
                </View>

                {technicians.map((t, idx) => {
                  const meta = TRADE_META[t.trade] || TRADE_META.GENERAL;
                  return (
                    <View key={idx} style={styles.karigarCard}>
                      <View style={styles.karigarHeader}>
                        <View style={[styles.karigarAvatar, { backgroundColor: `${meta.color}20` }]}>
                          <Ionicons name={meta.icon} size={20} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.karigarName}>{t.name}</Text>
                            {t.isVerified && (
                              <Ionicons name="checkmark-circle" size={15} color="#00d49f" />
                            )}
                          </View>
                          <Text style={styles.karigarTrade}>{meta.labelUrdu}</Text>
                        </View>

                        <Text style={styles.karigarPhone}>{t.phone}</Text>
                      </View>

                      <View style={styles.karigarActionRow}>
                        <TouchableOpacity
                          style={styles.karigarCallBtn}
                          onPress={() => handleCallTechnician(t.phone)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call" size={14} color="#070d18" />
                          <Text style={styles.karigarCallText}>کال کریں</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.karigarWhatsAppBtn}
                          onPress={() => handleWhatsAppTechnician(t.phone, t.name)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
                          <Text style={styles.karigarWhatsAppText}>واٹس ایپ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ================= 5. ADD APPLIANCE IN-MODAL ================= */}
        <Modal
          visible={showAddApplianceModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddApplianceModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addModalCard}>
              <View style={styles.addModalHeader}>
                <Text style={styles.addModalTitle}>نیا سامان رجسٹر کریں</Text>
                <TouchableOpacity onPress={() => setShowAddApplianceModal(false)}>
                  <Ionicons name="close" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>سامان کا نام (Asset Name):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثلاً: Dawlance Inverter AC 1.5 Ton"
                  placeholderTextColor="#64748B"
                  value={newAssetName}
                  onChangeText={setNewAssetName}
                />

                <Text style={styles.inputLabel}>کیٹیگری (Category):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(
                      [
                        'AC_INVERTER',
                        'GEYSER_GAS_ELECTRIC',
                        'UPS_BATTERY',
                        'WATER_MOTOR_PUMP',
                        'SOLAR_SYSTEM',
                        'REFRIGERATOR_FREEZER',
                        'WASHING_MACHINE',
                      ] as ApplianceCategory[]
                    ).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catPill,
                          newCategory === cat && styles.catPillActive,
                        ]}
                        onPress={() => setNewCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.catPillText,
                            newCategory === cat && styles.catPillTextActive,
                          ]}
                        >
                          {CATEGORY_META[cat].labelUrdu}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={styles.inputLabel}>کمرہ / لوکیشن (Location):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثلاً: مین لاؤنج، ماسٹر بیڈ، چھت"
                  placeholderTextColor="#64748B"
                  value={newRoomLocation}
                  onChangeText={setNewRoomLocation}
                />

                <Text style={styles.inputLabel}>برانڈ و ماڈل (Brand / Model):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثلاً: Gree Fairy 18FITH"
                  placeholderTextColor="#64748B"
                  value={newBrandModel}
                  onChangeText={setNewBrandModel}
                />

                <Text style={styles.inputLabel}>اصل قیمت خریداری (Purchase Price PKR):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثلاً: 165000"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={newPurchasePrice}
                  onChangeText={setNewPurchasePrice}
                />

                <Text style={styles.inputLabel}>پری سیزن الرٹ مہینہ (Reminder Month 1-12):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="4 (اپریل AC کے لیے) یا 10 (اکتوبر گیزر کے لیے)"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={newPreSeasonMonth}
                  onChangeText={setNewPreSeasonMonth}
                />
              </ScrollView>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddAppliance}
                disabled={savingAppliance}
              >
                {savingAppliance ? (
                  <ActivityIndicator size="small" color="#070d18" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>محفوظ کریں (Save Appliance)</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d18',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d1627',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0d1627',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  headerTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitleEn: {
    color: '#94A3B8',
    fontSize: 11,
  },
  sinkingFundStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#0d1627',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  sinkingFundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sinkingFundLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  sinkingFundVal: {
    color: '#00d49f',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dividerV: {
    width: 1,
    height: 18,
    backgroundColor: '#17233b',
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#070d18',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderColor: '#00d49f',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Wave Card
  waveCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  waveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waveIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveUrduTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  waveEnTitle: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  urgencyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  waveDescription: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  waveActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  waveActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  waveActionBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  waveCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
  },
  waveCallBtnText: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // UPS Card
  upsCard: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    padding: 14,
    gap: 10,
  },
  upsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  upsSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  upsCountdownPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  upsCountdownText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  upsDesc: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
  },
  upsWaterRefillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 9,
    borderRadius: 8,
  },
  upsWaterRefillText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Money Pit Alert
  moneyPitAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
  },
  moneyPitTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  moneyPitSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionHeading: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  sectionBadge: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '600',
  },

  // Warranty Card
  warrantyCard: {
    backgroundColor: '#0d1627',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 6,
  },
  warrantyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warrantyPartName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  warrantyAsset: {
    color: '#94A3B8',
    fontSize: 11,
  },
  warrantyDaysPill: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00d49f',
  },
  warrantyDaysText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: 'bold',
  },
  warrantyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 6,
    marginTop: 2,
  },
  warrantyMeta: {
    color: '#94A3B8',
    fontSize: 11,
  },
  emptyCard: {
    backgroundColor: '#0d1627',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
  },

  // Portfolio View
  portfolioTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addApplianceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00d49f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addApplianceBtnText: {
    color: '#070d18',
    fontSize: 11,
    fontWeight: 'bold',
  },
  applianceCard: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    gap: 10,
  },
  applianceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  applianceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applianceName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  applianceLocation: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  moneyPitTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  moneyPitTagText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: 'bold',
  },
  applianceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#070d18',
    paddingVertical: 8,
    borderRadius: 8,
  },
  applianceStatCol: {
    alignItems: 'center',
  },
  applianceStatLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  applianceStatVal: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
  applianceCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 8,
  },
  applianceServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  applianceServiceBtnText: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: 'bold',
  },
  applianceDeleteBtn: {
    padding: 4,
  },

  // Form Container (Tab 3)
  formContainer: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 16,
    gap: 10,
  },
  formSectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  formSectionSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#070d18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    color: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  textInputSmall: {
    backgroundColor: '#070d18',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
    color: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  appliancePill: {
    backgroundColor: '#070d18',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  appliancePillActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderColor: '#00d49f',
  },
  appliancePillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  appliancePillTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  seasonTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  seasonPill: {
    backgroundColor: '#070d18',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  seasonPillActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
  },
  seasonPillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  seasonPillTextActive: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  partsSubSection: {
    backgroundColor: '#070d18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    gap: 6,
    marginVertical: 4,
  },
  subSectionTitle: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: 'bold',
  },
  partItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1627',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  partItemName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  partItemSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  addPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#00d49f',
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingVertical: 6,
    marginTop: 2,
  },
  addPartBtnText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: 'bold',
  },
  vaultDeductionBox: {
    backgroundColor: '#070d18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    marginTop: 4,
  },
  vaultDeductTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vaultDeductSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  vaultPill: {
    backgroundColor: '#0d1627',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  vaultPillActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderColor: '#00d49f',
  },
  vaultPillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  vaultPillTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  submitJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00d49f',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  submitJobBtnText: {
    color: '#070d18',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Karigar Directory (Tab 4)
  karigarCard: {
    backgroundColor: '#0d1627',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 10,
  },
  karigarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  karigarAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  karigarName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  karigarTrade: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  karigarPhone: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  karigarActionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 8,
  },
  karigarCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#00d49f',
    paddingVertical: 7,
    borderRadius: 6,
  },
  karigarCallText: {
    color: '#070d18',
    fontSize: 11,
    fontWeight: 'bold',
  },
  karigarWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(37, 211, 102, 0.15)',
    borderWidth: 1,
    borderColor: '#25D366',
    paddingVertical: 7,
    borderRadius: 6,
  },
  karigarWhatsAppText: {
    color: '#25D366',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // In-Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  addModalCard: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 16,
    gap: 8,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    paddingBottom: 8,
    marginBottom: 4,
  },
  addModalTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  catPill: {
    backgroundColor: '#070d18',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  catPillActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderColor: '#00d49f',
  },
  catPillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  catPillTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    backgroundColor: '#00d49f',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

export default SeasonalHomeRepairModal;
