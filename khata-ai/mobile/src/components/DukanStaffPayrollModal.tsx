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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { dukanStaffPayrollApi, IDukanStaff } from '../api/dukanStaffPayroll.api';
import { ITillBalances } from '../api/cashDrawer.api';
import { profileApi, IPaymentChannels } from '../api/profile.api';
import { useFinancialMetrics } from '../context/FinancialMetricsContext';

import { StaffAttendanceForm } from './staff/StaffAttendanceForm';
import { StaffAdvanceKharchaForm } from './staff/StaffAdvanceKharchaForm';
import { StaffTankhaSettlementForm } from './staff/StaffTankhaSettlementForm';
import { NewStaffOnboardingForm } from './staff/NewStaffOnboardingForm';

interface DukanStaffPayrollModalProps {
  visible: boolean;
  onClose: () => void;
  tillBalances: ITillBalances;
  userRole?: 'OWNER' | 'MANAGER' | 'CASHIER';
  isOwner?: boolean;
  onUpdateTillBalances?: (updated: ITillBalances) => void;
  onShowToast?: (msg: string) => void;
}

type StaffTab = 'HAZRI' | 'KHARCHA' | 'SETTLEMENT' | 'NEW_HELPER';

export const DukanStaffPayrollModal: React.FC<DukanStaffPayrollModalProps> = ({
  visible,
  onClose,
  tillBalances,
  userRole,
  isOwner = true,
  onUpdateTillBalances,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const { refreshMetrics } = useFinancialMetrics();
  const [activeTab, setActiveTab] = useState<StaffTab>('HAZRI');
  const [staffList, setStaffList] = useState<IDukanStaff[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [paymentChannels, setPaymentChannels] = useState<IPaymentChannels>({
    cashDrawer: tillBalances?.physicalCash || 0,
    bankAccount: tillBalances?.bankAccount || 0,
    digitalWallet: tillBalances?.digitalWallet || 0,
  });

  const fetchChannels = async () => {
    try {
      const prof = await profileApi.getProfile();
      if (prof.paymentChannels) {
        setPaymentChannels(prof.paymentChannels);
      }
    } catch (e) {}
  };

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const res = await dukanStaffPayrollApi.getStaffList();
      if (res.success && res.data) {
        setStaffList(res.data);
      }
    } catch (e) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchStaffData();
      fetchChannels();
    }
  }, [visible]);

  // Recalculate summary metrics dynamically
  const totalHelpers = staffList.length;
  const rozanaKharchaTotal = staffList.reduce(
    (acc, s) => acc + (s.monthStats?.totalAdvancesKharcha || 0),
    0
  );
  const netPayableTotal = staffList.reduce(
    (acc, s) => acc + (s.monthStats?.netPayable || 0),
    0
  );

  const handleDataRefresh = () => {
    fetchStaffData();
    fetchChannels();
    refreshMetrics();
  };

  const isAccessDenied = !isOwner || (userRole && userRole === 'CASHIER');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {isAccessDenied ? (
            <View style={styles.accessDeniedCard}>
              <View style={styles.lockIconCircle}>
                <Ionicons name="lock-closed" size={32} color="#E11D48" />
              </View>
              <Text style={styles.lockTitle}>🔒 Access Restricted (صرف مالک دکان)</Text>
              <Text style={styles.lockDesc}>
                Staff payroll, attendance marking, and salary payouts are strictly restricted to the primary Shop Owner (مالک دکان). Cashier accounts cannot view or modify staff salary records.
              </Text>
              <TouchableOpacity style={styles.closeLockedBtn} onPress={onClose}>
                <Text style={styles.closeLockedBtnText}>Close (بند کریں)</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.contentContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.headerIconCircle}>
                    <Ionicons name="people" size={20} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Staff Tankha & Attendance</Text>
                    <Text style={styles.headerSubtitle}>ملازمین حاضری، روزانہ خرچہ و تنخواہ کھاتہ</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.refreshIconBtn}
                    onPress={handleDataRefresh}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                      <Ionicons name="refresh" size={18} color="#64748B" />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <Ionicons name="close" size={22} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Summary Stats Banner */}
              <View style={styles.summaryStatsBanner}>
                {/* 1. Total Active Helpers */}
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>کل ملازمین (Helpers)</Text>
                  <Text style={styles.statValue}>{totalHelpers}</Text>
                  <Text style={styles.statSub}>Active Workers</Text>
                </View>

                <View style={styles.statDivider} />

                {/* 2. Rozana Kharcha & Advances Total */}
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>پیشگی خرچہ (Advances)</Text>
                  <Text style={[styles.statValue, { color: '#D97706' }]}>
                    Rs. {rozanaKharchaTotal.toLocaleString()}
                  </Text>
                  <Text style={styles.statSub}>Deductions Logged</Text>
                </View>

                <View style={styles.statDivider} />

                {/* 3. Net Payable Total */}
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>صافی واجب الادا (Net)</Text>
                  <Text style={[styles.statValue, { color: '#4F46E5' }]}>
                    Rs. {netPayableTotal.toLocaleString()}
                  </Text>
                  <Text style={styles.statSub}>Pending Salary</Text>
                </View>
              </View>

              {/* 4-Tab Segmented Navigation Bar */}
              <View style={styles.segmentedTabBarWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.segmentedTabBar}
                >
                  <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'HAZRI' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('HAZRI')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="calendar"
                      size={14}
                      color={activeTab === 'HAZRI' ? '#FFFFFF' : '#4F46E5'}
                    />
                    <Text
                      style={[styles.tabButtonText, activeTab === 'HAZRI' && styles.tabButtonTextActive]}
                      numberOfLines={1}
                    >
                      1. Hazri (حاضری)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'KHARCHA' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('KHARCHA')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="cash"
                      size={14}
                      color={activeTab === 'KHARCHA' ? '#FFFFFF' : '#059669'}
                    />
                    <Text
                      style={[styles.tabButtonText, activeTab === 'KHARCHA' && styles.tabButtonTextActive]}
                      numberOfLines={1}
                    >
                      2. Kharcha (خرچہ)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'SETTLEMENT' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('SETTLEMENT')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="receipt"
                      size={14}
                      color={activeTab === 'SETTLEMENT' ? '#FFFFFF' : '#6366F1'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        activeTab === 'SETTLEMENT' && styles.tabButtonTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      3. Tankha (تصفیہ)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'NEW_HELPER' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('NEW_HELPER')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="person-add"
                      size={14}
                      color={activeTab === 'NEW_HELPER' ? '#FFFFFF' : '#0284C7'}
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        activeTab === 'NEW_HELPER' && styles.tabButtonTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      4. + Naya Helper
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Scrollable Sub-Form Mount Area */}
              <ScrollView showsVerticalScrollIndicator={false} style={styles.formContentScroll}>
                {loading && staffList.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading staff records...</Text>
                  </View>
                ) : (
                  <>
                    {/* Form 1: Daily Attendance & Past Days Catch-up */}
                    {activeTab === 'HAZRI' && (
                      <StaffAttendanceForm
                        staffList={staffList}
                        onRefresh={handleDataRefresh}
                        onShowToast={onShowToast}
                      />
                    )}

                    {/* Form 2: Rozana Kharcha & Advance Disbursement */}
                    {activeTab === 'KHARCHA' && (
                      <StaffAdvanceKharchaForm
                        staffList={staffList}
                        paymentChannels={paymentChannels}
                        tillBalances={tillBalances}
                        onRefresh={handleDataRefresh}
                        onUpdateTillBalances={onUpdateTillBalances}
                        onShowToast={onShowToast}
                        onSuccess={() => setActiveTab('HAZRI')}
                      />
                    )}

                    {/* Form 3: Tankha Settlement */}
                    {activeTab === 'SETTLEMENT' && (
                      <StaffTankhaSettlementForm
                        staffList={staffList}
                        paymentChannels={paymentChannels}
                        tillBalances={tillBalances}
                        onRefresh={handleDataRefresh}
                        onUpdateTillBalances={onUpdateTillBalances}
                        onShowToast={onShowToast}
                        onSuccess={() => setActiveTab('HAZRI')}
                      />
                    )}

                    {/* Form 4: New Staff Onboarding */}
                    {activeTab === 'NEW_HELPER' && (
                      <NewStaffOnboardingForm
                        onRefresh={handleDataRefresh}
                        onShowToast={onShowToast}
                        onSuccess={() => setActiveTab('HAZRI')}
                      />
                    )}
                  </>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: '100%',
    maxHeight: '94%',
    minHeight: '75%',
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  refreshIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStatsBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  statSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  segmentedTabBarWrapper: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segmentedTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    flexShrink: 0,
    minHeight: 38,
  },
  tabButtonActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  formContentScroll: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  accessDeniedCard: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 340,
  },
  lockIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  closeLockedBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  closeLockedBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
