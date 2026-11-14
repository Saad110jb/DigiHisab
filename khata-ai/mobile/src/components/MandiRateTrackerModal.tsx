import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  mandiBudgetApi,
  MandiCategory,
  MandiUnit,
  IMandiWeeklyEnvelope,
  IMandiPurchaseLog,
  IMandiBenchmarkCategory,
  ICategoryEnvelope,
} from '../api/mandiBudget.api';
import { mandiRateApi, ILiveMandiRateItem, MandiCity } from '../api/mandiRate.api';
import { socketService } from '../services/socket.service';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const MandiRateTrackerModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [envelope, setEnvelope] = useState<IMandiWeeklyEnvelope | null>(null);
  const [purchases, setPurchases] = useState<IMandiPurchaseLog[]>([]);
  const [benchmarks, setBenchmarks] = useState<IMandiBenchmarkCategory[]>([]);

  // Active Tab: 'DASHBOARD' | 'LIVE_RATES' | 'ADD_PURCHASE' | 'EDIT_BUDGET'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'LIVE_RATES' | 'ADD_PURCHASE' | 'EDIT_BUDGET'>('LIVE_RATES');

  // Live Mandi & Grocery Rates State
  const [selectedCity, setSelectedCity] = useState<MandiCity>('Lahore');
  const [selectedRateCategory, setSelectedRateCategory] = useState<string>('ALL');
  const [rateSearchQuery, setRateSearchQuery] = useState<string>('');
  const [liveRates, setLiveRates] = useState<ILiveMandiRateItem[]>([]);
  const [loadingLiveRates, setLoadingLiveRates] = useState<boolean>(false);
  const [marketSourceText, setMarketSourceText] = useState<string>('Badami Bagh Sabzi Mandi & PAMIS');
  const [ratesDateStr, setRatesDateStr] = useState<string>('');
  const [isRefreshingRates, setIsRefreshingRates] = useState<boolean>(false);

  // Form State: Add Purchase
  const [selectedCategory, setSelectedCategory] = useState<MandiCategory>('CHICKEN');
  const [itemName, setItemName] = useState<string>('صاف برائلر مرغی (Clean Broiler)');
  const [quantity, setQuantity] = useState<string>('2');
  const [unit, setUnit] = useState<MandiUnit>('KG');
  const [ratePerUnit, setRatePerUnit] = useState<string>('620');
  const [marketSource, setMarketSource] = useState<string>('سبزی منڈی (Sabzi Mandi)');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'RAAST'>('CASH');
  const [notes, setNotes] = useState<string>('');

  // Form State: Edit Budget Envelopes
  const [budgetInputs, setBudgetInputs] = useState<{ [key in MandiCategory]: string }>({
    CHICKEN: '2500',
    MUTTON_BEEF: '3500',
    FRESH_VEGETABLES: '1500',
    SEASONAL_FRUITS: '1000',
  });

  const loadCurrentWeek = async () => {
    try {
      setLoading(true);
      const res = await mandiBudgetApi.getCurrentWeekBudget();
      if (res && res.envelope) {
        setEnvelope(res.envelope);
        setPurchases(res.purchases || []);
        setBenchmarks(res.benchmarks || []);

        const initialCaps: any = {};
        res.envelope.envelopes.forEach((e) => {
          initialCaps[e.category] = String(e.allocatedAmount);
        });
        setBudgetInputs((prev) => ({ ...prev, ...initialCaps }));
      }
    } catch (err: any) {
      console.error('Failed to load Mandi Budget:', err);
      Alert.alert('خرابی', 'منڈی بجٹ لوڈ نہیں ہو سکا۔');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveRates = async (cityToFetch: MandiCity = selectedCity) => {
    try {
      setLoadingLiveRates(true);
      const res = await mandiRateApi.getLiveRates({
        city: cityToFetch,
        category: selectedRateCategory !== 'ALL' ? selectedRateCategory : undefined,
        search: rateSearchQuery.trim() || undefined,
      });
      if (res && res.success && res.data) {
        setLiveRates(res.data);
        if (res.marketSource) setMarketSourceText(res.marketSource);
        if (res.dateStr) setRatesDateStr(res.dateStr);
      }
    } catch (e) {
      console.warn('Failed to fetch live Mandi rates:', e);
    } finally {
      setLoadingLiveRates(false);
      setIsRefreshingRates(false);
    }
  };

  const handleForceSyncRates = async () => {
    try {
      setIsRefreshingRates(true);
      await mandiRateApi.syncNow();
      await fetchLiveRates(selectedCity);
      Alert.alert('نرخ اپ ڈیٹ', `${selectedCity} کے تازہ ترین منڈی و پرچون ریٹس کامیابی سے ہم آہنگ ہو گئے۔`);
    } catch {
      Alert.alert('منڈی ریٹس', 'ریٹس سرور سے ہم آہنگ ہو چکے ہیں۔');
    } finally {
      setIsRefreshingRates(false);
    }
  };

  const handleSelectLiveRateForPurchase = (item: ILiveMandiRateItem) => {
    let cat: MandiCategory = 'FRESH_VEGETABLES';
    if (item.category === 'POULTRY') cat = 'CHICKEN';
    else if (item.category === 'FRUITS') cat = 'SEASONAL_FRUITS';
    else if (item.category === 'VEGETABLES') cat = 'FRESH_VEGETABLES';
    else if (item.category === 'PULSES' || item.category === 'GRAINS_FLOUR') cat = 'FRESH_VEGETABLES';

    setSelectedCategory(cat);
    setItemName(`${item.nameUrdu} (${item.nameEnglish})`);
    const cleanUnit: MandiUnit =
      item.unit.toLowerCase().includes('dozen') || item.unit.includes('درجن')
        ? 'DARJAN'
        : 'KG';
    setUnit(cleanUnit);
    setRatePerUnit(String(item.modalPrice));
    setMarketSource(item.marketSource || `${selectedCity} Sabzi Mandi`);
    setActiveTab('ADD_PURCHASE');
  };

  useEffect(() => {
    if (visible) {
      loadCurrentWeek();
      fetchLiveRates(selectedCity);
    }
  }, [visible, selectedCity, selectedRateCategory]);

  // Real-time calculated total
  const calculatedTotal = useMemo(() => {
    const q = parseFloat(quantity) || 0;
    const r = parseFloat(ratePerUnit) || 0;
    return Math.round(q * r);
  }, [quantity, ratePerUnit]);

  // Current category benchmark items
  const currentCategoryBenchmarks = useMemo(() => {
    const cat = benchmarks.find((b) => b.category === selectedCategory);
    return cat ? cat.items : [];
  }, [benchmarks, selectedCategory]);

  const handleSelectPreset = (item: { name: string; unit: MandiUnit; typicalRate: number }) => {
    setItemName(item.name);
    setUnit(item.unit);
    setRatePerUnit(String(item.typicalRate));
  };

  const handleQuantityChip = (q: number) => {
    setQuantity(String(q));
  };

  const handleSavePurchase = async () => {
    if (!itemName.trim()) {
      Alert.alert('لازمی فیلڈ', 'براہ کرم جنس کا نام درج کریں۔');
      return;
    }
    const q = parseFloat(quantity);
    const r = parseFloat(ratePerUnit);
    if (isNaN(q) || q <= 0 || isNaN(r) || r <= 0) {
      Alert.alert('غلط مقدار یا ریٹ', 'براہ کرم درست مقدار اور ریٹ درج کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      const res = await mandiBudgetApi.logMandiPurchase({
        category: selectedCategory,
        itemName,
        quantity: q,
        unit,
        ratePerUnit: r,
        totalAmount: calculatedTotal,
        marketSource,
        paymentMethod,
        notes,
      });

      if (res.envelope) {
        setEnvelope(res.envelope);
      }
      if (res.purchase) {
        setPurchases((prev) => [res.purchase, ...prev]);
      }

      Alert.alert('کامیابی', `Rs. ${calculatedTotal.toLocaleString()} کا منڈی سودا کامیابی سے درج ہو گیا۔`);
      setNotes('');
      setActiveTab('DASHBOARD');
    } catch (err: any) {
      Alert.alert('خرابی', err.response?.data?.message || 'سودا محفوظ نہیں ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePurchase = (id: string, name: string, amount: number) => {
    Alert.alert(
      'سودا حذف کریں',
      `کیا آپ واقعی "${name}" (Rs. ${amount.toLocaleString()}) کا اندراج منسوخ کر کے رقم بجٹ میں واپس شامل کرنا چاہتے ہیں؟`,
      [
        { text: 'نہیں', style: 'cancel' },
        {
          text: 'ہاں، منسوخ کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedEnvelope = await mandiBudgetApi.deleteMandiPurchase(id);
              setEnvelope(updatedEnvelope);
              setPurchases((prev) => prev.filter((p) => p._id !== id));
            } catch (err: any) {
              Alert.alert('خرابی', 'سودا حذف نہیں ہو سکا۔');
            }
          },
        },
      ]
    );
  };

  const handleSaveBudgetEnvelopes = async () => {
    try {
      setSubmitting(true);
      const updatedList = [
        {
          category: 'CHICKEN' as MandiCategory,
          categoryUrdu: 'مرغی کا گوشت',
          allocatedAmount: parseFloat(budgetInputs.CHICKEN) || 0,
        },
        {
          category: 'MUTTON_BEEF' as MandiCategory,
          categoryUrdu: 'بڑا و چھوٹا گوشت',
          allocatedAmount: parseFloat(budgetInputs.MUTTON_BEEF) || 0,
        },
        {
          category: 'FRESH_VEGETABLES' as MandiCategory,
          categoryUrdu: 'تازہ سبزیاں',
          allocatedAmount: parseFloat(budgetInputs.FRESH_VEGETABLES) || 0,
        },
        {
          category: 'SEASONAL_FRUITS' as MandiCategory,
          categoryUrdu: 'موسمی پھل',
          allocatedAmount: parseFloat(budgetInputs.SEASONAL_FRUITS) || 0,
        },
      ];

      const res = await mandiBudgetApi.allocateWeeklyBudget(updatedList);
      setEnvelope(res);
      Alert.alert('کامیابی', 'ہفتہ وار منڈی کیٹگری انویلوپس کامیابی سے اپ ڈیٹ ہو گئے۔');
      setActiveTab('DASHBOARD');
    } catch (err: any) {
      Alert.alert('خرابی', 'بجٹ اپ ڈیٹ نہیں ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryDetails = (cat: MandiCategory) => {
    switch (cat) {
      case 'CHICKEN':
        return { label: 'مرغی', icon: 'restaurant', color: '#00d49f', bg: 'rgba(0, 212, 159, 0.15)' };
      case 'MUTTON_BEEF':
        return { label: 'بڑا و چھوٹا گوشت', icon: 'nutrition', color: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)' };
      case 'FRESH_VEGETABLES':
        return { label: 'تازہ سبزیاں', icon: 'leaf', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'SEASONAL_FRUITS':
        return { label: 'موسمی پھل', icon: 'nutrition-outline', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    }
  };

  const percentSpent = envelope && envelope.totalWeeklyBudget > 0
    ? Math.min(100, Math.round((envelope.totalWeeklySpent / envelope.totalWeeklyBudget) * 100))
    : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconPlate}>
                <Ionicons name="cart" size={20} color="#00d49f" />
              </View>
              <View>
                <Text style={styles.headerTitle}>سبزی و گوشت منڈی بجٹ</Text>
                <Text style={styles.headerSubtitle}>
                  Mandi Rate Tracker & Weekly Perishable Envelopes
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Sub Navigation Bar */}
          <View style={styles.navBar}>
            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'LIVE_RATES' && styles.navBtnActive]}
              onPress={() => setActiveTab('LIVE_RATES')}
            >
              <Ionicons
                name="pricetag-outline"
                size={14}
                color={activeTab === 'LIVE_RATES' ? '#00d49f' : '#94A3B8'}
              />
              <Text style={[styles.navBtnText, activeTab === 'LIVE_RATES' && styles.navBtnTextActive]}>
                🥬 لائیو منڈی ریٹس
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'DASHBOARD' && styles.navBtnActive]}
              onPress={() => setActiveTab('DASHBOARD')}
            >
              <Ionicons
                name="pie-chart-outline"
                size={14}
                color={activeTab === 'DASHBOARD' ? '#00d49f' : '#94A3B8'}
              />
              <Text style={[styles.navBtnText, activeTab === 'DASHBOARD' && styles.navBtnTextActive]}>
                بجٹ سمری
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'ADD_PURCHASE' && styles.navBtnActive]}
              onPress={() => setActiveTab('ADD_PURCHASE')}
            >
              <Ionicons
                name="add-circle-outline"
                size={15}
                color={activeTab === 'ADD_PURCHASE' ? '#00d49f' : '#94A3B8'}
              />
              <Text style={[styles.navBtnText, activeTab === 'ADD_PURCHASE' && styles.navBtnTextActive]}>
                + نیا سودا درج کریں
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtn, activeTab === 'EDIT_BUDGET' && styles.navBtnActive]}
              onPress={() => setActiveTab('EDIT_BUDGET')}
            >
              <Ionicons
                name="settings-outline"
                size={14}
                color={activeTab === 'EDIT_BUDGET' ? '#00d49f' : '#94A3B8'}
              />
              <Text style={[styles.navBtnText, activeTab === 'EDIT_BUDGET' && styles.navBtnTextActive]}>
                بجٹ کیپس
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#00d49f" />
              <Text style={styles.loaderText}>منڈی بجٹ اور نرخ لوڈ ہو رہے ہیں...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              {/* ================= VIEW 0: LIVE MANDI & GROCERY RATES ================= */}
              {activeTab === 'LIVE_RATES' && (
                <View style={styles.viewContent}>
                  {/* City Selection Bar */}
                  <View style={styles.citySelectorSection}>
                    <Text style={styles.citySelectorLabel}>شہر منتخب کریں (Select District Mandi):</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.cityScroll}
                      contentContainerStyle={styles.cityScrollContent}
                    >
                      {(['Lahore', 'Karachi', 'Rawalpindi', 'Faisalabad', 'Multan'] as MandiCity[]).map((city) => (
                        <TouchableOpacity
                          key={city}
                          style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                          onPress={() => setSelectedCity(city)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                            {city === 'Lahore'
                              ? '📍 لاہور (Lahore)'
                              : city === 'Karachi'
                              ? '📍 کراچی (Karachi)'
                              : city === 'Rawalpindi'
                              ? '📍 راولپنڈی (Pindi)'
                              : city === 'Faisalabad'
                              ? '📍 فیصل آباد (FSD)'
                              : '📍 ملتان (Multan)'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Market Committee Bulletin Banner */}
                  <View style={styles.marketBannerCard}>
                    <View style={styles.marketBannerTop}>
                      <View style={styles.liveIndicatorRow}>
                        <View style={styles.livePulseDot} />
                        <Text style={styles.liveIndicatorText}>PAMIS سرکاری مارکیٹ کمیٹی لائیو نرخ</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.refreshSyncBtn}
                        onPress={handleForceSyncRates}
                        disabled={isRefreshingRates}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="refresh"
                          size={14}
                          color="#00d49f"
                          style={isRefreshingRates ? { opacity: 0.5 } : undefined}
                        />
                        <Text style={styles.refreshSyncBtnText}>
                          {isRefreshingRates ? 'ہم آہنگ...' : 'تازہ کریں'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.marketSourceSub}>
                      {marketSourceText} • {ratesDateStr || new Date().toISOString().split('T')[0]}
                    </Text>
                  </View>

                  {/* Search Bar */}
                  <View style={styles.rateSearchBox}>
                    <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.rateSearchInput}
                      placeholder="جنس تلاش کریں (مثلاً ٹماٹر، آلو، چینی، برائلر)..."
                      placeholderTextColor="#64748B"
                      value={rateSearchQuery}
                      onChangeText={(t) => setRateSearchQuery(t)}
                    />
                    {rateSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setRateSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Category Filter Chips */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterScroll}>
                    {[
                      { key: 'ALL', label: 'تمام اشیاء (All)' },
                      { key: 'VEGETABLES', label: 'سبزیاں (Vegetables)' },
                      { key: 'POULTRY', label: 'مرغی و انڈے (Poultry)' },
                      { key: 'GRAINS_FLOUR', label: 'آٹا و اناج (Flour/Rice)' },
                      { key: 'PULSES', label: 'دالیں (Pulses)' },
                      { key: 'GROCERIES', label: 'گھی و چینی (Groceries)' },
                      { key: 'DAIRY', label: 'دودھ و دہی (Dairy)' },
                      { key: 'FRUITS', label: 'پھل (Fruits)' },
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.catFilterChip,
                          selectedRateCategory === cat.key && styles.catFilterChipActive,
                        ]}
                        onPress={() => setSelectedRateCategory(cat.key)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.catFilterChipText,
                            selectedRateCategory === cat.key && styles.catFilterChipTextActive,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Commodity Rates List */}
                  {loadingLiveRates ? (
                    <View style={styles.ratesLoadingBox}>
                      <ActivityIndicator size="small" color="#00d49f" />
                      <Text style={styles.ratesLoadingText}>
                        {selectedCity} کے تازہ ترین نرخ حاصل کیے جا رہے ہیں...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.commoditiesListWrap}>
                      {liveRates
                        .filter((item) => {
                          if (!rateSearchQuery.trim()) return true;
                          const q = rateSearchQuery.toLowerCase();
                          return (
                            item.nameEnglish.toLowerCase().includes(q) ||
                            item.nameUrdu.toLowerCase().includes(q)
                          );
                        })
                        .map((item) => (
                          <View key={item._id || item.commodityKey} style={styles.commodityCard}>
                            <View style={styles.commodityHeaderRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.commodityNameUrdu}>{item.nameUrdu}</Text>
                                <Text style={styles.commodityNameEn}>{item.nameEnglish}</Text>
                              </View>

                              {/* Price Delta Badge */}
                              <View
                                style={[
                                  styles.deltaBadge,
                                  item.trend === 'DOWN'
                                    ? styles.deltaBadgeDown
                                    : item.trend === 'UP'
                                    ? styles.deltaBadgeUp
                                    : styles.deltaBadgeStable,
                                ]}
                              >
                                <Ionicons
                                  name={
                                    item.trend === 'DOWN'
                                      ? 'arrow-down'
                                      : item.trend === 'UP'
                                      ? 'arrow-up'
                                      : 'remove'
                                  }
                                  size={12}
                                  color={
                                    item.trend === 'DOWN'
                                      ? '#10B981'
                                      : item.trend === 'UP'
                                      ? '#EF4444'
                                      : '#94A3B8'
                                  }
                                  style={{ marginRight: 2 }}
                                />
                                <Text
                                  style={[
                                    styles.deltaBadgeText,
                                    item.trend === 'DOWN'
                                      ? { color: '#10B981' }
                                      : item.trend === 'UP'
                                      ? { color: '#EF4444' }
                                      : { color: '#94A3B8' },
                                  ]}
                                >
                                  {item.changeAmount !== 0
                                    ? `${item.changeAmount > 0 ? '+' : ''}${item.changeAmount} (${Math.abs(item.changePercentage)}%)`
                                    : 'مستحکم'}
                                </Text>
                              </View>
                            </View>

                            {/* Price Metrics Grid */}
                            <View style={styles.commodityPriceGrid}>
                              <View style={styles.priceCol}>
                                <Text style={styles.priceColLabel}>اوسط مارکیٹ ریٹ (Modal)</Text>
                                <Text style={styles.modalPriceText}>
                                  Rs. {item.modalPrice.toLocaleString()}{' '}
                                  <Text style={styles.unitSubText}>/ {item.unit}</Text>
                                </Text>
                              </View>

                              <View style={styles.priceRangeCol}>
                                <Text style={styles.priceColLabel}>سرکاری بولی حد (DC Range)</Text>
                                <Text style={styles.rangePriceText}>
                                  Rs. {item.minimumPrice} - {item.maximumPrice}
                                </Text>
                              </View>
                            </View>

                            {/* 1-Tap Purchase Action */}
                            <TouchableOpacity
                              style={styles.logPurchaseFastBtn}
                              onPress={() => handleSelectLiveRateForPurchase(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="cart-outline" size={15} color="#00d49f" style={{ marginRight: 6 }} />
                              <Text style={styles.logPurchaseFastBtnText}>اس ریٹ پر سودا درج کریں (Log Purchase)</Text>
                              <Ionicons name="arrow-forward" size={14} color="#00d49f" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              )}

              {/* ================= VIEW 1: DASHBOARD ================= */}
              {activeTab === 'DASHBOARD' && (
                <View style={styles.viewContent}>
                  {/* Top Perishable Reserve Gauge Deck */}
                  <View style={styles.balanceCard}>
                    <View style={styles.balanceTopRow}>
                      <View>
                        <Text style={styles.balanceCardLabel}>باقی ہفتہ وار منڈی فنڈ (Remaining Fund)</Text>
                        <Text style={styles.balanceCardAmount}>
                          Rs. {(envelope?.remainingWeeklyBalance || 0).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.weekTagPill}>
                        <Ionicons name="calendar-outline" size={12} color="#00d49f" />
                        <Text style={styles.weekTagText}>
                          ہفتہ {envelope?.weekNumber || 1} • {envelope?.monthKey}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${percentSpent}%`,
                            backgroundColor:
                              percentSpent > 90 ? '#EF4444' : percentSpent > 70 ? '#F59E0B' : '#00d49f',
                          },
                        ]}
                      />
                    </View>

                    <View style={styles.balanceMetaRow}>
                      <Text style={styles.metaSub}>
                        کل بجٹ: Rs. {(envelope?.totalWeeklyBudget || 0).toLocaleString()}
                      </Text>
                      <Text style={[styles.metaSub, { color: percentSpent > 90 ? '#EF4444' : '#CBD5E1' }]}>
                        خرچ شدہ: Rs. {(envelope?.totalWeeklySpent || 0).toLocaleString()} ({percentSpent}%)
                      </Text>
                    </View>
                  </View>

                  {/* 4 Category Envelope Cards */}
                  <Text style={styles.sectionHeading}>📦 4 ہفتہ وار کیٹگری انویلوپس</Text>

                  <View style={styles.envelopesGrid}>
                    {envelope?.envelopes.map((cat: ICategoryEnvelope) => {
                      const details = getCategoryDetails(cat.category);
                      const catPercent = cat.allocatedAmount > 0
                        ? Math.min(100, Math.round((cat.spentAmount / cat.allocatedAmount) * 100))
                        : 0;

                      return (
                        <View key={cat.category} style={styles.envelopeCard}>
                          <View style={styles.envelopeCardHeader}>
                            <View style={[styles.envelopeIconBox, { backgroundColor: details.bg }]}>
                              <Ionicons name={details.icon as any} size={16} color={details.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.envelopeTitle}>{cat.categoryUrdu}</Text>
                              <Text style={styles.envelopeSub}>{cat.category}</Text>
                            </View>
                            <View style={styles.envelopeRemainingPill}>
                              <Text style={[styles.envelopeRemainingText, { color: details.color }]}>
                                Rs. {cat.remainingAmount.toLocaleString()}
                              </Text>
                            </View>
                          </View>

                          {/* Mini Progress */}
                          <View style={styles.miniProgressTrack}>
                            <View
                              style={[
                                styles.miniProgressFill,
                                {
                                  width: `${catPercent}%`,
                                  backgroundColor:
                                    catPercent > 90 ? '#EF4444' : catPercent > 70 ? '#F59E0B' : details.color,
                                },
                              ]}
                            />
                          </View>

                          <View style={styles.envelopeBottomRow}>
                            <Text style={styles.envelopeSpentText}>
                              خرچ: Rs. {cat.spentAmount.toLocaleString()}
                            </Text>
                            <Text style={styles.envelopeTotalText}>
                              مختص: Rs. {cat.allocatedAmount.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Recent Purchases List */}
                  <View style={styles.listSectionHeader}>
                    <Text style={styles.sectionHeading}>🛒 حالیہ منڈی خریداری لاگ ({purchases.length})</Text>
                    <TouchableOpacity
                      style={styles.addMiniBtn}
                      onPress={() => setActiveTab('ADD_PURCHASE')}
                    >
                      <Ionicons name="add" size={14} color="#00d49f" />
                      <Text style={styles.addMiniBtnText}>نیا سودا</Text>
                    </TouchableOpacity>
                  </View>

                  {purchases.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="basket-outline" size={32} color="#64748B" />
                      <Text style={styles.emptyTitle}>اس ہفتے کوئی سودا درج نہیں کیا گیا۔</Text>
                      <Text style={styles.emptySub}>
                        منڈی کے دورے کے بعد "+ نیا سودا درج کریں" کے ذریعے مقدار اور ریٹ محفوظ کریں۔
                      </Text>
                    </View>
                  ) : (
                    purchases.map((p) => {
                      const catDetails = getCategoryDetails(p.category);
                      return (
                        <View key={p._id} style={styles.purchaseRow}>
                          <View style={[styles.purchaseIconBox, { backgroundColor: catDetails.bg }]}>
                            <Ionicons name={catDetails.icon as any} size={16} color={catDetails.color} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.purchaseItemName}>{p.itemName}</Text>
                            <Text style={styles.purchaseMeta}>
                              {p.quantity} {p.unit} @ Rs. {p.ratePerUnit}/{p.unit} • {p.marketSource}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                            <Text style={styles.purchaseAmount}>Rs. {p.totalAmount.toLocaleString()}</Text>
                            <Text style={styles.purchaseDate}>
                              {new Date(p.purchaseDate).toLocaleDateString('ur-PK', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeletePurchase(p._id, p.itemName, p.totalAmount)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* ================= VIEW 2: ADD PURCHASE ================= */}
              {activeTab === 'ADD_PURCHASE' && (
                <View style={styles.viewContent}>
                  {/* Category Picker Tabs */}
                  <Text style={styles.formSectionLabel}>1. کیٹگری منتخب کریں</Text>
                  <View style={styles.categoryPickerRow}>
                    {(['CHICKEN', 'MUTTON_BEEF', 'FRESH_VEGETABLES', 'SEASONAL_FRUITS'] as MandiCategory[]).map(
                      (cat) => {
                        const details = getCategoryDetails(cat);
                        const isSelected = selectedCategory === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              styles.catTab,
                              isSelected && { borderColor: details.color, backgroundColor: details.bg },
                            ]}
                            onPress={() => setSelectedCategory(cat)}
                          >
                            <Ionicons
                              name={details.icon as any}
                              size={15}
                              color={isSelected ? details.color : '#94A3B8'}
                            />
                            <Text
                              style={[
                                styles.catTabText,
                                isSelected && { color: details.color, fontWeight: 'bold' },
                              ]}
                            >
                              {details.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>

                  {/* Preset Item Chips */}
                  <Text style={styles.formSectionLabel}>2. عام اشیاء کے فوری چپس</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                    {currentCategoryBenchmarks.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.presetChip,
                          itemName === item.name && styles.presetChipActive,
                        ]}
                        onPress={() => handleSelectPreset(item)}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            itemName === item.name && styles.presetChipTextActive,
                          ]}
                        >
                          {item.name} (Rs. {item.typicalRate})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Item Name Input */}
                  <Text style={styles.inputLabel}>جنس کا نام (Item Name)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={itemName}
                    onChangeText={setItemName}
                    placeholder="مثال: زندہ مرغی، ٹماٹر، مٹن مکس"
                    placeholderTextColor="#64748B"
                  />

                  {/* Quantity Chips */}
                  <Text style={styles.formSectionLabel}>3. مقدار منتخب کریں (Quantity Chips)</Text>
                  <View style={styles.qtyChipsRow}>
                    {[0.5, 1, 1.5, 2, 2.5, 3, 5].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[
                          styles.qtyChip,
                          quantity === String(q) && styles.qtyChipActive,
                        ]}
                        onPress={() => handleQuantityChip(q)}
                      >
                        <Text
                          style={[
                            styles.qtyChipText,
                            quantity === String(q) && styles.qtyChipTextActive,
                          ]}
                        >
                          {q} {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.qtyChip, unit === 'PAO' && styles.qtyChipActive]}
                      onPress={() => {
                        setUnit('PAO');
                        setQuantity('1');
                      }}
                    >
                      <Text style={[styles.qtyChipText, unit === 'PAO' && styles.qtyChipTextActive]}>
                        1 پاؤ
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Quantity & Unit Row */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>تعداد / وزن (Qty)</Text>
                      <TextInput
                        style={styles.textInput}
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        placeholder="2"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                    <View style={{ width: 120 }}>
                      <Text style={styles.inputLabel}>یونٹ (Unit)</Text>
                      <View style={styles.unitSelector}>
                        {(['KG', 'DARJAN', 'PAO'] as MandiUnit[]).map((u) => (
                          <TouchableOpacity
                            key={u}
                            style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                            onPress={() => setUnit(u)}
                          >
                            <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
                              {u}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Rate & Live Calculated Total */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>فی یونٹ نرخ (Rate / {unit})</Text>
                      <TextInput
                        style={styles.textInput}
                        value={ratePerUnit}
                        onChangeText={setRatePerUnit}
                        keyboardType="numeric"
                        placeholder="620"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                    <View style={styles.calculatedBox}>
                      <Text style={styles.calculatedLabel}>کل رقم (Total Amount)</Text>
                      <Text style={styles.calculatedAmount}>Rs. {calculatedTotal.toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Market Source */}
                  <Text style={styles.formSectionLabel}>4. خریداری کا مقام (Market Source)</Text>
                  <View style={styles.marketSourceRow}>
                    {['سبزی منڈی (Mandi)', 'اتوار بازار (Bazaar)', 'قصاب (Butcher)', 'ریڑھی والا (Vendor)'].map(
                      (src) => (
                        <TouchableOpacity
                          key={src}
                          style={[
                            styles.sourceChip,
                            marketSource === src && styles.sourceChipActive,
                          ]}
                          onPress={() => setMarketSource(src)}
                        >
                          <Text
                            style={[
                              styles.sourceChipText,
                              marketSource === src && styles.sourceChipTextActive,
                            ]}
                          >
                            {src}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>

                  {/* Payment Method */}
                  <Text style={styles.formSectionLabel}>5. طریقہ ادائیگی (Payment Method)</Text>
                  <View style={styles.paymentMethodRow}>
                    {[
                      { key: 'CASH', label: '💵 نقد (Cash)' },
                      { key: 'JAZZCASH', label: '📱 جاز کیش' },
                      { key: 'EASYPAISA', label: '🟢 ایزی پیسہ' },
                    ].map((pm) => (
                      <TouchableOpacity
                        key={pm.key}
                        style={[
                          styles.pmChip,
                          paymentMethod === pm.key && styles.pmChipActive,
                        ]}
                        onPress={() => setPaymentMethod(pm.key as any)}
                      >
                        <Text
                          style={[
                            styles.pmChipText,
                            paymentMethod === pm.key && styles.pmChipTextActive,
                          ]}
                        >
                          {pm.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSavePurchase}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#070d18" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={18} color="#070d18" />
                        <Text style={styles.submitBtnText}>
                          منڈی سودا محفوظ کریں (Rs. {calculatedTotal.toLocaleString()})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* ================= VIEW 3: EDIT BUDGET ENVELOPES ================= */}
              {activeTab === 'EDIT_BUDGET' && (
                <View style={styles.viewContent}>
                  <Text style={styles.infoBannerText}>
                    💡 اپنے ہفتہ وار منڈی بجٹ کی حدود متعین کریں۔ یہ رقم ماہانہ راشن سے الگ روزمرہ تازہ اشیاء کے لیے مختص ہوتی ہے۔
                  </Text>

                  {(['CHICKEN', 'MUTTON_BEEF', 'FRESH_VEGETABLES', 'SEASONAL_FRUITS'] as MandiCategory[]).map(
                    (cat) => {
                      const details = getCategoryDetails(cat);
                      return (
                        <View key={cat} style={styles.budgetInputRow}>
                          <View style={[styles.budgetIconBox, { backgroundColor: details.bg }]}>
                            <Ionicons name={details.icon as any} size={18} color={details.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.budgetCatTitle}>{details.label}</Text>
                            <Text style={styles.budgetCatSub}>{cat}</Text>
                          </View>
                          <View style={styles.budgetInputWrap}>
                            <Text style={styles.currencyPrefix}>Rs.</Text>
                            <TextInput
                              style={styles.budgetTextInput}
                              value={budgetInputs[cat]}
                              onChangeText={(val) =>
                                setBudgetInputs((prev) => ({ ...prev, [cat]: val }))
                              }
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor="#64748B"
                            />
                          </View>
                        </View>
                      );
                    }
                  )}

                  <View style={styles.totalSummaryCard}>
                    <Text style={styles.totalSummaryLabel}>کل ہفتہ وار منڈی بجٹ (Total Perishable Cap):</Text>
                    <Text style={styles.totalSummaryValue}>
                      Rs.{' '}
                      {(
                        (parseFloat(budgetInputs.CHICKEN) || 0) +
                        (parseFloat(budgetInputs.MUTTON_BEEF) || 0) +
                        (parseFloat(budgetInputs.FRESH_VEGETABLES) || 0) +
                        (parseFloat(budgetInputs.SEASONAL_FRUITS) || 0)
                      ).toLocaleString()}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSaveBudgetEnvelopes}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#070d18" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={18} color="#070d18" />
                        <Text style={styles.submitBtnText}>ہفتہ وار بجٹ محفوظ کریں</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 5, 15, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#070d18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#17233b',
    maxHeight: '92%',
    minHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconPlate: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0d1627',
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    gap: 8,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  navBtnActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderColor: '#00d49f',
  },
  navBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  navBtnTextActive: {
    color: '#00d49f',
  },
  loaderWrap: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  viewContent: {
    padding: 16,
    gap: 14,
  },

  // Balance Card
  balanceCard: {
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    gap: 10,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceCardLabel: {
    fontSize: 11,
    color: '#00d49f',
    fontWeight: '700',
  },
  balanceCardAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  weekTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  weekTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00d49f',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  balanceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaSub: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Envelopes Grid
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
  },
  envelopesGrid: {
    gap: 8,
  },
  envelopeCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    gap: 8,
  },
  envelopeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  envelopeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelopeTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  envelopeSub: {
    fontSize: 9.5,
    color: '#64748B',
  },
  envelopeRemainingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  envelopeRemainingText: {
    fontSize: 12,
    fontWeight: '800',
  },
  miniProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  envelopeBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  envelopeSpentText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  envelopeTotalText: {
    fontSize: 10,
    color: '#64748B',
  },

  // Purchases List
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
  },
  addMiniBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00d49f',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  purchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    marginBottom: 6,
    gap: 8,
  },
  purchaseIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  purchaseMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  purchaseAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#00d49f',
  },
  purchaseDate: {
    fontSize: 9.5,
    color: '#64748B',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },

  // Form Styles
  formSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00d49f',
    marginTop: 4,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  catTabText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    marginRight: 6,
  },
  presetChipActive: {
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
  },
  presetChipText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  presetChipTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
  },
  qtyChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  qtyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  qtyChipActive: {
    borderColor: '#00d49f',
    backgroundColor: '#00d49f',
  },
  qtyChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  qtyChipTextActive: {
    color: '#022c22',
    fontWeight: '800',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  unitBtnActive: {
    backgroundColor: '#00d49f',
  },
  unitBtnText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  unitBtnTextActive: {
    color: '#022c22',
    fontWeight: 'bold',
  },
  calculatedBox: {
    width: 140,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculatedLabel: {
    fontSize: 9.5,
    color: '#00d49f',
    fontWeight: 'bold',
  },
  calculatedAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00d49f',
    marginTop: 2,
  },
  marketSourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  sourceChipActive: {
    borderColor: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  sourceChipText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  sourceChipTextActive: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pmChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    alignItems: 'center',
  },
  pmChipActive: {
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
  },
  pmChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  pmChipTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00d49f',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#070d18',
  },

  // Edit Budget Styles
  infoBannerText: {
    fontSize: 11.5,
    color: '#94A3B8',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    lineHeight: 16,
  },
  budgetInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    gap: 10,
  },
  budgetIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetCatTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  budgetCatSub: {
    fontSize: 10,
    color: '#64748B',
  },
  budgetInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 130,
  },
  currencyPrefix: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: 'bold',
    marginRight: 4,
  },
  budgetTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 6,
  },
  totalSummaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d49f',
    padding: 14,
  },
  totalSummaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  totalSummaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00d49f',
  },
  // Live Mandi Rates Styles
  citySelectorSection: {
    marginBottom: 10,
  },
  citySelectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 6,
  },
  cityScroll: {
    flexDirection: 'row',
  },
  cityScrollContent: {
    flexDirection: 'row',
    paddingRight: 16,
  },
  cityChip: {
    backgroundColor: '#0d1627',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    flexShrink: 0,
  },
  cityChipActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderColor: '#00d49f',
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cityChipTextActive: {
    color: '#00d49f',
    fontWeight: '800',
  },
  marketBannerCard: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.25)',
    marginBottom: 10,
  },
  marketBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveIndicatorText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  marketSourceSub: {
    color: '#94A3B8',
    fontSize: 11,
  },
  refreshSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  refreshSyncBtnText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  rateSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    marginBottom: 10,
  },
  rateSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    padding: 0,
  },
  categoryFilterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  catFilterChip: {
    backgroundColor: '#0d1627',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  catFilterChipActive: {
    backgroundColor: '#00d49f',
    borderColor: '#00d49f',
  },
  catFilterChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  catFilterChipTextActive: {
    color: '#070d18',
    fontWeight: '800',
  },
  ratesLoadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratesLoadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
  },
  commoditiesListWrap: {
    gap: 10,
    paddingBottom: 24,
  },
  commodityCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  commodityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  commodityNameUrdu: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  commodityNameEn: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  deltaBadgeDown: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  deltaBadgeUp: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deltaBadgeStable: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  deltaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commodityPriceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#070d18',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  priceCol: {
    flex: 1,
  },
  priceRangeCol: {
    alignItems: 'flex-end',
  },
  priceColLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalPriceText: {
    color: '#00d49f',
    fontSize: 16,
    fontWeight: '900',
  },
  unitSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  rangePriceText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  logPurchaseFastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.25)',
  },
  logPurchaseFastBtnText: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: '700',
  },
});
