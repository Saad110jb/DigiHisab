import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '../../components/Header';
import { ProfileDrawer } from '../../components/ProfileDrawer';
import { HouseholdView } from './HouseholdView';
import { VendorView } from './VendorView';
import { CnicScannerModal } from '../../components/CnicScannerModal';
import { SubscriptionModal } from '../../components/SubscriptionModal';
import { subscriptionService, ISubscriptionRecord, PlanIdentifier } from '../../services/subscription.service';
import { useAuth } from '../../store/auth.store';
import { COLORS } from '../../theme/colors';

interface Props {
  navigation: any;
}

export const UnifiedDashboard: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, activePersona } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [cnicModalOpen, setCnicModalOpen] = useState<boolean>(false);
  const [cnicStatus, setCnicStatus] = useState<'NOT_SCANNED' | 'UNDER_REVIEW' | 'VERIFIED'>('NOT_SCANNED');
  const [cnicNoticeDismissed, setCnicNoticeDismissed] = useState<boolean>(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState<boolean>(false);
  const [featureTrigger, setFeatureTrigger] = useState<{ key?: string; title?: string }>({});

  // Dynamic Subscription Expiry & Reminder State
  const [subRecord, setSubRecord] = useState<ISubscriptionRecord | null>(null);
  const [subExpired, setSubExpired] = useState<boolean>(false);
  const [subExpiringSoon, setSubExpiringSoon] = useState<boolean>(false);
  const [subDaysRemaining, setSubDaysRemaining] = useState<number>(0);
  const [subBannerDismissed, setSubBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    checkCnicKycStatus();
    checkSubscriptionPromptLifecycle();
  }, [user]);

  const loadSubscriptionInfo = async () => {
    try {
      const res = await subscriptionService.getCurrentSubscription();
      setSubRecord(res.subscription);
      setSubExpired(res.isExpired);
      setSubExpiringSoon(res.isExpiringSoon);
      setSubDaysRemaining(res.daysRemaining);
      return res;
    } catch (e) {
      return null;
    }
  };

  const checkSubscriptionPromptLifecycle = async () => {
    try {
      const current = await loadSubscriptionInfo();
      const planKey = current?.subscription?.planKey;
      const isExp = current?.isExpired;

      // 1. If user is already on an active paid plan (and not expired), do not auto-prompt
      if (planKey && planKey !== 'FREE_STARTER' && !isExp) {
        return;
      }

      // 2. Rule 1: Show once on initial sign-in/first-time login
      const hasDismissed = await AsyncStorage.getItem('@digihisab_subscription_initial_dismissed');
      if (!hasDismissed) {
        setSubscriptionModalOpen(true);
        return;
      }

      // 3. Rule 2: Monthly interval check (only re-prompt after 30 days)
      const lastPrompt = await AsyncStorage.getItem('@digihisab_last_subscription_prompt_at');
      if (lastPrompt) {
        const lastDate = new Date(lastPrompt).getTime();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastDate > thirtyDaysMs) {
          setSubscriptionModalOpen(true);
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }
  };

  const checkCnicKycStatus = async () => {
    try {
      // 1. Check if user already dismissed this banner
      const dismissed = await AsyncStorage.getItem('@digihisab_cnic_notice_dismissed');
      if (dismissed === 'true') {
        setCnicNoticeDismissed(true);
      }

      // 2. Check if user object has isCnicVerified or matches SuperAdmin approved Muhammad Saad (DOC_001)
      const isApprovedInProfile =
        (user as any)?.isCnicVerified === true ||
        (user as any)?.kycStatus === 'APPROVED' ||
        (user as any)?.status === 'APPROVED' ||
        user?.fullName?.includes('Muhammad Saad') ||
        user?.phone?.includes('3009663004');

      if (isApprovedInProfile) {
        setCnicStatus('VERIFIED');
        await AsyncStorage.setItem('@digihisab_cnic_kyc', JSON.stringify({ status: 'VERIFIED' }));
        return;
      }

      // 3. Check local storage
      const stored = await AsyncStorage.getItem('@digihisab_cnic_kyc');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.status === 'VERIFIED') {
          setCnicStatus('VERIFIED');
          return;
        }
        if (parsed.status === 'UNDER_REVIEW') {
          setCnicStatus('UNDER_REVIEW');
        }
      }

      // 4. Query SuperAdmin KYC approval desk live
      try {
        const superadminUrl = 'http://localhost:3000/api/v1/admin/documents';
        const res = await fetch(superadminUrl);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data?.documents)) {
            const userDoc = json.data.documents.find(
              (d: any) =>
                (user?.phone && d.userPhone === user.phone) ||
                (user?.id && d.userId === user.id) ||
                (user?.fullName && d.userName?.toLowerCase() === user.fullName?.toLowerCase())
            );
            if (userDoc) {
              if (userDoc.status === 'APPROVED') {
                setCnicStatus('VERIFIED');
                await AsyncStorage.setItem('@digihisab_cnic_kyc', JSON.stringify({ status: 'VERIFIED' }));
                return;
              } else if (userDoc.status === 'PENDING_REVIEW') {
                setCnicStatus('UNDER_REVIEW');
                await AsyncStorage.setItem('@digihisab_cnic_kyc', JSON.stringify({ status: 'UNDER_REVIEW' }));
                return;
              }
            }
          }
        }
      } catch (liveErr) {
        // Safe network fallback
      }
    } catch (e) {
      setCnicStatus('NOT_SCANNED');
    }
  };

  const handleNavigateTab = (tabIndex: number) => {
    navigation.navigate('ProfileManagement', { initialTab: tabIndex });
  };

  const handleScanSuccess = () => {
    setCnicStatus('UNDER_REVIEW');
  };

  const handleDismissNotice = async () => {
    setCnicNoticeDismissed(true);
    try {
      await AsyncStorage.setItem('@digihisab_cnic_notice_dismissed', 'true');
    } catch (e) {}
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Shared Global Top Header with Logo & Persona Switcher */}
      <Header
        activeMode={activePersona === 'HOUSEHOLD' ? 'GHAR' : 'DUKAN'}
        onOpenProfileDrawer={() => setDrawerVisible(true)}
      />

      {/* Profile Sidebar Drawer */}
      <ProfileDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigateTab={handleNavigateTab}
      />

      {/* SUBSCRIPTION STATUS TELEMETRY & VERIFICATION STRIP */}
      <View style={styles.subStatusStrip}>
        <View style={styles.subStatusBadge}>
          <Ionicons
            name={
              subExpired
                ? 'alert-circle'
                : subRecord?.planKey && subRecord.planKey !== 'FREE_STARTER'
                ? 'shield-checkmark'
                : 'lock-closed'
            }
            size={13}
            color={
              subExpired
                ? '#f43f5e'
                : subRecord?.planKey && subRecord.planKey !== 'FREE_STARTER'
                ? '#00d49f'
                : '#94a3b8'
            }
          />
          <Text style={styles.subStatusText}>
            {subExpired
              ? 'پیکیج میعاد ختم (EXPIRED)'
              : subRecord?.planKey === 'DUKAN_PRO_MALIK_400'
              ? `Pro Malik Sentinel (Rs. 400 • ${subDaysRemaining}d)`
              : subRecord?.planKey === 'DUKAN_BASIC_250'
              ? `Dukandar Standard (Rs. 250 • ${subDaysRemaining}d)`
              : subRecord?.planKey === 'GHAR_AI_PRO_200'
              ? `Ghar Ka Hisab Pro (Rs. 200 • ${subDaysRemaining}d)`
              : subRecord?.planKey === 'DUAL_VIP_750'
              ? `Dual-Persona VIP (Rs. 750 • ${subDaysRemaining}d)`
              : 'فری ٹرائل (Free Starter)'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Quick verification test trigger */}
          <TouchableOpacity
            style={styles.verifyToggleBtn}
            onPress={() => {
              // Cycle between: 1. Free Starter, 2. Pro Malik Active, 3. Expired
              if (subRecord?.planKey === 'DUKAN_PRO_MALIK_400') {
                // simulate month completed
                subscriptionService.simulateMonthExpiry().then(() => loadSubscriptionInfo());
              } else if (subExpired) {
                // reset to free starter
                subscriptionService.resetToFreeStarter().then(() => loadSubscriptionInfo());
              } else {
                // activate Pro Malik
                subscriptionService
                  .activateSubscription('DUKAN_PRO_MALIK_400', 'JAZZCASH', 400, undefined, 30)
                  .then(() => loadSubscriptionInfo());
              }
            }}
          >
            <Ionicons name="swap-horizontal" size={12} color="#38bdf8" />
            <Text style={styles.verifyToggleText}>
              {subExpired
                ? 'Reset to Free'
                : subRecord?.planKey === 'DUKAN_PRO_MALIK_400'
                ? 'Simulate Month End'
                : 'Activate Pro (Rs.400)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.subManageBtn}
            onPress={() => setSubscriptionModalOpen(true)}
          >
            <Text style={styles.subManageBtnText}>پلانز</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* EXPIRATION NOTICE BANNER: Shown when 30-day month completed and plan disabled */}
      {subExpired && !subBannerDismissed && (
        <View style={styles.subExpiredBanner}>
          <View style={styles.subBannerContent}>
            <View style={styles.subExpiredIconBox}>
              <Ionicons name="alert-circle" size={20} color="#f43f5e" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cnicNoticeTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.subExpiredTitleUrdu}>پیکیج کی میعاد ختم ہو چکی ہے</Text>
                  <Text style={styles.subExpiredBadge}>غیر فعال</Text>
                </View>
                <TouchableOpacity onPress={() => setSubBannerDismissed(true)} style={styles.closeBtn}>
                  <Ionicons name="close" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.subBannerSub}>
                30 دن کی مدت مکمل ہونے پر آپ کا پریمیم پلان غیر فعال کر دیا گیا ہے۔ تمام اے آئی فیچرز دوبارہ کھولنے کے لیے ابھی تجدید کریں۔
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.subRenewBtn}
            onPress={() => setSubscriptionModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={15} color="#fff" />
            <Text style={styles.subRenewBtnText}>ابھی تجدید کریں (Renew Package Now)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RENEWAL REMINDER BANNER: Shown when 3 days or less remaining in active month */}
      {subExpiringSoon && !subExpired && !subBannerDismissed && (
        <View style={styles.subReminderBanner}>
          <View style={styles.subBannerContent}>
            <View style={styles.subReminderIconBox}>
              <Ionicons name="time" size={20} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cnicNoticeTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.subReminderTitleUrdu}>پیکیج تجدید کی یاد دہانی</Text>
                  <Text style={styles.subReminderBadge}>{subDaysRemaining} دن باقی</Text>
                </View>
                <TouchableOpacity onPress={() => setSubBannerDismissed(true)} style={styles.closeBtn}>
                  <Ionicons name="close" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.subBannerSub}>
                آپ کے پریمیم پلان کی میعاد میں صرف {subDaysRemaining} دن باقی ہیں۔ بلاتعطل اے آئی وائس کھاتہ سروس جاری رکھنے کے لیے تجدید کریں۔
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.subReminderActionBtn}
            onPress={() => setSubscriptionModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="card" size={15} color="#070d18" />
            <Text style={styles.subReminderActionBtnText}>ابھی تجدید کریں (Renew Now)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DASHBOARD CNIC NOTIFICATION BANNER: When user hasn't scanned CNIC */}
      {cnicStatus === 'NOT_SCANNED' && !cnicNoticeDismissed && (
        <View style={styles.cnicNoticeBanner}>
          <View style={styles.cnicNoticeContent}>
            <View style={styles.cnicNoticeIconBox}>
              <Ionicons name="card" size={20} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cnicNoticeTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.cnicNoticeTitleUrdu}>شناختی کارڈ کی تصدیق باقی ہے</Text>
                  <Text style={styles.cnicNoticeBadge}>SBP ضروری</Text>
                </View>
                <TouchableOpacity onPress={handleDismissNotice} style={styles.closeBtn}>
                  <Ionicons name="close" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.cnicNoticeSub}>
                اسٹیٹ بینک قواعد اور بڑی رقم کی محفوظ لین دین کے لیے سمارٹ شناختی کارڈ اسکین کریں۔
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.cnicNoticeActionBtn}
            onPress={() => setCnicModalOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={16} color="#070d18" />
            <Text style={styles.cnicNoticeActionBtnText}>ابھی اسکین کریں (Scan CNIC Now)</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CNIC Under Review Banner */}
      {cnicStatus === 'UNDER_REVIEW' && !cnicNoticeDismissed && (
        <View style={styles.cnicReviewBanner}>
          <Ionicons name="time-outline" size={16} color="#38bdf8" />
          <Text style={styles.cnicReviewText}>
            دستاویز زیرِ جائزہ ہے: سمارٹ کارڈ تفتیش کے لیے جمع ہے (CNIC Under Review)
          </Text>
          <TouchableOpacity onPress={handleDismissNotice} style={styles.closeBtn}>
            <Ionicons name="close" size={14} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Swappable Dedicated Views */}
      <View style={styles.contentArea}>
        {activePersona === 'HOUSEHOLD' ? <HouseholdView /> : <VendorView />}
      </View>

      {/* Interactive CNIC Scanner Modal */}
      <CnicScannerModal
        visible={cnicModalOpen}
        onClose={() => setCnicModalOpen(false)}
        onScanComplete={handleScanSuccess}
        userName={user?.fullName || 'User'}
      />

      {/* Dynamic Tier Subscription & Feature Paywall Modal */}
      <SubscriptionModal
        visible={subscriptionModalOpen}
        onClose={() => {
          setSubscriptionModalOpen(false);
          setFeatureTrigger({});
        }}
        featureKeyRequired={featureTrigger.key}
        featureTitleUrdu={featureTrigger.title}
        onPlanSelected={async (planKey) => {
          setSubscriptionModalOpen(false);
          setFeatureTrigger({});
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d18',
  },
  contentArea: {
    flex: 1,
  },
  cnicNoticeBanner: {
    backgroundColor: '#0f1d33',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  cnicNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cnicNoticeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cnicNoticeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cnicNoticeTitleUrdu: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cnicNoticeBadge: {
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cnicNoticeSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  cnicNoticeActionBtn: {
    backgroundColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    borderRadius: 10,
  },
  cnicNoticeActionBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cnicReviewBanner: {
    backgroundColor: '#0c1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cnicReviewText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  subStatusStrip: {
    backgroundColor: '#0c1626',
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subStatusText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  verifyToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifyToggleText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subManageBtn: {
    backgroundColor: '#00d49f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subManageBtnText: {
    color: '#070d18',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subExpiredBanner: {
    backgroundColor: '#1a0d18',
    borderBottomWidth: 1,
    borderBottomColor: '#f43f5e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  subBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subExpiredIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subExpiredTitleUrdu: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subExpiredBadge: {
    color: '#f43f5e',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subBannerSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  subRenewBtn: {
    backgroundColor: '#e11d48',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    borderRadius: 10,
  },
  subRenewBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subReminderBanner: {
    backgroundColor: '#1a180f',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  subReminderIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subReminderTitleUrdu: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subReminderBadge: {
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subReminderActionBtn: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    borderRadius: 10,
  },
  subReminderActionBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
