import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { ledgerApi, ILedgerEntry, ILedgerItem } from '../api/ledger.api';
import { ICounterparty } from '../api/counterparty.api';
import { parseUrduVoiceTranscript } from '../utils/urduVoiceParser';
import { CreditLimitWarningModal } from './CreditLimitWarningModal';
import { useAuth } from '../store/auth.store';
import { aiApi } from '../api/ai.api';
import { getImageUrl } from '../api/client';
import { udhaarApi, IJevCreditEvaluation } from '../api/udhaar.api';
import { useNotifications } from '../context/NotificationContext';

interface AddUdhaarModalProps {
  visible: boolean;
  customers: ICounterparty[];
  initialCustomerId?: string;
  initialVoiceTranscript?: string;
  onClose: () => void;
  onSuccess: (entry: ILedgerEntry) => void;
  onAddCustomer?: () => void;
}

const DEFAULT_CATEGORIES = [
  'General Khata (عام کھاتہ)',
  'Groceries / Rashan (راشن)',
  'Dairy / Milk (دودھ / ڈیری)',
  'Spare Parts / Auto (پارٹس)',
  'Kapra / Cloth (کپڑا / سلائی)',
  'Samaan / Products (سامان)',
  'Services / Kaam (سروس)',
];

const COMMON_UNITS = ['Pcs / عدد', 'Kg / کلو', 'Litre / لیٹر', 'Meter / میٹر', 'Bori / بوری', 'Jora / جوڑا', 'Packet / پیکٹ'];

export const AddUdhaarModal: React.FC<AddUdhaarModalProps> = ({
  visible,
  customers,
  initialCustomerId,
  initialVoiceTranscript,
  onClose,
  onSuccess,
  onAddCustomer,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { dispatchNotification } = useNotifications();
  const isOwnerOrManager = !user?.role || user.role === 'OWNER' || user.role === 'MANAGER';

  // Modular 2-Step Flow State (1: Fast-Entry, 2: Extended Details Drawer)
  const [step, setStep] = useState<1 | 2>(1);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    initialCustomerId || (customers.length > 0 ? customers[0]._id : '')
  );

  // Input Mode: Lumpsum vs Itemized Bill
  const [billMode, setBillMode] = useState<'LUMPSUM' | 'ITEMIZED'>('LUMPSUM');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Categories
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);

  // Itemized Bill Items List
  const [items, setItems] = useState<ILedgerItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('Pcs / عدد');
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Native Receipt Photo Attachment (expo-image-picker)
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptFileSize, setReceiptFileSize] = useState<string | null>(null);

  // Roman Urdu Voice Input State
  const [voiceSheetVisible, setVoiceSheetVisible] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState(initialVoiceTranscript || '');

  // Agreed Return Date
  const [returnOption, setReturnOption] = useState<'PEHLI' | '7_DAYS' | '15_DAYS' | '30_DAYS' | 'CUSTOM'>('7_DAYS');
  const [customDueDate, setCustomDueDate] = useState('');

  // Manager Override Toggle & Warning
  const [managerOverride, setManagerOverride] = useState(false);
  const [creditWarningVisible, setCreditWarningVisible] = useState(false);

  // Jev AI Credit Risk Engine State
  const [jevEvaluation, setJevEvaluation] = useState<IJevCreditEvaluation | null>(null);
  const [evaluatingJev, setEvaluatingJev] = useState(false);
  const [managerPin, setManagerPin] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initialCustomerId
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    } else if (customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0]._id);
    }
  }, [initialCustomerId, customers]);

  // Handle initial voice transcript if passed
  useEffect(() => {
    if (initialVoiceTranscript && visible) {
      applyVoiceTranscript(initialVoiceTranscript);
    }
  }, [initialVoiceTranscript, visible]);

  const currentCustomer = useMemo(() => {
    return customers.find((c) => c._id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  const calculatedDueDate = useMemo(() => {
    const today = new Date();
    if (returnOption === 'PEHLI') {
      return new Date(today.getFullYear(), today.getMonth() + 1, 1);
    } else if (returnOption === '7_DAYS') {
      const d = new Date(today);
      d.setDate(d.getDate() + 7);
      return d;
    } else if (returnOption === '15_DAYS') {
      const d = new Date(today);
      d.setDate(d.getDate() + 15);
      return d;
    } else if (returnOption === '30_DAYS') {
      const d = new Date(today);
      d.setDate(d.getDate() + 30);
      return d;
    } else if (returnOption === 'CUSTOM' && customDueDate) {
      const parsed = new Date(customDueDate);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }, [returnOption, customDueDate]);

  const itemizedTotal = useMemo(() => {
    return items.reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [items]);

  const effectiveAmount = billMode === 'ITEMIZED' ? itemizedTotal : (parseFloat(amount) || 0);

  const currentBalance = currentCustomer ? currentCustomer.currentBalance : 0;
  const creditLimit = currentCustomer ? currentCustomer.creditLimit : 5000;
  const projectedBalance = currentBalance + effectiveAmount;
  const isLimitExceeded = projectedBalance > creditLimit;
  const isCreditBlocked = currentCustomer?.isCreditBlocked || false;

  // Real-time Jev Credit Risk Evaluation (Debounced)
  useEffect(() => {
    let isMounted = true;
    if (!currentCustomer?._id || effectiveAmount <= 0) {
      setJevEvaluation(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setEvaluatingJev(true);
        const res = await udhaarApi.evaluate(currentCustomer._id, effectiveAmount);
        if (isMounted && res.success && res.data) {
          setJevEvaluation(res.data.evaluation);
        }
      } catch (e) {
        // Fallback silently on evaluation network glitch
      } finally {
        if (isMounted) setEvaluatingJev(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [currentCustomer?._id, effectiveAmount]);

  const resetForm = () => {
    setStep(1);
    setAmount('');
    setDescription('');
    setCategory(DEFAULT_CATEGORIES[0]);
    setReturnOption('7_DAYS');
    setCustomDueDate('');
    setManagerOverride(false);
    setJevEvaluation(null);
    setManagerPin(undefined);
    setErrorMsg(null);
    setBillMode('LUMPSUM');
    setReceiptImage(null);
    setReceiptFileName(null);
    setReceiptFileSize(null);
    setVoiceSheetVisible(false);
    setVoiceTranscript('');
    setItems([]);
  };

  // --- NATIVE CAMERA & GALLERY (expo-image-picker) HANDLERS ---
  const [extractingOcr, setExtractingOcr] = useState(false);

  const processImageOcr = async (base64Uri: string, defaultName: string = 'Receipt.jpg') => {
    // Check size limit (1 MB = 1,048,576 bytes)
    const cleanBase64 = base64Uri.replace(/^data:image\/\w+;base64,/, '');
    const estimatedSizeBytes = Math.ceil((cleanBase64.length * 3) / 4);
    if (estimatedSizeBytes > 1 * 1024 * 1024) {
      const sizeMb = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);
      setErrorMsg(`⚠️ Tasweer ka size ${sizeMb} MB hai (Exceeds 1 MB limit). Baraye meherbani 1 MB se choti tasweer muntakhib karein.`);
      return;
    }

    setReceiptImage(base64Uri);
    setReceiptFileName(defaultName);
    setReceiptFileSize('Processing OCR...');
    setExtractingOcr(true);
    setErrorMsg(null);

    try {
      // 1. Upload base64 asset to disk to get clean URL
      const uploadRes = await aiApi.uploadAsset(base64Uri, 'receivables');
      if (uploadRes.success && uploadRes.data?.url) {
        setReceiptImage(uploadRes.data.url);
        setReceiptFileSize('Stored on Disk');
      }

      // 2. Multimodal OCR Extraction
      const ocrRes = await aiApi.extractOcrData(base64Uri);
      if (ocrRes.success && ocrRes.data) {
        const data = ocrRes.data;
        const targetAmt = data.amount || data.dueAmount;
        if (targetAmt && (!amount || amount === '0')) {
          setAmount(String(targetAmt));
        }
        if (data.items && data.items.length > 0) {
          setItems(data.items);
          setBillMode('ITEMIZED');
        }
        if (data.vendorName && !description) {
          setDescription(`Kacha Parcha from ${data.vendorName}`);
        }
      }
    } catch (e: any) {
      const errText = e.response?.data?.message || e.message;
      setReceiptFileSize('Attached');
      if (errText?.includes('1 MB')) {
        setErrorMsg(errText);
      }
    } finally {
      setExtractingOcr(false);
    }
  };

  const handleCameraLaunch = async () => {
    try {
      setErrorMsg(null);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Camera permission required to capture receipt photo.');
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
        processImageOcr(base64Uri, 'Camera_Receipt.jpg');
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
        setErrorMsg('Gallery permission required to select receipt photo.');
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
        processImageOcr(base64Uri, asset.fileName || 'Gallery_Receipt.jpg');
      }
    } catch (err: any) {
      setErrorMsg('Failed to open gallery: ' + err.message);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptImage(null);
    setReceiptFileName(null);
    setReceiptFileSize(null);
  };

  // Itemized List Helpers
  const handleAddItem = () => {
    if (!newItemName.trim()) {
      setErrorMsg('Item ya service ka naam darj karein.');
      return;
    }
    const q = parseFloat(newItemQty) || 1;
    const p = parseFloat(newItemPrice) || 0;
    const total = q * p;

    const newItemObj: ILedgerItem = {
      name: `${newItemName.trim()} (${selectedUnit})`,
      quantity: q,
      unitPrice: p,
      total,
    };

    setItems((prev) => [...prev, newItemObj]);
    if (!recentItems.includes(newItemName.trim())) {
      setRecentItems((prev) => [newItemName.trim(), ...prev.slice(0, 4)]);
    }
    setNewItemName('');
    setNewItemQty('1');
    setNewItemPrice('');
    setErrorMsg(null);
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          const newQty = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQty,
            total: newQty * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const applyVoiceTranscript = (text: string) => {
    if (!text.trim()) return;
    const candidates = customers.map((c) => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      creditLimit: c.creditLimit,
      currentBalance: c.currentBalance,
    }));

    const result = parseUrduVoiceTranscript(text, candidates);
    if (result.customerId) setSelectedCustomerId(result.customerId);
    if (result.amount) setAmount(String(result.amount));
    if (result.extractedItems.length > 0) {
      setItems(result.extractedItems);
      setBillMode('ITEMIZED');
    }
    if (result.notes) setDescription(result.notes);
    setVoiceSheetVisible(false);
  };

  const handleSubmit = async (overridePin?: string | any) => {
    if (!currentCustomer) {
      setErrorMsg('Baraye meharbani pehle gahak muntakhib karein.');
      return;
    }

    if (effectiveAmount <= 0) {
      setErrorMsg('Durust raqam darj karein.');
      return;
    }

    const effectivePin = typeof overridePin === 'string' ? overridePin : managerPin;

    // 1. Jev Risk & Credit Limit Pre-Check
    if (jevEvaluation) {
      if (jevEvaluation.action_verdict === 'HARD_BLOCK') {
        dispatchNotification({
          id: `block-client-${currentCustomer._id}-${Date.now()}`,
          category: 'CREDIT_LIMIT',
          priority: 'CRITICAL',
          titleUrdu: '⛔ ادھار پر سخت پابندی (Hard Block)',
          titleEnglish: 'Credit Prohibited - High Default Risk',
          messageUrdu: `گاہک ${currentCustomer.name} پر مزید ادھار بلاک ہے۔ ڈیفالٹ کا خطرہ: ${Math.round(jevEvaluation.default_probability * 100)}%۔`,
          messageEnglish: `Credit blocked for ${currentCustomer.name} (${Math.round(jevEvaluation.default_probability * 100)}% risk).`,
          timestamp: new Date().toISOString(),
          durationMs: 5000,
        });
        setCreditWarningVisible(true);
        return;
      }

      if (
        jevEvaluation.action_verdict === 'REQUIRE_MANAGER_PIN' &&
        !effectivePin &&
        !isOwnerOrManager
      ) {
        dispatchNotification({
          id: `pin-client-${currentCustomer._id}-${Date.now()}`,
          category: 'CREDIT_LIMIT',
          priority: 'WARNING',
          titleUrdu: '🔑 منیجر سیکیورٹی پن درکار ہے',
          titleEnglish: 'Manager Approval Required',
          messageUrdu: `گاہک ${currentCustomer.name} کے لیے Rs. ${effectiveAmount.toLocaleString()} کے ادھار پر منیجر کی منظوری درکار ہے۔`,
          messageEnglish: `Manager authorization required for Rs. ${effectiveAmount.toLocaleString()} udhaar.`,
          timestamp: new Date().toISOString(),
          durationMs: 5000,
        });
        setCreditWarningVisible(true);
        return;
      }
    } else if (
      (isLimitExceeded || isCreditBlocked) &&
      !managerOverride &&
      !isOwnerOrManager &&
      !effectivePin
    ) {
      setCreditWarningVisible(true);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      // Process Udhaar Sale through Jev-backed endpoint
      const response = await udhaarApi.processSale({
        customerId: currentCustomer._id,
        amount: effectiveAmount,
        category,
        description: description.trim() || undefined,
        items: billMode === 'ITEMIZED' ? items : undefined,
        receiptImageUrl: receiptImage || undefined,
        rawInput: voiceTranscript ? voiceTranscript : undefined,
        dueDate: calculatedDueDate ? calculatedDueDate.toISOString() : undefined,
        managerPin: effectivePin,
        inputMode: voiceTranscript ? 'VOICE' : receiptImage ? 'OCR' : 'MANUAL',
      });

      if (response.success && response.data) {
        dispatchNotification({
          id: `udhaar-success-${response.data._id}-${Date.now()}`,
          category: 'CREDIT_LIMIT',
          priority: 'SUCCESS',
          titleUrdu: '✅ نیا ادھار کامیابی سے درج ہو گیا',
          titleEnglish: 'Udhaar Recorded Successfully',
          messageUrdu: `گاہک ${currentCustomer.name} کے کھاتے میں Rs. ${effectiveAmount.toLocaleString()} کا ادھار درج ہوا۔`,
          messageEnglish: `Rs. ${effectiveAmount.toLocaleString()} credit added for ${currentCustomer.name}.`,
          timestamp: new Date().toISOString(),
          durationMs: 5000,
        });
        onSuccess(response.data);
        resetForm();
        onClose();
      } else {
        setErrorMsg(response.message || 'Udhaar darj karne mein masla paish aya.');
      }
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message || err.message || 'Udhaar save karne mein nakami hui.';
      if (
        err.response?.data?.code === 'REQUIRE_MANAGER_PIN' ||
        err.response?.data?.code === 'CREDIT_HARD_BLOCKED'
      ) {
        if (err.response?.data?.evaluation) {
          setJevEvaluation(err.response.data.evaluation);
        }
        setCreditWarningVisible(true);
      }
      setErrorMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (d: Date | null) => {
    if (!d) return 'Muntakhib karein';
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {/* STEP 1: CORE FAST-ENTRY HEADER */}
          {step === 1 ? (
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="arrow-down-circle" size={22} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Naya Udhaar Diya (Maine Lene Hain)</Text>
                  <Text style={styles.modalUrduTitle}>نیا ادھار اندراج • تیز رفتار فاسٹ اینٹری</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: EXTENDED DETAILS HEADER */
            <View style={styles.modalHeaderStep2}>
              <TouchableOpacity style={styles.backBtnStep2} onPress={() => setStep(1)}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitleStep2}>Roznamcha / Parcha Details</Text>
                <Text style={styles.modalUrduTitleStep2}>کچا پرچہ، کیٹیگری اور نوٹس شامل کریں</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Voice AI Dictation Shortcut Bar */}
          {voiceSheetVisible && (
            <View style={styles.voicePanel}>
              <View style={styles.voicePanelHeader}>
                <Text style={styles.voicePanelTitle}>Roman Urdu Voice AI (بولیں)</Text>
                <TouchableOpacity onPress={() => setVoiceSheetVisible(false)}>
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.voiceInputBox}>
                <TextInput
                  style={styles.voiceTextInput}
                  placeholder="e.g. Tariq ko 1,500 ka ghee udhaar..."
                  placeholderTextColor="#94A3B8"
                  value={voiceTranscript}
                  onChangeText={setVoiceTranscript}
                />
                <TouchableOpacity style={styles.voiceApplyBtn} onPress={() => applyVoiceTranscript(voiceTranscript)}>
                  <Text style={styles.voiceApplyBtnText}>AI Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#E11D48" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {step === 1 ? (
              /* ================= STEP 1 FORM ================= */
              <View style={styles.step1Container}>
                {/* 1. Customer Selector */}
                <View style={styles.inputGroup}>
                  <View style={styles.customerHeaderRow}>
                    <Text style={styles.inputLabel}>Gahak Muntakhib Karein (گاہک کا انتخاب)</Text>
                    {onAddCustomer && (
                      <TouchableOpacity
                        style={styles.addNayaGahakBtnInline}
                        onPress={() => {
                          onClose();
                          onAddCustomer();
                        }}
                      >
                        <Ionicons name="person-add" size={13} color="#059669" />
                        <Text style={styles.addNayaGahakBtnTextInline}>+ Naya Gahak</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerChipsRow}>
                    {onAddCustomer && (
                      <TouchableOpacity
                        style={styles.addGahakChip}
                        onPress={() => {
                          onClose();
                          onAddCustomer();
                        }}
                      >
                        <Ionicons name="person-add" size={16} color="#059669" />
                        <Text style={styles.addGahakChipText}>+ Gahak</Text>
                      </TouchableOpacity>
                    )}

                    {customers.map((c) => {
                      const isSelected = currentCustomer?._id === c._id;
                      return (
                        <TouchableOpacity
                          key={c._id}
                          style={[styles.customerChip, isSelected && styles.customerChipActive]}
                          onPress={() => {
                            setSelectedCustomerId(c._id);
                            setErrorMsg(null);
                          }}
                        >
                          <View style={[styles.avatarMini, isSelected && styles.avatarMiniActive]}>
                            <Text style={[styles.avatarMiniText, isSelected && styles.avatarMiniTextActive]}>
                              {c.name ? c.name[0].toUpperCase() : '?'}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.customerChipName, isSelected && styles.customerChipNameActive]}>
                              {c.name}
                            </Text>
                            <Text style={[styles.customerChipPhone, isSelected && styles.customerChipPhoneActive]}>
                              {c.phone}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 2. Customer Balance Status Card */}
                {currentCustomer && (
                  <View style={styles.statusCard}>
                    <View style={styles.statusRow}>
                      <View>
                        <Text style={styles.statusLabel}>MOJOODA HISAB (CURRENT BALANCE)</Text>
                        <Text style={styles.statusValue}>Rs. {currentBalance.toLocaleString()}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.statusLabel}>CREDIT LIMIT (حدِ ادھار)</Text>
                        <Text style={styles.limitValue}>Rs. {creditLimit.toLocaleString()}</Text>
                      </View>
                    </View>
                    <View style={styles.limitTrack}>
                      <View
                        style={[
                          styles.limitBar,
                          {
                            width: `${Math.min(100, (currentBalance / (creditLimit || 1)) * 100)}%`,
                            backgroundColor: currentBalance > creditLimit ? '#E11D48' : '#059669',
                          },
                        ]}
                      />
                    </View>

                    {/* Jev Dynamic Risk Assessment Pill */}
                    {evaluatingJev ? (
                      <View style={styles.jevStatusBadgeRow}>
                        <ActivityIndicator size="small" color="#6366F1" />
                        <Text style={styles.jevStatusBadgeText}>Jev خطرے کا تجزیہ کر رہا ہے...</Text>
                      </View>
                    ) : jevEvaluation ? (
                      <View style={styles.jevStatusBadgeRow}>
                        <View
                          style={[
                            styles.jevStatusTierBadge,
                            jevEvaluation.risk_tier === 'HIGH'
                              ? styles.jevStatusTierBadgeRed
                              : jevEvaluation.risk_tier === 'MEDIUM'
                              ? styles.jevStatusTierBadgeAmber
                              : styles.jevStatusTierBadgeGreen,
                          ]}
                        >
                          <Ionicons
                            name={
                              jevEvaluation.risk_tier === 'HIGH'
                                ? 'ban'
                                : jevEvaluation.risk_tier === 'MEDIUM'
                                ? 'shield-half'
                                : 'shield-checkmark'
                            }
                            size={12}
                            color={
                              jevEvaluation.risk_tier === 'HIGH'
                                ? '#DC2626'
                                : jevEvaluation.risk_tier === 'MEDIUM'
                                ? '#D97706'
                                : '#059669'
                            }
                          />
                          <Text
                            style={[
                              styles.jevStatusTierText,
                              jevEvaluation.risk_tier === 'HIGH'
                                ? { color: '#991B1B' }
                                : jevEvaluation.risk_tier === 'MEDIUM'
                                ? { color: '#92400E' }
                                : { color: '#065F46' },
                            ]}
                          >
                            Jev: {jevEvaluation.risk_tier} RISK (
                            {Math.round(jevEvaluation.default_probability * 100)}%)
                          </Text>
                        </View>

                        <Text style={styles.jevRecLimitTag}>
                          تجویز: Rs. {jevEvaluation.credit_limit_recommendation.toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* 3. Lumpsum vs Itemized Bill Selector */}
                <View style={styles.modeToggleRow}>
                  <TouchableOpacity
                    style={[styles.modeToggleBtn, billMode === 'LUMPSUM' && styles.modeToggleBtnActive]}
                    onPress={() => setBillMode('LUMPSUM')}
                  >
                    <Ionicons name="cash-outline" size={15} color={billMode === 'LUMPSUM' ? '#059669' : '#64748B'} />
                    <Text style={[styles.modeToggleText, billMode === 'LUMPSUM' && styles.modeToggleTextActive]}>
                      Lumpsum Amount
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeToggleBtn, billMode === 'ITEMIZED' && styles.modeToggleBtnActive]}
                    onPress={() => setBillMode('ITEMIZED')}
                  >
                    <Ionicons name="list" size={15} color={billMode === 'ITEMIZED' ? '#059669' : '#64748B'} />
                    <Text style={[styles.modeToggleText, billMode === 'ITEMIZED' && styles.modeToggleTextActive]}>
                      Itemized Bill (تفصیلی بل)
                    </Text>
                    {items.length > 0 && (
                      <View style={styles.itemCountBadge}>
                        <Text style={styles.itemCountBadgeText}>{items.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* 4. Udhaar Amount Input */}
                {billMode === 'LUMPSUM' ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Udhaar Ki Raqam (رقم درج کریں) <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={styles.amountField}>
                      <Text style={styles.pkrPrefix}>Rs.</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={(val) => {
                          setAmount(val);
                          setErrorMsg(null);
                        }}
                      />
                    </View>

                    {/* Quick Amount Addition Chips */}
                    <View style={styles.quickAmtRow}>
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={styles.quickAmtChip}
                          onPress={() => setAmount(String((parseFloat(amount) || 0) + amt))}
                        >
                          <Text style={styles.quickAmtText}>+Rs. {amt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : (
                  /* Itemized Bill Builder */
                  <View style={styles.itemizedSection}>
                    <View style={styles.itemizedHeader}>
                      <Text style={styles.inputLabel}>Ashya / Items List</Text>
                      <Text style={styles.itemizedTotalHeader}>
                        Total: <Text style={styles.boldPkr}>Rs. {itemizedTotal.toLocaleString()}</Text>
                      </Text>
                    </View>

                    {items.map((item, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.itemNameText}>{item.name}</Text>
                          <Text style={styles.itemUnitPriceText}>
                            Rs. {item.unitPrice.toLocaleString()} × {item.quantity}
                          </Text>
                        </View>
                        <View style={styles.qtyStepper}>
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => handleUpdateItemQty(idx, -1)}>
                            <Ionicons name="remove" size={14} color="#0F172A" />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                          <TouchableOpacity style={styles.stepperBtn} onPress={() => handleUpdateItemQty(idx, 1)}>
                            <Ionicons name="add" size={14} color="#0F172A" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.itemTotalText}>Rs. {item.total.toLocaleString()}</Text>
                        <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                          <Ionicons name="trash-outline" size={16} color="#E11D48" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.addItemForm}>
                      <TextInput
                        style={styles.addItemNameInput}
                        placeholder="Item name (e.g. Atta 10kg)"
                        placeholderTextColor="#94A3B8"
                        value={newItemName}
                        onChangeText={setNewItemName}
                      />
                      <TextInput
                        style={styles.addItemPriceInput}
                        placeholder="Price"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={newItemPrice}
                        onChangeText={setNewItemPrice}
                      />
                      <TouchableOpacity style={styles.addItemSubmitBtn} onPress={handleAddItem}>
                        <Ionicons name="add" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* 5. Due Date Pills */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Waday Ki Tareekh (وعدے کی تاریخ)</Text>
                    <Text style={styles.dateDisplayText}>{formatDateDisplay(calculatedDueDate)}</Text>
                  </View>

                  <View style={styles.returnPresetsGrid}>
                    <TouchableOpacity
                      style={[styles.returnChip, returnOption === '7_DAYS' && styles.returnChipActive]}
                      onPress={() => setReturnOption('7_DAYS')}
                    >
                      <Text style={[styles.returnChipText, returnOption === '7_DAYS' && styles.returnChipTextActive]}>
                        7 Din Baad
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.returnChip, returnOption === '15_DAYS' && styles.returnChipActive]}
                      onPress={() => setReturnOption('15_DAYS')}
                    >
                      <Text style={[styles.returnChipText, returnOption === '15_DAYS' && styles.returnChipTextActive]}>
                        15 Din Baad
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.returnChip, returnOption === 'PEHLI' && styles.returnChipActive]}
                      onPress={() => setReturnOption('PEHLI')}
                    >
                      <Text style={[styles.returnChipText, returnOption === 'PEHLI' && styles.returnChipTextActive]}>
                        Pehli Tareekh
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.returnChip, returnOption === '30_DAYS' && styles.returnChipActive]}
                      onPress={() => setReturnOption('30_DAYS')}
                    >
                      <Text style={[styles.returnChipText, returnOption === '30_DAYS' && styles.returnChipTextActive]}>
                        Mahina Baad
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* STEP 1 FOOTER ACTIONS */}
                <View style={styles.step1Footer}>
                  {/* Primary Instant CTA */}
                  <TouchableOpacity
                    style={styles.savePrimaryBtn}
                    onPress={() => handleSubmit()}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                        <Text style={styles.savePrimaryBtnText}>
                          Save Udhaar (Rs. {effectiveAmount.toLocaleString()}) - محفوظ کریں
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Secondary Link to Step 2 */}
                  <TouchableOpacity
                    style={styles.step2LinkBtn}
                    onPress={() => setStep(2)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-attach-outline" size={16} color="#0284C7" />
                    <Text style={styles.step2LinkText}>
                      Add Receipt Photo / More Details (کچا پرچہ تصویر شامل کریں) &rarr;
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ================= STEP 2 FORM (Extended Details) ================= */
              <View style={styles.step2Container}>
                {/* 1. Native Receipt Camera & Gallery Picker */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>📸 Kacha Parcha / Receipt Photo (کچا پرچہ)</Text>

                  {receiptImage ? (
                    <View style={styles.receiptPreviewCard}>
                      <Image source={{ uri: getImageUrl(receiptImage) }} style={styles.receiptThumb} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.receiptFileName} numberOfLines={1}>
                          {receiptFileName || 'Attached Receipt.jpg'}
                        </Text>
                        <Text style={styles.receiptHelpText}>{receiptFileSize} • Attached</Text>
                      </View>
                      <TouchableOpacity style={styles.deleteBadgeBtn} onPress={handleRemoveReceipt}>
                        <Ionicons name="close" size={14} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoPickerCard}>
                      <Ionicons name="camera-outline" size={32} color="#0284C7" />
                      <Text style={styles.photoPickerTitle}>Attach Paper Slip / Kacha Parcha Photo</Text>
                      <View style={styles.photoButtonsRow}>
                        <TouchableOpacity style={styles.photoActionBtn} onPress={handleCameraLaunch}>
                          <Ionicons name="camera" size={16} color="#FFF" />
                          <Text style={styles.photoActionText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.photoActionBtn, { backgroundColor: '#0284C7' }]} onPress={handleGalleryLaunch}>
                          <Ionicons name="images" size={16} color="#FFF" />
                          <Text style={styles.photoActionText}>Choose Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* 2. Category Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category / Madd (شعبہ)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* 3. Optional Notes Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Tafseel / Notes (نوٹس)</Text>
                    <TouchableOpacity onPress={() => setVoiceSheetVisible(true)}>
                      <Text style={{ fontSize: 11, color: '#059669', fontWeight: '700' }}>🎤 Bol Kar Likhien</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Optional details or description..."
                    placeholderTextColor="#94A3B8"
                    value={description}
                    onChangeText={setDescription}
                  />
                </View>

                {/* STEP 2 ACTIONS */}
                <View style={styles.step2Actions}>
                  <TouchableOpacity style={styles.doneSaveBtn} onPress={() => handleSubmit()} disabled={loading}>
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={20} color="#FFF" />
                        <Text style={styles.doneSaveBtnText}>Done & Save (مکمل محفوظ کریں)</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.backStep1Btn} onPress={() => setStep(1)}>
                    <Text style={styles.backStep1BtnText}>&larr; Wapas Step 1 Par Jayein</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Credit Warning Modal */}
      <CreditLimitWarningModal
        visible={creditWarningVisible}
        customerName={currentCustomer?.name || 'Gahak'}
        customerId={currentCustomer?._id}
        currentBalance={currentBalance}
        newAmount={effectiveAmount}
        creditLimit={creditLimit}
        evaluation={jevEvaluation}
        onClose={() => setCreditWarningVisible(false)}
        onAllowOverride={(verifiedPin?: string) => {
          setManagerOverride(true);
          if (verifiedPin) setManagerPin(verifiedPin);
          setCreditWarningVisible(false);
          handleSubmit(verifiedPin);
        }}
        onLimitUpdated={(newLimit: number) => {
          if (currentCustomer) {
            currentCustomer.creditLimit = newLimit;
          }
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    maxHeight: '92%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  modalHeaderStep2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  backBtnStep2: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLeft: {
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
    backgroundColor: '#064E3B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  modalUrduTitle: {
    fontSize: 11,
    color: '#94A3B8',
  },
  modalTitleStep2: {
    fontSize: 15,
    fontWeight: '800',
    color: '#38BDF8',
  },
  modalUrduTitleStep2: {
    fontSize: 11,
    color: '#94A3B8',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    padding: 16,
  },
  step1Container: {
    gap: 14,
  },
  step2Container: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  requiredStar: {
    color: '#E11D48',
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addNayaGahakBtnInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addNayaGahakBtnTextInline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  customerChipsRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  addGahakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  addGahakChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  customerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 8,
  },
  customerChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniActive: {
    backgroundColor: '#059669',
  },
  avatarMiniText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  avatarMiniTextActive: {
    color: '#FFF',
  },
  customerChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  customerChipNameActive: {
    color: '#059669',
  },
  customerChipPhone: {
    fontSize: 10,
    color: '#64748B',
  },
  customerChipPhoneActive: {
    color: '#047857',
  },
  statusCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  limitValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  limitTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  limitBar: {
    height: '100%',
    borderRadius: 3,
  },
  jevStatusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 2,
  },
  jevStatusBadgeText: {
    fontSize: 10,
    color: '#6366F1',
    fontWeight: '600',
  },
  jevStatusTierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  jevStatusTierBadgeGreen: {
    backgroundColor: '#D1FAE5',
  },
  jevStatusTierBadgeAmber: {
    backgroundColor: '#FEF3C7',
  },
  jevStatusTierBadgeRed: {
    backgroundColor: '#FEE2E2',
  },
  jevStatusTierText: {
    fontSize: 10,
    fontWeight: '800',
  },
  jevRecLimitTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  modeToggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modeToggleTextActive: {
    color: '#059669',
  },
  itemCountBadge: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemCountBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '800',
  },
  amountField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#059669',
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  pkrPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickAmtRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickAmtChip: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickAmtText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateDisplayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  returnPresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  returnChip: {
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  returnChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  returnChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  returnChipTextActive: {
    color: '#FFF',
  },
  step1Footer: {
    gap: 10,
    marginTop: 8,
  },
  savePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 50,
    borderRadius: 14,
    gap: 8,
  },
  savePrimaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  step2LinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    height: 44,
    borderRadius: 12,
    gap: 6,
  },
  step2LinkText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  photoPickerCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  photoPickerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  photoActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#059669',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  receiptThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  receiptFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  receiptHelpText: {
    fontSize: 10,
    color: '#64748B',
  },
  deleteBadgeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E11D48',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  categoryChipTextActive: {
    color: '#FFF',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  step2Actions: {
    gap: 10,
    marginTop: 8,
  },
  doneSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  doneSaveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  backStep1Btn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backStep1BtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  itemizedSection: {
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  itemizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemizedTotalHeader: {
    fontSize: 12,
    color: '#64748B',
  },
  boldPkr: {
    fontWeight: '800',
    color: '#059669',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemUnitPriceText: {
    fontSize: 10,
    color: '#64748B',
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    padding: 4,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemTotalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  addItemForm: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  addItemNameInput: {
    flex: 2,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    fontSize: 12,
  },
  addItemPriceInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 38,
    fontSize: 12,
  },
  addItemSubmitBtn: {
    backgroundColor: '#059669',
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voicePanel: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    gap: 6,
  },
  voicePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voicePanelTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  voiceInputBox: {
    flexDirection: 'row',
    gap: 6,
  },
  voiceTextInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
  },
  voiceApplyBtn: {
    backgroundColor: '#166534',
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  voiceApplyBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
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
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
    flex: 1,
  },
});
