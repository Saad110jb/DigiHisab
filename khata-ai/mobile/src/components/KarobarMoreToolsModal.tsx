import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

export interface KarobarToolItem {
  id: string;
  title: string;
  titleUrdu: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  roleRequired?: 'MANAGER' | 'OWNER';
  badge?: string;
  badgeType?: 'red' | 'orange';
  isHelpCard?: boolean;
  onPress: () => void;
}

interface KarobarMoreToolsModalProps {
  visible: boolean;
  onClose: () => void;
  tools: KarobarToolItem[];
  pinnedToolIds: string[];
  onTogglePin: (toolId: string) => void;
  onSelectTool: (tool: KarobarToolItem) => void;
  userRole?: string;
}

export const KarobarMoreToolsModal: React.FC<KarobarMoreToolsModalProps> = ({
  visible,
  onClose,
  tools,
  pinnedToolIds,
  onTogglePin,
  onSelectTool,
  userRole = 'OWNER',
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');

  const isDesktop = screenWidth >= 1024;
  const isTablet = screenWidth >= 640 && screenWidth < 1024;

  const filteredTools = tools.filter((tool) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      tool.title.toLowerCase().includes(q) ||
      tool.titleUrdu.toLowerCase().includes(q) ||
      tool.id.toLowerCase().includes(q) ||
      (tool.badge && tool.badge.toLowerCase().includes(q))
    );
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            isDesktop && styles.modalContentDesktop,
            isTablet && styles.modalContentTablet,
          ]}
        >
          {/* Top Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="apps" size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerMainTitle}>تمام کاروباری ٹولز (All Karobar Tools)</Text>
                <Text style={styles.headerSubTitle}>
                  19 Features • Pick up to 5 tools to pin to your dashboard
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search Box & Pinned Counter Strip */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="ٹول تلاش کریں (Search services e.g. Galla, Stock, Bill...)"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.pinnedStatusStrip}>
              <Ionicons name="pin" size={13} color="#059669" />
              <Text style={styles.pinnedStatusText}>
                Pinned on Dashboard: <Text style={{ fontWeight: '800', color: '#059669' }}>{pinnedToolIds.length}/5</Text>
              </Text>
            </View>
          </View>

          {/* Tools Grid / List */}
          <ScrollView
            style={styles.toolsScrollView}
            contentContainerStyle={styles.toolsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredTools.length === 0 ? (
              <View style={styles.emptySearchBox}>
                <Ionicons name="search-outline" size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>کوئی ٹول نہیں ملا (No Tools Found)</Text>
                <Text style={styles.emptySub}>
                  "{searchQuery}" کے نام سے کوئی سروس موجود نہیں ہے۔
                </Text>
              </View>
            ) : (
              <View style={styles.toolsGrid}>
                {filteredTools.map((tool) => {
                  const isPinned = pinnedToolIds.includes(tool.id);
                  const isLockedForCashier = tool.roleRequired === 'MANAGER' && userRole === 'CASHIER';
                  const isLockedForNonOwner = tool.roleRequired === 'OWNER' && userRole !== 'OWNER';
                  const isLocked = isLockedForCashier || isLockedForNonOwner;

                  return (
                    <TouchableOpacity
                      key={tool.id}
                      style={[
                        styles.catalogCard,
                        isPinned && styles.catalogCardPinned,
                        tool.isHelpCard && styles.catalogCardHelp,
                        isDesktop || isTablet ? { width: '31.3%' } : { width: '48.2%' },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose();
                        tool.onPress();
                      }}
                    >
                      {/* Top-Right Floating Pin Pill */}
                      <TouchableOpacity
                        style={[styles.pinBadgeButton, isPinned ? styles.pinBadgeActive : styles.pinBadgeInactive]}
                        activeOpacity={0.7}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          onTogglePin(tool.id);
                        }}
                      >
                        <Text style={[styles.pinBadgeText, isPinned && styles.pinBadgeTextActive]}>
                          {isPinned ? '📌 Pinned' : '📍 Pin'}
                        </Text>
                      </TouchableOpacity>

                      {/* Top-Left Locked / Feature Badge */}
                      {isLocked ? (
                        <View style={styles.topBadgeLeftLocked}>
                          <Text style={styles.badgeLockedText}>
                            🔒 {isLockedForNonOwner ? 'Owner' : 'Mgr'}
                          </Text>
                        </View>
                      ) : tool.badge ? (
                        <View
                          style={[
                            styles.topBadgeLeft,
                            tool.badgeType === 'orange' ? styles.badgeOrange : styles.badgeRed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeCustomText,
                              tool.badgeType === 'orange' ? styles.badgeOrangeText : styles.badgeRedText,
                            ]}
                          >
                            {tool.badge}
                          </Text>
                        </View>
                      ) : null}

                      {/* Center Circular Icon Badge */}
                      <View
                        style={[
                          styles.toolIconCircle,
                          { backgroundColor: tool.iconBg },
                          tool.isHelpCard && { backgroundColor: 'rgba(87, 251, 219, 0.2)' },
                        ]}
                      >
                        <Ionicons
                          name={tool.icon}
                          size={22}
                          color={tool.isHelpCard ? '#57FBDB' : tool.iconColor}
                        />
                      </View>

                      {/* Primary English Title */}
                      <Text
                        style={[styles.toolTitle, tool.isHelpCard && { color: '#FFFFFF' }]}
                        numberOfLines={1}
                      >
                        {tool.title}
                      </Text>

                      {/* Crisp Urdu Subtitle */}
                      <Text
                        style={[styles.toolUrduTitle, tool.isHelpCard && { color: '#8FF6CA' }]}
                        numberOfLines={1}
                      >
                        {tool.titleUrdu}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer Bar */}
          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.footerTipText}>
              💡 Hint: Tap "Pin" to place your most used tools directly on the front dashboard.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>Done (مکمل)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '88%',
    maxHeight: '92%',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalContentTablet: {
    width: '85%',
    maxHeight: '82%',
    borderRadius: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  modalContentDesktop: {
    width: 680,
    maxHeight: '80%',
    borderRadius: 24,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  searchBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  pinnedStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinnedStatusText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  toolsScrollView: {
    flex: 1,
  },
  toolsScrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  catalogCard: {
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  catalogCardPinned: {
    borderWidth: 2,
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.05)',
  },
  catalogCardHelp: {
    backgroundColor: '#004D36',
    borderColor: '#006C4E',
  },
  pinBadgeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    zIndex: 10,
  },
  pinBadgeActive: {
    backgroundColor: '#00d49f',
  },
  pinBadgeInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  pinBadgeTextActive: {
    color: '#FFFFFF',
  },
  topBadgeLeft: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  topBadgeLeftLocked: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  toolIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  toolTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 14,
  },
  toolUrduTitle: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
  badgeLocked: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeLockedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#E11D48',
  },
  badgeCustom: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeCustomText: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgeOrange: {
    backgroundColor: '#FEF3C7',
  },
  badgeOrangeText: {
    color: '#B45309',
  },
  badgeRed: {
    backgroundColor: '#FFE4E6',
  },
  badgeRedText: {
    color: '#E11D48',
  },
  emptySearchBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerTipText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    marginRight: 10,
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
