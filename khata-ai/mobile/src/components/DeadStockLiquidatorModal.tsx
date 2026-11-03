import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  deadStockLiquidatorApi,
  IDeadStockSummary,
  ITurnoverHazardItem,
  IHighMarginBundle,
  HazardLevel,
} from '../api/deadStockLiquidator.api';

interface DeadStockLiquidatorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectBundleForSale?: (bundle: IHighMarginBundle) => void;
}

export const DeadStockLiquidatorModal: React.FC<DeadStockLiquidatorModalProps> = ({
  visible,
  onClose,
  onSelectBundleForSale,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'BUNDLES' | 'HAZARDS'>('BUNDLES');
  const [hazardFilter, setHazardFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'DORMANT'>('ALL');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<IDeadStockSummary | null>(null);
  const [applyingMarkdownId, setApplyingMarkdownId] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await deadStockLiquidatorApi.getSummary();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (e) {
      console.error('Error fetching Dead Stock summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchSummary();
    }
  }, [visible]);

  const handleApplyMarkdown = async (itemId: string, discount: number) => {
    setApplyingMarkdownId(itemId);
    try {
      const res = await deadStockLiquidatorApi.applyMarkdown(itemId, discount);
      if (res.success) {
        Alert.alert('کامیابی', `اس آئٹم پر ${discount}% رعایت لاگو کر دی گئی ہے۔`);
        // Refresh local items
        setSummary((prev) => {
          if (!prev) return prev;
          const updated = prev.turnoverHazards.map((h) => {
            if (h.id === itemId) {
              const markdownPrice = discount > 0 ? Math.round(h.retailPrice * (1 - discount / 100)) : undefined;
              return { ...h, markdownDiscountPercent: discount, markdownPrice };
            }
            return h;
          });
          return { ...prev, turnoverHazards: updated };
        });
      } else {
        Alert.alert('خرابی', res.message || 'رعایت لاگو نہیں ہو سکی۔');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error applying markdown.');
    } finally {
      setApplyingMarkdownId(null);
    }
  };

  const handleWhatsAppBroadcast = (bundle: IHighMarginBundle) => {
    const text = `${bundle.marketingCopyUr}\n\n${bundle.marketingCopyEn}\n\n📍 ہماری دکان سے فوری حاصل کریں!`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp Not Available', text);
        }
      })
      .catch(() => {
        Alert.alert('Notice', 'Could not open WhatsApp.');
      });
  };

  const turnoverHazards = summary?.turnoverHazards || [];
  const smartBundles = summary?.smartBundles || [];

  const filteredHazards = turnoverHazards.filter((h) => {
    if (hazardFilter === 'ALL') return true;
    return h.hazardLevel === hazardFilter;
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(20, insets.bottom) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="flame" size={22} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Dead-Stock Liquidator & Expiry Engine</Text>
                <Text style={styles.headerSubtitle}>
                  اسٹاک لیکویڈیٹر و ایکسپائری مارک ڈاؤن • کیپیٹل ریکوری
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>بند سرمایہ (Locked Capital)</Text>
              <Text style={[styles.metricValue, { color: '#DC2626' }]}>
                Rs. {(summary?.totalLockedDeadCapital || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>بغیر حرکت کیپیٹل</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>ایکسپائری خطرہ (Hazards)</Text>
              <Text style={[styles.metricValue, { color: '#D97706' }]}>
                {(summary?.criticalHazardCount || 0) + (summary?.warningHazardCount || 0)}
              </Text>
              <Text style={styles.metricSub}>نزدیک ایکسپائری</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>بچت بنڈلز (AI Bundles)</Text>
              <Text style={[styles.metricValue, { color: '#059669' }]}>
                {smartBundles.length}
              </Text>
              <Text style={styles.metricSub}>تیار آفرز</Text>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'BUNDLES' && styles.tabBtnActive]}
              onPress={() => setActiveTab('BUNDLES')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="gift-outline"
                size={16}
                color={activeTab === 'BUNDLES' ? '#059669' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'BUNDLES' && styles.tabTextActiveBundles]}>
                پروموشنل بنڈلز ({smartBundles.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'HAZARDS' && styles.tabBtnActive]}
              onPress={() => setActiveTab('HAZARDS')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={activeTab === 'HAZARDS' ? '#DC2626' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'HAZARDS' && styles.tabTextActiveHazards]}>
                ایکسپائری و سست رفتار اشیاء ({turnoverHazards.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#DC2626" />
              <Text style={styles.loadingText}>اسٹاک ٹرن اوور اور ایکسپائری شیڈول کا تجزیہ جاری ہے...</Text>
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {activeTab === 'BUNDLES' && (
                <View>
                  {smartBundles.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Ionicons name="checkmark-done-circle" size={44} color="#059669" />
                      <Text style={styles.emptyStateTitle}>کوئی زائد المعیاد خطرہ نہیں</Text>
                      <Text style={styles.emptyStateDesc}>
                        آپ کا تمام اسٹاک صحت مند رفتار سے فروخت ہو رہا ہے۔ جیسے ہی کوئی آئٹم ایکسپائری کے قریب پہنچے گی یا سست رفتار ہوگی، AI فوری طور پر ہائی مارجن بنڈل تجویز کرے گا۔
                      </Text>
                    </View>
                  ) : (
                    smartBundles.map((bundle) => (
                      <View key={bundle.id} style={styles.bundleCard}>
                        {/* Bundle Header */}
                        <View style={styles.bundleHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.bundleTitleUrdu}>{bundle.titleUrdu}</Text>
                            <Text style={styles.bundleTitleEn}>{bundle.titleEn}</Text>
                          </View>
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>
                              {bundle.bundleDiscountPercent}% رعایت
                            </Text>
                          </View>
                        </View>

                        {/* Items Combined Row */}
                        <View style={styles.bundleItemsBox}>
                          <View style={styles.bundleItemRow}>
                            <View style={styles.itemTagHazard}>
                              <Text style={styles.itemTagHazardText}>سست رفتار / خطرہ</Text>
                            </View>
                            <Text style={styles.bundleItemName}>
                              {bundle.anchorItem.itemName} ({bundle.anchorItem.daysRemainingToExpiry ? `${bundle.anchorItem.daysRemainingToExpiry} دن باقی` : 'سست رفتار'})
                            </Text>
                            <Text style={styles.bundleItemPrice}>Rs. {bundle.anchorItem.retailPrice}</Text>
                          </View>

                          <View style={styles.plusDivider}>
                            <Ionicons name="add" size={16} color="#0284C7" />
                          </View>

                          <View style={styles.bundleItemRow}>
                            <View style={styles.itemTagDriver}>
                              <Text style={styles.itemTagDriverText}>تیز رفتار روزمرہ</Text>
                            </View>
                            <Text style={styles.bundleItemName}>
                              {bundle.driverItem.itemName}
                            </Text>
                            <Text style={styles.bundleItemPrice}>Rs. {bundle.driverItem.retailPrice}</Text>
                          </View>
                        </View>

                        {/* Pricing and Margin Guardrail */}
                        <View style={styles.pricingRow}>
                          <View>
                            <Text style={styles.pricingLabel}>اصل قیمت (Original):</Text>
                            <Text style={styles.originalPriceText}>Rs. {bundle.originalCombinedRetail.toLocaleString()}</Text>
                          </View>

                          <View>
                            <Text style={styles.pricingLabel}>بنڈل پروموشنل ریٹ:</Text>
                            <Text style={styles.bundleFinalPriceText}>Rs. {bundle.bundleRetailPrice.toLocaleString()}</Text>
                          </View>

                          <View style={styles.marginGuardrailBox}>
                            <Text style={styles.marginGuardrailLabel}>محفوظ صاف منافع</Text>
                            <Text style={styles.marginGuardrailVal}>+{bundle.netGrossMarginPercent}%</Text>
                            <Text style={styles.marginProfitPKR}>(+Rs. {bundle.bundleProfitPKR})</Text>
                          </View>
                        </View>

                        {/* Marketing Copy Preview */}
                        <View style={styles.copyBox}>
                          <Text style={styles.copyText}>{bundle.marketingCopyUr}</Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.bundleActionsRow}>
                          <TouchableOpacity
                            style={styles.broadcastWhatsAppBtn}
                            onPress={() => handleWhatsAppBroadcast(bundle)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                            <Text style={styles.broadcastWhatsAppText}>گاہکوں کو WhatsApp بھیجیں</Text>
                          </TouchableOpacity>

                          {onSelectBundleForSale && (
                            <TouchableOpacity
                              style={styles.addToPosBtn}
                              onPress={() => {
                                onClose();
                                onSelectBundleForSale(bundle);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="cart" size={15} color="#059669" />
                              <Text style={styles.addToPosText}>کاؤنٹر سیل میں شامل کریں</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'HAZARDS' && (
                <View>
                  {/* Filter Pills */}
                  <View style={styles.filterPillsRow}>
                    {(['ALL', 'CRITICAL', 'WARNING', 'DORMANT'] as const).map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        style={[styles.filterPill, hazardFilter === lvl && styles.filterPillActive]}
                        onPress={() => setHazardFilter(lvl)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.filterPillText, hazardFilter === lvl && styles.filterPillTextActive]}>
                          {lvl === 'ALL'
                            ? `سب (${turnoverHazards.length})`
                            : lvl === 'CRITICAL'
                            ? `🔴 ہنگامی (${summary?.criticalHazardCount || 0})`
                            : lvl === 'WARNING'
                            ? `🟡 انتباہ (${summary?.warningHazardCount || 0})`
                            : `🟠 سست رفتار (${summary?.dormantItemsCount || 0})`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {filteredHazards.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Ionicons name="checkmark-circle-outline" size={40} color="#059669" />
                      <Text style={styles.emptyStateTitle}>اس فلٹر میں کوئی آئٹم نہیں</Text>
                    </View>
                  ) : (
                    filteredHazards.map((item) => {
                      const isApplying = applyingMarkdownId === item.id;
                      const hasMarkdown = item.markdownDiscountPercent > 0;

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.hazardItemCard,
                            item.hazardLevel === 'CRITICAL' && styles.hazardCardCritical,
                            item.hazardLevel === 'WARNING' && styles.hazardCardWarning,
                          ]}
                        >
                          <View style={styles.hazardHeader}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.hazardItemTitle}>{item.itemName}</Text>
                              <Text style={styles.hazardItemCategory}>
                                📦 {item.category} • موجود اسٹاک: {item.stockOnHand} • بند لاگت: Rs. {item.lockedCapital.toLocaleString()}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.hazardBadge,
                                item.hazardLevel === 'CRITICAL'
                                  ? styles.hazardBadgeCritical
                                  : item.hazardLevel === 'WARNING'
                                  ? styles.hazardBadgeWarning
                                  : styles.hazardBadgeDormant,
                              ]}
                            >
                              <Text style={styles.hazardBadgeText}>
                                {item.hazardLevel === 'CRITICAL'
                                  ? '🔴 CRITICAL'
                                  : item.hazardLevel === 'WARNING'
                                  ? '🟡 WARNING'
                                  : item.hazardLevel === 'DORMANT'
                                  ? '🟠 DORMANT'
                                  : '🟢 SAFE'}
                              </Text>
                            </View>
                          </View>

                          {/* Velocity & Expiry Timeline Metrics */}
                          <View style={styles.metricsTimelineRow}>
                            <View style={styles.timelineBox}>
                              <Text style={styles.timelineLabel}>باقی دن (DRE)</Text>
                              <Text
                                style={[
                                  styles.timelineVal,
                                  item.daysRemainingToExpiry && item.daysRemainingToExpiry <= 21
                                    ? { color: '#DC2626' }
                                    : { color: '#0F172A' },
                                ]}
                              >
                                {item.daysRemainingToExpiry !== undefined ? `${item.daysRemainingToExpiry} دن` : 'N/A'}
                              </Text>
                            </View>

                            <View style={styles.timelineBox}>
                              <Text style={styles.timelineLabel}>یومیہ رفتار (Velocity)</Text>
                              <Text style={styles.timelineVal}>{item.dailySalesVelocity} یونٹ/دن</Text>
                            </View>

                            <View style={styles.timelineBox}>
                              <Text style={styles.timelineLabel}>ختم ہونے کا وقت (DND)</Text>
                              <Text style={styles.timelineVal}>
                                {item.daysToNaturalDepletion >= 999 ? '∞ (کوئی سیل نہیں)' : `${item.daysToNaturalDepletion} دن`}
                              </Text>
                            </View>
                          </View>

                          {/* Bilingual AI Notice */}
                          <Text style={styles.hazardAlertText}>{item.alertUrdu}</Text>

                          {/* Active Markdown or Quick Action */}
                          <View style={styles.markdownActionRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.markdownActionLabel}>
                                {hasMarkdown
                                  ? `فعال رعایت: ${item.markdownDiscountPercent}% (Rs. ${item.markdownPrice}/یونٹ)`
                                  : `فروخت تیز کرنے کے لیے مارک ڈاؤن لگائیں:`}
                              </Text>
                            </View>

                            {isApplying ? (
                              <ActivityIndicator size="small" color="#DC2626" />
                            ) : (
                              <View style={styles.markdownPillsGroup}>
                                <TouchableOpacity
                                  style={[
                                    styles.markdownPill,
                                    item.markdownDiscountPercent === 10 && styles.markdownPillActive,
                                  ]}
                                  onPress={() => handleApplyMarkdown(item.id, 10)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.markdownPillText}>-10%</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    styles.markdownPill,
                                    item.markdownDiscountPercent === 20 && styles.markdownPillActive,
                                  ]}
                                  onPress={() => handleApplyMarkdown(item.id, 20)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.markdownPillText}>-20%</Text>
                                </TouchableOpacity>

                                {hasMarkdown && (
                                  <TouchableOpacity
                                    style={styles.markdownResetBtn}
                                    onPress={() => handleApplyMarkdown(item.id, 0)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons name="refresh" size={14} color="#64748B" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              <View style={{ height: 32 }} />
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  metricSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    minHeight: 44,
  },
  tabBtnActive: {
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActiveBundles: {
    color: '#059669',
    fontWeight: '800',
  },
  tabTextActiveHazards: {
    color: '#DC2626',
    fontWeight: '800',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyStateBox: {
    padding: 30,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginTop: 12,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  bundleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  bundleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bundleTitleUrdu: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  bundleTitleEn: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  discountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  bundleItemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bundleItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTagHazard: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemTagHazardText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
  },
  itemTagDriver: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemTagDriverText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
  },
  bundleItemName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  bundleItemPrice: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
  },
  plusDivider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  pricingLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  originalPriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  bundleFinalPriceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
  marginGuardrailBox: {
    alignItems: 'flex-end',
  },
  marginGuardrailLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#065F46',
  },
  marginGuardrailVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },
  marginProfitPKR: {
    fontSize: 9,
    color: '#059669',
    fontWeight: '700',
  },
  copyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  copyText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  bundleActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  broadcastWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    minHeight: 44,
  },
  broadcastWhatsAppText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addToPosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    minHeight: 44,
  },
  addToPosText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    minHeight: 32,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#0F172A',
  },
  filterPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  hazardItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  hazardCardCritical: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  hazardCardWarning: {
    borderColor: '#FED7AA',
  },
  hazardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hazardItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  hazardItemCategory: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  hazardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hazardBadgeCritical: {
    backgroundColor: '#FEE2E2',
  },
  hazardBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  hazardBadgeDormant: {
    backgroundColor: '#FFEDD5',
  },
  hazardBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  metricsTimelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  timelineBox: {
    alignItems: 'center',
  },
  timelineLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  timelineVal: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  hazardAlertText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 8,
  },
  markdownActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  markdownActionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  markdownPillsGroup: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  markdownPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    minHeight: 32,
    justifyContent: 'center',
  },
  markdownPillActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  markdownPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  markdownResetBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
});
