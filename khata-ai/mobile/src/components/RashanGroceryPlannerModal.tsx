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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  rashanPlanApi,
  IRashanMonthlyPlan,
  IRashanItem,
  ICatalogStaple,
  RashanCategory,
  RashanUnit,
} from '../api/rashanPlan.api';

interface RashanGroceryPlannerModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
  onPlanUpdated?: () => void;
  onOpenPantryDepletion?: () => void;
}

type ActiveMode = 'PLANNING' | 'CHECKOUT' | 'SETTINGS';

export const RashanGroceryPlannerModal: React.FC<RashanGroceryPlannerModalProps> = ({
  visible,
  onClose,
  onShowToast,
  onPlanUpdated,
  onOpenPantryDepletion,
}) => {
  const insets = useSafeAreaInsets();
  const [activeMode, setActiveMode] = useState<ActiveMode>('PLANNING');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [plan, setPlan] = useState<IRashanMonthlyPlan | null>(null);

  // Selected Category Filter
  const [selectedCategory, setSelectedCategory] = useState<RashanCategory | 'ALL'>('ALL');

  // Budget Cap Modal State
  const [showBudgetCapModal, setShowBudgetCapModal] = useState<boolean>(false);
  const [budgetCapInput, setBudgetCapInput] = useState<string>('');

  // Catalog Browser Modal State
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);
  const [catalogList, setCatalogList] = useState<ICatalogStaple[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogCategory, setCatalogCategory] = useState<RashanCategory | 'ALL'>('ALL');

  // Add Item Modal Form State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newItemUrdu, setNewItemUrdu] = useState<string>('');
  const [newItemEnglish, setNewItemEnglish] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<RashanCategory>('GRAIN');
  const [newItemQty, setNewItemQty] = useState<string>('2');
  const [newItemUnit, setNewItemUnit] = useState<RashanUnit>('KG');
  const [newItemRate, setNewItemRate] = useState<string>('200');
  const [newItemNotes, setNewItemNotes] = useState<string>('');

  // Reconcile Settlement Modal State
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [reconcilePaymentMethod, setReconcilePaymentMethod] = useState<
    'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK'
  >('CASH');
  const [reconcileRecordToLedger, setReconcileRecordToLedger] = useState<boolean>(true);
  const [reconcileNotes, setReconcileNotes] = useState<string>('');

  // Rate/Qty Direct Inline Editor
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editRateVal, setEditRateVal] = useState<string>('');
  const [editQtyVal, setEditQtyVal] = useState<string>('');

  const fetchPlan = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rashanPlanApi.getCurrentPlan();
      setPlan(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'راشن ڈیٹا لوڈ کرنے میں مسئلہ ہوا';
      if (onShowToast) onShowToast(msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    if (visible) {
      fetchPlan();
    }
  }, [visible, fetchPlan]);

  // Open Budget Cap Modal
  const handleOpenBudgetCapModal = () => {
    if (!plan) return;
    const initialCap =
      plan.customTargetBudget && plan.customTargetBudget > 0
        ? String(plan.customTargetBudget)
        : String(plan.totalEstimatedBudget || '');
    setBudgetCapInput(initialCap);
    setShowBudgetCapModal(true);
  };

  // Save Custom Budget Cap
  const handleSaveBudgetCap = async () => {
    if (!plan) return;
    const parsed = parseFloat(budgetCapInput.replace(/,/g, ''));
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert('غلط اندراج', 'براہ کرم درست بجٹ رقم درج کریں۔');
      return;
    }
    try {
      setActionLoading(true);
      const updated = await rashanPlanApi.updateBudgetCap(plan.planId, parsed > 0 ? parsed : null);
      setPlan(updated);
      setShowBudgetCapModal(false);
      if (onPlanUpdated) onPlanUpdated();
      if (onShowToast) {
        onShowToast(
          parsed > 0
            ? `🎯 ماہانہ راشن بجٹ Rs. ${parsed.toLocaleString()} سیٹ ہو گیا`
            : 'راشن بجٹ اشیاء کے مجموعہ کے مطابق خودکار سیٹ ہو گیا'
        );
      }
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'بجٹ کیپ محفوظ نہیں ہو سکا');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Budget Cap to Auto Sum
  const handleResetBudgetCapToAuto = async () => {
    if (!plan) return;
    try {
      setActionLoading(true);
      const updated = await rashanPlanApi.updateBudgetCap(plan.planId, null);
      setPlan(updated);
      setShowBudgetCapModal(false);
      if (onPlanUpdated) onPlanUpdated();
      if (onShowToast) {
        onShowToast('راشن بجٹ اشیاء کے مطابق خودکار ری سیٹ ہو گیا');
      }
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'بجٹ ری سیٹ نہیں ہو سکا');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Staples Catalog Modal
  const handleOpenCatalog = async () => {
    setShowCatalogModal(true);
    if (catalogList.length === 0) {
      try {
        setCatalogLoading(true);
        const data = await rashanPlanApi.getCatalog();
        setCatalogList(data);
      } catch (err: any) {
        Alert.alert('خطا', err.message || 'کیٹلاگ لوڈ نہیں ہو سکا');
      } finally {
        setCatalogLoading(false);
      }
    }
  };

  // Quick Add Item from Staples Catalog
  const handleQuickAddFromCatalog = async (staple: ICatalogStaple) => {
    if (!plan) return;
    try {
      setActionLoading(true);
      const updated = await rashanPlanApi.addItem(plan.planId, {
        nameUrdu: staple.nameUrdu,
        nameEnglish: staple.nameEnglish,
        category: staple.category,
        targetQty: staple.defaultQty,
        unit: staple.unit,
        estimatedUnitRate: staple.defaultRate,
        notes: staple.notes,
      });
      setPlan(updated);
      if (onPlanUpdated) onPlanUpdated();
      if (onShowToast) {
        onShowToast(`✅ ${staple.nameUrdu} لسٹ میں شامل ہو گیا`);
      }
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'آئٹم شامل نہیں ہو سکا');
    } finally {
      setActionLoading(false);
    }
  };

  // Stepper adjustments for Target Qty (Planning Mode)
  const handleAdjustTargetQty = async (item: IRashanItem, delta: number) => {
    if (!plan) return;
    const step = item.category === 'GRAIN' && item.targetQty >= 10 ? 5 : 1;
    const newQty = Math.max(0.5, item.targetQty + delta * step);
    try {
      const updated = await rashanPlanApi.updateItem(plan.planId, item.id, {
        targetQty: newQty,
      });
      setPlan(updated);
      if (onPlanUpdated) onPlanUpdated();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'مقدار تبدیل نہیں ہو سکی');
    }
  };

  // Stepper adjustments for Actual Qty (Checkout Mode)
  const handleAdjustActualQty = async (item: IRashanItem, delta: number) => {
    if (!plan) return;
    const currentActual = item.actualQtyPurchased !== undefined ? item.actualQtyPurchased : item.targetQty;
    const newActual = Math.max(0.5, currentActual + delta);
    try {
      const updated = await rashanPlanApi.updateItem(plan.planId, item.id, {
        actualQtyPurchased: newActual,
      });
      setPlan(updated);
      if (onPlanUpdated) onPlanUpdated();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'اصل مقدار تبدیل نہیں ہو سکی');
    }
  };

  // Adjust Actual Rate (Checkout Mode)
  const handleAdjustActualRate = async (item: IRashanItem, delta: number) => {
    if (!plan) return;
    const currentRate = item.actualUnitRate !== undefined ? item.actualUnitRate : item.estimatedUnitRate;
    const newRate = Math.max(0, currentRate + delta);
    try {
      const updated = await rashanPlanApi.updateItem(plan.planId, item.id, {
        actualUnitRate: newRate,
      });
      setPlan(updated);
      if (onPlanUpdated) onPlanUpdated();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'اصل ریٹ تبدیل نہیں ہو سکا');
    }
  };

  // Fast In-Store Purchase Toggle
  const handleTogglePurchase = async (item: IRashanItem) => {
    if (!plan) return;
    const nextState = !item.isPurchased;
    try {
      const updated = await rashanPlanApi.togglePurchase(plan.planId, item.id, {
        isPurchased: nextState,
        actualQtyPurchased: item.actualQtyPurchased ?? item.targetQty,
        actualUnitRate: item.actualUnitRate ?? item.estimatedUnitRate,
      });
      setPlan(updated);
      if (onPlanUpdated) onPlanUpdated();
      if (onShowToast) {
        onShowToast(
          nextState
            ? `✅ ${item.nameUrdu} سودا باسکٹ میں شامل ہو گیا`
            : `⬜ ${item.nameUrdu} ان چیک کر دیا گیا`
        );
      }
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'سٹیٹس اپ ڈیٹ نہیں ہو سکا');
    }
  };

  // Save inline editor
  const handleSaveInlineEdit = async (item: IRashanItem) => {
    if (!plan) return;
    const updates: Partial<IRashanItem> = {};
    if (editRateVal.trim()) updates.estimatedUnitRate = parseFloat(editRateVal) || item.estimatedUnitRate;
    if (editQtyVal.trim()) updates.targetQty = parseFloat(editQtyVal) || item.targetQty;

    try {
      const updated = await rashanPlanApi.updateItem(plan.planId, item.id, updates);
      setPlan(updated);
      setEditingItemId(null);
      if (onPlanUpdated) onPlanUpdated();
      if (onShowToast) onShowToast('تفصیلات کامیابی سے محفوظ ہو گئیں');
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'تبدیلی محفوظ نہیں ہو سکی');
    }
  };

  // Add Item
  const handleAddNewItem = async () => {
    if (!plan) return;
    if (!newItemUrdu.trim() || !newItemEnglish.trim()) {
      Alert.alert('ضروری معلومات', 'براہ کرم آئٹم کا نام درج کریں۔');
      return;
    }
    const qty = parseFloat(newItemQty) || 1;
    const rate = parseFloat(newItemRate) || 100;

    try {
      setActionLoading(true);
      const updated = await rashanPlanApi.addItem(plan.planId, {
        nameUrdu: newItemUrdu.trim(),
        nameEnglish: newItemEnglish.trim(),
        category: newItemCategory,
        targetQty: qty,
        unit: newItemUnit,
        estimatedUnitRate: rate,
        notes: newItemNotes.trim() || undefined,
      });
      setPlan(updated);
      setShowAddModal(false);
      setNewItemUrdu('');
      setNewItemEnglish('');
      setNewItemNotes('');
      if (onPlanUpdated) onPlanUpdated();
      if (onShowToast) onShowToast('نیا راشن آئٹم لسٹ میں شامل ہو گیا');
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'آئٹم شامل نہیں ہو سکا');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Item
  const handleDeleteItem = (item: IRashanItem) => {
    if (!plan) return;
    Alert.alert('آئٹم حذف کریں', `کیا آپ واقعی "${item.nameUrdu}" کو لسٹ سے ہٹانا چاہتے ہیں؟`, [
      { text: 'نہیں', style: 'cancel' },
      {
        text: 'ہاں، ہٹائیں',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await rashanPlanApi.deleteItem(plan.planId, item.id);
            setPlan(updated);
            if (onPlanUpdated) onPlanUpdated();
            if (onShowToast) onShowToast('آئٹم لسٹ سے ہٹا دیا گیا');
          } catch (err: any) {
            Alert.alert('خطا', err.message || 'آئٹم حذف نہیں ہو سکا');
          }
        },
      },
    ]);
  };

  // Reset to Defaults with Household Size
  const handleResetHousehold = async (size: number) => {
    if (!plan) return;
    Alert.alert(
      'راشن لسٹ ری سیٹ کریں',
      `کیا آپ ${size} افراد کے فیملی بجٹ کے مطابق بنیادی راشن اشیاء ری سیٹ کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'ری سیٹ کریں',
          onPress: async () => {
            try {
              setActionLoading(true);
              const updated = await rashanPlanApi.resetDefaults(plan.planId, size);
              setPlan(updated);
              if (onPlanUpdated) onPlanUpdated();
              if (onShowToast) onShowToast(`${size} افراد کے حساب سے راشن رجسٹر ری سیٹ ہو گیا`);
            } catch (err: any) {
              Alert.alert('خطا', err.message || 'ری سیٹ نہیں ہو سکا');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Share via WhatsApp
  const handleShareWhatsApp = async () => {
    if (!plan) return;
    const text = plan.whatsAppText;
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message: text });
      }
    } catch {
      await Share.share({ message: text });
    }
  };

  // Reconcile and Post to Ledger
  const handleReconcile = async () => {
    if (!plan) return;
    try {
      setActionLoading(true);
      const res = await rashanPlanApi.reconcilePlan(plan.planId, {
        paymentMethod: reconcilePaymentMethod,
        recordToLedger: reconcileRecordToLedger,
        notes: reconcileNotes.trim() || undefined,
      });
      setPlan(res.plan);
      setShowReconcileModal(false);
      if (onPlanUpdated) onPlanUpdated();
      Alert.alert(
        'خریداری مکمل',
        `ماہانہ راشن کا کل خرچ Rs. ${res.plan.totalActualSpent.toLocaleString()} کھاتے میں درج کر دیا گیا ہے۔`
      );
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'حساب مکمل نہیں ہو سکا');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (!plan) return [];
    if (selectedCategory === 'ALL') return plan.items;
    return plan.items.filter((i) => i.category === selectedCategory);
  }, [plan, selectedCategory]);

  // Filtered Catalog Items
  const filteredCatalog = useMemo(() => {
    let list = catalogList;
    if (catalogCategory !== 'ALL') {
      list = list.filter((item) => item.category === catalogCategory);
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.nameUrdu.toLowerCase().includes(q) ||
          item.nameEnglish.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [catalogList, catalogCategory, catalogSearch]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="cart-outline" size={20} color="#10B981" />
              <Text style={styles.headerTitle}>ماہانہ راشن و سودا سلف رجسٹر</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Monthly Rashan & Grocery Envelope Planner • {plan?.monthKey || '2026-10'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleShareWhatsApp}
            style={styles.whatsAppHeaderBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#22C55E" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>راشن لسٹ لوڈ کی جا رہی ہے...</Text>
          </View>
        ) : !plan ? (
          <View style={styles.centerLoading}>
            <Text style={styles.emptyTitle}>راشن ڈیٹا دستیاب نہیں</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={fetchPlan}>
              <Text style={styles.primaryBtnText}>دوبارہ کوشش کریں</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Summary Header Strip (3 Key Metric Blocks) */}
            <View style={styles.metricsContainer}>
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  styles.metricCardEst,
                  Boolean(plan.customTargetBudget && plan.customTargetBudget > 0) &&
                    styles.metricCardCustomCap,
                ]}
                onPress={handleOpenBudgetCapModal}
                activeOpacity={0.75}
              >
                <View style={styles.metricLabelRow}>
                  <Text style={styles.metricLabel}>
                    {plan.customTargetBudget && plan.customTargetBudget > 0
                      ? 'مقررہ بجٹ'
                      : 'تخمینہ بجٹ'}
                  </Text>
                  <Ionicons name="pencil" size={11} color="#38BDF8" />
                </View>
                <Text style={styles.metricValEst}>
                  Rs. {(plan.effectiveBudget ?? plan.totalEstimatedBudget).toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>
                  {plan.customTargetBudget && plan.customTargetBudget > 0
                    ? `اشیاء: Rs. ${plan.totalEstimatedBudget.toLocaleString()}`
                    : 'اشیاء مجموعہ ✏️ سیٹ کریں'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.metricCard, styles.metricCardAct]}>
                <Text style={styles.metricLabel}>اصل خرچہ</Text>
                <Text style={styles.metricValAct}>
                  Rs. {plan.totalActualSpent.toLocaleString()}
                </Text>
                <Text style={styles.metricSub}>Live Spent</Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  plan.netVariance > 0 ? styles.metricCardDeficit : styles.metricCardSurplus,
                ]}
              >
                <Text style={styles.metricLabel}>
                  {plan.netVariance > 0 ? '⚠️ بجٹ تجاوز' : 'بچت / کفایت'}
                </Text>
                <Text
                  style={[
                    styles.metricValVariance,
                    { color: plan.netVariance > 0 ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {plan.netVariance > 0
                    ? `+Rs. ${plan.netVariance.toLocaleString()}`
                    : `Rs. ${Math.abs(plan.netVariance).toLocaleString()}`}
                </Text>
                <Text style={styles.metricSub}>
                  {plan.netVariance > 0 ? 'Exceeded Budget' : 'Remaining / Saved'}
                </Text>
              </View>
            </View>

            {/* 2. Live Envelope Health Progress Bar */}
            <View style={styles.healthBarContainer}>
              <View style={styles.healthBarHeader}>
                <View style={styles.healthHeaderTitleRow}>
                  <Ionicons
                    name={plan.envelopePercentageUsed > 100 ? 'alert-circle' : 'shield-checkmark'}
                    size={16}
                    color={
                      plan.envelopePercentageUsed > 100
                        ? '#EF4444'
                        : plan.envelopePercentageUsed > 80
                        ? '#F59E0B'
                        : '#10B981'
                    }
                  />
                  <Text style={styles.healthBarTitle}>ماہانہ راشن اینولپ ہیلتھ (Health Radar)</Text>
                </View>
                <Text style={styles.healthBarPct}>{plan.envelopePercentageUsed}% خرچ ہوا</Text>
              </View>

              <View style={styles.healthBarTrack}>
                <View
                  style={[
                    styles.healthBarFill,
                    {
                      width: `${Math.min(100, plan.envelopePercentageUsed)}%`,
                      backgroundColor:
                        plan.envelopePercentageUsed > 100
                          ? '#EF4444'
                          : plan.envelopePercentageUsed > 80
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                />
              </View>

              <View style={styles.healthBarFooter}>
                <Text style={styles.healthFooterLeft}>
                  سودا باسکٹ: {plan.purchasedItemsCount} / {plan.totalItemsCount} اشیاء خریدی گئیں
                </Text>
                <Text style={styles.healthFooterRight}>
                  {plan.netVariance > 0
                    ? `تجاوز: Rs. ${plan.netVariance.toLocaleString()}`
                    : `باقی رقم: Rs. ${plan.remainingBudget.toLocaleString()}`}
                </Text>
              </View>
            </View>

            {/* In-Store Deficit Alert Banner (if any items have deficit) */}
            {plan.deficitItemsCount > 0 && (
              <View style={styles.deficitBanner}>
                <Ionicons name="warning" size={20} color="#F87171" />
                <View style={styles.deficitBannerTextWrap}>
                  <Text style={styles.deficitBannerTitle}>
                    بجٹ الرٹ: {plan.deficitItemsCount} اشیاء متوقع ریٹ سے زائد خریدی گئیں!
                  </Text>
                  <Text style={styles.deficitBannerSub}>
                    مارکیٹ ریٹ بڑھنے کی وجہ سے بجٹ میں اضافی بوجھ پڑا ہے۔
                  </Text>
                </View>
              </View>
            )}

            {/* Quick Action Banner: Pantry Depletion & Auto-Restock Checklist */}
            {Boolean(onOpenPantryDepletion) && (
              <TouchableOpacity
                style={styles.pantryRestockBanner}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    onOpenPantryDepletion?.();
                  }, 250);
                }}
                activeOpacity={0.82}
              >
                <View style={styles.pantryRestockLeft}>
                  <View style={styles.pantryRestockIconWrap}>
                    <Ionicons name="hourglass" size={18} color="#00d49f" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.pantryRestockTitle}>
                        راشن بچت و پیشگوئی (Pantry Restock)
                      </Text>
                      <View style={styles.pantryLiveBadge}>
                        <Text style={styles.pantryLiveBadgeText}>3 دن قبل الرٹ</Text>
                      </View>
                    </View>
                    <Text style={styles.pantryRestockSub}>
                      خاندان کے استعمال مطابق آٹا، گھی، چینی ختم ہونے کی تاریخ و واٹس ایپ چیک لسٹ
                    </Text>
                  </View>
                </View>
                <View style={styles.pantryRestockArrow}>
                  <Ionicons name="chevron-forward" size={18} color="#00d49f" />
                </View>
              </TouchableOpacity>
            )}

            {/* 3. Mode Switcher Tabs */}
            <View style={styles.modeTabBar}>
              <TouchableOpacity
                style={[
                  styles.modeTabBtn,
                  activeMode === 'PLANNING' && styles.modeTabBtnActive,
                ]}
                onPress={() => setActiveMode('PLANNING')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={16}
                  color={activeMode === 'PLANNING' ? '#10B981' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.modeTabBtnText,
                    activeMode === 'PLANNING' && styles.modeTabBtnTextActive,
                  ]}
                >
                  پلاننگ موڈ (Plan)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTabBtn,
                  activeMode === 'CHECKOUT' && styles.modeTabBtnActiveCheckout,
                ]}
                onPress={() => setActiveMode('CHECKOUT')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="basket-outline"
                  size={16}
                  color={activeMode === 'CHECKOUT' ? '#38BDF8' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.modeTabBtnText,
                    activeMode === 'CHECKOUT' && styles.modeTabBtnTextActiveCheckout,
                  ]}
                >
                  سودا سلف موڈ (In-Store)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTabBtn,
                  activeMode === 'SETTINGS' && styles.modeTabBtnActive,
                ]}
                onPress={() => setActiveMode('SETTINGS')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={activeMode === 'SETTINGS' ? '#10B981' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.modeTabBtnText,
                    activeMode === 'SETTINGS' && styles.modeTabBtnTextActive,
                  ]}
                >
                  افرادِ خانہ ({plan.householdSize})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Mode Content: SETTINGS TAB */}
            {activeMode === 'SETTINGS' && (
              <View style={styles.settingsSection}>
                <Text style={styles.settingsSectionTitle}>
                  افرادِ خانہ کے مطابق راشن پیمانہ سیٹ کریں
                </Text>
                <Text style={styles.settingsSectionSub}>
                  فیملی سائز منتخب کرنے پر آٹا، گھی، چینی اور دالوں کا متوقع راشن خودکار طور پر
                  کیلکولیٹ ہو جائے گا۔
                </Text>

                <View style={styles.householdChipsRow}>
                  {[3, 4, 5, 6, 8, 10].map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.householdChip,
                        plan.householdSize === size && styles.householdChipActive,
                      ]}
                      onPress={() => handleResetHousehold(size)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.householdChipText,
                          plan.householdSize === size && styles.householdChipTextActive,
                        ]}
                      >
                        {size} افراد {size === 5 ? '(معیاری)' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Settle / Reconcile Action Button */}
                <View style={styles.settingsActionsCard}>
                  <Text style={styles.settingsCardTitle}>ماہانہ راشن خریداری فائنل کریں</Text>
                  <Text style={styles.settingsCardSub}>
                    تمام خریداری مکمل ہونے کے بعد کل خرچ کھاتے (Household Ledger) میں بطور کیش آؤٹ درج
                    کریں۔
                  </Text>
                  <TouchableOpacity
                    style={styles.reconcileBtn}
                    onPress={() => setShowReconcileModal(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="receipt" size={18} color="#FFFFFF" />
                    <Text style={styles.reconcileBtnText}>
                      💵 خریداری فائنل کریں (Rs. {plan.totalActualSpent.toLocaleString()})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Category Filter Chips for Planning & Checkout */}
            {activeMode !== 'SETTINGS' && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.catChipsScroll}
                contentContainerStyle={styles.catChipsContainer}
              >
                {[
                  { key: 'ALL', label: 'تمام اشیاء' },
                  { key: 'GRAIN', label: '🌾 اناج و آٹا' },
                  { key: 'OIL_GHEE', label: '🛢️ تیل و گھی' },
                  { key: 'SWEETENER', label: '☕ چینی و چائے' },
                  { key: 'SPICE', label: '🧂 مصالحہ جات' },
                  { key: 'PULSE', label: '🥣 دالیں' },
                  { key: 'CLEANING', label: '🧼 صفائی و ڈیٹرجنٹ' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.catChip,
                      selectedCategory === cat.key && styles.catChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.key as any)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        selectedCategory === cat.key && styles.catChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Item Rows / Cards */}
            {activeMode !== 'SETTINGS' && (
              <View style={styles.itemsGrid}>
                {filteredItems.map((item) => {
                  const isChecked = item.isPurchased;
                  const isEditing = editingItemId === item.id;
                  const itemActualTotal = item.actualTotal;
                  const itemEstTotal = item.estimatedTotal;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.itemCard,
                        isChecked && styles.itemCardPurchased,
                        item.isDeficit && styles.itemCardDeficit,
                      ]}
                    >
                      {/* Item Header */}
                      <View style={styles.itemHeader}>
                        <TouchableOpacity
                          style={styles.checkboxTouch}
                          onPress={() => handleTogglePurchase(item)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isChecked ? 'checkbox' : 'square-outline'}
                            size={24}
                            color={isChecked ? '#10B981' : '#64748B'}
                          />
                        </TouchableOpacity>

                        <View style={styles.itemTitleBlock}>
                          <View style={styles.itemTitleLine}>
                            <Text
                              style={[
                                styles.itemNameUrdu,
                                isChecked && styles.itemNameStrikethrough,
                              ]}
                            >
                              {item.nameUrdu}
                            </Text>
                            {item.isDeficit && (
                              <View style={styles.deficitBadge}>
                                <Text style={styles.deficitBadgeText}>
                                  +{item.variancePercentage}% ریٹ زائد
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.itemNameEnglish}>{item.nameEnglish}</Text>
                        </View>

                        {/* Delete or Edit Icon */}
                        {activeMode === 'PLANNING' && (
                          <TouchableOpacity
                            onPress={() => handleDeleteItem(item)}
                            style={styles.trashBtn}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Planning Mode Steppers and Rates */}
                      {activeMode === 'PLANNING' && (
                        <View style={styles.planningControlsWrap}>
                          {/* Stepper for Quantity */}
                          <View style={styles.qtyStepperRow}>
                            <Text style={styles.stepperLabel}>مقدار (Qty):</Text>
                            <View style={styles.stepperBox}>
                              <TouchableOpacity
                                style={styles.stepperBtn}
                                onPress={() => handleAdjustTargetQty(item, -1)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="remove" size={16} color="#F8FAFC" />
                              </TouchableOpacity>
                              <Text style={styles.stepperVal}>
                                {item.targetQty} {item.unit}
                              </Text>
                              <TouchableOpacity
                                style={styles.stepperBtn}
                                onPress={() => handleAdjustTargetQty(item, 1)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="add" size={16} color="#F8FAFC" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Unit Rate & Subtotal */}
                          <View style={styles.rateSubtotalRow}>
                            <TouchableOpacity
                              style={styles.ratePill}
                              onPress={() => {
                                setEditingItemId(item.id);
                                setEditRateVal(String(item.estimatedUnitRate));
                                setEditQtyVal(String(item.targetQty));
                              }}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.ratePillLabel}>
                                ریٹ: Rs. {item.estimatedUnitRate} / {item.unit}
                              </Text>
                              <Ionicons name="pencil" size={12} color="#38BDF8" />
                            </TouchableOpacity>

                            <Text style={styles.itemSubtotal}>
                              کل: Rs. {itemEstTotal.toLocaleString()}
                            </Text>
                          </View>

                          {/* Inline Quick Editor if open */}
                          {isEditing && (
                            <View style={styles.inlineEditorCard}>
                              <Text style={styles.inlineEditorTitle}>آئٹم ریٹ و مقدار سیٹ کریں</Text>
                              <View style={styles.inlineInputsRow}>
                                <View style={styles.inlineInputWrap}>
                                  <Text style={styles.inlineInputLabel}>ریٹ (Rs)</Text>
                                  <TextInput
                                    style={styles.inlineInput}
                                    value={editRateVal}
                                    onChangeText={setEditRateVal}
                                    keyboardType="numeric"
                                  />
                                </View>
                                <View style={styles.inlineInputWrap}>
                                  <Text style={styles.inlineInputLabel}>مقدار ({item.unit})</Text>
                                  <TextInput
                                    style={styles.inlineInput}
                                    value={editQtyVal}
                                    onChangeText={setEditQtyVal}
                                    keyboardType="numeric"
                                  />
                                </View>
                              </View>
                              <View style={styles.inlineBtnRow}>
                                <TouchableOpacity
                                  style={styles.inlineCancelBtn}
                                  onPress={() => setEditingItemId(null)}
                                >
                                  <Text style={styles.inlineCancelText}>منسوخ</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.inlineSaveBtn}
                                  onPress={() => handleSaveInlineEdit(item)}
                                >
                                  <Text style={styles.inlineSaveText}>محفوظ کریں</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      )}

                      {/* In-Store Checkout Mode Controls */}
                      {activeMode === 'CHECKOUT' && (
                        <View style={styles.checkoutControlsWrap}>
                          <View style={styles.checkoutMetricsRow}>
                            {/* Actual Qty Adjustment */}
                            <View style={styles.checkoutCol}>
                              <Text style={styles.checkoutColLabel}>خریدی گئی مقدار</Text>
                              <View style={styles.checkoutStepper}>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => handleAdjustActualQty(item, -0.5)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="remove" size={14} color="#F8FAFC" />
                                </TouchableOpacity>
                                <Text style={styles.miniStepperVal}>
                                  {item.actualQtyPurchased ?? item.targetQty} {item.unit}
                                </Text>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => handleAdjustActualQty(item, 0.5)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="add" size={14} color="#F8FAFC" />
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* Actual Rate Adjustment */}
                            <View style={styles.checkoutCol}>
                              <Text style={styles.checkoutColLabel}>دکاندار کا ریٹ</Text>
                              <View style={styles.checkoutStepper}>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => handleAdjustActualRate(item, -10)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="remove" size={14} color="#F8FAFC" />
                                </TouchableOpacity>
                                <Text style={styles.miniStepperVal}>
                                  Rs. {item.actualUnitRate ?? item.estimatedUnitRate}
                                </Text>
                                <TouchableOpacity
                                  style={styles.miniStepperBtn}
                                  onPress={() => handleAdjustActualRate(item, 10)}
                                  activeOpacity={0.7}
                                >
                                  <Ionicons name="add" size={14} color="#F8FAFC" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>

                          {/* Pricing Comparison Line */}
                          <View style={styles.checkoutComparisonLine}>
                            <Text style={styles.compEstText}>
                              تخمینہ: Rs. {itemEstTotal.toLocaleString()}
                            </Text>
                            <Text
                              style={[
                                styles.compActText,
                                item.isDeficit && { color: '#EF4444', fontWeight: 'bold' },
                              ]}
                            >
                              اصل خرچ: Rs. {itemActualTotal.toLocaleString()}
                            </Text>
                          </View>

                          {/* Deficit Banner for this item */}
                          {item.isDeficit && (
                            <View style={styles.itemDeficitAlert}>
                              <Ionicons name="alert-circle" size={14} color="#EF4444" />
                              <Text style={styles.itemDeficitText}>
                                متوقع رقم سے Rs. {item.variance.toLocaleString()} زائد
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Quick Add Actions (Planning Mode) */}
            {activeMode === 'PLANNING' && (
              <View style={styles.addActionsContainer}>
                {/* 1. Fast Staples Catalog Browser Button */}
                <TouchableOpacity
                  style={styles.browseCatalogBtn}
                  onPress={handleOpenCatalog}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cart" size={18} color="#0F172A" />
                  <Text style={styles.browseCatalogBtnText}>
                    🛒 عام راشن کیٹلاگ سے منتخب کریں (38 اشیاء)
                  </Text>
                </TouchableOpacity>

                {/* 2. Custom Item Button */}
                <TouchableOpacity
                  style={styles.addCustomItemBtn}
                  onPress={() => setShowAddModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#38BDF8" />
                  <Text style={styles.addCustomItemText}>
                    + نیا کسٹم آئٹم بنائیں (Add Custom Item)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Spacer for bottom sticky action bar */}
            <View style={{ height: 110 + insets.bottom }} />
          </ScrollView>
        )}

        {/* 4. Bottom Sticky Action Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Quick Mode Toggle Pill */}
          <TouchableOpacity
            style={styles.bottomModeBtn}
            onPress={() =>
              setActiveMode((prev) => (prev === 'PLANNING' ? 'CHECKOUT' : 'PLANNING'))
            }
            activeOpacity={0.85}
          >
            <Ionicons
              name={activeMode === 'PLANNING' ? 'basket' : 'clipboard'}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.bottomModeBtnText}>
              {activeMode === 'PLANNING' ? '🛒 سودا سلف موڈ' : '📋 پلاننگ موڈ'}
            </Text>
          </TouchableOpacity>

          {/* WhatsApp Share Button */}
          <TouchableOpacity
            style={styles.bottomWhatsAppBtn}
            onPress={handleShareWhatsApp}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
            <Text style={styles.bottomWhatsAppBtnText}>واٹس ایپ لسٹ</Text>
          </TouchableOpacity>

          {/* Settle / Reconcile Button */}
          <TouchableOpacity
            style={styles.bottomSettleBtn}
            onPress={() => setShowReconcileModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" />
            <Text style={styles.bottomSettleBtnText}>فائنل بل</Text>
          </TouchableOpacity>
        </View>

        {/* ================= MODAL: ADD CUSTOM ITEM ================= */}
        <Modal
          visible={showAddModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>نیا راشن آئٹم شامل کریں</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Urdu Name */}
                <Text style={styles.dialogInputLabel}>آئٹم کا نام (اردو):</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="مثال: لال لوبیا / گرم مصالحہ"
                  placeholderTextColor="#64748B"
                  value={newItemUrdu}
                  onChangeText={setNewItemUrdu}
                />

                {/* English Name */}
                <Text style={styles.dialogInputLabel}>Item Name (English):</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="e.g. Red Beans (Lobia)"
                  placeholderTextColor="#64748B"
                  value={newItemEnglish}
                  onChangeText={setNewItemEnglish}
                />

                {/* Category Picker Chips */}
                <Text style={styles.dialogInputLabel}>کیٹگری (Category):</Text>
                <View style={styles.catPickerRow}>
                  {[
                    { key: 'GRAIN', label: 'اناج' },
                    { key: 'OIL_GHEE', label: 'تیل/گھی' },
                    { key: 'PULSE', label: 'دالیں' },
                    { key: 'SWEETENER', label: 'چینی/چائے' },
                    { key: 'SPICE', label: 'مصالحہ' },
                    { key: 'CLEANING', label: 'صفائی' },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.catPickerChip,
                        newItemCategory === c.key && styles.catPickerChipActive,
                      ]}
                      onPress={() => setNewItemCategory(c.key as any)}
                    >
                      <Text
                        style={[
                          styles.catPickerChipText,
                          newItemCategory === c.key && styles.catPickerChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quantity & Unit Row */}
                <View style={styles.dialogGridRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.dialogInputLabel}>مقدار (Qty):</Text>
                    <TextInput
                      style={styles.dialogInput}
                      placeholder="2"
                      placeholderTextColor="#64748B"
                      keyboardType="numeric"
                      value={newItemQty}
                      onChangeText={setNewItemQty}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dialogInputLabel}>یونٹ (Unit):</Text>
                    <View style={styles.unitChipRow}>
                      {(['KG', 'LITRE', 'PACK', 'GRAM'] as RashanUnit[]).map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[
                            styles.unitChip,
                            newItemUnit === u && styles.unitChipActive,
                          ]}
                          onPress={() => setNewItemUnit(u)}
                        >
                          <Text
                            style={[
                              styles.unitChipText,
                              newItemUnit === u && styles.unitChipTextActive,
                            ]}
                          >
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Estimated Rate */}
                <Text style={styles.dialogInputLabel}>متوقع فی یونٹ ریٹ (Rs):</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="250"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={newItemRate}
                  onChangeText={setNewItemRate}
                />

                {/* Notes */}
                <Text style={styles.dialogInputLabel}>اضافی تفصیل یا برانڈ:</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="اختیاری نوٹ"
                  placeholderTextColor="#64748B"
                  value={newItemNotes}
                  onChangeText={setNewItemNotes}
                />

                <TouchableOpacity
                  style={styles.dialogSubmitBtn}
                  onPress={handleAddNewItem}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogSubmitBtnText}>لسٹ میں شامل کریں</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: RECONCILE / SETTLE ================= */}
        <Modal
          visible={showReconcileModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowReconcileModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>راشن بل کی ادائیگی و اندراج</Text>
                <TouchableOpacity onPress={() => setShowReconcileModal(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.reconcileSummaryBox}>
                <Text style={styles.reconcileSummaryLabel}>کل اصل خرچہ (Total Spend):</Text>
                <Text style={styles.reconcileSummaryVal}>
                  Rs. {plan?.totalActualSpent.toLocaleString()}
                </Text>
                <Text style={styles.reconcileSummarySub}>
                  خریدی گئی اشیاء: {plan?.purchasedItemsCount} / {plan?.totalItemsCount}
                </Text>
              </View>

              {/* Payment Channel */}
              <Text style={styles.dialogInputLabel}>ادائیگی کا ذریعہ (Payment Channel):</Text>
              <View style={styles.paymentMethodsRow}>
                {[
                  { key: 'CASH', label: '💵 کیش گلا' },
                  { key: 'JAZZCASH', label: '📱 JazzCash' },
                  { key: 'EASYPAISA', label: '📱 EasyPaisa' },
                  { key: 'BANK', label: '🏦 بینک ٹرانسفر' },
                ].map((pm) => (
                  <TouchableOpacity
                    key={pm.key}
                    style={[
                      styles.paymentMethodChip,
                      reconcilePaymentMethod === pm.key && styles.paymentMethodChipActive,
                    ]}
                    onPress={() => setReconcilePaymentMethod(pm.key as any)}
                  >
                    <Text
                      style={[
                        styles.paymentMethodText,
                        reconcilePaymentMethod === pm.key && styles.paymentMethodTextActive,
                      ]}
                    >
                      {pm.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Post to Ledger Checkbox */}
              <TouchableOpacity
                style={styles.ledgerCheckRow}
                onPress={() => setReconcileRecordToLedger((p) => !p)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={reconcileRecordToLedger ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={reconcileRecordToLedger ? '#10B981' : '#64748B'}
                />
                <Text style={styles.ledgerCheckText}>
                  گھریلو حساب کتاب (Household Ledger) میں کیش آؤٹ خرچہ درج کریں
                </Text>
              </TouchableOpacity>

              {/* Additional notes */}
              <Text style={styles.dialogInputLabel}>تفصیل یا دکان کا نام:</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="مثال: المدینہ سپر سٹور راشن خریداری"
                placeholderTextColor="#64748B"
                value={reconcileNotes}
                onChangeText={setReconcileNotes}
              />

              <TouchableOpacity
                style={[styles.dialogSubmitBtn, { backgroundColor: '#10B981' }]}
                onPress={handleReconcile}
                disabled={actionLoading}
                activeOpacity={0.85}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.dialogSubmitBtnText}>ادائیگی تصدیق و محفوظ کریں</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: BUDGET CAP / TARGET MONTHLY BUDGET ================= */}
        <Modal
          visible={showBudgetCapModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowBudgetCapModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="calculator-outline" size={20} color="#38BDF8" />
                  <Text style={styles.dialogTitle}>ماہانہ راشن بجٹ مقرر کریں</Text>
                </View>
                <TouchableOpacity onPress={() => setShowBudgetCapModal(false)}>
                  <Ionicons name="close" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.capModalSubtitle}>
                اپنے گھرانے کے راشن کا مخصوص ماہانہ بجٹ (Budget Cap) فکس کریں تاکہ سودا سلف خریدتے وقت تجاوز پر الرٹ مل سکے۔
              </Text>

              {/* Current Auto-calculated items sum */}
              <View style={styles.capCurrentSumCard}>
                <Text style={styles.capCurrentSumLabel}>اشیاء کا خودکار مجموعہ:</Text>
                <Text style={styles.capCurrentSumVal}>
                  Rs. {plan?.totalEstimatedBudget.toLocaleString()}
                </Text>
              </View>

              {/* Input for Custom Budget */}
              <Text style={styles.dialogInputLabel}>مقررہ بجٹ کی حد (Target Budget Cap):</Text>
              <View style={styles.currencyInputRow}>
                <View style={styles.currencyPrefix}>
                  <Text style={styles.currencyPrefixText}>Rs.</Text>
                </View>
                <TextInput
                  style={styles.currencyInput}
                  placeholder={String(plan?.totalEstimatedBudget || '25000')}
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={budgetCapInput}
                  onChangeText={setBudgetCapInput}
                />
              </View>

              {/* Fast Presets Chips */}
              <Text style={[styles.dialogInputLabel, { marginTop: 12 }]}>فوری تجاویز (Quick Presets):</Text>
              <View style={styles.capPresetsRow}>
                {[15000, 20000, 25000, 30000, 35000, 40000].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.capPresetChip,
                      budgetCapInput === String(preset) && styles.capPresetChipActive,
                    ]}
                    onPress={() => setBudgetCapInput(String(preset))}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.capPresetChipText,
                        budgetCapInput === String(preset) && styles.capPresetChipTextActive,
                      ]}
                    >
                      Rs. {preset / 1000}k
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={{ gap: 8, marginTop: 18 }}>
                <TouchableOpacity
                  style={[styles.dialogSubmitBtn, { backgroundColor: '#38BDF8', marginTop: 0 }]}
                  onPress={handleSaveBudgetCap}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#0F172A" />
                  ) : (
                    <Text style={[styles.dialogSubmitBtnText, { color: '#0F172A' }]}>
                      💾 بجٹ کیپ محفوظ کریں (Save Cap)
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetCapBtn}
                  onPress={handleResetBudgetCapToAuto}
                  disabled={actionLoading}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={16} color="#94A3B8" />
                  <Text style={styles.resetCapBtnText}>
                    اشیاء کے مطابق خودکار رکھیں (Rs. {plan?.totalEstimatedBudget.toLocaleString()})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL: STAPLES CATALOG BROWSER ================= */}
        <Modal
          visible={showCatalogModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCatalogModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.dialogCard, { height: '88%', maxHeight: '88%', paddingHorizontal: 14 }]}>
              {/* Header */}
              <View style={styles.dialogHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="cart-outline" size={20} color="#10B981" />
                    <Text style={styles.dialogTitle}>عام راشن کیٹلاگ (38 اشیاء)</Text>
                  </View>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>
                    پاکستانی گھرانوں کی عام گروسری 1 کلک میں راشن لسٹ میں شامل کریں
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowCatalogModal(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Search Box */}
              <View style={styles.catalogSearchWrap}>
                <Ionicons name="search" size={16} color="#64748B" />
                <TextInput
                  style={styles.catalogSearchInput}
                  placeholder="تلاش کریں (بیسن، ہلدی، صابن، دال، آٹا...)"
                  placeholderTextColor="#64748B"
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                />
                {catalogSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCatalogSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Filter Chips */}
              <View style={{ maxHeight: 42, marginBottom: 10 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                >
                  {[
                    { key: 'ALL', label: 'تمام' },
                    { key: 'GRAIN', label: '🌾 اناج و آٹا' },
                    { key: 'OIL_GHEE', label: '🛢️ تیل و گھی' },
                    { key: 'PULSE', label: '🥣 دالیں' },
                    { key: 'SWEETENER', label: '☕ چینی و چائے' },
                    { key: 'SPICE', label: '🧂 مصالحہ جات' },
                    { key: 'CLEANING', label: '🧼 صفائی و واشنگ' },
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.catalogCatChip,
                        catalogCategory === c.key && styles.catalogCatChipActive,
                      ]}
                      onPress={() => setCatalogCategory(c.key as any)}
                    >
                      <Text
                        style={[
                          styles.catalogCatChipText,
                          catalogCategory === c.key && styles.catalogCatChipTextActive,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Catalog Items List */}
              {catalogLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#10B981" />
                  <Text style={{ color: '#94A3B8', marginTop: 10, fontSize: 13 }}>
                    کیٹلاگ لوڈ ہو رہا ہے...
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                  {filteredCatalog.map((staple) => {
                    const isAdded = Boolean(
                      plan?.items.some(
                        (i) =>
                          i.nameUrdu.trim().toLowerCase() === staple.nameUrdu.trim().toLowerCase() ||
                          i.nameEnglish.trim().toLowerCase() === staple.nameEnglish.trim().toLowerCase()
                      )
                    );

                    return (
                      <View
                        key={staple.id}
                        style={[
                          styles.catalogItemCard,
                          isAdded && styles.catalogItemCardAdded,
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.catalogItemTitleUrdu}>{staple.nameUrdu}</Text>
                            {isAdded && (
                              <View style={styles.alreadyAddedBadge}>
                                <Text style={styles.alreadyAddedBadgeText}>لسٹ میں ہے</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.catalogItemTitleEng}>{staple.nameEnglish}</Text>
                          <Text style={styles.catalogItemMeta}>
                            معیاری مقدار: {staple.defaultQty} {staple.unit} • ریٹ: Rs. {staple.defaultRate} / {staple.unit}
                          </Text>
                          {Boolean(staple.notes) && (
                            <Text style={styles.catalogItemNotes}>💡 {staple.notes}</Text>
                          )}
                        </View>

                        {isAdded ? (
                          <View style={styles.addedPill}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.addedPillText}>شامل ہے</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.quickAddBtn}
                            onPress={() => handleQuickAddFromCatalog(staple)}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="add" size={16} color="#0F172A" />
                            <Text style={styles.quickAddBtnText}>شامل کریں</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                  {filteredCatalog.length === 0 && (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 13 }}>کوئی آئٹم نہیں ملا</Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  whatsAppHeaderBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
  },
  // 3 Metric Blocks
  metricsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricCardEst: {
    borderColor: '#38BDF8',
  },
  metricCardCustomCap: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  metricCardAct: {
    borderColor: '#64748B',
  },
  metricCardSurplus: {
    borderColor: '#10B981',
  },
  metricCardDeficit: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  metricValEst: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#38BDF8',
    marginTop: 4,
  },
  metricValAct: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  metricValVariance: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  // Envelope Health Progress Bar
  healthBarContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  healthBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  healthBarTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  healthBarPct: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  healthBarTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  healthFooterLeft: {
    color: '#94A3B8',
    fontSize: 11,
  },
  healthFooterRight: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '600',
  },
  // In-Store Deficit Banner
  deficitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  deficitBannerTextWrap: {
    flex: 1,
  },
  deficitBannerTitle: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '700',
  },
  deficitBannerSub: {
    color: '#F87171',
    fontSize: 10,
    marginTop: 2,
  },
  // Mode Tab Bar
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  modeTabBtnActive: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modeTabBtnActiveCheckout: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  modeTabBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  modeTabBtnTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  modeTabBtnTextActiveCheckout: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  // Category Chips
  catChipsScroll: {
    marginBottom: 12,
  },
  catChipsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  catChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  // Items Grid
  itemsGrid: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemCardPurchased: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  itemCardDeficit: {
    borderColor: '#EF4444',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxTouch: {
    paddingRight: 10,
  },
  itemTitleBlock: {
    flex: 1,
  },
  itemTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemNameUrdu: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  itemNameStrikethrough: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  itemNameEnglish: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  deficitBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deficitBadgeText: {
    color: '#FCA5A5',
    fontSize: 9,
    fontWeight: '700',
  },
  trashBtn: {
    padding: 6,
  },
  // Planning Controls
  planningControlsWrap: {
    marginTop: 4,
  },
  qtyStepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepperLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stepperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepperVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  rateSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  ratePillLabel: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  itemSubtotal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  inlineEditorCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  inlineEditorTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  inlineInputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  inlineInputWrap: {
    flex: 1,
  },
  inlineInputLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginBottom: 4,
  },
  inlineInput: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inlineBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  inlineCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  inlineCancelText: {
    color: '#F8FAFC',
    fontSize: 11,
  },
  inlineSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  inlineSaveText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // In-Store Checkout Controls
  checkoutControlsWrap: {
    marginTop: 4,
  },
  checkoutMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  checkoutCol: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  checkoutColLabel: {
    color: '#94A3B8',
    fontSize: 10,
    marginBottom: 4,
  },
  checkoutStepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniStepperBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 4,
    padding: 6,
  },
  miniStepperVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkoutComparisonLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  compEstText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  compActText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  itemDeficitAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  itemDeficitText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
  },
  addActionsContainer: {
    gap: 8,
    marginTop: 14,
  },
  browseCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#10B981',
    gap: 8,
  },
  browseCatalogBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  addCustomItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    gap: 8,
  },
  addCustomItemText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  // Settings Tab
  settingsSection: {
    paddingVertical: 8,
  },
  settingsSectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingsSectionSub: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  householdChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  householdChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  householdChipActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  householdChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  householdChipTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  settingsActionsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsCardTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingsCardSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  reconcileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  reconcileBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // Bottom Sticky Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  bottomModeBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  bottomModeBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  bottomWhatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomSettleBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  bottomSettleBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Dialog / Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  dialogCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dialogTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  dialogInputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  dialogInput: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dialogGridRow: {
    flexDirection: 'row',
  },
  catPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  catPickerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catPickerChipActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  catPickerChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  catPickerChipTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  unitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  unitChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  unitChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  unitChipText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  unitChipTextActive: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  dialogSubmitBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  dialogSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Reconcile Summary
  reconcileSummaryBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    marginBottom: 12,
    alignItems: 'center',
  },
  reconcileSummaryLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  reconcileSummaryVal: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  reconcileSummarySub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  paymentMethodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  paymentMethodChipActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  paymentMethodText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  paymentMethodTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  ledgerCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  ledgerCheckText: {
    color: '#F8FAFC',
    fontSize: 11,
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Budget Cap Modal Styles
  capModalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  capCurrentSumCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capCurrentSumLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  capCurrentSumVal: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  currencyPrefix: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  currencyPrefixText: {
    color: '#38BDF8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  currencyInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  capPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  capPresetChip: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  capPresetChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  capPresetChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  capPresetChipTextActive: {
    color: '#38BDF8',
    fontWeight: 'bold',
  },
  resetCapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  resetCapBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  // Catalog Modal Styles
  catalogSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
    marginBottom: 10,
  },
  catalogSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  catalogCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catalogCatChipActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  catalogCatChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  catalogCatChipTextActive: {
    color: '#10B981',
    fontWeight: '700',
  },
  catalogItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  catalogItemCardAdded: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  catalogItemTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  catalogItemTitleEng: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  catalogItemMeta: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  catalogItemNotes: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  alreadyAddedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alreadyAddedBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  addedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addedPillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '600',
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickAddBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pantryRestockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.35)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  pantryRestockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pantryRestockIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 212, 159, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pantryRestockTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  pantryLiveBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  pantryLiveBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '700',
  },
  pantryRestockSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  pantryRestockArrow: {
    paddingLeft: 8,
  },
});
