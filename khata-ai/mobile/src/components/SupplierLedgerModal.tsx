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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { counterpartyApi, ICounterparty } from '../api/counterparty.api';

interface SupplierLedgerModalProps {
  visible: boolean;
  onClose: () => void;
  onAddSupplier: () => void;
  onPaySupplier: (supplier: ICounterparty) => void;
}

export const SupplierLedgerModal: React.FC<SupplierLedgerModalProps> = ({
  visible,
  onClose,
  onAddSupplier,
  onPaySupplier,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<ICounterparty[]>([]);

  useEffect(() => {
    if (visible) {
      fetchSuppliers();
    }
  }, [visible]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await counterpartyApi.getAll({ relationType: 'SUPPLIER' });
      if (res.success && res.data) {
        setSuppliers(res.data);
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  // Strictly dynamic aggregation: only sum actual debts owed to suppliers
  const totalOwed = suppliers.reduce((sum, s) => {
    const bal = s.currentBalance || 0;
    // Debt owed to supplier is either negative currentBalance (traditional) or positive debt
    const debt = bal < 0 ? Math.abs(bal) : bal > 0 ? bal : 0;
    return sum + debt;
  }, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="business" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Supplier Ledger (سپلائر کھاتہ)</Text>
                <Text style={styles.headerSubtitle}>Wholesaler payables, credit terms & bank details</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* KPI Card */}
          <View style={styles.kpiCard}>
            <View>
              <Text style={styles.kpiLabel}>MAINE DENE HAIN (TOTAL PAYABLES)</Text>
              <Text style={styles.kpiValue}>Rs. {totalOwed.toLocaleString('en-PK')}</Text>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={onAddSupplier}>
              <Ionicons name="add" size={16} color="#FFF" />
              <Text style={styles.addBtnText}>+ Naya Supplier</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#0284C7" />
            </View>
          ) : suppliers.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="checkmark-done-circle-outline" size={52} color="#10B981" />
              <Text style={styles.emptyTitle}>کوئی سپلائر ادھار واجب الادا نہیں ہے</Text>
              <Text style={styles.emptySub}>All supplier accounts are clear (Rs. 0). Click "+ Naya Supplier" to register a wholesaler.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {suppliers.map((s) => {
                const owed = Math.abs(s.currentBalance || 0);
                return (
                  <View key={s._id} style={styles.supCard}>
                    <View style={styles.supHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.supTitle}>{s.name}</Text>
                        <Text style={styles.supPhone}>📱 {s.phone}</Text>
                        {s.address && <Text style={styles.supAddress}>📍 {s.address}</Text>}
                      </View>
                      {s.currentBalance !== 0 ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.owedLabel, { color: '#E11D48' }]}>Wajib-ul-Ada (Maine Dene)</Text>
                          <Text style={[styles.owedValue, { color: '#E11D48' }]}>Rs. {Math.abs(s.currentBalance).toLocaleString('en-PK')}</Text>
                        </View>
                      ) : s.advanceDeposit && s.advanceDeposit > 0 ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.owedLabel, { color: '#059669' }]}>Advance Prepayment</Text>
                          <Text style={[styles.owedValue, { color: '#059669' }]}>Rs. {s.advanceDeposit.toLocaleString('en-PK')}</Text>
                        </View>
                      ) : (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.owedLabel, { color: '#059669' }]}>Hisab Saaf</Text>
                          <Text style={[styles.owedValue, { color: '#059669' }]}>Rs. 0</Text>
                        </View>
                      )}
                    </View>

                    {s.deliveryRep?.name && (
                      <View style={styles.repBox}>
                        <Ionicons name="car-outline" size={14} color="#0284C7" />
                        <Text style={styles.repText}>
                          Order Booker: {s.deliveryRep.name} ({s.deliveryRep.phone})
                        </Text>
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => {
                          onPaySupplier(s);
                          onClose();
                        }}
                      >
                        <Ionicons name="cash-outline" size={14} color="#FFF" />
                        <Text style={styles.payBtnText}>+ Adaigi (Pay)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => Linking.openURL(`tel:${s.phone}`)}
                      >
                        <Ionicons name="call-outline" size={14} color="#0B2239" />
                        <Text style={styles.callBtnText}>Call Wholesaler</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
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
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  kpiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#E0F2FE',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
  },
  emptyBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  supCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  supTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  supPhone: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  supAddress: {
    fontSize: 10,
    color: '#475569',
    marginTop: 1,
  },
  owedLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  owedValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E11D48',
  },
  repBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  repText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  payBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 6,
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  callBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 6,
  },
  callBtnText: {
    color: '#0B2239',
    fontSize: 12,
    fontWeight: '700',
  },
});
