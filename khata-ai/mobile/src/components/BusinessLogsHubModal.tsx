import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/auth.store';
import { printAuditPdf, shareAuditPdf } from '../utils/generateAuditPdf';
import {
  businessLogsApi,
  IBusinessLogsResponse,
  ICashSaleLogItem,
  IUdhaarDebtLogItem,
  ISupplierInvoiceLogItem,
  IStaffPayrollLogItem,
  IProfitAnalyticsLogItem,
  IAuditTrailLogItem,
} from '../api/businessLogs.api';
import { PurgeDataModal } from './PurgeDataModal';

interface BusinessLogsHubModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

type TabType = 'cash_sales' | 'udhaar_debt' | 'supplier_invoices' | 'staff_payroll' | 'profit_margin' | 'audit_logs';
type DateRangeType = 'THIS_MONTH' | 'LAST_6_MONTHS' | 'FULL_1_YEAR' | 'CUSTOM';

export const BusinessLogsHubModal: React.FC<BusinessLogsHubModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('cash_sales');
  const [dateRange, setDateRange] = useState<DateRangeType>('THIS_MONTH');
  const [loading, setLoading] = useState(false);
  const [logsData, setLogsData] = useState<IBusinessLogsResponse | null>(null);

  // Sub-modal states
  const [purgeModalVisible, setPurgeModalVisible] = useState(false);
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await businessLogsApi.getBusinessLogs({ dateRange });
      if (res.success && res.data) {
        setLogsData(res.data);
      }
    } catch (e) {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchLogs();
    }
  }, [visible, dateRange]);

  const handlePurgeSuccess = (hash: string, purgedCount: number) => {
    onShowToast?.(`Purge Complete! ${purgedCount} historical records deleted (${hash.substring(0, 14)}...)`);
    fetchLogs();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Action Bar */}
          <View style={styles.headerBar}>
            <View style={styles.headerLeftRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="document-text" size={22} color="#34D399" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Business Ledger & Audit Logs</Text>
                <Text style={styles.headerSubtitle}>کاروباری ہسٹری، سالانہ منافع و آڈٹ لاگ</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Quick Date Selectors Bar */}
          <View style={styles.dateSelectorRow}>
            <TouchableOpacity
              style={[styles.dateChip, dateRange === 'THIS_MONTH' && styles.dateChipActive]}
              onPress={() => setDateRange('THIS_MONTH')}
            >
              <Text style={[styles.dateChipText, dateRange === 'THIS_MONTH' && styles.dateChipTextActive]}>
                This Month (اس ماہ)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateChip, dateRange === 'LAST_6_MONTHS' && styles.dateChipActive]}
              onPress={() => setDateRange('LAST_6_MONTHS')}
            >
              <Text style={[styles.dateChipText, dateRange === 'LAST_6_MONTHS' && styles.dateChipTextActive]}>
                Last 6 Months (6 ماہ)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateChip, dateRange === 'FULL_1_YEAR' && styles.dateChipActive]}
              onPress={() => setDateRange('FULL_1_YEAR')}
            >
              <Text style={[styles.dateChipText, dateRange === 'FULL_1_YEAR' && styles.dateChipTextActive]}>
                Full 1 Year (1 سال)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateChip, dateRange === 'CUSTOM' && styles.dateChipActive]}
              onPress={() => setDateRange('CUSTOM')}
            >
              <Text style={[styles.dateChipText, dateRange === 'CUSTOM' && styles.dateChipTextActive]}>
                Custom Range
              </Text>
            </TouchableOpacity>
          </View>

          {/* Top Action CTAs Row */}
          <View style={styles.topActionsRow}>
            {/* Primary CTA (Green): Download PDF Statement */}
            <TouchableOpacity
              style={styles.downloadPdfBtn}
              onPress={() => setPdfPreviewVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="print-outline" size={16} color="#FFFFFF" />
              <Text style={styles.downloadPdfBtnText}>
                Download PDF Statement (پی ڈی ایف ڈاؤن لوڈ کریں)
              </Text>
            </TouchableOpacity>

            {/* Direct Shortcut: Quick 6-Month Purge Button */}
            <TouchableOpacity
              style={styles.purgeShortcutBtn}
              onPress={() => setPurgeModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-bin-outline" size={16} color="#FFFFFF" />
              <Text style={styles.purgeShortcutBtnText}>
                Purge Data Older than 6 Months (6 ماہ سے پرانا ڈیٹا ڈیلیٹ کریں)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 6 Category Tabs Scroll Bar */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'cash_sales' && styles.tabBtnActive]}
                onPress={() => setActiveTab('cash_sales')}
              >
                <Ionicons name="cash-outline" size={15} color={activeTab === 'cash_sales' ? '#34D399' : '#94A3B8'} />
                <Text style={[styles.tabBtnText, activeTab === 'cash_sales' && styles.tabBtnTextActive]}>
                  Cash Sales (نقد سیل لاگ)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'udhaar_debt' && styles.tabBtnActive]}
                onPress={() => setActiveTab('udhaar_debt')}
              >
                <Ionicons name="receipt-outline" size={15} color={activeTab === 'udhaar_debt' ? '#34D399' : '#94A3B8'} />
                <Text style={[styles.tabBtnText, activeTab === 'udhaar_debt' && styles.tabBtnTextActive]}>
                  Udhaar & Debt (گاہک ادھار)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'supplier_invoices' && styles.tabBtnActive]}
                onPress={() => setActiveTab('supplier_invoices')}
              >
                <Ionicons name="business-outline" size={15} color={activeTab === 'supplier_invoices' ? '#34D399' : '#94A3B8'} />
                <Text style={[styles.tabBtnText, activeTab === 'supplier_invoices' && styles.tabBtnTextActive]}>
                  Suppliers (سپلائر بلز)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'staff_payroll' && styles.tabBtnActive]}
                onPress={() => setActiveTab('staff_payroll')}
              >
                <Ionicons name="people-outline" size={15} color={activeTab === 'staff_payroll' ? '#34D399' : '#94A3B8'} />
                <Text style={[styles.tabBtnText, activeTab === 'staff_payroll' && styles.tabBtnTextActive]}>
                  Staff Tankha (ملازمین تنخواہ)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'profit_margin' && styles.tabBtnActive]}
                onPress={() => setActiveTab('profit_margin')}
              >
                <Ionicons name="trending-up-outline" size={15} color={activeTab === 'profit_margin' ? '#34D399' : '#94A3B8'} />
                <Text style={[styles.tabBtnText, activeTab === 'profit_margin' && styles.tabBtnTextActive]}>
                  Profit & Margin (منافع و بچت)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'audit_logs' && styles.tabBtnActive]}
                onPress={() => setActiveTab('audit_logs')}
              >
                <Ionicons name="shield-checkmark-outline" size={15} color={activeTab === 'audit_logs' ? '#34D399' : '#94A3B8'} />
                <Text style={[styles.tabBtnText, activeTab === 'audit_logs' && styles.tabBtnTextActive]}>
                  System Audit Logs (سسٹم آڈٹ)
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Main Tab Content Panel */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentArea}>
            {loading ? (
              <ActivityIndicator color="#34D399" size="large" style={{ marginVertical: 40 }} />
            ) : logsData ? (
              <>
                {/* TAB 1: CASH SALES LOG */}
                {activeTab === 'cash_sales' && (
                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>فوری نقد سیل لاگ (Daily Retail Counter Sales View)</Text>
                    {logsData.cashSales.length === 0 ? (
                      <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                        <Ionicons name="receipt-outline" size={36} color="#64748B" />
                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                          کوئی نقد سیل کا ریکارڈ نہیں ہے (No Counter Sales Recorded Yet)
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableCol, { flex: 1.2 }]}>Date/Time</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Amount</Text>
                          <Text style={[styles.tableCol, { flex: 1.1 }]}>Till Account</Text>
                          <Text style={[styles.tableCol, { flex: 1.5 }]}>Note / Item</Text>
                        </View>
                        {logsData.cashSales.map((item) => (
                          <View key={item._id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 1.2 }]}>{item.dateTime}</Text>
                            <Text style={[styles.tableCellBold, { flex: 1, color: '#34D399' }]}>
                              Rs. {item.amount.toLocaleString()}
                            </Text>
                            <View style={{ flex: 1.1 }}>
                              <View style={styles.tillBadge}>
                                <Text style={styles.tillBadgeText}>{item.targetAccount.replace('_', ' ')}</Text>
                              </View>
                            </View>
                            <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>{item.note}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {/* TAB 2: UDHAAR & DEBT LOG */}
                {activeTab === 'udhaar_debt' && (
                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>گاہک ادھار اور وصولی لاگ (Udhaar & Recovery Audit)</Text>
                    {logsData.udhaarDebts.length === 0 ? (
                      <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                        <Ionicons name="people-outline" size={36} color="#64748B" />
                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                          کوئی ادھار یا وصولی نہیں ہے (No Udhaar or Wasooli Records)
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableCol, { flex: 1.4 }]}>Customer</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Entry</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Amount</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Status</Text>
                        </View>
                        {logsData.udhaarDebts.map((item) => (
                          <View key={item._id} style={styles.tableRow}>
                            <View style={{ flex: 1.4 }}>
                              <Text style={styles.tableCellBold}>{item.customerName}</Text>
                              <Text style={styles.subCellText}>{item.phone}</Text>
                            </View>
                            <Text style={[styles.tableCell, { flex: 1, color: item.entryType === 'WASOOLI_RECEIVED' ? '#34D399' : '#F43F5E' }]}>
                              {item.entryType === 'WASOOLI_RECEIVED' ? 'Wasooli' : 'Udhaar'}
                            </Text>
                            <Text style={[styles.tableCellBold, { flex: 1 }]}>Rs. {item.amount.toLocaleString()}</Text>
                            <View style={{ flex: 1 }}>
                              <View
                                style={[
                                  styles.statusBadge,
                                  item.status === 'FULLY_CLEARED' && styles.statusBadgeCleared,
                                  item.status === 'PARTIAL' && styles.statusBadgePartial,
                                  item.status === 'OVERDUE' && styles.statusBadgeOverdue,
                                ]}
                              >
                                <Text style={styles.statusBadgeText}>{item.status}</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {/* TAB 3: SUPPLIER INVOICES & DUES */}
                {activeTab === 'supplier_invoices' && (
                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>سپلائر خریداری و بلز (Supplier Invoices & Dues Log)</Text>
                    {logsData.supplierInvoices.length === 0 ? (
                      <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                        <Ionicons name="business-outline" size={36} color="#64748B" />
                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                          کوئی سپلائر بل یا نیا آرڈر درج نہیں ہے (No Supplier Invoices Recorded)
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableCol, { flex: 1.2 }]}>Invoice ID</Text>
                          <Text style={[styles.tableCol, { flex: 1.4 }]}>Supplier</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Inv Amount</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Paid / Due</Text>
                        </View>
                        {logsData.supplierInvoices.map((item) => (
                          <View key={item._id} style={styles.tableRow}>
                            <Text style={[styles.tableCellBold, { flex: 1.2, color: '#38BDF8' }]}>{item.invoiceId}</Text>
                            <Text style={[styles.tableCell, { flex: 1.4 }]}>{item.supplierName}</Text>
                            <Text style={[styles.tableCellBold, { flex: 1 }]}>Rs. {item.invoiceAmount.toLocaleString()}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: '#34D399', fontWeight: '700' }}>Paid: Rs. {item.paidAmount.toLocaleString()}</Text>
                              <Text style={{ fontSize: 11, color: '#F43F5E', fontWeight: '700' }}>Due: Rs. {item.remainingDue.toLocaleString()}</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {/* TAB 4: STAFF TANKHA & ATTENDANCE */}
                {activeTab === 'staff_payroll' && (
                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>ملازمین حاضری و تنخواہ (6 Months Staff Payroll History)</Text>
                    {logsData.staffPayrolls.length === 0 ? (
                      <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                        <Ionicons name="people-outline" size={36} color="#64748B" />
                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                          کوئی ملازم شامل نہیں ہے (No Staff Members Added Yet)
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableCol, { flex: 1.4 }]}>Staff Helper</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Month</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Hazri</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Net Paid</Text>
                        </View>
                        {logsData.staffPayrolls.map((item) => (
                          <View key={item._id} style={styles.tableRow}>
                            <View style={{ flex: 1.4 }}>
                              <Text style={styles.tableCellBold}>{item.staffName}</Text>
                              <Text style={styles.subCellText}>{item.roleTitle}</Text>
                            </View>
                            <Text style={[styles.tableCell, { flex: 1 }]}>{item.month}</Text>
                            <Text style={[styles.tableCell, { flex: 1 }]}>{item.daysPresent} Days</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.tableCellBold, { color: item.isPaid ? '#34D399' : '#F59E0B' }]}>
                                Rs. {item.netPaid.toLocaleString()}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#94A3B8' }}>
                                {item.isPaid ? 'Paid ✓' : 'Pending'}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}

                {/* TAB 5: 1-YEAR PROFIT & MARGIN ANALYTICS */}
                {activeTab === 'profit_margin' && (
                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>سالانہ منافع و مارجن فیصد (1-Year Consolidated Profit Summary)</Text>
                    {logsData.profitAnalytics.map((item) => (
                      <View key={item.month} style={styles.tableRow}>
                        <Text style={[styles.tableCellBold, { flex: 1 }]}>{item.month}</Text>
                        <Text style={[styles.tableCell, { flex: 1.2, color: '#34D399' }]}>
                          Rs. {item.totalInflow.toLocaleString()}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1.2, color: '#F43F5E' }]}>
                          Rs. {item.totalOutflow.toLocaleString()}
                        </Text>
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.tableCellBold, { color: '#34D399' }]}>
                            Rs. {item.netProfit.toLocaleString()}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#38BDF8', fontWeight: '800' }}>
                            +{item.netMarginPercent}% Net Margin
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* TAB 6: SYSTEM & SECURITY AUDIT LOGS */}
                {activeTab === 'audit_logs' && (
                  <View style={styles.panelCard}>
                    <Text style={styles.panelTitle}>سسٹم آڈٹ لاگ (Immutable Forensic Security Event Trail)</Text>
                    {logsData.auditLogs.length === 0 ? (
                      <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                        <Ionicons name="shield-checkmark-outline" size={36} color="#64748B" />
                        <Text style={{ color: '#94A3B8', fontSize: 13, marginTop: 8, fontWeight: '600' }}>
                          کوئی آڈٹ اینٹری موجود نہیں (No Forensic Audit Logs Recorded Yet)
                        </Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableCol, { flex: 1.2 }]}>Timestamp</Text>
                          <Text style={[styles.tableCol, { flex: 1.2 }]}>Action Type</Text>
                          <Text style={[styles.tableCol, { flex: 1 }]}>Admin</Text>
                          <Text style={[styles.tableCol, { flex: 1.8 }]}>Reason & Audit Log</Text>
                        </View>
                        {logsData.auditLogs.map((item) => (
                          <View key={item._id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 1.2, fontSize: 10 }]}>{item.timestamp}</Text>
                            <View style={{ flex: 1.2 }}>
                              <View style={styles.auditActionBadge}>
                                <Text style={styles.auditActionText}>{item.actionType}</Text>
                              </View>
                            </View>
                            <Text style={[styles.tableCell, { flex: 1, fontSize: 11 }]}>{item.authorizedByName}</Text>
                            <Text style={[styles.tableCell, { flex: 1.8, fontSize: 11 }]} numberOfLines={2}>
                              {item.reason}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>

          {/* 6-Month Purge Safeguard Modal */}
          <PurgeDataModal
            visible={purgeModalVisible}
            monthsOld={6}
            onClose={() => setPurgeModalVisible(false)}
            onSuccess={handlePurgeSuccess}
          />

          {/* Printable PDF Preview Modal */}
          <Modal visible={pdfPreviewVisible} animationType="slide" transparent>
            <View style={styles.overlay}>
              <View style={styles.pdfPreviewCard}>
                <View style={styles.pdfHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pdfTitle}>
                      {user?.businessName || (user?.fullName ? `${user.fullName}'s Store` : 'اپنا اسٹور')} • Business Audit Report
                    </Text>
                    <Text style={styles.pdfSub}>
                      Merchant ID: {user?.id ? `MER-${user.id.slice(-6).toUpperCase()}` : 'MER-STORE'} • Date: {new Date().toLocaleDateString()}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setPdfPreviewVisible(false)}>
                    <Ionicons name="close" size={24} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <View style={styles.pdfBanner}>
                  <Text style={styles.pdfBannerLabel}>ITEMIZED REPORT AUDIT SUMMARY</Text>
                  <Text style={styles.pdfBannerVal}>
                    {logsData ? `${logsData.cashSales.length + logsData.udhaarDebts.length + logsData.supplierInvoices.length} Verified Entries` : 'Loading...'}
                  </Text>
                  <Text style={styles.pdfBannerSub}>
                    Owner: {user?.fullName || 'Merchant'} • Phone: {user?.phone || '0300-0000000'}
                  </Text>
                </View>

                <View style={styles.pdfWatermarkBox}>
                  <Text style={styles.pdfWatermarkText}>✓ ALL 6 LOG SECTIONS INCLUDED - PRINT & PDF READY</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.pdfPrintActionBtn, { flex: 1, backgroundColor: '#059669' }]}
                    onPress={async () => {
                      if (logsData) {
                        try {
                          await shareAuditPdf(user, logsData, dateRange);
                          setPdfPreviewVisible(false);
                          onShowToast?.('PDF Audit Report Generated & Ready for Sharing/Printing!');
                        } catch (e: any) {
                          Alert.alert('PDF Error', 'PDF generate karne mein masla aya.');
                        }
                      }
                    }}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.pdfPrintActionBtnText}>Share / Save PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pdfPrintActionBtn, { flex: 1, backgroundColor: '#0B192C' }]}
                    onPress={async () => {
                      if (logsData) {
                        try {
                          await printAuditPdf(user, logsData, dateRange);
                          setPdfPreviewVisible(false);
                          onShowToast?.('Sending Audit Statement to Printer...');
                        } catch (e: any) {
                          Alert.alert('Print Error', 'Print karne mein masla aya.');
                        }
                      }
                    }}
                  >
                    <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.pdfPrintActionBtnText}>Direct Print</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: 'rgba(11, 25, 44, 0.92)',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B192C',
    paddingTop: 45,
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 12,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dateChip: {
    flex: 1,
    backgroundColor: '#112238',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: '#059669',
    borderColor: '#34D399',
  },
  dateChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
  },
  topActionsRow: {
    gap: 8,
    marginBottom: 12,
  },
  downloadPdfBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  downloadPdfBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  purgeShortcutBtn: {
    backgroundColor: '#E11D48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  purgeShortcutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  tabsContainer: {
    marginBottom: 12,
  },
  tabsScroll: {
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#112238',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.25)',
    borderColor: '#059669',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#34D399',
    fontWeight: '800',
  },
  contentArea: {
    paddingBottom: 40,
  },
  panelCard: {
    backgroundColor: '#112238',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    padding: 14,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0B192C',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableCol: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tableCell: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  tableCellBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subCellText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  tillBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tillBadgeText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusBadgeCleared: {
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
  },
  statusBadgePartial: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusBadgeOverdue: {
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  auditActionBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  auditActionText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
  },
  pdfPreviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 40,
  },
  pdfHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pdfTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  pdfSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pdfBanner: {
    backgroundColor: '#0B192C',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  pdfBannerLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '800',
  },
  pdfBannerVal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#34D399',
    marginVertical: 4,
  },
  pdfBannerSub: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  pdfWatermarkBox: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  pdfWatermarkText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  pdfPrintActionBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  pdfPrintActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
