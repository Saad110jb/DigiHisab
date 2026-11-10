import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppVersion } from '../context/AppVersionContext';

export const EmergencyMaintenanceScreen: React.FC = () => {
  const { maintenance, refreshHandshake, isChecking, setBypassMaintenance } = useAppVersion();
  const [remainingTime, setRemainingTime] = useState<{ minutes: number; seconds: number }>({
    minutes: 35,
    seconds: 0,
  });
  const [showPinInput, setShowPinInput] = useState<boolean>(false);
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Calculate live countdown timer based on estimatedEndTime
  useEffect(() => {
    const updateCountdown = () => {
      if (maintenance.estimatedEndTime) {
        const diff = new Date(maintenance.estimatedEndTime).getTime() - Date.now();
        if (diff > 0) {
          const m = Math.floor(diff / 60000);
          const s = Math.floor((diff % 60000) / 1000);
          setRemainingTime({ minutes: m, seconds: s });
          return;
        }
      }
      // Default fallback duration
      setRemainingTime({ minutes: 0, seconds: 0 });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [maintenance.estimatedEndTime]);

  const handleAdminBypass = () => {
    // Authorized Malik/Admin PIN bypass: 1234 or 2026
    if (pin === '1234' || pin === '2026') {
      setBypassMaintenance(true);
      setShowPinInput(false);
      setPinError('');
    } else {
      setPinError('غلط پن کوڈ درج کیا گیا ہے (Incorrect PIN)');
    }
  };

  const handleContactSupport = () => {
    const whatsappUrl = 'https://wa.me/923001234567?text=' + encodeURIComponent('Digi Hisab Emergency Maintenance Inquiry');
    Linking.openURL(whatsappUrl).catch(() => {});
  };

  return (
    <View style={styles.container}>
      {/* Top Background Ambient Glow */}
      <View style={styles.glowSpot} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SBP Regulatory & Trust Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.shieldPill}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.badgeText}>SBP 100% SECURE & AUDITED</Text>
          </View>
        </View>

        {/* Central Pulsing Radar Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.pulsingHalo} />
          <View style={styles.iconCircle}>
            <Ionicons name="construct" size={44} color="#F59E0B" />
          </View>
        </View>

        {/* Urdu Main Headline */}
        <Text style={styles.urduTitle}>
          سسٹم اپ گریڈ جاری ہے
        </Text>

        {/* English Sub-Headline */}
        <Text style={styles.englishTitle}>
          Digi Hisab Scheduled System Maintenance
        </Text>

        {/* Reassuring Urdu Message Card */}
        <View style={styles.messageCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={18} color="#10B981" />
            <Text style={styles.cardHeaderUrdu}>آپ کا کھاتہ 100% محفوظ ہے</Text>
          </View>
          <Text style={styles.urduMessageText}>
            {maintenance.urduMessage ||
              'برائے مہربانی کچھ دیر بعد دوبارہ کوشش کریں۔ آپ کا کھاتہ، بیلنس اور کسٹمر ریکارڈ کلاؤڈ پر مکمل طور پر محفوظ ہے۔'}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.englishMessageText}>
            {maintenance.englishMessage ||
              'Our database clusters are undergoing scheduled optimization. Counter billing will automatically resume shortly.'}
          </Text>
        </View>

        {/* Live Countdown Clock */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>تخمینہ شدہ واپسی کا وقت (ESTIMATED RESUME)</Text>
          <View style={styles.timerRow}>
            <View style={styles.timerBox}>
              <Text style={styles.timerValue}>
                {String(remainingTime.minutes).padStart(2, '0')}
              </Text>
              <Text style={styles.timerUnit}>MINUTES</Text>
            </View>
            <Text style={styles.timerColon}>:</Text>
            <View style={styles.timerBox}>
              <Text style={styles.timerValue}>
                {String(remainingTime.seconds).padStart(2, '0')}
              </Text>
              <Text style={styles.timerUnit}>SECONDS</Text>
            </View>
          </View>
        </View>

        {/* Primary Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshHandshake}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator color="#0B2239" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#0B2239" />
                <Text style={styles.refreshButtonText}>دوبارہ چیک کریں (Check Status)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleContactSupport}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
            <Text style={styles.supportButtonText}>ہیلپ لائن پر رابطہ کریں (WhatsApp)</Text>
          </TouchableOpacity>
        </View>

        {/* Admin Emergency PIN Bypass Section */}
        <View style={styles.bypassSection}>
          {!showPinInput ? (
            <TouchableOpacity
              onPress={() => setShowPinInput(true)}
              style={styles.bypassToggle}
            >
              <Ionicons name="key-outline" size={14} color="#64748B" />
              <Text style={styles.bypassToggleText}>
                دکاندار / سپروائزر بائی پاس (Supervisor Bypass)
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.pinBox}>
              <Text style={styles.pinLabel}>ایمرجنسی رسائی کے لیے 4 ہندسوں کا پن درج کریں:</Text>
              <View style={styles.pinInputRow}>
                <TextInput
                  style={styles.pinInput}
                  value={pin}
                  onChangeText={(val) => {
                    setPin(val);
                    setPinError('');
                  }}
                  placeholder="PIN: 1234"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                />
                <TouchableOpacity
                  style={styles.pinSubmitBtn}
                  onPress={handleAdminBypass}
                >
                  <Text style={styles.pinSubmitText}>تصدیق</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pinCancelBtn}
                  onPress={() => {
                    setShowPinInput(false);
                    setPin('');
                    setPinError('');
                  }}
                >
                  <Ionicons name="close" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}
            </View>
          )}
        </View>

        {/* Footer Audit Notice */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Digi Hisab Engine • Build v2.4.1 • Server Sentinel SBP-2026
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#071829', // Deep Digi Hisab Navy
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 999999,
  },
  glowSpot: {
    position: 'absolute',
    top: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  scrollContent: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  badgeRow: {
    marginBottom: 20,
  },
  shieldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  badgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  pulsingHalo: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0F2B48',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  urduTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.3,
  },
  englishTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  messageCard: {
    width: '100%',
    backgroundColor: '#0F253E',
    borderRadius: 18,
    padding: 18,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.8)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardHeaderUrdu: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  urduMessageText: {
    color: '#E2E8F0',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    marginVertical: 12,
  },
  englishMessageText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'left',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  timerLabel: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBox: {
    backgroundColor: '#0F253E',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 70,
  },
  timerValue: {
    color: '#FBBF24',
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerUnit: {
    color: '#94A3B8',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  timerColon: {
    color: '#FBBF24',
    fontSize: 22,
    fontWeight: '800',
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
    marginTop: 16,
  },
  refreshButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  refreshButtonText: {
    color: '#071829',
    fontSize: 14,
    fontWeight: '800',
  },
  supportButton: {
    backgroundColor: '#0B2239',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 8,
  },
  supportButtonText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  bypassSection: {
    marginTop: 22,
    width: '100%',
    alignItems: 'center',
  },
  bypassToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  bypassToggleText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  pinBox: {
    width: '100%',
    backgroundColor: '#0F253E',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.4)',
  },
  pinLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinInput: {
    flex: 1,
    backgroundColor: '#071829',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  pinSubmitBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pinSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  pinCancelBtn: {
    padding: 8,
  },
  pinErrorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '500',
  },
});
