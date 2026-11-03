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
  mandiArbitrageApi,
  IMandiRadarSummary,
  IPriceCreepAlert,
  IOptimalVendorQuote,
} from '../api/mandiArbitrage.api';

interface MandiArbitrageRadarModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenCreatePO?: (supplierId: string, itemName: string) => void;
}

export const MandiArbitrageRadarModal: React.FC<MandiArbitrageRadarModalProps> = ({
  visible,
  onClose,
  onOpenCreatePO,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'CREEPS' | 'QUOTES'>('CREEPS');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<IMandiRadarSummary | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await mandiArbitrageApi.getSummary();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (error) {
      console.error('Error fetching Mandi Radar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchSummary();
    }
  }, [visible]);

  const handleWhatsAppContact = (phone: string, message: string) => {
    if (!phone) {
      Alert.alert('فون نمبر دستیاب نہیں', 'اس سپلائر کا واٹس ایپ نمبر درج نہیں ہے۔');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.substring(1) : cleanPhone;
    const url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('WhatsApp Not Available', `Message:\n\n"${message}"`);
        }
      })
      .catch(() => {
        Alert.alert('Notice', 'Could not launch WhatsApp.');
      });
  };

  const priceCreeps = summary?.priceCreeps || [];
  const optimalQuotes = summary?.optimalQuotes || [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(20, insets.bottom) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="trending-up" size={22} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Mandi Rate Radar & Price Arbitrage</Text>
                <Text style={styles.headerSubtitle}>
                  منڈی ریٹ ریڈار • ہول سیل قیمتوں کا خودکار موازنہ
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
              <Text style={styles.metricLabel}>قیمتوں میں اضافہ (Creeps)</Text>
              <Text style={[styles.metricValue, { color: priceCreeps.length > 0 ? '#DC2626' : '#059669' }]}>
                {priceCreeps.length}
              </Text>
              <Text style={styles.metricSub}>ہائیک الرٹس</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>سستے ترین سپلائرز (Best Quotes)</Text>
              <Text style={[styles.metricValue, { color: '#0284C7' }]}>
                {optimalQuotes.length}
              </Text>
              <Text style={styles.metricSub}>متبادل ریٹس</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>ممکنہ مجموعی بچت (Savings)</Text>
              <Text style={[styles.metricValue, { color: '#059669' }]}>
                Rs. {(summary?.potentialTotalSavingsEstimated || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>فی بیچ بچت</Text>
            </View>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'CREEPS' && styles.tabBtnActive]}
              onPress={() => setActiveTab('CREEPS')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="alert-circle-outline"
                size={16}
                color={activeTab === 'CREEPS' ? '#DC2626' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'CREEPS' && styles.tabTextActiveCreep]}>
                قیمتوں میں اضافہ ({priceCreeps.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'QUOTES' && styles.tabBtnActive]}
              onPress={() => setActiveTab('QUOTES')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={activeTab === 'QUOTES' ? '#047857' : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'QUOTES' && styles.tabTextActiveQuotes]}>
                سستے سپلائر موازنہ ({optimalQuotes.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#047857" />
              <Text style={styles.loadingText}>ہول سیل بلز اور منڈی ریٹس کا تجزیہ جاری ہے...</Text>
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {activeTab === 'CREEPS' && (
                <View>
                  {priceCreeps.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Ionicons name="checkmark-done-circle" size={44} color="#059669" />
                      <Text style={styles.emptyStateTitle}>کوئی خاموش اضافہ نہیں ملا</Text>
                      <Text style={styles.emptyStateDesc}>
                        تمام سپلائرز کے ریٹس مستحکم ہیں۔ جب بھی کوئی سپلائر پچھلے بل سے زیادہ ریٹ لگائے گا، AI آپ کو فوری الرٹ جاری کرے گا۔
                      </Text>
                    </View>
                  ) : (
                    priceCreeps.map((creep, idx) => (
                      <View
                        key={`creep-${idx}`}
                        style={[
                          styles.creepCard,
                          creep.severity === 'CRITICAL' && styles.creepCardCritical,
                        ]}
                      >
                        <View style={styles.creepHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.creepItemName}>{creep.itemName}</Text>
                            <Text style={styles.creepSupplierName}>
                              🏢 {creep.supplierName} • {new Date(creep.lastPurchaseDate).toLocaleDateString()}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.hikeBadge,
                              creep.severity === 'CRITICAL' && styles.hikeBadgeCritical,
                            ]}
                          >
                            <Text style={styles.hikeBadgeText}>+{creep.percentHike}%</Text>
                          </View>
                        </View>

                        <View style={styles.priceComparisonRow}>
                          <View style={styles.priceBox}>
                            <Text style={styles.priceBoxLabel}>پچھلا ریٹ (Previous)</Text>
                            <Text style={styles.priceOldText}>Rs. {creep.previousUnitPrice.toLocaleString()}</Text>
                          </View>

                          <Ionicons name="arrow-forward" size={18} color="#94A3B8" />

                          <View style={styles.priceBox}>
                            <Text style={styles.priceBoxLabel}>نیا ریٹ (Latest)</Text>
                            <Text style={styles.priceNewText}>Rs. {creep.currentUnitPrice.toLocaleString()}</Text>
                          </View>

                          <View style={styles.priceDeltaBox}>
                            <Text style={styles.priceDeltaLabel}>اضافہ فی یونٹ</Text>
                            <Text style={styles.priceDeltaText}>+Rs. {creep.priceDelta.toLocaleString()}</Text>
                          </View>
                        </View>

                        <Text style={styles.creepMessageUrdu}>{creep.messageUr}</Text>

                        <View style={styles.creepActionsRow}>
                          {creep.supplierPhone ? (
                            <TouchableOpacity
                              style={styles.actionWhatsAppBtn}
                              onPress={() =>
                                handleWhatsAppContact(
                                  creep.supplierPhone,
                                  `السلام علیکم ${creep.supplierName}! آپ کے حالیہ بل میں ${creep.itemName} کا ریٹ Rs. ${creep.currentUnitPrice} لگایا گیا ہے جبکہ پچھلے بل میں Rs. ${creep.previousUnitPrice} تھا۔ برائے مہربانی ریٹ کے فرق کی وضاحت فرما دیں۔`
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                              <Text style={styles.actionWhatsAppText}>سپلائر سے استفسار (WhatsApp)</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {activeTab === 'QUOTES' && (
                <View>
                  {optimalQuotes.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                      <Ionicons name="receipt-outline" size={44} color="#0284C7" />
                      <Text style={styles.emptyStateTitle}>ملٹی سپلائر ریٹس کا تقابل</Text>
                      <Text style={styles.emptyStateDesc}>
                        جیسے ہی ایک ہی آئٹم 2 یا زیادہ مختلف سپلائرز سے خریدی جائے گی، AI خودکار طور پر سستے ترین سپلائر کی نشاندہی کرے گا۔
                      </Text>
                    </View>
                  ) : (
                    optimalQuotes.map((quote, idx) => (
                      <View key={`quote-${idx}`} style={styles.quoteCard}>
                        <View style={styles.quoteHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.quoteItemName}>{quote.itemName}</Text>
                            <Text style={styles.arbitrageSpreadText}>
                              فرق: Rs. {quote.arbitrageSpread.toLocaleString()} فی یونٹ ({quote.potentialSavingsPercent}% بچت)
                            </Text>
                          </View>
                          <View style={styles.savingsPill}>
                            <Text style={styles.savingsPillText}>بچت کا موقع</Text>
                          </View>
                        </View>

                        {/* Best Vendor Highlight */}
                        <View style={styles.bestVendorBox}>
                          <View style={styles.bestVendorBadge}>
                            <Ionicons name="trophy" size={13} color="#065F46" />
                            <Text style={styles.bestVendorBadgeText}>بہترین سستا ریٹ</Text>
                          </View>
                          <View style={styles.bestVendorInfoRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.bestVendorName}>🥇 {quote.bestSupplier.name}</Text>
                              <Text style={styles.bestVendorDate}>
                                آخری کوٹیشن: {new Date(quote.bestSupplier.lastQuotedDate).toLocaleDateString()}
                              </Text>
                            </View>
                            <Text style={styles.bestVendorPrice}>
                              Rs. {quote.lowestPrice.toLocaleString()}
                              <Text style={styles.unitText}>/یونٹ</Text>
                            </Text>
                          </View>
                        </View>

                        {/* Other Vendors comparison */}
                        <View style={styles.otherVendorsSection}>
                          <Text style={styles.otherVendorsTitle}>دیگر سپلائرز کے ریٹس:</Text>
                          {quote.otherSuppliers.map((other, oIdx) => (
                            <View key={`other-${oIdx}`} style={styles.otherVendorRow}>
                              <Text style={styles.otherVendorName}>• {other.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={styles.otherVendorPrice}>
                                  Rs. {other.unitPrice.toLocaleString()}
                                </Text>
                                <Text style={styles.otherVendorDiff}>
                                  (+Rs. {other.differenceFromBest})
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.quoteActionsRow}>
                          {quote.bestSupplier.phone ? (
                            <TouchableOpacity
                              style={styles.orderWhatsAppBtn}
                              onPress={() =>
                                handleWhatsAppContact(
                                  quote.bestSupplier.phone,
                                  `السلام علیکم ${quote.bestSupplier.name}! کیا آپ کے پاس ${quote.itemName} اب بھی Rs. ${quote.lowestPrice} میں دستیاب ہے؟ مجھے نیا مال منگوانا ہے۔`
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Ionicons name="logo-whatsapp" size={15} color="#FFFFFF" />
                              <Text style={styles.orderWhatsAppBtnText}>سستے وینڈر کو آرڈر کریں</Text>
                            </TouchableOpacity>
                          ) : null}

                          {onOpenCreatePO && (
                            <TouchableOpacity
                              style={styles.createPoBtn}
                              onPress={() => {
                                onClose();
                                onOpenCreatePO(quote.bestSupplier.id, quote.itemName);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="document-text-outline" size={15} color="#047857" />
                              <Text style={styles.createPoBtnText}>+ نیا PO بنائیں</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))
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
    backgroundColor: '#ECFDF5',
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
    color: '#059669',
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
    fontSize: 16,
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
  tabTextActiveCreep: {
    color: '#DC2626',
    fontWeight: '800',
  },
  tabTextActiveQuotes: {
    color: '#047857',
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
  creepCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  creepCardCritical: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
  },
  creepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  creepItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  creepSupplierName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  hikeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hikeBadgeCritical: {
    backgroundColor: '#FEE2E2',
  },
  hikeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  priceComparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  priceBox: {
    alignItems: 'center',
  },
  priceBoxLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  priceOldText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  priceNewText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  priceDeltaBox: {
    alignItems: 'flex-end',
  },
  priceDeltaLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  priceDeltaText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
  creepMessageUrdu: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  creepActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    minHeight: 44,
  },
  actionWhatsAppText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  quoteItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  arbitrageSpreadText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  savingsPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savingsPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  bestVendorBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  bestVendorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  bestVendorBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  bestVendorInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bestVendorName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  bestVendorDate: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
  bestVendorPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
  unitText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065F46',
  },
  otherVendorsSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  otherVendorsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  otherVendorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  otherVendorName: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  otherVendorPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  otherVendorDiff: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  quoteActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  orderWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    minHeight: 44,
  },
  orderWhatsAppBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createPoBtn: {
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
  createPoBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
});
