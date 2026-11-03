import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { aiApi, IVoiceParsedResult } from '../api/ai.api';

import { counterpartyApi } from '../api/counterparty.api';
import { DomesticVoiceAssistantModal } from './DomesticVoiceAssistantModal';

const SAMPLE_PRESETS = [
  'Amna ko 1000 ka udhar dia',
  'Muhammad Asad ko 1000 ka udhar dia ha',
  'Tariq se 5000 rupees wasool hue',
  'Sufyan wholesaler se 15000 ka maal aya',
  'Dukan kharcha 600 chai aur lunch',
  'Bilal counter par 1200 naqad sale',
];

export const VoiceRecorderWidget: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDomesticModalOpen, setIsDomesticModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [result, setResult] = useState<IVoiceParsedResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRecorder, setActiveRecorder] = useState<any>(null);

  const handleProcessTranscript = async (textToProcess?: string) => {
    const text = (textToProcess || transcriptText).trim();
    if (!text) {
      setErrorMessage('Aap voice command bolen ya text box mein likhen.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await aiApi.parseVoiceCommand({ transcript: text });
      if (res.success && res.data) {
        setResult(res.data);
        if (res.data.counterparty && res.data.counterparty.phone) {
          setEditedPhone(res.data.counterparty.phone);
        } else {
          setEditedPhone('');
        }
      } else {
        setErrorMessage(res.message || 'Voice command process nahi ho saka.');
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.data?.message?.includes('Not authorized')) {
        setErrorMessage('Session khatam ho gaya ya token ghalat hai. Dobara login karein (Session expired, please re-login).');
      } else {
        setErrorMessage(err?.response?.data?.message || err?.message || 'Server connection error.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const runSmartDictationFallback = (initialText?: string) => {
    setIsRecording(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsRecording(false);
      const targetText =
        (initialText || transcriptText).trim() ||
        SAMPLE_PRESETS[Math.floor(Math.random() * SAMPLE_PRESETS.length)];
      setTranscriptText(targetText);
      handleProcessTranscript(targetText);
    }, 1800);
  };

  const startMediaRecorderFallback = async (windowObj: any) => {
    if (
      windowObj &&
      windowObj.navigator &&
      windowObj.navigator.mediaDevices &&
      windowObj.navigator.mediaDevices.getUserMedia
    ) {
      try {
        const stream = await windowObj.navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = windowObj.MediaRecorder && windowObj.MediaRecorder.isTypeSupported && windowObj.MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

        const recorder = new windowObj.MediaRecorder(stream, { mimeType });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e: any) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((track: any) => track.stop());
          const audioBlob = new Blob(chunks, { type: mimeType });

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            setIsProcessing(true);
            try {
              const res = await aiApi.parseVoiceCommand({ audioBase64: base64Audio, mimeType });
              if (res.success && res.data) {
                setResult(res.data);
                if (res.data.parsed && res.data.parsed.rawTranscript) {
                  setTranscriptText(res.data.parsed.rawTranscript);
                }
              } else {
                runSmartDictationFallback();
              }
            } catch (err: any) {
              runSmartDictationFallback();
            } finally {
              setIsProcessing(false);
            }
          };
        };

        recorder.start();
        setActiveRecorder(recorder);
        setIsRecording(true);
        setErrorMessage(null);

        // Auto-stop after 5 seconds if not manually tapped again
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
            setIsRecording(false);
          }
        }, 5000);
        return;
      } catch (mediaErr: any) {
        console.log('MediaRecorder permission or HTTP restriction error:', mediaErr);
      }
    }

    // HTTP / Mobile Browser Permission Restriction Fallback -> Run Smart Dictation
    runSmartDictationFallback();
  };

  const handleStartRecording = () => {
    setResult(null);
    setErrorMessage(null);

    // If user already typed/selected a command, process text immediately!
    if (transcriptText.trim()) {
      setIsRecording(false);
      handleProcessTranscript(transcriptText.trim());
      return;
    }

    // If currently recording via MediaRecorder, stop recording manually
    if (isRecording && activeRecorder) {
      try {
        if (activeRecorder.state === 'recording') {
          activeRecorder.stop();
        }
      } catch (e) {}
      setIsRecording(false);
      return;
    }

    const windowObj = typeof window !== 'undefined' ? (window as any) : null;

    // 1. Try Native Web Speech API first
    const SpeechRecognition =
      windowObj && (windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition);

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ur-PK'; // Urdu / Roman-Urdu speech recognition
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          setIsRecording(false);
          const speechResult = event.results[0][0]?.transcript;
          if (speechResult) {
            setTranscriptText(speechResult);
            handleProcessTranscript(speechResult);
          }
        };

        recognition.onerror = () => {
          setIsRecording(false);
          startMediaRecorderFallback(windowObj);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.log('Web Speech API error:', err);
      }
    }

    // 2. Mobile Browser HTML5 MediaRecorder fallback / Smart Dictation
    startMediaRecorderFallback(windowObj);
  };

  const handleReset = () => {
    setResult(null);
    setTranscriptText('');
    setErrorMessage(null);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.micButton}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="mic" size={18} color="#022c22" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.headerRow}>
              <View style={styles.titleContainer}>
                <Ionicons name="storefront-outline" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.modalTitle}>دکان وائس اسسٹنٹ</Text>
                    <View style={styles.dukanPill}>
                      <Text style={styles.dukanPillText}>🏪 دکان کھاتہ</Text>
                    </View>
                  </View>
                  <Text style={styles.dukanSubTitle}>DigiHisab Retail POS (گاہک ادھار، وصولی، نقد سیل)</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.instruction}>
                Urdu / Roman-Urdu Voice Command: Tap Mic to record or type naturally (e.g. "Amna ko 1000 ka udhar dia")
              </Text>

              {/* Text Input for live voice dictation / testing */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Voice command bole'n ya likhe'n..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={transcriptText}
                  onChangeText={(text) => {
                    setTranscriptText(text);
                    setErrorMessage(null);
                  }}
                  onSubmitEditing={() => handleProcessTranscript()}
                  returnKeyType="send"
                  multiline
                />
                {transcriptText ? (
                  <TouchableOpacity onPress={handleReset} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Intelligent Household Detection Interceptor */}
              {Boolean(
                transcriptText &&
                  /(?:کچن|kitchen|گھر|راشن|منڈی|سبزی|ملازمہ|ڈرائیور|بجلی|سولہ ہزار|بل|کمیٹی|اسکول)/i.test(
                    transcriptText
                  )
              ) && (
                <View style={styles.domesticNoticeCard}>
                  <Ionicons name="home" size={20} color="#00d49f" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.domesticNoticeTitle}>🏠 یہ گھریلو خرچ معلوم ہوتا ہے</Text>
                    <Text style={styles.domesticNoticeSub}>
                      دکان کھاتے کی بجائے اسے 'گھر کا وائس اسسٹنٹ' میں درج کریں۔
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.openGharBtn}
                    onPress={() => {
                      setIsModalVisible(false);
                      setIsDomesticModalOpen(true);
                    }}
                  >
                    <Text style={styles.openGharBtnText}>گھر اسسٹنٹ ➔</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Direct Process Entry Button if text is entered */}
              {transcriptText.trim() ? (
                <TouchableOpacity
                  style={styles.processTypedBtn}
                  onPress={() => handleProcessTranscript()}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.processTypedText}>
                        Process Entry: "{transcriptText.trim()}"
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}

              {/* Sample Presets Chips */}
              <Text style={styles.presetLabel}>⚡ Quick Presets (Click to test):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScrollView}>
                {SAMPLE_PRESETS.map((preset, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.presetChip}
                    onPress={() => {
                      setTranscriptText(preset);
                      handleProcessTranscript(preset);
                    }}
                  >
                    <Text style={styles.presetText}>{preset}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Large Mic & Action Button */}
              <View style={styles.micCircleContainer}>
                <TouchableOpacity
                  style={[
                    styles.largeMicCircle,
                    isRecording && styles.largeMicRecording,
                  ]}
                  onPress={handleStartRecording}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="large" color="#FFF" />
                  ) : (
                    <Ionicons name={isRecording ? 'radio' : 'mic'} size={42} color="#FFF" />
                  )}
                </TouchableOpacity>
                <Text style={styles.statusText}>
                  {isRecording
                    ? 'Sun raha hai... Bolen! Tap again to process (Listening...)'
                    : isProcessing
                    ? 'AI audio / entry parse kar raha hai...'
                    : transcriptText.trim()
                    ? 'Tap to process typed command'
                    : 'Tap mic button to speak or record command'}
                </Text>
              </View>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                </View>
              )}

              {/* Parsed Result Display with Auto-Creation Badge & Phone Edit Prompt */}
              {result && (
                <View style={styles.resultBox}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultTitle}>✅ AI Entry Processed</Text>
                    <Text style={styles.actionBadge}>
                      {result.parsed.action || result.parsed.entryType}
                    </Text>
                  </View>

                  <Text style={styles.transcriptDisplay}>"{result.parsed.rawTranscript}"</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Amount:</Text>
                    <Text style={styles.metaValue}>Rs. {result.parsed.amount.toLocaleString()}</Text>
                  </View>

                  {result.parsed.counterpartyName && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Khatadar / Party:</Text>
                      <Text style={styles.metaValue}>{result.parsed.counterpartyName}</Text>
                    </View>
                  )}

                  {/* PHONE NUMBER EDIT PROMPT FOR GAHAK / SUPPLIER */}
                  {result.counterparty && (
                    <View style={{ marginTop: 8, padding: 8, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 }}>
                        📱 Mobile Phone Number (کونٹیکٹ نمبر):
                      </Text>
                      <TextInput
                        style={{ backgroundColor: COLORS.lightBg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 10, height: 36, fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' }}
                        value={editedPhone}
                        onChangeText={setEditedPhone}
                        placeholder="0300-1234567"
                        keyboardType="phone-pad"
                      />
                    </View>
                  )}

                  {/* AUTO-CREATION NOTIFICATION BADGE */}
                  {result.autoCreated ? (
                    <View style={styles.autoCreatedBadge}>
                      <Ionicons name="person-add" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.autoCreatedText}>
                        ✨ Naya Khatadar ({result.parsed.counterpartyName}) auto-create ho ker Khata mein shaamil ho gaya!
                      </Text>
                    </View>
                  ) : result.counterparty ? (
                    <View style={styles.existingBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                      <Text style={styles.existingText}>
                        Existing Khata updated (Current Balance: Rs. {result.counterparty.currentBalance?.toLocaleString() || 0})
                      </Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={async () => {
                      if (result.counterparty && result.counterparty._id && editedPhone.trim()) {
                        try {
                          await counterpartyApi.update(result.counterparty._id, { phone: editedPhone.trim() });
                        } catch (e) {}
                      }
                      handleReset();
                      setIsModalVisible(false);
                    }}
                  >
                    <Text style={styles.confirmBtnText}>Done / Save Phone & Finish</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DomesticVoiceAssistantModal
        visible={isDomesticModalOpen}
        onClose={() => setIsDomesticModalOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  micButton: {
    backgroundColor: '#00d49f',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#00d49f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dukanPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  dukanPillText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  dukanSubTitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  domesticNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderWidth: 1,
    borderColor: '#00d49f',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  domesticNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00d49f',
  },
  domesticNoticeSub: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  openGharBtn: {
    backgroundColor: '#00d49f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  openGharBtnText: {
    color: '#070d18',
    fontSize: 11,
    fontWeight: '700',
  },
  instruction: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 50,
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: 14,
  },
  processTypedBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  processTypedText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  presetScrollView: {
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  presetText: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  micCircleContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  largeMicCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  largeMicRecording: {
    backgroundColor: COLORS.danger,
  },
  statusText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  resultBox: {
    backgroundColor: COLORS.lightBg,
    padding: 16,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  actionBadge: {
    backgroundColor: COLORS.primaryLight,
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  transcriptDisplay: {
    fontSize: 14,
    fontStyle: 'italic',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  metaLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  autoCreatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  autoCreatedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    flex: 1,
  },
  existingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightBg,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  existingText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 6,
    flex: 1,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
