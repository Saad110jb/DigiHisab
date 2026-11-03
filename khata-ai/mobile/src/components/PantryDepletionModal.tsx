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
  Share,
  Linking,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  pantryApi,
  IPantryItem,
  IHouseholdPantryProfile,
  PantryCategory,
  PantryUnit,
} from '../api/pantry.api';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type FilterType = 'ALL' | 'URGENT' | 'UPCOMING' | 'SAFE';

export const PantryDepletionModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [items, setItems] = useState<IPantryItem[]>([]);
  const [profile, setProfile] = useState<IHouseholdPantryProfile | null>(null);
  const [householdSize, setHouseholdSize] = useState<number>(5);
  const [urgentCount, setUrgentCount] = useState<number>(0);
  const [upcomingCount, setUpcomingCount] = useState<number>(0);
  const [whatsAppText, setWhatsAppText] = useState<string>('');

  // Active Filter
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  // Sub-Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [showHouseholdModal, setShowHouseholdModal] = useState<boolean>(false);

  // Selected item for adjustment
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<IPantryItem | null>(null);
  const [adjustStockInput, setAdjustStockInput] = useState<string>('');

  // Form State: Add Item
  const [newNameUrdu, setNewNameUrdu] = useState<string>('');
  const [newNameEnglish, setNewNameEnglish] = useState<string>('');
  const [newCategory, setNewCategory] = useState<PantryCategory>('GRAIN');
  const [newStockQty, setNewStockQty] = useState<string>('5');
  const [newUnit, setNewUnit] = useState<PantryUnit>('KG');
  const [newDailyNorm, setNewDailyNorm] = useState<string>('0.05');

  const loadPantry = async () => {
    try {
      setLoading(true);
      const res = await pantryApi.getStatus();
      if (res) {
        setItems(res.items || []);
        setProfile(res.profile);
        setHouseholdSize(res.householdSize || 5);
        setUrgentCount(res.urgentCount || 0);
        setUpcomingCount(res.upcomingCount || 0);
        setWhatsAppText(res.whatsAppText || '');
      }
    } catch (err: any) {
      console.error('Failed to load pantry status:', err);
      Alert.alert('خرابی', 'راشن پینٹری ڈیٹا لوڈ نہیں ہو سکا۔');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadPantry();
    }
  }, [visible]);

  // Filtered items
  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'URGENT':
        return items.filter((i) => i.daysRemaining <= 3);
      case 'UPCOMING':
        return items.filter((i) => i.daysRemaining > 3 && i.daysRemaining <= 7);
      case 'SAFE':
        return items.filter((i) => i.daysRemaining > 7);
      default:
        return items;
    }
  }, [items, activeFilter]);

  // 1-Tap WhatsApp Share Action
  const handleShareWhatsApp = async () => {
    if (!whatsAppText) return;
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(whatsAppText)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen && Platform.OS !== 'web') {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          title: 'DigiHisab_Auto_Restock_Checklist',
          message: whatsAppText,
        });
      }
    } catch (err: any) {
      Alert.alert('شیئر خرابی', err.message);
    }
  };

  // 1-Tap Restock Action
  const handleRestock = async (item: IPantryItem) => {
    Alert.alert(
      'دوبارہ بھرا (Restock)',
      `کیا آپ "${item.nameUrdu}" کا اسٹاک بحال کر کے مکمل ${item.initialStockQty} ${item.unit} کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'ہاں، بحال کریں',
          onPress: async () => {
            try {
              const updated = await pantryApi.restockItem(item._id);
              setItems((prev) => prev.map((i) => (i._id === item._id ? updated : i)));
              loadPantry();
              Alert.alert('کامیابی', `${item.nameUrdu} کا ذخیرہ بحال ہو گیا ہے۔`);
            } catch (err: any) {
              Alert.alert('خرابی', 'ری اسٹاک نہیں ہو سکا۔');
            }
          },
        },
      ]
    );
  };

  // Open adjust modal
  const openAdjustModal = (item: IPantryItem) => {
    setSelectedItemForAdjust(item);
    setAdjustStockInput(String(item.currentStockQty));
    setShowAdjustModal(true);
  };

  // Save manual stock adjustment
  const handleSaveStockAdjustment = async () => {
    if (!selectedItemForAdjust) return;
    const val = parseFloat(adjustStockInput);
    if (isNaN(val) || val < 0) {
      Alert.alert('غلط مقدار', 'براہ کرم درست اسٹاک درج کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await pantryApi.adjustStock(selectedItemForAdjust._id, val);
      setItems((prev) => prev.map((i) => (i._id === selectedItemForAdjust._id ? updated : i)));
      setShowAdjustModal(false);
      loadPantry();
      Alert.alert('کامیابی', 'اسٹاک کامیابی سے درست کر دیا گیا ہے۔');
    } catch (err: any) {
      Alert.alert('خرابی', 'اسٹاک ایڈجسٹ نہیں ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete item
  const handleDeleteItem = (item: IPantryItem) => {
    Alert.alert('آئٹم خارج کریں', `کیا آپ واقعی "${item.nameUrdu}" پینٹری سے خارج کرنا چاہتے ہیں؟`, [
      { text: 'منسوخ', style: 'cancel' },
      {
        text: 'ہاں، خارج کریں',
        style: 'destructive',
        onPress: async () => {
          try {
            await pantryApi.deleteItem(item._id);
            setItems((prev) => prev.filter((i) => i._id !== item._id));
            loadPantry();
          } catch (err: any) {
            Alert.alert('خرابی', 'آئٹم حذف نہیں ہو سکا۔');
          }
        },
      },
    ]);
  };

  // Update household size
  const handleUpdateHouseholdSize = async (size: number) => {
    try {
      setSubmitting(true);
      await pantryApi.updateProfile({ householdSize: size });
      setHouseholdSize(size);
      setShowHouseholdModal(false);
      loadPantry();
      Alert.alert('کامیابی', `افرادِ خانہ کی تعداد (${size}) کے مطابق کھپت کی شرح اپ ڈیٹ ہو گئی۔`);
    } catch (err: any) {
      Alert.alert('خرابی', 'افرادِ خانہ کی تعداد تبدیل نہیں ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Add new staple
  const handleAddNewItem = async () => {
    if (!newNameUrdu.trim()) {
      Alert.alert('نام درج کریں', 'براہ کرم راشن کا نام درج کریں۔');
      return;
    }
    const qty = parseFloat(newStockQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('غلط مقدار', 'براہ کرم درست تعداد درج کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      await pantryApi.addItem({
        nameUrdu: newNameUrdu.trim(),
        nameEnglish: newNameEnglish.trim() || newNameUrdu.trim(),
        category: newCategory,
        initialStockQty: qty,
        unit: newUnit,
        perPersonDailyNorm: parseFloat(newDailyNorm) || 0.05,
      });

      setShowAddModal(false);
      setNewNameUrdu('');
      setNewNameEnglish('');
      loadPantry();
      Alert.alert('کامیابی', 'نیا راشن آئٹم پینٹری میں شامل کر دیا گیا ہے۔');
    } catch (err: any) {
      Alert.alert('خرابی', 'آئٹم شامل نہیں ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryDetails = (cat: PantryCategory) => {
    switch (cat) {
      case 'GRAIN':
        return { icon: 'nutrition', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'OIL_GHEE':
        return { icon: 'water', color: '#00d49f', bg: 'rgba(0, 212, 159, 0.15)' };
      case 'TEA_BEVERAGE':
        return { icon: 'cafe', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' };
      case 'SWEETENER':
        return { icon: 'cube', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'PULSE':
        return { icon: 'leaf', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'SPICE':
        return { icon: 'flame', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'CLEANING':
        return { icon: 'sparkles', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' };
      default:
        return { icon: 'cart', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconPlate}>
                <Ionicons name="hourglass" size={20} color="#00d49f" />
              </View>
              <View>
                <Text style={styles.headerTitle}>راشن بچت و ختم ہونے کی پیشگوئی</Text>
                <Text style={styles.headerSubtitle}>
                  Pantry Depletion Engine & Auto-Restock Checklist
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#00d49f" />
              <Text style={styles.loaderText}>پینٹری اور کھپت کی شرح کا تجزیہ ہو رہا ہے...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
              <View style={styles.contentWrap}>
                {/* Top Health Deck */}
                <View style={styles.statusDeckCard}>
                  <View style={styles.statusTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statusDeckLabel}>پینٹری الرٹ اسٹیٹس (Pantry Reserve)</Text>
                      <Text
                        style={[
                          styles.statusDeckTitle,
                          urgentCount > 0 ? { color: '#EF4444' } : { color: '#00d49f' },
                        ]}
                      >
                        {urgentCount > 0
                          ? `🚨 ${urgentCount} اشیاء فوری ختم ہونے کے قریب!`
                          : '✅ تمام اشیاء کا ذخیرہ فی الحال محفوظ ہے'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.householdPill}
                      onPress={() => setShowHouseholdModal(true)}
                    >
                      <Ionicons name="people" size={13} color="#00d49f" />
                      <Text style={styles.householdPillText}>{householdSize} افراد</Text>
                      <Ionicons name="chevron-down" size={12} color="#00d49f" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.statusDeckSub}>
                    {householdSize} افراد کے خاندان کی اوسط کھپت کے مطابق راشن ختم ہونے سے 3 دن قبل الرٹ دیا جاتا ہے۔
                  </Text>

                  {/* 1-Tap WhatsApp Checklist Button */}
                  <TouchableOpacity
                    style={styles.whatsappActionBtn}
                    onPress={handleShareWhatsApp}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-whatsapp" size={18} color="#070d18" />
                    <Text style={styles.whatsappActionBtnText}>
                      1-Tap WhatsApp راشن لسٹ شیئر کریں
                    </Text>
                    <View style={styles.whatsappBadge}>
                      <Text style={styles.whatsappBadgeText}>{urgentCount + upcomingCount}</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Filter Chips & Add Action */}
                <View style={styles.filterBarRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    <TouchableOpacity
                      style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
                      onPress={() => setActiveFilter('ALL')}
                    >
                      <Text
                        style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}
                      >
                        تمام ({items.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        activeFilter === 'URGENT' && styles.filterChipActive,
                        urgentCount > 0 && { borderColor: 'rgba(239, 68, 68, 0.4)' },
                      ]}
                      onPress={() => setActiveFilter('URGENT')}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          activeFilter === 'URGENT' && styles.filterChipTextActive,
                          urgentCount > 0 && { color: '#EF4444' },
                        ]}
                      >
                        🚨 ارجنٹ ({urgentCount})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.filterChip, activeFilter === 'UPCOMING' && styles.filterChipActive]}
                      onPress={() => setActiveFilter('UPCOMING')}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          activeFilter === 'UPCOMING' && styles.filterChipTextActive,
                        ]}
                      >
                        ⚠️ اس ہفتے ({upcomingCount})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.filterChip, activeFilter === 'SAFE' && styles.filterChipActive]}
                      onPress={() => setActiveFilter('SAFE')}
                    >
                      <Text
                        style={[styles.filterChipText, activeFilter === 'SAFE' && styles.filterChipTextActive]}
                      >
                        ✅ محفوظ ذخیرہ
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.addStapleBtn}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Ionicons name="add" size={15} color="#00d49f" />
                    <Text style={styles.addStapleBtnText}>نیا آئٹم</Text>
                  </TouchableOpacity>
                </View>

                {/* Items List */}
                <View style={styles.itemsList}>
                  {filteredItems.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Ionicons name="checkmark-circle-outline" size={36} color="#00d49f" />
                      <Text style={styles.emptyTitle}>کوئی اشیاء اس فلٹر میں نہیں ہیں۔</Text>
                      <Text style={styles.emptySub}>آپ کا پینٹری راشن ذخیرہ مقررہ مدت کے اندر ہے۔</Text>
                    </View>
                  ) : (
                    filteredItems.map((item) => {
                      const catDetails = getCategoryDetails(item.category);
                      const isUrgent = item.daysRemaining <= 3;
                      const isUpcoming = item.daysRemaining > 3 && item.daysRemaining <= 7;

                      return (
                        <View
                          key={item._id}
                          style={[
                            styles.pantryCard,
                            isUrgent && styles.pantryCardUrgent,
                          ]}
                        >
                          <View style={styles.pantryCardTop}>
                            <View style={[styles.catIconPlate, { backgroundColor: catDetails.bg }]}>
                              <Ionicons name={catDetails.icon as any} size={18} color={catDetails.color} />
                            </View>

                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemNameUrdu}>{item.nameUrdu}</Text>
                              <Text style={styles.itemNameEnglish}>
                                روزانہ کھپت: ~{item.dailyBurnRate} {item.unit} / دن
                              </Text>
                            </View>

                            {/* Countdown Badge */}
                            <View
                              style={[
                                styles.countdownBadge,
                                isUrgent
                                  ? styles.countdownBadgeUrgent
                                  : isUpcoming
                                  ? styles.countdownBadgeUpcoming
                                  : styles.countdownBadgeSafe,
                              ]}
                            >
                              <Ionicons
                                name={isUrgent ? 'alert-circle' : isUpcoming ? 'time' : 'shield-checkmark'}
                                size={12}
                                color={isUrgent ? '#EF4444' : isUpcoming ? '#F59E0B' : '#00d49f'}
                              />
                              <Text
                                style={[
                                  styles.countdownText,
                                  isUrgent
                                    ? { color: '#EF4444' }
                                    : isUpcoming
                                    ? { color: '#F59E0B' }
                                    : { color: '#00d49f' },
                                ]}
                              >
                                {item.daysRemaining <= 0
                                  ? 'آج ختم ہو چکا!'
                                  : `${item.daysRemaining} دن باقی`}
                              </Text>
                            </View>
                          </View>

                          {/* Dual Level Visual Bar */}
                          <View style={styles.stockMeterWrap}>
                            <View style={styles.meterMetaRow}>
                              <Text style={styles.meterStockText}>
                                موجودہ اسٹاک: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{item.currentStockQty} {item.unit}</Text> / {item.initialStockQty} {item.unit}
                              </Text>
                              <Text
                                style={[
                                  styles.meterPercentText,
                                  isUrgent ? { color: '#EF4444' } : { color: '#00d49f' },
                                ]}
                              >
                                {item.reservePercentage}% بچا
                              </Text>
                            </View>

                            <View style={styles.meterTrack}>
                              <View
                                style={[
                                  styles.meterFill,
                                  {
                                    width: `${item.reservePercentage}%`,
                                    backgroundColor: isUrgent ? '#EF4444' : isUpcoming ? '#F59E0B' : '#00d49f',
                                  },
                                ]}
                              />
                            </View>
                          </View>

                          {/* Quick Action Footer */}
                          <View style={styles.pantryCardFooter}>
                            <TouchableOpacity
                              style={styles.restockActionBtn}
                              onPress={() => handleRestock(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="refresh" size={13} color="#00d49f" />
                              <Text style={styles.restockActionText}>
                                🔄 دوبارہ بھرا ({item.initialStockQty} {item.unit})
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.adjustActionBtn}
                              onPress={() => openAdjustModal(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="pencil-outline" size={13} color="#94A3B8" />
                              <Text style={styles.adjustActionText}>اسٹاک ایڈجسٹ</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteActionBtn}
                              onPress={() => handleDeleteItem(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            </ScrollView>
          )}

          {/* ================= MODAL: ADJUST STOCK ================= */}
          <Modal
            visible={showAdjustModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAdjustModal(false)}
          >
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>اسٹاک کی مقدار درست کریں</Text>
                  <TouchableOpacity onPress={() => setShowAdjustModal(false)}>
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.subModalSub}>
                  اگر مہمانوں کی آمد یا زیادہ استعمال کی وجہ سے {selectedItemForAdjust?.nameUrdu} کا اسٹاک توقع سے کم ہو چکا ہے تو موجودہ مقدار درج کریں:
                </Text>

                <View style={styles.adjustInputRow}>
                  <TextInput
                    style={styles.adjustInput}
                    value={adjustStockInput}
                    onChangeText={setAdjustStockInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748B"
                  />
                  <Text style={styles.adjustUnitTag}>{selectedItemForAdjust?.unit}</Text>
                </View>

                <TouchableOpacity
                  style={styles.saveAdjustBtn}
                  onPress={handleSaveStockAdjustment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#070d18" />
                  ) : (
                    <Text style={styles.saveAdjustBtnText}>محفوظ کریں</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* ================= MODAL: HOUSEHOLD SIZE ================= */}
          <Modal
            visible={showHouseholdModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowHouseholdModal(false)}
          >
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>افرادِ خانہ کی تعداد (Household Size)</Text>
                  <TouchableOpacity onPress={() => setShowHouseholdModal(false)}>
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.subModalSub}>
                  خاندان کے افراد کی تعداد کے مطابق تمام راشن آئٹمز کے روزانہ خرچ ہونے کی شرح خودکار تبدیل ہو جائے گی:
                </Text>

                <View style={styles.sizesGrid}>
                  {[2, 3, 4, 5, 6, 7, 8, 10, 12].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.sizeChip,
                        householdSize === s && styles.sizeChipActive,
                      ]}
                      onPress={() => handleUpdateHouseholdSize(s)}
                    >
                      <Text
                        style={[
                          styles.sizeChipText,
                          householdSize === s && styles.sizeChipTextActive,
                        ]}
                      >
                        {s} افراد
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Modal>

          {/* ================= MODAL: ADD STAPLE ================= */}
          <Modal
            visible={showAddModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAddModal(false)}
          >
            <View style={styles.subModalOverlay}>
              <View style={styles.subModalCard}>
                <View style={styles.subModalHeader}>
                  <Text style={styles.subModalTitle}>نیا راشن آئٹم شامل کریں</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  <Text style={styles.formLabel}>نام (اردو)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newNameUrdu}
                    onChangeText={setNewNameUrdu}
                    placeholder="مثال: سفید چنے، بیسن، صابن"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={styles.formLabel}>نام (English)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newNameEnglish}
                    onChangeText={setNewNameEnglish}
                    placeholder="e.g. White Chickpeas"
                    placeholderTextColor="#64748B"
                  />

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>کل مقدار (Pack Size)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={newStockQty}
                        onChangeText={setNewStockQty}
                        keyboardType="numeric"
                        placeholder="5"
                        placeholderTextColor="#64748B"
                      />
                    </View>
                    <View style={{ width: 110 }}>
                      <Text style={styles.formLabel}>یونٹ</Text>
                      <View style={styles.unitBtnRow}>
                        {(['KG', 'LITRE', 'GRAM', 'PACK'] as PantryUnit[]).map((u) => (
                          <TouchableOpacity
                            key={u}
                            style={[styles.smallUnitBtn, newUnit === u && styles.smallUnitBtnActive]}
                            onPress={() => setNewUnit(u)}
                          >
                            <Text
                              style={[
                                styles.smallUnitBtnText,
                                newUnit === u && styles.smallUnitBtnTextActive,
                              ]}
                            >
                              {u}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.formLabel}>فی فرد روزانہ کھپت (Daily Per Person Norm)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newDailyNorm}
                    onChangeText={setNewDailyNorm}
                    keyboardType="numeric"
                    placeholder="0.05"
                    placeholderTextColor="#64748B"
                  />

                  <TouchableOpacity
                    style={styles.submitNewBtn}
                    onPress={handleAddNewItem}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#070d18" />
                    ) : (
                      <Text style={styles.submitNewBtnText}>پینٹری میں شامل کریں</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>
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
    maxHeight: '94%',
    minHeight: '82%',
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
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 10,
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
  contentWrap: {
    padding: 16,
    gap: 12,
  },

  // Status Deck
  statusDeckCard: {
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    gap: 10,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusDeckLabel: {
    fontSize: 11,
    color: '#00d49f',
    fontWeight: '700',
  },
  statusDeckTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  householdPill: {
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
  householdPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00d49f',
  },
  statusDeckSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  whatsappActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00d49f',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 2,
  },
  whatsappActionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#070d18',
  },
  whatsappBadge: {
    backgroundColor: '#070d18',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  whatsappBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00d49f',
  },

  // Filter Bar
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    marginRight: 6,
  },
  filterChipActive: {
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
  },
  filterChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  addStapleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  addStapleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00d49f',
  },

  // Items List
  itemsList: {
    gap: 8,
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  emptySub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
  },
  pantryCard: {
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 10,
  },
  pantryCardUrgent: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  pantryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconPlate: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNameUrdu: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  itemNameEnglish: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  countdownBadgeUrgent: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  countdownBadgeUpcoming: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  countdownBadgeSafe: {
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  countdownText: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  // Meter
  stockMeterWrap: {
    gap: 4,
  },
  meterMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meterStockText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  meterPercentText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  meterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#17233b',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Footer Actions
  pantryCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(23, 35, 59, 0.6)',
    paddingTop: 8,
  },
  restockActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.25)',
    paddingVertical: 6,
    borderRadius: 8,
  },
  restockActionText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00d49f',
  },
  adjustActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adjustActionText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '600',
  },
  deleteActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },

  // Sub-Modals
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 5, 15, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0d1627',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 16,
    gap: 12,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subModalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subModalSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  adjustInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustInput: {
    flex: 1,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  adjustUnitTag: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00d49f',
  },
  saveAdjustBtn: {
    backgroundColor: '#00d49f',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveAdjustBtnText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#070d18',
  },
  sizesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sizeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  sizeChipActive: {
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
  },
  sizeChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sizeChipTextActive: {
    color: '#00d49f',
    fontWeight: 'bold',
  },
  formLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 3,
  },
  formInput: {
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#FFFFFF',
  },
  unitBtnRow: {
    flexDirection: 'row',
    backgroundColor: '#070d18',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#17233b',
    overflow: 'hidden',
  },
  smallUnitBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
  },
  smallUnitBtnActive: {
    backgroundColor: '#00d49f',
  },
  smallUnitBtnText: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  smallUnitBtnTextActive: {
    color: '#070d18',
  },
  submitNewBtn: {
    backgroundColor: '#00d49f',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  submitNewBtnText: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: '#070d18',
  },
});
