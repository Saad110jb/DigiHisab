import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppVersion } from '../context/AppVersionContext';

export const ForcedUpdateModal: React.FC = () => {
  const {
    updateStatus,
    clientVersion,
    latestVersion,
    minSupportedVersion,
    updateUrl,
    changelogUrdu,
    changelogEn,
    isSoftUpdateDismissed,
    dismissSoftUpdate,
  } = useAppVersion();

  const handleOpenStore = () => {
    Linking.openURL(updateUrl).catch(() => {});
  };

  // 1. HARD FORCED UPDATE (Blocks Entire App)
  if (updateStatus === 'FORCED_UPDATE') {
    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
      >
        <View style={styles.hardOverlay}>
          <View style={styles.card}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="cloud-download" size={42} color="#EF4444" />
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredBadgeText}>DEPRECATED BUILD</Text>
              </View>
            </View>

            <Text style={styles.hardUrduTitle}>نیا ورژن لازمی ہے</Text>
            <Text style={styles.hardEnglishTitle}>CRITICAL APP UPDATE REQUIRED</Text>

            <Text style={styles.hardUrduDesc}>
              {changelogUrdu ||
                `آپ کا موجودہ ورژن (v${clientVersion}) اب سپورٹڈ نہیں ہے۔ اسٹیٹ بینک سیکیورٹی اور کلاؤڈ کھاتہ ڈیٹا کے تحفظ کے لیے نیا ورژن (v${latestVersion}) انسٹال کرنا لازمی ہے۔`}
            </Text>

            <View style={styles.versionCompareRow}>
              <View style={styles.versionChip}>
                <Text style={styles.versionChipLabel}>آپ کا ورژن</Text>
                <Text style={[styles.versionChipVal, { color: '#EF4444' }]}>v{clientVersion}</Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#64748B" />
              <View style={styles.versionChip}>
                <Text style={styles.versionChipLabel}>کم از کم مطلوب</Text>
                <Text style={[styles.versionChipVal, { color: '#10B981' }]}>v{minSupportedVersion}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.updateButton} onPress={handleOpenStore}>
              <Ionicons name="logo-google-playstore" size={20} color="#FFFFFF" />
              <Text style={styles.updateButtonText}>گوگل پلے اسٹور سے اپ ڈیٹ کریں</Text>
            </TouchableOpacity>

            <Text style={styles.hardNote}>
              نوٹ: اپ ڈیٹ کے بعد آپ کا تمام کھاتہ اور رقم محفوظ رہے گی
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // 2. SOFT UPDATE (Dismissible Floating Alert)
  if (updateStatus === 'SOFT_UPDATE' && !isSoftUpdateDismissed) {
    return (
      <View style={styles.softBanner}>
        <View style={styles.softLeft}>
          <View style={styles.softIconWrap}>
            <Ionicons name="sparkles" size={16} color="#F59E0B" />
          </View>
          <View style={styles.softTextWrap}>
            <Text style={styles.softTitle}>
              نئی اپ ڈیٹ دستیاب ہے (v{latestVersion})
            </Text>
            <Text style={styles.softDesc} numberOfLines={1}>
              تیز رفتار اور سمارٹ فیچرز کے لیے اپ گریڈ کریں۔
            </Text>
          </View>
        </View>

        <View style={styles.softActions}>
          <TouchableOpacity style={styles.softActionBtn} onPress={handleOpenStore}>
            <Text style={styles.softActionText}>اپ ڈیٹ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.softCloseBtn} onPress={dismissSoftUpdate}>
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  hardOverlay: {
    flex: 1,
    backgroundColor: '#071829',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F253E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  warningIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 16,
  },
  badgeRow: {
    marginBottom: 12,
  },
  expiredBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  expiredBadgeText: {
    color: '#F87171',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hardUrduTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  hardEnglishTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 14,
  },
  hardUrduDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
  },
  versionCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#071829',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  versionChip: {
    alignItems: 'center',
  },
  versionChipLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  versionChipVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  updateButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  hardNote: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 14,
    textAlign: 'center',
  },
  softBanner: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 8 : 45,
    left: 16,
    right: 16,
    backgroundColor: '#0F253E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  softLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  softIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  softTextWrap: {
    flex: 1,
  },
  softTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  softDesc: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  softActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  softActionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  softActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  softCloseBtn: {
    padding: 6,
  },
});
