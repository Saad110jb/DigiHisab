import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/auth.store';
import { VoiceRecorderWidget } from './VoiceRecorderWidget';
import { DomesticVoiceAssistantModal } from './DomesticVoiceAssistantModal';

interface HeaderProps {
  activeMode?: 'DUKAN' | 'GHAR';
  onSwitchMode?: (mode: 'DUKAN' | 'GHAR') => void;
  onOpenProfileDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onSwitchMode,
  onOpenProfileDrawer,
}) => {
  const insets = useSafeAreaInsets();
  const { user, activePersona, logout } = useAuth();
  const [isGharVoiceModalOpen, setIsGharVoiceModalOpen] = React.useState(false);
  const topPadding = Math.max(insets.top, Platform.OS === 'web' ? 12 : 16);

  // Dynamic active mode resolution
  const isGhar = activeMode ? activeMode === 'GHAR' : activePersona === 'HOUSEHOLD';

  // Persona switching is permanently locked to prevent domestic/commercial accounting leakage
  const handleToggleMode = (_mode: 'DUKAN' | 'GHAR') => {
    // No-op: persona switching locked
  };

  // Dynamic Store / Home Title & Address
  const headerTitle = isGhar
    ? (user?.fullName ? `${user.fullName}'s Home (گھرانہ)` : "Muhammad Saad's Home (گھرانہ)")
    : (user?.businessName || (user?.fullName ? `${user.fullName}'s Store (دکان)` : "Muhammad Saad's Store (دکان)"));

  const headerSubtext = isGhar
    ? `${user?.address || 'Chak NO 110 JB'} • Gharana`
    : `${user?.address || 'Chak NO 110 JB'} • Dukandar`;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Top Profile & Persona Bar */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.profileSection}
          onPress={onOpenProfileDrawer}
          activeOpacity={0.85}
        >
          {/* Circular DigiHisab infinity-knot logo plate */}
          <View style={styles.logoPlate}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.storeMeta}>
            <View style={styles.titleRow}>
              <Text style={styles.storeName} numberOfLines={1}>
                {headerTitle}
              </Text>
              <Ionicons name="checkmark-circle" size={14} color="#00d49f" />
              <View style={styles.currencyBadge}>
                <Text style={styles.currencyText}>PKR</Text>
              </View>
            </View>
            <Text style={styles.storeSubtext} numberOfLines={1}>
              {headerSubtext}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Top Right Locked Persona Indicator & Logout */}
        <View style={styles.rightSection}>
          <View style={styles.lockedPersonaBadge}>
            <Ionicons name="lock-closed" size={11} color={isGhar ? '#38BDF8' : '#00d49f'} />
            <Text style={[styles.lockedPersonaText, isGhar && styles.lockedPersonaTextGhar]}>
              {isGhar ? '🏠 Ghar (Locked)' : '🏪 Dukan (Locked)'}
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subheader Bar with Page Indicator & Mode-Specific Voice AI Trigger */}
      <View style={styles.subHeaderBar}>
        <View style={styles.pageIndicator}>
          <Text style={styles.pageLabel}>Safha:</Text>
          <Text style={styles.pageTitle} numberOfLines={1}>
            {isGhar ? 'گھریلو حساب و بجٹ (Domestic Dashboard)' : 'دکان و کاروباری کھاتہ (Retail POS)'}
          </Text>
        </View>

        {isGhar ? (
          <>
            <TouchableOpacity
              style={styles.gharVoiceBtn}
              onPress={() => setIsGharVoiceModalOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="mic" size={14} color="#070d18" />
              <Text style={styles.gharVoiceBtnText}>گھر بول چال 🎙️</Text>
            </TouchableOpacity>

            <DomesticVoiceAssistantModal
              visible={isGharVoiceModalOpen}
              onClose={() => setIsGharVoiceModalOpen(false)}
            />
          </>
        ) : (
          <VoiceRecorderWidget />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070d18', // Deep dark slate-navy
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  logoPlate: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    flexShrink: 0,
  },
  logoImage: {
    width: 25,
    height: 25,
  },
  storeMeta: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  currencyBadge: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    flexShrink: 0,
  },
  currencyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00d49f',
  },
  storeSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  lockedPersonaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 4,
  },
  lockedPersonaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00d49f',
  },
  lockedPersonaTextGhar: {
    color: '#38BDF8',
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  subHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 22, 39, 0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  pageLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    flexShrink: 1,
  },
  gharVoiceBtn: {
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#00d49f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  gharVoiceBtnText: {
    color: '#070d18',
    fontSize: 11,
    fontWeight: '700',
  },
});
