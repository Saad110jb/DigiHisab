import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { AddCustomerModal } from '../../components/AddCustomerModal';
import { AddSupplierModal } from '../../components/AddSupplierModal';
import { PaySupplierModal } from '../../components/PaySupplierModal';
import { AddUdhaarModal } from '../../components/AddUdhaarModal';
import { QuickWasoolModal } from '../../components/QuickWasoolModal';
import { DigitalReceiptModal, ReceiptData } from '../../components/DigitalReceiptModal';
import { StockManagementModal } from '../../components/StockManagementModal';
import { MerchantPayLinkModal } from '../../components/MerchantPayLinkModal';
import { TagazaModal, TagazaCustomer } from '../../components/TagazaModal';
import { GallaBandiModal } from '../../components/GallaBandiModal';
import { RecoveryRadarModal } from '../../components/RecoveryRadarModal';
import { StockAlertModal } from '../../components/StockAlertModal';
import { SupplierLedgerModal } from '../../components/SupplierLedgerModal';
import { MunafaAnalyticsModal } from '../../components/MunafaAnalyticsModal';
import { ManageTillModal } from '../../components/ManageTillModal';
import { AddSupplierBillModal } from '../../components/AddSupplierBillModal';
import { CashflowHistoryModal } from '../../components/CashflowHistoryModal';
import { QuickSaleModal } from '../../components/QuickSaleModal';
import {
  ContinuousBarcodeScannerModal,
  ScannedCartItem,
} from '../../components/ContinuousBarcodeScannerModal';
import { DukanStaffPayrollModal } from '../../components/DukanStaffPayrollModal';
import { DailyExpenseModal } from '../../components/DailyExpenseModal';
import { WholesalePoModal } from '../../components/WholesalePoModal';
import { BusinessLogsHubModal } from '../../components/BusinessLogsHubModal';
import { HelpGuideModal } from '../../components/HelpGuideModal';
import { ChorNazarSentinelModal } from '../../components/ChorNazarSentinelModal';
import { KarobarMoreToolsModal, KarobarToolItem } from '../../components/KarobarMoreToolsModal';
import { counterpartyApi, ICounterparty } from '../../api/counterparty.api';
import { ledgerApi, ILedgerEntry } from '../../api/ledger.api';
import { paymentLinkApi } from '../../api/paymentLink.api';
import { cashDrawerApi, ITillBalances } from '../../api/cashDrawer.api';
import { useAuth } from '../../store/auth.store';
import { NotificationProvider } from '../../context/NotificationContext';
import { PushNotificationBanner } from '../../components/PushNotificationBanner';
import { FinancialHeaderBanner } from '../../components/FinancialHeaderBanner';
import { LiquidityRadarModal } from '../../components/LiquidityRadarModal';
import { MandiArbitrageRadarModal } from '../../components/MandiArbitrageRadarModal';
import { DeadStockLiquidatorModal } from '../../components/DeadStockLiquidatorModal';
import { CustomerTieringMarketingModal } from '../../components/CustomerTieringMarketingModal';
import { socketService } from '../../services/socket.service';
import { IHighMarginBundle } from '../../api/deadStockLiquidator.api';
import { useFinancialMetrics } from '../../context/FinancialMetricsContext';
import { SubscriptionModal } from '../../components/SubscriptionModal';
import { subscriptionService } from '../../services/subscription.service';

type DeckTab = 'khata' | 'suppliers';

interface DebtorCard {
  id: string;
  name: string;
  phone: string;
  initial: string;
  amount: number;
  overdueDays: number;
  risk: 'HIGH' | 'MED' | 'LOW';
}

export interface CustomerCardItem {
  id: string;
  name: string;
  urduName?: string;
  phone: string;
  address?: string;
  cnic?: string;
  time: string;
  initial: string;
  currentBalance: number;
  creditLimit: number;
  advanceDeposit?: number;
  dueDate?: string;
  isCreditBlocked?: boolean;
  defaultReturnDays?: number;
  riskProfile?: {
    defaultProbability?: number;
    riskTier?: string;
  };
}

const DEBTORS_LIST: DebtorCard[] = [];

interface ReturnDateBadge {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  isOverdue: boolean;
}

export const getReturnDateBadge = (dueDateStr?: string, defaultDays = 7): ReturnDateBadge => {
  if (!dueDateStr) {
    return {
      color: '#006C4E',
      bgColor: '#E8F5EE',
      borderColor: '#A7F3D0',
      icon: 'time-outline',
      text: `Wada: Mamool (${defaultDays} Din)`,
      isOverdue: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDateStr);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const dayStr = target.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = months[target.getMonth()];

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return {
      color: '#E11D48',
      bgColor: '#FFE4E6',
      borderColor: '#FDA4AF',
      icon: 'alert-circle',
      text: `🔴 ${overdue} Din Taakheer (Promised: ${dayStr} ${monthStr})`,
      isOverdue: true,
    };
  } else if (diffDays <= 2) {
    return {
      color: '#B45309',
      bgColor: '#FEF3C7',
      borderColor: '#FDE68A',
      icon: 'alarm-outline',
      text: `🟡 ${diffDays === 0 ? 'Aaj Adaigi Ki Tareekh Hai!' : diffDays === 1 ? 'Kal Adaigi Ki Tareekh Hai' : '2 Din Baqi Hain'}`,
      isOverdue: false,
    };
  } else {
    return {
      color: '#006C4E',
      bgColor: '#E8F5EE',
      borderColor: '#A7F3D0',
      icon: 'checkmark-circle',
      text: `🟢 Wada: ${dayStr} ${monthStr} (${diffDays} Din Baqi)`,
      isOverdue: false,
    };
  }
};

const NOW = Date.now();
const INITIAL_CUSTOMERS: CustomerCardItem[] = [];

const INITIAL_SUPPLIERS: ICounterparty[] = [];

const PINNED_TOOLS_STORAGE_KEY = '@digihisab_pinned_tools';
const DEFAULT_PINNED_TOOL_IDS = [
  'quick_cash',
  'staff_tankha',
  'dukan_kharcha',
  'wholesale_po',
  'naya_udhaar',
];

export const VendorView: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1024;
  const isTablet = screenWidth >= 640 && screenWidth < 1024;

  const [pinnedToolIds, setPinnedToolIds] = useState<string[]>(DEFAULT_PINNED_TOOL_IDS);
  const [moreToolsModalVisible, setMoreToolsModalVisible] = useState(false);

  const { user } = useAuth();
  const {
    metrics,
    syncWasooli,
    syncQuickSale,
    syncExpense,
    syncSupplierBill,
    syncSupplierPaid,
    syncCreditSale,
    syncChannels,
    refreshMetricsFromServer,
  } = useFinancialMetrics();
  const userRole = user?.role || 'OWNER';
  const isCashier = userRole === 'CASHIER';
  const isManager = userRole === 'MANAGER';
  const isOwner = userRole === 'OWNER';

  const enforceRoleAccess = (requiredRole: 'MANAGER' | 'OWNER', actionNameUrdu: string): boolean => {
    if (requiredRole === 'OWNER' && userRole !== 'OWNER') {
      Alert.alert(
        '🔒 صرف مالک کے لیے (Owner Only)',
        `رسائی کی اجازت نہیں: "${actionNameUrdu}" کا فیچر صرف دکان کے مالک کے لیے ہے۔`,
        [{ text: 'ٹھیک ہے / OK', style: 'default' }]
      );
      return false;
    }
    if (requiredRole === 'MANAGER' && userRole === 'CASHIER') {
      Alert.alert(
        '🔒 صرف منیجر / مالک کے لیے (Manager Only)',
        `رسائی کی اجازت نہیں: کیشیئر کو "${actionNameUrdu}" استعمال کرنے کی اجازت نہیں ہے۔`,
        [{ text: 'ٹھیک ہے / OK', style: 'default' }]
      );
      return false;
    }
    return true;
  };

  const [activeTab, setActiveTab] = useState<DeckTab>('khata');
  const [searchQuery, setSearchQuery] = useState('');

  // Customer List State (Live)
  const [customerList, setCustomerList] = useState<CustomerCardItem[]>(INITIAL_CUSTOMERS);
  const [apiCounterparties, setApiCounterparties] = useState<ICounterparty[]>([]);

  // Supplier List State (Live)
  const [suppliersList, setSuppliersList] = useState<ICounterparty[]>(INITIAL_SUPPLIERS);
  const [addSupplierModalVisible, setAddSupplierModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<ICounterparty | null>(null);
  const [paySupplierModalVisible, setPaySupplierModalVisible] = useState(false);
  const [selectedPaySupplier, setSelectedPaySupplier] = useState<ICounterparty | null>(null);
  const [dueReminders, setDueReminders] = useState<any[]>([]);

  // Modals state
  const [helpGuideModalVisible, setHelpGuideModalVisible] = useState(false);
  const [addCustomerModalVisible, setAddCustomerModalVisible] = useState(false);
  const [addUdhaarModalVisible, setAddUdhaarModalVisible] = useState(false);
  const [selectedCustomerIdForUdhaar, setSelectedCustomerIdForUdhaar] = useState<string | undefined>(undefined);
  const [voiceTranscriptForUdhaar, setVoiceTranscriptForUdhaar] = useState<string | undefined>(undefined);

  // Filter & Delete States
  const [customerFilter, setCustomerFilter] = useState<'ALL' | 'UDHAAR_GT_ZERO' | 'ZERO_BALANCE' | 'OVERDUE' | 'CREDIT_BLOCKED'>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<'ALL' | 'MAINE_DENE_HAIN' | 'ADVANCE_SECURITY' | 'ZERO_BALANCE'>('ALL');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Safe Delete / Archive Confirmation Modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [targetToDelete, setTargetToDelete] = useState<{
    id: string;
    name: string;
    type: 'CUSTOMER' | 'SUPPLIER';
    balance: number;
  } | null>(null);
  const [isDeletingCounterparty, setIsDeletingCounterparty] = useState(false);

  const handleDeleteCounterpartyClick = (id: string, name: string, balance: number, type: 'CUSTOMER' | 'SUPPLIER') => {
    if (Math.abs(balance) > 0) {
      Alert.alert(
        '⚠️ کھاتہ ڈیلیٹ نہیں ہو سکتا',
        `اس کھاتے میں ابھی Rs. ${Math.abs(balance).toLocaleString()} کا بقایا بیلنس موجود ہے۔ پہلے حساب صاف (Zero Balance) کریں یا رقم وصول/ادا کریں۔`,
        [{ text: 'ٹھیک ہے / OK', style: 'default' }]
      );
      return;
    }
    setTargetToDelete({ id, name, type, balance });
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteCounterparty = async () => {
    if (!targetToDelete) return;
    setIsDeletingCounterparty(true);
    try {
      const res = await counterpartyApi.delete(targetToDelete.id);
      if (res.success) {
        if (targetToDelete.type === 'CUSTOMER') {
          setCustomerList((prev) => prev.filter((c) => c.id !== targetToDelete.id));
        } else {
          setSuppliersList((prev) => prev.filter((s) => s._id !== targetToDelete.id));
        }
        triggerToast(`"${targetToDelete.name}" کا کھاتہ کامیابی سے ختم / آرکائیو کر دیا گیا۔`);
      } else {
        triggerToast(res.message || 'کھاتہ ختم کرنے میں ناکامی ہوئی۔');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Server connection error.';
      Alert.alert('⚠️ خطا', errorMsg);
    } finally {
      setIsDeletingCounterparty(false);
      setDeleteModalVisible(false);
      setTargetToDelete(null);
    }
  };

  // Quick Wasool & Debt Settlement Modal state
  const [wasoolModalVisible, setWasoolModalVisible] = useState(false);
  const [selectedWasoolCustomer, setSelectedWasoolCustomer] = useState<{
    _id: string;
    name: string;
    phone?: string;
    currentBalance: number;
  } | null>(null);

  // Digital Payment Receipt Modal state
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Balance Privacy Eye Toggle State
  const [showBalance, setShowBalance] = useState(true);

  // 3-Way Liquid Cash Till & Full-Stack Modal States
  const [manageTillModalVisible, setManageTillModalVisible] = useState(false);
  const [addSupplierBillModalVisible, setAddSupplierBillModalVisible] = useState(false);
  const [cashflowHistoryModalVisible, setCashflowHistoryModalVisible] = useState(false);
  const [quickSaleModalVisible, setQuickSaleModalVisible] = useState(false);
  const [continuousScannerVisible, setContinuousScannerVisible] = useState(false);
  const [scannedInitialItems, setScannedInitialItems] = useState<any[]>([]);
  const [scannedInitialAmount, setScannedInitialAmount] = useState<number | undefined>(undefined);

  const handleContinuousScannerCheckout = (items: ScannedCartItem[], totalAmount: number) => {
    setScannedInitialItems(
      items.map((i) => ({
        itemId: i.inventoryItemId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
      }))
    );
    setScannedInitialAmount(totalAmount);
    setContinuousScannerVisible(false);
    setQuickSaleModalVisible(true);
  };
  const [dukanStaffModalVisible, setDukanStaffModalVisible] = useState(false);
  const [dailyExpenseModalVisible, setDailyExpenseModalVisible] = useState(false);
  const [wholesalePoModalVisible, setWholesalePoModalVisible] = useState(false);
  const [wholesalePoPrefillItem, setWholesalePoPrefillItem] = useState<{
    inventoryItemId?: string;
    itemName: string;
    quantityOrdered: number;
    unitCost?: number;
  } | undefined>(undefined);
  const [businessLogsModalVisible, setBusinessLogsModalVisible] = useState(false);

  // Unified Liquid Reserves derived directly from single-source-of-truth FinancialMetricsContext
  const tillBalances: ITillBalances = useMemo(() => ({
    physicalCash: metrics.channels.physicalCash,
    digitalWallet: metrics.channels.digitalWallet,
    bankAccount: metrics.channels.bankAccount,
    totalLiquidCapital:
      metrics.channels.physicalCash +
      metrics.channels.digitalWallet +
      metrics.channels.bankAccount,
  }), [metrics.channels.physicalCash, metrics.channels.digitalWallet, metrics.channels.bankAccount]);

  // New Grid Feature Modals
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [payLinkModalVisible, setPayLinkModalVisible] = useState(false);
  const [gallaBandiModalVisible, setGallaBandiModalVisible] = useState(false);
  const [recoveryRadarModalVisible, setRecoveryRadarModalVisible] = useState(false);
  const [liquidityRadarModalVisible, setLiquidityRadarModalVisible] = useState(false);
  const [mandiRadarModalVisible, setMandiRadarModalVisible] = useState(false);
  const [deadStockModalVisible, setDeadStockModalVisible] = useState(false);
  const [customerMarketingModalVisible, setCustomerMarketingModalVisible] = useState(false);
  const [selectedBundleForQuickSale, setSelectedBundleForQuickSale] = useState<IHighMarginBundle | undefined>(undefined);
  const [stockAlertModalVisible, setStockAlertModalVisible] = useState(false);
  const [supplierLedgerModalVisible, setSupplierLedgerModalVisible] = useState(false);
  const [munafaModalVisible, setMunafaModalVisible] = useState(false);
  const [chorNazarModalVisible, setChorNazarModalVisible] = useState(false);
  const [vendorSubModalOpen, setVendorSubModalOpen] = useState(false);
  const [vendorSubTrigger, setVendorSubTrigger] = useState<{ key?: string; title?: string }>({});

  const enforceFeatureAccess = async (featureKey: string): Promise<boolean> => {
    const result = await subscriptionService.checkFeatureAccess(featureKey, 'VENDOR');
    if (!result.allowed) {
      setVendorSubTrigger({ key: result.featureKey, title: result.featureTitleUrdu });
      setVendorSubModalOpen(true);
      return false;
    }
    return true;
  };
  const [tagazaModalVisible, setTagazaModalVisible] = useState(false);
  const [selectedTagazaCustomer, setSelectedTagazaCustomer] = useState<TagazaCustomer | null>(null);

  // PDF Statement Modal state
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [pdfStatementData, setPdfStatementData] = useState<{
    counterpartyName: string;
    statementDate: string;
    htmlContent: string;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Financial summary data state (initialized to 0)
  const [summaryData, setSummaryData] = useState({
    kulLena: 0,
    kulDena: 0,
    netMarketPosition: 0,
    isOverleveraged: false,
    gallaCash: 0,
    cashRunwayDays: 16,
  });

  // Debt Aging Radar & Risk Scoring State (1-D)
  const [agingFilter, setAgingFilter] = useState<'ALL' | '0-7d' | '8-15d' | '16-30d' | '30+d'>('ALL');
  const [agingBuckets, setAgingBuckets] = useState({
    days0To7: { count: 0, totalAmount: 0 },
    days8To15: { count: 0, totalAmount: 0 },
    days16To30: { count: 0, totalAmount: 0 },
    days30Plus: { count: 0, totalAmount: 0 },
  });
  const [radarDebtorsList, setRadarDebtorsList] = useState<any[]>([]);

  // Floating Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const handleGeneratePdfStatement = async (counterpartyId: string, name: string) => {
    try {
      setIsGeneratingPdf(true);
      const res = await ledgerApi.generateStatementPdf({ counterpartyId });
      if (res.success && res.data) {
        setPdfStatementData(res.data);
        setPdfModalVisible(true);
        triggerToast(`Statement PDF ba-naam ${name} tiyyar hai!`);
      } else {
        triggerToast(res.message || 'Statement generate na ho saka.');
      }
    } catch (err: any) {
      setPdfStatementData({
        counterpartyName: name,
        statementDate: new Date().toLocaleDateString('en-PK'),
        htmlContent: `<div style="padding:20px;font-family:sans-serif;color:#0F172A;">
          <h2 style="color:#006C4E;">🏢 Digital Khata Statement</h2>
          <p><strong>Gahak / Wholesaler:</strong> ${name}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-PK')}</p>
          <hr/>
          <p>Official ledger statement generated via Digi Hisab Khata AI.</p>
        </div>`,
      });
      setPdfModalVisible(true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Fetch backend counterparties, financial summary, and debt aging radar
  const fetchDashboardData = async () => {
    try {
      const res = await counterpartyApi.getAll({ relationType: 'CUSTOMER' });
      if (res.success && res.data && res.data.length > 0) {
        setApiCounterparties(res.data);
        const formatted: CustomerCardItem[] = res.data.map((c) => ({
          id: c._id,
          name: c.name,
          urduName: undefined,
          phone: c.phone,
          address: c.address,
          cnic: c.cnic,
          time: 'Registered Khata',
          initial: (c.name && c.name[0]) ? c.name[0] : 'G',
          currentBalance: c.currentBalance,
          creditLimit: c.creditLimit,
          advanceDeposit: c.advanceDeposit,
          isCreditBlocked: c.isCreditBlocked,
          defaultReturnDays: c.defaultReturnDays || 7,
          riskProfile: c.riskProfile,
        }));
        setCustomerList(formatted);
      }

      const supRes = await counterpartyApi.getAll({ relationType: 'SUPPLIER' });
      if (supRes.success && supRes.data && supRes.data.length > 0) {
        setSuppliersList(supRes.data);
      }

      const dueRes = await counterpartyApi.getSupplierDueReminders();
      if (dueRes.success && dueRes.data) {
        setDueReminders(dueRes.data);
      }

      const sumRes = await ledgerApi.getSummary();
      let expectedCashVal = 0;
      try {
        const cashRes = await cashDrawerApi.calculateExpectedCash();
        if (cashRes.success && cashRes.data && cashRes.data.systemExpectedCash > 0) {
          expectedCashVal = cashRes.data.systemExpectedCash;
        }
      } catch (err) {}

      if (sumRes.success && sumRes.data) {
        const fetchedLena = sumRes.data.kulLena !== undefined ? sumRes.data.kulLena : (sumRes.data.receivables !== undefined ? sumRes.data.receivables : 0);
        const fetchedDena = sumRes.data.kulDena !== undefined ? sumRes.data.kulDena : (sumRes.data.payables !== undefined ? sumRes.data.payables : 0);
        const fetchedGalla = sumRes.data.channels?.physicalCash ?? (sumRes.data.gallaCash !== undefined ? sumRes.data.gallaCash : expectedCashVal);
        const fetchedNet = (sumRes.data.netMarketPosition !== undefined) ? sumRes.data.netMarketPosition : (fetchedGalla + fetchedLena - fetchedDena);

        setSummaryData({
          kulLena: fetchedLena,
          kulDena: fetchedDena,
          netMarketPosition: fetchedNet,
          isOverleveraged: sumRes.data.isOverleveraged || false,
          gallaCash: fetchedGalla,
          cashRunwayDays: sumRes.data.cashRunwayDays || 16,
        });
      }

      const radarRes = await counterpartyApi.getDebtAgingRadar();
      if (radarRes.success && radarRes.data) {
        if (radarRes.data.buckets) setAgingBuckets(radarRes.data.buckets);
        if (radarRes.data.debtors && radarRes.data.debtors.length > 0) {
          const formatted = radarRes.data.debtors.map((d) => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            initial: (d.name && d.name[0]) ? d.name[0] : 'G',
            amount: d.currentBalance,
            overdueDays: d.overdueDays,
            agingCategory: d.agingCategory,
            risk: d.riskTier === 'HIGH' ? 'HIGH' : d.riskTier === 'MEDIUM' ? 'MED' : 'LOW',
          }));
          setRadarDebtorsList(formatted);
        }
      }
    } catch (e) {
      // Fallback gracefully to offline initial dataset
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Multi-Terminal Real-Time Till Pooling Subscriptions (Socket.io)
    const unsubSale = socketService.onSaleCompleted((data) => {
      fetchDashboardData();
    });

    const unsubDrawer = socketService.onDrawerVariance((data) => {
      fetchDashboardData();
    });

    const unsubUdhaar = socketService.onUdhaarUpdated((data) => {
      fetchDashboardData();
    });

    return () => {
      unsubSale();
      unsubDrawer();
      unsubUdhaar();
    };
  }, []);

  // Recalculate dynamic summaryData whenever customerList, suppliersList, or physicalCash update
  useEffect(() => {
    const computedKulLena = customerList.reduce((acc, c) => acc + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const computedKulDena = suppliersList.reduce(
      (acc, s) => acc + (s.currentBalance < 0 ? Math.abs(s.currentBalance) : (s as any).currentBalance > 0 ? (s as any).currentBalance : 0),
      0
    );

    const activeKulLena = computedKulLena;
    const activeKulDena = computedKulDena;
    const activeGalla = metrics.channels.physicalCash >= 0 ? metrics.channels.physicalCash : 18450;
    const netPos = activeGalla + activeKulLena - activeKulDena;
    const runway = Math.max(1, Math.round(activeGalla / 500));
    const isOver = activeKulLena < activeKulDena;

    setSummaryData((prev) => {
      if (
        prev.kulLena === activeKulLena &&
        prev.kulDena === activeKulDena &&
        prev.netMarketPosition === netPos &&
        prev.gallaCash === activeGalla &&
        prev.cashRunwayDays === runway &&
        prev.isOverleveraged === isOver
      ) {
        return prev;
      }
      return {
        kulLena: activeKulLena,
        kulDena: activeKulDena,
        netMarketPosition: netPos,
        isOverleveraged: isOver,
        gallaCash: activeGalla,
        cashRunwayDays: runway,
      };
    });
  }, [customerList, suppliersList, metrics.channels.physicalCash]);

  const handleOpenWasool = (cust: CustomerCardItem) => {
    setSelectedWasoolCustomer({
      _id: cust.id,
      name: cust.name,
      phone: cust.phone,
      currentBalance: cust.currentBalance,
    });
    setWasoolModalVisible(true);
  };

  const handleWasoolSuccess = (res: ReceiptData) => {
    setWasoolModalVisible(false);

    const modeStr = String(res.paymentMode || '').toUpperCase();
    const dest = modeStr.includes('BANK') || modeStr.includes('RAAST') ? 'BANK' : modeStr.includes('WALLET') || modeStr.includes('JAZZ') || modeStr.includes('EASY') ? 'WALLET' : 'CASH';
    syncWasooli(res.amountPaid, dest);

    // Optimistically update customer balance
    setCustomerList((prev) =>
      prev.map((c) =>
        c.id === res.counterpartyId || c.name === res.counterpartyName
          ? { ...c, currentBalance: res.remainingBalance }
          : c
      )
    );

    setSummaryData((prev) => {
      const gallaIncr = res.paymentMode === 'CASH' ? res.amountPaid : 0;
      const newKulLena = Math.max(0, prev.kulLena - res.amountPaid);
      const newGalla = prev.gallaCash + gallaIncr;
      return {
        ...prev,
        gallaCash: newGalla,
        kulLena: newKulLena,
        netMarketPosition: newKulLena - prev.kulDena,
      };
    });

    setReceiptData(res);
    setReceiptModalVisible(true);
    refreshMetricsFromServer().catch(() => {});
    fetchDashboardData().catch(() => {});
    triggerToast(`Shukriya! Wasooli/Settlement ba-naam ${res.counterpartyName} darj hogayi!`);
  };

  const handleSendWhatsAppTagaza = (
    name: string,
    phone: string,
    amt: number,
    counterpartyId?: string,
    dueDate?: string,
    extra?: {
      creditLimit?: number;
      defaultProbability?: number;
      priorRemindersSentCount?: number;
      address?: string;
    }
  ) => {
    setSelectedTagazaCustomer({
      id: counterpartyId || 'demo',
      name,
      phone,
      currentBalance: amt,
      dueDate,
      creditLimit: extra?.creditLimit,
      defaultProbability: extra?.defaultProbability,
      priorRemindersSentCount: extra?.priorRemindersSentCount,
      address: extra?.address,
    });
    setTagazaModalVisible(true);
  };

  const handleOpenAddUdhaar = (customerId?: string, transcript?: string) => {
    setSelectedCustomerIdForUdhaar(customerId);
    setVoiceTranscriptForUdhaar(transcript);
    setAddUdhaarModalVisible(true);
  };

  // Load user's customized pinned tools from persistent storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(PINNED_TOOLS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPinnedToolIds(parsed.slice(0, 5));
          }
        }
      } catch (err) {}
    })();
  }, []);

  const handleTogglePinTool = async (toolId: string) => {
    let next: string[];
    if (pinnedToolIds.includes(toolId)) {
      if (pinnedToolIds.length <= 1) {
        Alert.alert('کم از کم ایک ٹول', 'ڈیش بورڈ پر کم از کم 1 ٹول پن ہونا ضروری ہے۔');
        return;
      }
      next = pinnedToolIds.filter((id) => id !== toolId);
    } else {
      if (pinnedToolIds.length >= 5) {
        Alert.alert(
          '📌 حد پوری ہو گئی (Pin Limit Reached)',
          'زیادہ سے زیادہ 5 ٹولز مین ڈیش بورڈ پر لگائے جا سکتے ہیں۔ کسی ایک کو ہٹا کر تبدیل کریں۔',
          [{ text: 'ٹھیک ہے / OK' }]
        );
        return;
      }
      next = [...pinnedToolIds, toolId];
    }
    setPinnedToolIds(next);
    try {
      await AsyncStorage.setItem(PINNED_TOOLS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {}
  };

  // Complete catalog of all 19 Karobar Services
  const allKarobarTools: KarobarToolItem[] = useMemo(() => [
    {
      id: 'quick_cash',
      title: 'Quick Cash Sale',
      titleUrdu: 'فوری نقد سیل',
      icon: 'cash',
      iconColor: '#006C4E',
      iconBg: '#E8F5EE',
      onPress: () => setQuickSaleModalVisible(true),
    },
    {
      id: 'continuous_barcode_scan',
      title: 'Continuous Scanner',
      titleUrdu: 'بارکوڈ اسکینر (60 FPS)',
      icon: 'barcode-outline',
      iconColor: '#00D2B4',
      iconBg: 'rgba(0, 210, 180, 0.12)',
      onPress: () => setContinuousScannerVisible(true),
    },
    {
      id: 'staff_tankha',
      title: 'Staff & Tankha',
      titleUrdu: 'ملازمین تنخواہ',
      icon: 'people-outline',
      iconColor: '#4F46E5',
      iconBg: '#EEF2FF',
      roleRequired: 'MANAGER',
      onPress: () => enforceRoleAccess('MANAGER', 'ملازمین تنخواہ') && setDukanStaffModalVisible(true),
    },
    {
      id: 'dukan_kharcha',
      title: 'Dukan Kharcha',
      titleUrdu: 'دکان یومیہ خرچہ',
      icon: 'receipt',
      iconColor: '#E11D48',
      iconBg: '#FFE4E6',
      onPress: () => setDailyExpenseModalVisible(true),
    },
    {
      id: 'wholesale_po',
      title: 'Wholesale PO',
      titleUrdu: 'تھوک خریداری آرڈر',
      icon: 'cart-outline',
      iconColor: '#0284C7',
      iconBg: '#E0F2FE',
      roleRequired: 'MANAGER',
      onPress: () => enforceRoleAccess('MANAGER', 'تھوک خریداری آرڈر') && setWholesalePoModalVisible(true),
    },
    {
      id: 'naya_udhaar',
      title: '+ Naya Udhaar',
      titleUrdu: 'نیا ادھار',
      icon: 'receipt-outline',
      iconColor: '#006C4E',
      iconBg: '#E8F5EE',
      onPress: () => handleOpenAddUdhaar(),
    },
    {
      id: 'naya_gahak',
      title: '+ Naya Gahak',
      titleUrdu: 'نیا گاہک',
      icon: 'person-add',
      iconColor: '#0D9488',
      iconBg: '#CCFBF1',
      onPress: () => setAddCustomerModalVisible(true),
    },
    {
      id: 'naya_supplier',
      title: '+ Naya Supplier',
      titleUrdu: 'نیا سپلائر',
      icon: 'business',
      iconColor: '#0284C7',
      iconBg: '#E0F2FE',
      roleRequired: 'MANAGER',
      onPress: () => {
        if (!enforceRoleAccess('MANAGER', 'نیا سپلائر')) return;
        setEditingSupplier(null);
        setAddSupplierModalVisible(true);
      },
    },
    {
      id: 'manage_till',
      title: 'Manage Till',
      titleUrdu: 'گلہ کنٹرول',
      icon: 'wallet-outline',
      iconColor: '#0284C7',
      iconBg: '#E0F2FE',
      roleRequired: 'MANAGER',
      onPress: () => enforceRoleAccess('MANAGER', 'گلہ کنٹرول') && setManageTillModalVisible(true),
    },
    {
      id: 'add_bill',
      title: 'Add Bill',
      titleUrdu: 'سپلائر بل',
      icon: 'document-text-outline',
      iconColor: '#E11D48',
      iconBg: '#FFE4E6',
      roleRequired: 'MANAGER',
      onPress: () => enforceRoleAccess('MANAGER', 'سپلائر بل') && setAddSupplierBillModalVisible(true),
    },
    {
      id: 'cashflow_ledger',
      title: 'Cashflow Ledger',
      titleUrdu: 'روزنامچہ ہسٹری',
      icon: 'swap-horizontal',
      iconColor: '#7E22CE',
      iconBg: '#F3E8FF',
      roleRequired: 'OWNER',
      onPress: () => enforceRoleAccess('OWNER', 'روزنامچہ ہسٹری') && setCashflowHistoryModalVisible(true),
    },
    {
      id: 'galla_bandi',
      title: 'Galla Bandi',
      titleUrdu: 'گلہ بندی',
      icon: 'calculator',
      iconColor: '#0284C7',
      iconBg: '#E0F2FE',
      roleRequired: 'MANAGER',
      onPress: () => enforceRoleAccess('MANAGER', 'گلہ بندی') && setGallaBandiModalVisible(true),
    },
    {
      id: 'stock_control',
      title: 'Stock Control',
      titleUrdu: 'اسٹاک کنٹرول',
      icon: 'cube-outline',
      iconColor: '#7E22CE',
      iconBg: '#F3E8FF',
      onPress: () => setStockModalVisible(true),
    },
    {
      id: 'pay_link',
      title: 'Pay Link & QR',
      titleUrdu: 'ادائیگی لنک',
      icon: 'qr-code',
      iconColor: '#B45309',
      iconBg: '#FEF3C7',
      badge: 'Raast',
      badgeType: 'orange',
      onPress: () => setPayLinkModalVisible(true),
    },
    {
      id: 'recovery_radar',
      title: 'Recovery Radar',
      titleUrdu: 'وصولی ریڈار',
      icon: 'radio',
      iconColor: '#E11D48',
      iconBg: '#FFE4E6',
      badge: 'Recovery',
      badgeType: 'red',
      onPress: () => setRecoveryRadarModalVisible(true),
    },
    {
      id: 'stock_alerts',
      title: 'Stock Alerts',
      titleUrdu: 'اسٹاک الرٹس',
      icon: 'warning',
      iconColor: '#B45309',
      iconBg: '#FEF3C7',
      roleRequired: 'MANAGER',
      badge: 'Alerts',
      badgeType: 'orange',
      onPress: () => enforceRoleAccess('MANAGER', 'اسٹاک الرٹس') && setStockAlertModalVisible(true),
    },
    {
      id: 'supplier_khata',
      title: 'Supplier Khata',
      titleUrdu: 'سپلائر کھاتہ',
      icon: 'car-outline',
      iconColor: '#0284C7',
      iconBg: '#E0F2FE',
      roleRequired: 'MANAGER',
      onPress: () => enforceRoleAccess('MANAGER', 'سپلائر کھاتہ') && setSupplierLedgerModalVisible(true),
    },
    {
      id: 'munafa_report',
      title: 'Munafa Forensic Auditor',
      titleUrdu: 'فارنزک منافع و ٹیکس آڈٹ',
      icon: 'trending-up',
      iconColor: '#15803D',
      iconBg: '#DCFCE7',
      badge: 'Forensic AI',
      badgeType: 'orange',
      roleRequired: 'OWNER',
      onPress: () => enforceRoleAccess('OWNER', 'فارنزک منافع و ٹیکس آڈٹ') && setMunafaModalVisible(true),
    },
    {
      id: 'chor_nazar',
      title: 'Chor Nazar',
      titleUrdu: 'چور نظر سینٹینل',
      icon: 'shield-half',
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
      roleRequired: 'OWNER',
      onPress: async () => {
        if (!enforceRoleAccess('OWNER', 'چور نظر سینٹینل')) return;
        const ok = await enforceFeatureAccess('FEATURE_CHOR_NAZAR_AUDIT');
        if (ok) setChorNazarModalVisible(true);
      },
    },
    {
      id: 'mandi_radar',
      title: 'Mandi Rate Radar',
      titleUrdu: 'منڈی ریٹ ریڈار',
      icon: 'trending-up',
      iconColor: '#059669',
      iconBg: '#ECFDF5',
      badge: 'Arbitrage',
      badgeType: 'orange',
      roleRequired: 'MANAGER',
      onPress: async () => {
        if (!enforceRoleAccess('MANAGER', 'منڈی ریٹ ریڈار')) return;
        const ok = await enforceFeatureAccess('FEATURE_AI_STOCK_PREDICTOR');
        if (ok) setMandiRadarModalVisible(true);
      },
    },
    {
      id: 'dead_stock_liquidator',
      title: 'Stock Liquidator',
      titleUrdu: 'اسٹاک لیکویڈیٹر و ایکسپائری',
      icon: 'flame',
      iconColor: '#DC2626',
      iconBg: '#FEE2E2',
      badge: 'AI Bundles',
      badgeType: 'red',
      roleRequired: 'MANAGER',
      onPress: async () => {
        if (!enforceRoleAccess('MANAGER', 'اسٹاک لیکویڈیٹر')) return;
        const ok = await enforceFeatureAccess('FEATURE_AI_STOCK_PREDICTOR');
        if (ok) setDeadStockModalVisible(true);
      },
    },
    {
      id: 'customer_marketing',
      title: 'Customer RFM & WhatsApp',
      titleUrdu: 'گاہک درجات و مارکیٹنگ',
      icon: 'chatbubbles',
      iconColor: '#006C4E',
      iconBg: '#E8F5EE',
      badge: '⭐ PRO / RFM',
      badgeType: 'orange',
      onPress: async () => {
        const ok = await enforceFeatureAccess('FEATURE_AI_TAGAZA_TONES');
        if (ok) setCustomerMarketingModalVisible(true);
      },
    },
    {
      id: 'madad_help',
      title: 'Madad / Help',
      titleUrdu: 'مدد و رہنمائی',
      icon: 'headset',
      iconColor: '#57FBDB',
      iconBg: '#002E1E',
      isHelpCard: true,
      onPress: () => setHelpGuideModalVisible(true),
    },
  ], [userRole, isOwner, isCashier]);

  const displayedPinnedTools = useMemo(() => {
    return pinnedToolIds
      .map((id) => allKarobarTools.find((t) => t.id === id))
      .filter(Boolean) as KarobarToolItem[];
  }, [pinnedToolIds, allKarobarTools]);

  const handleCustomerCreated = (newCust: ICounterparty) => {
    const newItem: CustomerCardItem = {
      id: newCust._id,
      name: newCust.name,
      phone: newCust.phone,
      address: newCust.address,
      cnic: newCust.cnic,
      time: 'Abhi shamil hua',
      initial: (newCust.name && newCust.name[0]) ? newCust.name[0] : 'G',
      currentBalance: newCust.currentBalance || 0,
      creditLimit: newCust.creditLimit || 5000,
      isCreditBlocked: newCust.isCreditBlocked,
      defaultReturnDays: newCust.defaultReturnDays || 7,
    };
    setCustomerList((prev) => [newItem, ...prev]);
    setApiCounterparties((prev) => [newCust, ...prev]);
    triggerToast(`Mubarak! Naya gahak "${newCust.name}" kamyabi se shamil hogaya!`);
  };

  const handleUdhaarAdded = (entry: ILedgerEntry) => {
    if (entry.counterpartyId) {
      setCustomerList((prev) =>
        prev.map((c) =>
          c.id === entry.counterpartyId
            ? {
                ...c,
                currentBalance: c.currentBalance + entry.amount,
                dueDate: entry.dueDate || c.dueDate,
              }
            : c
        )
      );
    }
    setSummaryData((prev) => {
      const newKulLena = prev.kulLena + entry.amount;
      return {
        ...prev,
        kulLena: newKulLena,
        netMarketPosition: newKulLena - prev.kulDena,
      };
    });
    triggerToast(`Rs. ${entry.amount.toLocaleString()} udhaar kamyabi se darj hogaya!`);
  };

  // Convert customer list to ICounterparty compatibility format for AddUdhaarModal
  const modalCustomersList: ICounterparty[] = customerList.map((c) => ({
    _id: c.id,
    profileId: user?.id || (user as any)?.profileId || '',
    name: c.name,
    phone: c.phone,
    address: c.address,
    cnic: c.cnic,
    relationType: 'CUSTOMER' as const,
    currentBalance: c.currentBalance,
    creditLimit: c.creditLimit,
    advanceDeposit: c.advanceDeposit,
    defaultReturnDays: c.defaultReturnDays,
    isCreditBlocked: !!c.isCreditBlocked,
    riskProfile: {
      defaultProbability: 0.1,
      riskTier: 'LOW' as const,
      overdueDays: 0,
      currentToneTier: 1,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Filtered customer list
  const filteredCustomers = customerList.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.urduName && c.urduName.includes(searchQuery)) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (customerFilter === 'UDHAAR_GT_ZERO') {
      return c.currentBalance > 0;
    }
    if (customerFilter === 'ZERO_BALANCE') {
      return c.currentBalance === 0;
    }
    if (customerFilter === 'OVERDUE') {
      const returnBadge = getReturnDateBadge(c.dueDate, c.defaultReturnDays);
      return c.currentBalance > 0 && returnBadge.isOverdue;
    }
    if (customerFilter === 'CREDIT_BLOCKED') {
      return c.isCreditBlocked || c.currentBalance > c.creditLimit;
    }
    return true;
  });

  // Filtered supplier list
  const filteredSuppliers = suppliersList.filter((sup) => {
    const matchesSearch =
      !searchQuery ||
      sup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sup.phone.includes(searchQuery) ||
      (sup.address && sup.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sup.supplierCategory && sup.supplierCategory.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (supplierFilter === 'MAINE_DENE_HAIN') {
      return sup.currentBalance !== 0;
    }
    if (supplierFilter === 'ADVANCE_SECURITY') {
      return (sup.advanceDeposit || 0) > 0;
    }
    if (supplierFilter === 'ZERO_BALANCE') {
      return sup.currentBalance === 0 && !(sup.advanceDeposit && sup.advanceDeposit > 0);
    }
    return true;
  });

  const handleNotificationAction = (actionRoute?: string) => {
    if (!actionRoute) return;
    switch (actionRoute) {
      case 'WholesalePoModal':
        setWholesalePoModalVisible(true);
        break;
      case 'UdhaarTaqazaModal':
      case 'TagazaModal':
        setTagazaModalVisible(true);
        break;
      case 'CashflowHistoryModal':
        setCashflowHistoryModalVisible(true);
        break;
      case 'PaySupplierModal':
        setPaySupplierModalVisible(true);
        break;
      case 'DukanStaffPayrollModal':
        setDukanStaffModalVisible(true);
        break;
      case 'RecoveryRadarModal':
      case 'LiquidityRadarModal':
        setLiquidityRadarModalVisible(true);
        break;
      default:
        break;
    }
  };

  return (
    <NotificationProvider>
      <View style={styles.outerWrapper}>
        <PushNotificationBanner onActionClick={handleNotificationAction} />
      {/* Toast Alert Banner */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#8FF6CA" />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastMessage}
          </Text>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>


        {/* Cashier Scoping Notice Banner if logged in as Cashier */}
        {isCashier && (
          <View style={styles.cashierNoticeBanner}>
            <Ionicons name="shield-half-outline" size={18} color="#0369A1" />
            <Text style={styles.cashierNoticeTitle}>
              Cashier Sub-Account (کیشیئر موڈ): Restricted to Wasooli & Udhaar logging.
            </Text>
          </View>
        )}

        {/* Reactive Live Financial Overview Banner & Liquidity Cards */}
        <FinancialHeaderBanner
          onOpenManageTill={() => setManageTillModalVisible(true)}
          onOpenWasooliModal={() => {
            if (customerList.length > 0) {
              handleOpenWasool(customerList[0]);
            }
          }}
          onOpenPaySupplierModal={() => setSupplierLedgerModalVisible(true)}
          onOpenLiquidityRadar={() => setLiquidityRadarModalVisible(true)}
        />

        {/* 3. Voice Prompt Mint Banner */}
        <TouchableOpacity
          style={styles.voiceMintBanner}
          onPress={() => handleOpenAddUdhaar(undefined, '')}
        >
          <View style={styles.mintBannerLeft}>
            <View style={styles.mintIconCircle}>
              <Ionicons name="mic-circle" size={20} color="#006C4E" />
            </View>
            <Text style={styles.mintBannerUrdu}>"بولیں: "راشد سے بارہ سو روپے وصول ہوئے</Text>
          </View>
          <View style={styles.tryNowBtn}>
            <Text style={styles.tryNowBtnText}>Try Now</Text>
          </View>
        </TouchableOpacity>

        {/* 4. Karobar Hub Section (Pinned 5 Actions + 6th '... More Tools' Card) */}
        <View style={styles.karobarHubSection}>
          <View style={styles.karobarHeaderRow}>
            <View style={styles.karobarTitleLeft}>
              <View style={styles.greenBarStripe} />
              <Text style={styles.karobarTitle}>Karobar Hub (کاروباری ٹولز)</Text>
            </View>
            <TouchableOpacity
              style={styles.allToolsHeaderPill}
              onPress={() => setMoreToolsModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="apps-outline" size={13} color="#0284C7" />
              <Text style={styles.servicesCountText}>
                {allKarobarTools.length} Services ({allKarobarTools.length - displayedPinnedTools.length} More)
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hubGrid3Cols}>
            {/* First 5 Slots: Pinned Cards */}
            {displayedPinnedTools.map((tool) => {
              const isLockedForCashier = tool.roleRequired === 'MANAGER' && isCashier;
              const isLockedForNonOwner = tool.roleRequired === 'OWNER' && !isOwner;
              const isLocked = isLockedForCashier || isLockedForNonOwner;

              return (
                <TouchableOpacity
                  key={tool.id}
                  style={[
                    styles.hubCard,
                    tool.isHelpCard && styles.hubCardHelp,
                    isDesktop ? { width: '31.3%' } : isTablet ? { width: '48.2%' } : { width: '100%' },
                  ]}
                  onPress={tool.onPress}
                  activeOpacity={0.8}
                >
                  {isLocked ? (
                    <View style={styles.topBadgeRed}>
                      <Text style={styles.topBadgeTextRed}>
                        🔒 {isLockedForNonOwner ? 'Owner' : 'Mgr'}
                      </Text>
                    </View>
                  ) : tool.badge ? (
                    <View
                      style={tool.badgeType === 'orange' ? styles.topBadgeOrange : styles.topBadgeRed}
                    >
                      <Text
                        style={tool.badgeType === 'orange' ? styles.topBadgeTextOrange : styles.topBadgeTextRed}
                      >
                        {tool.badge}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      tool.isHelpCard ? styles.helpIconCircle : styles.hubIconCircle,
                      !tool.isHelpCard && { backgroundColor: tool.iconBg },
                    ]}
                  >
                    <Ionicons
                      name={tool.icon}
                      size={22}
                      color={tool.isHelpCard ? '#57FBDB' : tool.iconColor}
                    />
                  </View>

                  <Text
                    style={[styles.hubCardTitle, tool.isHelpCard && styles.helpCardTitle]}
                    numberOfLines={1}
                  >
                    {tool.title}
                  </Text>
                  <Text
                    style={[styles.hubCardSub, tool.isHelpCard && styles.helpCardSub]}
                    numberOfLines={1}
                  >
                    {tool.titleUrdu}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* 6th Slot: Dedicated Interactive '... More Tools' Card */}
            <TouchableOpacity
              style={[
                styles.hubCard,
                styles.hubCardMoreTools,
                isDesktop ? { width: '31.3%' } : isTablet ? { width: '48.2%' } : { width: '100%' },
              ]}
              onPress={() => setMoreToolsModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.topBadgeMoreTools}>
                <Text style={styles.topBadgeTextMoreTools}>
                  {allKarobarTools.length - displayedPinnedTools.length} More Available
                </Text>
              </View>

              <View style={[styles.hubIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="apps" size={24} color="#0284C7" />
              </View>
              <Text style={[styles.hubCardTitle, { color: '#0284C7' }]}>⋯ مزید ٹولز (More)</Text>
              <Text style={styles.hubCardSub}>View All {allKarobarTools.length} Services</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. TAZA TAREEN ENTRIES Section */}
        <View style={styles.tazaTareenSection}>
          <View style={styles.tazaTareenHeader}>
            <Text style={styles.tazaTareenTitle}>TAZA TAREEN ENTRIES (تازہ ترین)</Text>
            <TouchableOpacity onPress={() => setActiveTab('khata')}>
              <Text style={styles.sabDekheinLink}>Sab Dekhein</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tazaTareenList}>
            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', paddingVertical: 10 }}>
              Abhi tak koi taza entry darj nahi hui.
            </Text>
          </View>
        </View>

        {/* 4. Tabbed Operational Deck */}
        <View style={styles.tabDeck}>
          {/* Tab Switcher Headers */}
          <View style={styles.tabGroupBar}>
            <TouchableOpacity
              style={[styles.deckTabBtn, activeTab === 'khata' && styles.deckTabBtnActive]}
              onPress={() => setActiveTab('khata')}
            >
              <Ionicons
                name="people"
                size={16}
                color={activeTab === 'khata' ? COLORS.navy : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.deckTabBtnText,
                  activeTab === 'khata' && styles.deckTabBtnTextActive,
                ]}
                numberOfLines={1}
              >
                👥 Gahak Khata (گاہک کھاتہ)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deckTabBtn, activeTab === 'suppliers' && styles.deckTabBtnActive]}
              onPress={() => setActiveTab('suppliers')}
            >
              <Ionicons
                name="business"
                size={16}
                color={activeTab === 'suppliers' ? COLORS.navy : COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.deckTabBtnText,
                  activeTab === 'suppliers' && styles.deckTabBtnTextActive,
                ]}
                numberOfLines={1}
              >
                🏢 Suppliers ({suppliersList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: KHATA CUSTOMER LIST & CREDIT GOVERNANCE */}
          {activeTab === 'khata' && (
            <View style={styles.tabContentPanel}>
              {/* Khata Header & + Naya Gahak Button */}
              <View style={styles.khataGovHeader}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={styles.khataGovTitle}>Customer Khata Governance</Text>
                  <Text style={styles.khataGovSubtitle}>
                    {customerList.length} Mehfooz Khatay • حدِ ادھار اور وعدے کی تاریخ
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <TouchableOpacity
                    style={styles.addNayaGahakBtn}
                    onPress={() => setAddCustomerModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="person-add" size={14} color="#00201A" />
                    <Text style={styles.addNayaGahakBtnText}>+ Gahak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.addNayaGahakBtn, { backgroundColor: '#006C4E' }]}
                    onPress={() => handleOpenAddUdhaar()}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="receipt-outline" size={14} color="#FFF" />
                    <Text style={[styles.addNayaGahakBtnText, { color: '#FFF' }]}>+ Udhaar / بل</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Bar & Status Filter */}
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Gahak ka naam, phone ya pata (گاہک تلاش کریں)..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.filterBtn, customerFilter !== 'ALL' && styles.filterBtnActive]}
                  onPress={() => setFilterModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="options-outline" size={18} color={customerFilter !== 'ALL' ? '#FFF' : COLORS.navy} />
                  {customerFilter !== 'ALL' && <View style={styles.filterActiveBadgeDot} />}
                </TouchableOpacity>
              </View>

              {/* Customer Rows */}
              <View style={styles.customerList}>
                {filteredCustomers.map((cust) => {
                  const returnBadge = getReturnDateBadge(cust.dueDate, cust.defaultReturnDays);
                  const isLimitExceeded = cust.currentBalance > cust.creditLimit;
                  const limitPercent = Math.min(100, Math.round((cust.currentBalance / (cust.creditLimit || 1)) * 100));

                  return (
                    <View key={cust.id} style={styles.customerCardNew}>
                      {/* Left Status Color Stripe */}
                      <View
                        style={[
                          styles.customerLeftStripeNew,
                          {
                            backgroundColor: isLimitExceeded || cust.isCreditBlocked
                              ? COLORS.danger
                              : returnBadge.isOverdue
                              ? COLORS.danger
                              : '#006C4E',
                          },
                        ]}
                      />

                      <View style={styles.customerCardBody}>
                        {/* Header: Avatar, Name, Phone, and Balance */}
                        <View style={styles.custHeaderRow}>
                          <View style={styles.custIdentityLeft}>
                            <View style={styles.custInitialBadgeNew}>
                              <Text style={styles.custInitialTextNew}>{cust.initial}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.custNameRow}>
                                <Text style={styles.custNameNew} numberOfLines={1}>
                                  {cust.name}
                                </Text>
                                {cust.urduName && (
                                  <Text style={styles.custUrduNameNew}>{cust.urduName}</Text>
                                )}
                              </View>
                              <Text style={styles.custPhoneNew}>{cust.phone}</Text>
                              {cust.address && (
                                <Text style={styles.custAddressNew} numberOfLines={1}>
                                  📍 {cust.address}
                                </Text>
                              )}
                            </View>
                          </View>

                          <View style={styles.custBalanceCol}>
                            <Text style={styles.custBalanceLabel}>BAQI UDHAAR</Text>
                            <Text
                              style={[
                                styles.custBalanceValue,
                                { color: isLimitExceeded ? COLORS.danger : '#006C4E' },
                              ]}
                            >
                              Rs. {cust.currentBalance.toLocaleString()}
                            </Text>
                          </View>
                        </View>

                        {/* Customer Jama Khata Deposit Badge */}
                        {cust.advanceDeposit && cust.advanceDeposit > 0 ? (
                          <View style={styles.custJamaBadge}>
                            <Ionicons name="shield-checkmark" size={12} color="#0369A1" />
                            <Text style={styles.custJamaBadgeText}>
                              🟢 Jama Khata Balance (جمع): Rs. {cust.advanceDeposit.toLocaleString()}
                            </Text>
                          </View>
                        ) : null}

                        {/* Credit Ceilings & Limit Usage Bar */}
                        <View style={styles.creditMeterBox}>
                          <View style={styles.meterHeader}>
                            <View style={styles.meterLeft}>
                              <Text style={styles.meterLabel}>حدِ ادھار (CREDIT CEILING):</Text>
                              <Text style={styles.meterLimitText}>Rs. {cust.creditLimit.toLocaleString()}</Text>
                            </View>
                            <View style={styles.meterRight}>
                              {cust.isCreditBlocked ? (
                                <View style={styles.blockedBadge}>
                                  <Ionicons name="lock-closed" size={11} color="#FFF" />
                                  <Text style={styles.blockedBadgeText}>LOCKED</Text>
                                </View>
                              ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  {cust.riskProfile?.riskTier && (
                                    <View
                                      style={{
                                        paddingHorizontal: 6,
                                        paddingVertical: 1.5,
                                        borderRadius: 6,
                                        backgroundColor:
                                          cust.riskProfile.riskTier === 'HIGH'
                                            ? '#FEE2E2'
                                            : cust.riskProfile.riskTier === 'MEDIUM'
                                            ? '#FEF3C7'
                                            : '#D1FAE5',
                                      }}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 9,
                                          fontWeight: '800',
                                          color:
                                            cust.riskProfile.riskTier === 'HIGH'
                                              ? '#991B1B'
                                              : cust.riskProfile.riskTier === 'MEDIUM'
                                              ? '#92400E'
                                              : '#065F46',
                                        }}
                                      >
                                        Jev: {cust.riskProfile.riskTier}
                                      </Text>
                                    </View>
                                  )}
                                  <Text
                                    style={[
                                      styles.meterUsagePercent,
                                      { color: isLimitExceeded ? COLORS.danger : '#475569' },
                                    ]}
                                  >
                                    {limitPercent}% Used
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Progress Track */}
                          <View style={styles.meterTrack}>
                            <View
                              style={[
                                styles.meterFill,
                                {
                                  width: `${limitPercent}%`,
                                  backgroundColor: isLimitExceeded
                                    ? COLORS.danger
                                    : limitPercent > 80
                                    ? '#D97706'
                                    : '#006C4E',
                                },
                              ]}
                            />
                          </View>
                        </View>

                        {/* Agreed Return Date (وعدے کی تاریخ) Banner */}
                        <View
                          style={[
                            styles.returnDatePill,
                            {
                              backgroundColor: returnBadge.bgColor,
                              borderColor: returnBadge.borderColor,
                            },
                          ]}
                        >
                          <Ionicons
                            name={returnBadge.icon}
                            size={14}
                            color={returnBadge.color}
                          />
                          <Text
                            style={[
                              styles.returnDateText,
                              { color: returnBadge.color },
                            ]}
                          >
                            {returnBadge.text}
                          </Text>
                        </View>

                        {/* 2-Tier Mobile Action Stack: Tier 1 (2-Cols) + Tier 2 (3-Cols) */}
                        <View style={styles.custActionStack}>
                          {/* Tier 1: Primary High-Frequency Actions (50% - 50%) */}
                          <View style={styles.custActionTier1}>
                            <TouchableOpacity
                              style={styles.actionBtnUdhaar}
                              onPress={() => handleOpenAddUdhaar(cust.id)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="add-circle-outline" size={15} color="#006C4E" />
                              <Text style={styles.actionBtnUdhaarText} numberOfLines={1}>+ Udhaar (ادھار دیں)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtnWasooli}
                              onPress={() => handleOpenWasool(cust)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="cash-outline" size={15} color="#FFF" />
                              <Text style={styles.actionBtnWasooliText} numberOfLines={1}>✓ Wasool (وصولی)</Text>
                            </TouchableOpacity>
                          </View>

                          {/* Tier 2: Secondary Utility Actions (33% - 33% - 33%) */}
                          <View style={styles.custActionTier2}>
                            <TouchableOpacity
                              style={styles.actionBtnPdf}
                              onPress={() => handleGeneratePdfStatement(cust.id, cust.name)}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="document-text-outline" size={13} color="#0284C7" />
                              <Text style={styles.actionBtnPdfText} numberOfLines={1}>PDF کھاتہ</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtnWhatsApp}
                              onPress={() =>
                                handleSendWhatsAppTagaza(cust.name, cust.phone, cust.currentBalance, cust.id, cust.dueDate, {
                                  creditLimit: cust.creditLimit,
                                  defaultProbability: cust.riskProfile?.defaultProbability,
                                  address: cust.address,
                                })
                              }
                              activeOpacity={0.85}
                            >
                              <Ionicons name="flash" size={13} color="#15803D" />
                              <Text style={styles.actionBtnWhatsAppText} numberOfLines={1}>Tagaza</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.actionBtnDelete}
                              onPress={() => handleDeleteCounterpartyClick(cust.id, cust.name, cust.currentBalance, 'CUSTOMER')}
                              activeOpacity={0.85}
                            >
                              <Ionicons name="trash-outline" size={13} color="#E11D48" />
                              <Text style={styles.actionBtnDeleteText} numberOfLines={1}>Delete (ختم)</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.listFooterText}>
                Showing {filteredCustomers.length} of {customerList.length} Active Customer Khatas
              </Text>
            </View>
          )}

          {/* TAB 2: SUPPLIER TRADE & CREDIT DIRECTORY (MAINE DENE HAIN) */}
          {activeTab === 'suppliers' && (
            <View style={styles.tabContentPanel}>
              {/* Upcoming Due Date Reminders Alert Banner (24-48h Warning) */}
              {dueReminders && dueReminders.some((r: any) => r.isDueSoon) && (
                <View style={styles.dueAlertBanner}>
                  <Ionicons name="alarm-outline" size={20} color="#B45309" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dueAlertTitle}>⏰ Supplier Payment Due Warning (اگلے 24-48 گھنٹے)</Text>
                    <Text style={styles.dueAlertText}>
                      {dueReminders
                        .filter((r: any) => r.isDueSoon)
                        .map((r: any) => `${r.supplierName} (Rs. ${r.owedAmount.toLocaleString()})`)
                        .join(' • ')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Supplier Header & + Naya Supplier Button */}
              <View style={styles.khataGovHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.khataGovTitle}>Supplier Trade Directory (ادھار سپلائرز)</Text>
                  <Text style={styles.khataGovSubtitle}>
                    {suppliersList.length} Wholesalers & Mandi Vendors • ادھار کی شرائط و بینک تفصیلات
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addNayaGahakBtn, { backgroundColor: '#0284C7' }]}
                  onPress={() => {
                    if (!enforceRoleAccess('MANAGER', 'نیا سپلائر')) return;
                    setEditingSupplier(null);
                    setAddSupplierModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="business" size={14} color="#FFF" />
                  <Text style={[styles.addNayaGahakBtnText, { color: '#FFF' }]}>+ Naya Supplier</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar & Status Filter for Suppliers */}
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search" size={18} color="#94A3B8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Supplier ka naam, phone ya category (سپلائر تلاش کریں)..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.filterBtn, supplierFilter !== 'ALL' && styles.filterBtnActive]}
                  onPress={() => setFilterModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="options-outline" size={18} color={supplierFilter !== 'ALL' ? '#FFF' : COLORS.navy} />
                  {supplierFilter !== 'ALL' && <View style={styles.filterActiveBadgeDot} />}
                </TouchableOpacity>
              </View>

              {/* Supplier List */}
              <View style={styles.customerList}>
                {filteredSuppliers.map((sup) => {
                  const owedAmt = Math.abs(sup.currentBalance);
                  const creditTerm = sup.tradeCreditTerms;
                  const rep = sup.deliveryRep;
                  const bank = sup.companyBankDetails;

                  return (
                    <View key={sup._id} style={styles.supplierCardContainer}>
                      {/* Card Top Bar */}
                      <View style={styles.supplierTopBar}>
                        <View style={styles.supplierCategoryChip}>
                          <Ionicons name="pricetag-outline" size={12} color="#0369A1" />
                          <Text style={styles.supplierCategoryChipText}>
                            {sup.supplierCategory ? sup.supplierCategory.replace('_', ' ') : 'WHOLESALER'}
                          </Text>
                        </View>
                        {creditTerm && (
                          <View style={styles.creditTermBadge}>
                            <Ionicons name="calendar-outline" size={12} color="#B45309" />
                            <Text style={styles.creditTermBadgeText}>
                              {creditTerm.termType} ({creditTerm.creditPeriodDays} Din)
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Advance Security Deposit Badge */}
                      {sup.advanceDeposit && sup.advanceDeposit > 0 ? (
                        <View style={styles.advanceBadgeChip}>
                          <Ionicons name="shield-checkmark-outline" size={12} color="#0369A1" />
                          <Text style={styles.advanceBadgeChipText}>
                            Advance Security Deposit: Rs. {sup.advanceDeposit.toLocaleString()} (پیشگی رقم)
                          </Text>
                        </View>
                      ) : null}

                      {/* Card Content */}
                      <View style={styles.supplierMainBody}>
                        <View style={styles.supplierNameRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.supplierTitle}>{sup.name}</Text>
                            <Text style={styles.supplierPhone}>📱 {sup.phone}</Text>
                            {sup.address && <Text style={styles.supplierAddress}>📍 {sup.address}</Text>}
                          </View>
                          {sup.currentBalance !== 0 ? (
                            <View style={styles.supplierBalanceCol}>
                              <Text style={[styles.supplierBalanceLabel, { color: '#E11D48' }]}>MAINE DENE HAIN</Text>
                              <Text style={[styles.supplierBalanceValue, { color: '#E11D48' }]}>Rs. {Math.abs(sup.currentBalance).toLocaleString()}</Text>
                            </View>
                          ) : sup.advanceDeposit && sup.advanceDeposit > 0 ? (
                            <View style={styles.supplierBalanceCol}>
                              <Text style={[styles.supplierBalanceLabel, { color: '#059669' }]}>ADVANCE PREPAYMENT</Text>
                              <Text style={[styles.supplierBalanceValue, { color: '#059669' }]}>Rs. {sup.advanceDeposit.toLocaleString()}</Text>
                            </View>
                          ) : (
                            <View style={styles.supplierBalanceCol}>
                              <Text style={[styles.supplierBalanceLabel, { color: '#059669' }]}>HISAB SAAF</Text>
                              <Text style={[styles.supplierBalanceValue, { color: '#059669' }]}>Rs. 0</Text>
                            </View>
                          )}
                        </View>

                        {/* Delivery Rep Row */}
                        {rep && (rep.name || rep.phone) && (
                          <View style={styles.deliveryRepCard}>
                            <Ionicons name="car-outline" size={16} color="#0284C7" />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              <Text style={styles.repTitle}>Delivery Representative (آرڈر والا):</Text>
                              <Text style={styles.repDetail}>
                                {rep.name} {rep.phone ? `(${rep.phone})` : ''}
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* Company Bank Details Card */}
                        {bank && (bank.bankName || bank.accountNumber) && (
                          <View style={styles.bankCard}>
                            <View style={styles.bankCardHeader}>
                              <Ionicons name="card-outline" size={16} color="#059669" />
                              <Text style={styles.bankCardTitle}>Bank Transfer Details (بینک اکاؤنٹ)</Text>
                            </View>
                            <Text style={styles.bankNameText}>{bank.bankName} • {bank.accountTitle}</Text>
                            <Text style={styles.accountNoText}>A/C: {bank.accountNumber}</Text>
                            {bank.iban && <Text style={styles.ibanText}>IBAN: {bank.iban}</Text>}
                          </View>
                        )}

                        {/* 2-Tier Supplier Action Stack */}
                        <View style={styles.supplierActionStack}>
                          <View style={styles.supplierActionTier1}>
                            <TouchableOpacity
                              style={styles.paySupBtn}
                              onPress={() => {
                                if (!enforceRoleAccess('MANAGER', 'سپلائر کو ادائیگی')) return;
                                setSelectedPaySupplier(sup);
                                setPaySupplierModalVisible(true);
                              }}
                            >
                              <Ionicons name="cash-outline" size={15} color="#FFF" />
                              <Text style={styles.paySupBtnText} numberOfLines={1}>+ Adaigi (ادائیگی)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.editSupBtn}
                              onPress={() => {
                                if (!enforceRoleAccess('MANAGER', 'سپلائر پروفائل کی تبدیلی')) return;
                                setEditingSupplier(sup);
                                setAddSupplierModalVisible(true);
                              }}
                            >
                              <Ionicons name="create-outline" size={15} color="#475569" />
                              <Text style={styles.editSupBtnText} numberOfLines={1}>Edit Profile</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.supplierActionTier2}>
                            <TouchableOpacity
                              style={styles.pdfSupBtn}
                              onPress={() => handleGeneratePdfStatement(sup._id, sup.name)}
                            >
                              <Ionicons name="document-text-outline" size={14} color="#0284C7" />
                              <Text style={styles.pdfSupBtnText} numberOfLines={1}>PDF کھاتہ</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.deleteSupBtn}
                              onPress={() => {
                                if (!enforceRoleAccess('MANAGER', 'سپلائر کھاتہ ختم کرنا')) return;
                                handleDeleteCounterpartyClick(sup._id, sup.name, sup.currentBalance || sup.advanceDeposit || 0, 'SUPPLIER');
                              }}
                            >
                              <Ionicons name="trash-outline" size={14} color="#E11D48" />
                              <Text style={styles.deleteSupBtnText} numberOfLines={1}>Delete (ختم)</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Quick Wasool & Debt Settlement Discount Modal (1-C) */}
      <QuickWasoolModal
        visible={wasoolModalVisible}
        customer={selectedWasoolCustomer}
        onClose={() => setWasoolModalVisible(false)}
        onSuccess={handleWasoolSuccess}
      />

      {/* Digital Payment Receipt & Native SMS Dispatch Modal */}
      <DigitalReceiptModal
        visible={receiptModalVisible}
        receipt={receiptData}
        onClose={() => setReceiptModalVisible(false)}
      />


      {/* Digital Customer Khata Creation Modal (1-A) */}
      <AddCustomerModal
        visible={addCustomerModalVisible}
        onClose={() => setAddCustomerModalVisible(false)}
        onSuccess={handleCustomerCreated}
      />

      {/* Add Udhaar (Customer Receivables) Modal with Agreed Return Date, Itemized Bill, Receipt Photo & Voice AI */}
      <AddUdhaarModal
        visible={addUdhaarModalVisible}
        customers={modalCustomersList}
        initialCustomerId={selectedCustomerIdForUdhaar}
        initialVoiceTranscript={voiceTranscriptForUdhaar}
        onClose={() => {
          setAddUdhaarModalVisible(false);
          setVoiceTranscriptForUdhaar(undefined);
        }}
        onSuccess={handleUdhaarAdded}
        onAddCustomer={() => {
          setAddUdhaarModalVisible(false);
          setAddCustomerModalVisible(true);
        }}
      />

      {/* Wholesaler & Mandi Supplier Creation / Edit Modal */}
      <AddSupplierModal
        visible={addSupplierModalVisible}
        initialData={editingSupplier}
        onClose={() => {
          setAddSupplierModalVisible(false);
          setEditingSupplier(null);
        }}
        onSuccess={(supplier) => {
          setSuppliersList((prev) => {
            const exists = prev.some((s) => s._id === supplier._id);
            if (exists) {
              return prev.map((s) => (s._id === supplier._id ? supplier : s));
            }
            return [supplier, ...prev];
          });
          setEditingSupplier(null);
          triggerToast(`Supplier "${supplier.name}" mahfooz hogaya!`);
        }}
      />

      {/* Supplier Payment Disbursement & Galla Auto-Deduction Modal */}
      <PaySupplierModal
        visible={paySupplierModalVisible}
        supplier={selectedPaySupplier}
        gallaCash={summaryData.gallaCash}
        tillBalances={tillBalances}
        onClose={() => {
          setPaySupplierModalVisible(false);
          setSelectedPaySupplier(null);
        }}
        onSuccess={(updatedSupplier, amountPaid, mode) => {
          setSuppliersList((prev) =>
            prev.map((s) => (s._id === updatedSupplier._id ? updatedSupplier : s))
          );
          const payMode = mode === 'CASH' ? 'CASH' : mode === 'JAZZCASH' ? 'WALLET' : 'BANK';
          syncSupplierPaid(amountPaid, payMode);
          refreshMetricsFromServer().catch(() => {});
          fetchDashboardData().catch(() => {});
          triggerToast(`Rs. ${amountPaid.toLocaleString()} adaigi ba-naam ${updatedSupplier.name} darj hogayi!`);
        }}
      />

      {/* 3-Way Liquid Cash Till Management & Add to Till Modal */}
      <ManageTillModal
        visible={manageTillModalVisible}
        balances={tillBalances}
        onClose={() => setManageTillModalVisible(false)}
        onSuccess={() => {
          refreshMetricsFromServer().catch(() => {});
          fetchDashboardData().catch(() => {});
          triggerToast('Galla Deposit / Till Balance update hogaya!');
        }}
      />

      {/* Stage 1 Add Supplier Bill / Payable Record Modal */}
      <AddSupplierBillModal
        visible={addSupplierBillModalVisible}
        suppliers={suppliersList}
        onClose={() => setAddSupplierBillModalVisible(false)}
        onSuccess={(supName, amt) => {
          syncSupplierBill(amt);
          refreshMetricsFromServer().catch(() => {});
          fetchDashboardData().catch(() => {});
          triggerToast(`Bill Rs. ${amt.toLocaleString()} recorded under ${supName}`);
        }}
      />

      {/* Central Cashflow In/Out Transaction Ledger History Modal */}
      <CashflowHistoryModal
        visible={cashflowHistoryModalVisible}
        onClose={() => setCashflowHistoryModalVisible(false)}
      />

      {/* Quick Cash Sale Fast-Entry Modal */}
      <QuickSaleModal
        visible={quickSaleModalVisible}
        initialBundle={selectedBundleForQuickSale}
        initialItems={scannedInitialItems}
        initialAmount={scannedInitialAmount}
        onClose={() => {
          setQuickSaleModalVisible(false);
          setSelectedBundleForQuickSale(undefined);
          setScannedInitialItems([]);
          setScannedInitialAmount(undefined);
        }}
        onSuccess={(amount, targetAccount, note) => {
          setSelectedBundleForQuickSale(undefined);
          setScannedInitialItems([]);
          setScannedInitialAmount(undefined);
          const destMode = targetAccount === 'PHYSICAL_CASH' ? 'CASH' : targetAccount === 'DIGITAL_WALLET' ? 'WALLET' : 'BANK';
          syncQuickSale(amount, destMode);
          refreshMetricsFromServer().catch(() => {});
          fetchDashboardData().catch(() => {});
          triggerToast(`Sale Recorded - Rs. ${amount.toLocaleString()}`);
        }}
      />

      {/* Continuous 60fps Camera Barcode Hardware Stream Modal */}
      <ContinuousBarcodeScannerModal
        visible={continuousScannerVisible}
        onClose={() => setContinuousScannerVisible(false)}
        onCheckout={handleContinuousScannerCheckout}
      />

      {/* Staff Tankha & Attendance Modal */}
      <DukanStaffPayrollModal
        visible={dukanStaffModalVisible}
        tillBalances={tillBalances}
        onClose={() => setDukanStaffModalVisible(false)}
        onUpdateTillBalances={(updated) => {
          syncChannels(updated);
          refreshMetricsFromServer().catch(() => {});
        }}
        onShowToast={(msg) => triggerToast(msg)}
      />

      {/* Dukan Daily Kharcha Modal */}
      <DailyExpenseModal
        visible={dailyExpenseModalVisible}
        onClose={() => setDailyExpenseModalVisible(false)}
        onSuccess={(amount, targetAccount, category, note) => {
          const mode = targetAccount === 'PHYSICAL_CASH' ? 'CASH' : targetAccount === 'DIGITAL_WALLET' ? 'WALLET' : 'BANK';
          syncExpense(amount, mode);
          refreshMetricsFromServer().catch(() => {});
          fetchDashboardData().catch(() => {});
          triggerToast(`Kharcha Logged - Rs. ${amount.toLocaleString()} (${category})`);
        }}
      />

      {/* Wholesale Purchase Order WhatsApp Modal */}
      <WholesalePoModal
        visible={wholesalePoModalVisible}
        initialItem={wholesalePoPrefillItem}
        onClose={() => {
          setWholesalePoModalVisible(false);
          setWholesalePoPrefillItem(undefined);
        }}
        onSuccess={() => {
          setWholesalePoPrefillItem(undefined);
          triggerToast('Wholesale Purchase Order WhatsApp par bhej diya gaya!');
        }}
      />

      {/* Business Logs & Reports Hub Modal */}
      <BusinessLogsHubModal
        visible={businessLogsModalVisible}
        onClose={() => setBusinessLogsModalVisible(false)}
        onShowToast={(msg) => triggerToast(msg)}
      />

      {/* Khata Statement PDF Export Preview Modal */}
      <Modal
        visible={pdfModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPdfModalVisible(false)}
      >
        <View style={styles.pdfModalOverlay}>
          <View style={styles.pdfModalContainer}>
            <View style={styles.pdfModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pdfModalTitle}>📄 Khata Statement (سرکاری اسٹیٹمنٹ)</Text>
                <Text style={styles.pdfModalSub}>
                  {pdfStatementData?.counterpartyName} • {pdfStatementData?.statementDate}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPdfModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pdfPreviewBox} showsVerticalScrollIndicator={true}>
              <Text style={styles.pdfPreviewHeading}>Digital Ledger Statement Preview:</Text>
              <View style={styles.pdfContentContainer}>
                <Text style={styles.pdfRawHtmlText}>
                  {pdfStatementData?.htmlContent
                    ?.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.pdfModalFooter}>
              <TouchableOpacity
                style={styles.pdfShareBtn}
                onPress={() => {
                  triggerToast(`Statement PDF ba-naam ${pdfStatementData?.counterpartyName} share hogayi!`);
                  setPdfModalVisible(false);
                }}
              >
                <Ionicons name="share-social" size={16} color="#FFF" />
                <Text style={styles.pdfShareBtnText}>Share PDF Statement</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pdfCloseBtn}
                onPress={() => setPdfModalVisible(false)}
              >
                <Text style={styles.pdfCloseBtnText}>Band Karein</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interactive Inventory Stock Management Modal (Scan, Add, Edit, Delete Stock) */}
      <StockManagementModal
        visible={stockModalVisible}
        onClose={() => setStockModalVisible(false)}
        onOpenWholesalePo={(item, qty) => {
          if (item) {
            setWholesalePoPrefillItem({
              inventoryItemId: item._id,
              itemName: item.itemName,
              quantityOrdered: qty || 10,
              unitCost: item.wholesaleCost,
            });
          } else {
            setWholesalePoPrefillItem(undefined);
          }
          setStockModalVisible(false);
          setWholesalePoModalVisible(true);
        }}
      />

      {/* Dynamic Merchant Pay Link & QR Generator Modal (JazzCash, Easypaisa, Raast, Stripe) */}
      <MerchantPayLinkModal
        visible={payLinkModalVisible}
        onClose={() => setPayLinkModalVisible(false)}
      />

      {/* Interactive Tagaza Modal (Roman Urdu Reminder, QR Preview & WhatsApp Launcher) */}
      <TagazaModal
        visible={tagazaModalVisible}
        customer={selectedTagazaCustomer}
        onClose={() => {
          setTagazaModalVisible(false);
          setSelectedTagazaCustomer(null);
        }}
      />

      {/* Daily Cash Drawer & Galla Reconciliation Modal */}
      <GallaBandiModal
        visible={gallaBandiModalVisible}
        onClose={() => setGallaBandiModalVisible(false)}
        onSuccess={() => {
          cashDrawerApi.calculateExpectedCash().then((res) => {
            if (res.success && res.data) {
              setSummaryData((prev) => ({
                ...prev,
                gallaCash: res.data.systemExpectedCash,
              }));
              triggerToast(`Galla Bandi tasdeeq hogayi! Naya Galla Cash: Rs. ${res.data.systemExpectedCash.toLocaleString()}`);
            } else {
              triggerToast('Galla Bandi tasdeeq hogayi!');
            }
          }).catch(() => {
            triggerToast('Galla Bandi tasdeeq hogayi!');
          });
        }}
      />

      {/* Recovery Radar & Debt Aging Drawer Modal */}
      <RecoveryRadarModal
        visible={recoveryRadarModalVisible}
        onClose={() => setRecoveryRadarModalVisible(false)}
        onSendTagaza={(name, phone, amt, id, overdueDays, riskTier) => {
          setRecoveryRadarModalVisible(false);
          handleSendWhatsAppTagaza(name, phone, amt, id, undefined, {
            defaultProbability: riskTier === 'HIGH' ? 0.82 : riskTier === 'MED' ? 0.45 : 0.15,
            priorRemindersSentCount: overdueDays && overdueDays > 14 ? 2 : 0,
          });
        }}
      />

      {/* Jev Galla Runway & Liquidity Radar Modal */}
      <LiquidityRadarModal
        visible={liquidityRadarModalVisible}
        onClose={() => setLiquidityRadarModalVisible(false)}
        onOpenWasooli={(cId) => {
          const found = customerList.find((c) => c.id === cId);
          if (found) handleOpenWasool(found);
        }}
      />

      {/* Mandi Rate Radar & Price Arbitrage Modal */}
      <MandiArbitrageRadarModal
        visible={mandiRadarModalVisible}
        onClose={() => setMandiRadarModalVisible(false)}
        onOpenCreatePO={(supplierId, itemName) => {
          setWholesalePoPrefillItem({
            itemName,
            quantityOrdered: 10,
            unitCost: 0,
          });
          setWholesalePoModalVisible(true);
        }}
      />

      {/* Dead-Stock Liquidator & Expiry Markdown Modal */}
      <DeadStockLiquidatorModal
        visible={deadStockModalVisible}
        onClose={() => setDeadStockModalVisible(false)}
        onSelectBundleForSale={(bundle) => {
          setSelectedBundleForQuickSale(bundle);
          setQuickSaleModalVisible(true);
        }}
      />

      {/* Smart Customer Tiering & Automated WhatsApp Marketing Modal */}
      <CustomerTieringMarketingModal
        visible={customerMarketingModalVisible}
        onClose={() => setCustomerMarketingModalVisible(false)}
      />

      {/* Stock & Inventory Alert Drawer Modal */}
      <StockAlertModal
        visible={stockAlertModalVisible}
        onClose={() => setStockAlertModalVisible(false)}
        onOpenWholesalePo={(item, qty) => {
          if (item) {
            setWholesalePoPrefillItem({
              inventoryItemId: item._id,
              itemName: item.itemName,
              quantityOrdered: qty || 10,
              unitCost: item.wholesaleCost,
            });
          } else {
            setWholesalePoPrefillItem(undefined);
          }
          setStockAlertModalVisible(false);
          setWholesalePoModalVisible(true);
        }}
      />

      {/* Supplier Ledger & Wholesaler Trade Directory Drawer Modal */}
      <SupplierLedgerModal
        visible={supplierLedgerModalVisible}
        onClose={() => setSupplierLedgerModalVisible(false)}
        onAddSupplier={() => setAddSupplierModalVisible(true)}
        onPaySupplier={(sup) => {
          setSelectedPaySupplier(sup);
          setPaySupplierModalVisible(true);
        }}
      />

      {/* Munafa & Sales Analytics Drawer Modal */}
      <MunafaAnalyticsModal
        visible={munafaModalVisible}
        onClose={() => setMunafaModalVisible(false)}
      />

      {/* Chor Nazar (چور نظر) — Till Leakage & Employee Theft Sentinel Modal (Strictly Owner-Only) */}
      <ChorNazarSentinelModal
        visible={chorNazarModalVisible}
        onClose={() => setChorNazarModalVisible(false)}
        onOpenGallaBandi={() => setGallaBandiModalVisible(true)}
      />

      {/* Help & Operational Workflow Guide Modal */}
      <HelpGuideModal
        visible={helpGuideModalVisible}
        onClose={() => setHelpGuideModalVisible(false)}
        onOpenManageTill={() => setManageTillModalVisible(true)}
        onOpenWasooliModal={() => {
          if (customerList.length > 0) {
            handleOpenWasool(customerList[0]);
          }
        }}
        onOpenAddBillModal={() => setAddSupplierBillModalVisible(true)}
        onOpenGallaBandiModal={() => setGallaBandiModalVisible(true)}
        onOpenMunafaAnalyticsModal={() => setMunafaModalVisible(true)}
        onOpenStaffPayrollModal={() => setDukanStaffModalVisible(true)}
      />

      {/* Karobar More Tools & Custom Pinned Services Drawer Modal */}
      <KarobarMoreToolsModal
        visible={moreToolsModalVisible}
        onClose={() => setMoreToolsModalVisible(false)}
        tools={allKarobarTools}
        pinnedToolIds={pinnedToolIds}
        onTogglePin={handleTogglePinTool}
        onSelectTool={(tool) => tool.onPress()}
        userRole={userRole}
      />

      {/* Dynamic Subscription & Feature-Gate Paywall Modal */}
      <SubscriptionModal
        visible={vendorSubModalOpen}
        onClose={() => {
          setVendorSubModalOpen(false);
          setVendorSubTrigger({});
        }}
        featureKeyRequired={vendorSubTrigger.key}
        featureTitleUrdu={vendorSubTrigger.title}
        onPlanSelected={async (plan) => {
          setVendorSubModalOpen(false);
          setVendorSubTrigger({});
        }}
      />

      {/* Quick Status Filter Dropdown Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <View style={styles.filterModalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.filterModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="funnel" size={18} color={COLORS.primary} />
                <Text style={styles.filterModalTitle}>
                  {activeTab === 'khata' ? 'Gahak Khata Filters (فلٹرز)' : 'Suppliers Khata Filters (فلٹرز)'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
              {activeTab === 'khata' ? (
                <>
                  {[
                    { id: 'ALL', label: 'All Customers (تمام گاہک)', icon: 'people-outline' },
                    { id: 'UDHAAR_GT_ZERO', label: 'Baqi Udhaar > 0 (جن سے پیسے لینے ہیں)', icon: 'arrow-down-circle-outline', color: '#006C4E' },
                    { id: 'ZERO_BALANCE', label: 'Zero Balance / Hisab Saaf (حساب صاف)', icon: 'checkmark-circle-outline', color: '#0284C7' },
                    { id: 'OVERDUE', label: 'Overdue / Wada Guzar Chuka (وعدہ گزر گیا)', icon: 'alarm-outline', color: '#D97706' },
                    { id: 'CREDIT_BLOCKED', label: 'Credit Blocked (کھاتہ بند)', icon: 'lock-closed-outline', color: '#E11D48' },
                  ].map((opt) => {
                    const isSelected = customerFilter === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.filterOptionItem, isSelected && styles.filterOptionItemActive]}
                        onPress={() => {
                          setCustomerFilter(opt.id as any);
                          setFilterModalVisible(false);
                        }}
                      >
                        <Ionicons name={opt.icon as any} size={18} color={opt.color || COLORS.navy} />
                        <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                          {opt.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <>
                  {[
                    { id: 'ALL', label: 'All Suppliers (تمام سپلائرز)', icon: 'business-outline' },
                    { id: 'MAINE_DENE_HAIN', label: 'Maine Dene Hain > 0 (جنہیں واجب الادا ہیں)', icon: 'arrow-up-circle-outline', color: '#E11D48' },
                    { id: 'ADVANCE_SECURITY', label: 'Advance Security Deposit > 0 (پیشگی رقم موجود)', icon: 'shield-checkmark-outline', color: '#0284C7' },
                    { id: 'ZERO_BALANCE', label: 'Hisab Saaf (0 Balance)', icon: 'checkmark-circle-outline', color: '#059669' },
                  ].map((opt) => {
                    const isSelected = supplierFilter === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.filterOptionItem, isSelected && styles.filterOptionItemActive]}
                        onPress={() => {
                          setSupplierFilter(opt.id as any);
                          setFilterModalVisible(false);
                        }}
                      >
                        <Ionicons name={opt.icon as any} size={18} color={opt.color || COLORS.navy} />
                        <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextActive]}>
                          {opt.label}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete / Archive Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={32} color="#E11D48" />
            </View>
            <Text style={styles.confirmModalTitle}>کھاتہ ختم / آرکائیو کریں</Text>
            <Text style={styles.confirmModalText}>
              کیا آپ واقعی <Text style={{ fontWeight: '700', color: COLORS.navy }}>{targetToDelete?.name}</Text> کا کھاتہ ختم کرنا چاہتے ہیں؟ اس سے ان کا سابقہ ریکارڈ آرکائیو ہو جائے گا۔
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeletingCounterparty}
              >
                <Text style={styles.cancelBtnText}>منسوخ / Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={handleConfirmDeleteCounterparty}
                disabled={isDeletingCounterparty}
              >
                {isDeletingCounterparty ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>ڈیلیٹ کریں / Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  </NotificationProvider>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  toastContainer: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 999,
    backgroundColor: COLORS.navy,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  toastText: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  voicePromptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#57FBDB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  voicePromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  voicePromptText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00201A',
  },
  voiceAiBadge: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  voiceAiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  kpiCardEmerald: {},
  kpiCardRed: {},
  emeraldLeftStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: '#006C4E',
  },
  redLeftStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: COLORS.danger,
  },
  businessLogsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 34, 56, 0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
  },
  businessLogsHeaderBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  businessLogsHeaderBtnSub: {
    fontSize: 9,
    color: '#34D399',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  kpiLabelEmerald: {
    fontSize: 10,
    fontWeight: '800',
    color: '#006C4E',
    letterSpacing: 0.5,
  },
  kpiLabelRed: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
  kpiSubLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  emeraldIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8CF4C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFDAD6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiAmountEmerald: {
    fontSize: 18,
    fontWeight: '800',
    color: '#006C4E',
    marginTop: 8,
    paddingLeft: 4,
  },
  kpiAmountRed: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.danger,
    marginTop: 8,
    paddingLeft: 4,
  },
  kpiBadgeEmerald: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  emeraldDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#006C4E',
  },
  kpiBadgeTextEmerald: {
    fontSize: 10,
    fontWeight: '700',
    color: '#007151',
  },
  kpiBadgeRed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  redDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
  },
  kpiBadgeTextRed: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.danger,
  },
  gallaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.navy,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  gallaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gallaIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gallaLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
  },
  gallaAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  sparklineMock: {
    paddingHorizontal: 6,
  },
  gallaRight: {
    alignItems: 'flex-end',
  },
  runwayLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
  },
  runwayValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.cyan,
    marginTop: 1,
  },
  actionGridContainer: {
    marginBottom: 14,
  },
  actionDock: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  badgeNotificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006C4E',
  },
  actionBtnTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  actionBtnSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  radarSection: {
    marginBottom: 12,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  radarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  radarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  radarUrdu: {
    fontSize: 12,
    color: '#64748B',
  },
  aiPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  aiPriorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.cyan,
  },
  debtorScroll: {
    flexDirection: 'row',
  },
  debtorCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  debtorTopStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  debtorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
  },
  debtorIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 4,
  },
  initialBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  debtorName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  debtorPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  riskChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  debtorAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  baqiLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  baqiAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.danger,
  },
  overdueDays: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabDeck: {
    marginTop: 4,
  },
  tabGroupBar: {
    flexDirection: 'row',
    backgroundColor: '#DCE9FF',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  deckTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  deckTabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  deckTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  deckTabBtnTextActive: {
    color: COLORS.navy,
    fontWeight: '700',
  },
  tabContentPanel: {},
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.navy,
  },
  filterBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customerList: {
    gap: 10,
  },
  khataGovHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  khataGovTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B2239',
  },
  khataGovSubtitle: {
    fontSize: 10,
    color: '#006C4E',
    fontWeight: '600',
    marginTop: 2,
  },
  addNayaGahakBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2B4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  addNayaGahakBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00201A',
  },
  customerCardNew: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  customerLeftStripeNew: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 1,
  },
  customerCardBody: {
    padding: 12,
    paddingLeft: 14,
  },
  custHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  custIdentityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  custInitialBadgeNew: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0B2239',
    alignItems: 'center',
    justifyContent: 'center',
  },
  custInitialTextNew: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  custNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  custNameNew: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B2239',
  },
  custUrduNameNew: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  custPhoneNew: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  custAddressNew: {
    fontSize: 10,
    color: '#475569',
    marginTop: 1,
  },
  custBalanceCol: {
    alignItems: 'flex-end',
  },
  custBalanceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  custBalanceValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  creditMeterBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  meterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  meterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meterLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  meterLimitText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B2239',
  },
  meterRight: {},
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E11D48',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  blockedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  meterUsagePercent: {
    fontSize: 10,
    fontWeight: '700',
  },
  meterTrack: {
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  returnDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  returnDateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  custActionStack: {
    gap: 6,
    marginTop: 6,
  },
  custActionTier1: {
    flexDirection: 'row',
    gap: 8,
  },
  custActionTier2: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnUdhaar: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5EE',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 4,
  },
  actionBtnUdhaarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  actionBtnWasooli: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnWasooliText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  actionBtnWhatsApp: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    gap: 4,
  },
  actionBtnWhatsAppText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
  },
  customerLeftStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingLeft: 4,
  },
  custInitialBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custInitialText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  custName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  custMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  custActionCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  custAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  wasooliBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#006C4E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 2,
  },
  wasooliBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  viewHisabBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  viewHisabText: {
    color: COLORS.navy,
    fontSize: 10,
    fontWeight: '700',
  },
  listFooterText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    marginTop: 10,
  },
  stockAlertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFDAD6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 10,
  },
  stockAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  stockAlertSub: {
    fontSize: 11,
    color: '#43474D',
    marginTop: 2,
    lineHeight: 16,
  },
  stockItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  stockItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  stockItemCount: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700',
    marginTop: 2,
  },
  orderSupplierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  orderSupplierBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  profitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  profitLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  profitAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
    marginTop: 2,
  },
  marginPill: {
    backgroundColor: '#8CF4C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  marginPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007151',
  },
  splitProgressBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginVertical: 10,
  },
  splitProgressFillGreen: {
    backgroundColor: '#006C4E',
    height: '100%',
  },
  splitProgressFillRed: {
    backgroundColor: COLORS.danger,
    height: '100%',
  },
  profitMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  profitMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 10, 25, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetSub: {
    fontSize: 11,
    color: '#64748B',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.navy,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  amountInputBox: {
    backgroundColor: '#EFF4FF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  amountPrompt: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
  },
  amountInput: {
    fontSize: 26,
    fontWeight: '800',
    color: '#006C4E',
    minWidth: 100,
    textAlign: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.navy,
  },
  confirmPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  confirmPaymentText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  supplierCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  supplierTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplierCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  supplierCategoryChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  creditTermBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  creditTermBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  supplierMainBody: {
    gap: 8,
  },
  supplierNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supplierTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  supplierPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  supplierAddress: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  supplierBalanceCol: {
    alignItems: 'flex-end',
  },
  supplierBalanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.danger,
  },
  supplierBalanceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.danger,
    marginTop: 2,
  },
  deliveryRepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  repTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  repDetail: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  bankCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  bankCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  bankNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountNoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  ibanText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
  },
  supplierActionStack: {
    gap: 6,
    marginTop: 8,
  },
  supplierActionTier1: {
    flexDirection: 'row',
    gap: 8,
  },
  supplierActionTier2: {
    flexDirection: 'row',
    gap: 8,
  },
  editSupBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  editSupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  paySupBtn: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  paySupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dueAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  dueAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  dueAlertText: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  advanceBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  advanceBadgeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  custJamaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginVertical: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  custJamaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  cashierNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  cashierNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    flex: 1,
  },
  netPositionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  netPositionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  netPositionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  netPositionValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  netPositionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  netPositionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBtnPdf: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnPdfText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  pdfSupBtn: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  pdfSupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  pdfModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  pdfModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '85%',
    padding: 16,
    elevation: 10,
  },
  pdfModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  pdfModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pdfModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  pdfPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
    maxHeight: 340,
  },
  pdfPreviewHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 8,
  },
  pdfContentContainer: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pdfRawHtmlText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  pdfModalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  pdfShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006C4E',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  pdfShareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pdfCloseBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
  },
  pdfCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  agingFilterScroll: {
    marginVertical: 8,
  },
  agingPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  agingPillActive: {
    backgroundColor: '#006C4E',
    borderColor: '#006C4E',
  },
  agingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  agingPillTextActive: {
    color: '#FFFFFF',
  },

  // Modern Fintech Header Bar
  imgHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: Platform.OS === 'ios' ? 10 : 4,
  },
  imgHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  merchantAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0B2239',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#00D2B4',
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  storeLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dukanGharToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 2,
  },
  dukanToggleBtnActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    elevation: 1,
  },
  dukanToggleTextActive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#006C4E',
  },
  gharToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  gharToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },

  // Sub Header Digi Brand Row
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  digiBrandText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#006C4E',
    letterSpacing: -0.5,
  },
  bolKarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  bolKarButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#006C4E',
  },

  // Dark Navy Net Position Hero Card
  heroNetCard: {
    backgroundColor: '#0B2239',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  heroNetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroNetTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  chupayeinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  chupayeinText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  heroNetAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 4,
  },
  pkrLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00D2B4',
  },
  heroNetAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  gallaRunwayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  gallaSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  runwaySubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D2B4',
  },
  heroSubCardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniWalletsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  miniWalletCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  miniWalletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  miniWalletTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  miniWalletVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006C4E',
  },
  miniWalletSub: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  heroSubCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  subCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subCardTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  arrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  subCardFooter: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Voice Mint Banner
  voiceMintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8FF6CA',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  mintBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  mintIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 108, 78, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mintBannerUrdu: {
    fontSize: 12,
    fontWeight: '700',
    color: '#003828',
    flex: 1,
  },
  tryNowBtn: {
    backgroundColor: '#006C4E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tryNowBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Karobar Hub 3-Col Grid
  karobarHubSection: {
    marginBottom: 16,
  },
  karobarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  karobarTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greenBarStripe: {
    width: 4,
    height: 16,
    backgroundColor: '#006C4E',
    borderRadius: 2,
  },
  karobarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  servicesCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  allToolsHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hubGrid3Cols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hubCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  hubCardHelp: {
    backgroundColor: '#004D36',
    borderColor: '#006C4E',
  },
  hubCardMoreTools: {
    borderStyle: 'dashed',
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
  },
  hubIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  helpIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(87, 251, 219, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  topBadgeOrange: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  topBadgeTextOrange: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B45309',
  },
  topBadgeRed: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  topBadgeTextRed: {
    fontSize: 8,
    fontWeight: '800',
    color: '#E11D48',
  },
  topBadgeMoreTools: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#BAE6FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  topBadgeTextMoreTools: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0369A1',
  },
  hubCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  hubCardSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  helpCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  helpCardSub: {
    fontSize: 9,
    color: '#57FBDB',
    marginTop: 2,
    textAlign: 'center',
  },

  // Taza Tareen Section
  tazaTareenSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tazaTareenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tazaTareenTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  sabDekheinLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006C4E',
  },
  tazaTareenList: {
    gap: 10,
  },
  tazaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tazaAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tazaAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  tazaName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  tazaTime: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  tazaAmountGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  tazaAmountRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
  actionBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnDeleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
  },
  deleteSupBtn: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteSupBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
  },
  filterBtnActive: {
    backgroundColor: '#006C4E',
  },
  filterActiveBadgeDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 380,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  filterOptionItemActive: {
    backgroundColor: '#F0FDF4',
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  filterOptionTextActive: {
    color: '#006C4E',
    fontWeight: '700',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 22,
    alignItems: 'center',
    elevation: 8,
  },
  deleteIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  confirmModalText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmModalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#E11D48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
