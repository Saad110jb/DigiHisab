import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dukanStaffPayrollApi, IDukanStaff } from '../../api/dukanStaffPayroll.api';
import { ITillBalances } from '../../api/cashDrawer.api';
import { IPaymentChannels } from '../../api/profile.api';
import { businessLogsApi } from '../../api/businessLogs.api';
import { useFinancialMetrics } from '../../context/FinancialMetricsContext';

interface StaffAdvanceKharchaFormProps {
  staffList: IDukanStaff[];
  paymentChannels: IPaymentChannels;
  tillBalances: ITillBalances;
  onRefresh: () => void;
  onUpdateTillBalances?: (updated: ITillBalances) => void;
  onShowToast?: (msg: string) => void;
  onSuccess?: () => void;
}

type PaymentDestination = 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT';
type AdvanceType = 'FOOD_KHARCHA' | 'ADVANCE_WAGE';

export const StaffAdvanceKharchaForm: React.FC<StaffAdvanceKharchaFormProps> = ({
  staffList,
  paymentChannels,
  tillBalances,
  onRefresh,
  onUpdateTillBalances,
  onShowToast,
  onSuccess,
}) => {
  const { syncExpense, refreshMetrics } = useFinancialMetrics();

  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staffList.length > 0 ? staffList[0]._id : ''
  );
  const [amount, setAmount] = useState<string>('');
  const [advanceType, setAdvanceType] = useState<AdvanceType>('FOOD_KHARCHA');
  const [channel, setChannel] = useState<PaymentDestination>('PHYSICAL_CASH');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const selectedStaff = staffList.find((s) => s._id === selectedStaffId);

  const getChannelBalance = (mode: PaymentDestination): number => {
    if (mode === 'PHYSICAL_CASH') return paymentChannels.cashDrawer ?? tillBalances.physicalCash ?? 0;
    if (mode === 'BANK_ACCOUNT') return paymentChannels.bankAccount ?? tillBalances.bankAccount ?? 0;
    if (mode === 'DIGITAL_WALLET') return paymentChannels.digitalWallet ?? tillBalances.digitalWallet ?? 0;
    return 0;
  };

  const channelBalance = getChannelBalance(channel);
  const parsedAmount = parseFloat(amount) || 0;
  const isSolvent = parsedAmount > 0 ? channelBalance >= parsedAmount : true;

  const quickAmounts = [100, 200, 500, 1000, 2000];

  const handleSubmit = async () => {
    if (!selectedStaffId) {
      onShowToast?.('⚠️ Please select a staff helper.');
      return;
    }

    if (parsedAmount <= 0) {
      onShowToast?.('⚠️ Please enter a valid positive amount.');
      return;
    }

    if (!isSolvent) {
      onShowToast?.(
        `⚠️ Insufficient funds! Current available: Rs. ${channelBalance.toLocaleString()}. Pehle khata mein raqam muntaqil karein.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await dukanStaffPayrollApi.addAdvanceKharcha(selectedStaffId, {
        amount: parsedAmount,
        type: advanceType,
        note: note.trim() || undefined,
        paymentMode: channel,
      });

      if (res.success) {
        // Sync central financial metrics
        const metricMode =
          channel === 'PHYSICAL_CASH' ? 'CASH' : channel === 'DIGITAL_WALLET' ? 'WALLET' : 'BANK';
        syncExpense(parsedAmount, metricMode);
        refreshMetrics();

        // Update local till balances
        if (onUpdateTillBalances) {
          let pCash = tillBalances.physicalCash;
          let dWallet = tillBalances.digitalWallet;
          let bAccount = tillBalances.bankAccount;
          if (channel === 'PHYSICAL_CASH') pCash = Math.max(0, pCash - parsedAmount);
          else if (channel === 'DIGITAL_WALLET') dWallet = Math.max(0, dWallet - parsedAmount);
          else if (channel === 'BANK_ACCOUNT') bAccount = Math.max(0, bAccount - parsedAmount);

          onUpdateTillBalances({
            physicalCash: pCash,
            digitalWallet: dWallet,
            bankAccount: bAccount,
            totalLiquidCapital: pCash + dWallet + bAccount,
          });
        }

        const typeLabel = advanceType === 'FOOD_KHARCHA' ? 'Rozana Kharcha / Chai' : 'Paishgi (Advance)';
        onShowToast?.(`✓ Rs. ${parsedAmount.toLocaleString()} ${typeLabel} recorded for ${selectedStaff?.staffName}!`);

        businessLogsApi.createAuditLog({
          actionType: 'STAFF_ADVANCE_RECORDED',
          reason: `Rs. ${parsedAmount} ${typeLabel} given to ${selectedStaff?.staffName} from ${channel}`,
        });

        setAmount('');
        setNote('');
        onRefresh();
        onSuccess?.();
      } else {
        onShowToast?.(res.message || 'Error recording advance/kharcha');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || 'Error recording advance/kharcha';
      onShowToast?.(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Select Staff Member */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={16} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Helper Ka Intekhab (ملازم منتخب کریں)</Text>
            <Text style={styles.cardSub}>Select the staff member receiving cash/kharcha</Text>
          </View>
        </View>

        {staffList.length === 0 ? (
          <Text style={styles.emptyNote}>No active staff members found.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffChipsRow}>
            {staffList.map((staff) => {
              const isSelected = selectedStaffId === staff._id;
              const pendingAdvance = staff.monthStats?.totalAdvancesKharcha || 0;
              return (
                <TouchableOpacity
                  key={staff._id}
                  style={[styles.staffChip, isSelected && styles.staffChipActive]}
                  onPress={() => setSelectedStaffId(staff._id)}
                >
                  <View style={[styles.avatarMini, isSelected && styles.avatarMiniActive]}>
                    <Text style={[styles.avatarMiniText, isSelected && styles.avatarMiniTextActive]}>
                      {staff.staffName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.staffChipName, isSelected && styles.staffChipNameActive]}>
                      {staff.staffName}
                    </Text>
                    <Text style={[styles.staffChipSub, isSelected && styles.staffChipSubActive]}>
                      {staff.roleTitle} • Adv: Rs. {pendingAdvance.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 2. Amount Input & Quick Chips */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="cash" size={16} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Raqam (رقم درج کریں)</Text>
            <Text style={styles.cardSub}>Enter amount or tap quick chips</Text>
          </View>
        </View>

        <View style={styles.amountInputWrapper}>
          <Text style={styles.currencyPrefix}>Rs.</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.quickChipsRow}>
          {quickAmounts.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.quickChip}
              onPress={() => setAmount(String(q))}
            >
              <Text style={styles.quickChipText}>+{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 3. Category Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="pricetag" size={16} color="#6366F1" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Kharcha Qism (خرچہ کی قسم)</Text>
            <Text style={styles.cardSub}>Lunch/Tea petty cash or mid-month salary advance</Text>
          </View>
        </View>

        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[
              styles.categoryOption,
              advanceType === 'FOOD_KHARCHA' && styles.categoryOptionActive,
            ]}
            onPress={() => setAdvanceType('FOOD_KHARCHA')}
          >
            <Ionicons
              name="cafe"
              size={18}
              color={advanceType === 'FOOD_KHARCHA' ? '#FFFFFF' : '#4F46E5'}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.categoryTitle,
                  advanceType === 'FOOD_KHARCHA' && styles.categoryTextActive,
                ]}
              >
                Rozana Kharcha / Chai
              </Text>
              <Text
                style={[
                  styles.categoryDesc,
                  advanceType === 'FOOD_KHARCHA' && styles.categorySubActive,
                ]}
              >
                کھانا، چائے، روزمرہ متفرق خرچ
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.categoryOption,
              advanceType === 'ADVANCE_WAGE' && styles.categoryOptionActive,
            ]}
            onPress={() => setAdvanceType('ADVANCE_WAGE')}
          >
            <Ionicons
              name="wallet"
              size={18}
              color={advanceType === 'ADVANCE_WAGE' ? '#FFFFFF' : '#4F46E5'}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.categoryTitle,
                  advanceType === 'ADVANCE_WAGE' && styles.categoryTextActive,
                ]}
              >
                Salary Paishgi (پیشگی)
              </Text>
              <Text
                style={[
                  styles.categoryDesc,
                  advanceType === 'ADVANCE_WAGE' && styles.categorySubActive,
                ]}
              >
                ماہانہ تنخواہ سے پیشگی کٹوتی
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Payment Channel Selector with Real-Time Solvency Radar */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="card" size={16} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Adaigi Zariya (ادائیگی کا کھاتہ)</Text>
            <Text style={styles.cardSub}>Strict Jev Solvency Protection Applied</Text>
          </View>
        </View>

        <View style={styles.channelGroup}>
          {[
            {
              id: 'PHYSICAL_CASH' as PaymentDestination,
              name: 'دکان گلہ (Cash Till)',
              bal: paymentChannels.cashDrawer ?? tillBalances.physicalCash ?? 0,
              icon: 'cash',
            },
            {
              id: 'DIGITAL_WALLET' as PaymentDestination,
              name: 'جاز کیش / ایزی پیسہ',
              bal: paymentChannels.digitalWallet ?? tillBalances.digitalWallet ?? 0,
              icon: 'phone-portrait',
            },
            {
              id: 'BANK_ACCOUNT' as PaymentDestination,
              name: 'بینک کھاتہ (Bank / Raast)',
              bal: paymentChannels.bankAccount ?? tillBalances.bankAccount ?? 0,
              icon: 'business',
            },
          ].map((item) => {
            const isSelected = channel === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.channelCard, isSelected && styles.channelCardActive]}
                onPress={() => setChannel(item.id)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isSelected ? '#4F46E5' : '#64748B'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.channelName, isSelected && styles.channelNameActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.channelBal}>
                    دستیاب بیلنس: Rs. {item.bal.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Solvency Alert Warning */}
        {!isSolvent && (
          <View style={styles.solvencyWarning}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.solvencyWarningText}>
              ⚠️ ناکافی بیلنس: منتخب کھاتہ میں صرف Rs. {channelBalance.toLocaleString()} دستیاب ہیں جبکہ مطلوبہ رقم Rs. {parsedAmount.toLocaleString()} ہے۔
            </Text>
          </View>
        )}
      </View>

      {/* 5. Remarks Note Input */}
      <View style={styles.card}>
        <Text style={styles.label}>Tafseel / Wajah (نوٹ - اختیاری)</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="مثلاً: دوپہر کا کھانا، ایمرجنسی دوا، موٹر سائیکل پیٹرول..."
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* 6. Disburse Action Button */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          (!isSolvent || submitting || parsedAmount <= 0) && styles.submitBtnDisabled,
        ]}
        disabled={!isSolvent || submitting || parsedAmount <= 0}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="send" size={18} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              خرچہ / پیشگی ادا کریں (Disburse Rs. {parsedAmount > 0 ? parsedAmount.toLocaleString() : '0'})
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyNote: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  staffChipsRow: {
    flexDirection: 'row',
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  staffChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniActive: {
    backgroundColor: '#4F46E5',
  },
  avatarMiniText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  avatarMiniTextActive: {
    color: '#FFFFFF',
  },
  staffChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  staffChipNameActive: {
    color: '#4F46E5',
  },
  staffChipSub: {
    fontSize: 10,
    color: '#64748B',
  },
  staffChipSubActive: {
    color: '#6366F1',
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 10,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  categoryOptionActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  categoryDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categorySubActive: {
    color: '#E0E7FF',
  },
  channelGroup: {
    gap: 8,
  },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  channelCardActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  channelName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  channelNameActive: {
    color: '#4F46E5',
  },
  channelBal: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#4F46E5',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  solvencyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  solvencyWarningText: {
    flex: 1,
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
