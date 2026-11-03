import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  parseDomesticUrduVoice,
  IParsedDomesticVoiceResult,
} from '../utils/urduDomesticVoiceParser';
import {
  domesticVoiceAssistantApi,
  IVoiceExecutionReceipt,
} from '../api/domesticVoiceAssistant.api';

export interface DomesticVoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (receipt: IVoiceExecutionReceipt) => void;
}

const SAMPLE_VOICE_COMMANDS = [
  'کچن کا 100 روپیہ میں نے لیا ہے',
  'آج منڈی سے پندرہ سو کا چکن اور پانچ سو کی سبزی لی کیش سے',
  'ڈرائیور کو دو ہزار روپے پیشگی دی جاز کیش سے',
  'بجلی کا بل سولہ ہزار میزان بینک سے جمع کروایا',
  'باجی شازیہ کو دس ہزار کمیٹی قسط دی ایزی پیسہ سے',
  'بچوں کی اسکول فیس بتیس ہزار حبیب بینک سے ادا کی',
];

export const DomesticVoiceAssistantModal: React.FC<DomesticVoiceAssistantModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState<IParsedDomesticVoiceResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [receipt, setReceipt] = useState<IVoiceExecutionReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Animation controllers for microphone pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setTranscript('');
      setParsedResult(null);
      setReceipt(null);
      setErrorMessage(null);
      setIsListening(false);
    } else {
      stopListening();
    }
  }, [visible]);

  // Auto-parse whenever transcript changes
  useEffect(() => {
    if (transcript.trim().length >= 3) {
      const parsed = parseDomesticUrduVoice(transcript);
      setParsedResult(parsed);
    } else {
      setParsedResult(null);
    }
  }, [transcript]);

  // Web Speech API / Browser speech recognition setup
  const startListening = () => {
    setErrorMessage(null);
    setReceipt(null);

    const isWeb = Platform.OS === 'web';
    const SpeechRecognition =
      isWeb &&
      (typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ur-PK';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recognition.onerror = (event: any) => {
          console.warn('[DomesticVoiceAssistant] Speech error:', event.error);
          setIsListening(false);
          if (event.error !== 'no-speech') {
            setErrorMessage('آواز ریکارڈ کرنے میں دشواری ہوئی۔ نیچے لکھ کر بھی ٹیسٹ کر سکتے ہیں۔');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('SpeechRecognition start failed:', err);
        setIsListening(false);
      }
    } else {
      // Speech recognition not directly available in environment -> toggle simulate listening
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
      }, 3000);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop error
      }
    }
    setIsListening(false);
  };

  const handleApplyPreset = (sampleText: string) => {
    stopListening();
    setTranscript(sampleText);
    const parsed = parseDomesticUrduVoice(sampleText);
    setParsedResult(parsed);
  };

  const handleConfirmExecute = async () => {
    if (!parsedResult || parsedResult.totalAmount <= 0) {
      Alert.alert('رقم درج نہیں', 'برائے مہربانی درست خرچ یا ادائیگی کی رقم بولیں یا لکھیں۔');
      return;
    }

    try {
      setExecuting(true);
      setErrorMessage(null);

      const execReceipt = await domesticVoiceAssistantApi.executeVoiceTransaction(parsedResult);
      setReceipt(execReceipt);
      if (onSuccess) {
        onSuccess(execReceipt);
      }
    } catch (err: any) {
      console.error('[DomesticVoiceAssistant] Execution error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'ادائیگی کے اندراج میں رکاوٹ آئی۔');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.micIconCircle}>
                <Ionicons name="home" size={18} color="#00d49f" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.modalHeadingUrdu}>گھر کا وائس اسسٹنٹ</Text>
                  <View style={styles.homePillTag}>
                    <Text style={styles.homePillTagText}>🏠 گھرانہ موڈ</Text>
                  </View>
                </View>
                <Text style={styles.modalHeadingEn}>DigiHisab Ghar Voice Assistant (Household AI)</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16 }}>
            {/* SUCCESS RECEIPT VIEW */}
            {receipt ? (
              <View style={styles.receiptContainer}>
                <View style={styles.receiptSuccessIconCircle}>
                  <Ionicons name="checkmark-circle" size={54} color="#00d49f" />
                </View>

                <Text style={styles.receiptTitleUrdu}>ادائیگی کامیابی سے درج ہو گئی!</Text>
                <Text style={styles.receiptTitleEn}>JEV Voucher & Entry Recorded Successfully</Text>

                <View style={styles.voucherBadgeRow}>
                  <View style={styles.voucherBadge}>
                    <Text style={styles.voucherBadgeText}>
                      واؤچر نمبر: {receipt.voucherNumber} ({receipt.voucherType})
                    </Text>
                  </View>
                </View>

                <View style={styles.receiptCard}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>منہا شدہ رقم:</Text>
                    <Text style={styles.receiptAmount}>
                      Rs. {receipt.amountDebited.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>ادائیگی والٹ کھاتہ:</Text>
                    <Text style={styles.receiptValue}>{receipt.debitedVaultTitle}</Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>والٹ میں بقیہ بیلنس:</Text>
                    <Text style={[styles.receiptValue, { color: '#00d49f', fontWeight: '700' }]}>
                      Rs. {receipt.remainingVaultBalance.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <Text style={styles.receiptSummaryUrdu}>{receipt.targetSummaryUrdu}</Text>
                  <Text style={styles.receiptAuditText}>{receipt.auditNotesUrdu}</Text>
                </View>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => {
                    setReceipt(null);
                    setTranscript('');
                    setParsedResult(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="mic-outline" size={18} color="#070d18" />
                  <Text style={styles.doneBtnText}>ایک اور خرچ بولیں (Record Another)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeReceiptBtn}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeReceiptBtnText}>کھاتے میں واپس جائیں (Done)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* 1. Pulsing Microphone Centerpiece */}
                <View style={styles.micCenterContainer}>
                  <TouchableOpacity
                    onPress={isListening ? stopListening : startListening}
                    activeOpacity={0.8}
                  >
                    <Animated.View
                      style={[
                        styles.micPulseRing,
                        isListening && styles.micPulseRingActive,
                        { transform: [{ scale: pulseAnim }] },
                      ]}
                    >
                      <View
                        style={[styles.micBigButton, isListening && styles.micBigButtonActive]}
                      >
                        <Ionicons
                          name={isListening ? 'mic' : 'mic-outline'}
                          size={38}
                          color="#070d18"
                        />
                      </View>
                    </Animated.View>
                  </TouchableOpacity>

                  <Text style={styles.listenStatusText}>
                    {isListening
                      ? '🎙️ بولیں... آپ کی بات سن رہے ہیں'
                      : 'مائیک کو ٹیپ کر کے اردو یا رومن اردو میں بولیں'}
                  </Text>
                  <Text style={styles.listenStatusSub}>
                    {isListening
                      ? 'Listening in Urdu / Roman Urdu...'
                      : 'Tap mic to speak or select an example below'}
                  </Text>
                </View>

                {/* 2. Live Transcription Input Area */}
                <View style={styles.transcriptBox}>
                  <View style={styles.transcriptHeader}>
                    <Text style={styles.transcriptLabel}>بولے گئے الفاظ (Transcript):</Text>
                    {Boolean(transcript) && (
                      <TouchableOpacity onPress={() => setTranscript('')}>
                        <Text style={styles.clearText}>صاف کریں</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.transcriptInput}
                    value={transcript}
                    onChangeText={setTranscript}
                    placeholder="مثال: آج منڈی سے پندرہ سو کا چکن اور پانچ سو کی سبزی لی کیش سے..."
                    placeholderTextColor="#64748B"
                    multiline
                  />
                </View>

                {/* 3. Preset Quick-Test Chips */}
                <Text style={styles.sampleHeading}>عام گھریلو مثالیں (Tap to Test):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sampleScroll}>
                  {SAMPLE_VOICE_COMMANDS.map((sample, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.sampleChip}
                      onPress={() => handleApplyPreset(sample)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color="#38BDF8" />
                      <Text style={styles.sampleChipText}>{sample}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* 4. Real-time Parsed Action Card */}
                {parsedResult && parsedResult.totalAmount > 0 && (
                  <View style={styles.actionCard}>
                    <View style={styles.actionCardHeader}>
                      <View style={styles.intentBadge}>
                        <Ionicons name="sparkles" size={14} color="#00d49f" />
                        <Text style={styles.intentBadgeText}>{parsedResult.titleUrdu}</Text>
                      </View>
                      <View style={styles.voucherPill}>
                        <Text style={styles.voucherPillText}>{parsedResult.voucherType}</Text>
                      </View>
                    </View>

                    {/* Total Amount Banner */}
                    <View style={styles.amountBanner}>
                      <Text style={styles.amountLabel}>کل منہا ہونے والی رقم:</Text>
                      <Text style={styles.amountValue}>
                        Rs. {parsedResult.totalAmount.toLocaleString()}
                      </Text>
                    </View>

                    {/* Multi-Item Compound Splits */}
                    {parsedResult.itemSplits.length > 0 && (
                      <View style={styles.splitBox}>
                        <Text style={styles.splitBoxHeading}>اشیاء کی تقسیم (Itemized Split):</Text>
                        {parsedResult.itemSplits.map((item, iIdx) => (
                          <View key={iIdx} style={styles.splitItemRow}>
                            <Text style={styles.splitItemName}>• {item.itemNameUrdu}:</Text>
                            <Text style={styles.splitItemAmount}>
                              Rs. {item.amount.toLocaleString()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Channel & Vault Tag */}
                    <View style={styles.vaultRow}>
                      <Ionicons
                        name={
                          parsedResult.paymentChannel === 'WALLET'
                            ? 'phone-portrait-outline'
                            : parsedResult.paymentChannel === 'BANK'
                            ? 'business-outline'
                            : 'cash-outline'
                        }
                        size={18}
                        color="#38BDF8"
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.vaultTitleUrdu}>
                          ادائیگی کھاتہ: {parsedResult.detectedVaultNameUrdu}
                        </Text>
                        <Text style={styles.vaultSub}>
                          JEV واؤچر اور کھاتہ خودکار بیلنس ہوگا
                        </Text>
                      </View>
                    </View>

                    {/* Error Banner if any */}
                    {Boolean(errorMessage) && (
                      <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={16} color="#EF4444" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                      </View>
                    )}

                    {/* Confirm & Execute Button */}
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handleConfirmExecute}
                      disabled={executing}
                      activeOpacity={0.8}
                    >
                      {executing ? (
                        <ActivityIndicator size="small" color="#070d18" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={20} color="#070d18" />
                          <Text style={styles.confirmBtnText}>
                            ✓ تصدیق اور خودکار اندراج کریں (Confirm & Post)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
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
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#070d18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#17233b',
    maxHeight: '92%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  modalHeadingUrdu: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  homePillTag: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  homePillTagText: {
    color: '#00d49f',
    fontSize: 10,
    fontWeight: '700',
  },
  modalHeadingEn: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#0d1627',
  },
  scrollContent: {
    flexGrow: 1,
  },
  micCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  micPulseRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micPulseRingActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.28)',
    borderWidth: 2,
    borderColor: '#00d49f',
  },
  micBigButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#00d49f',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d49f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  micBigButtonActive: {
    backgroundColor: '#38BDF8',
  },
  listenStatusText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  listenStatusSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  transcriptBox: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  transcriptLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  clearText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  transcriptInput: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 50,
    textAlign: 'left',
  },
  sampleHeading: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'left',
  },
  sampleScroll: {
    marginBottom: 16,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  sampleChipText: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  actionCard: {
    backgroundColor: '#091322',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.35)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  intentBadgeText: {
    color: '#00d49f',
    fontSize: 13,
    fontWeight: '700',
  },
  voucherPill: {
    backgroundColor: '#111d33',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e2e4a',
  },
  voucherPillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  amountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1627',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  amountLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  amountValue: {
    color: '#00d49f',
    fontSize: 20,
    fontWeight: '800',
  },
  splitBox: {
    backgroundColor: '#0d1627',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  splitBoxHeading: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'left',
  },
  splitItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  splitItemName: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  splitItemAmount: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
  },
  vaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  vaultTitleUrdu: {
    color: '#BAE6FD',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'left',
  },
  vaultSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'left',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    flex: 1,
    textAlign: 'left',
  },
  confirmBtn: {
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  confirmBtnText: {
    color: '#070d18',
    fontSize: 14,
    fontWeight: '700',
  },
  // Receipt Styles
  receiptContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  receiptSuccessIconCircle: {
    marginBottom: 12,
  },
  receiptTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  receiptTitleEn: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  voucherBadgeRow: {
    marginTop: 10,
    marginBottom: 14,
  },
  voucherBadge: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: '#00d49f',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  voucherBadgeText: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: '700',
  },
  receiptCard: {
    width: '100%',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  receiptLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  receiptAmount: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
  },
  receiptValue: {
    color: '#F8FAFC',
    fontSize: 13,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#17233b',
    marginVertical: 10,
  },
  receiptSummaryUrdu: {
    color: '#00d49f',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'left',
    lineHeight: 18,
  },
  receiptAuditText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'left',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  doneBtnText: {
    color: '#070d18',
    fontSize: 14,
    fontWeight: '700',
  },
  closeReceiptBtn: {
    paddingVertical: 10,
  },
  closeReceiptBtnText: {
    color: '#94A3B8',
    fontSize: 13,
  },
});

export default DomesticVoiceAssistantModal;
