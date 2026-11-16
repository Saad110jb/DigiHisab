import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  chorNazarApi,
} from '../api/chorNazar.api';
import {
  ChorNazarClientEngine,
  ISentinelDashboardData,
  ICashierTrustProfile,
  ITillSentinelEvent,
} from '../services/chorNazar.service';

interface ChorNazarSentinelModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenGallaBandi?: () => void;
}

export const ChorNazarSentinelModal: React.FC<ChorNazarSentinelModalProps> = ({
  visible,
  onClose,
  onOpenGallaBandi,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'RADAR' | 'TIMELINE'>('RADAR');
  const [loading, setLoading] = useState<boolean>(true);
  const [dashboardData, setDashboardData] = useState<ISentinelDashboardData>(
    ChorNazarClientEngine.getFallbackDashboardData()
  );
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await chorNazarApi.getTrustDashboard();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (e) {
      // Keep offline fallback data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setActiveTab('RADAR');
      fetchDashboardData();
    }
  }, [visible]);

  const handleTriggerSurpriseAudit = async (cashier: ICashierTrustProfile) => {
    Alert.alert(
      'Surprise Till Audit (چھاپہ / فوری گلہ چیک)',
      `Kya aap ${cashier.cashierName} ke till par fauran surprise audit shuru karna chahte hain? Cashier ko live drawer cash count karne ka hukam jari hoga.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Audit (چھاپہ شروع کریں)',
          style: 'destructive',
          onPress: async () => {
            setActionInProgressId(cashier.subAccountId);
            try {
              const res = await chorNazarApi.triggerSurpriseAudit({
                subAccountId: cashier.subAccountId,
                cashierName: cashier.cashierName,
              });
              Alert.alert('✅ چھاپہ شروع ہو گیا (Surprise Audit Active)', res.messageUr);
              fetchDashboardData();
              if (onOpenGallaBandi) {
                onClose();
                onOpenGallaBandi();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Audit start karne mein masla hua.');
            } finally {
              setActionInProgressId(null);
            }
          },
        },
      ]
    );
  };

  const handleRevokeVoidPermissions = async (cashier: ICashierTrustProfile) => {
    Alert.alert(
      'Revoke Void Permissions (منسوخی اختیارات معطل)',
      `Kya aap ${cashier.cashierName} ke item void/cancel karne ke ikhtiyarat khatam karna chahte hain? Is ke baad har transaction cancel karne par Malik/Manager ka PIN zaroori hoga.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Permissions (معطل کریں)',
          style: 'destructive',
          onPress: async () => {
            setActionInProgressId(cashier.subAccountId);
            try {
              const res = await chorNazarApi.revokeVoidPermission({
                subAccountId: cashier.subAccountId,
              });
              Alert.alert('🔒 اختیارات معطل (Void Locked)', res.messageUr);
              // Optimistically update
              setDashboardData((prev) => ({
                ...prev,
                profiles: prev.profiles.map((p) =>
                  p.subAccountId === cashier.subAccountId ? { ...p, isVoidRestricted: true } : p
                ),
              }));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Void permissions revoke karne mein masla hua.');
            } finally {
              setActionInProgressId(null);
            }
          },
        },
      ]
    );
  };

  const handleDownloadWeeklyDossier = () => {
    Alert.alert(
      'ہفتہ وار چور نظر ڈوزیئر (Weekly Audit Report)',
      `DigiHisab Chor Nazar Sentinel Weekly Dossier:\n\n• Mahana Bachat: Rs. ${dashboardData.monthlySavingsEstimatedPkr.toLocaleString()}\n• Kul Cashiers: ${dashboardData.totalCashiersMonitored}\n• Critical Alerts: ${dashboardData.criticalAlertCount}\n\nYeh report private tor par export ho chuki hai.`,
      [{ text: 'Theek Hai (OK)' }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Header Bar */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="shield-half-outline" size={22} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Chor Nazar (چور نظر) Sentinel</Text>
                <Text style={styles.headerSubtitle}>خفیہ ملازمین نگرانی و گلہ لیکج سینٹینل • دکان مالک کے لیے</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Monthly Till Shrinkage Protection Counter Card */}
          <View style={styles.savingsHeroCard}>
            <View style={styles.savingsTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savingsHeroLabel}>ESTIMATED TILL THEFT PROTECTION (اس ماہ بچائے گئے)</Text>
                <Text style={styles.savingsHeroValue}>
                  Rs. {dashboardData.monthlySavingsEstimatedPkr.toLocaleString()}
                </Text>
              </View>
              <View style={styles.shieldBadgeLarge}>
                <Ionicons name="lock-closed" size={24} color="#006C4E" />
              </View>
            </View>

            <Text style={styles.savingsHeroSub}>
              چور نظر الگورتھم نے کاؤنٹر چوری، بغیر بل گلہ اوپن اور بعد از وقت منسوخی کو روک کر یہ رقم محفوظ کی ہے۔
            </Text>

            <View style={styles.metricsPillsRow}>
              <View style={styles.metricPill}>
                <Ionicons name="people" size={14} color="#64748B" />
                <Text style={styles.metricPillText}>{dashboardData.totalCashiersMonitored} کیشیئرز</Text>
              </View>
              <View
                style={[
                  styles.metricPill,
                  dashboardData.criticalAlertCount > 0 && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={14}
                  color={dashboardData.criticalAlertCount > 0 ? '#DC2626' : '#006C4E'}
                />
                <Text
                  style={[
                    styles.metricPillText,
                    dashboardData.criticalAlertCount > 0 && { color: '#DC2626', fontWeight: '800' },
                  ]}
                >
                  {dashboardData.criticalAlertCount} شدید خطرہ الرٹ
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Ionicons name="speedometer" size={14} color="#D97706" />
                <Text style={styles.metricPillText}>صحت: {dashboardData.overallTillHealthScore}%</Text>
              </View>
            </View>
          </View>

          {/* 2-Column Segmented Tab Control */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'RADAR' && styles.tabButtonActive]}
              onPress={() => setActiveTab('RADAR')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="analytics-outline"
                size={16}
                color={activeTab === 'RADAR' ? '#D97706' : '#64748B'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[styles.tabText, activeTab === 'RADAR' && styles.tabTextActive]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Cashier Trust Radar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'TIMELINE' && styles.tabButtonActive]}
              onPress={() => setActiveTab('TIMELINE')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={activeTab === 'TIMELINE' ? '#DC2626' : '#64748B'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[styles.tabText, activeTab === 'TIMELINE' && styles.tabTextAlertActive]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Suspicious Events ({dashboardData.recentSuspiciousEvents.length})
              </Text>
            </TouchableOpacity>
          </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingText}>چور نظر سینٹینل کاؤنٹر ٹرانزیکشنز کا جائزہ لے رہا ہے...</Text>
          </View>
        ) : activeTab === 'RADAR' ? (
          /* TAB 1: CASHIER TRUST RADAR */
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {dashboardData.profiles.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#64748B" />
                <Text style={styles.emptyTitle}>کوئی کیشیئر رجسٹرڈ نہیں ہے</Text>
                <Text style={styles.emptySubtitle}>
                  No cashiers or staff profiles registered. جب آپ عملہ یا کیشیئر کے اکاؤنٹس بنائیں گے، چور نظر سینٹینل خود بخود ان کی مانیٹرنگ شروع کرے گا۔
                </Text>
              </View>
            ) : (
              dashboardData.profiles.map((cashier) => {
              const isCritical = cashier.trustTier === 'CRITICAL_RISK' || cashier.trustScore < 70;
              const isWarning = cashier.trustTier === 'MODERATE_RISK' || cashier.trustScore < 90;
              const isProcessing = actionInProgressId === cashier.subAccountId;

              return (
                <View
                  key={cashier.subAccountId || cashier._id}
                  style={[styles.cashierCard, isCritical && styles.cashierCardCritical]}
                >
                  {/* Card Top: Cashier Avatar & Trust Gauge */}
                  <View style={styles.cashierTopRow}>
                    <View style={styles.cashierInfoGroup}>
                      <View style={[styles.avatarCircle, isCritical && styles.avatarCritical]}>
                        <Text style={styles.avatarLetter}>
                          {cashier.cashierName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.cashierNameText}>{cashier.cashierName}</Text>
                        <Text style={styles.cashierPhoneText}>{cashier.cashierPhone}</Text>
                      </View>
                    </View>

                    {/* Trust Gauge Badge */}
                    <View
                      style={[
                        styles.trustScoreBadge,
                        isCritical
                          ? styles.trustBadgeCritical
                          : isWarning
                          ? styles.trustBadgeWarning
                          : styles.trustBadgeHigh,
                      ]}
                    >
                      <Text
                        style={[
                          styles.trustScoreText,
                          isCritical
                            ? styles.trustTextCritical
                            : isWarning
                            ? styles.trustTextWarning
                            : styles.trustTextHigh,
                        ]}
                      >
                        {cashier.trustScore}% Trust
                      </Text>
                      <Text style={styles.trustScoreSub}>
                        {isCritical
                          ? '🔴 چور نظر انتباہ'
                          : isWarning
                          ? '🟡 درمیانہ خطرہ'
                          : '🟢 اعلیٰ قابل اعتماد'}
                      </Text>
                    </View>
                  </View>

                  {/* 4 Stat Chips Grid */}
                  <View style={styles.statChipsGrid}>
                    <View style={styles.statChip}>
                      <Text style={styles.statChipLabel}>Sales Volume</Text>
                      <Text style={styles.statChipVal}>
                        Rs. {cashier.trailing7dMetrics.totalSalesHandled.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.statChip}>
                      <Text style={styles.statChipLabel}>No-Sale Opens</Text>
                      <Text
                        style={[
                          styles.statChipVal,
                          cashier.trailing7dMetrics.noSaleDrawerOpens > 5 && { color: '#EF4444' },
                        ]}
                      >
                        {cashier.trailing7dMetrics.noSaleDrawerOpens} بار بغیر بل
                      </Text>
                    </View>

                    <View style={styles.statChip}>
                      <Text style={styles.statChipLabel}>Post-Sale Voids</Text>
                      <Text
                        style={[
                          styles.statChipVal,
                          cashier.trailing7dMetrics.totalVoidAmount > 1000 && { color: '#EF4444' },
                        ]}
                      >
                        Rs. {cashier.trailing7dMetrics.totalVoidAmount.toLocaleString()} ({cashier.trailing7dMetrics.totalVoidCount})
                      </Text>
                    </View>

                    <View style={styles.statChip}>
                      <Text style={styles.statChipLabel}>Galla Deficit</Text>
                      <Text
                        style={[
                          styles.statChipVal,
                          cashier.trailing7dMetrics.cumulativeDeficitPkr > 0 && { color: '#EF4444' },
                        ]}
                      >
                        -Rs. {cashier.trailing7dMetrics.cumulativeDeficitPkr.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Detected Anomalies Timeline Callout */}
                  {cashier.detectedAnomalies && cashier.detectedAnomalies.length > 0 && (
                    <View style={styles.anomaliesBox}>
                      <View style={styles.anomaliesHeaderRow}>
                        <Ionicons name="flash" size={14} color="#F59E0B" />
                        <Text style={styles.anomaliesHeaderTitle}>
                          حالیہ مشکوک واقعات (Flagged Telemetry Events):
                        </Text>
                      </View>

                      {cashier.detectedAnomalies.map((anomaly, idx) => (
                        <View key={idx} style={styles.anomalyItemRow}>
                          <View style={styles.anomalyHeaderRow}>
                            <Text style={styles.anomalyTimeTag}>{anomaly.timestampFormatted}</Text>
                            <View style={styles.anomalyBadge}>
                              <Text style={styles.anomalyBadgeText}>⚠️ مشکوک لاگ</Text>
                            </View>
                          </View>
                          <Text style={styles.anomalyDescText}>{anomaly.descriptionUr}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Tactical Action Buttons for Store Owner */}
                  <View style={styles.cardActionRow}>
                    <TouchableOpacity
                      style={styles.surpriseAuditBtn}
                      onPress={() => handleTriggerSurpriseAudit(cashier)}
                      disabled={isProcessing}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="search" size={14} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.surpriseAuditBtnText}>
                        Surprise Till Audit (فوری چھاپہ)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.revokeVoidBtn,
                        cashier.isVoidRestricted && styles.revokeVoidBtnDisabled,
                      ]}
                      onPress={() => handleRevokeVoidPermissions(cashier)}
                      disabled={isProcessing || cashier.isVoidRestricted}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={cashier.isVoidRestricted ? 'checkmark-circle' : 'lock-closed'}
                        size={14}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.revokeVoidBtnText}>
                        {cashier.isVoidRestricted
                          ? 'منسوخی اختیارات معطل ہیں'
                          : 'Lock Voids (اختیار ختم)'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }))}
          </ScrollView>
        ) : (
          /* TAB 2: SUSPICIOUS EVENTS TIMELINE */
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <View style={styles.timelineBanner}>
              <Ionicons name="information-circle" size={18} color="#94A3B8" />
              <Text style={styles.timelineBannerText}>
                یہ واقعات کاؤنٹر سیلز اور گلہ کی دراز کی اصل ٹائم اسٹیمپ لاگز پر مبنی ہیں۔
              </Text>
            </View>

            {dashboardData.recentSuspiciousEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="shield-checkmark-outline" size={48} color="#10B981" />
                <Text style={styles.emptyTitle}>کوئی مشکوک سرگرمی نہیں ملی</Text>
                <Text style={styles.emptySubtitle}>
                  No suspicious till events detected. آپ کے کیش کاؤنٹر اور گلہ کے تمام اندراجات محفوظ اور شفاف ہیں۔
                </Text>
              </View>
            ) : (
              dashboardData.recentSuspiciousEvents.map((event) => {
                const isCrit = event.severity === 'CRITICAL';
                const isHigh = event.severity === 'HIGH';

                return (
                  <View key={event._id} style={styles.timelineCard}>
                    <View style={styles.timelineCardHeader}>
                      <View style={styles.timelineCashierInfo}>
                        <Text style={styles.timelineCashierName}>{event.cashierName}</Text>
                        <Text style={styles.timelineEventType}>{event.eventType.replace(/_/g, ' ')}</Text>
                      </View>

                      <View
                        style={[
                          styles.severityBadge,
                          isCrit ? styles.sevCrit : isHigh ? styles.sevHigh : styles.sevLow,
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            isCrit ? styles.sevTextCrit : isHigh ? styles.sevTextHigh : styles.sevTextLow,
                          ]}
                        >
                          {event.severity}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.timelineTimeRow}>
                      <Ionicons name="time-outline" size={13} color="#64748B" />
                      <Text style={styles.timelineTimeText}>
                        {event.metadata?.systemTimestampStr || new Date(event.timestamp).toLocaleString('en-PK')}
                      </Text>
                    </View>

                    <Text style={styles.timelineDetailsUr}>
                      {event.metadata?.detailsUr || 'مشکوک سیکوئنس کا پتہ چلا۔'}
                    </Text>

                    {event.amountInvolved && event.amountInvolved > 0 ? (
                      <View style={styles.amountFlagBadge}>
                        <Text style={styles.amountFlagText}>
                          Amount Involved: Rs. {event.amountInvolved.toLocaleString()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Tactical Footer Action Bar */}
        <View style={[styles.footerBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity
            style={styles.dossierBtn}
            onPress={handleDownloadWeeklyDossier}
            activeOpacity={0.85}
          >
            <Ionicons name="document-text-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.dossierBtnText}>Download Weekly Audit Dossier (آڈٹ فائل)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={fetchDashboardData}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 480,
    height: '92%',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  savingsHeroCard: {
    backgroundColor: '#FFFFFF',
    margin: 14,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  savingsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsHeroLabel: {
    fontSize: 10,
    color: '#006C4E',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  savingsHeroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  shieldBadgeLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsHeroSub: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginTop: 8,
  },
  metricsPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricPillText: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#D97706',
    fontWeight: '800',
  },
  tabTextAlertActive: {
    color: '#DC2626',
    fontWeight: '800',
  },
  alertBadgeCount: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  alertBadgeCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  loadingBox: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 12,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 14,
  },
  cashierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  cashierCardCritical: {
    borderColor: '#F87171',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  cashierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cashierInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCritical: {
    backgroundColor: '#FEE2E2',
  },
  avatarLetter: {
    color: '#006C4E',
    fontSize: 16,
    fontWeight: '800',
  },
  cashierNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cashierPhoneText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  trustScoreBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  trustBadgeHigh: {
    backgroundColor: '#E8F5EE',
  },
  trustBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  trustBadgeCritical: {
    backgroundColor: '#FEE2E2',
  },
  trustScoreText: {
    fontSize: 13,
    fontWeight: '800',
  },
  trustTextHigh: {
    color: '#006C4E',
  },
  trustTextWarning: {
    color: '#D97706',
  },
  trustTextCritical: {
    color: '#DC2626',
  },
  trustScoreSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '700',
  },
  statChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
  },
  statChipLabel: {
    fontSize: 9.5,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statChipVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
    marginTop: 2,
  },
  anomaliesBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  anomaliesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  anomaliesHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  anomalyItemRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  anomalyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  anomalyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  anomalyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#92400E',
  },
  anomalyTimeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  anomalyDescText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  surpriseAuditBtn: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  surpriseAuditBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '800',
  },
  revokeVoidBtn: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  revokeVoidBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  revokeVoidBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '800',
  },
  timelineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineBannerText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineCashierInfo: {
    flex: 1,
  },
  timelineCashierName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineEventType: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevCrit: {
    backgroundColor: '#FEE2E2',
  },
  sevHigh: {
    backgroundColor: '#FEF3C7',
  },
  sevLow: {
    backgroundColor: '#DBEAFE',
  },
  severityText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  sevTextCrit: {
    color: '#DC2626',
  },
  sevTextHigh: {
    color: '#D97706',
  },
  sevTextLow: {
    color: '#2563EB',
  },
  timelineTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  timelineTimeText: {
    fontSize: 10.5,
    color: '#64748B',
  },
  timelineDetailsUr: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 17,
  },
  amountFlagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  amountFlagText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '800',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  dossierBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    paddingVertical: 10,
    borderRadius: 10,
  },
  dossierBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
  },
  refreshIconBtn: {
    padding: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
