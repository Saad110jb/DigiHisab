import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/auth.store';
import { COLORS } from '../theme/colors';
import { paymentLinkApi, PaymentGateway, IDynamicPaymentLink } from '../api/paymentLink.api';
import { profileApi } from '../api/profile.api';
import { useAppVersion } from '../context/AppVersionContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultAmount?: number;
  counterpartyId?: string;
  counterpartyName?: string;
}

export const MerchantPayLinkModal: React.FC<Props> = ({
  visible,
  onClose,
  defaultAmount = 500,
  counterpartyId,
  counterpartyName,
}) => {
  const { user } = useAuth();
  const { isFeatureEnabled } = useAppVersion();

  const isGatewayAvailable = (g: PaymentGateway) => {
    if (g === 'JAZZCASH') return isFeatureEnabled('jazzcash_qr_scanner');
    if (g === 'EASYPAISA') return isFeatureEnabled('easypaisa_merchant_gateway');
    if (g === 'RAAST') return isFeatureEnabled('raast_p2m_instant_rail');
    return true;
  };

  const [amount, setAmount] = useState<string>(defaultAmount.toString());
  const [gateway, setGateway] = useState<PaymentGateway>('JAZZCASH');
  const [generatedLink, setGeneratedLink] = useState<IDynamicPaymentLink | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveProfile, setLiveProfile] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      profileApi.getProfile().then((prof) => {
        if (prof) setLiveProfile(prof);
      }).catch(() => {});
    }
  }, [visible]);

  const shopName = liveProfile?.businessName || user?.businessName || (user?.fullName ? `${user.fullName}'s Store` : 'میرا اسٹور');
  const ownerName = liveProfile?.fullName || user?.fullName || 'مالک دکان';
  const shopAddress = user?.address
    ? user?.city
      ? `${user.address}, ${user.city}`
      : user.address
    : user?.city || 'پاکستان';

  const jazzNumber = liveProfile?.paymentDetails?.jazzcash?.accountNumber || liveProfile?.paymentSettings?.jazzCashNumber || user?.paymentSettings?.jazzCashNumber || user?.phone || '0300-0000000';
  const jazzTitle = liveProfile?.paymentDetails?.jazzcash?.accountTitle || liveProfile?.paymentSettings?.jazzCashTitle || user?.paymentSettings?.jazzCashTitle || ownerName;
  const easyNumber = liveProfile?.paymentDetails?.easypaisa?.accountNumber || liveProfile?.paymentSettings?.easypaisaNumber || user?.paymentSettings?.easypaisaNumber || user?.phone || '0300-0000000';
  const easyTitle = liveProfile?.paymentDetails?.easypaisa?.accountTitle || liveProfile?.paymentSettings?.easypaisaTitle || user?.paymentSettings?.easypaisaTitle || ownerName;
  const raastId = liveProfile?.paymentDetails?.raast?.idOrIban || liveProfile?.paymentSettings?.raastId || user?.paymentSettings?.raastId || user?.phone || '0300-0000000';
  const bankName = liveProfile?.paymentDetails?.raast?.bankName || liveProfile?.paymentSettings?.bankName || user?.paymentSettings?.bankName || 'Meezan Bank / HBL';

  const getActiveNumber = () => {
    if (gateway === 'JAZZCASH') return jazzNumber;
    if (gateway === 'EASYPAISA') return easyNumber;
    return raastId;
  };

  const getActiveTitle = () => {
    if (gateway === 'JAZZCASH') return jazzTitle;
    if (gateway === 'EASYPAISA') return easyTitle;
    return bankName;
  };

  const handleGenerateLink = async () => {
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Masla', 'Baraye meherbani durust rakam darj karein.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await paymentLinkApi.create({
        amount: numAmt,
        gateway,
        counterpartyId,
        validMinutes: 1440,
      });

      if (res.success && res.data) {
        setGeneratedLink(res.data);
      } else {
        Alert.alert('خطا', res.message || 'ادائیگی کا لنک تیار نہیں ہو سکا۔');
      }
    } catch (err: any) {
      Alert.alert('کنکشن کی خرابی', err?.message || 'سرور سے رابطہ نہیں ہو سکا۔');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setGeneratedLink(null);
  };

  const handleCopyAccount = () => {
    const num = getActiveNumber();
    Alert.alert('Copied to Clipboard!', `${gateway} Account Number: ${num}`);
  };

  const handleSendScreenshotWhatsApp = () => {
    const merchantPhoneClean = (user?.phone || '03000000000').replace(/[^0-9]/g, '');
    const numAmt = generatedLink ? generatedLink.amount : parseFloat(amount) || 0;
    const msg = `Assalam-o-Alaikum ${shopName} (${ownerName}),\n\nMain ne Rs. ${numAmt.toLocaleString()} ki adaigi ${gateway} par kar di hai. Screen shot attach hai.\n\nShukriya!`;
    const fullPhone = merchantPhoneClean.startsWith('92') ? merchantPhoneClean : `92${merchantPhoneClean.replace(/^0/, '')}`;
    const url = `whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(msg)}`);
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>💳 Pay Link & Merchant QR Code</Text>
              <Text style={styles.headerSub}>{shopName} • {ownerName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {generatedLink ? (
              /* Generated Direct Payment Instruction View */
              <View style={styles.qrResultContainer}>
                <View style={styles.merchantHeaderCard}>
                  <Text style={styles.merchantShopName}>{shopName}</Text>
                  <Text style={styles.merchantOwnerSub}>Owner: {ownerName} &bull; 📍 {shopAddress}</Text>
                  <View style={styles.amountBadge}>
                    <Text style={styles.amountBadgeLabel}>AMOUNT DUE</Text>
                    <Text style={styles.amountBadgeVal}>Rs. {generatedLink.amount.toLocaleString()}</Text>
                  </View>
                </View>

                {counterpartyName && (
                  <Text style={styles.counterpartyText}>Gahak: {counterpartyName}</Text>
                )}

                {/* Gateway Card with Account Details & 1-Tap Copy */}
                <View style={styles.directAccountCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.gatewayCardTitle}>{gateway} Direct Receiving Account</Text>
                    <TouchableOpacity style={styles.copyPillBtn} onPress={handleCopyAccount}>
                      <Ionicons name="copy-outline" size={13} color="#FFF" />
                      <Text style={styles.copyPillText}>Copy Number</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.accountNumberVal}>{getActiveNumber()}</Text>
                  <Text style={styles.accountTitleSub}>Title: <Text style={{ color: '#0F172A', fontWeight: '700' }}>{getActiveTitle()}</Text></Text>
                </View>

                {/* Payment Instructions Box */}
                <Text style={styles.linkLabel}>Payment Instructions Preview (تفصیلات):</Text>
                <View style={styles.linkUrlBox}>
                  <Text style={styles.instructionsText}>
                    {`Assalam-o-Alaikum,\n\nBarah-e-karam ${shopName} ke Rs. ${generatedLink.amount.toLocaleString()} is ${gateway} account par send karein:\n\n📱 ${gateway} #: ${getActiveNumber()}\n👤 Title: ${getActiveTitle()}\n\nTransfer ke baad slip ya screenshot share kijiyega. Shukriya! - ${ownerName}`}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.qrActionRow}>
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: '#25D366' }]}
                    onPress={handleSendScreenshotWhatsApp}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                    <Text style={styles.shareBtnText}>Share Details via WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: '#0284C7' }]}
                    onPress={handleCopyAccount}
                  >
                    <Ionicons name="copy-outline" size={16} color="#FFF" />
                    <Text style={styles.shareBtnText}>Copy Account</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.newLinkBtn, { marginTop: 10, width: '100%' }]} onPress={handleReset}>
                  <Text style={styles.newLinkBtnText}>Naya Payment Request Banayein</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Payment Link Generator Form */
              <View style={styles.formContainer}>
                <Text style={styles.fieldLabel}>Rakam (Payment Amount) *</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.pkrPrefix}>Rs.</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="1500"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                {/* Preset Chips */}
                <View style={styles.presetRow}>
                  {[500, 1000, 2000, 5000].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={styles.presetChip}
                      onPress={() => setAmount(preset.toString())}
                    >
                      <Text style={styles.presetChipText}>Rs. {preset}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.fieldLabel}>Select Payment Method *</Text>
                <View style={styles.gatewayGrid}>
                  {(['JAZZCASH', 'EASYPAISA', 'RAAST'] as PaymentGateway[]).map((g) => {
                    const available = isGatewayAvailable(g);
                    return (
                      <TouchableOpacity
                        key={g}
                        disabled={!available}
                        style={[
                          styles.gatewayChip,
                          gateway === g && styles.gatewayChipActive,
                          !available && { opacity: 0.45, backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
                        ]}
                        onPress={() => setGateway(g)}
                      >
                        <Ionicons
                          name="qr-code-outline"
                          size={16}
                          color={!available ? '#94A3B8' : gateway === g ? '#FFF' : '#334155'}
                        />
                        <Text
                          style={[
                            styles.gatewayChipText,
                            gateway === g && styles.gatewayChipTextActive,
                            !available && { color: '#94A3B8' },
                          ]}
                        >
                          {g} {!available ? '⚠️ بند' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Dynamic Account Display Card below selected gateway */}
                <View style={styles.accountPreviewCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.accountPreviewLabel}>{gateway} Account Details:</Text>
                    <TouchableOpacity onPress={handleCopyAccount}>
                      <Text style={styles.copyTextPill}>Copy Number 📋</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.accountPreviewNumber}>{getActiveNumber()}</Text>
                  <Text style={styles.accountPreviewTitle}>Title: {getActiveTitle()}</Text>

                  {/* Profile Fetch Notice */}
                  <View style={styles.profileNoticeRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#0284C7" />
                    <Text style={styles.profileNoticeText}>
                      Account details fetched from Shop Profile (Edit Profile to change numbers)
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGenerateLink}
                  disabled={isLoading}
                >
                  <Ionicons name="qr-code" size={18} color="#FFF" />
                  <Text style={styles.generateBtnText}>
                    {isLoading ? 'Ban Raha Hai...' : 'Generate Pay Link & QR Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
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
    maxHeight: 460,
  },
  formContainer: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  pkrPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#006C4E',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  gatewayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gatewayChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  gatewayChipActive: {
    backgroundColor: '#006C4E',
    borderColor: '#006C4E',
  },
  gatewayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  gatewayChipTextActive: {
    color: '#FFF',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  qrResultContainer: {
    alignItems: 'center',
    gap: 10,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  successBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  counterpartyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  qrAmountText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#006C4E',
  },
  gatewayLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  qrImageBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  scanNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
  },
  linkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    alignSelf: 'flex-start',
  },
  linkUrlBox: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    width: '100%',
  },
  linkUrlText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '600',
  },
  instructionsText: {
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 18,
  },
  qrActionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    height: 44,
    borderRadius: 10,
    gap: 6,
  },
  shareBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  newLinkBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newLinkBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  merchantHeaderCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  merchantShopName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#38BDF8',
  },
  merchantOwnerSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  amountBadge: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  amountBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  amountBadgeVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  directAccountCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#006C4E',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    gap: 4,
  },
  gatewayCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006C4E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  copyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  accountNumberVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  accountTitleSub: {
    fontSize: 11,
    color: '#64748B',
  },
  accountPreviewCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    gap: 4,
  },
  accountPreviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  copyTextPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  accountPreviewNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  accountPreviewTitle: {
    fontSize: 11,
    color: '#64748B',
  },
  profileNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  profileNoticeText: {
    fontSize: 10,
    color: '#64748B',
    flex: 1,
  },
});
