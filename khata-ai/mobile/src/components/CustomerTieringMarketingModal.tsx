import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  customerRfmMarketingApi,
  IRfmSummary,
  IRfmCustomerItem,
  ICampaignTemplate,
  ICampaignPreviewResponse,
  RfmSegment,
} from '../api/customerRfmMarketing.api';

export interface CustomerTieringMarketingModalProps {
  visible: boolean;
  onClose: () => void;
}

type FilterTier = 'ALL' | RfmSegment;

export type StoreType = 'KARYANA' | 'PHARMACY' | 'GARMENTS' | 'ELECTRONICS' | 'CUSTOM';

export const STORE_TEMPLATES: Record<StoreType, { id: string; badge: string; titleUrdu: string; message: string }[]> = {
  KARYANA: [
    {
      id: 'karyana_rashan',
      badge: 'ماہانہ راشن',
      titleUrdu: 'ماہانہ راشن پیکج اور بچت آفر',
      message: 'محترم {customer_name}! {shop_name} پر تازہ گروسری اور ماہانہ راشن پیکج پر خصوصی رعایت دستیاب ہے۔ تشریف لائیں اور بچت کا فائدہ اٹھائیں!',
    },
    {
      id: 'karyana_udhaar',
      badge: 'کھاتہ کلیئرنس',
      titleUrdu: 'بقایا ادھار کلیئرنس یاد دہانی',
      message: 'محترم {customer_name}! {shop_name} کے کھاتے میں آپ کا بقایا حساب Rs. {balance} ہے۔ برائے کرم اس محفوظ لنک کے ذریعے کلیئر کریں: {pay_link}',
    },
  ],
  PHARMACY: [
    {
      id: 'pharma_refill',
      badge: 'ادویات ری فل',
      titleUrdu: 'ماہانہ ادویات کا وقت',
      message: 'محترم {customer_name}! {shop_name} سے آپ کی ماہانہ ادویات کا وقت ہو گیا ہے۔ نسخہ بھیجیں اور گھر بیٹھے مفت ڈلیوری حاصل کریں۔',
    },
    {
      id: 'pharma_health',
      badge: 'ہیلتھ کیئر',
      titleUrdu: 'فری شوگر اور بی پی چیک اپ',
      message: 'محترم VIP گاہک {customer_name}! {shop_name} پر تمام ادویات پر 10% رعایت اور فری ہیلتھ چیک اپ جاری ہے۔',
    },
  ],
  GARMENTS: [
    {
      id: 'garments_arrival',
      badge: 'نیا سیزن',
      titleUrdu: 'نیا سیزنل کلیکشن و ڈسکاؤنٹ',
      message: 'محترم {customer_name}! {shop_name} پر نیا فینسی اور سیزنل اسٹاک آ گیا ہے! VIP گاہکوں کے لیے خصوصی 15% رعایت دستیاب ہے۔',
    },
    {
      id: 'garments_sale',
      badge: 'سیل الرٹ',
      titleUrdu: 'بچت فیسٹیول سیل',
      message: 'سیل الرٹ! {shop_name} پر شاندار بچت میلہ شروع ہو گیا ہے۔ شاپنگ کریں اور خصوصی تحائف جیتیں۔',
    },
  ],
  ELECTRONICS: [
    {
      id: 'electronics_promo',
      badge: 'موبائل ایکسیسریز',
      titleUrdu: 'نئے اسمارٹ فونز و سامان',
      message: 'محترم {customer_name}! {shop_name} پر نئے اسمارٹ فونز، اوریجنل چارجرز اور گیجٹس پر خصوصی ڈسکاؤنٹ حاصل کریں۔',
    },
    {
      id: 'electronics_installment',
      badge: 'قسط یاد دہانی',
      titleUrdu: 'آسان ماہانہ قسط کلیئرنس',
      message: 'محترم {customer_name}! آپ کی الیکٹرانکس قسط کا واجب الادا بیلنس Rs. {balance} ہے۔ براہ کرم اس ادائیگی لنک سے فوری ادا کریں: {pay_link}',
    },
  ],
  CUSTOM: [
    {
      id: 'custom_msg',
      badge: 'خود لکھیں',
      titleUrdu: 'اپنی مرضی کا ذاتی پیغام',
      message: 'محترم {customer_name}! {shop_name} کی طرف سے سلام۔ آپ کا بقایا حساب Rs. {balance} ہے۔ ادائیگی لنک: {pay_link}',
    },
  ],
};

export const CustomerTieringMarketingModal: React.FC<CustomerTieringMarketingModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'STUDIO'>('DIRECTORY');
  const [selectedFilter, setSelectedFilter] = useState<FilterTier>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [summaryData, setSummaryData] = useState<IRfmSummary | null>(null);
  const [templates, setTemplates] = useState<ICampaignTemplate[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('FRESH_STOCK');
  const [previewData, setPreviewData] = useState<ICampaignPreviewResponse | null>(null);

  const [selectedStoreType, setSelectedStoreType] = useState<StoreType>('KARYANA');
  const [customMessageText, setCustomMessageText] = useState<string>(
    'محترم {customer_name}! {shop_name} پر تازہ گروسری اور ماہانہ راشن پیکج پر خصوصی رعایت دستیاب ہے۔ تشریف لائیں اور بچت کا فائدہ اٹھائیں!'
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dispatchedCustomerIds, setDispatchedCustomerIds] = useState<Set<string>>(new Set());

  const handleInsertVariable = (variableKey: string) => {
    setCustomMessageText((prev) => `${prev} ${variableKey}`);
  };

  const buildEvaluatedMessage = (customerName?: string, balance?: number, payLink?: string) => {
    const sName = previewData?.storeName || 'DigiHisab Store';
    const cName = customerName || 'معزز خریدار';
    const bAmt = balance !== undefined ? balance.toLocaleString() : '0';
    const pLink = payLink || 'https://digihisab.pk/pay';
    return customMessageText
      .replace(/{customer_name}/g, cName)
      .replace(/{shop_name}/g, sName)
      .replace(/{balance}/g, bAmt)
      .replace(/{pay_link}/g, pLink);
  };

  const loadData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [sumRes, templRes] = await Promise.all([
        customerRfmMarketingApi.getSummary(),
        customerRfmMarketingApi.getTemplates(),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummaryData(sumRes.data);
      }
      if (templRes.success && templRes.data) {
        setTemplates(templRes.data);
      }
    } catch (err: any) {
      console.warn('[CustomerTieringMarketingModal] Load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadCampaignPreview = async (campaignId: string) => {
    try {
      const res = await customerRfmMarketingApi.getPreviews(campaignId);
      if (res.success && res.data) {
        setPreviewData(res.data);
      }
    } catch (err) {
      console.warn('[loadCampaignPreview] Error:', err);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
      loadCampaignPreview(selectedCampaignId);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && selectedCampaignId) {
      loadCampaignPreview(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const handleDispatchWhatsApp = async (
    customerId: string,
    fallbackUrl: string,
    customerName?: string,
    balance?: number
  ) => {
    try {
      // Optimistically mark as sent
      setDispatchedCustomerIds((prev) => new Set(prev).add(customerId));
      customerRfmMarketingApi.recordDispatch(customerId, selectedCampaignId).catch(() => {});

      const evaluatedText = buildEvaluatedMessage(customerName, balance);
      const targetPhone = previewData?.customers.find((c) => c.customerId === customerId)?.customerPhone || '';
      const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(evaluatedText)}`;

      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(evaluatedText)}`);
      }
    } catch (e: any) {
      Alert.alert('واٹس ایپ رابطہ', 'براہ کرم یقینی بنائیں کہ آپ کے فون میں واٹس ایپ انسٹال ہے۔');
    }
  };

  const handleShareBroadcast = async () => {
    try {
      const evaluatedText = buildEvaluatedMessage('معزز خریدار');
      await Share.share({
        message: evaluatedText,
        title: 'DigiHisab Campaign Broadcast',
      });
    } catch (err: any) {
      Alert.alert('شیئر خرابی', err.message || 'پیغام شیئر کرنے میں مسئلہ پیش آیا۔');
    }
  };

  const filteredCustomers = (summaryData?.customers || []).filter((cust) => {
    const matchesFilter = selectedFilter === 'ALL' || cust.segment === selectedFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.phone.includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const getSegmentBadgeStyle = (segment: RfmSegment) => {
    switch (segment) {
      case 'VIP':
        return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: 'ribbon' };
      case 'LOYAL':
        return { bg: '#E8F5EE', border: '#006C4E', text: '#006C4E', icon: 'shield-checkmark' };
      case 'AT_RISK':
        return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', icon: 'alert-circle' };
      case 'CREDIT_DEBTOR':
        return { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6', icon: 'card' };
      case 'NEW':
      default:
        return { bg: '#E0F2FE', border: '#0284C7', text: '#0369A1', icon: 'sparkles' };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingTop: Math.max(16, insets.top) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="chatbubbles" size={20} color="#006C4E" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitleUrdu}>گاہک مارکیٹنگ و درجات</Text>
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>⭐ PRO • RFM</Text>
                  </View>
                </View>
                <Text style={styles.headerSubTitle}>
                  Smart Customer Loyalty & WhatsApp Campaigns
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => loadData(true)}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#006C4E" />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color="#006C4E" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick KPI Overview 2x2 Responsive Grid */}
          <View style={styles.kpiGrid2x2}>
            <View style={[styles.kpiCardSquare, { borderColor: '#F59E0B' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiIcon}>👑</Text>
                <Text style={[styles.kpiNumber, { color: '#B45309' }]}>
                  {summaryData?.kpis.vipCount || 0}
                </Text>
              </View>
              <Text style={styles.kpiLabel}>شاہانہ VIP گاہک</Text>
              <Text style={styles.kpiSub}>Top 10% Spenders</Text>
            </View>

            <View style={[styles.kpiCardSquare, { borderColor: '#006C4E' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiIcon}>💎</Text>
                <Text style={[styles.kpiNumber, { color: '#006C4E' }]}>
                  {summaryData?.kpis.loyalCount || 0}
                </Text>
              </View>
              <Text style={styles.kpiLabel}>مستقل بااعتماد</Text>
              <Text style={styles.kpiSub}>Weekly Buyers</Text>
            </View>

            <View style={[styles.kpiCardSquare, { borderColor: '#EF4444' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiIcon}>⚠️</Text>
                <Text style={[styles.kpiNumber, { color: '#DC2626' }]}>
                  {summaryData?.kpis.atRiskCount || 0}
                </Text>
              </View>
              <Text style={styles.kpiLabel}>چھوٹتے ہوئے</Text>
              <Text style={styles.kpiSub}>Inactive &gt;30d</Text>
            </View>

            <View style={[styles.kpiCardSquare, { borderColor: '#8B5CF6' }]}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiIcon}>🌱</Text>
                <Text style={[styles.kpiNumber, { color: '#7C3AED' }]}>
                  {summaryData?.kpis.creditDebtorsCount || 0}
                </Text>
              </View>
              <Text style={styles.kpiLabel}>نئے و ادھار گاہک</Text>
              <Text style={styles.kpiSub}>New &amp; Credit</Text>
            </View>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'DIRECTORY' && styles.tabButtonActive]}
              onPress={() => setActiveTab('DIRECTORY')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="people"
                size={16}
                color={activeTab === 'DIRECTORY' ? '#006C4E' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'DIRECTORY' && styles.tabTextActive]}>
                گاہک درجات فہرست ({summaryData?.customers.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'STUDIO' && styles.tabButtonActive]}
              onPress={() => setActiveTab('STUDIO')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="paper-plane"
                size={16}
                color={activeTab === 'STUDIO' ? '#006C4E' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'STUDIO' && styles.tabTextActive]}>
                واٹس ایپ مہمات اسٹوڈیو
              </Text>
            </TouchableOpacity>
          </View>

          {/* Main Tab Content */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#006C4E" />
              <Text style={styles.loadingText}>گاہکوں کے درجات اور اعداد و شمار لوڈ ہو رہے ہیں...</Text>
            </View>
          ) : activeTab === 'DIRECTORY' ? (
            /* TAB 1: RFM CUSTOMERS DIRECTORY */
            <ScrollView
              style={styles.contentScrollView}
              contentContainerStyle={{ paddingBottom: Math.max(30, insets.bottom + 20) }}
              showsVerticalScrollIndicator={false}
            >
              {/* Filter Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersContent}
              >
                <TouchableOpacity
                  style={[styles.filterPill, selectedFilter === 'ALL' && styles.filterPillActive]}
                  onPress={() => setSelectedFilter('ALL')}
                >
                  <Text
                    style={[styles.filterPillText, selectedFilter === 'ALL' && styles.filterPillTextActive]}
                  >
                    سب ({summaryData?.customers.length || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, selectedFilter === 'VIP' && styles.filterPillActive]}
                  onPress={() => setSelectedFilter('VIP')}
                >
                  <Text
                    style={[styles.filterPillText, selectedFilter === 'VIP' && styles.filterPillTextActive]}
                  >
                    👑 شاہانہ ({summaryData?.kpis.vipCount || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, selectedFilter === 'LOYAL' && styles.filterPillActive]}
                  onPress={() => setSelectedFilter('LOYAL')}
                >
                  <Text
                    style={[styles.filterPillText, selectedFilter === 'LOYAL' && styles.filterPillTextActive]}
                  >
                    💎 بااعتماد ({summaryData?.kpis.loyalCount || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, selectedFilter === 'AT_RISK' && styles.filterPillActive]}
                  onPress={() => setSelectedFilter('AT_RISK')}
                >
                  <Text
                    style={[styles.filterPillText, selectedFilter === 'AT_RISK' && styles.filterPillTextActive]}
                  >
                    ⚠️ چھوٹتے ({summaryData?.kpis.atRiskCount || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, selectedFilter === 'CREDIT_DEBTOR' && styles.filterPillActive]}
                  onPress={() => setSelectedFilter('CREDIT_DEBTOR')}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedFilter === 'CREDIT_DEBTOR' && styles.filterPillTextActive,
                    ]}
                  >
                    💳 ادھار منحصر ({summaryData?.kpis.creditDebtorsCount || 0})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterPill, selectedFilter === 'NEW' && styles.filterPillActive]}
                  onPress={() => setSelectedFilter('NEW')}
                >
                  <Text
                    style={[styles.filterPillText, selectedFilter === 'NEW' && styles.filterPillTextActive]}
                  >
                    🌱 نئے ({summaryData?.kpis.newCount || 0})
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Search Bar */}
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="گاہک تلاش کریں (نام یا فون نمبر)..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Customer Cards List */}
              {filteredCustomers.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="person-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>کوئی گاہک نہیں ملا</Text>
                  <Text style={styles.emptySub}>
                    اس کیٹیگری میں کوئی خریدار موجود نہیں ہے۔ کاؤنٹر سیل میں گاہک شامل کریں۔
                  </Text>
                </View>
              ) : (
                filteredCustomers.map((cust) => {
                  const badge = getSegmentBadgeStyle(cust.segment);
                  const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
                  const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone;
                  const directChatUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
                    `السلام علیکم ${cust.name}! دکان کی جانب سے خیر سگالی کا پیغام۔`
                  )}`;

                  return (
                    <View key={cust.id} style={styles.customerCard}>
                      <View style={styles.custCardHeader}>
                        <View style={styles.custInfo}>
                          <Text style={styles.custName} numberOfLines={1}>
                            {cust.name}
                          </Text>
                          <Text style={styles.custPhone}>{cust.phone}</Text>
                        </View>
                        <View
                          style={[
                            styles.segmentTag,
                            { backgroundColor: badge.bg, borderColor: badge.border },
                          ]}
                        >
                          <Ionicons name={badge.icon as any} size={12} color={badge.text} />
                          <Text style={[styles.segmentTagText, { color: badge.text }]}>
                            {cust.segmentLabelUrdu}
                          </Text>
                        </View>
                      </View>

                      {/* RFM Metrics Grid */}
                      <View style={styles.custMetricsGrid}>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>90 دن خریداری</Text>
                          <Text style={styles.metricValue}>
                            Rs. {cust.monetarySpend90d.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>وزٹس (F)</Text>
                          <Text style={styles.metricValue}>{cust.frequency90d} بار</Text>
                        </View>
                        <View style={styles.metricItem}>
                          <Text style={styles.metricLabel}>آخری سودا (R)</Text>
                          <Text style={styles.metricValue}>
                            {cust.recencyDays === 0 ? 'آج' : `${cust.recencyDays} دن قبل`}
                          </Text>
                        </View>
                        {cust.currentBalance > 0 && (
                          <View style={styles.metricItem}>
                            <Text style={[styles.metricLabel, { color: '#DC2626' }]}>بقایا ادھار</Text>
                            <Text style={[styles.metricValue, { color: '#DC2626' }]}>
                              Rs. {cust.currentBalance.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Score Quintiles & WhatsApp Chat Action */}
                      <View style={styles.custFooterRow}>
                        <View style={styles.rfmPillsRow}>
                          <View style={styles.scorePill}>
                            <Text style={styles.scorePillText}>R:{cust.rfmScore.r}/5</Text>
                          </View>
                          <View style={styles.scorePill}>
                            <Text style={styles.scorePillText}>F:{cust.rfmScore.f}/5</Text>
                          </View>
                          <View style={styles.scorePill}>
                            <Text style={styles.scorePillText}>M:{cust.rfmScore.m}/5</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.directWhatsAppBtn}
                          onPress={() => Linking.openURL(directChatUrl)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={14} color="#047857" />
                          <Text style={styles.directWhatsAppText}>واٹس ایپ رابطہ</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          ) : (
            /* TAB 2: CAMPAIGN STUDIO */
            <ScrollView
              style={styles.contentScrollView}
              contentContainerStyle={{ paddingBottom: Math.max(30, insets.bottom + 20) }}
              showsVerticalScrollIndicator={false}
            >
              {/* 1. Store Category Selector Pills */}
              <Text style={styles.sectionHeader}>
                🏪 دکان کی کیٹیگری اور پیغام (Store Type &amp; Theme):
              </Text>
              <View style={styles.storeCategoryPillsWrap}>
                {[
                  { key: 'KARYANA', label: '🛒 Karyana / General' },
                  { key: 'PHARMACY', label: '💊 Pharmacy / Medical' },
                  { key: 'GARMENTS', label: '👕 Garments / Boutique' },
                  { key: 'ELECTRONICS', label: '📱 Mobile & Electronics' },
                  { key: 'CUSTOM', label: '✍️ Custom Message (خود لکھیں)' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.storeCategoryPill,
                      selectedStoreType === cat.key && styles.storeCategoryPillActive,
                    ]}
                    onPress={() => {
                      setSelectedStoreType(cat.key as StoreType);
                      const firstTmpl = STORE_TEMPLATES[cat.key as StoreType][0];
                      if (firstTmpl) {
                        setCustomMessageText(firstTmpl.message);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.storeCategoryPillText,
                        selectedStoreType === cat.key && styles.storeCategoryPillTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dynamic Store-Aware Templates */}
              <View style={styles.storeTemplatesWrap}>
                {STORE_TEMPLATES[selectedStoreType].map((tmpl) => {
                  const isCurrent = customMessageText === tmpl.message;
                  return (
                    <TouchableOpacity
                      key={tmpl.id}
                      style={[styles.templateCardStore, isCurrent && styles.templateCardStoreActive]}
                      onPress={() => setCustomMessageText(tmpl.message)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.templateBadge}>
                        <Text style={styles.templateBadgeText}>{tmpl.badge}</Text>
                      </View>
                      <Text style={styles.templateTitleUrdu}>{tmpl.titleUrdu}</Text>
                      <Text style={styles.templateMessagePreview} numberOfLines={2}>
                        {tmpl.message}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Target Audience Summary */}
              {previewData && (
                <View style={styles.audienceBanner}>
                  <Ionicons name="people-circle-outline" size={20} color="#006C4E" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.audienceTitle}>
                      ہدف گاہک: {previewData.totalTargeted} خریدار
                    </Text>
                    <Text style={styles.audienceSub}>
                      دکان: {previewData.storeName}
                    </Text>
                  </View>
                </View>
              )}

              {/* Editable Message Composer */}
              <View style={styles.previewBox}>
                <View style={styles.previewHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#006C4E" />
                    <Text style={styles.previewHeaderText}>
                      واٹس ایپ پیغام میں ترمیم کریں (Custom Message Editor)
                    </Text>
                  </View>
                  <View style={styles.editBadge}>
                    <Ionicons name="pencil" size={11} color="#006C4E" />
                    <Text style={styles.editBadgeText}>Editable</Text>
                  </View>
                </View>

                {/* Editable Text Area */}
                <TextInput
                  style={styles.messageComposerInput}
                  multiline
                  numberOfLines={4}
                  value={customMessageText}
                  onChangeText={setCustomMessageText}
                  placeholder="یہاں واٹس ایپ پیغام ٹائپ کریں..."
                  placeholderTextColor="#94A3B8"
                />

                {/* Clickable Variable Insertion Chips */}
                <View style={styles.variableChipsRow}>
                  <Text style={styles.variableLabel}>Insert Tags:</Text>
                  <TouchableOpacity
                    style={styles.varChip}
                    onPress={() => handleInsertVariable('{customer_name}')}
                  >
                    <Text style={styles.varChipText}>+ Customer Name</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.varChip}
                    onPress={() => handleInsertVariable('{shop_name}')}
                  >
                    <Text style={styles.varChipText}>+ Store Name</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.varChip}
                    onPress={() => handleInsertVariable('{balance}')}
                  >
                    <Text style={styles.varChipText}>+ Udhaar Balance</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.varChip}
                    onPress={() => handleInsertVariable('{pay_link}')}
                  >
                    <Text style={styles.varChipText}>+ Pay Link</Text>
                  </TouchableOpacity>
                </View>

                {/* Live Sample Preview Bubble */}
                <View style={styles.chatBubbleEvaluated}>
                  <Text style={styles.evaluatedLabel}>Live Customer Sample (پیش نظارہ):</Text>
                  <Text style={styles.chatBubbleText}>
                    {buildEvaluatedMessage('محمد علی', 3500, 'https://digihisab.pk/pay/u123')}
                  </Text>
                  <View style={styles.chatBubbleMeta}>
                    <Text style={styles.chatBubbleTime}>ابھی</Text>
                    <Ionicons name="checkmark-done" size={14} color="#10B981" />
                  </View>
                </View>

                {/* Broadcast Share Button */}
                <TouchableOpacity
                  style={styles.broadcastShareBtn}
                  onPress={handleShareBroadcast}
                  activeOpacity={0.85}
                >
                  <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.broadcastShareBtnText}>
                    تمام براڈکاسٹ لسٹ میں شیئر کریں (Share Broadcast)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Individual 1-Tap Customer Dispatch List */}
              <Text style={styles.sectionHeader}>
                🚀 انفرادی 1-ٹیپ ڈسپیچ (Personalized 1-Tap WhatsApp Dispatch):
              </Text>

              {previewData?.customers.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="mail-unread-outline" size={36} color="#CBD5E1" />
                  <Text style={styles.emptyTitle}>کوئی ہدف گاہک نہیں ملا</Text>
                  <Text style={styles.emptySub}>
                    اس مہم کے معیار پر پورا اترنے والا کوئی گاہک موجود نہیں۔
                  </Text>
                </View>
              ) : (
                previewData?.customers.map((cust) => {
                  const isSent =
                    dispatchedCustomerIds.has(cust.customerId) || !!cust.lastCampaignSentAt;

                  return (
                    <View key={cust.customerId} style={styles.dispatchRowCard}>
                      <View style={styles.dispatchRowLeft}>
                        <View style={styles.dispatchAvatar}>
                          <Text style={styles.dispatchAvatarText}>
                            {cust.customerName.charAt(0) || 'G'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.dispatchCustName} numberOfLines={1}>
                            {cust.customerName}
                          </Text>
                          <Text style={styles.dispatchCustPhone}>{cust.customerPhone}</Text>
                          <Text style={styles.dispatchCustSegment}>
                            {cust.segmentLabelUrdu}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.sendWhatsAppBtn,
                          isSent && styles.sendWhatsAppBtnSent,
                        ]}
                        onPress={() =>
                          handleDispatchWhatsApp(cust.customerId, cust.whatsappLink, cust.customerName)
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isSent ? 'checkmark-circle' : 'logo-whatsapp'}
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.sendWhatsAppBtnText}>
                          {isSent ? 'بھیجا گیا' : 'بھیجیں'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHeader: {
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
  headerTitleUrdu: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  proBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#B45309',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiStrip: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  kpiGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  kpiCardSquare: {
    width: '48.2%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  kpiScroll: {
    paddingHorizontal: 14,
    gap: 10,
  },
  kpiCard: {
    width: 105,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 8,
    alignItems: 'center',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  kpiIcon: {
    fontSize: 14,
  },
  kpiNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  kpiSub: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    gap: 6,
    minHeight: 44,
  },
  tabButtonActive: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1.5,
    borderColor: '#006C4E',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#006C4E',
    fontWeight: '800',
  },
  contentScrollView: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  filtersScroll: {
    marginBottom: 8,
  },
  filtersContent: {
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 34,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#006C4E',
    borderColor: '#006C4E',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: '#0F172A',
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  custCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  custInfo: {
    flex: 1,
    marginRight: 8,
  },
  custName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  custPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  segmentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  segmentTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  custMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  custFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  rfmPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  scorePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scorePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  directWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#006C4E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 34,
  },
  directWhatsAppText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006C4E',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 6,
    marginBottom: 8,
  },
  templatesScroll: {
    marginBottom: 12,
  },
  templatesContent: {
    gap: 10,
    paddingVertical: 2,
  },
  storeCategoryPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  storeCategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  storeCategoryPillActive: {
    backgroundColor: '#E8F5EE',
    borderColor: '#006C4E',
  },
  storeCategoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  storeCategoryPillTextActive: {
    color: '#006C4E',
    fontWeight: '800',
  },
  storeTemplatesWrap: {
    gap: 8,
    marginBottom: 12,
  },
  templateCardStore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  templateCardStoreActive: {
    borderColor: '#006C4E',
    backgroundColor: '#F0FDF4',
  },
  templateTitleUrdu: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  templateMessagePreview: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  editBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006C4E',
  },
  messageComposerInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  variableChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  variableLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  varChip: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  varChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  chatBubbleEvaluated: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  evaluatedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  templateCard: {
    width: 175,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 10,
  },
  templateCardActive: {
    borderColor: '#006C4E',
    backgroundColor: '#F0FDF4',
  },
  templateBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  templateBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  templateTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  templateTitleActive: {
    color: '#006C4E',
  },
  templateSub: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
  audienceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  audienceTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  audienceSub: {
    fontSize: 10,
    color: '#065F46',
    marginTop: 1,
  },
  previewBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  previewHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  chatBubble: {
    backgroundColor: '#DCF8C6',
    borderRadius: 12,
    borderTopLeftRadius: 0,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  chatBubbleText: {
    fontSize: 13,
    color: '#111827',
    lineHeight: 20,
    textAlign: 'right',
  },
  chatBubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  chatBubbleTime: {
    fontSize: 10,
    color: '#6B7280',
  },
  broadcastShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 46,
  },
  broadcastShareBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dispatchRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 8,
  },
  dispatchRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  dispatchAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#006C4E',
  },
  dispatchCustName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  dispatchCustPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  dispatchCustSegment: {
    fontSize: 9,
    color: '#006C4E',
    fontWeight: '700',
    marginTop: 1,
  },
  sendWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
  },
  sendWhatsAppBtnSent: {
    backgroundColor: '#64748B',
  },
  sendWhatsAppBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});
