import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { IPushNotification, NotificationPriority, NotificationCategory } from '../types/notification';
import { useNotifications } from '../context/NotificationContext';

interface PushNotificationBannerProps {
  onActionClick?: (route?: string) => void;
}

interface BannerItemProps {
  notification: IPushNotification;
  onDismiss: (id: string) => void;
  onAction?: (route?: string) => void;
}

const getCategoryIconName = (category: NotificationCategory): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'STOCK_ALERT':
      return 'cube-outline';
    case 'CREDIT_LIMIT':
      return 'shield-outline';
    case 'GALLA_DISCREPANCY':
      return 'wallet-outline';
    case 'PAYMENT_RECEIVED':
      return 'checkmark-circle-outline';
    case 'BILL_DUE':
      return 'calendar-outline';
    case 'STAFF_TANKHWA_DUE':
      return 'people-outline';
    default:
      return 'notifications-outline';
  }
};

const getPriorityTheme = (priority: NotificationPriority) => {
  switch (priority) {
    case 'CRITICAL':
      return {
        borderColor: '#E11D48',
        backgroundColor: '#1E1B2E',
        badgeBg: '#881337',
        badgeText: '#FFE4E6',
        iconColor: '#F43F5E',
        timerColor: '#E11D48',
      };
    case 'WARNING':
      return {
        borderColor: '#D97706',
        backgroundColor: '#1F1E24',
        badgeBg: '#78350F',
        badgeText: '#FEF3C7',
        iconColor: '#F59E0B',
        timerColor: '#D97706',
      };
    case 'SUCCESS':
      return {
        borderColor: '#059669',
        backgroundColor: '#1B2421',
        badgeBg: '#064E3B',
        badgeText: '#D1FAE5',
        iconColor: '#10B981',
        timerColor: '#059669',
      };
    case 'INFO':
    default:
      return {
        borderColor: '#3B82F6',
        backgroundColor: '#1B2130',
        badgeBg: '#1E3A8A',
        badgeText: '#DBEAFE',
        iconColor: '#60A5FA',
        timerColor: '#3B82F6',
      };
  }
};

const SingleBannerCard: React.FC<BannerItemProps> = ({ notification, onDismiss, onAction }) => {
  const duration = notification.durationMs || 5000;
  const theme = getPriorityTheme(notification.priority);
  const iconName = getCategoryIconName(notification.category);

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide-down + fade-in animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar animation timer
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration,
      easing: Easing.linear,
      useNativeDriver: false, // width scaling requires JS layout
    }).start();

    // Auto dismiss timer
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  const handleAction = () => {
    if (notification.actionRoute && onAction) {
      onAction(notification.actionRoute);
    }
    handleDismiss();
  };

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.backgroundColor,
          borderLeftColor: theme.borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: theme.badgeBg }]}>
            <Ionicons name={iconName} size={18} color={theme.iconColor} />
          </View>
          <View style={styles.titleColumn}>
            <Text style={styles.titleUrdu}>{notification.titleUrdu}</Text>
            <Text style={styles.titleEnglish}>{notification.titleEnglish}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <Text style={styles.messageUrdu}>{notification.messageUrdu}</Text>

      {notification.actionLabel ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionPill, { backgroundColor: theme.borderColor }]}
            onPress={handleAction}
            activeOpacity={0.8}
          >
            <Text style={styles.actionPillText}>{notification.actionLabel}</Text>
            <Ionicons name="arrow-forward-outline" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Auto-Dismiss Visual Timer Progress Bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.timerColor,
              width: progressBarWidth,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

export const PushNotificationBanner: React.FC<PushNotificationBannerProps> = ({ onActionClick }) => {
  const { notifications, dismissNotification } = useNotifications();

  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.overlayContainer}>
      <View pointerEvents="box-none" style={styles.bannerQueue}>
        {notifications.map((notif) => (
          <SingleBannerCard
            key={notif.id}
            notification={notif}
            onDismiss={dismissNotification}
            onAction={onActionClick}
          />
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
  },
  bannerQueue: {
    width: '94%',
    maxWidth: 480,
    marginTop: Platform.OS === 'ios' ? 10 : 16,
  },
  cardContainer: {
    borderRadius: 12,
    borderLeftWidth: 5,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  titleColumn: {
    flex: 1,
  },
  titleUrdu: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'left',
  },
  titleEnglish: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 1,
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageUrdu: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    textAlign: 'left',
    marginTop: 2,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
