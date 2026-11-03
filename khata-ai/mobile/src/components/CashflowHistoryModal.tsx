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
  Alert,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ledgerApi, ILedgerEntry } from '../api/ledger.api';
import { getImageUrl } from '../api/client';

export interface CashflowItem {
  id: string;
  type: 'INFLOW' | 'OUTFLOW' | 'PENDING_BILL';
  category: string;
  title: string;
  counterpartyName?: string;
  amount: number;
  sourceAccount: 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT' | 'CREDIT';
  date: string;
  rawDate: string;
  note?: string;
  receiptImageUrl?: string;
  isSettled?: boolean;
  items?: { name: string; quantity: number; unitPrice: number; total: number }[];
}

interface CashflowHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onRefreshBalances?: () => void;
}



export const CashflowHistoryModal: React.FC<CashflowHistoryModalProps> = ({
  visible,
  onClose,
  onRefreshBalances,
}) => {
  const insets = useSafeAreaInsets();
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW' | 'PENDING_BILL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [items, setItems] = useState<CashflowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Attached image preview modal state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // PDF Export State
  const [pdfPeriod, setPdfPeriod] = useState<'DAILY' | 'MONTHLY' | 'CUSTOM'>('DAILY');
  const [pdfStartDate, setPdfStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pdfEndDate, setPdfEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfLoadingAction, setPdfLoadingAction] = useState<'DAILY' | 'MONTHLY' | 'CUSTOM' | null>(null);

  const getMappedChannel = (): 'ALL' | 'CASH' | 'WALLET' | 'BANK' => {
    if (sourceFilter === 'PHYSICAL_CASH') return 'CASH';
    if (sourceFilter === 'DIGITAL_WALLET') return 'WALLET';
    if (sourceFilter === 'BANK_ACCOUNT') return 'BANK';
    return 'ALL';
  };

  const handleDownloadPdf = async (periodOverride?: 'DAILY' | 'MONTHLY' | 'CUSTOM') => {
    const selectedMode = periodOverride || pdfPeriod;
    setIsExportingPdf(true);
    setPdfLoadingAction(selectedMode);
    try {
      const activeChannel = getMappedChannel();
      const todayStr = new Date().toISOString().split('T')[0];
      const thisMonthStr = todayStr.substring(0, 7);

      const params: any = {
        period: selectedMode,
        channel: activeChannel,
        format: 'base64',
      };

      if (selectedMode === 'DAILY') {
        params.date = todayStr;
      } else if (selectedMode === 'MONTHLY') {
        params.month = thisMonthStr;
      } else if (selectedMode === 'CUSTOM') {
        params.startDate = pdfStartDate || todayStr;
        params.endDate = pdfEndDate || todayStr;
      }

      const res = await ledgerApi.downloadCashflowPdf(params);
      if (!res.success || !res.base64) {
        throw new Error(res.meta?.error || 'PDF could not be generated.');
      }

      const filename = res.filename || `Roznamcha_${selectedMode}_${todayStr}.pdf`;

      if (Platform.OS === 'web') {
        const byteCharacters = atob(res.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, res.base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: filename,
            UTI: 'com.adobe.pdf',
          });
        } else {
          await Print.printAsync({ uri: fileUri });
        }
      }
    } catch (err: any) {
      console.error('[CashflowHistoryModal] PDF Error:', err);
      Alert.alert('PDF Generation Failed', err.message || 'Unable to generate PDF report. Please try again.');
    } finally {
      setIsExportingPdf(false);
      setPdfLoadingAction(null);
    }
  };

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const res = await ledgerApi.getAll({ limit: 100 });
      if (res.success && res.data && res.data.length > 0) {
        const mappedItems: CashflowItem[] = res.data.map((entry: ILedgerEntry) => {
          let type: 'INFLOW' | 'OUTFLOW' | 'PENDING_BILL' = 'INFLOW';
          let title = entry.category || 'Transaction';

          const cpObj = entry.counterpartyId as any;
          const cpName =
            cpObj && typeof cpObj === 'object' && cpObj.name
              ? String(cpObj.name)
              : undefined;

          const hasItems = entry.items && entry.items.length > 0;
          const itemsSummary = hasItems
            ? entry.items!.map((i) => `${i.name} x${i.quantity}`).join(', ')
            : undefined;

          if (entry.entryType === 'CASH_IN') {
            type = 'INFLOW';
            const cat = entry.category || '';
            if (cat === 'Retail Product Sale' || hasItems) {
              title = 'Retail Product Sale (ریٹیل پروڈکٹ سیل)';
            } else if (cat === 'Counter Sale' || cat === 'Quick Sale') {
              title = 'Counter Cash Sale (نقدی سیل)';
            } else if (cat === 'TILL_TOPUP') {
              title = 'Cash Galla Top-Up (سیل نقد)';
            } else {
              title = 'Cash Inflow (آمدن)';
            }
          } else if (entry.entryType === 'SETTLEMENT') {
            type = 'INFLOW';
            title = cpName
              ? `Gahak Wasooli (${cpName})`
              : 'Payment Wasooli (وصولی)';
          } else if (entry.entryType === 'CASH_OUT') {
            type = 'OUTFLOW';
            const catLower = (entry.category || '').toLowerCase();
            if (catLower.includes('supplier')) {
              title = 'Supplier Payment (سپلائر ادائیگی)';
            } else if (catLower.includes('salary') || catLower.includes('tankha') || catLower.includes('payroll')) {
              title = 'Staff Salary Payout (ملازم تنخواہ ادائیگی)';
            } else if (catLower.includes('daily wage') || catLower.includes('دیہاڑی')) {
              title = 'Staff Daily Wage (آج کی دیہاڑی ادائیگی)';
            } else if (catLower.includes('advance') || catLower.includes('kharcha') || catLower.includes('food')) {
              title = 'Staff Advance & Kharcha (پیشگی و خرچہ)';
            } else {
              title = `Dukan Kharcha (${entry.category})`;
            }
          } else if (entry.entryType === 'RECEIVABLE') {
            type = 'OUTFLOW';
            title = 'Udhaar Diya (گاہک ادھار)';
          } else if (entry.entryType === 'PAYABLE') {
            type = 'PENDING_BILL';
            title = 'Pending Supplier Invoice (واجب الادا بل)';
          }

          let sourceAccount: 'PHYSICAL_CASH' | 'DIGITAL_WALLET' | 'BANK_ACCOUNT' | 'CREDIT' = 'PHYSICAL_CASH';
          if (entry.paymentMode === 'JAZZCASH' || entry.paymentMode === 'EASYPAISA') {
            sourceAccount = 'DIGITAL_WALLET';
          } else if (entry.paymentMode === 'BANK_TRANSFER') {
            sourceAccount = 'BANK_ACCOUNT';
          } else if (entry.paymentMode === 'CREDIT') {
            sourceAccount = 'CREDIT';
          }

          const d = new Date(entry.createdAt);
          const dateText = d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ', ' + d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

          const displayCounterparty = cpName || itemsSummary;
          let noteText = entry.description ? entry.description.replace(/^Till Top-up \([A-Z_]+\):\s*/i, '') : undefined;

          if (noteText && displayCounterparty && noteText.trim() === displayCounterparty.trim()) {
            noteText = undefined;
          }

          return {
            id: entry._id,
            type,
            category: entry.category,
            title,
            counterpartyName: displayCounterparty,
            amount: entry.amount,
            sourceAccount,
            date: dateText,
            rawDate: entry.createdAt,
            note: noteText,
            items: entry.items,
            receiptImageUrl: entry.receiptImageUrl,
            isSettled: entry.isSettled,
          };
        });

        setItems(mappedItems);
      } else {
        setItems([]);
      }
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchLedgerData();
    }
  }, [visible]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLedgerData();
    onRefreshBalances?.();
  };

  const handleDeleteItem = (item: CashflowItem) => {
    Alert.alert(
      'Delete Transaction (اندراج ڈیلیٹ)',
      `Kya aap PKR ${item.amount.toLocaleString()} ki yeh transaction delete karna chahte hain? Yeh balance wapis update kar dega.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete & Rollback (ڈیلیٹ کریں)',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await ledgerApi.delete(item.id);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
              onRefreshBalances?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete transaction.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const filteredItems = items.filter((tx) => {
    if (sourceFilter !== 'ALL' && tx.sourceAccount !== sourceFilter) return false;
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = tx.title.toLowerCase().includes(q);
      const matchName = tx.counterpartyName?.toLowerCase().includes(q);
      const matchCat = tx.category.toLowerCase().includes(q);
      const matchNote = tx.note?.toLowerCase().includes(q);
      return matchTitle || matchName || matchCat || matchNote;
    }
    return true;
  });

  const totalInflows = filteredItems
    .filter((i) => i.type === 'INFLOW')
    .reduce((sum, curr) => sum + curr.amount, 0);

  const totalOutflows = filteredItems
    .filter((i) => i.type === 'OUTFLOW')
    .reduce((sum, curr) => sum + curr.amount, 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="swap-horizontal" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Cashflow In/Out Ledger History (روزنامچہ کھاتہ)</Text>
                <Text style={styles.headerSubtitle}>دکان گلہ، والٹ اور بینک کی تمام آمدن و اخراجات کی تفصیل</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick Summary Bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Inflows (آمدن)</Text>
              <Text style={styles.summaryInflow}>+ Rs. {totalInflows.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Outflows (اخراجات)</Text>
              <Text style={styles.summaryOutflow}>- Rs. {totalOutflows.toLocaleString()}</Text>
            </View>
          </View>

          {/* Dedicated Tabular PDF Generation Toolbar */}
          <View style={styles.pdfToolbarCard}>
            <View style={styles.pdfToolbarTopRow}>
              <View style={styles.pdfBadgeRow}>
                <Ionicons name="document-text" size={15} color="#38BDF8" />
                <Text style={styles.pdfSectionTitle}>Tabular PDF Engine (روزنامچہ پرنٹ رپورٹ)</Text>
              </View>
              <View style={styles.channelSyncBadge}>
                <Text style={styles.channelSyncText}>
                  Channel: {sourceFilter === 'ALL' ? 'ALL ACCOUNTS' : sourceFilter === 'PHYSICAL_CASH' ? 'CASH GALLA' : sourceFilter === 'DIGITAL_WALLET' ? 'DIGITAL WALLET' : 'BANK ACCOUNT'}
                </Text>
              </View>
            </View>

            {/* 1. Mode Selector */}
            <View style={styles.pdfModeTabsRow}>
              <TouchableOpacity
                style={[styles.pdfModeBtn, pdfPeriod === 'DAILY' && styles.pdfModeBtnActive]}
                onPress={() => setPdfPeriod('DAILY')}
              >
                <Text style={[styles.pdfModeBtnText, pdfPeriod === 'DAILY' && styles.pdfModeBtnTextActive]}>
                  📅 Aaj Ka Roznamcha
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pdfModeBtn, pdfPeriod === 'MONTHLY' && styles.pdfModeBtnActive]}
                onPress={() => setPdfPeriod('MONTHLY')}
              >
                <Text style={[styles.pdfModeBtnText, pdfPeriod === 'MONTHLY' && styles.pdfModeBtnTextActive]}>
                  🗓️ Mahana Khata
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pdfModeBtn, pdfPeriod === 'CUSTOM' && styles.pdfModeBtnActive]}
                onPress={() => setPdfPeriod('CUSTOM')}
              >
                <Text style={[styles.pdfModeBtnText, pdfPeriod === 'CUSTOM' && styles.pdfModeBtnTextActive]}>
                  🗓️ Custom Range
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Range Picker Inputs */}
            {pdfPeriod === 'CUSTOM' && (
              <View style={styles.customDateContainer}>
                <View style={styles.customDateBox}>
                  <Text style={styles.customDateInputLabel}>From Date (تاریخ سے):</Text>
                  <TextInput
                    style={styles.customDateInputField}
                    value={pdfStartDate}
                    onChangeText={setPdfStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.customDateBox}>
                  <Text style={styles.customDateInputLabel}>To Date (تاریخ تک):</Text>
                  <TextInput
                    style={styles.customDateInputField}
                    value={pdfEndDate}
                    onChangeText={setPdfEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            )}

            {/* 2. Download Triggers */}
            <View style={styles.pdfButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.pdfActionButton,
                  styles.pdfDailyActionBtn,
                  isExportingPdf && pdfLoadingAction === 'DAILY' && styles.pdfBtnBusy,
                ]}
                disabled={isExportingPdf}
                onPress={() => handleDownloadPdf('DAILY')}
              >
                {isExportingPdf && pdfLoadingAction === 'DAILY' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="receipt-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <View>
                  <Text style={styles.pdfActionPrimaryText}>Download Daily PDF</Text>
                  <Text style={styles.pdfActionUrduText}>روزنامچہ پرنٹ کریں</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pdfActionButton,
                  styles.pdfMonthlyActionBtn,
                  isExportingPdf && pdfLoadingAction === 'MONTHLY' && styles.pdfBtnBusy,
                ]}
                disabled={isExportingPdf}
                onPress={() => handleDownloadPdf('MONTHLY')}
              >
                {isExportingPdf && pdfLoadingAction === 'MONTHLY' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="calendar-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <View>
                  <Text style={styles.pdfActionPrimaryText}>Download Monthly</Text>
                  <Text style={styles.pdfActionUrduText}>ماہانہ رپورٹ</Text>
                </View>
              </TouchableOpacity>

              {pdfPeriod === 'CUSTOM' && (
                <TouchableOpacity
                  style={[
                    styles.pdfActionButton,
                    styles.pdfCustomActionBtn,
                    isExportingPdf && pdfLoadingAction === 'CUSTOM' && styles.pdfBtnBusy,
                  ]}
                  disabled={isExportingPdf}
                  onPress={() => handleDownloadPdf('CUSTOM')}
                >
                  {isExportingPdf && pdfLoadingAction === 'CUSTOM' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  )}
                  <View>
                    <Text style={styles.pdfActionPrimaryText}>Export Range PDF</Text>
                    <Text style={styles.pdfActionUrduText}>مخصوص تاریخ</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Bar & Account Filters Section */}
          <View style={styles.filterSection}>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search transaction, customer, or category..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Account Source Filters */}
            <View style={styles.filterLabelRow}>
              <Text style={styles.filterLabel}>Account Source Filter (حساب کا ذریعہ):</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {[
                { key: 'ALL', label: 'All Accounts' },
                { key: 'PHYSICAL_CASH', label: '💵 Cash Galla' },
                { key: 'DIGITAL_WALLET', label: '📱 Digital Wallet' },
                { key: 'BANK_ACCOUNT', label: '🏦 Bank Account' },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, sourceFilter === f.key && styles.filterChipActive]}
                  onPress={() => setSourceFilter(f.key as any)}
                >
                  <Text style={[styles.filterChipText, sourceFilter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Type Filter Row */}
            <View style={styles.typeFilterRow}>
              {[
                { key: 'ALL', label: 'All Types' },
                { key: 'INFLOW', label: '🟢 Inflows (+)' },
                { key: 'OUTFLOW', label: '🔴 Outflows (-)' },
                { key: 'PENDING_BILL', label: '⚪ Pending Bills' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, typeFilter === t.key && styles.typeChipActive]}
                  onPress={() => setTypeFilter(t.key as any)}
                >
                  <Text style={[styles.typeChipText, typeFilter === t.key && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ledger List */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />
            }
          >
            {loading ? (
              <ActivityIndicator size="large" color="#10B981" style={{ marginVertical: 30 }} />
            ) : filteredItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="newspaper-outline" size={36} color="#64748B" />
                <Text style={styles.emptyText}>Is filter par koi transaction nahi mili.</Text>
              </View>
            ) : (
              filteredItems.map((item) => {
                const isInflow = item.type === 'INFLOW';
                const isOutflow = item.type === 'OUTFLOW';
                const isDeleting = deletingId === item.id;

                let accountBadgeText = '💵 Cash Galla';
                if (item.sourceAccount === 'DIGITAL_WALLET') accountBadgeText = '📱 Digital Wallet (JazzCash/Easypaisa)';
                else if (item.sourceAccount === 'BANK_ACCOUNT') accountBadgeText = '🏦 Bank Transfer';
                else if (item.sourceAccount === 'CREDIT') accountBadgeText = '💳 Udhaar / Credit';

                return (
                  <View key={item.id} style={styles.txCard}>
                    {/* Icon Circle */}
                    <View style={[
                      styles.txIconCircle,
                      isInflow ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' } : isOutflow ? { backgroundColor: 'rgba(244, 63, 94, 0.15)' } : { backgroundColor: 'rgba(245, 158, 11, 0.15)' }
                    ]}>
                      <Ionicons
                        name={isInflow ? 'arrow-down-circle' : isOutflow ? 'arrow-up-circle' : 'time-outline'}
                        size={22}
                        color={isInflow ? '#10B981' : isOutflow ? '#F43F5E' : '#F59E0B'}
                      />
                    </View>

                    {/* Middle Details Column */}
                    <View style={styles.txMetaCol}>
                      <Text style={styles.txTitle}>{item.title}</Text>
                      <Text style={styles.txSub}>
                        {item.counterpartyName ? `${item.counterpartyName} • ` : ''}{item.date}
                      </Text>
                      
                      <View style={styles.rowBadgesLine}>
                        <View style={styles.sourceBadge}>
                          <Text style={styles.sourceBadgeText}>{accountBadgeText}</Text>
                        </View>

                        {item.receiptImageUrl ? (
                          <TouchableOpacity
                            style={styles.attachmentBadge}
                            onPress={() => setPreviewImage(item.receiptImageUrl || null)}
                          >
                            <Ionicons name="image" size={11} color="#38BDF8" />
                            <Text style={styles.attachmentText}>Photo</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {item.items && item.items.length > 0 ? (
                        <View style={styles.itemPillsRow}>
                          {item.items.map((it, idx) => (
                            <View key={idx} style={styles.itemPillBadge}>
                              <Ionicons name="cube" size={11} color="#10B981" style={{ marginRight: 4 }} />
                              <Text style={styles.itemPillBadgeText}>
                                {it.name} x{it.quantity} {it.total ? `(Rs. ${it.total})` : ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {item.note ? (
                        <Text style={styles.txNoteText} numberOfLines={1}>
                          {item.note}
                        </Text>
                      ) : null}
                    </View>

                    {/* Right Amount Column & Delete Button */}
                    <View style={styles.txRightCol}>
                      <Text style={[
                        styles.txAmountText,
                        isInflow ? { color: '#10B981' } : isOutflow ? { color: '#F43F5E' } : { color: '#F59E0B' }
                      ]}>
                        {isInflow ? '+ Rs. ' : isOutflow ? '- Rs. ' : 'Rs. '}
                        {item.amount.toLocaleString()}
                      </Text>

                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteItem(item)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#F43F5E" />
                        ) : (
                          <Ionicons name="trash-outline" size={16} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Photo Preview Modal */}
          <Modal
            visible={!!previewImage}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setPreviewImage(null)}
          >
            <View style={styles.imagePreviewOverlay}>
              <View style={styles.imagePreviewCard}>
                <View style={styles.imagePreviewHeader}>
                  <Text style={styles.imagePreviewTitle}>Transaction Receipt Photo</Text>
                  <TouchableOpacity onPress={() => setPreviewImage(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                {previewImage ? (
                  <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Image
                      source={{ uri: getImageUrl(previewImage) }}
                      style={styles.fullPreviewImage}
                      resizeMode="contain"
                      onError={() => setImageError(true)}
                    />
                    {imageError && (
                      <View style={styles.imageErrorFallbackBox}>
                        <Ionicons name="document-text-outline" size={44} color="#10B981" />
                        <Text style={styles.imageErrorTitle}>Receipt Document Saved</Text>
                        <Text style={styles.imageErrorSub}>
                          Transaction metadata & OCR data stored safely in database ledger record.
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 30, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  modalCard: {
    backgroundColor: '#0B192C',
    borderRadius: 22,
    maxHeight: '92%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#08121E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#112238',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  summaryInflow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  summaryOutflow: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F43F5E',
    marginTop: 2,
  },
  filterSection: {
    backgroundColor: '#0E1E34',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162C46',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
  },
  filterLabelRow: {
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  filterScroll: {
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: '#162C46',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E3A5F',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  typeFilterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  typeChip: {
    flex: 1,
    backgroundColor: '#162C46',
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  typeChipActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  typeChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  body: {
    padding: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#112238',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 10,
  },
  txIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMetaCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  txSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  rowBadgesLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  sourceBadge: {
    backgroundColor: '#162C46',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attachmentText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
  },
  txNoteText: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 3,
  },
  txRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 48,
  },
  txAmountText: {
    fontSize: 14,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 30, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imagePreviewCard: {
    backgroundColor: '#0B192C',
    borderRadius: 18,
    width: '100%',
    maxHeight: '80%',
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreviewTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fullPreviewImage: {
    width: '100%',
    height: 350,
    borderRadius: 10,
  },
  imageErrorFallbackBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginVertical: 12,
  },
  imageErrorTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  imageErrorSub: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  itemPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  itemPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  itemPillBadgeText: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '600',
  },
  pdfToolbarCard: {
    backgroundColor: '#0B192C',
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  pdfToolbarTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pdfBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38BDF8',
  },
  channelSyncBadge: {
    backgroundColor: '#162C46',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  channelSyncText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  pdfModeTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  pdfModeBtn: {
    flexGrow: 1,
    minWidth: 95,
    minHeight: 36,
    backgroundColor: '#0F1E33',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E3A5F',
  },
  pdfModeBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  pdfModeBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  pdfModeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  customDateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    backgroundColor: '#071220',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  customDateBox: {
    flex: 1,
    minWidth: 120,
  },
  customDateInputLabel: {
    fontSize: 9,
    color: '#94A3B8',
    marginBottom: 3,
    fontWeight: '600',
  },
  customDateInputField: {
    backgroundColor: '#0B192C',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 11,
    color: '#F8FAFC',
  },
  pdfButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pdfActionButton: {
    flexGrow: 1,
    minWidth: 140,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  pdfDailyActionBtn: {
    backgroundColor: '#059669',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  pdfMonthlyActionBtn: {
    backgroundColor: '#4F46E5',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  pdfCustomActionBtn: {
    backgroundColor: '#D97706',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pdfBtnBusy: {
    opacity: 0.6,
  },
  pdfActionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pdfActionUrduText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    fontWeight: '600',
  },
});
