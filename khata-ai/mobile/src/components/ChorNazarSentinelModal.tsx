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
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="shield-half-outline" size={22} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Chor Nazar (چور نظر) Sentinel</Text>
              <Text style={styles.headerSubtitle}>خفیہ ملازمین نگرانی و گلہ لیکج سینٹینل • دکان مالک کے لیے</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color="#94A3B8" />
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
              <Ionicons name="lock-closed" size={24} color="#10B981" />
            </View>
          </View>

          <Text style={styles.savingsHeroSub}>
            چور نظر الگورتھم نے کاؤنٹر چوری، بغیر بل گلہ اوپن اور بعد از وقت منسوخی کو روک کر یہ رقم محفوظ کی ہے۔
          </Text>

          <View style={styles.metricsPillsRow}>
            <View style={styles.metricPill}>
              <Ionicons name="people" size={14} color="#94A3B8" />
              <Text style={styles.metricPillText}>{dashboardData.totalCashiersMonitored} کیشیئرز</Text>
            </View>
            <View
              style={[
                styles.metricPill,
                dashboardData.criticalAlertCount > 0 && { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={14}
                color={dashboardData.criticalAlertCount > 0 ? '#EF4444' : '#10B981'}
              />
              <Text
                style={[
                  styles.metricPillText,
                  dashboardData.criticalAlertCount > 0 && { color: '#EF4444', fontWeight: '800' },
                ]}
              >
                {dashboardData.criticalAlertCount} شدید خطرہ الرٹ
              </Text>
            </View>
            <View style={styles.metricPill}>
              <Ionicons name="speedometer" size={14} color="#F59E0B" />
              <Text style={styles.metricPillText}>صحت: {dashboardData.overallTillHealthScore}%</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'RADAR' && styles.tabButtonActive]}
            onPress={() => setActiveTab('RADAR')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="analytics-outline"
              size={18}
              color={activeTab === 'RADAR' ? '#F59E0B' : '#94A3B8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'RADAR' && styles.tabTextActive]}>
              Cashier Trust Radar (کیشیئر رڈار)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'TIMELINE' && styles.tabButtonActive]}
            onPress={() => setActiveTab('TIMELINE')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={18}
              color={activeTab === 'TIMELINE' ? '#EF4444' : '#94A3B8'}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.tabText, activeTab === 'TIMELINE' && styles.tabTextAlertActive]}>
              Suspicious Events (مشکوک واقعات)
            </Text>
            {dashboardData.recentSuspiciousEvents.length > 0 && (
              <View style={styles.alertBadgeCount}>
                <Text style={styles.alertBadgeCountText}>
                  {dashboardData.recentSuspiciousEvents.length}
                </Text>
              </View>
            )}
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
            <Ionicons name="refresh" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  savingsHeroCard: {
    backgroundColor: '#1E293B',
    margin: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  savingsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsHeroLabel: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  savingsHeroValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#F8FAFC',
    marginTop: 2,
  },
  shieldBadgeLarge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsHeroSub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 8,
  },
  metricsPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metricPillText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  tabTextAlertActive: {
    color: '#EF4444',
    fontWeight: '700',
  },
  alertBadgeCount: {
    backgroundColor: '#EF4444',
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
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 12,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cashierCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cashierCardCritical: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  cashierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cashierInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  avatarLetter: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  cashierNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  cashierPhoneText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  trustScoreBadge: {
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  trustBadgeHigh: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  trustBadgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  trustBadgeCritical: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  trustScoreText: {
    fontSize: 14,
    fontWeight: '800',
  },
  trustTextHigh: {
    color: '#10B981',
  },
  trustTextWarning: {
    color: '#F59E0B',
  },
  trustTextCritical: {
    color: '#EF4444',
  },
  trustScoreSub: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 2,
    fontWeight: '600',
  },
  statChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
  },
  statChipLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statChipVal: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '700',
    marginTop: 3,
  },
  anomaliesBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  anomaliesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  anomaliesHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE68A',
  },
  anomalyItemRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  anomalyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  anomalyBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  anomalyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FDE68A',
  },
  anomalyTimeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
  },
  anomalyDescText: {
    fontSize: 11,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  surpriseAuditBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  surpriseAuditBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  revokeVoidBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  revokeVoidBtnDisabled: {
    backgroundColor: '#475569',
  },
  revokeVoidBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  timelineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  timelineBannerText: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
  },
  timelineCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineCashierInfo: {
    flex: 1,
  },
  timelineCashierName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  timelineEventType: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sevCrit: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  sevHigh: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  sevLow: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sevTextCrit: {
    color: '#EF4444',
  },
  sevTextHigh: {
    color: '#F59E0B',
  },
  sevTextLow: {
    color: '#3B82F6',
  },
  timelineTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  timelineTimeText: {
    fontSize: 11,
    color: '#64748B',
  },
  timelineDetailsUr: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 17,
  },
  amountFlagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  amountFlagText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  dossierBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 10,
  },
  dossierBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  refreshIconBtn: {
    padding: 10,
    backgroundColor: '#334155',
    borderRadius: 10,
  },
  emptyContainer: {
    paddingVertical: 50,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
});
