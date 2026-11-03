import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinancialMetrics } from '../context/FinancialMetricsContext';
import { COLORS } from '../theme/colors';

interface FinancialHeaderBannerProps {
  onOpenManageTill?: () => void;
  onOpenWasooliModal?: () => void;
  onOpenPaySupplierModal?: () => void;
  onOpenLiquidityRadar?: () => void;
}

export const FinancialHeaderBanner: React.FC<FinancialHeaderBannerProps> = ({
  onOpenManageTill,
  onOpenWasooliModal,
  onOpenPaySupplierModal,
  onOpenLiquidityRadar,
}) => {
  const { metrics, isMasked, toggleMask } = useFinancialMetrics();

  // Animated background flash value on metric update
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    metrics.totalNetPosition,
    metrics.channels.physicalCash,
    metrics.channels.digitalWallet,
    metrics.channels.bankAccount,
    metrics.maineLeneHain.totalAmount,
    metrics.maineDeneHain.totalAmount,
  ]);

  const flashBgColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(2, 132, 199, 0.04)', 'rgba(16, 185, 129, 0.22)'],
  });

  const formatAmount = (val: number) => {
    if (isMasked) return '••••••';
    return `Rs. ${val.toLocaleString()}`;
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: flashBgColor }]}>
      {/* 1. Primary Top Net Position Banner */}
      <View style={styles.topNetBanner}>
        <View style={styles.netHeaderRow}>
          <View style={styles.netLabelBadge}>
            <Ionicons name="sparkles" size={13} color="#0284C7" />
            <Text style={styles.netLabelText}>Kul Maleyat (کل مالیت)</Text>
          </View>
          <TouchableOpacity style={styles.maskToggleBtn} onPress={toggleMask} activeOpacity={0.7}>
            <Ionicons name={isMasked ? 'eye-off-outline' : 'eye-outline'} size={15} color="#475569" />
            <Text style={styles.maskToggleText}>{isMasked ? 'دکھائیں' : 'Chupayein'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.netValueText}>
          {isMasked ? '••••••••' : `PKR ${metrics.totalNetPosition.toLocaleString()}`}
        </Text>

        {/* Sub Badges: Galla Cash & Runway Days */}
        <View style={styles.subBadgesRow}>
          <TouchableOpacity style={styles.gallaBadge} onPress={onOpenManageTill} activeOpacity={0.8}>
            <Ionicons name="wallet-outline" size={13} color="#059669" />
            <Text style={styles.gallaBadgeText}>
              Galla: {formatAmount(metrics.channels.physicalCash)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.runwayBadge,
              metrics.runwayState === 'CRITICAL'
                ? styles.runwayBadgeCritical
                : metrics.runwayState === 'WARNING'
                ? styles.runwayBadgeWarning
                : styles.runwayBadgeSafe,
            ]}
            onPress={onOpenLiquidityRadar}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                metrics.runwayState === 'CRITICAL'
                  ? 'alert-circle'
                  : metrics.runwayState === 'WARNING'
                  ? 'warning-outline'
                  : 'shield-checkmark-outline'
              }
              size={13}
              color={
                metrics.runwayState === 'CRITICAL'
                  ? '#FECDD3'
                  : metrics.runwayState === 'WARNING'
                  ? '#FDE68A'
                  : '#BAE6FD'
              }
            />
            <Text
              style={[
                styles.runwayBadgeText,
                metrics.runwayState === 'CRITICAL'
                  ? styles.runwayTextCritical
                  : metrics.runwayState === 'WARNING'
                  ? styles.runwayTextWarning
                  : styles.runwayTextSafe,
              ]}
            >
              Runway: {metrics.runwayDays} Din {metrics.runwayState === 'CRITICAL' ? 'Critical' : metrics.runwayState === 'WARNING' ? 'Warning' : 'Safe'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Middle Split Receivable vs Payable Cards */}
      <View style={styles.splitCardsRow}>
        {/* Card 1: Maine Lene Hain (Receivables) */}
        <TouchableOpacity style={[styles.splitCard, styles.leneCard]} onPress={onOpenWasooliModal} activeOpacity={0.85}>
          <View style={styles.splitCardHeader}>
            <Text style={[styles.splitCardTitle, { color: '#059669' }]}>MAINE LENE HAIN</Text>
            <Ionicons name="arrow-down-circle" size={16} color="#059669" />
          </View>
          <Text style={styles.splitCardAmountUrdu}>میں نے لینے ہیں</Text>
          <Text style={[styles.splitCardAmount, { color: '#047857' }]}>
            {formatAmount(metrics.maineLeneHain.totalAmount)}
          </Text>
          <Text style={styles.splitCardSub}>
            {metrics.maineLeneHain.customerCount} Customers • وصولی کریں
          </Text>
        </TouchableOpacity>

        {/* Card 2: Maine Dene Hain (Payables) */}
        <TouchableOpacity style={[styles.splitCard, styles.deneCard]} onPress={onOpenPaySupplierModal} activeOpacity={0.85}>
          <View style={styles.splitCardHeader}>
            <Text style={[styles.splitCardTitle, { color: '#E11D48' }]}>MAINE DENE HAIN</Text>
            <Ionicons name="arrow-up-circle" size={16} color="#E11D48" />
          </View>
          <Text style={styles.splitCardAmountUrdu}>میں نے دینے ہیں</Text>
          <Text style={[styles.splitCardAmount, { color: '#BE123C' }]}>
            {formatAmount(metrics.maineDeneHain.totalAmount)}
          </Text>
          <Text style={styles.splitCardSub}>
            {metrics.maineDeneHain.supplierCount} Suppliers • ادائیگی دیں
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Bottom 3 Liquidity Reserve Cards */}
      <View style={styles.liquidityHeaderRow}>
        <Text style={styles.liquiditySectionTitle}>Naqad Wa Digital Khata (سیال فنڈز)</Text>
        <TouchableOpacity onPress={onOpenManageTill}>
          <Text style={styles.manageTillLink}>Galla Bandi ›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.liquidityCardsRow}>
        {/* Card A: Physical Cash (Galla) */}
        <TouchableOpacity style={styles.liquidityCard} onPress={onOpenManageTill} activeOpacity={0.8}>
          <View style={[styles.liquidityIconBg, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="cash" size={16} color="#059669" />
          </View>
          <Text style={styles.liquidityLabelUrdu}>دکان گلہ</Text>
          <Text style={styles.liquidityLabel}>Physical Cash</Text>
          <Text style={[styles.liquidityVal, { color: '#047857' }]}>
            {formatAmount(metrics.channels.physicalCash)}
          </Text>
        </TouchableOpacity>

        {/* Card B: Digital Wallet */}
        <View style={styles.liquidityCard}>
          <View style={[styles.liquidityIconBg, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="phone-portrait" size={16} color="#0284C7" />
          </View>
          <Text style={styles.liquidityLabelUrdu}>والیٹ / آن لائن</Text>
          <Text style={styles.liquidityLabel}>Digital Wallet</Text>
          <Text style={[styles.liquidityVal, { color: '#0369A1' }]}>
            {formatAmount(metrics.channels.digitalWallet)}
          </Text>
        </View>

        {/* Card C: Bank Account */}
        <View style={styles.liquidityCard}>
          <View style={[styles.liquidityIconBg, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="card-outline" size={16} color="#7C3AED" />
          </View>
          <Text style={styles.liquidityLabelUrdu}>بینک کھاتہ</Text>
          <Text style={styles.liquidityLabel}>Bank Account</Text>
          <Text style={[styles.liquidityVal, { color: '#6D28D9' }]}>
            {formatAmount(metrics.channels.bankAccount)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topNetBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  netHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  netLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  netLabelText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  maskToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  maskToggleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  netValueText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  subBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  gallaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gallaBadgeText: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: '700',
  },
  runwayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0C4A6E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  runwayBadgeText: {
    color: '#BAE6FD',
    fontSize: 11,
    fontWeight: '700',
  },
  runwayBadgeSafe: {
    backgroundColor: '#0C4A6E',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  runwayTextSafe: {
    color: '#BAE6FD',
  },
  runwayBadgeWarning: {
    backgroundColor: '#78350F',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  runwayTextWarning: {
    color: '#FEF3C7',
  },
  runwayBadgeCritical: {
    backgroundColor: '#881337',
    borderWidth: 1,
    borderColor: '#E11D48',
  },
  runwayTextCritical: {
    color: '#FFE4E6',
    fontWeight: '800',
  },
  splitCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  splitCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  leneCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  deneCard: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  splitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  splitCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  splitCardAmountUrdu: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  splitCardAmount: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  splitCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  liquidityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  liquiditySectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  manageTillLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  liquidityCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  liquidityCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  liquidityIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  liquidityLabelUrdu: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  liquidityLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
  },
  liquidityVal: {
    fontSize: 13,
    fontWeight: '800',
  },
});
