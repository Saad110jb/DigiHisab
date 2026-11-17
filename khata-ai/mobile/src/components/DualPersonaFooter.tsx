import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export type PersonaMode = 'HOUSEHOLD' | 'DUKANDAR' | 'VENDOR';
export type FooterTabId =
  | 'HOME'
  | 'KHARCHA'
  | 'KAMETI_BILLS'
  | 'DUKAN'
  | 'KHATA'
  | 'GALLA_AUDIT'
  | 'SETTINGS';

export interface DualPersonaFooterProps {
  /** Active persona mode: HOUSEHOLD (Ghar Ka Hisab) or DUKANDAR / VENDOR (Retail POS) */
  persona: PersonaMode;
  /** Active tab ID */
  activeTab?: FooterTabId;
  /** Callback triggered when one of the 4 outer navigation slots is tapped */
  onTabPress: (tabId: FooterTabId) => void;
  /** Callback triggered when the elevated center Voice AI mic orb is tapped */
  onVoicePress: () => void;
  /** Whether the voice engine is actively listening/recording */
  isListening?: boolean;
  /** Number of overdue customer udhaar records (Dukandar mode) */
  overdueCount?: number;
  /** Whether an urgent Kameti round or 45-day UPS check is due (Household mode) */
  hasDueAlert?: boolean;
}

interface NavSlotConfig {
  id: FooterTabId;
  labelEn: string;
  labelUr: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

export const DualPersonaFooter: React.FC<DualPersonaFooterProps> = ({
  persona,
  activeTab,
  onTabPress,
  onVoicePress,
  isListening = false,
  overdueCount = 0,
  hasDueAlert = false,
}) => {
  const insets = useSafeAreaInsets();
  const isHousehold = persona === 'HOUSEHOLD';

  // Pulsing halo animation for Voice AI active listening state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (isListening) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.35,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      animation?.stop();
    };
  }, [isListening]);

  // Safe tactile haptic feedback without native module crashes on web
  const triggerHaptic = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(10);
        } catch {
          // safe no-op
        }
      }
    } else {
      try {
        const Haptics = require('expo-haptics');
        Haptics?.impactAsync?.(Haptics?.ImpactFeedbackStyle?.Light);
      } catch {
        // safe fallback
      }
    }
  };

  const handleTabPress = (tabId: FooterTabId) => {
    triggerHaptic();
    onTabPress(tabId);
  };

  const handleVoicePress = () => {
    triggerHaptic();
    onVoicePress();
  };

  // Slot definitions by persona
  const householdSlots: NavSlotConfig[] = [
    {
      id: 'HOME',
      labelEn: 'Home',
      labelUr: 'گھر',
      icon: 'home-outline',
      iconActive: 'home',
    },
    {
      id: 'KHARCHA',
      labelEn: 'Kharcha',
      labelUr: 'روزنامچہ',
      icon: 'receipt-outline',
      iconActive: 'receipt',
    },
    {
      id: 'KAMETI_BILLS',
      labelEn: 'Kameti & Bills',
      labelUr: 'کمیٹی و بل',
      icon: 'wallet-outline',
      iconActive: 'wallet',
    },
    {
      id: 'SETTINGS',
      labelEn: 'Settings',
      labelUr: 'سیٹنگز',
      icon: 'settings-outline',
      iconActive: 'settings',
    },
  ];

  const dukandarSlots: NavSlotConfig[] = [
    {
      id: 'HOME',
      labelEn: 'Dukan',
      labelUr: 'دکان',
      icon: 'storefront-outline',
      iconActive: 'storefront',
    },
    {
      id: 'KHATA',
      labelEn: 'Khata',
      labelUr: 'ادھار کھاتہ',
      icon: 'book-outline',
      iconActive: 'book',
    },
    {
      id: 'GALLA_AUDIT',
      labelEn: 'Galla Audit',
      labelUr: 'گلہ و رپورٹ',
      icon: 'shield-checkmark-outline',
      iconActive: 'shield-checkmark',
    },
    {
      id: 'SETTINGS',
      labelEn: 'Settings',
      labelUr: 'سیٹنگز',
      icon: 'settings-outline',
      iconActive: 'settings',
    },
  ];

  const currentSlots = isHousehold ? householdSlots : dukandarSlots;
  const leftSlots = currentSlots.slice(0, 2);
  const rightSlots = currentSlots.slice(2, 4);

  // Accent colors
  const activeColor = isHousehold ? '#0ea5e9' : '#00d49f';
  const inactiveColor = '#94A3B8';
  const containerBg = isHousehold ? '#0d1627' : '#070d18';
  const borderTopColor = isHousehold ? '#17233b' : '#1e293b';

  const defaultActiveTab = activeTab || 'HOME';

  const renderNavSlot = (slot: NavSlotConfig) => {
    const isActive = defaultActiveTab === slot.id || ((slot.id === 'HOME' || slot.id === 'DUKAN') && (defaultActiveTab === 'HOME' || defaultActiveTab === 'DUKAN'));

    return (
      <TouchableOpacity
        key={slot.id}
        style={styles.navSlot}
        onPress={() => handleTabPress(slot.id)}
        activeOpacity={0.7}
      >
        {/* Top Active Indicator Pill */}
        {isActive && (
          <View style={[styles.activeIndicatorPill, { backgroundColor: activeColor }]} />
        )}

        {/* Icon & Potential Badges */}
        <View style={styles.iconWrapper}>
          <Ionicons
            name={isActive ? slot.iconActive : slot.icon}
            size={21}
            color={isActive ? activeColor : inactiveColor}
          />

          {/* Household: Amber Notification Dot for Kameti / UPS checks */}
          {slot.id === 'KAMETI_BILLS' && hasDueAlert && (
            <View style={styles.amberBadgeDot}>
              <View style={styles.amberBadgeInner} />
            </View>
          )}

          {/* Dukandar: Rose Badge Count for Overdue Udhaar */}
          {slot.id === 'KHATA' && overdueCount > 0 && (
            <View style={styles.roseBadgeCount}>
              <Text style={styles.roseBadgeText}>
                {overdueCount > 99 ? '99+' : overdueCount}
              </Text>
            </View>
          )}
        </View>

        {/* Compact Bilingual Typography (10px English, 9px Urdu) */}
        <Text
          style={[
            styles.slotLabelEn,
            { color: isActive ? activeColor : inactiveColor },
          ]}
          numberOfLines={1}
        >
          {slot.labelEn}
        </Text>
        <Text
          style={[
            styles.slotLabelUr,
            { color: isActive ? activeColor : '#64748B' },
          ]}
          numberOfLines={1}
        >
          {slot.labelUr}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.footerWrapper,
        {
          backgroundColor: containerBg,
          borderTopColor: borderTopColor,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      <View style={styles.slotsRow}>
        {/* Slots 1 & 2 (Left) */}
        {leftSlots.map((slot) => renderNavSlot(slot))}

        {/* Slot 3: Center Elevated 'بولیں' (Voice AI) Microphone Orb */}
        <View style={styles.centerOrbContainer}>
          {/* Animated Pulsing Outer Halo Ring when listening */}
          {isListening && (
            <Animated.View
              style={[
                styles.pulseHaloRing,
                {
                  transform: [{ scale: pulseAnim }],
                  borderColor: isHousehold ? '#0ea5e9' : '#00d49f',
                },
              ]}
            />
          )}

          <TouchableOpacity
            style={[
              styles.centerOrbButton,
              {
                backgroundColor: isListening
                  ? '#EF4444'
                  : isHousehold
                  ? '#0ea5e9'
                  : '#00d49f',
              },
            ]}
            onPress={handleVoicePress}
            activeOpacity={0.85}
          >
            <Ionicons
              name={isListening ? 'radio' : 'mic'}
              size={24}
              color={isListening ? '#FFF' : isHousehold ? '#FFF' : '#070d18'}
            />
          </TouchableOpacity>

          {/* Micro Label under center orb */}
          <Text
            style={[
              styles.centerOrbLabel,
              {
                color: isListening
                  ? '#EF4444'
                  : isHousehold
                  ? '#0ea5e9'
                  : '#00d49f',
              },
            ]}
            numberOfLines={1}
          >
            {isListening ? 'سن رہا ہے...' : 'بولیں 🎙️'}
          </Text>
        </View>

        {/* Slots 4 & 5 (Right) */}
        {rightSlots.map((slot) => renderNavSlot(slot))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 12,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 68,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
  navSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 4,
  },
  activeIndicatorPill: {
    position: 'absolute',
    top: 0,
    width: 22,
    height: 2.5,
    borderRadius: 1.5,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  slotLabelEn: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  slotLabelUr: {
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
    marginTop: 1,
  },
  centerOrbContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerOrbButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00d49f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  pulseHaloRing: {
    position: 'absolute',
    top: -28,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    opacity: 0.65,
    zIndex: 5,
  },
  centerOrbLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 12,
  },
  amberBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#F59E0B',
    borderWidth: 1.5,
    borderColor: '#0d1627',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amberBadgeInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  roseBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F43F5E',
    borderWidth: 1.5,
    borderColor: '#070d18',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  roseBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
  },
});

export default DualPersonaFooter;
