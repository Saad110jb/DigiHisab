import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/auth.store';
import { profileApi } from '../api/profile.api';
import {
  TaqazaPolicyClassifier,
  JevTaqazaPolicy,
  TaqazaTone,
  TaqazaChannel,
} from '../services/taqazaClassifier.service';

export interface IPaymentAccount {
  accountNumber: string;
  accountTitle: string;
}

export interface IPaymentDetails {
  JAZZCASH: IPaymentAccount;
  EASYPAISA: IPaymentAccount;
  RAAST: IPaymentAccount;
}

export interface TagazaCustomer {
  _id?: string;
  id?: string;
  name: string;
  phone: string;
  currentBalance: number;
  creditLimit?: number;
  overdueDays?: number;
  dueDate?: string;
  defaultProbability?: number;
  priorRemindersSentCount?: number;
  historicalRepaymentRatio?: number;
  address?: string;
  riskTier?: string;
}

export interface TagazaModalProps {
  visible?: boolean;
  isOpen?: boolean;
  customer?: TagazaCustomer | null;
  onClose: () => void;
  onTagazaSent?: () => void;
  initialDetails?: Partial<IPaymentDetails>;
  onSavePaymentDetails?: (provider: string, number: string, title: string) => Promise<void>;
}

export const TagazaModal: React.FC<TagazaModalProps> = ({
  visible,
  isOpen,
  customer,
  onClose,
  onTagazaSent,
  initialDetails,
  onSavePaymentDetails,
}) => {
  const insets = useSafeAreaInsets();
  const isModalVisible = visible !== undefined ? visible : Boolean(isOpen);
  const { user, refreshProfile } = useAuth();

  const merchantName = user?.fullName || 'محمد سعد';
  const defaultPhone = user?.phone || '03189663004';
  const storeName = user?.businessName || user?.fullName || 'ڈیجی حساب اسٹور';

  const [taqazaAmount, setTaqazaAmount] = useState<number>(customer?.currentBalance || 500);
  const [selectedMethod, setSelectedMethod] = useState<'JAZZCASH' | 'EASYPAISA' | 'RAAST'>('JAZZCASH');
  const [reminderTone, setReminderTone] = useState<TaqazaTone>('POLITE');
  const [isManualToneOverride, setIsManualToneOverride] = useState<boolean>(false);

  // Merchant receiving accounts
  const [paymentDetails, setPaymentDetails] = useState<IPaymentDetails>({
    JAZZCASH: initialDetails?.JAZZCASH || {
      accountNumber: user?.paymentSettings?.jazzCashNumber || defaultPhone,
      accountTitle: user?.paymentSettings?.jazzCashTitle || merchantName,
    },
    EASYPAISA: initialDetails?.EASYPAISA || {
      accountNumber: user?.paymentSettings?.easypaisaNumber || defaultPhone,
      accountTitle: user?.paymentSettings?.easypaisaTitle || merchantName,
    },
    RAAST: initialDetails?.RAAST || {
      accountNumber: user?.paymentSettings?.raastId || defaultPhone,
      accountTitle: merchantName,
    },
  });

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editNumber, setEditNumber] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate days past due from dueDate or overdueDays
  const calculatedDaysPastDue = useMemo(() => {
    if (customer?.overdueDays !== undefined && customer.overdueDays >= 0) {
      return customer.overdueDays;
    }
    if (customer?.dueDate) {
      const target = new Date(customer.dueDate);
      const today = new Date();
      target.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    }
    return 0;
  }, [customer]);

  // Compute Jev Taqaza Policy
  const currentPolicy: JevTaqazaPolicy = useMemo(() => {
    if (!customer) {
      return {
        recommended_tone: 'POLITE',
        expected_recovery_rate: 0.88,
        recommended_channel: 'WHATSAPP',
        prefilledUrduMessage: '',
        reasonEn: 'Customer in good standing',
        reasonUr: 'گاہک کا ریکارڈ محفوظ ہے',
        escalationLevel: 1,
      };
    }

    return TaqazaPolicyClassifier.evaluate(
      {
        customerName: customer.name,
        currentBalance: taqazaAmount,
        creditLimit: customer.creditLimit || 15000,
        daysPastDue: calculatedDaysPastDue,
        historicalRepaymentRatio: customer.historicalRepaymentRatio ?? 0.85,
        priorRemindersSentCount: customer.priorRemindersSentCount ?? 0,
        defaultProbability: customer.defaultProbability ?? 0.15,
        address: customer.address,
        phone: customer.phone,
      },
      storeName,
      {
        jazzCash: paymentDetails.JAZZCASH.accountNumber,
        easypaisa: paymentDetails.EASYPAISA.accountNumber,
        raast: paymentDetails.RAAST.accountNumber,
        accountTitle: paymentDetails.JAZZCASH.accountTitle || merchantName,
      }
    );
  }, [customer, taqazaAmount, calculatedDaysPastDue, storeName, paymentDetails, merchantName]);

  // When modal opens or customer changes, auto-switch to recommended tone
  useEffect(() => {
    if (isModalVisible && customer) {
      setTaqazaAmount(customer.currentBalance > 0 ? customer.currentBalance : 500);
      setIsEditing(false);
      setCopied(false);
      setIsManualToneOverride(false);

      // Fetch latest profile payment settings
      profileApi
        .getProfile()
        .then((prof) => {
          if (prof) {
            const pd = prof.paymentDetails;
            const ps = prof.paymentSettings;
            setPaymentDetails({
              JAZZCASH: {
                accountNumber:
                  pd?.jazzcash?.accountNumber || ps?.jazzCashNumber || user?.phone || defaultPhone,
                accountTitle:
                  pd?.jazzcash?.accountTitle || ps?.jazzCashTitle || prof.fullName || merchantName,
              },
              EASYPAISA: {
                accountNumber:
                  pd?.easypaisa?.accountNumber || ps?.easypaisaNumber || user?.phone || defaultPhone,
                accountTitle:
                  pd?.easypaisa?.accountTitle || ps?.easypaisaTitle || prof.fullName || merchantName,
              },
              RAAST: {
                accountNumber:
                  pd?.raast?.idOrIban || ps?.raastId || ps?.iban || user?.phone || defaultPhone,
                accountTitle:
                  pd?.raast?.accountTitle || ps?.bankTitle || prof.fullName || merchantName,
              },
            });
          }
        })
        .catch(() => {});
    }
  }, [isModalVisible, customer]);

  // Synchronize recommended tone initially
  useEffect(() => {
    if (!isManualToneOverride && currentPolicy) {
      setReminderTone(currentPolicy.recommended_tone);
    }
  }, [currentPolicy, isManualToneOverride]);

  if (!isModalVisible || !customer) return null;

  const currentAccount = paymentDetails[selectedMethod];

  const handleStartEdit = () => {
    setEditNumber(currentAccount.accountNumber);
    setEditTitle(currentAccount.accountTitle);
    setIsEditing(true);
  };

  const handleSaveDetails = async () => {
    if (!editNumber.trim() || !editTitle.trim()) {
      Alert.alert('Validation Error', 'Baraye meherbani number aur title dono darj karein.');
      return;
    }
    setIsSaving(true);
    try {
      if (onSavePaymentDetails) {
        await onSavePaymentDetails(selectedMethod, editNumber.trim(), editTitle.trim());
      } else {
        const payload: any = {};
        if (selectedMethod === 'JAZZCASH') {
          payload.jazzCashNumber = editNumber.trim();
          payload.jazzCashTitle = editTitle.trim();
        } else if (selectedMethod === 'EASYPAISA') {
          payload.easypaisaNumber = editNumber.trim();
          payload.easypaisaTitle = editTitle.trim();
        } else {
          payload.raastId = editNumber.trim();
          payload.bankTitle = editTitle.trim();
        }
        await profileApi.updatePaymentAccounts(payload);
        refreshProfile?.();
      }
      setPaymentDetails((prev) => ({
        ...prev,
        [selectedMethod]: {
          accountNumber: editNumber.trim(),
          accountTitle: editTitle.trim(),
        },
      }));
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert('Save Error', err.message || 'Payment account save karne mein nakami hui.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate dynamic Urdu text based on selected tone
  const generateMessageText = () => {
    const custName = customer.name || 'گاہک';
    const formattedAmt = taqazaAmount.toLocaleString();
    const acctStr = `${selectedMethod}: ${currentAccount.accountNumber} (${currentAccount.accountTitle})`;

    let body = '';
    if (reminderTone === 'POLITE') {
      body = `محترم ${custName} صاحب! آپ کے کھاتے کا بقایا Rs. ${formattedAmt} ہے۔ سہولت کے مطابق ادائیگی کر دیں تاکہ لین دین کا اعتماد برقرار رہے۔ شکریہ! (${storeName})`;
    } else if (reminderTone === 'FIRM') {
      body = `محترم ${custName} صاحب! آپ کے وعدے کی تاریخ گزر چکی ہے۔ بقایا Rs. ${formattedAmt} فوری ادا کریں تاکہ آپ کا کھاتہ مزید خریداری کے لیے بحال رہے۔ (${storeName})`;
    } else {
      body = `حتمی نوٹس: ${custName} صاحب، بارہا یاد دہانی کے باوجود Rs. ${formattedAmt} واجب الادا ہے۔ فوری رابطہ کریں وگرنہ کھاتہ مستقل بند کر دیا جائے گا۔ (${storeName})`;
    }

    return `${body}\n\nکھاتہ برائے ادائیگی:\n${acctStr}\nادائیگی کے بعد تصدیقی سلپ بھیج دیں۔`;
  };

  const handleSendWhatsApp = async () => {
    try {
      const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('92')
        ? cleanPhone
        : cleanPhone.startsWith('03')
        ? `92${cleanPhone.substring(1)}`
        : `92${cleanPhone}`;

      const messageText = generateMessageText();
      const appUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;
      const webUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;

      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
      } else {
        await Linking.openURL(webUrl);
      }

      onTagazaSent?.();
      onClose();
    } catch (err: any) {
      Alert.alert('WhatsApp Preview', generateMessageText());
    }
  };

  const handlePlaceCall = () => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const phoneUrl = `tel:${cleanPhone}`;
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert('Call Failed', `Could not place call to ${customer.phone}`);
    });
  };

  const handleCopyMessage = () => {
    const textMsg = generateMessageText();
    if (Clipboard && Clipboard.setString) {
      Clipboard.setString(textMsg);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    Alert.alert('پیغام کاپی ہو گیا (Message Copied)', textMsg);
  };

  const handleSendSMS = async () => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const messageText = generateMessageText();
    const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`;
    try {
      await Linking.openURL(smsUrl);
    } catch (e) {
      Alert.alert('SMS Preview', messageText);
    }
  };

  const isRecommendedWhatsApp = currentPolicy.recommended_channel === 'WHATSAPP';
  const isRecommendedCall = currentPolicy.recommended_channel === 'DIRECT_CALL';
  const isRecommendedInPerson = currentPolicy.recommended_channel === 'IN_PERSON';

  return (
    <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="flash" size={20} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Dynamic Taqaza Classifier</Text>
                <Text style={styles.headerSub}>ذہین تقاضا نظام برائے گاہک ادھار وصولی</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Jev Policy Intelligence Banner */}
            <View
              style={[
                styles.policyBanner,
                currentPolicy.recommended_tone === 'POLITE' && styles.policyBannerPolite,
                currentPolicy.recommended_tone === 'FIRM' && styles.policyBannerFirm,
                currentPolicy.recommended_tone === 'FINAL_NOTICE' && styles.policyBannerFinal,
              ]}
            >
              <View style={styles.policyHeaderRow}>
                <View style={styles.policyPill}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                  <Text style={styles.policyPillText}>
                    JEV POLICY: {currentPolicy.recommended_tone.replace('_', ' ')}
                  </Text>
                </View>

                <View style={styles.recoveryRateBadge}>
                  <Ionicons name="trending-up" size={13} color="#059669" />
                  <Text style={styles.recoveryRateText}>
                    72h Recovery: {Math.round(currentPolicy.expected_recovery_rate * 100)}%
                  </Text>
                </View>

                <View style={styles.channelBadge}>
                  <Ionicons
                    name={
                      currentPolicy.recommended_channel === 'WHATSAPP'
                        ? 'logo-whatsapp'
                        : currentPolicy.recommended_channel === 'DIRECT_CALL'
                        ? 'call'
                        : 'walk'
                    }
                    size={13}
                    color="#1E293B"
                  />
                  <Text style={styles.channelBadgeText}>
                    {currentPolicy.recommended_channel === 'WHATSAPP'
                      ? 'WhatsApp'
                      : currentPolicy.recommended_channel === 'DIRECT_CALL'
                      ? 'Direct Call'
                      : 'In-Person'}
                  </Text>
                </View>
              </View>

              <Text style={styles.policyReasonUr}>{currentPolicy.reasonUr}</Text>
              <Text style={styles.policyReasonEn}>{currentPolicy.reasonEn}</Text>
            </View>

            {/* In-Person Advisory Notice */}
            {isRecommendedInPerson && (
              <View style={styles.inPersonCard}>
                <View style={styles.inPersonIconBox}>
                  <Ionicons name="walk" size={24} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inPersonTitle}>ذاتی دورہ تجویز کیا گیا ہے (In-Person Collection)</Text>
                  <Text style={styles.inPersonDesc}>
                    ڈیجیٹل پیغامات غیر مؤثر ہو چکے ہیں۔ شام کی بندش پر گاہک کے ایڈریس پر رابطہ کریں۔
                  </Text>
                  {customer.address ? (
                    <Text style={styles.customerAddressText}>📍 پتہ: {customer.address}</Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* 2. Customer Ledger Snapshot */}
            <View style={styles.customerBalanceCard}>
              <View style={styles.balanceInfoRow}>
                <View style={styles.userCheckBadge}>
                  <Text style={styles.userInitial}>
                    {(customer.name || 'G').substring(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerPhone}>{customer.phone}</Text>
                  <Text style={styles.delayText}>
                    {calculatedDaysPastDue > 0
                      ? `⚠️ ${calculatedDaysPastDue} دن زائد المعیاد (Overdue)`
                      : '✓ اندرونِ مدت (Within terms)'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.balanceLabel}>واجب الادا ادھار</Text>
                  <Text style={styles.balanceValue}>
                    Rs. {(customer.currentBalance || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Amount to Request Input */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>Taqaza Rakam (رقم برائے وصولی) *</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={String(taqazaAmount)}
                  onChangeText={(val) => setTaqazaAmount(parseFloat(val) || 0)}
                />
              </View>
            </View>

            {/* 4. Tone Ladder Tabs with Auto-Classification */}
            <View style={styles.sectionBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.sectionLabel}>Taqaza Tone (پیغام کا لہجہ) *</Text>
                {isManualToneOverride && (
                  <TouchableOpacity onPress={() => {
                    setIsManualToneOverride(false);
                    setReminderTone(currentPolicy.recommended_tone);
                  }}>
                    <Text style={styles.resetPolicyLink}>Reset to Jev Policy (دوبارہ سیٹ کریں)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.toneSelectorRow}>
                {[
                  { id: 'POLITE' as TaqazaTone, label: '1. Narm / Polite', ur: 'شائستہ یاد دہانی' },
                  { id: 'FIRM' as TaqazaTone, label: '2. Wazeh / Firm', ur: 'واضح تقاضا' },
                  { id: 'FINAL_NOTICE' as TaqazaTone, label: '3. Final Notice', ur: 'حتمی نوٹس' },
                ].map((t) => {
                  const isSel = reminderTone === t.id;
                  const isRec = currentPolicy.recommended_tone === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.toneChip, isSel && styles.toneChipActive]}
                      onPress={() => {
                        setIsManualToneOverride(true);
                        setReminderTone(t.id);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[styles.toneChipText, isSel && styles.toneChipTextActive]}>
                          {t.label}
                        </Text>
                        {isRec && (
                          <View style={styles.recDot} />
                        )}
                      </View>
                      <Text style={[styles.toneChipSub, isSel && styles.toneChipSubActive]}>
                        {t.ur}
                      </Text>
                      {isRec && (
                        <Text style={styles.recTag}>★ Recommended</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. Receiving Payment Method Selector */}
            <View style={styles.sectionBox}>
              <Text style={styles.sectionLabel}>Apna Wasooli Account Chunein (وصولی اکاؤنٹ) *</Text>
              <View style={styles.methodSelectorRow}>
                {(['JAZZCASH', 'EASYPAISA', 'RAAST'] as const).map((method) => {
                  const isSel = selectedMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      style={[styles.methodChip, isSel && styles.methodChipActive]}
                      onPress={() => {
                        setSelectedMethod(method);
                        setIsEditing(false);
                      }}
                    >
                      <Text style={[styles.methodChipText, isSel && styles.methodChipTextActive]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Receiving Account Card with Quick Inline Edit */}
            <View style={styles.accountCard}>
              <View style={styles.accountCardHeader}>
                <Text style={styles.accountCardTitle}>
                  {selectedMethod} Receiving Details:
                </Text>
                {!isEditing ? (
                  <TouchableOpacity style={styles.editBtn} onPress={handleStartEdit}>
                    <Ionicons name="pencil" size={14} color="#4F46E5" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                      onPress={handleSaveDetails}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="save-outline" size={14} color="#FFF" />
                          <Text style={styles.saveBtnText}>Save</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {!isEditing ? (
                <View style={styles.accountDetailsDisplay}>
                  <Text style={styles.accountNumText}>{currentAccount.accountNumber}</Text>
                  <Text style={styles.accountTitleText}>
                    Title: <Text style={styles.accountTitleBold}>{currentAccount.accountTitle}</Text>
                  </Text>
                </View>
              ) : (
                <View style={styles.editFormBox}>
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.inputSubLabel}>Mobile # / Raast ID</Text>
                    <TextInput
                      style={styles.editInput}
                      keyboardType="phone-pad"
                      value={editNumber}
                      onChangeText={setEditNumber}
                    />
                  </View>
                  <View>
                    <Text style={styles.inputSubLabel}>Account Title</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editTitle}
                      onChangeText={setEditTitle}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* 6. Dynamic Message Preview */}
            <Text style={styles.sectionLabel}>Message Preview (پیغام پیش نظارہ):</Text>
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{generateMessageText()}</Text>
            </View>

            {/* 7. Action Dispatch Buttons */}
            <View style={styles.actionsBox}>
              {/* Primary Channel Button (Adaptive) */}
              {isRecommendedCall ? (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity style={styles.callPrimaryBtn} onPress={handlePlaceCall}>
                    <Ionicons name="call" size={20} color="#FFFFFF" />
                    <Text style={styles.callPrimaryBtnText}>گاہک کو فون ملائیں (Direct Call Recommended)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.waPrimaryBtn} onPress={handleSendWhatsApp}>
                    <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                    <Text style={styles.waPrimaryBtnText}>واٹس ایپ پر بھی تقاضا بھیجیں</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity style={styles.waPrimaryBtn} onPress={handleSendWhatsApp}>
                    <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                    <Text style={styles.waPrimaryBtnText}>واٹس ایپ پر تقاضا بھیجیں (WhatsApp Dispatch)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.callSecondaryBtn} onPress={handlePlaceCall}>
                    <Ionicons name="call-outline" size={18} color="#0284C7" />
                    <Text style={styles.callSecondaryBtnText}>گاہک کو کال کریں (Direct Call)</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Secondary Utility Actions */}
              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity style={styles.copySecondaryBtn} onPress={handleCopyMessage}>
                  <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={16} color="#059669" />
                  <Text style={styles.copySecondaryBtnText}>{copied ? 'Copied' : 'Copy Text (SMS)'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.smsSecondaryBtn} onPress={handleSendSMS}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color="#4F46E5" />
                  <Text style={styles.smsSecondaryBtnText}>Send SMS</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const UdhaarTaqazaModal = TagazaModal;

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
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '92%',
    width: '100%',
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
    gap: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    maxHeight: '100%',
  },
  policyBanner: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  policyBannerPolite: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  policyBannerFirm: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  policyBannerFinal: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  policyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  policyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  policyPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  recoveryRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  recoveryRateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  channelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  policyReasonUr: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  policyReasonEn: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  inPersonCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  inPersonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inPersonTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  inPersonDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
  },
  customerAddressText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
    marginTop: 4,
  },
  customerBalanceCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  balanceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userCheckBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  customerPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  delayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 2,
  },
  balanceLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E11D48',
  },
  sectionBox: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  resetPolicyLink: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '700',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 8,
  },
  toneSelectorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toneChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  toneChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
  },
  toneChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  toneChipTextActive: {
    color: '#FFFFFF',
  },
  toneChipSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  toneChipSubActive: {
    color: '#E0E7FF',
  },
  recDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  recTag: {
    fontSize: 8,
    color: '#F59E0B',
    fontWeight: '800',
    marginTop: 2,
  },
  methodSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  methodChipActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },
  accountCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  accountCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 11,
    color: '#64748B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
  },
  saveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountDetailsDisplay: {
    gap: 2,
  },
  accountNumText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  accountTitleText: {
    fontSize: 11,
    color: '#64748B',
  },
  accountTitleBold: {
    fontWeight: '700',
    color: '#1E293B',
  },
  editFormBox: {
    gap: 6,
  },
  inputSubLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  editInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0F172A',
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  messageText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 20,
  },
  actionsBox: {
    gap: 8,
    paddingBottom: 8,
  },
  waPrimaryBtn: {
    backgroundColor: '#15803D',
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  callPrimaryBtn: {
    backgroundColor: '#D97706',
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  callSecondaryBtn: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 10,
    paddingVertical: 10,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  callSecondaryBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  copySecondaryBtn: {
    flexGrow: 1,
    minWidth: 120,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  copySecondaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  smsSecondaryBtn: {
    flexGrow: 1,
    minWidth: 120,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  smsSecondaryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
