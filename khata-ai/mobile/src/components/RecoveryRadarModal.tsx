import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { counterpartyApi } from '../api/counterparty.api';

interface DebtorItem {
  id: string;
  name: string;
  phone: string;
  initial: string;
  amount: number;
  overdueDays: number;
  agingCategory: '0-7d' | '8-15d' | '16-30d' | '30+d';
  risk: 'HIGH' | 'MED' | 'LOW';
}

interface RecoveryRadarModalProps {
  visible: boolean;
  onClose: () => void;
  onSendTagaza: (name: string, phone: string, amount: number, id?: string, overdueDays?: number, riskTier?: string) => void;
  onOpenAddUdhaar?: () => void;
  onOpenCustomerLedger?: () => void;
}

export const RecoveryRadarModal: React.FC<RecoveryRadarModalProps> = ({
  visible,
  onClose,
  onSendTagaza,
  onOpenAddUdhaar,
  onOpenCustomerLedger,
}) => {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<'ALL' | '0-7d' | '8-15d' | '16-30d' | '30+d'>('ALL');
  const [loading, setLoading] = useState(false);
  const [buckets, setBuckets] = useState({
    days0To7: { count: 0, totalAmount: 0 },
    days8To15: { count: 0, totalAmount: 0 },
    days16To30: { count: 0, totalAmount: 0 },
    days30Plus: { count: 0, totalAmount: 0 },
  });
  const [debtors, setDebtors] = useState<DebtorItem[]>([]);

  useEffect(() => {
    if (visible) {
      fetchRadarData();
    }
  }, [visible]);

  const fetchRadarData = async () => {
    setLoading(true);
    try {
      const res = await counterpartyApi.getDebtAgingRadar();
      if (res.success && res.data) {
        if (res.data.buckets) setBuckets(res.data.buckets);
        if (res.data.debtors) {
          const formatted: DebtorItem[] = res.data.debtors.map((d: any) => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            initial: (d.name && d.name[0]) ? d.name[0] : 'G',
            amount: d.currentBalance,
            overdueDays: d.overdueDays,
            agingCategory: d.agingCategory,
            risk: d.riskTier === 'HIGH' ? 'HIGH' : d.riskTier === 'MEDIUM' ? 'MED' : 'LOW',
          }));
          setDebtors(formatted);
        }
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  const filtered = debtors.filter((d) => activeFilter === 'ALL' || d.agingCategory === activeFilter);
  const totalOverdueAmount = debtors.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="radio" size={20} color="#E11D48" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Recovery Radar (تاخیر کا ریکارڈ)</Text>
                <Text style={styles.headerSubtitle}>Debt Aging & XGBoost AI Default Risk Radar</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Hero KPI Summary */}
          <View style={styles.kpiBox}>
            <View>
              <Text style={styles.kpiLabel}>TOTAL OVERDUE DEBT (کل تاخیر شدہ ادھار)</Text>
              <Text style={styles.kpiValue}>Rs. {totalOverdueAmount.toLocaleString('en-PK')}</Text>
            </View>
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color="#00D2B4" />
              <Text style={styles.aiBadgeText}>AI Risk Scored</Text>
            </View>
          </View>

          {/* Aging Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
              onPress={() => setActiveFilter('ALL')}
            >
              <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>
                All ({debtors.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === '0-7d' && styles.filterPillActive]}
              onPress={() => setActiveFilter('0-7d')}
            >
              <Text style={[styles.filterPillText, activeFilter === '0-7d' && styles.filterPillTextActive]}>
                🟢 0-7 Din ({buckets.days0To7?.count || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === '8-15d' && styles.filterPillActive]}
              onPress={() => setActiveFilter('8-15d')}
            >
              <Text style={[styles.filterPillText, activeFilter === '8-15d' && styles.filterPillTextActive]}>
                🟡 8-15 Din ({buckets.days8To15?.count || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === '16-30d' && styles.filterPillActive]}
              onPress={() => setActiveFilter('16-30d')}
            >
              <Text style={[styles.filterPillText, activeFilter === '16-30d' && styles.filterPillTextActive]}>
                🟠 16-30 Din ({buckets.days16To30?.count || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeFilter === '30+d' && styles.filterPillActive]}
              onPress={() => setActiveFilter('30+d')}
            >
              <Text style={[styles.filterPillText, activeFilter === '30+d' && styles.filterPillTextActive]}>
                🔴 30+ Din ({buckets.days30Plus?.count || 0})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#E11D48" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.debtorList}>
              {filtered.length === 0 ? (
                <View style={styles.emptyRecoveryCard}>
                  <View style={styles.emptyRecoveryIconCircle}>
                    <Ionicons name="shield-checkmark" size={38} color="#059669" />
                  </View>
                  <Text style={styles.emptyRecoveryTitle}>
                    تمام ادھار وصولیاں بروقت ہیں (Zero Overdue Debt)
                  </Text>
                  <Text style={styles.emptyRecoverySubtitle}>
                    ماشاءاللہ! فی الوقت کسی بھی گاہک کی ادائیگی کی تاریخ پر تاخیر نہیں ہے۔ جب بھی کسی گاہک کا وعدہ پورا ہونے میں تاخیر ہوگی، AI خودکار طور پر اس ریڈار میں لسٹ جاری کرے گا۔
                  </Text>

                  <View style={styles.emptyActionsContainer}>
                    <TouchableOpacity
                      style={styles.emptyActionPrimaryBtn}
                      onPress={() => {
                        onClose();
                        if (onOpenAddUdhaar) onOpenAddUdhaar();
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="receipt-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.emptyActionPrimaryText}>+ Naya Udhaar Darj Karein (نیا ادھار)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.emptyActionSecondaryBtn}
                      onPress={() => {
                        onClose();
                        if (onOpenCustomerLedger) onOpenCustomerLedger();
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="people-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                      <Text style={styles.emptyActionSecondaryText}>گاہکوں کا کھاتہ و بیلنس دیکھیں</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.refreshBtnRow}
                      onPress={fetchRadarData}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh-outline" size={14} color="#E11D48" style={{ marginRight: 4 }} />
                      <Text style={styles.refreshBtnText}>تازہ ریکاوری رپورٹ ریفریش کریں</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                filtered.map((d) => (
                  <View key={d.id} style={styles.debtorRowCard}>
                    <View
                      style={[
                        styles.riskStripe,
                        {
                          backgroundColor:
                            d.risk === 'HIGH' ? '#E11D48' : d.risk === 'MED' ? '#B45309' : '#006C4E',
                        },
                      ]}
                    />

                    <View style={styles.debtorContent}>
                      <View style={styles.debtorHeaderRow}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{d.initial}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.debtorName}>{d.name}</Text>
                          <Text style={styles.debtorPhone}>{d.phone}</Text>
                        </View>
                        <View
                          style={[
                            styles.riskChip,
                            {
                              backgroundColor:
                                d.risk === 'HIGH' ? '#FFE4E6' : d.risk === 'MED' ? '#FEF3C7' : '#DCFCE7',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.riskChipText,
                              {
                                color:
                                  d.risk === 'HIGH' ? '#E11D48' : d.risk === 'MED' ? '#B45309' : '#006C4E',
                              },
                            ]}
                          >
                            {d.risk === 'HIGH' ? '🔴 High Risk' : d.risk === 'MED' ? '🟡 Med Risk' : '🟢 Low Risk'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.debtorMetaRow}>
                        <View>
                          <Text style={styles.metaLabel}>Baqi Udhaar</Text>
                          <Text style={styles.metaValue}>Rs. {d.amount.toLocaleString('en-PK')}</Text>
                        </View>
                        <Text style={styles.overdueDaysText}>{d.overdueDays} Din Taakheer</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.tagazaBtn}
                        onPress={() => onSendTagaza(d.name, d.phone, d.amount, d.id, d.overdueDays, d.risk)}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                        <Text style={styles.tagazaBtnText}>WhatsApp Tagaza (تقاضا)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 34, 57, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: 480,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  kpiBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B2239',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D2B4',
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#0B2239',
    borderColor: '#0B2239',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
  },
  debtorList: {
    gap: 10,
    paddingBottom: 20,
  },
  debtorRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  riskStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  debtorContent: {
    padding: 12,
    paddingLeft: 14,
  },
  debtorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0B2239',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  debtorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  debtorPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  riskChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  debtorMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
  },
  overdueDaysText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
  },
  tagazaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 9,
    minHeight: 44,
    gap: 6,
  },
  tagazaBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyRecoveryCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyRecoveryIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  emptyRecoveryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyRecoverySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 420,
  },
  emptyActionsContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 10,
  },
  emptyActionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  emptyActionSecondaryText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  refreshBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  refreshBtnText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
});
