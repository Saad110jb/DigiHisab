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
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ledgerApi, ILedgerEntry } from '../api/ledger.api';
import { ICounterparty } from '../api/counterparty.api';
import { aiApi } from '../api/ai.api';
import { wholesalePoApi } from '../api/wholesalePo.api';
import { getImageUrl } from '../api/client';
import { generateUniqueInvoiceNo } from '../utils/invoiceGenerator';
import { profileApi, IPaymentChannels } from '../api/profile.api';
import { jevDoubleEntryApi, JevLedgerValidation } from '../api/jevDoubleEntry.api';
import { mandiArbitrageApi, IBillItemEvaluation } from '../api/mandiArbitrage.api';

interface AddSupplierBillModalProps {
  visible: boolean;
  suppliers: ICounterparty[];
  onClose: () => void;
  onSuccess: (updatedSupplierName: string, amount: number) => void;
  initialSupplierId?: string;
  initialAmount?: number;
  initialPoId?: string;
  initialItems?: { inventoryItemId?: string; itemName: string; quantityOrdered: number; unitCost: number }[];
}

export const AddSupplierBillModal: React.FC<AddSupplierBillModalProps> = ({
  visible,
  suppliers,
  onClose,
  onSuccess,
  initialSupplierId,
  initialAmount,
  initialPoId,
  initialItems,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialSupplierId || (suppliers.length > 0 ? suppliers[0]._id : '')
  );
  const [invoiceNo, setInvoiceNo] = useState('');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [dueDateDays, setDueDateDays] = useState('7');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Supplier Advance & Stock Sync options
  const [useAdvanceCredit, setUseAdvanceCredit] = useState(true);
  const [stockSyncEnabled, setStockSyncEnabled] = useState(true);
  const [poId, setPoId] = useState<string | undefined>(initialPoId);
  const [items, setItems] = useState<
    { inventoryItemId?: string; itemName: string; quantityOrdered: number; unitCost: number }[]
  >(initialItems || []);
  const [mandiEvaluations, setMandiEvaluations] = useState<IBillItemEvaluation[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnitCost, setNewItemUnitCost] = useState('');
  const [showItemEntry, setShowItemEntry] = useState(false);

  // AI OCR & Disk Upload States
  const [extractingOcr, setExtractingOcr] = useState(false);
  const [ocrBadgeText, setOcrBadgeText] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Sub-panel Monthly Bills History State
  const [billHistory, setBillHistory] = useState<ILedgerEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Image Preview Modal State
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  // Payment Channels & Jev Double-Entry Solvency State
  const [paymentChannels, setPaymentChannels] = useState<IPaymentChannels>({
    cashDrawer: 45000,
    bankAccount: 125000,
    digitalWallet: 32000,
  });
  const [payCashNow, setPayCashNow] = useState(false);
  const [immediateCashAmount, setImmediateCashAmount] = useState('');
  const [immediatePaymentMode, setImmediatePaymentMode] = useState<'CASH' | 'BANK' | 'WALLET'>('CASH');
  const [jevValidation, setJevValidation] = useState<JevLedgerValidation | null>(null);

  const selectedSup = suppliers.find((s) => s._id === selectedSupplierId) || suppliers[0];

  const fetchProfileChannels = async () => {
    try {
      const prof = await profileApi.getProfile();
      if (prof.paymentChannels) {
        setPaymentChannels(prof.paymentChannels);
      }
    } catch (e) {
      // Offline fallback
    }
  };

  const fetchMonthlyBillsHistory = async () => {
    setLoadingHistory(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const res = await ledgerApi.getAll({
        entryType: 'PAYABLE',
        startDate: startOfMonth.toISOString(),
        limit: 100,
      });

      if (res.success && res.data) {
        setBillHistory(res.data);
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (visible) {
      if (initialSupplierId) {
        setSelectedSupplierId(initialSupplierId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0]._id);
      }

      if (initialAmount !== undefined) {
        setAmount(String(initialAmount));
      }

      if (initialPoId) setPoId(initialPoId);
      if (initialItems) setItems(initialItems);

      const activeSup = suppliers.find((s) => s._id === (initialSupplierId || selectedSupplierId)) || suppliers[0];
      setInvoiceNo(generateUniqueInvoiceNo(activeSup?.name));
      fetchMonthlyBillsHistory();
      fetchProfileChannels();
      setPayCashNow(false);
      setImmediateCashAmount('');
    }
  }, [visible, selectedSupplierId, initialSupplierId, initialAmount, initialPoId, initialItems]);

  const totalBillsSum = billHistory.reduce((sum, item) => sum + (item.amount || 0), 0);

  const processImageOcr = async (base64Uri: string) => {
    // Check size limit (1 MB = 1,048,576 bytes)
    const cleanBase64 = base64Uri.replace(/^data:image\/\w+;base64,/, '');
    const estimatedSizeBytes = Math.ceil((cleanBase64.length * 3) / 4);
    if (estimatedSizeBytes > 1 * 1024 * 1024) {
      const sizeMb = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);
      setErrorMsg(`⚠️ Tasweer ka size ${sizeMb} MB hai (Exceeds 1 MB limit). Baraye meherbani 1 MB se choti tasweer muntakhib karein.`);
      return;
    }

    setReceiptImage(base64Uri);
    setExtractingOcr(true);
    setErrorMsg(null);
    try {
      // 1. Upload base64 asset to disk to get clean URL
      const uploadRes = await aiApi.uploadAsset(base64Uri);
      if (uploadRes.success && uploadRes.data?.url) {
        setReceiptImage(uploadRes.data.url);
      }

      // 2. Multimodal OCR Extraction
      const ocrRes = await aiApi.extractOcrData(base64Uri);
      if (ocrRes.success && ocrRes.data) {
        const data = ocrRes.data;
        const targetAmt = data.amount || data.dueAmount || 0;
        if (targetAmt > 0) {
          setAmount(String(targetAmt));
        }
        if (data.invoiceNumber) setInvoiceNo(data.invoiceNumber);
        if (data.vendorName) {
          const foundSup = suppliers.find(
            (s) => s.name.toLowerCase().includes(data.vendorName!.toLowerCase())
          );
          if (foundSup) setSelectedSupplierId(foundSup._id);
        }

        if (targetAmt > 0) {
          setOcrBadgeText(`✨ Extracted Amount: Rs. ${targetAmt.toLocaleString()} • Inv #: ${data.invoiceNumber || 'N/A'}`);
        } else {
          setOcrBadgeText('📷 Bill Photo Attached (Ready for storage)');
        }

        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          const parsed = data.items.map((it: any) => ({
            itemName: it.name || it.itemName || 'Item',
            quantityOrdered: Number(it.quantity || 1),
            unitCost: Number(it.unitPrice || it.unitCost || 0),
          }));
          setItems(parsed);
        }
      }
    } catch (e: any) {
      const errText = e.response?.data?.message || e.message;
      setOcrBadgeText('📷 Bill Photo Attached (Disk Storage)');
      if (errText?.includes('1 MB')) {
        setErrorMsg(errText);
      }
    } finally {
      setExtractingOcr(false);
    }
  };

  // Real-time Mandi Arbitrage Rate Evaluation Hook
  useEffect(() => {
    if (items.length > 0) {
      const payload = items.map((i) => ({
        name: i.itemName,
        unitPrice: i.unitCost,
        quantity: i.quantityOrdered,
      }));
      mandiArbitrageApi.evaluateBillItems(payload, selectedSupplierId)
        .then((res) => {
          if (res.success && res.data) {
            setMandiEvaluations(res.data);
          }
        })
        .catch(() => {});
    } else {
      setMandiEvaluations([]);
    }
  }, [items, selectedSupplierId]);

  const handleAddManualItem = () => {
    if (!newItemName.trim() || !newItemUnitCost.trim()) {
      return;
    }
    const cost = parseFloat(newItemUnitCost) || 0;
    const qty = parseFloat(newItemQty) || 1;
    if (cost <= 0) return;

    const updated = [
      ...items,
      {
        itemName: newItemName.trim(),
        quantityOrdered: qty,
        unitCost: cost,
      },
    ];
    setItems(updated);
    setNewItemName('');
    setNewItemQty('');
    setNewItemUnitCost('');

    const totalItemCost = updated.reduce((s, it) => s + it.quantityOrdered * it.unitCost, 0);
    if (!amount || parseFloat(amount) < totalItemCost) {
      setAmount(String(totalItemCost));
    }
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  const handleCameraLaunch = async () => {
    try {
      setErrorMsg(null);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Camera permission required to capture invoice photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        processImageOcr(base64Uri);
      }
    } catch (err: any) {
      setErrorMsg('Failed to open camera: ' + err.message);
    }
  };

  const handleGalleryLaunch = async () => {
    try {
      setErrorMsg(null);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Gallery permission required to select invoice photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const base64Uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        processImageOcr(base64Uri);
      }
    } catch (err: any) {
      setErrorMsg('Failed to open gallery: ' + err.message);
    }
  };

  const grossAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const availableAdvance = selectedSup?.advanceDeposit || 0;
  const advanceApplied = useAdvanceCredit && availableAdvance > 0 ? Math.min(availableAdvance, grossAmount) : 0;
  const netBeforeImmediate = Math.max(0, grossAmount - advanceApplied);

  const parsedImmediatePay = payCashNow
    ? Math.min(parseFloat(String(immediateCashAmount).replace(/[^0-9.]/g, '')) || 0, netBeforeImmediate)
    : 0;
  const remainingDebtPayable = Math.max(0, netBeforeImmediate - parsedImmediatePay);

  const getSelectedChannelBalance = () => {
    if (immediatePaymentMode === 'CASH') return paymentChannels.cashDrawer ?? 0;
    if (immediatePaymentMode === 'BANK') return paymentChannels.bankAccount ?? 0;
    if (immediatePaymentMode === 'WALLET') return paymentChannels.digitalWallet ?? 0;
    return 0;
  };

  const selectedChannelBalance = getSelectedChannelBalance();
  const isSolvencyBreached = payCashNow && parsedImmediatePay > selectedChannelBalance;
  const shortageAmount = isSolvencyBreached ? parsedImmediatePay - selectedChannelBalance : 0;

  useEffect(() => {
    if (grossAmount > 0) {
      jevDoubleEntryApi
        .validateTransaction({
          transactionType: 'SUPPLIER_BILL',
          grossAmount,
          advanceOffset: advanceApplied,
          immediatePaymentAmount: parsedImmediatePay,
          paymentMode: immediatePaymentMode,
        })
        .then((res) => {
          if (res.success && res.data) {
            setJevValidation(res.data);
          }
        })
        .catch(() => {});
    } else {
      setJevValidation(null);
    }
  }, [grossAmount, advanceApplied, parsedImmediatePay, immediatePaymentMode]);

  const handleSubmitBill = async () => {
    setErrorMsg(null);

    if (!selectedSup) {
      setErrorMsg('Baraye meherbani pehle supplier muntakhib karein.');
      return;
    }

    if (grossAmount <= 0) {
      setErrorMsg('Baraye meherbani sahi bill ki raqam darj karein (Valid amount > 0 required).');
      return;
    }

    if (isSolvencyBreached) {
      setErrorMsg(
        `⚠️ Jev Solvency Halt: منتخب کھاتے میں رقم ناکافی ہے۔ ادائیگی: Rs. ${parsedImmediatePay.toLocaleString()}، موجود: Rs. ${selectedChannelBalance.toLocaleString()} (کمی: Rs. ${shortageAmount.toLocaleString()})۔ منفی گلہ بیلنس سے بچنے کے لیے ٹرانزیکشن روک دی گئی ہے۔`
      );
      return;
    }

    setSubmitting(true);
    try {
      const days = parseInt(dueDateDays, 10) || 7;
      const targetDueDate = new Date();
      targetDueDate.setDate(targetDueDate.getDate() + days);

      const response = await wholesalePoApi.createSupplierBillFromPo({
        supplierId: selectedSup._id,
        poId: poId,
        invoiceNo: invoiceNo.trim() || undefined,
        billAmount: grossAmount,
        useAdvance: useAdvanceCredit,
        stockSync: stockSyncEnabled,
        dueDate: targetDueDate.toISOString(),
        items: items,
        notes: notes.trim() || undefined,
        immediatePaymentAmount: parsedImmediatePay,
        paymentMode: immediatePaymentMode,
      });

      if (response.success && response.data) {
        if (response.data.ledgerEntry) {
          setBillHistory((prev) => [response.data.ledgerEntry, ...prev]);
        }

        const finalOwed = response.data.netPayable !== undefined ? response.data.netPayable : remainingDebtPayable;
        onSuccess(selectedSup.name, finalOwed);
        setInvoiceNo('');
        setAmount('');
        setNotes('');
        setReceiptImage(null);
        setPayCashNow(false);
        setImmediateCashAmount('');
        setErrorMsg(null);
      } else {
        setErrorMsg(response.message || 'Supplier bill save karne mein masla aya.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message || 'Bill save karne mein nakami hui.';
      setErrorMsg(serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBill = (bill: ILedgerEntry) => {
    Alert.alert(
      'Delete Supplier Bill (سپلائر بل ڈیلیٹ)',
      `Kya aap PKR ${bill.amount.toLocaleString()} ka supplier bill delete karna chahte hain? Yeh "Maine Dene Hain" ke total se nikal diya jayega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete & Rollback (ڈیلیٹ کریں)',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(bill._id);
            try {
              await ledgerApi.delete(bill._id);

              // Optimistically filter deleted bill out
              setBillHistory((prev) => prev.filter((item) => item._id !== bill._id));

              // Trigger parent dashboard refresh
              onSuccess(selectedSup?.name || 'Supplier', -bill.amount);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete supplier bill.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const formatInvoiceDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
  };

  const getSupplierName = (bill: ILedgerEntry): string => {
    if (bill.counterpartyId) {
      const cp = bill.counterpartyId as any;
      if (typeof cp === 'object' && cp.name) return cp.name;
      const found = suppliers.find((s) => s._id === cp);
      if (found) return found.name;
    }
    return selectedSup?.name || 'Supplier';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="document-text" size={20} color="#E11D48" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Add Supplier Bill / Invoice (سپلائر بل درج کریں)</Text>
                <Text style={styles.headerSubtitle}>شپمنٹ بل منہا کیے بغیر واجب الادا ("میں نے دینے ہیں") لاگ کریں</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Inline Error Banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#E11D48" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Supplier Selection Chips */}
            <Text style={styles.label}>سپلائر منتخب کریں (Select Supplier):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supScroll}>
              {suppliers.map((sup) => {
                const isSel = selectedSupplierId === sup._id;
                return (
                  <TouchableOpacity
                    key={sup._id}
                    style={[styles.supChip, isSel && styles.supChipActive]}
                    onPress={() => {
                      setSelectedSupplierId(sup._id);
                      setErrorMsg(null);
                    }}
                  >
                    <Ionicons name="business" size={14} color={isSel ? '#FFFFFF' : '#0284C7'} />
                    <Text style={[styles.supChipText, isSel && styles.supChipTextActive]}>
                      {sup.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Advance Credit Available Badge */}
            {selectedSup?.advanceDeposit && selectedSup.advanceDeposit > 0 ? (
              <View style={styles.advanceBadgeCard}>
                <Ionicons name="sparkles" size={16} color="#059669" />
                <Text style={styles.advanceBadgeText}>
                  Advance Credit Available (پیشگی کریڈٹ): Rs. {selectedSup.advanceDeposit.toLocaleString()}
                </Text>
              </View>
            ) : null}

            {/* Bill Info Inputs */}
            <Text style={styles.label}>انواائس نمبر (Invoice / Bill #):</Text>
            <TextInput
              style={styles.inputSimple}
              placeholder="e.g. INV-2026-889"
              placeholderTextColor="#94A3B8"
              value={invoiceNo}
              onChangeText={setInvoiceNo}
            />

            <Text style={styles.label}>واجب الادا رقم (Total Gross Bill Amount):</Text>
            <View
              style={[
                styles.inputWrapper,
                (!amount || amount === '0' || (parseFloat(amount) || 0) <= 0) && !!errorMsg && styles.inputWrapperError,
              ]}
            >
              <Text style={styles.currencyPrefix}>Rs.</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={amount}
                onChangeText={(val) => {
                  setAmount(val);
                  setErrorMsg(null);
                }}
              />
            </View>

            {/* Preset Amount Chips */}
            <View style={styles.quickAmtRow}>
              {[1000, 5000, 10000, 25000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.quickAmtChip}
                  onPress={() => {
                    const current = parseFloat(amount) || 0;
                    setAmount(String(current === 0 ? preset : current + preset));
                    setErrorMsg(null);
                  }}
                >
                  <Text style={styles.quickAmtText}>+Rs. {preset.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Advance Auto-Deduction Switch & Settlement Calculation */}
            {selectedSup?.advanceDeposit && selectedSup.advanceDeposit > 0 ? (
              <View style={styles.advanceDeductionCard}>
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setUseAdvanceCredit(!useAdvanceCredit)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={useAdvanceCredit ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={useAdvanceCredit ? '#059669' : '#94A3B8'}
                  />
                  <Text style={styles.toggleText}>
                    Existing Advance Credit (پیشگی) istemal karein (Rs. {selectedSup.advanceDeposit.toLocaleString()})
                  </Text>
                </TouchableOpacity>

                {useAdvanceCredit && (
                  <View style={styles.breakdownBox}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Gross Bill Total:</Text>
                      <Text style={styles.breakdownVal}>Rs. {grossAmount.toLocaleString()}</Text>
                    </View>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Advance Peshgi Applied:</Text>
                      <Text style={styles.breakdownValDeduct}>- Rs. {advanceApplied.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.breakdownRow, styles.breakdownTotalRow]}>
                      <Text style={styles.breakdownTotalLabel}>Net Balance Owed (Maine Dene):</Text>
                      <Text style={styles.breakdownTotalVal}>Rs. {netBeforeImmediate.toLocaleString()}</Text>
                    </View>
                  </View>
                )}
              </View>
            ) : null}

            {/* Stock Inventory Synchronization Toggle */}
            <View style={styles.stockSyncCard}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setStockSyncEnabled(!stockSyncEnabled)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={stockSyncEnabled ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={stockSyncEnabled ? '#0284C7' : '#94A3B8'}
                />
                <Text style={styles.toggleText}>
                  Dukaan ka stock barhayein (Increase Inventory Stock)
                </Text>
              </TouchableOpacity>

              {stockSyncEnabled && (
                <View style={styles.itemsPreviewBox}>
                  <View style={styles.itemsSectionHeaderRow}>
                    <Text style={styles.itemsPreviewHeader}>
                      📦 بل آئٹمز و ریٹ چیک (Line Items & Rate Check - {items.length}):
                    </Text>
                    <TouchableOpacity
                      style={styles.addMiniItemBtn}
                      onPress={() => setShowItemEntry(!showItemEntry)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showItemEntry ? 'close-circle' : 'add-circle'}
                        size={15}
                        color="#0284C7"
                      />
                      <Text style={styles.addMiniItemText}>
                        {showItemEntry ? 'بند کریں' : '+ آئٹم درج کریں'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Manual Line Item Entry */}
                  {showItemEntry && (
                    <View style={styles.manualItemForm}>
                      <TextInput
                        style={styles.itemInputName}
                        placeholder="آئٹم کا نام (e.g. Dalda Ghee 1kg)"
                        placeholderTextColor="#94A3B8"
                        value={newItemName}
                        onChangeText={setNewItemName}
                      />
                      <View style={styles.manualItemRow}>
                        <TextInput
                          style={styles.itemInputSmall}
                          placeholder="تعداد (Qty)"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={newItemQty}
                          onChangeText={setNewItemQty}
                        />
                        <TextInput
                          style={styles.itemInputSmall}
                          placeholder="ریٹ (Rate/Unit)"
                          placeholderTextColor="#94A3B8"
                          keyboardType="numeric"
                          value={newItemUnitCost}
                          onChangeText={setNewItemUnitCost}
                        />
                        <TouchableOpacity
                          style={styles.addItemSubmitBtn}
                          onPress={handleAddManualItem}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={16} color="#FFFFFF" />
                          <Text style={styles.addItemSubmitText}>شامل کریں</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {items.length === 0 ? (
                    <Text style={styles.noItemsHint}>
                      کوئی آئٹم درج نہیں ہے۔ اوپر "+ آئٹم درج کریں" یا بل کی تصویر سے اسکین کریں۔
                    </Text>
                  ) : (
                    items.map((item, idx) => {
                      const evalInfo = mandiEvaluations.find(
                        (e) => e.itemName.toLowerCase().trim() === item.itemName.toLowerCase().trim()
                      );
                      const hasAlert = evalInfo && evalInfo.alertSeverity && evalInfo.alertSeverity !== 'NONE';

                      return (
                        <View key={idx} style={styles.itemCardContainer}>
                          <View style={styles.itemCardRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemCardTitle}>{item.itemName}</Text>
                              <Text style={styles.itemCardSub}>
                                x{item.quantityOrdered} @ Rs. {item.unitCost.toLocaleString()} = Rs. {(item.quantityOrdered * item.unitCost).toLocaleString()}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleRemoveItem(idx)}
                              style={styles.itemRemoveBtn}
                            >
                              <Ionicons name="trash-outline" size={16} color="#DC2626" />
                            </TouchableOpacity>
                          </View>

                          {/* Mandi Rate Creep & Price Arbitrage Warning Pill */}
                          {hasAlert && (
                            <View
                              style={[
                                styles.radarAlertPill,
                                evalInfo.alertSeverity === 'CRITICAL'
                                  ? styles.radarAlertCritical
                                  : evalInfo.alertSeverity === 'WARNING'
                                  ? styles.radarAlertWarning
                                  : styles.radarAlertInfo,
                              ]}
                            >
                              <Ionicons
                                name={
                                  evalInfo.alertSeverity === 'CRITICAL' || evalInfo.alertSeverity === 'WARNING'
                                    ? 'warning'
                                    : 'information-circle'
                                }
                                size={14}
                                color={
                                  evalInfo.alertSeverity === 'CRITICAL'
                                    ? '#DC2626'
                                    : evalInfo.alertSeverity === 'WARNING'
                                    ? '#D97706'
                                    : '#0284C7'
                                }
                              />
                              <Text
                                style={[
                                  styles.radarAlertText,
                                  evalInfo.alertSeverity === 'CRITICAL'
                                    ? { color: '#991B1B' }
                                    : evalInfo.alertSeverity === 'WARNING'
                                    ? { color: '#92400E' }
                                    : { color: '#075985' },
                                ]}
                              >
                                {evalInfo.alertMessageUr || evalInfo.alertMessageEn}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>

            {/* JEV ENGINE: Immediate Payout & Solvency Gatekeeper */}
            <View style={styles.immediatePayoutCard}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => {
                  const nextVal = !payCashNow;
                  setPayCashNow(nextVal);
                  if (nextVal && !immediateCashAmount) {
                    setImmediateCashAmount(String(netBeforeImmediate));
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={payCashNow ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={payCashNow ? '#059669' : '#94A3B8'}
                />
                <Text style={styles.toggleText}>
                  بل میں سے رقم ابھی نقد / آن لائن ادا کریں (Disburse Payout Now)
                </Text>
              </TouchableOpacity>

              {payCashNow && (
                <View style={styles.immediatePayoutContent}>
                  {/* Channel Selection */}
                  <Text style={styles.channelSectionLabel}>ادائیگی کا ذریعہ (Source Channel):</Text>
                  <View style={styles.channelRow}>
                    <TouchableOpacity
                      style={[
                        styles.channelChip,
                        immediatePaymentMode === 'CASH' && styles.channelChipActive,
                      ]}
                      onPress={() => setImmediatePaymentMode('CASH')}
                    >
                      <Ionicons
                        name="cash"
                        size={14}
                        color={immediatePaymentMode === 'CASH' ? '#FFFFFF' : '#059669'}
                      />
                      <Text
                        style={[
                          styles.channelChipText,
                          immediatePaymentMode === 'CASH' && styles.channelChipTextActive,
                        ]}
                      >
                        گلہ (Rs. {(paymentChannels.cashDrawer ?? 0).toLocaleString()})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.channelChip,
                        immediatePaymentMode === 'BANK' && styles.channelChipActive,
                      ]}
                      onPress={() => setImmediatePaymentMode('BANK')}
                    >
                      <Ionicons
                        name="business"
                        size={14}
                        color={immediatePaymentMode === 'BANK' ? '#FFFFFF' : '#0284C7'}
                      />
                      <Text
                        style={[
                          styles.channelChipText,
                          immediatePaymentMode === 'BANK' && styles.channelChipTextActive,
                        ]}
                      >
                        بینک (Rs. {(paymentChannels.bankAccount ?? 0).toLocaleString()})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.channelChip,
                        immediatePaymentMode === 'WALLET' && styles.channelChipActive,
                      ]}
                      onPress={() => setImmediatePaymentMode('WALLET')}
                    >
                      <Ionicons
                        name="phone-portrait"
                        size={14}
                        color={immediatePaymentMode === 'WALLET' ? '#FFFFFF' : '#7C3AED'}
                      />
                      <Text
                        style={[
                          styles.channelChipText,
                          immediatePaymentMode === 'WALLET' && styles.channelChipTextActive,
                        ]}
                      >
                        والٹ (Rs. {(paymentChannels.digitalWallet ?? 0).toLocaleString()})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Immediate Amount Input */}
                  <Text style={styles.channelSectionLabel}>نقد ادا کی جانے والی رقم (Amount to Pay):</Text>
                  <View style={styles.immediateInputRow}>
                    <Text style={styles.currencyPrefixSmall}>Rs.</Text>
                    <TextInput
                      style={styles.immediateInput}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={immediateCashAmount}
                      onChangeText={(val) => {
                        setImmediateCashAmount(val);
                        setErrorMsg(null);
                      }}
                    />
                  </View>

                  {/* Shortage & Solvency Halt Alert */}
                  {isSolvencyBreached && (
                    <View style={styles.solvencyHaltCard}>
                      <View style={styles.solvencyHeader}>
                        <Ionicons name="alert-circle" size={18} color="#DC2626" />
                        <Text style={styles.solvencyTitle}>
                          Jev Solvency Gatekeeper (منفی بیلنس بلاک)
                        </Text>
                      </View>
                      <Text style={styles.solvencyMessage}>
                        ⚠️ منتخب کردہ کھاتے ({immediatePaymentMode === 'CASH' ? 'دکان گلہ' : immediatePaymentMode === 'BANK' ? 'بینک' : 'والٹ'}) میں رقم ناکافی ہے۔
                        {'\n'}• درکار نقد: Rs. {parsedImmediatePay.toLocaleString()}
                        {'\n'}• دستیاب بیلنس: Rs. {selectedChannelBalance.toLocaleString()}
                        {'\n'}• کمی (Shortage): Rs. {shortageAmount.toLocaleString()}
                      </Text>
                      <View style={styles.solvencyResolutionCol}>
                        <TouchableOpacity
                          style={styles.solvencyQuickBtn}
                          onPress={() => setImmediateCashAmount(String(selectedChannelBalance))}
                        >
                          <Ionicons name="flash" size={13} color="#FFFFFF" />
                          <Text style={styles.solvencyQuickBtnText}>
                            صرف دستیاب رقم (Rs. {selectedChannelBalance.toLocaleString()}) ادا کریں
                          </Text>
                        </TouchableOpacity>

                        {immediatePaymentMode === 'CASH' && (paymentChannels.bankAccount ?? 0) >= parsedImmediatePay && (
                          <TouchableOpacity
                            style={[styles.solvencyQuickBtn, { backgroundColor: '#0284C7' }]}
                            onPress={() => setImmediatePaymentMode('BANK')}
                          >
                            <Ionicons name="card" size={13} color="#FFFFFF" />
                            <Text style={styles.solvencyQuickBtnText}>
                              بینک / Raast سے ادا کریں (دستیاب: Rs. {(paymentChannels.bankAccount ?? 0).toLocaleString()})
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[styles.solvencyQuickBtn, { backgroundColor: '#64748B' }]}
                          onPress={() => {
                            setPayCashNow(false);
                            setImmediateCashAmount('');
                          }}
                        >
                          <Ionicons name="bookmark" size={13} color="#FFFFFF" />
                          <Text style={styles.solvencyQuickBtnText}>
                            تمام رقم ادھار رکھیں ("میں نے دینے ہیں")
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Summary of Split */}
                  <View style={styles.splitSummaryBox}>
                    <View style={styles.splitRow}>
                      <Text style={styles.splitLabel}>فوری ادائیگی ({immediatePaymentMode}):</Text>
                      <Text style={styles.splitValPay}>Rs. {parsedImmediatePay.toLocaleString()}</Text>
                    </View>
                    <View style={styles.splitRow}>
                      <Text style={styles.splitLabel}>باقی ادھار ("میں نے دینے"):</Text>
                      <Text style={styles.splitValOwed}>Rs. {remainingDebtPayable.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* JEV DOUBLE-ENTRY INVARIANT VERIFICATION BADGE */}
            {grossAmount > 0 && (
              <View style={styles.jevInvariantBadge}>
                <View style={styles.jevInvariantHeader}>
                  <Ionicons name="shield-checkmark" size={15} color="#059669" />
                  <Text style={styles.jevInvariantTitle}>Jev Double-Entry Engine Verified</Text>
                  <View style={styles.jevBalancedTag}>
                    <Text style={styles.jevBalancedTagText}>∑ Debits = ∑ Credits</Text>
                  </View>
                </View>
                <Text style={styles.jevInvariantSub}>
                  Debit: مال تجارت (Rs. {grossAmount.toLocaleString()}) | Credit: 
                  {advanceApplied > 0 ? ` پیشگی (Rs. ${advanceApplied.toLocaleString()}) + ` : ' '}
                  {parsedImmediatePay > 0 ? ` نقد (Rs. ${parsedImmediatePay.toLocaleString()}) + ` : ' '}
                  واجبات (Rs. {remainingDebtPayable.toLocaleString()}) | فرق: PKR 0.00
                </Text>
              </View>
            )}

            <Text style={styles.label}>وعدے کی مدت (Credit Terms / Payment Due Days):</Text>
            <View style={styles.daysRow}>
              {['7', '15', '30'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, dueDateDays === d && styles.dayChipActive]}
                  onPress={() => setDueDateDays(d)}
                >
                  <Text style={[styles.dayChipText, dueDateDays === d && styles.dayChipTextActive]}>
                    {d} Din ({d === '7' ? 'Net-7 Mandi' : d === '15' ? 'Net-15' : 'Monthly'})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tafseel / Notes (نوٹس):</Text>
            <TextInput
              style={styles.inputSimple}
              placeholder="e.g. Rice Bori Shipment 20 bags"
              placeholderTextColor="#94A3B8"
              value={notes}
              onChangeText={setNotes}
            />

            <Text style={styles.label}>شپمنٹ بل فوٹو (Attach Bill Photo / Receipt):</Text>
            {extractingOcr ? (
              <View style={styles.receiptPreviewCard}>
                <ActivityIndicator size="small" color="#0284C7" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.receiptAttachedTitle}>🤖 Scanning Receipt Data...</Text>
                  <Text style={styles.receiptAttachedSub}>Extracting amount & supplier details</Text>
                </View>
              </View>
            ) : receiptImage ? (
              <View>
                <View style={styles.receiptPreviewCard}>
                  <Image source={{ uri: getImageUrl(receiptImage) }} style={styles.receiptThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptAttachedTitle}>Invoice Photo Attached</Text>
                    <Text style={styles.receiptAttachedSub}>{ocrBadgeText || 'Stored on disk storage'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setReceiptImage(null); setOcrBadgeText(null); }}>
                    <Ionicons name="trash-outline" size={20} color="#E11D48" />
                  </TouchableOpacity>
                </View>

                {(!amount || amount === '0' || (parseFloat(amount) || 0) <= 0) ? (
                  <View style={styles.amountPromptHint}>
                    <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                    <Text style={styles.amountPromptHintText}>
                      Tasweer mehsfooz ho gayi hai. Upar "Bill Amount Due" (واجب الادا رقم) darj karein ya +Rs chip par tap karein.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.photoPickerRow}>
                <TouchableOpacity style={styles.photoPickBtn} onPress={handleCameraLaunch}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                  <Text style={styles.photoPickBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.photoPickBtn, { backgroundColor: '#0284C7' }]} onPress={handleGalleryLaunch}>
                  <Ionicons name="images" size={16} color="#FFF" />
                  <Text style={styles.photoPickBtnText}>Choose Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmitBill}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Log Payable Record ("Maine Dene")</Text>
                </>
              )}
            </TouchableOpacity>

            {/* PERSISTENT SUB-PANEL: Collapsible Monthly Supplier Bills History */}
            <View style={styles.subPanelCard}>
              <TouchableOpacity
                style={styles.subPanelHeaderRow}
                onPress={() => setHistoryExpanded(!historyExpanded)}
                activeOpacity={0.8}
              >
                <View style={styles.subPanelTitleGroup}>
                  <Ionicons name="receipt-outline" size={18} color="#0284C7" />
                  <Text style={styles.subPanelTitle}>Is Mahinay Ke Supplier Bills (Logged Invoices History)</Text>
                </View>
                <Ionicons
                  name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {/* Monthly Running Aggregate Summary Badge */}
              <View style={styles.monthlySummaryBadge}>
                <Text style={styles.monthlySummaryText}>
                  Total Logged Bills: <Text style={styles.monthlySummaryBold}>{billHistory.length}</Text>
                </Text>
                <Text style={styles.monthlySummaryText}>
                  Total Payable: <Text style={styles.monthlyPayableBold}>Rs. {totalBillsSum.toLocaleString()}</Text>
                </Text>
              </View>

              {historyExpanded && (
                <View style={styles.historyContainer}>
                  {loadingHistory ? (
                    <ActivityIndicator color="#0284C7" size="small" style={{ marginVertical: 14 }} />
                  ) : billHistory.length === 0 ? (
                    <View style={styles.emptyHistoryBox}>
                      <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
                      <Text style={styles.emptyHistoryText}>Is mahinay abhi tak koi supplier bill log nahi hua.</Text>
                    </View>
                  ) : (
                    billHistory.map((item) => {
                      const isDeleting = deletingId === item._id;
                      const supName = getSupplierName(item);
                      const invIdMatch = item.description?.match(/Invoice\s*#?([^\s]+)/i);
                      const displayInvId = invIdMatch ? `INV-${invIdMatch[1]}` : `INV-${item._id.slice(-6).toUpperCase()}`;

                      return (
                        <View key={item._id} style={styles.historyRow}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.rowTopLine}>
                              <Text style={styles.invoiceIdText}>
                                {displayInvId} • {formatInvoiceDate(item.createdAt)}
                              </Text>
                              <Text style={styles.billAmountText}>Rs. {item.amount.toLocaleString()}</Text>
                            </View>

                            <View style={styles.rowBadgesLine}>
                              <View style={styles.supNameBadge}>
                                <Ionicons name="business-outline" size={10} color="#0369A1" />
                                <Text style={styles.supNameText}>{supName}</Text>
                              </View>

                              <View style={styles.dueDaysBadge}>
                                <Text style={styles.dueDaysText}>7 Din Net</Text>
                              </View>

                              {/* Attachment Indicator */}
                              {item.receiptImageUrl ? (
                                <TouchableOpacity
                                  style={styles.attachmentBadge}
                                  onPress={() => setPreviewImageUri(item.receiptImageUrl || null)}
                                >
                                  <Ionicons name="image" size={12} color="#0284C7" />
                                  <Text style={styles.attachmentText}>Photo</Text>
                                </TouchableOpacity>
                              ) : null}

                              {/* Status Chip */}
                              <View
                                style={[
                                  styles.statusChip,
                                  item.isSettled ? styles.statusChipPaid : styles.statusChipPending,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusChipText,
                                    item.isSettled ? styles.statusChipPaidText : styles.statusChipPendingText,
                                  ]}
                                >
                                  {item.isSettled ? 'Paid / Settled' : 'Pending Payment'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Action Buttons: View & Delete */}
                          <View style={styles.actionButtonsCol}>
                            {item.receiptImageUrl ? (
                              <TouchableOpacity
                                style={styles.viewBillBtn}
                                onPress={() => setPreviewImageUri(item.receiptImageUrl || null)}
                              >
                                <Ionicons name="eye-outline" size={16} color="#0284C7" />
                              </TouchableOpacity>
                            ) : null}

                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => handleDeleteBill(item)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <ActivityIndicator size="small" color="#E11D48" />
                              ) : (
                                <Ionicons name="trash-outline" size={16} color="#E11D48" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Attached Invoice Photo Preview Sub-Modal */}
          <Modal
            visible={!!previewImageUri}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setPreviewImageUri(null)}
          >
            <View style={styles.imagePreviewOverlay}>
              <View style={styles.imagePreviewCard}>
                <View style={styles.imagePreviewHeader}>
                  <Text style={styles.imagePreviewTitle}>Bill Photo Preview</Text>
                  <TouchableOpacity onPress={() => setPreviewImageUri(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                {previewImageUri ? (
                  <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      source={{ uri: getImageUrl(previewImageUri) }}
                      style={styles.fullPreviewImage}
                      resizeMode="contain"
                      onError={() => setImageError(true)}
                    />
                    {imageError && (
                      <View style={styles.imageErrorFallbackBox}>
                        <Ionicons name="document-text-outline" size={44} color="#0284C7" />
                        <Text style={styles.imageErrorTitle}>Receipt Document Saved</Text>
                        <Text style={styles.imageErrorSub}>
                          Invoice data extracted & stored safely in database ledger record.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 34, 57, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(225, 29, 72, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 11,
    color: '#E11D48',
    fontWeight: '600',
    flex: 1,
  },
  body: {
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 6,
  },
  supScroll: {
    marginBottom: 10,
  },
  supChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginRight: 6,
  },
  supChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  supChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  supChipTextActive: {
    color: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: '#E11D48',
    borderWidth: 1.5,
    backgroundColor: '#FFF1F2',
  },
  amountPromptHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  amountPromptHintText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    flex: 1,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickAmtRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  quickAmtChip: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  quickAmtText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11D48',
  },
  inputSimple: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  dayChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FDA4AF',
  },
  dayChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  dayChipTextActive: {
    color: '#E11D48',
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  photoPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  photoPickBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E11D48',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  receiptThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  receiptAttachedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptAttachedSub: {
    fontSize: 10,
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#E11D48',
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  /* Sub-Panel History Styles */
  subPanelCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  subPanelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPanelTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subPanelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthlySummaryBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  monthlySummaryText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  monthlySummaryBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  monthlyPayableBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
  historyContainer: {
    marginTop: 12,
    gap: 8,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyHistoryText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  billAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
  rowBadgesLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  supNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  supNameText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  dueDaysBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dueDaysText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attachmentText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284C7',
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusChipPending: {
    backgroundColor: '#FEF3C7',
  },
  statusChipPendingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  statusChipPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusChipPaidText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  actionButtonsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBillBtn: {
    padding: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
  },
  deleteBtn: {
    padding: 6,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imagePreviewCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 14,
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreviewTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fullPreviewImage: {
    width: '100%',
    height: 350,
    borderRadius: 10,
  },
  imageErrorFallbackBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginTop: 10,
    width: '100%',
  },
  imageErrorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  imageErrorSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  advanceBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  advanceBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
    flex: 1,
  },
  advanceDeductionCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  stockSyncCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  breakdownBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  breakdownValDeduct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  breakdownTotalRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  breakdownTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  breakdownTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857',
  },
  itemsPreviewBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
    gap: 4,
  },
  itemsPreviewHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  itemsPreviewText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  itemsSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addMiniItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
  },
  addMiniItemText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  manualItemForm: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 6,
  },
  itemInputName: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  manualItemRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  itemInputSmall: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  addItemSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284C7',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addItemSubmitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  noItemsHint: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  itemCardContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  itemCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  itemRemoveBtn: {
    padding: 6,
  },
  radarAlertPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
  },
  radarAlertCritical: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  radarAlertWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  radarAlertInfo: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  radarAlertText: {
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 14,
    flex: 1,
  },
  immediatePayoutCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  immediatePayoutContent: {
    marginTop: 10,
    gap: 8,
  },
  channelSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  channelChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  channelChipTextActive: {
    color: '#FFFFFF',
  },
  immediateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  currencyPrefixSmall: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  immediateInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  solvencyHaltCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginTop: 4,
  },
  solvencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  solvencyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  solvencyMessage: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
    fontWeight: '600',
  },
  solvencyResolutionCol: {
    marginTop: 4,
    gap: 5,
  },
  solvencyQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  solvencyQuickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  splitSummaryBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    gap: 4,
    marginTop: 4,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  splitValPay: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  splitValOwed: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  jevInvariantBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
    gap: 4,
  },
  jevInvariantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jevInvariantTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    flex: 1,
  },
  jevBalancedTag: {
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  jevBalancedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  jevInvariantSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    lineHeight: 14,
  },
});
