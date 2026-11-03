import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

// Eastern Arabic numerals to standard ASCII digits conversion
export const convertUrduNumerals = (str: string): string => {
  const urduDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[۰-۹]/g, (w) => urduDigits.indexOf(w).toString());
};

// Translates core Urdu script phrases and multipliers to Roman Urdu equivalents for the NLU engine
export const normalizeUrduText = (text: string): string => {
  let normalized = convertUrduNumerals(text);

  // Multipliers expansion
  normalized = normalized.replace(/ڈھائی ہزار/g, '2500');
  normalized = normalized.replace(/ڈیڑھ ہزار/g, '1500');
  normalized = normalized.replace(/ڈیڑھ/g, '1.5');
  normalized = normalized.replace(/ڈھائی/g, '2.5');
  normalized = normalized.replace(/ہزار/g, '000');
  normalized = normalized.replace(/سو/g, '00');
  normalized = normalized.replace(/لاکھ/g, '00000');

  const replacements: [RegExp, string][] = [
    [/ادھار دیا|ادھار/g, 'udhar dia'],
    [/وصول ہوئے|وصول ہوا|وصولی|آئے/g, 'wasool hue'],
    [/نقد سیل|نقد بکری|فوری سیل/g, 'naqad sale'],
    [/دکان خرچہ|خرچہ|چائے/g, 'dukan kharcha'],
    [/تھوک|مال آیا|خریداری/g, 'maal aya'],
    [/روپے|روپیہ/g, 'rupees'],
  ];

  for (const [urduRegex, romanReplacement] of replacements) {
    normalized = normalized.replace(urduRegex, romanReplacement);
  }

  return normalized.trim();
};

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  onExecuteCommand: (commandText: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  visible,
  onClose,
  onExecuteCommand,
}) => {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'ur-PK' | 'en-PK'>('ur-PK');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

  // Microphone pulse animation
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = voiceLang;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }

          const processed = voiceLang === 'ur-PK' ? normalizeUrduText(currentTranscript) : currentTranscript;
          setInputText(processed);
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setErrorMessage('⚠️ براہ کرم مائیکروفون کی اجازت دیں (Microphone access blocked)');
          } else if (event.error === 'no-speech') {
            setErrorMessage('⚠️ کوئی آواز نہیں سنی گئی۔ دوبارہ بولیں (No voice detected, try again)');
          } else {
            setErrorMessage(`مائیک کی خرابی: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [voiceLang]);

  const toggleListening = () => {
    if (Platform.OS === 'web' && recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
      } else {
        setErrorMessage(null);
        recognitionRef.current.lang = voiceLang;
        try {
          recognitionRef.current.start();
        } catch (err) {
          recognitionRef.current.stop();
        }
      }
    } else {
      // Toggle listening simulation for native mobile or fallback input mode
      setIsListening(!isListening);
      if (!isListening) {
        setErrorMessage(null);
      }
    }
  };

  const handleApplyPreset = (preset: string) => {
    setInputText(preset);
  };

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    onExecuteCommand(inputText.trim());
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="sparkles" size={20} color="#34D399" />
              <View>
                <Text style={styles.headerTitle}>DigiHisab Voice Assistant</Text>
                <Text style={styles.headerSubtitle}>
                  Urdu / Roman-Urdu Voice Command: Tap Mic to speak
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Language Accent Mode Switcher */}
            <View style={styles.langSwitcherRow}>
              <Text style={styles.langLabel}>زبان کا انتخاب (Speech Accent):</Text>
              <View style={styles.langBtnGroup}>
                <TouchableOpacity
                  style={[styles.langBtn, voiceLang === 'ur-PK' && styles.langBtnActive]}
                  onPress={() => setVoiceLang('ur-PK')}
                >
                  <Text style={[styles.langBtnText, voiceLang === 'ur-PK' && styles.langBtnTextActive]}>
                    اردو (Urdu PK)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.langBtn, voiceLang === 'en-PK' && styles.langBtnActive]}
                  onPress={() => setVoiceLang('en-PK')}
                >
                  <Text style={[styles.langBtnText, voiceLang === 'en-PK' && styles.langBtnTextActive]}>
                    Roman-Urdu
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Text Area Input */}
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Voice command bole'n ya likhe'n... (e.g. Amna ko 1000 ka udhar dia)"
                placeholderTextColor="#64748B"
              />
              {inputText.length > 0 && (
                <TouchableOpacity style={styles.runCommandBtn} onPress={handleSubmit}>
                  <Text style={styles.runCommandText}>چلائیں (Run)</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsSection}>
              <Text style={styles.presetsTitle}>⚡ Quick Presets (Click to test):</Text>
              <View style={styles.presetChipsRow}>
                {[
                  'Amna ko 1000 ka udhar dia',
                  'Muhammad Asad ko 1000 ka udhar dia ha',
                  'Tariq se 5000 rupees wasool hue',
                  'Sufyan wholesaler se 15000 ka maal aya',
                  'Dukan kharcha 600 chai aur lunch',
                  'Bilal counter par 1200 naqad sale',
                ].map((cmd, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.presetChip}
                    onPress={() => handleApplyPreset(cmd)}
                  >
                    <Text style={styles.presetChipText}>{cmd}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Microphone Action Area */}
            <View style={styles.micArea}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.micCircleBtn, isListening ? styles.micActiveBg : styles.micIdleBg]}
                  onPress={toggleListening}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isListening ? 'mic' : 'mic-outline'}
                    size={36}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.listeningStatusText}>
                {isListening
                  ? '🎙️ سن رہے ہیں... بولیں (Listening...)'
                  : 'Tap mic button to speak or record command'}
              </Text>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  langSwitcherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  langLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  langBtnGroup: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: '#059669',
  },
  langBtnText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inputWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  textArea: {
    backgroundColor: '#020617',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
    fontSize: 13,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  runCommandBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  runCommandText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  presetsSection: {
    marginBottom: 16,
  },
  presetsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    backgroundColor: 'rgba(6, 78, 59, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  presetChipText: {
    color: '#6EE7B7',
    fontSize: 11,
  },
  micArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  micCircleBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  micIdleBg: {
    backgroundColor: '#059669',
  },
  micActiveBg: {
    backgroundColor: '#E11D48',
  },
  listeningStatusText: {
    marginTop: 10,
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 8,
    backgroundColor: 'rgba(159, 18, 57, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  errorText: {
    color: '#FDA4AF',
    fontSize: 11,
  },
});
