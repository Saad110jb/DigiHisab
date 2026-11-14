import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/auth.store';
import { inventoryApi } from '../api/inventory.api';
import { counterpartyApi, ICounterparty } from '../api/counterparty.api';
import { ledgerApi } from '../api/ledger.api';
import { wholesalePoApi, IWholesalePO } from '../api/wholesalePo.api';

interface WholesalePoModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenSupplierBillModal?: (poData: {
    supplierId: string;
    supplierName: string;
    poId?: string;
    amount: number;
    items: { inventoryItemId?: string; itemName: string; quantityOrdered: number; unitCost: number }[];
  }) => void;
  initialItem?: {
    inventoryItemId?: string;
    itemName: string;
    quantityOrdered: number;
    unitCost?: number;
  };
}

interface POItemDraft {
  inventoryItemId?: string;
  itemName: string;
  quantityOrdered: number;
  unitCost: number;
  selected: boolean;
}

export const WholesalePoModal: React.FC<WholesalePoModalProps> = ({
  visible,
  onClose,
  onSuccess,
  onOpenSupplierBillModal,
  initialItem,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<ICounterparty[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [customDistributorName, setCustomDistributorName] = useState('Akbari Mandi Wholesaler');
  const [customPhone, setCustomPhone] = useState('03001234567');

  const [poItems, setPoItems] = useState<POItemDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Sub-panel Monthly PO History State
  const [poHistory, setPoHistory] = useState<IWholesalePO[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMonthlyPoHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await wholesalePoApi.getAll({ limit: 50 });
      if (res.success && res.data) {
        setPoHistory(res.data);
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchSuppliersAndLowStock();
      fetchMonthlyPoHistory();
    }
  }, [visible]);

  const fetchSuppliersAndLowStock = async () => {
    setLoading(true);
    try {
      const invRes = await inventoryApi.getLowStockAlerts();
      let lowItems: any[] = [];
      if (invRes.success && invRes.data) {
        lowItems = invRes.data;
      }

      if (lowItems.length === 0) {
        lowItems = [
          { _id: 'item-1', itemName: 'Dal Chana (دال چنا) 1kg', category: 'Pulses', stockOnHand: 3, lowStockThreshold: 10, wholesaleCost: 320, retailPrice: 350 },
          { _id: 'item-2', itemName: 'Dalda Ghee (5L Dabba)', category: 'Oil & Ghee', stockOnHand: 2, lowStockThreshold: 5, wholesaleCost: 2600, retailPrice: 2800 },
          { _id: 'item-3', itemName: 'Sugar (چینی) 50kg Bori', category: 'Grains', stockOnHand: 1, lowStockThreshold: 3, wholesaleCost: 7200, retailPrice: 7500 },
        ];
      }

      const drafts: POItemDraft[] = lowItems.map((item: any) => ({
        inventoryItemId: item._id,
        itemName: item.itemName,
        quantityOrdered: Math.max(5, (item.lowStockThreshold || 10) - item.stockOnHand),
        unitCost: item.wholesaleCost || 500,
        selected: true,
      }));

      if (initialItem) {
        const singleDraft: POItemDraft = {
          inventoryItemId: initialItem.inventoryItemId,
          itemName: initialItem.itemName,
          quantityOrdered: initialItem.quantityOrdered,
          unitCost: initialItem.unitCost || 500,
          selected: true,
        };
        const others = drafts.filter((d) => d.inventoryItemId !== initialItem.inventoryItemId);
        setPoItems([singleDraft, ...others]);
      } else {
        setPoItems(drafts);
      }

      const supRes = await counterpartyApi.getAll({ relationType: 'SUPPLIER' });
      if (supRes.success && supRes.data) {
        setSuppliers(supRes.data);
        if (supRes.data.length > 0) {
          setSelectedSupplierId(supRes.data[0]._id);
          setCustomDistributorName(supRes.data[0].name);
          setCustomPhone(supRes.data[0].phone);
        }
      }
    } catch (err) {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  const totalPoCount = poHistory.length;
  const totalPoValueSum = poHistory.reduce((sum, item) => sum + (item.grandTotal || 0), 0);

  const handleToggleItem = (index: number) => {
    setPoItems((prev) => {
      const copy = [...prev];
      copy[index].selected = !copy[index].selected;
      return copy;
    });
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setPoItems((prev) => {
      const copy = [...prev];
      const newQty = Math.max(1, copy[index].quantityOrdered + delta);
      copy[index].quantityOrdered = newQty;
      return copy;
    });
  };

  const handleUpdateCost = (index: number, costStr: string) => {
    const val = parseFloat(costStr) || 0;
    setPoItems((prev) => {
      const copy = [...prev];
      copy[index].unitCost = val;
      return copy;
    });
  };

  const selectedItems = poItems.filter((item) => item.selected);
  const grandTotal = selectedItems.reduce((acc, curr) => acc + curr.quantityOrdered * curr.unitCost, 0);

  const formatWhatsAppMessage = (
    distName: string,
    itemsList: { itemName: string; quantityOrdered: number; unitCost: number }[],
    totalVal: number
  ) => {
    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    let msg = `🛒 *WHOLESALE PURCHASE ORDER (نیا مال آرڈر)*\n`;
    msg += `🏢 *Distributor*: ${distName}\n`;
    msg += `📅 *Date*: ${dateStr}\n\n`;
    msg += `*ITEMS REQUIRED (تفصیل آرڈر)*:\n`;

    itemsList.forEach((item, idx) => {
      const lineTotal = item.quantityOrdered * item.unitCost;
      msg += `${idx + 1}. *${item.itemName}*\n`;
      msg += `   • Qty: ${item.quantityOrdered} units @ Rs. ${item.unitCost.toLocaleString()} = *Rs. ${lineTotal.toLocaleString()}*\n`;
    });

    const storeName = user?.businessName || (user?.fullName ? `${user.fullName}'s Store` : 'اپنا اسٹور');
    const merchantPhone = user?.phone || '0300-0000000';
    const deliveryAddress = user?.address
      ? user?.city
        ? `${user.address}, ${user.city}`
        : user.address
      : user?.city || 'پاکستان';

    msg += `\n💰 *Total Est. Order Value*: *Rs. ${totalVal.toLocaleString()}*\n`;
    msg += `----------------------------------\n`;
    msg += `🏪 *Store*: ${storeName}\n`;
    msg += `📞 *Merchant Contact*: ${merchantPhone}\n`;
    msg += `📍 *Delivery*: ${deliveryAddress}\n`;
    msg += `Baraye meherbani mal jald az jald dispatch karein. Shukriya!`;

    return msg;
  };

  const openWhatsApp = (phoneStr: string, messageText: string) => {
    const encoded = encodeURIComponent(messageText);
    const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('92') ? cleanPhone : `92${cleanPhone.replace(/^0/, '')}`;
    const whatsappUrl = `whatsapp://send?phone=${fullPhone}&text=${encoded}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          const webUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        const webUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;
        Linking.openURL(webUrl);
      });
  };

  const handleSendWhatsAppOrder = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('Selection Required', 'Kam az kam ek item order ke liye select karein.');
      return;
    }

    setSubmitting(true);
    let createdPoId: string | undefined = undefined;

    try {
      // 1. Save Wholesale PO to Database
      const poRes = await wholesalePoApi.create({
        supplierCounterpartyId: selectedSupplierId || undefined,
        supplierName: customDistributorName,
        supplierPhone: customPhone,
        items: selectedItems.map((i) => ({
          inventoryItemId: i.inventoryItemId,
          itemName: i.itemName,
          quantityOrdered: i.quantityOrdered,
          unitCost: i.unitCost,
        })),
      });

      if (poRes.success && poRes.data) {
        createdPoId = poRes.data._id;
        setPoHistory((prev) => [poRes.data, ...prev]);
      }
    } catch (e) {
      console.log('Wholesale PO creation log:', e);
    } finally {
      setSubmitting(false);
    }

    // 2. Open WhatsApp with generated order message
    const textMsg = formatWhatsAppMessage(customDistributorName, selectedItems, grandTotal);
    openWhatsApp(customPhone, textMsg);

    onSuccess?.();

    // 3. Action Dialog Prompt: Add Supplier Bill & Stock Sync Confirmation
    Alert.alert(
      'Wholesale Order Save Ho Gaya (آرڈر سیو ہو گیا)',
      'Order record save ho gaya! Kya aap iska Supplier Bill (Maine Dene Hain) aur stock abhi enter karna chahte hain?',
      [
        {
          text: 'Sirf Order Save Rakhein',
          style: 'cancel',
          onPress: () => {
            onClose();
          },
        },
        {
          text: 'Haan, Bill Record Karein',
          onPress: () => {
            onClose();
            if (onOpenSupplierBillModal) {
              onOpenSupplierBillModal({
                supplierId: selectedSupplierId,
                supplierName: customDistributorName,
                poId: createdPoId,
                amount: grandTotal,
                items: selectedItems.map((i) => ({
                  inventoryItemId: i.inventoryItemId,
                  itemName: i.itemName,
                  quantityOrdered: i.quantityOrdered,
                  unitCost: i.unitCost,
                })),
              });
            }
          },
        },
      ]
    );
  };

  const handleDeletePo = (po: IWholesalePO) => {
    Alert.alert(
      'Delete Purchase Order (آرڈر ڈیلیٹ)',
      `Kya aap Wholesale PO #${po.poNumber} delete karna chahte hain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Order (ڈیلیٹ کریں)',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(po._id);
            try {
              await wholesalePoApi.delete(po._id);

              // Optimistically filter out deleted PO
              setPoHistory((prev) => prev.filter((item) => item._id !== po._id));

              onSuccess?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete purchase order.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleResendWhatsApp = (po: IWholesalePO) => {
    const distName = (po.supplierCounterpartyId as any)?.name || customDistributorName;
    const phone = (po.supplierCounterpartyId as any)?.phone || customPhone;
    const textMsg = formatWhatsAppMessage(distName, po.items, po.grandTotal);
    openWhatsApp(phone, textMsg);
  };

  const formatPoDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
  };

  const getPoItemSummaryText = (items: any[]) => {
    if (!items || items.length === 0) return '0 Items';
    const summary = items
      .slice(0, 3)
      .map((i) => `${i.itemName} x${i.quantityOrdered}`)
      .join(', ');
    return `${items.length} Items (${summary}${items.length > 3 ? '...' : ''})`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="cart-outline" size={20} color="#0284C7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Wholesale Purchase Order</Text>
                <Text style={styles.headerSubtitle}>تھوک خریداری • WhatsApp پر نیا مال آرڈر</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Wholesaler / Supplier Info Box */}
            <View style={styles.supplierCard}>
              <Text style={styles.sectionLabel}>🏬 Wholesale Distributor (تھوک سپلائر):</Text>

              {suppliers.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {suppliers.map((sup) => (
                    <TouchableOpacity
                      key={sup._id}
                      style={[
                        styles.supChip,
                        selectedSupplierId === sup._id && styles.supChipActive,
                      ]}
                      onPress={() => {
                        setSelectedSupplierId(sup._id);
                        setCustomDistributorName(sup.name);
                        setCustomPhone(sup.phone);
                      }}
                    >
                      <Text
                        style={[
                          styles.supChipText,
                          selectedSupplierId === sup._id && styles.supChipTextActive,
                        ]}
                      >
                        {sup.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : null}

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>Distributor Name</Text>
                  <TextInput
                    style={styles.input}
                    value={customDistributorName}
                    onChangeText={setCustomDistributorName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>WhatsApp Phone</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={customPhone}
                    onChangeText={setCustomPhone}
                  />
                </View>
              </View>
            </View>

            {/* Consolidated Items List */}
            <Text style={styles.sectionLabel}>
              📦 Low Stock Order List ({selectedItems.length} Items Selected):
            </Text>

            {loading ? (
              <ActivityIndicator color="#0284C7" size="large" style={{ marginVertical: 30 }} />
            ) : (
              <View style={styles.itemsList}>
                {poItems.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.itemRow,
                      !item.selected && styles.itemRowDisabled,
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.checkboxTouch}
                      onPress={() => handleToggleItem(idx)}
                    >
                      <Ionicons
                        name={item.selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={item.selected ? '#0284C7' : '#94A3B8'}
                      />
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.itemName}</Text>
                      <View style={styles.costQtyRow}>
                        <Text style={styles.costText}>Rate (Rs.):</Text>
                        <TextInput
                          style={styles.costInput}
                          keyboardType="numeric"
                          value={String(item.unitCost)}
                          onChangeText={(txt) => handleUpdateCost(idx, txt)}
                        />
                      </View>
                    </View>

                    {/* Qty Counter */}
                    <View style={styles.qtyControl}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(idx, -1)}>
                        <Ionicons name="remove" size={14} color="#0F172A" />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantityOrdered}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(idx, 1)}>
                        <Ionicons name="add" size={14} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Total Summary Box */}
            <View style={styles.totalBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Estimated Total Order Value:</Text>
                <Text style={styles.totalVal}>Rs. {grandTotal.toLocaleString()}</Text>
              </View>
            </View>

            {/* PERSISTENT SUB-PANEL: Collapsible Monthly Wholesale PO History */}
            <View style={styles.subPanelCard}>
              <TouchableOpacity
                style={styles.subPanelHeaderRow}
                onPress={() => setHistoryExpanded(!historyExpanded)}
                activeOpacity={0.8}
              >
                <View style={styles.subPanelTitleGroup}>
                  <Ionicons name="cart-outline" size={18} color="#0284C7" />
                  <Text style={styles.subPanelTitle}>Is Mahinay Ke Wholesale Orders (Monthly Orders History)</Text>
                </View>
                <Ionicons
                  name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>

              {/* Monthly Running Summary Badge */}
              <View style={styles.monthlySummaryBadge}>
                <Text style={styles.monthlySummaryText}>
                  Total Placed Orders: <Text style={styles.monthlySummaryBold}>{totalPoCount}</Text>
                </Text>
                <Text style={styles.monthlySummaryText}>
                  Estimated Value: <Text style={styles.monthlyValueBold}>Rs. {totalPoValueSum.toLocaleString()}</Text>
                </Text>
              </View>

              {historyExpanded && (
                <View style={styles.historyContainer}>
                  {loadingHistory ? (
                    <ActivityIndicator color="#0284C7" size="small" style={{ marginVertical: 14 }} />
                  ) : poHistory.length === 0 ? (
                    <View style={styles.emptyHistoryBox}>
                      <Ionicons name="cart-outline" size={28} color="#94A3B8" />
                      <Text style={styles.emptyHistoryText}>Is mahinay abhi tak koi wholesale order nahi bheja gaya.</Text>
                    </View>
                  ) : (
                    poHistory.map((item) => {
                      const isDeleting = deletingId === item._id;
                      const distName = (item.supplierCounterpartyId as any)?.name || 'Akbari Mandi Wholesaler';
                      const phone = (item.supplierCounterpartyId as any)?.phone || '0300-1234567';

                      return (
                        <View key={item._id} style={styles.historyRow}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.rowTopLine}>
                              <Text style={styles.poIdText}>
                                {item.poNumber || `PO-${item._id.slice(-6).toUpperCase()}`} • {formatPoDate(item.createdAt)}
                              </Text>
                              <Text style={styles.poAmountText}>Rs. {item.grandTotal.toLocaleString()}</Text>
                            </View>

                            <Text style={styles.distributorText}>
                              🏢 {distName} • 📱 {phone}
                            </Text>

                            <View style={styles.itemSummaryPill}>
                              <Text style={styles.itemSummaryPillText} numberOfLines={1}>
                                📦 {getPoItemSummaryText(item.items)}
                              </Text>
                            </View>

                            {/* Status Chip */}
                            <View style={styles.statusChipRow}>
                              <View
                                style={[
                                  styles.statusChip,
                                  item.status === 'RECEIVED'
                                    ? styles.statusChipReceived
                                    : item.status === 'ORDERED'
                                    ? styles.statusChipSent
                                    : styles.statusChipDraft,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.statusChipText,
                                    item.status === 'RECEIVED'
                                      ? styles.statusChipReceivedText
                                      : item.status === 'ORDERED'
                                      ? styles.statusChipSentText
                                      : styles.statusChipDraftText,
                                  ]}
                                >
                                  {item.status === 'RECEIVED'
                                    ? 'Received & Stocked'
                                    : item.status === 'ORDERED'
                                    ? 'Sent via WhatsApp'
                                    : 'Draft Order'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Action Buttons: Resend WhatsApp & Delete */}
                          <View style={styles.actionButtonsCol}>
                            <TouchableOpacity
                              style={styles.resendBtn}
                              onPress={() => handleResendWhatsApp(item)}
                            >
                              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteBtn}
                              onPress={() => handleDeletePo(item)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <ActivityIndicator size="small" color="#E11D48" />
                              ) : (
                                <Ionicons name="trash-outline" size={16} color="#E11D48" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Sticky Bottom Action Footer (Permanently above Android Navigation Bar) */}
          <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }]}>
            <TouchableOpacity
              style={[styles.whatsappBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSendWhatsAppOrder}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                  <Text style={styles.whatsappBtnText} numberOfLines={1} ellipsizeMode="tail">
                    WhatsApp PO Bhejein (تھوک آرڈر بھیجیں)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  supplierCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  supChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  supChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  supChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  supChipTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  itemsList: {
    gap: 10,
    marginBottom: 14,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  itemRowDisabled: {
    opacity: 0.5,
  },
  checkboxTouch: {
    padding: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  costQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  costText: {
    fontSize: 11,
    color: '#64748B',
  },
  costInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    width: 70,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  qtyBtn: {
    padding: 6,
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  totalBox: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284C7',
  },
  stickyFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 12,
    gap: 8,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flexShrink: 1,
  },
  /* Sub-Panel PO History Styles */
  subPanelCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
  },
  subPanelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPanelTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subPanelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  monthlySummaryBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  monthlySummaryText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  monthlySummaryBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  monthlyValueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  historyContainer: {
    marginTop: 12,
    gap: 8,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyHistoryText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  rowTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  poAmountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  distributorText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  itemSummaryPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
  },
  itemSummaryPillText: {
    fontSize: 10,
    color: '#334155',
  },
  statusChipRow: {
    marginTop: 6,
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusChipSent: {
    backgroundColor: '#E0F2FE',
  },
  statusChipSentText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284C7',
  },
  statusChipReceived: {
    backgroundColor: '#D1FAE5',
  },
  statusChipReceivedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  statusChipDraft: {
    backgroundColor: '#F1F5F9',
  },
  statusChipDraftText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  actionButtonsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resendBtn: {
    padding: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
  },
  deleteBtn: {
    padding: 6,
  },
});
