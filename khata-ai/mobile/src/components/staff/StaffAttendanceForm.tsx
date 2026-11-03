import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dukanStaffPayrollApi, IDukanStaff } from '../../api/dukanStaffPayroll.api';

interface StaffAttendanceFormProps {
  staffList: IDukanStaff[];
  onRefresh: () => void;
  onShowToast?: (msg: string) => void;
}

type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'LEAVE';

export const StaffAttendanceForm: React.FC<StaffAttendanceFormProps> = ({
  staffList,
  onRefresh,
  onShowToast,
}) => {
  const todayStr = new Date().toISOString().substring(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceDraft, setAttendanceDraft] = useState<{ [staffId: string]: AttendanceStatus }>({});
  const [saving, setSaving] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Initialize draft states based on existing records for selected date
  useEffect(() => {
    const draft: { [staffId: string]: AttendanceStatus } = {};
    staffList.forEach((staff) => {
      const record = staff.attendanceRecords?.find((r) => r.date === selectedDate);
      if (record) {
        draft[staff._id] = record.status;
      }
    });
    setAttendanceDraft(draft);
  }, [selectedDate, staffList]);

  // Compute unmarked days count across all staff for the current month
  const totalUnmarkedDays = staffList.reduce(
    (acc, s) => acc + (s.monthStats?.unmarkedDays || 0),
    0
  );

  const calculateDailyPreview = (staff: IDukanStaff, status?: AttendanceStatus) => {
    const currentMonth = selectedDate.substring(0, 7);
    const [y, m] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate() || 30;
    const dailyRate = staff.wageType === 'DAILY' ? staff.baseRate : Math.round(staff.baseRate / daysInMonth);

    if (status === 'PRESENT') return dailyRate;
    if (status === 'HALF_DAY') return Math.round(dailyRate * 0.5);
    return 0;
  };

  const setStaffStatus = (staffId: string, status: AttendanceStatus) => {
    setAttendanceDraft((prev) => ({
      ...prev,
      [staffId]: status,
    }));
  };

  const handleSaveAll = async () => {
    const records = Object.keys(attendanceDraft).map((staffId) => ({
      staffId,
      status: attendanceDraft[staffId],
    }));

    if (records.length === 0) {
      onShowToast?.('⚠️ Please mark attendance for at least one staff member.');
      return;
    }

    setSaving(true);
    try {
      const res = await dukanStaffPayrollApi.bulkMarkAttendance(selectedDate, records);
      if (res.success) {
        onShowToast?.(`✓ Attendance saved for ${records.length} staff member(s) (${selectedDate})!`);
        onRefresh();
      } else {
        onShowToast?.(res.message || 'Error saving attendance');
      }
    } catch (e: any) {
      onShowToast?.(e.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkCatchup = async (status: 'PRESENT' | 'ABSENT') => {
    setBulkLoading(true);
    try {
      const targetMonth = selectedDate.substring(0, 7);
      const res = await dukanStaffPayrollApi.autoMarkUnmarked('ALL', targetMonth, status);
      if (res.success) {
        onShowToast?.(`✓ Bulk catch-up: Unmarked days filled as ${status}!`);
        setBulkModalVisible(false);
        onRefresh();
      } else {
        onShowToast?.(res.message || 'Bulk catch-up failed');
      }
    } catch (e: any) {
      onShowToast?.(e.message || 'Failed bulk catchup');
    } finally {
      setBulkLoading(false);
    }
  };

  // Generate quick date options (Today, Yesterday, -2, -3 days)
  const getQuickDates = () => {
    const list: { label: string; sub: string; date: string }[] = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      let label = 'Today';
      let sub = 'آج';
      if (i === 1) {
        label = 'Yesterday';
        sub = 'گزشتہ کل';
      } else if (i === 2) {
        label = '-2 Days';
        sub = '2 دن پہلے';
      } else if (i === 3) {
        label = '-3 Days';
        sub = '3 دن پہلے';
      }
      list.push({ label, sub, date: dateStr });
    }
    return list;
  };

  return (
    <View style={styles.container}>
      {/* 1. Date Selector with Quick Back-Dating Buttons */}
      <View style={styles.dateSelectorCard}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="calendar" size={16} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Tareekh Ka Intekhab (حاضری تاریخ)</Text>
            <Text style={styles.sectionSub}>Select date for daily presence verification</Text>
          </View>
          <View style={styles.activeDateBadge}>
            <Text style={styles.activeDateText}>{selectedDate}</Text>
          </View>
        </View>

        <View style={styles.dateChipsRow}>
          {getQuickDates().map((item) => {
            const isSelected = selectedDate === item.date;
            return (
              <TouchableOpacity
                key={item.date}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate(item.date)}
              >
                <Text style={[styles.dateChipLabel, isSelected && styles.dateChipLabelActive]}>
                  {item.label}
                </Text>
                <Text style={[styles.dateChipSub, isSelected && styles.dateChipSubActive]}>
                  {item.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. Unmarked Days Notice Banner */}
      {totalUnmarkedDays > 0 && (
        <View style={styles.unmarkedNoticeCard}>
          <View style={styles.noticeIconCircle}>
            <Ionicons name="alert-circle" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>
              Unmarked Past Days Notice ({totalUnmarkedDays} غیر نشان شدہ دن)
            </Text>
            <Text style={styles.noticeSub}>
              Past dates are pending attendance. Use 1-click bulk fill to prevent salary calculation delays.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bulkCatchupBtn}
            onPress={() => setBulkModalVisible(true)}
          >
            <Ionicons name="flash" size={14} color="#FFFFFF" />
            <Text style={styles.bulkCatchupBtnText}>تمام پر لگائیں</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Helper List with 1-Click Status Buttons & Real-Time Daily Wage Preview */}
      <View style={styles.helperSectionHeader}>
        <Text style={styles.helperListTitle}>Dukan Helpers ({staffList.length})</Text>
        <Text style={styles.helperListSub}>حاضری اسٹیٹس منتخب کریں</Text>
      </View>

      {staffList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={38} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No Helpers Registered Yet</Text>
          <Text style={styles.emptySub}>Switch to "+ Naya Helper" tab to register staff.</Text>
        </View>
      ) : (
        <View style={styles.staffCardsWrapper}>
          {staffList.map((staff) => {
            const currentStatus = attendanceDraft[staff._id];
            const previewWage = calculateDailyPreview(staff, currentStatus);

            return (
              <View key={staff._id} style={styles.staffAttendanceCard}>
                {/* Staff Header Info */}
                <View style={styles.staffCardHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {staff.staffName.substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.staffNameText}>{staff.staffName}</Text>
                      <View style={styles.wageTypeBadge}>
                        <Text style={styles.wageTypeBadgeText}>
                          {staff.wageType === 'DAILY' ? 'روزانہ' : 'ماہانہ'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.roleSubText}>
                      {staff.roleTitle} • Rs. {staff.baseRate.toLocaleString()}/
                      {staff.wageType === 'DAILY' ? 'day' : 'mo'}
                    </Text>
                  </View>

                  {/* Real-Time Wage Preview Pill */}
                  <View
                    style={[
                      styles.previewWagePill,
                      currentStatus === 'PRESENT' && styles.wagePillPresent,
                      currentStatus === 'HALF_DAY' && styles.wagePillHalf,
                      currentStatus === 'ABSENT' && styles.wagePillAbsent,
                    ]}
                  >
                    <Text style={styles.previewWageLabel}>آج کی دیہاڑی</Text>
                    <Text style={styles.previewWageValue}>Rs. {previewWage.toLocaleString()}</Text>
                  </View>
                </View>

                {/* 1-Click State Buttons */}
                <View style={styles.statusButtonGroup}>
                  {/* PRESENT */}
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      styles.presentButton,
                      currentStatus === 'PRESENT' && styles.presentButtonActive,
                    ]}
                    onPress={() => setStaffStatus(staff._id, 'PRESENT')}
                  >
                    <Ionicons
                      name={currentStatus === 'PRESENT' ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={16}
                      color={currentStatus === 'PRESENT' ? '#FFFFFF' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.statusButtonText,
                        styles.presentButtonText,
                        currentStatus === 'PRESENT' && styles.statusTextActive,
                      ]}
                    >
                      حاضر (Present)
                    </Text>
                  </TouchableOpacity>

                  {/* HALF DAY */}
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      styles.halfDayButton,
                      currentStatus === 'HALF_DAY' && styles.halfDayButtonActive,
                    ]}
                    onPress={() => setStaffStatus(staff._id, 'HALF_DAY')}
                  >
                    <Ionicons
                      name={currentStatus === 'HALF_DAY' ? 'time' : 'time-outline'}
                      size={16}
                      color={currentStatus === 'HALF_DAY' ? '#FFFFFF' : '#D97706'}
                    />
                    <Text
                      style={[
                        styles.statusButtonText,
                        styles.halfDayButtonText,
                        currentStatus === 'HALF_DAY' && styles.statusTextActive,
                      ]}
                    >
                      آدھا دن (Half)
                    </Text>
                  </TouchableOpacity>

                  {/* ABSENT */}
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      styles.absentButton,
                      currentStatus === 'ABSENT' && styles.absentButtonActive,
                    ]}
                    onPress={() => setStaffStatus(staff._id, 'ABSENT')}
                  >
                    <Ionicons
                      name={currentStatus === 'ABSENT' ? 'close-circle' : 'close-circle-outline'}
                      size={16}
                      color={currentStatus === 'ABSENT' ? '#FFFFFF' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.statusButtonText,
                        styles.absentButtonText,
                        currentStatus === 'ABSENT' && styles.statusTextActive,
                      ]}
                    >
                      چھٹی (Absent)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 4. Action Save Button */}
      {staffList.length > 0 && (
        <TouchableOpacity
          style={[styles.saveAllBtn, saving && styles.saveAllBtnDisabled]}
          disabled={saving}
          onPress={handleSaveAll}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save" size={18} color="#FFFFFF" />
              <Text style={styles.saveAllBtnText}>حاضری محفوظ کریں (Save Attendance)</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Bulk Catch-Up Modal */}
      <Modal visible={bulkModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.bulkModalCard}>
            <View style={styles.bulkModalHeader}>
              <View style={styles.noticeIconCircle}>
                <Ionicons name="flash" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bulkModalTitle}>بیک لاگ حاضری (Bulk Catch-up)</Text>
                <Text style={styles.bulkModalSub}>
                  Fill all unmarked days in {selectedDate.substring(0, 7)} automatically.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.bulkModalBody}>
              <TouchableOpacity
                style={[styles.bulkOptionBtn, styles.bulkOptionPresent]}
                disabled={bulkLoading}
                onPress={() => handleBulkCatchup('PRESENT')}
              >
                <Ionicons name="checkmark-done-circle" size={22} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bulkOptionTitle}>تمام غیر حاضر ایام "حاضر" کریں</Text>
                  <Text style={styles.bulkOptionDesc}>Mark all unmarked days as Present (معمول کے کام کے دن)</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bulkOptionBtn, styles.bulkOptionAbsent]}
                disabled={bulkLoading}
                onPress={() => handleBulkCatchup('ABSENT')}
              >
                <Ionicons name="close-circle" size={22} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bulkOptionTitle}>تمام غیر حاضر ایام "چھٹی" کریں</Text>
                  <Text style={styles.bulkOptionDesc}>Mark all unmarked days as Absent (تنخواہ منہا ہوگی)</Text>
                </View>
              </TouchableOpacity>
            </View>

            {bulkLoading && (
              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  Updating attendance records...
                </Text>
              </View>
            )}
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
  dateSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sectionHeaderRow: {
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
  },
  activeDateBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  activeDateText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
  },
  dateChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dateChipLabelActive: {
    color: '#FFFFFF',
  },
  dateChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  dateChipSubActive: {
    color: '#E0E7FF',
  },
  unmarkedNoticeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  noticeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  noticeSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  bulkCatchupBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkCatchupBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  helperSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  helperListTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helperListSub: {
    fontSize: 11,
    color: '#64748B',
  },
  staffCardsWrapper: {
    gap: 10,
  },
  staffAttendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  staffNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  wageTypeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wageTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  roleSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  previewWagePill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wagePillPresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  wagePillHalf: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  wagePillAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  previewWageLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  previewWageValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  presentButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  presentButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#047857',
  },
  halfDayButton: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  halfDayButtonActive: {
    backgroundColor: '#D97706',
    borderColor: '#B45309',
  },
  absentButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  absentButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presentButtonText: {
    color: '#059669',
  },
  halfDayButtonText: {
    color: '#D97706',
  },
  absentButtonText: {
    color: '#DC2626',
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
  saveAllBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  saveAllBtnDisabled: {
    opacity: 0.6,
  },
  saveAllBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  bulkModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 440,
  },
  bulkModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  bulkModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  bulkModalSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  bulkModalBody: {
    gap: 10,
  },
  bulkOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bulkOptionPresent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  bulkOptionAbsent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bulkOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  bulkOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
