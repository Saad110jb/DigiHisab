import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { counterSaleApi } from '../api/counterSale.api';
import { cashDrawerApi } from '../api/cashDrawer.api';
import { inventoryApi, IInventoryItem } from '../api/inventory.api';
import { ledgerApi } from '../api/ledger.api';
import { deadStockLiquidatorApi, IHighMarginBundle } from '../api/deadStockLiquidator.api';
import { counterpartyApi, ICounterparty } from '../api/counterparty.api';
import { responsiveTextProps, fontScale } from '../theme/responsive';
import { thermalPrinterService } from '../services/thermalPrinter.service';
import {
  ContinuousBarcodeScannerModal,
  ScannedCartItem,
} from './ContinuousBarcodeScannerModal';

export interface ScannedItemInput {
  itemId?: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
}

export interface QuickSaleModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (amount: number, targetAccount: string, note?: string) => void;
  initialBundle?: IHighMarginBundle;
  initialItems?: ScannedItemInput[];
  initialAmount?: number;
}

export type DestinationAccount = 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT';

export interface SelectedItemRow {
  itemId: string;
  quantity: number;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialBundle,
  initialItems,
  initialAmount,
}) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState<string>('');
  const [targetAccount, setTargetAccount] = useState<DestinationAccount>('PHYSICAL_CASH');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState<boolean>(false);

  // Customer Loyalty Tagging (PRO)
  const [showCustomerSection, setShowCustomerSection] = useState<boolean>(false);
  const [customerMode, setCustomerMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [customerList, setCustomerList] = useState<ICounterparty[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);

  // Inventory Stock Attachment State
  const [inventoryList, setInventoryList] = useState<IInventoryItem[]>([]);
  const [showItemsSection, setShowItemsSection] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<SelectedItemRow[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState<boolean>(false);
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);
  const [availableBundles, setAvailableBundles] = useState<IHighMarginBundle[]>([]);

  const fetchInventory = async () => {
    try {
      setIsLoadingInventory(true);
      const res = await inventoryApi.getAll();
      if (res.success && res.data) {
        setInventoryList(res.data);
      }
    } catch (e) {
      setInventoryList([]);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const res = await counterpartyApi.getAll({ relationType: 'CUSTOMER', limit: 40 });
      if (res.success && res.data) {
        setCustomerList(res.data);
      }
    } catch (e) {
      // Graceful error fallback
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleSelectBundle = (bundle: IHighMarginBundle) => {
    setShowItemsSection(true);
    const newItems: SelectedItemRow[] = [];
    if (bundle.anchorItem.id) {
      newItems.push({ itemId: bundle.anchorItem.id, quantity: 1 });
    }
    if (bundle.driverItem.id) {
      newItems.push({ itemId: bundle.driverItem.id, quantity: 1 });
    }
    setSelectedItems(newItems);
    setAmount(String(bundle.bundleRetailPrice));
    setNote(bundle.titleUrdu);
  };

  useEffect(() => {
    if (visible) {
      setAmount('');
      setTargetAccount('PHYSICAL_CASH');
      setNote('');
      setErrorMsg(null);
      setShowItemsSection(false);
      setSelectedItems([]);
      setActivePickerIndex(null);
      setShowCustomerSection(false);
      setSelectedCustomerId(null);
      setCustomCustomerName('');
      setCustomCustomerPhone('');
      setCustomerSearchQuery('');
      setCustomerMode('EXISTING');
      fetchInventory();
      fetchCustomers();

      deadStockLiquidatorApi.getBundles()
        .then((res) => {
          if (res.success && res.data) {
            setAvailableBundles(res.data);
          }
        })
        .catch(() => {});

      if (initialBundle) {
        handleSelectBundle(initialBundle);
      } else if (initialItems && initialItems.length > 0) {
        setShowItemsSection(true);
        setSelectedItems(
          initialItems
            .filter((item) => item.itemId)
            .map((item) => ({ itemId: item.itemId!, quantity: item.quantity }))
        );
        if (initialAmount) {
          setAmount(initialAmount.toString());
        }
      }
    }
  }, [visible, initialBundle, initialItems, initialAmount]);

  const handleScannedCheckout = (items: ScannedCartItem[], totalAmount: number) => {
    setShowItemsSection(true);
    const validItems = items
      .filter((i) => i.inventoryItemId)
      .map((i) => ({ itemId: i.inventoryItemId!, quantity: i.quantity }));

    if (validItems.length > 0) {
      setSelectedItems(validItems);
    }
    setAmount(totalAmount.toString());
    setShowBarcodeScanner(false);
  };

  // Handle auto-sum of selected inventory items
  const handleAutoSum = () => {
    if (selectedItems.length === 0) return;
    let total = 0;
    selectedItems.forEach((row) => {
      const invItem = inventoryList.find((i) => i._id === row.itemId);
      if (invItem) {
        total += invItem.retailPrice * row.quantity;
      }
    });
    setAmount(total > 0 ? total.toString() : '');
  };

  // Real-time automatic sale amount calculation whenever selected items or quantities change
  useEffect(() => {
    if (showItemsSection && selectedItems.length > 0) {
      let total = 0;
      selectedItems.forEach((row) => {
        const invItem = inventoryList.find((i) => i._id === row.itemId);
        if (invItem) {
          total += (invItem.retailPrice || 0) * row.quantity;
        }
      });
      setAmount(total > 0 ? total.toString() : '');
    }
  }, [selectedItems, showItemsSection, inventoryList]);

  const handleAddItemRow = () => {
    if (inventoryList.length === 0) return;
    // Default to first item not already in list, or just first item
    const firstUnselected = inventoryList.find((i) => !selectedItems.some((s) => s.itemId === i._id)) || inventoryList[0];
    if (firstUnselected) {
      setSelectedItems((prev) => [...prev, { itemId: firstUnselected._id, quantity: 1 }]);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
    if (activePickerIndex === index) setActivePickerIndex(null);
  };

  const handleUpdateQuantity = (index: number, delta: number) => {
    setSelectedItems((prev) =>
      prev.map((row, i) => {
        if (i === index) {
          const newQty = Math.max(1, row.quantity + delta);
          return { ...row, quantity: newQty };
        }
        return row;
      })
    );
  };

  const handleSelectItem = (index: number, itemId: string) => {
    setSelectedItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, itemId } : row))
    );
    setActivePickerIndex(null);
  };

  const handleSave = async (shouldPrint: boolean = false) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Baraye meherbani sahi rakam darj karein (Valid amount required).');
      return;
    }

    // Validate item stock if items are attached
    if (showItemsSection && selectedItems.length > 0) {
      for (const row of selectedItems) {
        const invItem = inventoryList.find((i) => i._id === row.itemId);
        if (invItem) {
          if (row.quantity > invItem.stockOnHand) {
            setErrorMsg(
              `Stock Shortfall: "${invItem.itemName}" ki sirf ${invItem.stockOnHand} ${invItem.unitOfMeasure} maujood hain. Requested: ${row.quantity}.`
            );
            return;
          }
        }
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    const paymentDestinationMap: Record<DestinationAccount, 'CASH' | 'WALLET' | 'BANK'> = {
      PHYSICAL_CASH: 'CASH',
      DIGITAL_WALLET: 'WALLET',
      BANK_ACCOUNT: 'BANK',
    };

    const finalCustomerId = selectedCustomerId || undefined;
    const finalCustomerName = customCustomerName.trim() || undefined;
    const finalCustomerPhone = customCustomerPhone.trim() || undefined;

    const payload = {
      amount: numericAmount,
      paymentDestination: paymentDestinationMap[targetAccount],
      note: note.trim() || undefined,
      items: showItemsSection && selectedItems.length > 0 ? selectedItems : [],
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
    };

    const attachedItemsList =
      showItemsSection && selectedItems.length > 0
        ? selectedItems.map((s) => {
            const inv = inventoryList.find((i) => i._id === s.itemId);
            return {
              name: inv ? inv.itemName : 'Item',
              quantity: s.quantity,
              unitPrice: inv ? inv.retailPrice : numericAmount / s.quantity,
              total: (inv ? inv.retailPrice : 0) * s.quantity || numericAmount,
            };
          })
        : [{ name: note.trim() || 'Counter Cash Sale', quantity: 1, total: numericAmount }];

    try {
      const res = await counterSaleApi.quickSale(payload);
      if (res.success) {
        if (shouldPrint) {
          try {
            await thermalPrinterService.printReceipt(
              {
                storeName: 'DIGI HISAB KAROBAR',
                receiptNo: `SALE-${Date.now().toString().slice(-6)}`,
                customerName:
                  finalCustomerName ||
                  (finalCustomerId ? customerList.find((c) => c._id === finalCustomerId)?.name : undefined),
                customerPhone: finalCustomerPhone,
                paymentMode: paymentDestinationMap[targetAccount],
                items: attachedItemsList,
                grandTotal: numericAmount,
                amountPaid: numericAmount,
                footerNoteUrdu: '*** شُکریہ تشریف آوری کا ***',
              },
              { paperWidth: '58mm', openDrawer: targetAccount === 'PHYSICAL_CASH' }
            );
          } catch (printErr) {
            console.warn('Print error during quick sale:', printErr);
          }
        }
        onSuccess(numericAmount, targetAccount, note.trim() || undefined);
        onClose();
      } else {
        setErrorMsg(res.message || 'Sale record karne mein masla aya.');
      }
    } catch (err: any) {
      // Offline fallback: Create LedgerEntry directly with items breakdown
      try {
        const attachedItemsList =
          showItemsSection && selectedItems.length > 0
            ? selectedItems.map((s) => {
                const inv = inventoryList.find((i) => i._id === s.itemId);
                return {
                  name: inv ? inv.itemName : 'Item',
                  quantity: s.quantity,
                  unitPrice: inv ? inv.retailPrice : 0,
                  total: (inv ? inv.retailPrice : 0) * s.quantity,
                };
              })
            : undefined;

        const itemsSummary = attachedItemsList ? attachedItemsList.map((i) => `${i.name} x${i.quantity}`).join(', ') : '';
        const category = attachedItemsList ? 'Retail Product Sale' : 'Counter Sale';
        const description = note.trim()
          ? itemsSummary
            ? `${note.trim()} • ${itemsSummary}`
            : note.trim()
          : itemsSummary
          ? `Items: ${itemsSummary}`
          : 'Quick Counter Cash Sale';

        await ledgerApi.create({
          entryType: 'CASH_IN',
          amount: numericAmount,
          paymentMode:
            targetAccount === 'DIGITAL_WALLET'
              ? 'JAZZCASH'
              : targetAccount === 'BANK_ACCOUNT'
              ? 'BANK_TRANSFER'
              : 'CASH',
          category,
          description,
          items: attachedItemsList,
          isSettled: true,
        });
      } catch (e) {
        // fallback to till top-up
        try {
          await cashDrawerApi.topUpTill({
            targetAccount,
            amount: numericAmount,
            note: note.trim() || 'Quick Counter Cash Sale',
          });
        } catch (err2) {
          // ignore
        }
      }
      if (shouldPrint) {
        try {
          await thermalPrinterService.printReceipt(
            {
              storeName: 'DIGI HISAB KAROBAR',
              receiptNo: `SALE-${Date.now().toString().slice(-6)}`,
              customerName:
                finalCustomerName ||
                (finalCustomerId ? customerList.find((c) => c._id === finalCustomerId)?.name : undefined),
              customerPhone: finalCustomerPhone,
              paymentMode: paymentDestinationMap[targetAccount],
              items: attachedItemsList || [{ name: 'Counter Cash Sale', quantity: 1, total: numericAmount }],
              grandTotal: numericAmount,
              amountPaid: numericAmount,
              footerNoteUrdu: '*** شُکریہ تشریف آوری کا ***',
            },
            { paperWidth: '58mm', openDrawer: targetAccount === 'PHYSICAL_CASH' }
          );
        } catch (printErr) {
          console.warn('Print error during quick sale offline fallback:', printErr);
        }
      }
      onSuccess(numericAmount, targetAccount, note.trim() || undefined);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="cash" size={20} color="#006C4E" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Quick Cash Sale</Text>
                  <Text style={styles.headerSubtitle}>فوری نقد سیل • فوری رقم شامل کریں</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#991B1B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Large Focused Currency Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Enter Sale Amount (Rs.) / نقد سیل رقم *</Text>
              <View style={styles.largeAmountBox}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.largeAmountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  value={amount}
                  onChangeText={setAmount}
                  autoFocus={true}
                />
              </View>

              {/* Quick Amount Fast Chips */}
              <View style={styles.quickChipsScrollRow}>
                {[50, 100, 500, 1000, 2000].map((step) => (
                  <TouchableOpacity
                    key={step}
                    style={styles.quickChip}
                    onPress={() => {
                      const current = parseFloat(amount) || 0;
                      setAmount(String(current + step));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>+{step}</Text>
                  </TouchableOpacity>
                ))}
                {amount ? (
                  <TouchableOpacity
                    style={[styles.quickChip, styles.quickChipClear]}
                    onPress={() => setAmount('')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickChipText, { color: '#EF4444' }]}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {showItemsSection && selectedItems.length > 0 && (
                <View style={styles.autoCalcBadge}>
                  <Ionicons name="sparkles" size={12} color="#006C4E" style={{ marginRight: 4 }} />
                  <Text style={styles.autoCalcBadgeText}>
                    Auto-calculated from attached items (خودکار قیمت: Rs. {amount || 0})
                  </Text>
                </View>
              )}
            </View>

            {/* Payment Destination Selector (Segmented Tabs) */}
            <Text style={styles.sectionLabel}>💳 Payment Destination (رقم جمع کرنے کا کھاتہ):</Text>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  targetAccount === 'PHYSICAL_CASH' && styles.segmentTabActive,
                ]}
                onPress={() => setTargetAccount('PHYSICAL_CASH')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={targetAccount === 'PHYSICAL_CASH' ? '#006C4E' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentTabText,
                    targetAccount === 'PHYSICAL_CASH' && styles.segmentTabTextActive,
                  ]}
                >
                  Cash (کیش)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  targetAccount === 'DIGITAL_WALLET' && styles.segmentTabActive,
                ]}
                onPress={() => setTargetAccount('DIGITAL_WALLET')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={targetAccount === 'DIGITAL_WALLET' ? '#006C4E' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentTabText,
                    targetAccount === 'DIGITAL_WALLET' && styles.segmentTabTextActive,
                  ]}
                >
                  Wallet (والٹ)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentTab,
                  targetAccount === 'BANK_ACCOUNT' && styles.segmentTabActive,
                ]}
                onPress={() => setTargetAccount('BANK_ACCOUNT')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="card-outline"
                  size={16}
                  color={targetAccount === 'BANK_ACCOUNT' ? '#006C4E' : '#64748B'}
                />
                <Text
                  style={[
                    styles.segmentTabText,
                    targetAccount === 'BANK_ACCOUNT' && styles.segmentTabTextActive,
                  ]}
                >
                  Bank (بینک)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Short Note Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Short Note / تفصیل (Optional):</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Hair cut & shave / Counter sale"
                placeholderTextColor="#94A3B8"
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* ⭐ PRO Customer Loyalty & RFM Tagging Section */}
            <View style={styles.loyaltySectionContainer}>
              <TouchableOpacity
                style={styles.loyaltyToggleBar}
                onPress={() => setShowCustomerSection(!showCustomerSection)}
                activeOpacity={0.8}
              >
                <View style={styles.loyaltyToggleLeft}>
                  <View style={styles.proTagBadge}>
                    <Text style={styles.proTagText}>⭐ PRO</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loyaltyToggleTitle}>
                      کسٹمر لائلٹی ٹیگنگ (VIP Loyalty Tracking)
                    </Text>
                    <Text style={styles.loyaltyToggleSub} numberOfLines={1}>
                      {selectedCustomerId
                        ? `منسلک: ${customerList.find((c) => c._id === selectedCustomerId)?.name || 'گاہک'}`
                        : customCustomerName.trim()
                        ? `منسلک: ${customCustomerName.trim()}`
                        : 'گاہک منسلک کر کے VIP درجہ بندی بنائیں'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={showCustomerSection ? 'chevron-up-circle' : 'chevron-down-circle'}
                  size={20}
                  color="#D97706"
                />
              </TouchableOpacity>

              {showCustomerSection && (
                <View style={styles.loyaltyCardBody}>
                  {/* Mode Tabs */}
                  <View style={styles.loyaltyModeTabs}>
                    <TouchableOpacity
                      style={[
                        styles.loyaltyModeTab,
                        customerMode === 'EXISTING' && styles.loyaltyModeTabActive,
                      ]}
                      onPress={() => setCustomerMode('EXISTING')}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="people-outline"
                        size={14}
                        color={customerMode === 'EXISTING' ? '#006C4E' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.loyaltyModeTabText,
                          customerMode === 'EXISTING' && styles.loyaltyModeTabTextActive,
                        ]}
                      >
                        موجودہ گاہک (Existing)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.loyaltyModeTab,
                        customerMode === 'NEW' && styles.loyaltyModeTabActive,
                      ]}
                      onPress={() => {
                        setCustomerMode('NEW');
                        setSelectedCustomerId(null);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="person-add-outline"
                        size={14}
                        color={customerMode === 'NEW' ? '#006C4E' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.loyaltyModeTabText,
                          customerMode === 'NEW' && styles.loyaltyModeTabTextActive,
                        ]}
                      >
                        نیا واک اِن (New Walk-In)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Existing Customer Selector */}
                  {customerMode === 'EXISTING' ? (
                    <View style={styles.existingCustomerBox}>
                      <TextInput
                        style={styles.customerSearchInput}
                        placeholder="گاہک تلاش کریں (نام یا فون)..."
                        placeholderTextColor="#94A3B8"
                        value={customerSearchQuery}
                        onChangeText={setCustomerSearchQuery}
                      />
                      {isLoadingCustomers ? (
                        <ActivityIndicator size="small" color="#006C4E" style={{ marginVertical: 8 }} />
                      ) : (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.customerChipsScroll}
                        >
                          {customerList
                            .filter(
                              (c) =>
                                !customerSearchQuery.trim() ||
                                c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                                c.phone.includes(customerSearchQuery)
                            )
                            .slice(0, 15)
                            .map((cust) => {
                              const isSelected = selectedCustomerId === cust._id;
                              return (
                                <TouchableOpacity
                                  key={cust._id}
                                  style={[
                                    styles.customerChip,
                                    isSelected && styles.customerChipSelected,
                                  ]}
                                  onPress={() => {
                                    if (isSelected) {
                                      setSelectedCustomerId(null);
                                    } else {
                                      setSelectedCustomerId(cust._id);
                                      setCustomCustomerName('');
                                      setCustomCustomerPhone('');
                                    }
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Ionicons
                                    name={isSelected ? 'checkmark-circle' : 'person-circle-outline'}
                                    size={16}
                                    color={isSelected ? '#FFFFFF' : '#006C4E'}
                                  />
                                  <View style={{ marginLeft: 6 }}>
                                    <Text
                                      style={[
                                        styles.customerChipName,
                                        isSelected && styles.customerChipNameSelected,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {cust.name}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.customerChipPhone,
                                        isSelected && styles.customerChipPhoneSelected,
                                      ]}
                                    >
                                      {cust.phone}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                        </ScrollView>
                      )}
                      {selectedCustomerId && (
                        <TouchableOpacity
                          style={styles.clearSelectedCustomerBtn}
                          onPress={() => setSelectedCustomerId(null)}
                        >
                          <Ionicons name="close-circle" size={14} color="#EF4444" />
                          <Text style={styles.clearSelectedCustomerText}>منسلک گاہک ختم کریں</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={styles.newCustomerBox}>
                      <View style={styles.newCustomerRow}>
                        <TextInput
                          style={[styles.customerTextInput, { flex: 1.2 }]}
                          placeholder="گاہک کا نام (مثلاً: حاجی عمران)"
                          placeholderTextColor="#94A3B8"
                          value={customCustomerName}
                          onChangeText={setCustomCustomerName}
                        />
                        <TextInput
                          style={[styles.customerTextInput, { flex: 1 }]}
                          placeholder="فون (03001234567)"
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          value={customCustomerPhone}
                          onChangeText={setCustomCustomerPhone}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* High-Margin Clearance Bundle Deal Quick Selector */}
            {availableBundles.length > 0 && (
              <View style={styles.bundleDealsContainer}>
                <View style={styles.bundleDealsHeader}>
                  <Ionicons name="gift" size={15} color="#047857" />
                  <Text style={styles.bundleDealsTitle}>
                    🎁 کلیئرنس بنڈل ڈیل شامل کریں (Clearance Bundles):
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bundleScrollRow}>
                  {availableBundles.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={styles.bundleChip}
                      onPress={() => handleSelectBundle(b)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.bundleChipTop}>
                        <Text style={styles.bundleChipTitle} numberOfLines={1}>
                          {b.anchorItem.itemName} + {b.driverItem.itemName}
                        </Text>
                        <View style={styles.bundleChipDiscount}>
                          <Text style={styles.bundleChipDiscountText}>-{b.bundleDiscountPercent}%</Text>
                        </View>
                      </View>
                      <View style={styles.bundleChipPriceRow}>
                        <Text style={styles.bundleChipOldPrice}>Rs. {b.originalCombinedRetail}</Text>
                        <Text style={styles.bundleChipNewPrice}>Rs. {b.bundleRetailPrice}</Text>
                        <Text style={styles.bundleChipProfit}>(+{b.netGrossMarginPercent}% صاف)</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Optional Itemized Stock Attachment Section */}
            <View style={styles.stockSectionContainer}>
              <View style={styles.stockButtonsRow}>
                <TouchableOpacity
                  style={[styles.toggleStockBtn, { flex: 1, marginRight: 8 }]}
                  onPress={() => {
                    if (!showItemsSection && selectedItems.length === 0) {
                      handleAddItemRow();
                    }
                    setShowItemsSection(!showItemsSection);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={showItemsSection ? 'chevron-down-circle' : 'add-circle-outline'}
                    size={18}
                    color="#006C4E"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.toggleStockBtnText} numberOfLines={1}>
                    {showItemsSection ? 'Hide Items' : '+ Add Items'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rapidScanBtn}
                  onPress={() => setShowBarcodeScanner(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="barcode-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.rapidScanBtnText}>📷 Rapid Scan</Text>
                </TouchableOpacity>
              </View>

              {showItemsSection && (
                <View style={styles.itemsCardGroup}>
                  {/* Smart Auto-Sum Option */}
                  {selectedItems.length > 0 && (
                    <View style={styles.autoSumRow}>
                      <TouchableOpacity style={styles.autoSumChip} onPress={handleAutoSum} activeOpacity={0.8}>
                        <Ionicons name="calculator-outline" size={14} color="#006C4E" style={{ marginRight: 4 }} />
                        <Text style={styles.autoSumChipText}>Auto-fill sale amount from selected items</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Selected Items Rows */}
                  {selectedItems.map((row, index) => {
                    const currentInvItem = inventoryList.find((i) => i._id === row.itemId);
                    const stockAvail = currentInvItem ? currentInvItem.stockOnHand : 0;
                    const unitLabel = currentInvItem ? currentInvItem.unitOfMeasure : 'pcs';

                    return (
                      <View key={index} style={styles.itemRowCard}>
                        {/* Selector Trigger Header */}
                        <TouchableOpacity
                          style={styles.itemSelectorBtn}
                          onPress={() => setActivePickerIndex(activePickerIndex === index ? null : index)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.selectedItemText}>
                            {currentInvItem ? currentInvItem.itemName : 'Select Inventory Item...'}
                          </Text>
                          <View style={styles.itemPriceBadge}>
                            <Text style={styles.itemPriceBadgeText}>
                              Rs. {currentInvItem ? currentInvItem.retailPrice : 0}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 4 }} />
                          </View>
                        </TouchableOpacity>

                        {/* Dropdown Options List if Open */}
                        {activePickerIndex === index && (
                          <View style={styles.pickerDropdown}>
                            <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                              {inventoryList.map((item) => (
                                <TouchableOpacity
                                  key={item._id}
                                  style={[
                                    styles.pickerOption,
                                    item._id === row.itemId && styles.pickerOptionSelected,
                                  ]}
                                  onPress={() => handleSelectItem(index, item._id)}
                                >
                                  <Text style={styles.pickerOptionText}>{item.itemName}</Text>
                                  <Text style={styles.pickerOptionSub}>
                                    Rs. {item.retailPrice} • Stock: {item.stockOnHand} {item.unitOfMeasure}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}

                        {/* Controls & Stock Indicator */}
                        <View style={styles.rowControlsBar}>
                          {/* Stock Available Badge */}
                          <View style={styles.stockBadge}>
                            <Text
                              style={[
                                styles.stockBadgeText,
                                stockAvail <= 0 && { color: '#EF4444' },
                              ]}
                            >
                              Available: {stockAvail} {unitLabel}
                            </Text>
                          </View>

                          {/* Stepper */}
                          <View style={styles.stepperGroup}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleUpdateQuantity(index, -1)}
                            >
                              <Ionicons name="remove" size={14} color="#334155" />
                            </TouchableOpacity>

                            <View style={styles.qtyBox}>
                              <Text style={styles.qtyText}>{row.quantity}</Text>
                            </View>

                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => handleUpdateQuantity(index, 1)}
                            >
                              <Ionicons name="add" size={14} color="#334155" />
                            </TouchableOpacity>
                          </View>

                          {/* Remove Row Button */}
                          <TouchableOpacity
                            style={styles.removeRowBtn}
                            onPress={() => handleRemoveItemRow(index)}
                          >
                            <Ionicons name="close-circle" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {/* Add Another Item Button */}
                  <TouchableOpacity
                    style={styles.addAnotherBtn}
                    onPress={handleAddItemRow}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#006C4E" style={{ marginRight: 4 }} />
                    <Text style={styles.addAnotherBtnText}>+ Add Another Item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Save & Add to Till Primary Button */}
            <TouchableOpacity
              style={[styles.saveBtn, submitting && styles.btnDisabled]}
              onPress={() => handleSave(false)}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Save & Add to Till (سیو کریں)</Text>
                </>
              )}
            </TouchableOpacity>

            {/* One-Touch Print Kacha Parcha (58mm) & Save Action */}
            <TouchableOpacity
              style={[styles.printKachaParchaBtn, submitting && styles.btnDisabled]}
              onPress={() => handleSave(true)}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#0B2239" size="small" />
              ) : (
                <>
                  <Ionicons name="print" size={20} color="#0B2239" style={{ marginRight: 8 }} />
                  <Text style={styles.printKachaParchaBtnText}>🖨️ Print Kacha Parcha (58mm)</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>

    {/* Continuous High-Velocity Camera Barcode Hardware Stream Modal */}
      <ContinuousBarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onCheckout={handleScannedCheckout}
        inventoryList={inventoryList}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
    maxHeight: '94%',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  largeAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    borderWidth: 2,
    borderColor: '#006C4E',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 60,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '800',
    color: '#006C4E',
    marginRight: 8,
  },
  largeAmountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickChipsScrollRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickChipClear: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: '#E8F5EE',
    borderColor: '#006C4E',
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTabTextActive: {
    color: '#006C4E',
    fontWeight: '800',
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  bundleDealsContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  bundleDealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bundleDealsTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#065F46',
  },
  bundleScrollRow: {
    flexDirection: 'row',
  },
  bundleChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginRight: 8,
    width: 220,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  bundleChipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bundleChipTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  bundleChipDiscount: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bundleChipDiscountText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#047857',
  },
  bundleChipPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bundleChipOldPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  bundleChipNewPrice: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#047857',
  },
  bundleChipProfit: {
    fontSize: 9.5,
    color: '#059669',
    fontWeight: '700',
  },
  stockSectionContainer: {
    marginBottom: 16,
  },
  stockButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rapidScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006C4E',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rapidScanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleStockBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006C4E',
  },
  itemsCardGroup: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  autoSumRow: {
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  autoSumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#006C4E',
  },
  autoSumChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006C4E',
  },
  itemRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  itemSelectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  selectedItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  itemPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemPriceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  pickerDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#006C4E',
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 8,
    elevation: 3,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerOptionSelected: {
    backgroundColor: '#E8F5EE',
  },
  pickerOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pickerOptionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rowControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  stockBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  stepperGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBox: {
    minWidth: 24,
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  removeRowBtn: {
    padding: 2,
  },
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#006C4E',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addAnotherBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  saveBtn: {
    backgroundColor: '#006C4E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  printKachaParchaBtn: {
    backgroundColor: '#00D2B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#00D2B4',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  printKachaParchaBtnText: {
    color: '#0B2239',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  autoCalcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  autoCalcBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006C4E',
  },
  loyaltySectionContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 14,
    overflow: 'hidden',
  },
  loyaltyToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loyaltyToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  proTagBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  loyaltyToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  loyaltyToggleSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  loyaltyCardBody: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    padding: 12,
  },
  loyaltyModeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  loyaltyModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    gap: 4,
  },
  loyaltyModeTabActive: {
    backgroundColor: '#E8F5EE',
    borderWidth: 1,
    borderColor: '#006C4E',
  },
  loyaltyModeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  loyaltyModeTabTextActive: {
    color: '#006C4E',
    fontWeight: '800',
  },
  existingCustomerBox: {
    gap: 8,
  },
  customerSearchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 40,
  },
  customerChipsScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  customerChipSelected: {
    backgroundColor: '#006C4E',
    borderColor: '#006C4E',
  },
  customerChipName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
  },
  customerChipNameSelected: {
    color: '#FFFFFF',
  },
  customerChipPhone: {
    fontSize: 10,
    color: '#64748B',
  },
  customerChipPhoneSelected: {
    color: '#E8F5EE',
  },
  clearSelectedCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  clearSelectedCustomerText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  newCustomerBox: {
    marginTop: 4,
  },
  newCustomerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customerTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    minHeight: 40,
  },
});
