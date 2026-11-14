import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { fontScale, responsiveTextProps } from '../../theme/responsive';

export interface ResponsiveModalWrapperProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  titleUrdu?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  sheetStyle?: StyleProp<ViewStyle>;
}

export const ResponsiveModalWrapper: React.FC<ResponsiveModalWrapperProps> = ({
  visible,
  onClose,
  title,
  titleUrdu,
  subtitle,
  headerRight,
  children,
  footer,
  maxHeightRatio = 0.94,
  contentContainerStyle,
  sheetStyle,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Backdrop tap dismisses modal */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouchArea} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.keyboardContainer, { maxHeight: `${Math.round(maxHeightRatio * 100)}%` }]}
        >
          <View style={[styles.sheet, sheetStyle]}>
            {/* Modal Header */}
            {(title || titleUrdu || headerRight) && (
              <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                  {title && (
                    <Text
                      style={styles.headerTitleEn}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      {...responsiveTextProps}
                    >
                      {title}
                    </Text>
                  )}
                  {titleUrdu && (
                    <Text
                      style={styles.headerTitleUr}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      {...responsiveTextProps}
                    >
                      {titleUrdu}
                    </Text>
                  )}
                  {subtitle && (
                    <Text
                      style={styles.headerSubtitle}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      {...responsiveTextProps}
                    >
                      {subtitle}
                    </Text>
                  )}
                </View>

                <View style={styles.headerActions}>
                  {headerRight}
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name="close" size={20} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Scrollable Form Body */}
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {/* Pinned Sticky Bottom Action Bar with Safe Area Inset */}
            {footer && (
              <View
                style={[
                  styles.footerContainer,
                  { paddingBottom: Math.max(insets.bottom, 14) },
                ]}
              >
                {footer}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    justifyContent: 'flex-end',
  },
  backdropTouchArea: {
    flex: 1,
  },
  keyboardContainer: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  headerTitleEn: {
    fontSize: fontScale(16),
    fontWeight: '800',
    color: '#0F172A',
  },
  headerTitleUr: {
    fontSize: fontScale(13),
    color: '#64748B',
    lineHeight: 19,
    marginTop: 1,
  },
  headerSubtitle: {
    fontSize: fontScale(11),
    color: '#94A3B8',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
});
