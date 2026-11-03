import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ledgerApi } from '../api/ledger.api';

export interface ReceiptData {
  counterpartyId: string;
  counterpartyName: string;
  phone?: string;
  amountPaid: number;
  discountAmount?: number;
  remainingBalance: number;
  paymentMode: string;
  transactionId?: string;
  receiptMessage: string;
}

interface DigitalReceiptModalProps {
  visible: boolean;
  receipt: ReceiptData | null;
  onClose: () => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  visible,
  receipt,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  if (!receipt) return null;

  const getFormattedPhone = () => {
    const raw = receipt.phone || '';
    let cleaned = raw.trim().replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('03')) {
      cleaned = '+92' + cleaned.substring(1);
    }
    return cleaned;
  };

  const handleSendNativeSms = async () => {
    try {
      setSmsSending(true);
      // 1. Log SMS receipt audit to backend
      await ledgerApi.sendReceiptSms({
        counterpartyId: receipt.counterpartyId,
        amount: receipt.amountPaid,
        remainingBalance: receipt.remainingBalance,
        paymentMode: receipt.paymentMode as any,
        transactionId: receipt.transactionId,
        customMessage: receipt.receiptMessage,
      });

      // 2. Open native SMS app with prefilled phone & text
      const phone = getFormattedPhone();
      const smsUrl = Platform.OS === 'ios'
        ? `sms:${phone}&body=${encodeURIComponent(receipt.receiptMessage)}`
        : `sms:${phone}?body=${encodeURIComponent(receipt.receiptMessage)}`;

      await Linking.openURL(smsUrl);
    } catch (err: any) {
      Alert.alert('SMS Raseed', 'رسید کا متن کھول دیا گیا ہے۔');
    } finally {
      setSmsSending(false);
    }
  };

  const handleSendWhatsAppReceipt = async () => {
    try {
      const phone = getFormattedPhone().replace('+', '');
      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(receipt.receiptMessage)}`;
      await Linking.openURL(waUrl);
    } catch (err: any) {
      Alert.alert('WhatsApp Info', 'واٹس ایپ نہیں کھل سکا۔');
    }
  };

  const handleCopyReceipt = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentDate = new Date().toLocaleDateString('ur-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const displayPhone = receipt.phone ? receipt.phone : 'نمبر درج نہیں';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Success Badge */}
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle-sharp" size={60} color="#10B981" />
          </View>

          <Text style={styles.title}>وصولی کامیابی سے درج ہو گئی!</Text>
          <Text style={styles.subtitle}>ڈیجیٹل وصولی رسید (Digi Hisab Receipt)</Text>

          {/* Receipt Slip Container */}
          <View style={styles.receiptSlip}>
            <View style={styles.slipHeader}>
              <Text style={styles.shopName}>ڈیجی کِھاتہ (Digi Hisab)</Text>
              <Text style={styles.slipDate}>{currentDate}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>گاہک کا نام (Customer):</Text>
              <Text style={styles.value}>{receipt.counterpartyName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>موبائل نمبر (Phone):</Text>
              <Text style={[styles.value, { color: '#00D2B4' }]}>{displayPhone}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>طریقہ ادائیگی (Mode):</Text>
              <Text style={styles.value}>{receipt.paymentMode}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>وصول شدہ رقم (Wasool):</Text>
              <Text style={[styles.value, styles.amountPaidText]}>
                Rs. {receipt.amountPaid.toLocaleString()}
              </Text>
            </View>

            {Boolean(receipt.discountAmount && receipt.discountAmount > 0) && (
              <View style={styles.row}>
                <Text style={styles.label}>دی گئی رعایت (Discount):</Text>
                <Text style={[styles.value, { color: '#EF4444' }]}>
                  Rs. {receipt.discountAmount?.toLocaleString()}
                </Text>
              </View>
            )}

            <View style={[styles.row, styles.remainingRow]}>
              <Text style={styles.remainingLabel}>نیا بقایا (New Balance):</Text>
              <Text style={styles.remainingValue}>
                Rs. {receipt.remainingBalance.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* SMS Preview Message */}
          <Text style={styles.previewTitle}>ایس ایم ایس پیغام (SMS Content):</Text>
          <ScrollView style={styles.smsPreviewBox} nestedScrollEnabled>
            <Text style={styles.smsPreviewText}>{receipt.receiptMessage}</Text>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.smsBtn} onPress={handleSendNativeSms} disabled={smsSending}>
              <Ionicons name="chatbox-ellipses" size={20} color="#0B2239" style={{ marginRight: 8 }} />
              <Text style={styles.smsBtnText}>ایس ایم ایس رسید بھیجیں (SMS Raseed)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smsBtn, { backgroundColor: '#25D366' }]}
              onPress={handleSendWhatsAppReceipt}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={[styles.smsBtnText, { color: '#FFFFFF' }]}>واٹس ایپ رسید بھیجیں (WhatsApp)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyReceipt}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#00D2B4" style={{ marginRight: 6 }} />
              <Text style={styles.copyBtnText}>{copied ? 'رسید کاپی ہو گئی!' : 'رسید کاپی کریں (Copy)'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>بند کریں (Done)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 34, 57, 0.88)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#0B2239',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 180, 0.3)',
  },
  successIconWrapper: {
    marginTop: -10,
    marginBottom: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#00D2B4',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
  },
  receiptSlip: {
    width: '100%',
    backgroundColor: '#122E48',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 14,
  },
  slipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shopName: {
    color: '#00D2B4',
    fontSize: 15,
    fontWeight: '800',
  },
  slipDate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  label: {
    color: '#A0AEC0',
    fontSize: 13,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  amountPaidText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 16,
  },
  remainingRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 8,
    marginTop: 6,
  },
  remainingLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  remainingValue: {
    color: '#00D2B4',
    fontSize: 16,
    fontWeight: '800',
  },
  previewTitle: {
    alignSelf: 'flex-start',
    color: '#A0AEC0',
    fontSize: 12,
    marginBottom: 4,
  },
  smsPreviewBox: {
    width: '100%',
    backgroundColor: '#1A3B5C',
    borderRadius: 12,
    padding: 12,
    maxHeight: 70,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 180, 0.2)',
    marginBottom: 16,
  },
  smsPreviewText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  smsBtn: {
    backgroundColor: '#00D2B4',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsBtnText: {
    color: '#0B2239',
    fontSize: 14,
    fontWeight: '800',
  },
  copyBtn: {
    backgroundColor: '#122E48',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 180, 0.4)',
  },
  copyBtnText: {
    color: '#00D2B4',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});
