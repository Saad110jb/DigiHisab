import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dukanStaffPayrollApi, IDukanStaff } from '../../api/dukanStaffPayroll.api';
import { ITillBalances } from '../../api/cashDrawer.api';
import { IPaymentChannels } from '../../api/profile.api';
import { businessLogsApi } from '../../api/businessLogs.api';
import { useFinancialMetrics } from '../../context/FinancialMetricsContext';

interface StaffTankhaSettlementFormProps {
  staffList: IDukanStaff[];
  paymentChannels: IPaymentChannels;
  tillBalances: ITillBalances;
  onRefresh: () => void;
  onUpdateTillBalances?: (updated: ITillBalances) => void;
  onShowToast?: (msg: string) => void;
  onSuccess?: () => void;
}

type PaymentDestination = 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT';

export const StaffTankhaSettlementForm: React.FC<StaffTankhaSettlementFormProps> = ({
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
  const [channel, setChannel] = useState<PaymentDestination>('PHYSICAL_CASH');
  const [notes, setNotes] = useState<string>('');
  const [printThermalReceipt, setPrintThermalReceipt] = useState<boolean>(true);
  const [showSlipModal, setShowSlipModal] = useState<boolean>(false);
  const [settling, setSettling] = useState<boolean>(false);
  const [lastSettledRecord, setLastSettledRecord] = useState<any>(null);

  const selectedStaff = staffList.find((s) => s._id === selectedStaffId);
  const monthStats = selectedStaff?.monthStats;

  const getChannelBalance = (mode: PaymentDestination): number => {
    if (mode === 'PHYSICAL_CASH') return paymentChannels.cashDrawer ?? tillBalances.physicalCash ?? 0;
    if (mode === 'BANK_ACCOUNT') return paymentChannels.bankAccount ?? tillBalances.bankAccount ?? 0;
    if (mode === 'DIGITAL_WALLET') return paymentChannels.digitalWallet ?? tillBalances.digitalWallet ?? 0;
    return 0;
  };

  const channelBalance = getChannelBalance(channel);
  const netPayable = monthStats?.netPayable ?? 0;
  const isSolvent = netPayable > 0 ? channelBalance >= netPayable : true;
  const isAlreadyPaid = monthStats?.isPaid;

  const handleSettle = async () => {
    if (!selectedStaff || !monthStats) {
      onShowToast?.('⚠️ Please select a valid staff helper.');
      return;
    }

    if (netPayable <= 0) {
      onShowToast?.('⚠️ No outstanding net payable balance for this helper.');
      return;
    }

    if (!isSolvent) {
      onShowToast?.(
        `⚠️ Insufficient funds! Available: Rs. ${channelBalance.toLocaleString()}, Net Tankha: Rs. ${netPayable.toLocaleString()}.`
      );
      return;
    }

    setSettling(true);
    try {
      const res = await dukanStaffPayrollApi.settleMonthlyPayout(selectedStaff._id, {
        month: monthStats.targetMonth,
        paymentMode: channel,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        // Sync central financial metrics
        const metricMode =
          channel === 'PHYSICAL_CASH' ? 'CASH' : channel === 'DIGITAL_WALLET' ? 'WALLET' : 'BANK';
        syncExpense(netPayable, metricMode);
        refreshMetrics();

        // Update local till balances
        if (onUpdateTillBalances) {
          let pCash = tillBalances.physicalCash;
          let dWallet = tillBalances.digitalWallet;
          let bAccount = tillBalances.bankAccount;
          if (channel === 'PHYSICAL_CASH') pCash = Math.max(0, pCash - netPayable);
          else if (channel === 'DIGITAL_WALLET') dWallet = Math.max(0, dWallet - netPayable);
          else if (channel === 'BANK_ACCOUNT') bAccount = Math.max(0, bAccount - netPayable);

          onUpdateTillBalances({
            physicalCash: pCash,
            digitalWallet: dWallet,
            bankAccount: bAccount,
            totalLiquidCapital: pCash + dWallet + bAccount,
          });
        }

        businessLogsApi.createAuditLog({
          actionType: 'STAFF_TANKHA_SETTLED',
          reason: `Monthly salary of Rs. ${netPayable} settled for ${selectedStaff.staffName} (${monthStats.targetMonth})`,
        });

        onShowToast?.(
          `✓ Tankha payout of Rs. ${netPayable.toLocaleString()} cleared for ${selectedStaff.staffName}!`
        );

        setLastSettledRecord({
          staffName: selectedStaff.staffName,
          roleTitle: selectedStaff.roleTitle,
          month: monthStats.targetMonth,
          grossEarned: monthStats.grossEarned,
          advancesDeducted: monthStats.totalAdvancesKharcha,
          netPaid: netPayable,
          paymentMode: channel,
          date: new Date().toLocaleString(),
          notes: notes.trim(),
        });

        if (printThermalReceipt) {
          setShowSlipModal(true);
        }

        setNotes('');
        onRefresh();
        onSuccess?.();
      } else {
        onShowToast?.(res.message || 'Error settling payroll');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || 'Error settling payroll';
      onShowToast?.(errMsg);
    } finally {
      setSettling(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Helper Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="people" size={16} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Helper Ka Intekhab (تنخواہ تصفیہ)</Text>
            <Text style={styles.cardSub}>Select staff member for monthly salary settlement</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffChipsRow}>
          {staffList.map((staff) => {
            const isSelected = selectedStaffId === staff._id;
            const staffNet = staff.monthStats?.netPayable || 0;
            const isPaid = staff.monthStats?.isPaid;

            return (
              <TouchableOpacity
                key={staff._id}
                style={[
                  styles.staffChip,
                  isSelected && styles.staffChipActive,
                  isPaid && styles.staffChipPaid,
                ]}
                onPress={() => setSelectedStaffId(staff._id)}
              >
                <View
                  style={[
                    styles.avatarMini,
                    isSelected && styles.avatarMiniActive,
                    isPaid && styles.avatarMiniPaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarMiniText,
                      isSelected && styles.avatarMiniTextActive,
                      isPaid && styles.avatarMiniTextPaid,
                    ]}
                  >
                    {staff.staffName.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.staffChipName, isSelected && styles.staffChipNameActive]}>
                      {staff.staffName}
                    </Text>
                    {isPaid && (
                      <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    )}
                  </View>
                  <Text style={[styles.staffChipSub, isSelected && styles.staffChipSubActive]}>
                    {isPaid ? 'ادا شدہ (Paid)' : `واجب الادا: Rs. ${staffNet.toLocaleString()}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Multi-Step Breakdown Card */}
      {selectedStaff && monthStats && (
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <View>
              <Text style={styles.breakdownTitle}>
                {selectedStaff.staffName} - ماہانہ گوشوارہ ({monthStats.targetMonth})
              </Text>
              <Text style={styles.breakdownSub}>
                {selectedStaff.roleTitle} • {selectedStaff.wageType === 'DAILY' ? 'دیہاڑی ماڈل' : 'ماہانہ تنخواہ'}
              </Text>
            </View>
            <View
              style={[
                styles.paidStatusPill,
                isAlreadyPaid ? styles.paidStatusPillPaid : styles.paidStatusPillPending,
              ]}
            >
              <Text
                style={[
                  styles.paidStatusText,
                  isAlreadyPaid ? styles.paidStatusTextPaid : styles.paidStatusTextPending,
                ]}
              >
                {isAlreadyPaid ? 'ادا شدہ (PAID)' : 'غیر ادا شدہ (UNPAID)'}
              </Text>
            </View>
          </View>

          {/* Step 1: Gross Earned */}
          <View style={styles.stepRow}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Gross Earnings (کل حاصل کردہ اجرت)</Text>
              <Text style={styles.stepSub}>
                {monthStats.totalEffectiveDays} days worked @ Rs. {monthStats.dailyRate.toLocaleString()}/day
                {selectedStaff.wageType === 'MONTHLY' && ` (Base: Rs. ${selectedStaff.baseRate.toLocaleString()})`}
              </Text>
            </View>
            <Text style={styles.stepAmountGreen}>+Rs. {monthStats.grossEarned.toLocaleString()}</Text>
          </View>

          {/* Step 2: Accumulated Advances Deduction */}
          <View style={styles.stepRow}>
            <View style={[styles.stepNumberBadge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.stepNumberText, { color: '#DC2626' }]}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Advances & Deductions (پیشگی و چائے خرچہ)</Text>
              <Text style={styles.stepSub}>
                Accumulated mid-month kharcha & food expenses
              </Text>
            </View>
            <Text style={styles.stepAmountRed}>
              -Rs. {monthStats.totalAdvancesKharcha.toLocaleString()}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.dashedDivider} />

          {/* Net Payable Highlight */}
          <View style={styles.netPayableRow}>
            <View style={[styles.stepNumberBadge, { backgroundColor: '#EEF2FF' }]}>
              <Text style={[styles.stepNumberText, { color: '#4F46E5' }]}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.netPayableTitle}>Khaliq Net Tankha (صافی واجب الادا رقم)</Text>
              <Text style={styles.netPayableSub}>Step 1 Gross - Step 2 Deductions</Text>
            </View>
            <Text style={styles.netPayableAmount}>Rs. {netPayable.toLocaleString()}</Text>
          </View>
        </View>
      )}

      {/* 3. Payment Channel Selector with Solvency Check */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="wallet-outline" size={16} color="#0284C7" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Payment Channel (ادائیگی اکاؤنٹ)</Text>
            <Text style={styles.cardSub}>Account from which net salary will be debited</Text>
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

        {/* Solvency Alert */}
        {!isSolvent && (
          <View style={styles.solvencyWarning}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.solvencyWarningText}>
              ⚠️ ناکافی بیلنس: منتخب کھاتہ میں صرف Rs. {channelBalance.toLocaleString()} دستیاب ہیں۔ درکار تنخواہ: Rs. {netPayable.toLocaleString()}۔
            </Text>
          </View>
        )}
      </View>

      {/* Thermal Receipt Print Toggle */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setPrintThermalReceipt(!printThermalReceipt)}
        >
          <View style={styles.toggleIconCircle}>
            <Ionicons name="print" size={18} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>
              Thermal Receipt Slip (تنخواہ پرچی نکالیں)
            </Text>
            <Text style={styles.toggleSub}>
              Generate signed 58mm/80mm salary slip on settlement
            </Text>
          </View>
          <View
            style={[
              styles.switchTrack,
              printThermalReceipt && styles.switchTrackActive,
            ]}
          >
            <View
              style={[
                styles.switchThumb,
                printThermalReceipt && styles.switchThumbActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Remarks Note */}
      <View style={styles.card}>
        <Text style={styles.label}>Settlement Remarks (اختیاری نوٹ)</Text>
        <TextInput
          style={styles.noteInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="مثلاً: ماہانہ تنخواہ مکمل ادا، عید بونس بعد میں ملے گا..."
          placeholderTextColor="#94A3B8"
        />
      </View>

      {/* Settle Action Button */}
      <TouchableOpacity
        style={[
          styles.settleBtn,
          (!isSolvent || settling || netPayable <= 0 || isAlreadyPaid) &&
            styles.settleBtnDisabled,
        ]}
        disabled={!isSolvent || settling || netPayable <= 0 || isAlreadyPaid}
        onPress={handleSettle}
      >
        {settling ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            <Text style={styles.settleBtnText}>
              {isAlreadyPaid
                ? 'ماہانہ تنخواہ پہلے سے ادا شدہ ہے'
                : `تنخواہ مکمل ادا کریں (Pay Rs. ${netPayable.toLocaleString()})`}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Thermal Slip Preview Modal */}
      <Modal visible={showSlipModal} transparent animationType="slide">
        <View style={styles.slipOverlay}>
          <View style={styles.slipCard}>
            <View style={styles.slipHeader}>
              <Ionicons name="receipt-outline" size={28} color="#0F172A" />
              <Text style={styles.slipStoreName}>DIGI HISAB POS</Text>
              <Text style={styles.slipStoreSub}>*** STAFF SALARY VOUCHER ***</Text>
              <Text style={styles.slipStoreSub}>ملازم تنخواہ رسید</Text>
            </View>

            <View style={styles.slipDottedLine} />

            {lastSettledRecord && (
              <View style={styles.slipBody}>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Date / Time:</Text>
                  <Text style={styles.slipValue}>{lastSettledRecord.date}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Helper Name:</Text>
                  <Text style={styles.slipValue}>{lastSettledRecord.staffName}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Role / Designation:</Text>
                  <Text style={styles.slipValue}>{lastSettledRecord.roleTitle}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Cycle Month:</Text>
                  <Text style={styles.slipValue}>{lastSettledRecord.month}</Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Gross Earned:</Text>
                  <Text style={styles.slipValue}>
                    Rs. {lastSettledRecord.grossEarned.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Advances Deducted:</Text>
                  <Text style={styles.slipValue}>
                    -Rs. {lastSettledRecord.advancesDeducted.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.slipDottedLine} />
                <View style={styles.slipRow}>
                  <Text style={[styles.slipLabel, { fontWeight: '800' }]}>NET PAID:</Text>
                  <Text style={[styles.slipValue, { fontWeight: '800', fontSize: 16 }]}>
                    Rs. {lastSettledRecord.netPaid.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.slipRow}>
                  <Text style={styles.slipLabel}>Payment Method:</Text>
                  <Text style={styles.slipValue}>{lastSettledRecord.paymentMode}</Text>
                </View>
                {lastSettledRecord.notes ? (
                  <View style={styles.slipRow}>
                    <Text style={styles.slipLabel}>Remarks:</Text>
                    <Text style={styles.slipValue}>{lastSettledRecord.notes}</Text>
                  </View>
                ) : null}

                <View style={{ marginTop: 24, alignItems: 'center' }}>
                  <View style={{ width: '80%', height: 1, backgroundColor: '#CBD5E1', marginBottom: 6 }} />
                  <Text style={{ fontSize: 11, color: '#64748B' }}>
                    Helper Signature (دستخط ملازم)
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeSlipBtn}
              onPress={() => setShowSlipModal(false)}
            >
              <Text style={styles.closeSlipBtnText}>Close Receipt (بند کریں)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#EEF2FF',
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
  staffChipPaid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
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
  avatarMiniPaid: {
    backgroundColor: '#059669',
  },
  avatarMiniText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  avatarMiniTextActive: {
    color: '#FFFFFF',
  },
  avatarMiniTextPaid: {
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
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    marginBottom: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  breakdownSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  paidStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidStatusPillPaid: {
    backgroundColor: '#DCFCE7',
  },
  paidStatusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  paidStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paidStatusTextPaid: {
    color: '#15803D',
  },
  paidStatusTextPending: {
    color: '#B45309',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stepNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  stepSub: {
    fontSize: 10,
    color: '#64748B',
  },
  stepAmountGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  stepAmountRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  dashedDivider: {
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  netPayableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  netPayableTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  netPayableSub: {
    fontSize: 10,
    color: '#64748B',
  },
  netPayableAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748B',
  },
  switchTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#CBD5E1',
    padding: 2,
    justifyContent: 'center',
  },
  switchTrackActive: {
    backgroundColor: '#4F46E5',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
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
  settleBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  settleBtnDisabled: {
    opacity: 0.5,
  },
  settleBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  slipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  slipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  slipHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  slipStoreName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
  },
  slipStoreSub: {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 1,
    marginTop: 2,
  },
  slipDottedLine: {
    borderWidth: 0.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  slipBody: {
    gap: 6,
  },
  slipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slipLabel: {
    fontSize: 12,
    color: '#475569',
  },
  slipValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeSlipBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeSlipBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
