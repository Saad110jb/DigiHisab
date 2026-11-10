import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { profileApi, ProfileData } from '../../api/profile.api';
import { auditLogApi, AuditLogItem } from '../../api/auditLog.api';
import { COLORS } from '../../theme/colors';
import { useAuth } from '../../store/auth.store';
import { ManagerPinSection } from '../../components/ManagerPinSection';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      initialTab?: number;
    };
  };
}

export const ProfileManagementScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile, activePersona } = useAuth();
  const isHousehold = activePersona === 'HOUSEHOLD';
  const isOwner = !user?.role || user.role === 'OWNER';

  const initialTab = route?.params?.initialTab ?? 0;
  const [activeTab, setActiveTab] = useState<number>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Business Profile Form State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [businessCategory, setBusinessCategory] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [cnic, setCnic] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [cashierPinRequired, setCashierPinRequired] = useState<boolean>(true);

  // Payment Settings State
  const [jazzCashNumber, setJazzCashNumber] = useState<string>('');
  const [jazzCashTitle, setJazzCashTitle] = useState<string>('');
  const [easypaisaNumber, setEasypaisaNumber] = useState<string>('');
  const [easypaisaTitle, setEasypaisaTitle] = useState<string>('');
  const [raastId, setRaastId] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');

  // Cashier Sub-Accounts State
  const [showAddSubAccountModal, setShowAddSubAccountModal] = useState<boolean>(false);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubPhone, setNewSubPhone] = useState<string>('');
  const [newSubRole, setNewSubRole] = useState<'CASHIER' | 'MANAGER'>('CASHIER');
  const [newSubPin, setNewSubPin] = useState<string>('');

  // Show / Hide PIN Toggle States
  const [showManagerPin, setShowManagerPin] = useState<boolean>(false);
  const [showNewSubPin, setShowNewSubPin] = useState<boolean>(false);

  // Edit Cashier Sub-Account State
  const [editingSubAccount, setEditingSubAccount] = useState<any | null>(null);
  const [showEditSubAccountModal, setShowEditSubAccountModal] = useState<boolean>(false);
  const [editSubName, setEditSubName] = useState<string>('');
  const [editSubRole, setEditSubRole] = useState<'CASHIER' | 'MANAGER'>('CASHIER');
  const [editSubPin, setEditSubPin] = useState<string>('');
  const [showEditSubPin, setShowEditSubPin] = useState<boolean>(false);

  // Forensic Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();
    loadAuditLogs();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await profileApi.getProfile();
      setProfile(res);
      setFullName(res.fullName || '');
      setEmail(res.email || '');
      setBusinessName(res.businessName || '');
      setBusinessCategory(res.businessCategory || 'General Store');
      setAddress(res.businessAddress || res.address || '');
      setCnic(res.cnic || '');
      setManagerPin(res.managerPin || '');
      setCashierPinRequired(res.cashierPinRequired ?? true);

      if (res.paymentSettings) {
        setJazzCashNumber(res.paymentSettings.jazzCashNumber || '');
        setJazzCashTitle(res.paymentSettings.jazzCashTitle || '');
        setEasypaisaNumber(res.paymentSettings.easypaisaNumber || '');
        setEasypaisaTitle(res.paymentSettings.easypaisaTitle || '');
        setRaastId(res.paymentSettings.raastId || '');
        setBankName(res.paymentSettings.bankName || '');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setLoadingAuditLogs(true);
      const res = await auditLogApi.getAuditLogs();
      setAuditLogs(res.data || []);
    } catch (err: any) {
      console.warn('Audit logs load failed:', err.message);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const handleSaveProfile = async () => {
    if (cnic && cnic.includes('@')) {
      Alert.alert('⚠️ غلط اندراج', 'Email address cannot be passed as owner CNIC.');
      return;
    }

    let formattedCnic = cnic ? cnic.trim() : '';
    if (formattedCnic) {
      const digits = formattedCnic.replace(/[^0-9]/g, '');
      if (digits.length === 13) {
        formattedCnic = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
        setCnic(formattedCnic);
      } else if (!/^\d{5}-\d{7}-\d{1}$/.test(formattedCnic)) {
        Alert.alert('⚠️ غلط شناختی کارڈ نمبر', 'Pakistani CNIC must have 13 digits (e.g. 42101-1234567-1).');
        return;
      }
    }

    if (bankName && bankName.includes('@')) {
      Alert.alert('⚠️ غلط اندراج', 'Email address cannot be passed as Bank Name.');
      return;
    }

    if (managerPin && !/^\d{4,6}$/.test(managerPin.trim())) {
      Alert.alert('Invalid PIN', 'Manager / Owner Security PIN must be between 4 to 6 numeric digits.');
      return;
    }

    try {
      setSaving(true);
      const res = await profileApi.updateBusinessProfile({
        fullName,
        email: email ? email.trim().toLowerCase() : undefined,
        businessName,
        businessCategory,
        address,
        businessAddress: address,
        cnic: formattedCnic,
        ownerCnic: formattedCnic,
        managerPin: managerPin ? managerPin.trim() : undefined,
        cashierPinRequired,
        paymentSettings: {
          jazzCashNumber,
          jazzCashTitle,
          easypaisaNumber,
          easypaisaTitle,
          raastId,
          bankName,
        },
      });
      Alert.alert('Success', 'Business profile & Direct Payment numbers updated successfully!');
      refreshProfile?.();
      if (res.profile) {
        setProfile(res.profile);
      } else {
        loadProfile();
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubAccount = async () => {
    if (!newSubName.trim() || !newSubPhone.trim() || !newSubPin.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name, Phone, and 4-6 digit PIN.');
      return;
    }
    if (!/^\d{4,6}$/.test(newSubPin.trim())) {
      Alert.alert('Invalid PIN', 'Staff PIN must be between 4 to 6 numeric digits.');
      return;
    }

    try {
      setSaving(true);
      await profileApi.addSubAccount({
        fullName: newSubName,
        phone: newSubPhone,
        role: newSubRole,
        pin: newSubPin,
      });
      Alert.alert('Success', `${newSubRole} account created successfully!`);
      setShowAddSubAccountModal(false);
      setNewSubName('');
      setNewSubPhone('');
      setNewSubPin('');
      loadProfile();
      loadAuditLogs();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add sub-account.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditSubAccount = (sub: any) => {
    setEditingSubAccount(sub);
    setEditSubName(sub.fullName || sub.name || '');
    setEditSubRole(sub.role || 'CASHIER');
    setEditSubPin(sub.pin || '');
    setShowEditSubPin(false);
    setShowEditSubAccountModal(true);
  };

  const handleUpdateSubAccount = async () => {
    if (!editingSubAccount) return;
    const subId = editingSubAccount._id || editingSubAccount.subAccountId;
    if (!subId) return;

    if (editSubPin && !/^\d{4,6}$/.test(editSubPin.trim())) {
      Alert.alert('Invalid PIN', 'Staff PIN must be between 4 to 6 numeric digits.');
      return;
    }

    try {
      setSaving(true);
      await profileApi.updateSubAccount(subId, {
        name: editSubName,
        role: editSubRole,
        pin: editSubPin ? editSubPin.trim() : undefined,
      });
      Alert.alert('Success', 'Sub-account details & PIN updated successfully!');
      setShowEditSubAccountModal(false);
      setEditingSubAccount(null);
      loadProfile();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update sub-account.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSubAccountStatus = async (subAccountId: string, currentStatus: boolean) => {
    try {
      await profileApi.updateSubAccountStatus(subAccountId, !currentStatus);
      loadProfile();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading Profile & Audit Settings...</Text>
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile & Staff Management</Text>
        </View>
        <View style={styles.forbiddenCard}>
          <Ionicons name="lock-closed" size={64} color="#E11D48" />
          <Text style={styles.forbiddenTitle}>🔒 صرف دکان کے مالک کو رسائی کی اجازت ہے</Text>
          <Text style={styles.forbiddenSub}>(Owner Only Access)</Text>
          <Text style={styles.forbiddenDesc}>
            کیشیئر یا منیجر کے پاس دکان کی اہم ترتیبات اور عملے کے کھاتوں تک رسائی کی اجازت نہیں ہے۔
          </Text>
          <TouchableOpacity style={styles.forbiddenBtn} onPress={() => navigation?.goBack?.()}>
            <Text style={styles.forbiddenBtnText}>واپس جائیں (Go Back)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 14 : 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isHousehold ? 'Gharana & Family Settings (گھرانہ و فیملی سیٹ اپ)' : 'Profile & Staff Management'}
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadProfile}>
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Persona Lock Guard Info Banner */}
      <View style={[styles.guardBanner, isHousehold && { backgroundColor: '#0C4A6E', borderColor: '#0284C7' }]}>
        <Ionicons
          name={isHousehold ? 'home' : 'shield-checkmark-sharp'}
          size={20}
          color={isHousehold ? '#38BDF8' : '#8FF6CA'}
        />
        <View style={styles.guardBannerTextContainer}>
          <Text style={[styles.guardBannerTitle, isHousehold && { color: '#38BDF8' }]}>
            {isHousehold
              ? '🏠 Active Persona: GHAR KA HISAB / HOUSEHOLD (گھریلو حساب کتاب)'
              : `Persona Guard: Locked to ${profile?.registeredAccountType || 'VENDOR'} Mode`}
          </Text>
          <Text style={[styles.guardBannerSub, isHousehold && { color: '#BAE6FD' }]}>
            {isHousehold
              ? 'گھریلو کھاتہ فیملی بجٹ، راشن، یوٹیلیٹیز اور پاکٹ منی کے لیے مخصوص ہے۔'
              : 'Commercial Dukandar profiles are permanently anchored to prevent domestic accounting leakage.'}
          </Text>
        </View>
      </View>

      {/* Tab Navigation Segmented Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 0 && styles.tabBtnActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
            {isHousehold ? '🏡 فیملی تفصیلات' : '🏢 Business'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 1 && styles.tabBtnActive]}
          onPress={() => setActiveTab(1)}
        >
          <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
            {isHousehold ? `👨‍👩‍👧 اراکین رسائی (${profile?.subAccounts?.length || 0})` : `👥 Cashiers (${profile?.subAccounts?.length || 0})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 2 && styles.tabBtnActive]}
          onPress={() => setActiveTab(2)}
        >
          <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>
            {isHousehold ? '📋 خرچہ آڈٹ لاگ' : '📋 Audit Logs'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 0: Business / Household Profile */}
      {activeTab === 0 && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isHousehold ? '🏡 گھرانہ اور سربراہ تفصیلات (Household & Head Info)' : 'Owner & Business Information'}
            </Text>

            <Text style={styles.inputLabel}>
              {isHousehold ? 'سربراہ کا پورا نام (Head Full Name)' : 'Full Name (Owner)'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="e.g. Muhammad Saad"
            />

            <Text style={styles.inputLabel}>
              {isHousehold ? 'گھرانہ / فیملی کا نام (Family / Household Name)' : 'Business / Shop Name'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder={isHousehold ? 'e.g. Saad Family / چودھری ہاؤس' : 'e.g. Al-Madina General Store'}
            />

            <Text style={styles.inputLabel}>
              {isHousehold ? 'رہائش کی قسم (Household Category)' : 'Business Category'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={businessCategory}
              onChangeText={setBusinessCategory}
              placeholder={isHousehold ? 'e.g. ذاتی رہائش / جوائنٹ فیملی / ہاسٹل' : 'e.g. General Store / Wholesaler'}
            />

            <Text style={styles.inputLabel}>
              {isHousehold ? 'ای میل ایڈریس (Email Address - For Monthly Budget Reports & OTP)' : 'سرکاری ای میل ایڈریس (Official Email - For Daily Till Closing Slips & OTP)'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder={isHousehold ? 'e.g. household.head@gmail.com' : 'e.g. store.retail@gmail.com'}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>
              {isHousehold ? 'گھر کا پتہ (Home Address)' : 'Shop Address / Location'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={address}
              onChangeText={setAddress}
              placeholder="e.g. Chak NO 110 JB, Faisalabad"
            />

            <Text style={styles.inputLabel}>
              {isHousehold ? 'سربراہ کا شناختی کارڈ (Head CNIC Number)' : 'Owner CNIC Number'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={cnic}
              onChangeText={setCnic}
              placeholder="35202-XXXXXXX-X"
              keyboardType="numeric"
            />
          </View>

          {/* Direct Merchant / Household Payment Accounts Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isHousehold ? '💳 گھریلو ڈیجیٹل اکاؤنٹس (JazzCash, EasyPaisa, Bank)' : '💳 Direct Merchant Payment Accounts'}
            </Text>
            <Text style={styles.cardDesc}>
              {isHousehold
                ? 'یہ نمبرز اور اکاؤنٹس یوٹیلیٹی بلز، راشن اور دودھ کی ادائیگی کے لیے استعمال ہوتے ہیں۔'
                : 'These account details are automatically embedded into your WhatsApp Tagaza messages and customer payment links.'}
            </Text>

            <Text style={styles.inputLabel}>JazzCash Account Number</Text>
            <TextInput
              style={styles.textInput}
              value={jazzCashNumber}
              onChangeText={setJazzCashNumber}
              placeholder="e.g. 03001234567"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>JazzCash Account Title</Text>
            <TextInput
              style={styles.textInput}
              value={jazzCashTitle}
              onChangeText={setJazzCashTitle}
              placeholder="e.g. Ali Raza (Store Owner)"
            />

            <Text style={styles.inputLabel}>Easypaisa Account Number</Text>
            <TextInput
              style={styles.textInput}
              value={easypaisaNumber}
              onChangeText={setEasypaisaNumber}
              placeholder="e.g. 03129876543"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Easypaisa Account Title</Text>
            <TextInput
              style={styles.textInput}
              value={easypaisaTitle}
              onChangeText={setEasypaisaTitle}
              placeholder="e.g. Ali Raza Kiryana"
            />

            <Text style={styles.inputLabel}>Raast ID / IBAN / Phone</Text>
            <TextInput
              style={styles.textInput}
              value={raastId}
              onChangeText={setRaastId}
              placeholder="e.g. 03001234567 or PK00MEZN..."
            />

            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.textInput}
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. Meezan Bank / HBL"
            />
          </View>

          {/* Manager Override & PIN Security (Strictly Hidden for Cashiers via RBAC) */}
          <ManagerPinSection
            initialPin={managerPin}
            cashierPinRequired={cashierPinRequired}
            onPinUpdated={(newPin) => setManagerPin(newPin)}
            onCashierPinRequiredChange={(val) => setCashierPinRequired(val)}
          />

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveProfile}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Save Business Profile</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* TAB 1: Cashier & Staff Sub-Accounts */}
      {activeTab === 1 && (() => {
        const filteredSubAccounts = (profile?.subAccounts || []).filter((sub: any) => {
          const subPhoneClean = sub.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
          const targetPhone = user?.phone || profile?.phone || '';
          const masterPhoneClean = targetPhone ? targetPhone.replace(/[^0-9]/g, '') : '';
          const masterIdStr = user?.id || profile?.id;
          const isMasterOwner =
            (sub._id && sub._id.toString() === masterIdStr?.toString()) ||
            (sub.subAccountId && sub.subAccountId.toString() === masterIdStr?.toString()) ||
            (subPhoneClean && masterPhoneClean && subPhoneClean === masterPhoneClean);
          return !isMasterOwner;
        });

        return (
          <View style={styles.tabContent}>
            <View style={styles.subAccountHeader}>
              <View>
                <Text style={styles.subAccountHeaderTitle}>
                  {isHousehold ? 'اہلِ خانہ و روم میٹ رسائی (Family Access)' : 'Staff RBAC Accounts'}
                </Text>
                <Text style={styles.subAccountHeaderSub}>
                  {isHousehold
                    ? `فیملی ٹائر: DOMESTIC PRO • ${filteredSubAccounts.length} اراکین`
                    : `Tier: ${profile?.tier || 'PRO'} • ${filteredSubAccounts.length} / Unlimited Cashiers`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addStaffBtn}
                onPress={() => setShowAddSubAccountModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addStaffBtnText}>
                  {isHousehold ? '+ فرد شامل کریں' : 'Add Cashier'}
                </Text>
              </TouchableOpacity>
            </View>

            {filteredSubAccounts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>
                  {isHousehold ? 'ابھی تک کوئی فیملی اکاؤنٹ شامل نہیں کیا گیا' : 'No Cashier Accounts Created'}
                </Text>
                <Text style={styles.emptySub}>
                  {isHousehold
                    ? 'بیگم، بچوں یا روم میٹس کے الگ اکاؤنٹ بنائیں تاکہ وہ کچن، میس فنڈ یا پاکٹ منی کا اندراج خود کر سکیں۔'
                    : 'Create sub-accounts for your counter cashiers so they can log udhaar entries under audit supervision.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredSubAccounts}
                keyExtractor={(item) => item._id || item.subAccountId}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                const displayName = item.fullName || item.name || 'Cashier';
                const subId = item._id || item.subAccountId;

                return (
                  <View style={styles.subAccountCard}>
                    <View style={styles.subAccountTop}>
                      <View style={styles.subAccountAvatar}>
                        <Text style={styles.subAccountAvatarText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.subAccountName}>{displayName}</Text>
                        <Text style={styles.subAccountPhone}>{item.phone}</Text>
                      </View>
                      <View
                        style={[
                          styles.roleBadge,
                          item.role === 'MANAGER' ? styles.roleManager : styles.roleCashier,
                        ]}
                      >
                        <Text style={styles.roleBadgeText}>{item.role}</Text>
                      </View>
                    </View>

                    <View style={styles.subAccountBottom}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.pinText}>PIN: {item.pin ? item.pin : '••••'}</Text>
                        <TouchableOpacity
                          style={styles.changePinBtn}
                          onPress={() => handleOpenEditSubAccount(item)}
                        >
                          <Ionicons name="key-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.changePinBtnText}>Edit / Change PIN</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.statusToggleRow}>
                        <Text style={styles.statusLabel}>
                          {item.isActive ? 'Active' : 'Disabled'}
                        </Text>
                        <Switch
                          value={item.isActive}
                          onValueChange={() => handleToggleSubAccountStatus(subId, item.isActive)}
                          trackColor={{ false: '#CBD5E1', true: COLORS.emerald }}
                        />
                      </View>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      );
    })()}

      {/* TAB 2: Forensic / Household Budget Audit Logs */}
      {activeTab === 2 && (
        <View style={styles.tabContent}>
          <View style={styles.auditHeader}>
            <Text style={styles.auditHeaderTitle}>
              {isHousehold ? 'ماہانہ خرچہ آڈٹ لاگ (Monthly Budget Audit)' : 'Forensic Audit Log Trail'}
            </Text>
            <TouchableOpacity onPress={loadAuditLogs} style={styles.auditRefreshBtn}>
              <Ionicons name="reload" size={16} color={COLORS.primary} />
              <Text style={styles.auditRefreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingAuditLogs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {isHousehold ? 'ماہانہ گھریلو آڈٹ لاگز لوڈ ہو رہے ہیں...' : 'Fetching forensic audit log entries...'}
              </Text>
            </View>
          ) : auditLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {isHousehold ? 'ابھی تک کوئی آڈٹ اندراج موجود نہیں' : 'No Forensic Audit Logs Found'}
              </Text>
              <Text style={styles.emptySub}>
                {isHousehold
                  ? 'راشن، بلز، میڈیسن، اسکول فیس اور کمیٹی کی تمام رسیدیں اور تصدیق شدہ تاریخ یہاں محفوظ ہوں گی۔'
                  : 'Manager overrides, credit limit updates, and sub-account creations will be logged here with timestamps.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={auditLogs}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.auditCard}>
                  <View style={styles.auditCardTop}>
                    <View style={styles.actionTypeTag}>
                      <Text style={styles.actionTypeTagText}>{item.actionType}</Text>
                    </View>
                    <Text style={styles.auditDate}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.auditMetaRow}>
                    <Ionicons name="person-circle-outline" size={16} color="#64748B" />
                    <Text style={styles.auditAuthor}>
                      Authorized by: {item.authorizedByName} ({item.authorizedByRole})
                    </Text>
                  </View>

                  {item.counterpartyName && (
                    <Text style={styles.auditCounterparty}>
                      Customer: {item.counterpartyName} ({item.counterpartyPhone || 'N/A'})
                    </Text>
                  )}

                  {item.reason && (
                    <Text style={styles.auditReason}>Reason: "{item.reason}"</Text>
                  )}

                  {item.financialSnapshot && (
                    <View style={styles.snapshotBox}>
                      <Text style={styles.snapshotTitle}>FINANCIAL SNAPSHOT</Text>
                      <View style={styles.snapshotGrid}>
                        <Text style={styles.snapshotText}>
                          Limit: Rs. {item.financialSnapshot.creditLimit?.toLocaleString() || 0}
                        </Text>
                        <Text style={styles.snapshotText}>
                          Prev Bal: Rs. {item.financialSnapshot.balanceBefore?.toLocaleString() || 0}
                        </Text>
                        <Text style={styles.snapshotText}>
                          Attempted: Rs. {item.financialSnapshot.attemptedAmount?.toLocaleString() || 0}
                        </Text>
                        <Text style={styles.snapshotTextBold}>
                          New Bal: Rs. {item.financialSnapshot.resultingBalance?.toLocaleString() || 0}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Modal to Add New Staff Sub-Account */}
      <Modal visible={showAddSubAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Staff Cashier Sub-Account</Text>
              <TouchableOpacity onPress={() => setShowAddSubAccountModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Staff Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={newSubName}
              onChangeText={setNewSubName}
              placeholder="e.g. Tariq Mehmood"
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.textInput}
              value={newSubPhone}
              onChangeText={setNewSubPhone}
              placeholder="03001234567"
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.rolePickerRow}>
              <TouchableOpacity
                style={[
                  styles.rolePickBtn,
                  newSubRole === 'CASHIER' && styles.rolePickBtnActive,
                ]}
                onPress={() => setNewSubRole('CASHIER')}
              >
                <Text
                  style={[
                    styles.rolePickText,
                    newSubRole === 'CASHIER' && styles.rolePickTextActive,
                  ]}
                >
                  CASHIER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rolePickBtn,
                  newSubRole === 'MANAGER' && styles.rolePickBtnActive,
                ]}
                onPress={() => setNewSubRole('MANAGER')}
              >
                <Text
                  style={[
                    styles.rolePickText,
                    newSubRole === 'MANAGER' && styles.rolePickTextActive,
                  ]}
                >
                  MANAGER
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>4-Digit Login PIN</Text>
            <View style={styles.pinInputWrapper}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={newSubPin}
                onChangeText={setNewSubPin}
                placeholder="e.g. 5566"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={!showNewSubPin}
              />
              <TouchableOpacity
                onPress={() => setShowNewSubPin(!showNewSubPin)}
                style={styles.eyeIconBtn}
              >
                <Ionicons
                  name={showNewSubPin ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleAddSubAccount}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Create Staff Sub-Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal to Edit Staff Sub-Account & Change PIN */}
      <Modal visible={showEditSubAccountModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Staff Sub-Account & PIN</Text>
              <TouchableOpacity onPress={() => setShowEditSubAccountModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Staff Full Name</Text>
            <TextInput
              style={styles.textInput}
              value={editSubName}
              onChangeText={setEditSubName}
              placeholder="Staff Name"
            />

            <Text style={styles.inputLabel}>Role</Text>
            <View style={styles.rolePickerRow}>
              <TouchableOpacity
                style={[
                  styles.rolePickBtn,
                  editSubRole === 'CASHIER' && styles.rolePickBtnActive,
                ]}
                onPress={() => setEditSubRole('CASHIER')}
              >
                <Text
                  style={[
                    styles.rolePickText,
                    editSubRole === 'CASHIER' && styles.rolePickTextActive,
                  ]}
                >
                  CASHIER
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.rolePickBtn,
                  editSubRole === 'MANAGER' && styles.rolePickBtnActive,
                ]}
                onPress={() => setEditSubRole('MANAGER')}
              >
                <Text
                  style={[
                    styles.rolePickText,
                    editSubRole === 'MANAGER' && styles.rolePickTextActive,
                  ]}
                >
                  MANAGER
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New 4-Digit Login PIN</Text>
            <View style={styles.pinInputWrapper}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={editSubPin}
                onChangeText={setEditSubPin}
                placeholder="e.g. 5566"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry={!showEditSubPin}
              />
              <TouchableOpacity
                onPress={() => setShowEditSubPin(!showEditSubPin)}
                style={styles.eyeIconBtn}
              >
                <Ionicons
                  name={showEditSubPin ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleUpdateSubAccount}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>Save Cashier Changes & PIN</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    padding: 4,
  },
  guardBanner: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  guardBannerTextContainer: {
    flex: 1,
  },
  guardBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8FF6CA',
  },
  guardBannerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0F172A',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 30,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  subAccountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subAccountHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subAccountHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addStaffBtn: {
    backgroundColor: COLORS.cyan,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addStaffBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  subAccountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subAccountTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subAccountAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subAccountAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  subAccountName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  subAccountPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleManager: {
    backgroundColor: '#FEF3C7',
  },
  roleCashier: {
    backgroundColor: '#E0F2FE',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  subAccountBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pinText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  changePinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changePinBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pinInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  eyeIconBtn: {
    padding: 8,
  },
  statusToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  auditHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  auditRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  auditRefreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.cyan,
    elevation: 1,
  },
  auditCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTypeTag: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actionTypeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8FF6CA',
  },
  auditDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  auditMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  auditAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  auditCounterparty: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  auditReason: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 4,
  },
  snapshotBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  snapshotTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  snapshotText: {
    fontSize: 11,
    color: '#475569',
  },
  snapshotTextBold: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.navy,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 6,
  },
  rolePickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  rolePickBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rolePickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  rolePickTextActive: {
    color: '#FFFFFF',
  },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  forbiddenCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 40,
  },
  forbiddenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 16,
    textAlign: 'center',
  },
  forbiddenSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E11D48',
    marginTop: 4,
  },
  forbiddenDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  forbiddenBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  forbiddenBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
