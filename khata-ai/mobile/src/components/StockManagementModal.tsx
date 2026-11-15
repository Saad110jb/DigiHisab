import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { inventoryApi, IInventoryItem, UnitOfMeasure } from '../api/inventory.api';
import { JevRestockEngine, JevRestockPrediction, RestockUrgency } from '../services/jevRestock.service';
import { ContinuousBarcodeScannerModal } from './ContinuousBarcodeScannerModal';

export interface StockManagementModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'MASTER' | 'ALERTS';
  onStockDeduction?: (itemId: string, quantity: number) => void;
  onStockRestock?: (itemId: string, quantity: number) => void;
  onStockUpdated?: () => void;
  onOpenWholesalePo?: (item?: IInventoryItem, quantity?: number) => void;
}

export const StockManagementModal: React.FC<StockManagementModalProps> = ({
  visible,
  onClose,
  initialTab = 'MASTER',
  onStockDeduction,
  onStockRestock,
  onStockUpdated,
  onOpenWholesalePo,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'MASTER' | 'ALERTS'>(initialTab);
  const [items, setItems] = useState<(IInventoryItem & { supplierName?: string; supplierPhone?: string })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Jev Smart Reorder Predictions State
  const [predictions, setPredictions] = useState<JevRestockPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Form Mode State: null | 'ADD' | 'EDIT'
  const [formMode, setFormMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [editingItem, setEditingItem] = useState<IInventoryItem | null>(null);

  // Form Inputs
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [stockOnHand, setStockOnHand] = useState('10');
  const [wholesaleCost, setWholesaleCost] = useState('100');
  const [retailPrice, setRetailPrice] = useState('120');
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>('PCS');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [barcode, setBarcode] = useState('');
  const [showScannerForInput, setShowScannerForInput] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');

  const handleAutoGenerateBarcode = () => {
    // 20 prefix is the international standard for in-store loose / unbranded products
    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    setBarcode(`20${randomDigits}`);
  };

  const computeLocalPredictions = (
    itemList: (IInventoryItem & { supplierName?: string; supplierPhone?: string })[]
  ): JevRestockPrediction[] => {
    return itemList
      .filter((i) => i.stockOnHand <= (i.lowStockThreshold ?? 5) || /dal|ghee|oil|sugar|atta|milk|tea/i.test(i.itemName))
      .map((item) =>
        JevRestockEngine.evaluateItem({
          _id: item._id,
          sku: item.sku,
          itemName: item.itemName,
          category: item.category,
          stockOnHand: item.stockOnHand,
          lowStockThreshold: item.lowStockThreshold ?? 5,
          wholesaleCost: item.wholesaleCost,
          retailPrice: item.retailPrice,
          unitOfMeasure: item.unitOfMeasure,
          supplierName: item.supplierName,
          supplierPhone: item.supplierPhone,
        })
      );
  };

  const fetchRestockPredictions = async (
    itemList: (IInventoryItem & { supplierName?: string; supplierPhone?: string })[]
  ) => {
    setLoadingPredictions(true);
    try {
      const res = await inventoryApi.getRestockPredictions();
      if (res.success && res.data && res.data.length > 0) {
        setPredictions(res.data);
        return;
      }
    } catch (e) {
      // offline fallback
    } finally {
      setLoadingPredictions(false);
    }
    // Heuristic fallback
    setPredictions(computeLocalPredictions(itemList));
  };

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await inventoryApi.getAll();
      const list = (res.success && res.data)
        ? res.data.map((item) => ({
            ...item,
            lowStockThreshold: item.lowStockThreshold ?? 5,
          }))
        : [];
      setItems(list);
      fetchRestockPredictions(list);
    } catch (e) {
      setItems([]);
      fetchRestockPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      fetchItems();
    }
  }, [visible, initialTab]);

  const lowStockItems = items.filter(
    (item) => item.stockOnHand <= (item.lowStockThreshold ?? 5)
  );

  const handleOpenAdd = () => {
    setItemName('');
    setCategory('Grocery');
    setStockOnHand('10');
    setWholesaleCost('100');
    setRetailPrice('120');
    setUnitOfMeasure('PCS');
    setLowStockThreshold('5');
    setBarcode('');
    setSupplierName('');
    setSupplierPhone('');
    setEditingItem(null);
    setFormMode('ADD');
  };

  const handleOpenEdit = (item: IInventoryItem & { supplierName?: string; supplierPhone?: string }) => {
    setEditingItem(item);
    setItemName(item.itemName);
    setCategory(item.category || 'Grocery');
    setStockOnHand(item.stockOnHand.toString());
    setWholesaleCost(item.wholesaleCost.toString());
    setRetailPrice(item.retailPrice.toString());
    setUnitOfMeasure(item.unitOfMeasure || 'PCS');
    setLowStockThreshold((item.lowStockThreshold ?? 5).toString());
    setBarcode(item.barcode || '');
    setSupplierName(item.supplierName || '');
    setSupplierPhone(item.supplierPhone || '');
    setFormMode('EDIT');
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('Masla', 'Baraye meherbani aitem ka naam darj karein.');
      return;
    }
    const cost = parseFloat(wholesaleCost);
    const price = parseFloat(retailPrice);
    const qty = parseInt(stockOnHand, 10) || 0;
    const threshold = parseInt(lowStockThreshold, 10) || 5;

    if (isNaN(cost) || isNaN(price)) {
      Alert.alert('Masla', 'Baraye meherbani durust keemat (Price/Cost) darj karein.');
      return;
    }

    try {
      if (formMode === 'ADD') {
        const payload = {
          itemName: itemName.trim(),
          category: category.trim(),
          wholesaleCost: cost,
          retailPrice: price,
          stockOnHand: qty,
          lowStockThreshold: threshold,
          unitOfMeasure,
          barcode: barcode.trim() || undefined,
        };
        try {
          const res = await inventoryApi.create(payload);
          if (res.success && res.data) {
            const newItem = {
              ...res.data,
              supplierName: supplierName.trim() || undefined,
              supplierPhone: supplierPhone.trim() || undefined,
            };
            setItems((prev) => [newItem, ...prev]);
          }
        } catch (e) {
          // offline fallback
          const newItem: IInventoryItem & { supplierName?: string; supplierPhone?: string } = {
            _id: `offline_${Date.now()}`,
            profileId: 'local',
            sku: `SKU-${Date.now()}`,
            barcode: barcode.trim() || undefined,
            itemName: itemName.trim(),
            category: category.trim(),
            stockOnHand: qty,
            lowStockThreshold: threshold,
            wholesaleCost: cost,
            retailPrice: price,
            unitOfMeasure,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isLowStock: qty <= threshold,
            supplierName: supplierName.trim() || undefined,
            supplierPhone: supplierPhone.trim() || undefined,
          };
          setItems((prev) => [newItem, ...prev]);
        }
        Alert.alert('Kamyabi', `Aitem "${itemName}" stock mein shamil ho gaya!`);
      } else if (formMode === 'EDIT' && editingItem) {
        try {
          const res = await inventoryApi.update(editingItem._id, {
            itemName: itemName.trim(),
            category: category.trim(),
            wholesaleCost: cost,
            retailPrice: price,
            unitOfMeasure,
            barcode: barcode.trim() || undefined,
          });
          if (res.success && res.data) {
            setItems((prev) =>
              prev.map((i) =>
                i._id === editingItem._id
                  ? {
                      ...res.data,
                      supplierName: supplierName.trim() || undefined,
                      supplierPhone: supplierPhone.trim() || undefined,
                    }
                  : i
              )
            );
          }
        } catch (e) {
          setItems((prev) =>
            prev.map((i) =>
              i._id === editingItem._id
                ? {
                    ...i,
                    itemName: itemName.trim(),
                    category: category.trim(),
                    wholesaleCost: cost,
                    retailPrice: price,
                    stockOnHand: qty,
                    lowStockThreshold: threshold,
                    unitOfMeasure,
                    barcode: barcode.trim() || undefined,
                    supplierName: supplierName.trim() || undefined,
                    supplierPhone: supplierPhone.trim() || undefined,
                  }
                : i
            )
          );
        }
        Alert.alert('Kamyabi', `Aitem "${itemName}" tabdeel ho gaya!`);
      }
      setFormMode(null);
      if (onStockUpdated) onStockUpdated();
    } catch (err: any) {
      Alert.alert('Masla', err.message || 'Stock save na ho saka.');
    }
  };

  const handleAdjustQuantity = async (
    item: IInventoryItem & { supplierName?: string; supplierPhone?: string },
    delta: number
  ) => {
    const newQty = Math.max(0, item.stockOnHand + delta);
    setItems((prev) =>
      prev.map((i) =>
        i._id === item._id
          ? {
              ...i,
              stockOnHand: newQty,
              isLowStock: newQty <= (i.lowStockThreshold ?? 5),
            }
          : i
      )
    );

    // Callbacks for parent application listeners
    if (delta < 0 && onStockDeduction) {
      onStockDeduction(item._id, Math.abs(delta));
    } else if (delta > 0 && onStockRestock) {
      onStockRestock(item._id, delta);
    }

    try {
      await inventoryApi.adjustStock(item._id, {
        adjustmentType: delta > 0 ? 'RESTOCK' : 'DEDUCTION',
        quantity: Math.abs(delta),
      });
      if (onStockUpdated) onStockUpdated();
    } catch (e) {
      // ignore offline adjustment error
    }
  };

  const handleDeleteItem = (item: IInventoryItem) => {
    Alert.alert(
      'Khatam Karein',
      `Kya aap "${item.itemName}" ko stock se khatam karna chahte hain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Khatam Karein',
          style: 'destructive',
          onPress: async () => {
            setItems((prev) => prev.filter((i) => i._id !== item._id));
            try {
              await inventoryApi.delete(item._id, true);
              if (onStockUpdated) onStockUpdated();
            } catch (e) {
              // ignore
            }
          },
        },
      ]
    );
  };

  const handleSendPredictedWhatsAppOrder = (pred: JevRestockPrediction) => {
    const msg = pred.prefilled_whatsapp_po;
    const phone = pred.suggested_supplier_phone ? pred.suggested_supplier_phone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Issue', 'WhatsApp Application kholna mumkin nahi ho saka.');
    });
  };

  const handleOpenWholesalePoFromPrediction = (pred: JevRestockPrediction) => {
    const matchedItem = items.find((i) => i._id === pred.item_id);
    if (onOpenWholesalePo) {
      onClose();
      onOpenWholesalePo(matchedItem, pred.suggested_order_units);
    } else {
      handleSendPredictedWhatsAppOrder(pred);
    }
  };

  const handleSendItemWhatsAppOrder = (item: IInventoryItem & { supplierName?: string; supplierPhone?: string }) => {
    const threshold = item.lowStockThreshold ?? 5;
    const deficit = Math.max(1, threshold * 2 - item.stockOnHand);
    const msg = `*📦 DIGIHISAB REORDER ALERT (تھوک آرڈر)*\n\n*Aitem:* ${item.itemName}\n*Current Stock:* ${item.stockOnHand} ${item.unitOfMeasure}\n*Low Stock Threshold:* ${threshold}\n*Required Quantity Needed:* ${deficit} ${item.unitOfMeasure}\n\nBaraye meherbani yeh maal jald az jald bhej dein. Shukriya!`;

    const phone = item.supplierPhone ? item.supplierPhone.replace(/[^0-9]/g, '') : '';
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Issue', 'WhatsApp Application kholna mumkin nahi ho saka.');
    });
  };

  const handleConsolidatedWhatsAppOrder = () => {
    if (lowStockItems.length === 0) {
      Alert.alert('Sabhi Stock Theek Hai', 'Koi kam stock alert nahi hai.');
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let msg = `*📦 DIGIHISAB - CONSOLIDATED WHOLESALE ORDER (مکمل تھوک آرڈر)*\n`;
    msg += `*Tareekh:* ${dateStr}\n\n`;
    msg += `Niche diye gaye kam stock aitems ka fauran order rawana karein:\n\n`;

    lowStockItems.forEach((item, index) => {
      const threshold = item.lowStockThreshold ?? 5;
      const deficit = Math.max(1, threshold * 2 - item.stockOnHand);
      msg += `${index + 1}. *${item.itemName}*\n`;
      msg += `   - Current Stock: ${item.stockOnHand} ${item.unitOfMeasure}\n`;
      msg += `   - Low Stock Alert Threshold: ${threshold} ${item.unitOfMeasure}\n`;
      msg += `   - Required Reorder Quantity: *${deficit} ${item.unitOfMeasure}*\n`;
      if (item.supplierName) {
        msg += `   - Preferred Supplier: ${item.supplierName}\n`;
      }
      msg += `\n`;
    });

    msg += `Baraye meherbani in items ka stock jald se jald rawana karein. Shukriya!`;

    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Issue', 'WhatsApp Application kholna mumkin nahi ho saka.');
    });
  };

  const categoriesList = ['ALL', 'Grocery', 'Ghee & Oil', 'Dairy', 'Beverages', 'Snacks', 'General'];

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category?.toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.itemName.toLowerCase().includes(q) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Header Bar */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20) }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Ionicons name="cube" size={22} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>Inventory & Stock Control</Text>
            </View>
            <Text style={styles.headerSubtitle}>اسٹاک کنٹرول رجسٹر و کم اسٹاک الرٹس</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'MASTER' && styles.tabButtonActive]}
            onPress={() => {
              setFormMode(null);
              setActiveTab('MASTER');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={activeTab === 'MASTER' ? '#10B981' : '#94A3B8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'MASTER' && styles.tabTextActive]}>
              Master Inventory (اسٹاک فہرست)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ALERTS' && styles.tabButtonActive]}
            onPress={() => {
              setFormMode(null);
              setActiveTab('ALERTS');
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="warning-outline"
              size={18}
              color={activeTab === 'ALERTS' ? '#F59E0B' : '#94A3B8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'ALERTS' && styles.tabTextAlertActive]}>
              Low Stock Alerts (کم اسٹاک)
            </Text>
            {lowStockItems.length > 0 && (
              <View style={styles.alertBadgeCount}>
                <Text style={styles.alertBadgeCountText}>{lowStockItems.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        {formMode ? (
          /* Add / Edit Product Sub-Modal Form */
          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.formCard}>
              <View style={styles.formHeaderRow}>
                <Text style={styles.formTitle}>
                  {formMode === 'ADD' ? '+ Naya Product Shamil Karein (نیا پروڈکٹ)' : '✏️ Product Edit Karein'}
                </Text>
                <TouchableOpacity onPress={() => setFormMode(null)}>
                  <Ionicons name="close-circle-outline" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Product Name (پروڈکٹ کا نام) *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Dalda Banaspati 1L"
                placeholderTextColor="#64748B"
                value={itemName}
                onChangeText={setItemName}
              />

              {/* Barcode Section with Camera Scan & Auto-Gen Buttons */}
              <View style={styles.barcodeLabelRow}>
                <Text style={styles.inputLabel}>Barcode (بارکوڈ نمبر)</Text>
                <View style={styles.barcodeActionsRow}>
                  <TouchableOpacity
                    style={styles.barcodeScanBtn}
                    onPress={() => setShowScannerForInput(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="barcode-outline" size={13} color="#10B981" />
                    <Text style={styles.barcodeScanBtnText}>📷 Scan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.barcodeAutoBtn}
                    onPress={handleAutoGenerateBarcode}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash-outline" size={12} color="#38BDF8" />
                    <Text style={styles.barcodeAutoBtnText}>⚡ Auto-Gen</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.barcodeInputWrapper}>
                <TextInput
                  style={[styles.inputField, { paddingRight: 38, marginBottom: 0 }]}
                  placeholder="e.g. 896400012345 (optional)"
                  placeholderTextColor="#64748B"
                  value={barcode}
                  onChangeText={setBarcode}
                  keyboardType="numeric"
                />
                {barcode ? (
                  <TouchableOpacity
                    style={styles.clearBarcodeBtn}
                    onPress={() => setBarcode('')}
                  >
                    <Ionicons name="close-circle" size={18} color="#64748B" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={{ marginBottom: 12 }} />

              <Text style={styles.inputLabel}>Category (زمرہ)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Grocery, Ghee & Oil, Dairy..."
                placeholderTextColor="#64748B"
                value={category}
                onChangeText={setCategory}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Purchase/Cost (Rs) *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="220"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={wholesaleCost}
                    onChangeText={setWholesaleCost}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Retail/Selling Price (Rs) *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="260"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={retailPrice}
                    onChangeText={setRetailPrice}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Current Stock Units *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="10"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={stockOnHand}
                    onChangeText={setStockOnHand}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Min Alert Threshold *</Text>
                  <TextInput
                    style={styles.inputField}
                    placeholder="5"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={lowStockThreshold}
                    onChangeText={setLowStockThreshold}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Unit Type (پیمائش)</Text>
              <View style={styles.unitTypeSelector}>
                {(['PCS', 'KG', 'CARTON', 'PACKET', 'LITER'] as const).map((unit) => {
                  const apiUnit: UnitOfMeasure =
                    unit === 'CARTON' ? 'BOX' : unit === 'PACKET' ? 'PACK' : (unit as UnitOfMeasure);
                  const isSelected = unitOfMeasure === apiUnit || (unitOfMeasure === 'PACK' && unit === 'PACKET') || (unitOfMeasure === 'BOX' && unit === 'CARTON');

                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.unitChip, isSelected && styles.unitChipSelected]}
                      onPress={() => setUnitOfMeasure(apiUnit)}
                    >
                      <Text style={[styles.unitChipText, isSelected && styles.unitChipTextSelected]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Wholesaler / Supplier Name (اختیاری)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Madina Wholesale Traders"
                placeholderTextColor="#64748B"
                value={supplierName}
                onChangeText={setSupplierName}
              />

              <Text style={styles.inputLabel}>Supplier WhatsApp / Phone (اختیاری)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 03001234567"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={supplierPhone}
                onChangeText={setSupplierPhone}
              />

              <View style={styles.formActionsRow}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => setFormMode(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelFormText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveFormBtn}
                  onPress={handleSaveItem}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveFormText}>
                    {formMode === 'ADD' ? 'Save Product (محفوظ کریں)' : 'Update Product'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        ) : activeTab === 'MASTER' ? (
          /* TAB 1: MASTER INVENTORY LIST VIEW */
          <View style={styles.tabContentContainer}>
            {/* Action Header: Search & Add Button */}
            <View style={styles.actionHeaderContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search item name, SKU or category..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity style={styles.addProductBtn} onPress={handleOpenAdd} activeOpacity={0.85}>
                <Ionicons name="add-circle" size={20} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.addProductBtnText}>+ Add New Product (+ نیا پروڈکٹ)</Text>
              </TouchableOpacity>
            </View>

            {/* Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryChipsScroll}>
              {categoriesList.map((cat) => {
                const active = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {cat === 'ALL' ? 'Sabhi (All)' : cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Items List */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>Loading inventory items...</Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cube-outline" size={48} color="#64748B" />
                <Text style={styles.emptyTitle}>Koi Product Nahi Mila</Text>
                <Text style={styles.emptySub}>Naya product shamil karne ke liye upar button par click karein.</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {filteredItems.map((item) => {
                  const threshold = item.lowStockThreshold ?? 5;
                  const isOutOfStock = item.stockOnHand === 0;
                  const isLow = item.stockOnHand <= threshold;

                  let badgeBg = '#D1FAE5';
                  let badgeText = '#059669';
                  let statusLabel = 'In Stock (موجود)';

                  if (isOutOfStock) {
                    badgeBg = '#FEE2E2';
                    badgeText = '#DC2626';
                    statusLabel = 'Out of Stock (ختم)';
                  } else if (isLow) {
                    badgeBg = '#FEF3C7';
                    badgeText = '#B45309';
                    statusLabel = 'Low Stock (کم)';
                  }

                  return (
                    <View key={item._id} style={styles.itemCard}>
                      <View style={styles.itemHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemNameText}>{item.itemName}</Text>
                          <View style={styles.itemCategoryBarcodeRow}>
                            <Text style={styles.itemCategoryText}>{item.category || 'General'}</Text>
                            {item.barcode ? (
                              <View style={styles.itemBarcodeBadge}>
                                <Ionicons name="barcode-outline" size={11} color="#10B981" />
                                <Text style={styles.itemBarcodeBadgeText}>{item.barcode}</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.itemAddBarcodePill}
                                onPress={() => handleOpenEdit(item)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="add-circle-outline" size={11} color="#F59E0B" />
                                <Text style={styles.itemAddBarcodePillText}>+ Barcode</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Health Badge */}
                        <View style={[styles.healthBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.healthBadgeText, { color: badgeText }]}>{statusLabel}</Text>
                        </View>
                      </View>

                      {/* Financial & Stock Details */}
                      <View style={styles.itemMetaRow}>
                        <View style={styles.metaBlock}>
                          <Text style={styles.metaLabel}>Wholesale Cost</Text>
                          <Text style={styles.metaValue}>Rs. {item.wholesaleCost}</Text>
                        </View>

                        <View style={styles.metaBlock}>
                          <Text style={styles.metaLabel}>Selling Price</Text>
                          <Text style={styles.metaValueHighlight}>Rs. {item.retailPrice}</Text>
                        </View>

                        <View style={styles.metaBlock}>
                          <Text style={styles.metaLabel}>Current Stock</Text>
                          <Text style={[styles.metaValueStock, isLow && { color: '#F59E0B' }, isOutOfStock && { color: '#EF4444' }]}>
                            {item.stockOnHand} {item.unitOfMeasure}
                          </Text>
                        </View>
                      </View>

                      {/* Quick Adjustments & Options Bar */}
                      <View style={styles.itemCardFooter}>
                        {/* Quick Stock Adjustment */}
                        <View style={styles.quickAdjustBox}>
                          <Text style={styles.quickAdjustLabel}>Quick Stock:</Text>
                          <TouchableOpacity
                            style={styles.adjustBtnMinus}
                            onPress={() => handleAdjustQuantity(item, -1)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="remove" size={16} color="#FFF" />
                          </TouchableOpacity>

                          <View style={styles.qtyDisplayBox}>
                            <Text style={styles.qtyDisplayText}>{item.stockOnHand}</Text>
                          </View>

                          <TouchableOpacity
                            style={styles.adjustBtnPlus}
                            onPress={() => handleAdjustQuantity(item, 1)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="add" size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>

                        {/* Edit & Delete Action Buttons */}
                        <View style={styles.cardActionsGroup}>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleOpenEdit(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="pencil" size={16} color="#38BDF8" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.iconActionBtn}
                            onPress={() => handleDeleteItem(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : (
          /* TAB 2: LOW STOCK ALERTS VIEW */
          <View style={styles.tabContentContainer}>
            {/* Amber Warning Banner */}
            <View style={styles.alertWarningBanner}>
              <Ionicons name="alert-circle" size={24} color="#D97706" style={{ marginRight: 10 }} />
              <Text style={styles.alertWarningText}>
                ⚠️ Fauran wholesaler se maal mangwayein taake dukaan par bikri na ruke.
              </Text>
            </View>

            {/* Consolidated Wholesale WhatsApp Reorder Button */}
            <TouchableOpacity
              style={styles.masterReorderBtn}
              onPress={handleConsolidatedWhatsAppOrder}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.masterReorderBtnText}>
                Create Consolidated Wholesale Order via WhatsApp (مکمل تھوک آرڈر بنائیں)
              </Text>
            </TouchableOpacity>

            {/* Jev Restock Predictions & Alert Items List */}
            {loadingPredictions ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 13 }}>
                  JEV اسٹاک کھپت و کمی کا جائزہ لے رہا ہے...
                </Text>
              </View>
            ) : predictions.length === 0 ? (
              <View style={styles.emptyStateAlertCard}>
                <Ionicons name="checkmark-circle-outline" size={56} color="#10B981" />
                <Text style={styles.emptyStateAlertTitle}>Sabhi Stock Tasallibakhsh Hai</Text>
                <Text style={styles.emptyStateAlertSub}>
                  ✅ Sabhi items ka stock tasallibakhsh hai. Koi low stock alert nahi hai.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {predictions.map((pred) => {
                  const isCritical = pred.urgency === 'CRITICAL' || pred.current_stock === 0 || pred.stockout_probability_48h >= 0.85;
                  const isWarning = pred.urgency === 'WARNING' || pred.stockout_probability_48h >= 0.50;
                  const riskPct = Math.round(pred.stockout_probability_48h * 100);
                  const isZero = pred.current_stock === 0;

                  return (
                    <View key={pred.item_id} style={[styles.alertCard, isCritical && styles.alertCardCritical]}>
                      <View style={styles.alertCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.alertItemName}>{pred.item_name}</Text>
                          <Text style={styles.alertItemCategory}>{pred.category || 'General'}</Text>
                        </View>

                        {/* Jev Calibrated 48h Stockout Risk Badge */}
                        <View
                          style={[
                            styles.jevRiskBadge,
                            isCritical
                              ? styles.jevRiskBadgeCritical
                              : isWarning
                              ? styles.jevRiskBadgeWarning
                              : styles.jevRiskBadgeHealthy,
                          ]}
                        >
                          <Ionicons
                            name={isCritical ? 'flame' : isWarning ? 'warning' : 'checkmark-circle'}
                            size={12}
                            color={isCritical ? '#DC2626' : isWarning ? '#D97706' : '#059669'}
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={[
                              styles.jevRiskBadgeText,
                              isCritical
                                ? styles.jevRiskTextCritical
                                : isWarning
                                ? styles.jevRiskTextWarning
                                : styles.jevRiskTextHealthy,
                            ]}
                          >
                            {isCritical
                              ? `🔴 ${riskPct}% 48h Stockout Risk`
                              : isWarning
                              ? `🟡 ${riskPct}% 48h Risk`
                              : '🟢 Healthy'}
                          </Text>
                        </View>
                      </View>

                      {/* Depletion & Reorder Metrics Grid */}
                      <View style={styles.alertDetailsRow}>
                        <View style={styles.alertMetaBox}>
                          <Text style={styles.alertMetaLabel}>Current Stock</Text>
                          <Text
                            style={[
                              styles.alertMetaVal,
                              isZero && { color: '#EF4444', fontWeight: '800' },
                              !isZero && isCritical && { color: '#F59E0B' },
                            ]}
                          >
                            {pred.current_stock} {pred.unit_of_measure}
                          </Text>
                        </View>

                        <View style={styles.alertMetaBox}>
                          <Text style={styles.alertMetaLabel}>Daily Velocity</Text>
                          <Text style={styles.alertMetaVal}>
                            {pred.daily_velocity} {pred.unit_of_measure}/din
                          </Text>
                        </View>

                        <View style={styles.alertMetaBox}>
                          <Text style={styles.alertMetaLabel}>T_exhaust (ختم)</Text>
                          <Text
                            style={[
                              styles.alertMetaVal,
                              isZero ? { color: '#EF4444' } : { color: '#FCD34D' },
                            ]}
                          >
                            {isZero ? '0h (ختم)' : `${Math.round(pred.estimated_hours_to_exhaustion)}h باقی`}
                          </Text>
                        </View>

                        <View style={styles.alertMetaBox}>
                          <Text style={styles.alertMetaLabel}>Suggested (EOQ)</Text>
                          <Text style={styles.alertDeficitVal}>
                            {pred.suggested_order_units} {pred.unit_of_measure}
                          </Text>
                        </View>
                      </View>

                      {/* Jev Intelligence Urdu Advisory Callout */}
                      <View style={styles.jevReasonCard}>
                        <Ionicons name="sparkles" size={15} color="#F59E0B" style={{ marginTop: 2 }} />
                        <Text style={styles.jevReasonText}>{pred.reason_ur}</Text>
                      </View>

                      {/* Supplier Information */}
                      <View style={styles.supplierRow}>
                        <Ionicons name="business-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                        <Text style={styles.supplierText}>
                          Supplier:{' '}
                          <Text style={{ color: '#F8FAFC', fontWeight: '600' }}>
                            {pred.suggested_supplier_name}
                          </Text>
                        </Text>
                      </View>

                      {/* Streamlined Action Buttons: Wholesale PO & Direct WhatsApp */}
                      <View style={styles.alertActionButtonsRow}>
                        <TouchableOpacity
                          style={[styles.itemWholesalePoBtnHalf, { flex: 1.4 }]}
                          onPress={() => handleOpenWholesalePoFromPrediction(pred)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="receipt-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.itemWholesalePoBtnText}>Wholesale PO (تھوک آرڈر)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.itemWhatsAppBtnHalf, { flex: 1 }]}
                          onPress={() => handleSendPredictedWhatsAppOrder(pred)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="logo-whatsapp" size={16} color="#FFF" style={{ marginRight: 6 }} />
                          <Text style={styles.itemWhatsAppBtnText}>WhatsApp</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>
      {/* Quick Scanner Modal to capture barcode directly into the form */}
      <ContinuousBarcodeScannerModal
        visible={showScannerForInput}
        mode="SINGLE_CAPTURE"
        title="Scan Barcode for Product (بارکوڈ)"
        onClose={() => setShowScannerForInput(false)}
        onScanBarcode={(scannedCode) => {
          setBarcode(scannedCode);
          setShowScannerForInput(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButtonActive: {
    backgroundColor: '#1E293B',
    borderColor: '#10B981',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#10B981',
  },
  tabTextAlertActive: {
    color: '#F59E0B',
  },
  alertBadgeCount: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  alertBadgeCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tabContentContainer: {
    flex: 1,
    padding: 16,
  },
  actionHeaderContainer: {
    marginBottom: 12,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#F8FAFC',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addProductBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  categoryChipsScroll: {
    maxHeight: 38,
    marginBottom: 12,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  catChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  catChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  itemCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemCategoryText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  metaBlock: {
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 2,
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
  metaValueStock: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 2,
  },
  itemCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  quickAdjustBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickAdjustLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 8,
  },
  adjustBtnMinus: {
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnPlus: {
    backgroundColor: '#10B981',
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyDisplayBox: {
    paddingHorizontal: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  qtyDisplayText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
  cardActionsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },

  /* TAB 2 - LOW STOCK ALERTS STYLING */
  alertWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  alertWarningText: {
    flex: 1,
    color: '#B45309',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  masterReorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  masterReorderBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyStateAlertCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyStateAlertTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyStateAlertSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  alertCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  alertItemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  alertItemCategory: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  depletionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  depletionBadgeZero: {
    backgroundColor: '#FEE2E2',
  },
  depletionBadgeLow: {
    backgroundColor: '#FEF3C7',
  },
  depletionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  depletionTextZero: {
    color: '#DC2626',
  },
  depletionTextLow: {
    color: '#B45309',
  },
  alertDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  alertMetaBox: {
    alignItems: 'flex-start',
  },
  alertMetaLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  alertMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginTop: 2,
  },
  alertDeficitVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 2,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplierText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  itemWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
  },
  itemWhatsAppBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  alertCardCritical: {
    borderColor: '#DC2626',
    borderWidth: 1.5,
  },
  jevRiskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  jevRiskBadgeCritical: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderColor: '#DC2626',
    borderWidth: 1,
  },
  jevRiskBadgeWarning: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    borderColor: '#D97706',
    borderWidth: 1,
  },
  jevRiskBadgeHealthy: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderColor: '#059669',
    borderWidth: 1,
  },
  jevRiskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  jevRiskTextCritical: {
    color: '#EF4444',
  },
  jevRiskTextWarning: {
    color: '#F59E0B',
  },
  jevRiskTextHealthy: {
    color: '#10B981',
  },
  jevReasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  jevReasonText: {
    flex: 1,
    fontSize: 11,
    color: '#FDE68A',
    lineHeight: 16,
    fontWeight: '600',
  },
  alertActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemWhatsAppBtnHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
  },
  itemWholesalePoBtnHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
  },
  itemWholesalePoBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* FORM STYLING */
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 30,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 6,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  unitTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  unitChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  unitChipText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  unitChipTextSelected: {
    color: '#FFF',
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  cancelFormBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelFormText: {
    color: '#CBD5E1',
    fontWeight: '600',
  },
  saveFormBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  saveFormText: {
    color: '#FFF',
    fontWeight: '700',
  },
  barcodeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 8,
  },
  barcodeActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barcodeScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  barcodeScanBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  barcodeAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  barcodeAutoBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  barcodeInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  clearBarcodeBtn: {
    position: 'absolute',
    right: 10,
    padding: 4,
  },
  itemCategoryBarcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  itemBarcodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  itemBarcodeBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  itemAddBarcodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  itemAddBarcodePillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '600',
  },
});
