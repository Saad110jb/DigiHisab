import React, { useState, useEffect } from 'react';
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
import { counterpartyApi, ICounterparty } from '../api/counterparty.api';
import { ITillBalances } from '../api/cashDrawer.api';
import { profileApi, IPaymentChannels } from '../api/profile.api';
import { financeApi } from '../api/finance.api';
import { aiApi } from '../api/ai.api';
import { getImageUrl } from '../api/client';
import { generateUniqueInvoiceNo } from '../utils/invoiceGenerator';

interface PaySupplierModalProps {
  visible: boolean;
  supplier: ICounterparty | null;
  gallaCash?: number;
  tillBalances?: ITillBalances;
  onClose: () => void;
  onSuccess: (updatedSupplier: ICounterparty, amountPaid: number, mode: string) => void;
}

type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'JAZZCASH' | 'CHEQUE';

const PAYMENT_MODES: { label: string; value: PaymentMode; icon: string; urdu: string }[] = [
  { label: 'Cash (گلہ)', value: 'CASH', icon: 'cash-outline', urdu: 'نقد گلہ سے' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', icon: 'card-outline', urdu: 'بینک ٹرانسفر' },
  { label: 'JazzCash / EasyPaisa', value: 'JAZZCASH', icon: 'phone-portrait-outline', urdu: 'جاز کیش / ایزی پیسہ' },
  { label: 'Cheque', value: 'CHEQUE', icon: 'document-text-outline', urdu: 'بینک چیک' },
];

export const PaySupplierModal: React.FC<PaySupplierModalProps> = ({
  visible,
  supplier,
  gallaCash,
  tillBalances,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [isAdvance, setIsAdvance] = useState(false);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [paymentChannels, setPaymentChannels] = useState<IPaymentChannels>({
    cashDrawer: tillBalances?.physicalCash || 45000,
    bankAccount: tillBalances?.bankAccount || 125000,
    digitalWallet: tillBalances?.digitalWallet || 32000,
  });

  const fetchProfileChannels = async () => {
    try {
      const prof = await profileApi.getProfile();
      if (prof.paymentChannels) {
        setPaymentChannels(prof.paymentChannels);
      }
    } catch (e) {}
  };

  const owedAmount = supplier && supplier.currentBalance !== 0 ? Math.abs(supplier.currentBalance) : 0;
  const availableAdvanceCredit = supplier ? (supplier.advanceDeposit || 0) : 0;

  useEffect(() => {
    if (visible && supplier) {
      setAmount(owedAmount > 0 ? String(owedAmount) : '');
      setPaymentMode('CASH');
      setIsAdvance(owedAmount === 0);
      setReferenceNo(generateUniqueInvoiceNo(supplier.name));
      setNotes('');
      setReceiptImage(null);
      setErrorMsg(null);
      fetchProfileChannels();
    }
  }, [visible, supplier]);

  const getSelectedChannelBalance = () => {
    if (paymentMode === 'CASH') return paymentChannels.cashDrawer;
    if (paymentMode === 'JAZZCASH') return paymentChannels.digitalWallet;
    if (paymentMode === 'BANK_TRANSFER' || paymentMode === 'CHEQUE') return paymentChannels.bankAccount;
    return 0;
  };

  const selectedChannelBalance = getSelectedChannelBalance();
  const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
  const netRequiredCash = isAdvance ? numericAmount : Math.max(0, numericAmount - availableAdvanceCredit);
  const isInsufficientFunds = netRequiredCash > 0 && netRequiredCash > selectedChannelBalance;

  const [extractingOcr, setExtractingOcr] = useState(false);
  const [ocrBadgeText, setOcrBadgeText] = useState<string | null>(null);

  const processReceiptImage = async (base64Uri: string) => {
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
      const uploadRes = await aiApi.uploadAsset(base64Uri, 'supplier_pay');
      if (uploadRes.success && uploadRes.data?.url) {
        setReceiptImage(uploadRes.data.url);
      }

      const ocrRes = await aiApi.extractOcrData(base64Uri);
      if (ocrRes.success && ocrRes.data) {
        const data = ocrRes.data;
        const targetAmt = data.amount || data.dueAmount || 0;
        if (targetAmt > 0 && (!amount || amount === '0')) {
          setAmount(String(targetAmt));
        }
        if (data.invoiceNumber && !referenceNo) {
          setReferenceNo(data.invoiceNumber);
        }
        if (targetAmt > 0) {
          setOcrBadgeText(`✨ Extracted Amount: Rs. ${targetAmt.toLocaleString()} • Ref #: ${data.invoiceNumber || 'N/A'}`);
        } else {
          setOcrBadgeText('Voucher photo stored safely');
        }
      }
    } catch (e: any) {
      const errText = e.response?.data?.message || e.message;
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
        setErrorMsg('Camera permission required to capture payment receipt.');
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
        processReceiptImage(base64Uri);
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
        setErrorMsg('Gallery permission required to select payment receipt.');
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
        processReceiptImage(base64Uri);
      }
    } catch (err: any) {
      setErrorMsg('Failed to open gallery: ' + err.message);
    }
  };

  const handleSave = async () => {
    if (!supplier?._id) return;

    const numericAmount = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
    if (numericAmount <= 0) {
      setErrorMsg('Baraye meherbani sahi adaigi ki rakam darj karein (Valid amount > 0 required).');
      return;
    }

    if (isInsufficientFunds) {
      setErrorMsg(`⚠️ Is account mein raqam na-kafi hai (Available: Rs. ${selectedChannelBalance.toLocaleString()}). Pehle account mein raqam jama karein ya doosra zariya chunein.`);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      if (netRequiredCash > 0) {
        const outflowRes = await financeApi.recordOutflow({
          outflowType: 'Pay Supplier',
          amount: netRequiredCash,
          paymentMode,
          counterpartyId: supplier._id,
          category: 'Supplier Payout',
          description: notes.trim() || `Supplier Payout (${supplier.name})`,
        });

        if (!outflowRes.success) {
          setErrorMsg(outflowRes.message || '⚠️ Outflow payment failed due to insufficient funds.');
          setLoading(false);
          return;
        }

        if (outflowRes.data?.updatedChannels) {
          setPaymentChannels(outflowRes.data.updatedChannels);
        }
      }

      const response = await counterpartyApi.paySupplier(supplier._id, {
        amount: numericAmount,
        paymentMode,
        isAdvance,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (response.success && response.data) {
        onSuccess(response.data.supplier, numericAmount, paymentMode);
        onClose();
      } else {
        setErrorMsg(response.message || 'Adaigi darj karne mein nakami hui.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Payment save karne mein masla aya.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!supplier) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="cash" size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Supplier Payment Disbursement</Text>
                <Text style={styles.modalUrduTitle}>سپلائر کو ادائیگی اور گلہ بندی</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Inline Error Banner */}
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#E11D48" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Supplier Info Summary Card */}
            <View style={styles.supplierSummaryBox}>
              <Text style={styles.supplierName}>{supplier.name}</Text>
              <Text style={styles.supplierPhone}>📱 {supplier.phone}</Text>

              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>
                  {owedAmount > 0 ? 'Wajib-ul-Ada Bill (Maine Dene):' : 'Current Money Owed:'}
                </Text>
                <Text style={[styles.balanceValue, owedAmount > 0 ? { color: '#E11D48' } : { color: '#059669' }]}>
                  Rs. {owedAmount.toLocaleString()}
                </Text>
              </View>

              {supplier.advanceDeposit && supplier.advanceDeposit > 0 ? (
                <View style={styles.advanceBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#0369A1" />
                  <Text style={styles.advanceBadgeText}>
                    Existing Advance Security Deposit: Rs. {supplier.advanceDeposit.toLocaleString()} (پیشگی رقم)
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Advance Switch / Toggle Box */}
            <View style={[styles.switchRow, isAdvance && { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, isAdvance && { color: '#047857' }]}>
                  {isAdvance ? '🟢 Advance Prepayment Mode Active (پیشگی رقم)' : 'Payment Mode: Paying Outstanding Bill'}
                </Text>
                <Text style={styles.switchSub}>
                  {isAdvance
                    ? 'Aainda stock shipment ke liye supplier ko advance prepayment bhejein'
                    : 'Supplier ke pehle se maujood bill/udhaar ki adaigi karein'}
                </Text>
              </View>
              <Switch
                value={isAdvance}
                onValueChange={setIsAdvance}
                trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
                thumbColor={isAdvance ? '#059669' : '#F1F5F9'}
              />
            </View>

            {/* Payment Amount Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                {isAdvance ? 'Advance Prepayment Amount (رقم پیشگی) *' : 'Payment Amount (رقم ادائیگی) *'}
              </Text>
              <View style={[styles.amountInputBox, isInsufficientFunds && styles.amountInputBoxError]}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  value={amount}
                  onChangeText={(val) => {
                    setAmount(val);
                    setErrorMsg(null);
                  }}
                />
              </View>

              {/* Quick Amount Chips */}
              <View style={styles.presetRow}>
                {[1000, 5000, 10000, 25000].map((presetAmt) => (
                  <TouchableOpacity
                    key={presetAmt}
                    style={styles.presetChip}
                    onPress={() => setAmount(String((parseFloat(amount) || 0) + presetAmt))}
                  >
                    <Text style={styles.presetChipText}>+Rs. {presetAmt.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Advance Prepayment Deduction Breakdown Card */}
              {!isAdvance && availableAdvanceCredit > 0 ? (
                <View style={styles.advanceDeductionCard}>
                  <View style={styles.advanceDeductionHeader}>
                    <Ionicons name="sparkles" size={15} color="#047857" />
                    <Text style={styles.advanceDeductionTitle}>
                      Advance Prepayment Credit Available: Rs. {availableAdvanceCredit.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.advanceDeductionSub}>
                    Is supplier ke pass Rs. {availableAdvanceCredit.toLocaleString()} ki advance credit maujood hai. Adaigi ke waqt yeh auto-deduct ho jayegi.
                  </Text>
                  <View style={styles.calcBox}>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>Owed Payable Amount:</Text>
                      <Text style={styles.calcVal}>Rs. {(parseFloat(amount) || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.calcRow}>
                      <Text style={styles.calcLabel}>- Advance Credit Applied:</Text>
                      <Text style={[styles.calcVal, { color: '#047857' }]}>
                        -Rs. {Math.min(parseFloat(amount) || 0, availableAdvanceCredit).toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.calcRow, styles.calcRowTotal]}>
                      <Text style={styles.calcLabelBold}>= Net Cash/Bank Payment Required:</Text>
                      <Text style={styles.calcValBold}>
                        Rs. {Math.max(0, (parseFloat(amount) || 0) - availableAdvanceCredit).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Payment Method Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Adaigi Ka Zariya / Till (Payment Mode) *</Text>
              <View style={styles.modeGrid}>
                {PAYMENT_MODES.map((mode) => {
                  const active = paymentMode === mode.value;
                  return (
                    <TouchableOpacity
                      key={mode.value}
                      style={[styles.modeChip, active && styles.modeChipActive]}
                      onPress={() => setPaymentMode(mode.value)}
                    >
                      <Ionicons name={mode.icon as any} size={18} color={active ? '#FFFFFF' : '#059669'} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modeChipLabel, active && styles.modeChipLabelActive]}>
                          {mode.label}
                        </Text>
                        <Text style={[styles.modeChipUrdu, active && styles.modeChipUrduActive]}>
                          {mode.urdu}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Real-Time Available Balance Badge Pill */}
              <View style={styles.balanceBadgePill}>
                <Ionicons name="wallet" size={14} color="#059669" />
                <Text style={styles.balanceBadgeText}>
                  Dastyab Balance (Available): Rs. {selectedChannelBalance.toLocaleString()}
                </Text>
              </View>

              {/* Pre-Submit Insufficient Funds Warning Banner */}
              {isInsufficientFunds && (
                <View style={styles.insufficientWarningBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.insufficientWarningText}>
                    ⚠️ Is account mein raqam na-kafi hai (Available: Rs. {selectedChannelBalance.toLocaleString()}). Pehle account mein raqam jama karein ya doosra zariya chunein.
                  </Text>
                </View>
              )}
            </View>

            {/* Reference Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reference / Cheque / Trx ID (آپشنل):</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. TRX-998811 or Cheque # 4001"
                placeholderTextColor="#94A3B8"
                value={referenceNo}
                onChangeText={setReferenceNo}
              />
            </View>

            {/* Payment Receipt / Voucher Photo Attachment */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Bank Voucher / Receipt Snapshot (آپشنل):</Text>
              {extractingOcr ? (
                <View style={styles.receiptPreviewCard}>
                  <ActivityIndicator size="small" color="#0284C7" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.receiptAttachedTitle}>🤖 Scanning Voucher Data...</Text>
                    <Text style={styles.receiptAttachedSub}>Extracting amount & reference number</Text>
                  </View>
                </View>
              ) : receiptImage ? (
                <View style={styles.receiptPreviewCard}>
                  <Image source={{ uri: getImageUrl(receiptImage) }} style={styles.receiptThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptAttachedTitle}>Voucher Photo Attached</Text>
                    <Text style={styles.receiptAttachedSub}>{ocrBadgeText || 'Ready for system storage'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setReceiptImage(null); setOcrBadgeText(null); }}>
                    <Ionicons name="trash-outline" size={20} color="#E11D48" />
                  </TouchableOpacity>
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
            </View>

            {/* Submit Action */}
            <TouchableOpacity
              style={[styles.saveBtn, (loading || isInsufficientFunds) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={loading || isInsufficientFunds}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {isAdvance ? 'Record Advance Prepayment (پیشگی ادائیگی)' : 'Record Supplier Payment (ادائیگی لاگ کریں)'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  formScroll: {
    padding: 16,
  },
  supplierSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  supplierPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  advanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 8,
    padding: 6,
    marginTop: 8,
    gap: 6,
  },
  advanceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  advanceDeductionCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  advanceDeductionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  advanceDeductionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#047857',
  },
  advanceDeductionSub: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
  },
  calcBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  calcRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
    marginTop: 4,
    paddingTop: 4,
  },
  calcLabel: {
    fontSize: 11,
    color: '#475569',
  },
  calcVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  calcLabelBold: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  calcValBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  switchSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#059669',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  modeGrid: {
    gap: 8,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  modeChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modeChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  modeChipLabelActive: {
    color: '#FFFFFF',
  },
  modeChipUrdu: {
    fontSize: 10,
    color: '#64748B',
  },
  modeChipUrduActive: {
    color: '#D1FAE5',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
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
    borderColor: '#059669',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  amountInputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  balanceBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
    gap: 6,
  },
  balanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  insufficientWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    gap: 8,
  },
  insufficientWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
    flex: 1,
  },
});
