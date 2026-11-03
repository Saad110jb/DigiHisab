import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  domesticAuditApi,
  IDomesticUnifiedRecord,
  IDomesticAuditLogItem,
  DomesticModuleType,
} from '../api/domesticAudit.api';

export interface DomesticAuditAndCorrectionModalProps {
  visible: boolean;
  onClose: () => void;
  onRefreshParent?: () => void;
}

const CATEGORY_FILTERS: Array<{ key: string; labelUrdu: string }> = [
  { key: 'ALL', labelUrdu: 'تمام (All)' },
  { key: 'UTILITY', labelUrdu: 'یوٹیلیٹی بلز' },
  { key: 'STAFF', labelUrdu: 'ملازمین تنخواہ' },
  { key: 'KAMETI', labelUrdu: 'کمیٹی / بی سی' },
  { key: 'SCHOOL_FEE', labelUrdu: 'اسکول فیس' },
];

export const DomesticAuditAndCorrectionModal: React.FC<DomesticAuditAndCorrectionModalProps> = ({
  visible,
  onClose,
  onRefreshParent,
}) => {
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'RECORDS' | 'TRAIL' | 'RECONCILE'>('RECORDS');
  const [loading, setLoading] = useState(false);

  // Records Tab State
  const [records, setRecords] = useState<IDomesticUnifiedRecord[]>([]);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Audit Trail State
  const [auditLogs, setAuditLogs] = useState<IDomesticAuditLogItem[]>([]);

  // Edit Sheet State
  const [editingRecord, setEditingRecord] = useState<IDomesticUnifiedRecord | null>(null);
  const [editAmountInput, setEditAmountInput] = useState('');
  const [editReasonInput, setEditReasonInput] = useState('');
  const [editNotesInput, setEditNotesInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Vault Reconciler State
  const [physicalCountInput, setPhysicalCountInput] = useState('');
  const [reconcileNotes, setReconcileNotes] = useState('ماہانہ نقد گنتی و تصدیق');
  const [reconciling, setReconciling] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'RECORDS') {
        const data = await domesticAuditApi.getAllRecords({
          module: selectedModuleFilter,
          searchQuery: searchQuery.trim(),
        });
        setRecords(data);
      } else if (activeTab === 'TRAIL') {
        const logs = await domesticAuditApi.getAuditTrail({
          module: selectedModuleFilter,
        });
        setAuditLogs(logs);
      }
    } catch (err: any) {
      console.error('[DomesticAuditModal] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedModuleFilter, searchQuery]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, activeTab, selectedModuleFilter, loadData]);

  // Handle Search Input Change
  const handleSearchSubmit = () => {
    loadData();
  };

  // Open Edit Sheet
  const handleStartEdit = (record: IDomesticUnifiedRecord) => {
    setEditingRecord(record);
    setEditAmountInput(record.amount.toString());
    setEditReasonInput('');
    setEditNotesInput(record.notes || '');
  };

  // Execute Record Update
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    const newAmt = parseFloat(editAmountInput);
    if (isNaN(newAmt) || newAmt <= 0) {
      Alert.alert('غلط رقم', 'برائے مہربانی درست نئی رقم درج کریں۔');
      return;
    }
    if (!editReasonInput.trim()) {
      Alert.alert('ترمیم کی وجہ درکار ہے', 'برائے مہربانی تبدیلی کی وجہ لازمی لکھیں (مثلاً بل اوور چارج ہوا تھا)۔');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await domesticAuditApi.updateRecord({
        module: editingRecord.module,
        recordId: editingRecord.id,
        subRecordId: editingRecord.rawDoc?.subRecordId,
        newAmount: newAmt,
        newNotes: editNotesInput,
        reasonUrdu: editReasonInput.trim(),
      });

      Alert.alert('✅ تصحیح مکمل', res.rebalanceMessageUrdu);
      setEditingRecord(null);
      loadData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      Alert.alert('خطا', err.response?.data?.message || err.message || 'ریکارڈ اپڈیٹ نہ ہو سکا۔');
    } finally {
      setSavingEdit(false);
    }
  };

  // Execute Record Deletion
  const handleDeleteRecord = async () => {
    if (!editingRecord) return;
    Alert.alert(
      '⚠️ ریکارڈ خارج کریں؟',
      `کیا آپ واقعی یہ ریکارڈ خارج کر کے اس کی رقم والٹ میں واپس جمع کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ کریں', style: 'cancel' },
        {
          text: 'ہاں، خارج کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingEdit(true);
              const res = await domesticAuditApi.deleteRecord({
                module: editingRecord.module,
                recordId: editingRecord.id,
                subRecordId: editingRecord.rawDoc?.subRecordId,
                reasonUrdu: editReasonInput.trim() || 'غلط یا ڈپلیکیٹ اندراج خارج کیا گیا۔',
              });

              Alert.alert('🗑️ ریکارڈ خارج', res.messageUrdu);
              setEditingRecord(null);
              loadData();
              if (onRefreshParent) onRefreshParent();
            } catch (err: any) {
              Alert.alert('خطا', err.message || 'ریکارڈ خارج نہیں ہو سکا۔');
            } finally {
              setSavingEdit(false);
            }
          },
        },
      ]
    );
  };

  // 1-Tap Revert of Audit Log
  const handleRevertLog = async (logId: string) => {
    Alert.alert(
      'تبدیلی واپس لائیں؟ (Revert)',
      'کیا آپ اس پچھلی ترمیم کو منسوخ کر کے رقم اور ریکارڈ کو پرانی حالت پر واپس لانا چاہتے ہیں؟',
      [
        { text: 'نہیں', style: 'cancel' },
        {
          text: 'ہاں، ریورٹ کریں',
          onPress: async () => {
            try {
              const res = await domesticAuditApi.revertAuditLog(logId, 'سربراہ خانہ نے تبدیلی ریورٹ کی۔');
              Alert.alert('✅ کامیابی', res.messageUrdu);
              loadData();
              if (onRefreshParent) onRefreshParent();
            } catch (err: any) {
              Alert.alert('خطا', err.message || 'ریورٹ نہیں ہو سکا۔');
            }
          },
        },
      ]
    );
  };

  // Execute Vault Physical Count Reconciliation
  const handleReconcileVault = async () => {
    const physicalAmt = parseFloat(physicalCountInput);
    if (isNaN(physicalAmt) || physicalAmt < 0) {
      Alert.alert('غلط رقم', 'برائے مہربانی گنی ہوئی نقد رقم درج کریں۔');
      return;
    }

    try {
      setReconciling(true);
      const res = await domesticAuditApi.reconcileVault({
        vaultAccountId: 'default_cash_safe',
        physicalCountAmount: physicalAmt,
        notesUrdu: reconcileNotes.trim(),
      });

      Alert.alert('✅ مفاہمت مکمل', res.messageUrdu);
      setPhysicalCountInput('');
      setActiveTab('TRAIL');
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      Alert.alert('خطا', err.message || 'مفاہمت ریکارڈ نہیں ہو سکی۔');
    } finally {
      setReconciling(false);
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'UTILITY':
        return 'flash-outline';
      case 'STAFF':
        return 'people-outline';
      case 'KAMETI':
        return 'sync-outline';
      case 'SCHOOL_FEE':
        return 'school-outline';
      default:
        return 'receipt-outline';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={20} color="#00d49f" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.modalHeadingUrdu}>گھریلو آڈٹ لاگ اور ڈیٹا تصحیح</Text>
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>شفاف کھاتہ</Text>
                  </View>
                </View>
                <Text style={styles.modalHeadingEn}>Household Audit Trail & Data Correction Hub</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Segmented Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'RECORDS' && styles.tabItemActive]}
              onPress={() => setActiveTab('RECORDS')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={activeTab === 'RECORDS' ? '#00d49f' : '#64748B'}
              />
              <Text style={[styles.tabLabel, activeTab === 'RECORDS' && styles.tabLabelActive]}>
                تمام ریکارڈز و تصحیح
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'TRAIL' && styles.tabItemActive]}
              onPress={() => setActiveTab('TRAIL')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={activeTab === 'TRAIL' ? '#00d49f' : '#64748B'}
              />
              <Text style={[styles.tabLabel, activeTab === 'TRAIL' && styles.tabLabelActive]}>
                آڈٹ لاگ تاریخچہ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'RECONCILE' && styles.tabItemActive]}
              onPress={() => setActiveTab('RECONCILE')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="cash-outline"
                size={16}
                color={activeTab === 'RECONCILE' ? '#00d49f' : '#64748B'}
              />
              <Text style={[styles.tabLabel, activeTab === 'RECONCILE' && styles.tabLabelActive]}>
                نقد گنتی مفاہمت
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: ALL RECORDS & CORRECTION */}
          {activeTab === 'RECORDS' && (
            <View style={{ flex: 1 }}>
              {/* Search & Filter Bar */}
              <View style={styles.searchBarWrap}>
                <View style={styles.searchInputBox}>
                  <Ionicons name="search" size={16} color="#64748B" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="تلاش کریں: رقم، بل یا ملازم کا نام..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearchSubmit}
                  />
                  {Boolean(searchQuery) && (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        loadData();
                      }}
                    >
                      <Ionicons name="close-circle" size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Category Pills */}
              <View style={styles.filterScrollWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16 }}>
                  {CATEGORY_FILTERS.map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[
                        styles.filterChip,
                        selectedModuleFilter === f.key && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedModuleFilter(f.key)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedModuleFilter === f.key && styles.filterChipTextActive,
                        ]}
                      >
                        {f.labelUrdu}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Records List */}
              <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16 }}>
                {loading ? (
                  <View style={styles.loaderWrap}>
                    <ActivityIndicator size="large" color="#00d49f" />
                    <Text style={styles.loaderText}>گھریلو ریکارڈز لوڈ ہو رہے ہیں...</Text>
                  </View>
                ) : records.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="document-text-outline" size={38} color="#64748B" />
                    <Text style={styles.emptyText}>کوئی ریکارڈ دستیاب نہیں۔</Text>
                  </View>
                ) : (
                  records.map((r, idx) => (
                    <View key={`${r.module}_${r.id}_${idx}`} style={styles.recordCard}>
                      <View style={styles.recordLeft}>
                        <View style={styles.moduleIconCircle}>
                          <Ionicons name={getModuleIcon(r.module) as any} size={18} color="#38BDF8" />
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.recordTitleUrdu}>{r.titleUrdu}</Text>
                          <Text style={styles.recordDateText}>
                            {new Date(r.date).toLocaleDateString('ur-PK', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}{' '}
                            • {r.vaultTitle}
                          </Text>
                          {Boolean(r.notes) && (
                            <Text style={styles.recordNotesText} numberOfLines={1}>
                              {r.notes}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.recordRight}>
                        <Text style={styles.recordAmount}>Rs. {r.amount.toLocaleString()}</Text>
                        <TouchableOpacity
                          style={styles.editBtn}
                          onPress={() => handleStartEdit(r)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="create-outline" size={13} color="#00d49f" />
                          <Text style={styles.editBtnText}>تصحیح کریں</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* TAB 2: AUDIT TRAIL TIMELINE */}
          {activeTab === 'TRAIL' && (
            <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16 }}>
              {loading ? (
                <View style={styles.loaderWrap}>
                  <ActivityIndicator size="large" color="#00d49f" />
                  <Text style={styles.loaderText}>تبدیلیوں کا تاریخچہ حاصل کیا جا رہا ہے...</Text>
                </View>
              ) : auditLogs.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="shield-checkmark-outline" size={42} color="#00d49f" />
                  <Text style={styles.emptyText}>کوئی ترمیم شدہ آڈٹ ریکارڈ موجود نہیں۔ تمام کھاتہ اصلی حالت میں ہے۔</Text>
                </View>
              ) : (
                auditLogs.map((log) => (
                  <View key={log._id} style={styles.auditLogCard}>
                    <View style={styles.auditTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person-circle-outline" size={16} color="#38BDF8" />
                        <Text style={styles.actorText}>{log.actorName}</Text>
                      </View>
                      <Text style={styles.timestampText}>
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                        {new Date(log.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <Text style={styles.targetTitleUrdu}>{log.targetRecordTitle}</Text>

                    {/* Diffs Table */}
                    {log.changeDiffs.map((diff, dIdx) => (
                      <View key={dIdx} style={styles.diffRow}>
                        <Text style={styles.diffFieldLabel}>{diff.fieldLabelUrdu}:</Text>
                        <View style={styles.diffValuesWrap}>
                          <Text style={styles.diffOldValue}>
                            {typeof diff.oldValue === 'number'
                              ? `Rs. ${diff.oldValue.toLocaleString()}`
                              : String(diff.oldValue || '—')}
                          </Text>
                          <Ionicons name="arrow-forward" size={12} color="#64748B" />
                          <Text style={styles.diffNewValue}>
                            {typeof diff.newValue === 'number'
                              ? `Rs. ${diff.newValue.toLocaleString()}`
                              : String(diff.newValue || '—')}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* Vault Impact Notice */}
                    {log.vaultImpact && (
                      <View style={styles.vaultImpactBox}>
                        <Ionicons name="sync-circle-outline" size={16} color="#00d49f" />
                        <Text style={styles.vaultImpactText}>
                          {log.vaultImpact.vaultTitle} میں{' '}
                          {log.vaultImpact.amountDelta >= 0
                            ? `Rs. ${log.vaultImpact.amountDelta.toLocaleString()} واپس جمع ہوئے`
                            : `Rs. ${Math.abs(log.vaultImpact.amountDelta).toLocaleString()} مزید منہا ہوئے`}{' '}
                          ({log.vaultImpact.voucherNumber})
                        </Text>
                      </View>
                    )}

                    {/* Reason */}
                    <Text style={styles.auditReasonText}>وجہ: "{log.reasonUrdu}"</Text>

                    {/* Revert Button if available */}
                    {log.canRevert && !log.isReverted && (
                      <TouchableOpacity
                        style={styles.revertBtn}
                        onPress={() => handleRevertLog(log._id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="arrow-undo-outline" size={13} color="#F59E0B" />
                        <Text style={styles.revertBtnText}>پرانی حالت پر واپس لائیں (Revert)</Text>
                      </TouchableOpacity>
                    )}

                    {log.isReverted && (
                      <View style={styles.revertedBadge}>
                        <Text style={styles.revertedBadgeText}>✓ پہلے ہی ریورٹ ہو چکا ہے</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* TAB 3: VAULT RECONCILER */}
          {activeTab === 'RECONCILE' && (
            <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16 }}>
              <View style={styles.reconcileCard}>
                <Ionicons name="wallet-outline" size={32} color="#00d49f" />
                <Text style={styles.reconcileHeadingUrdu}>گھریلو نقد دراز کی فزیکل گنتی و مفاہمت</Text>
                <Text style={styles.reconcileSubUrdu}>
                  الماری یا دراز میں موجود نقد رقم ہاتھ سے گن کر درج کریں تاکہ ایپ میں موجود بیلنس سے موازنہ کر کے فرق خودکار درست کیا جا سکے۔
                </Text>

                <View style={styles.reconcileInputGroup}>
                  <Text style={styles.reconcileInputLabel}>ہاتھ سے گنی گئی کل رقم (روپے):</Text>
                  <TextInput
                    style={styles.reconcileInput}
                    keyboardType="numeric"
                    placeholder="مثال: 45000"
                    placeholderTextColor="#64748B"
                    value={physicalCountInput}
                    onChangeText={setPhysicalCountInput}
                  />
                </View>

                <View style={styles.reconcileInputGroup}>
                  <Text style={styles.reconcileInputLabel}>تفصیل و نوٹ (اختیاری):</Text>
                  <TextInput
                    style={styles.reconcileInput}
                    placeholder="ماہانہ نقد گنتی و تصدیق"
                    placeholderTextColor="#64748B"
                    value={reconcileNotes}
                    onChangeText={setReconcileNotes}
                  />
                </View>

                <TouchableOpacity
                  style={styles.reconcileActionBtn}
                  onPress={handleReconcileVault}
                  disabled={reconciling}
                  activeOpacity={0.8}
                >
                  {reconciling ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#070d18" />
                      <Text style={styles.reconcileActionBtnText}>
                        گنتی محفوظ کریں اور بیلنس ہم آہنگ کریں
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* EDIT RECORD INLINE DRAWER */}
          {editingRecord && (
            <View style={styles.editSheetOverlay}>
              <View style={styles.editSheetCard}>
                <View style={styles.editSheetHeader}>
                  <View>
                    <Text style={styles.editSheetTitleUrdu}>ریکارڈ میں درستگی و ترمیم</Text>
                    <Text style={styles.editSheetSub}>{editingRecord.titleUrdu}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditingRecord(null)}>
                    <Ionicons name="close-circle" size={24} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 380 }}>
                  <Text style={styles.fieldLabel}>نئی رقم (روپے):</Text>
                  <TextInput
                    style={styles.amountFieldInput}
                    keyboardType="numeric"
                    value={editAmountInput}
                    onChangeText={setEditAmountInput}
                  />

                  <Text style={styles.fieldLabel}>تبدیلی / درستگی کی وجہ (لازمی):</Text>
                  <TextInput
                    style={styles.textFieldInput}
                    placeholder="مثال: بل میں لیسکو سرچارج اضافی لکھا گیا تھا..."
                    placeholderTextColor="#64748B"
                    value={editReasonInput}
                    onChangeText={setEditReasonInput}
                  />

                  <Text style={styles.fieldLabel}>اضافی نوٹ:</Text>
                  <TextInput
                    style={styles.textFieldInput}
                    placeholder="تفصیل..."
                    placeholderTextColor="#64748B"
                    value={editNotesInput}
                    onChangeText={setEditNotesInput}
                  />

                  {/* Impact preview */}
                  {Boolean(
                    editAmountInput &&
                      parseFloat(editAmountInput) !== editingRecord.amount &&
                      !isNaN(parseFloat(editAmountInput))
                  ) && (
                    <View style={styles.impactPreviewCard}>
                      <Ionicons name="calculator-outline" size={16} color="#38BDF8" />
                      <Text style={styles.impactPreviewText}>
                        رقم تبدیل ہونے پر فرق (Rs.{' '}
                        {Math.abs(
                          editingRecord.amount - parseFloat(editAmountInput)
                        ).toLocaleString()}
                        ) خودکار والٹ کھاتے میں ایڈجسٹ ہو جائے گا۔
                      </Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.editActionsRow}>
                    <TouchableOpacity
                      style={styles.saveEditBtn}
                      onPress={handleSaveEdit}
                      disabled={savingEdit}
                      activeOpacity={0.8}
                    >
                      {savingEdit ? (
                        <ActivityIndicator size="small" color="#070d18" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#070d18" />
                          <Text style={styles.saveEditBtnText}>درستگی محفوظ کریں</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteRecordBtn}
                      onPress={handleDeleteRecord}
                      disabled={savingEdit}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={styles.deleteRecordBtnText}>ریکارڈ خارج کریں</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#070d18',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#17233b',
    maxHeight: '94%',
    minHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  modalHeadingUrdu: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'left',
  },
  badgePill: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  badgePillText: {
    color: '#00d49f',
    fontSize: 10,
    fontWeight: '700',
  },
  modalHeadingEn: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#0d1627',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0d1627',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#111d33',
  },
  tabItemActive: {
    backgroundColor: 'rgba(0, 212, 159, 0.15)',
    borderWidth: 1,
    borderColor: '#00d49f',
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#00d49f',
    fontWeight: '700',
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 4,
    textAlign: 'left',
  },
  filterScrollWrap: {
    marginTop: 10,
    marginBottom: 6,
  },
  filterChip: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: '#00d49f',
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  loaderWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 12,
  },
  emptyWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  moduleIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'left',
  },
  recordDateText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'left',
  },
  recordNotesText: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'left',
  },
  recordRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  recordAmount: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
  },
  editBtnText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '700',
  },
  // Audit Trail Card
  auditLogCard: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  auditTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actorText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  timestampText: {
    color: '#64748B',
    fontSize: 10,
  },
  targetTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'left',
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111d33',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  diffFieldLabel: {
    color: '#94A3B8',
    fontSize: 11,
    width: 100,
  },
  diffValuesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  diffOldValue: {
    color: '#EF4444',
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  diffNewValue: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: '700',
  },
  vaultImpactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginVertical: 6,
  },
  vaultImpactText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  auditReasonText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'left',
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  revertBtnText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  revertedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  revertedBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  // Reconcile Tab
  reconcileCard: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  reconcileHeadingUrdu: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  reconcileSubUrdu: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 16,
  },
  reconcileInputGroup: {
    width: '100%',
    marginBottom: 12,
  },
  reconcileInputLabel: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'left',
  },
  reconcileInput: {
    backgroundColor: '#111d33',
    borderWidth: 1,
    borderColor: '#1e2e4a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    textAlign: 'left',
  },
  reconcileActionBtn: {
    width: '100%',
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  reconcileActionBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: '700',
  },
  // Edit Sheet
  editSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  editSheetCard: {
    backgroundColor: '#091322',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1e2e4a',
    padding: 16,
  },
  editSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    paddingBottom: 10,
  },
  editSheetTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'left',
  },
  editSheetSub: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'left',
  },
  amountFieldInput: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#00d49f',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#00d49f',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  textFieldInput: {
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'left',
  },
  impactPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginBottom: 12,
  },
  impactPreviewText: {
    color: '#BAE6FD',
    fontSize: 11,
    flex: 1,
    textAlign: 'left',
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  saveEditBtn: {
    flex: 1.5,
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  saveEditBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteRecordBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  deleteRecordBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default DomesticAuditAndCorrectionModal;
