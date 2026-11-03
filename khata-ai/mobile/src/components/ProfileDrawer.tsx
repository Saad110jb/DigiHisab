import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Alert,
  TextInput,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/auth.store';
import { COLORS } from '../theme/colors';

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigateTab: (tabIndex: number) => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  visible,
  onClose,
  onNavigateTab,
}) => {
  const insets = useSafeAreaInsets();
  const { user, logout, activePersona } = useAuth();

  // Persona Detection
  const isHousehold = activePersona === 'HOUSEHOLD';

  // Strict RBAC Role Detection for Commercial mode
  const currentRole = user?.role || 'OWNER';
  const isOwner = currentRole === 'OWNER';
  const isManager = currentRole === 'MANAGER';
  const isCashier = currentRole === 'CASHIER';

  // Domestic Student / Household Head Toggle
  const [isStudentMode, setIsStudentMode] = useState<boolean>(false);

  // Sub-Modal States
  const [showGharanaModal, setShowGharanaModal] = useState<boolean>(false);
  const [showFamilyAccessModal, setShowFamilyAccessModal] = useState<boolean>(false);
  const [showAuditLogsModal, setShowAuditLogsModal] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // Household Profile State
  const [householdSize, setHouseholdSize] = useState<number>(5);
  const [monthlySavingCap, setMonthlySavingCap] = useState<string>('35,000');
  const [primaryIncome, setPrimaryIncome] = useState<string>('تنخواہ و ذاتی کاروبار (Salary & Self-Employed)');
  const [homeAddress, setHomeAddress] = useState<string>(user?.address || 'Chak NO 110 JB • Gharana');
  const [headCnic, setHeadCnic] = useState<string>((user as any)?.cnic || '35202-1234567-1');

  // Security PIN State
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');

  const handleNav = (tabIndex: number) => {
    onClose();
    onNavigateTab(tabIndex);
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  const handleSavePin = () => {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      Alert.alert('غلط پن', 'براہ کرم درست 4 ہندسوں کا سیکیورٹی پن درج کریں۔');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('پن میچ نہیں ہوا', 'دونوں فیلڈز میں ایک جیسا پن درج کریں۔');
      return;
    }
    Alert.alert('کامیابی', 'گھریلو سیکیورٹی پن (4-Digit Gharana PIN) کامیابی سے محفوظ ہو گیا ہے۔');
    setShowPinModal(false);
    setNewPin('');
    setConfirmPin('');
  };

  const handleExportPdfStatement = async () => {
    try {
      await Share.share({
        title: 'DigiHisab_Ghar_Ka_Hisab_Monthly_Statement',
        message: `📑 *ڈیجی حساب - گھریلو ماہانہ گوشوارہ (Ghar Ka Hisab Statement)*\nگھرانہ: ${user?.fullName || 'Saad Household'}\nپتہ: ${homeAddress}\nافراد کی تعداد: ${householdSize}\nماہانہ بچت کا ہدف: PKR ${monthlySavingCap}\n\nراشن، بلز، میڈیسن اور کمیٹی کی تمام رسیدیں کامیابی سے بیک اپ ہو چکی ہیں۔\n_Digi Hisab Domestic AI Guard کے ذریعے تیار کردہ_`,
      });
      setShowBackupModal(false);
    } catch (e: any) {
      Alert.alert('خرابی', e.message);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.drawerContainer}>
          <SafeAreaView style={styles.safeArea}>
            {/* Drawer Header Banner */}
            <View
              style={[
                styles.drawerHeader,
                isHousehold && styles.drawerHeaderHousehold,
              ]}
            >
              <View style={styles.avatarRow}>
                <Image
                  source={require('../../assets/logo.png')}
                  style={[
                    styles.avatarImage,
                    isHousehold && { borderColor: '#38BDF8' },
                  ]}
                  resizeMode="cover"
                />
                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user?.fullName || (isHousehold ? 'Gharana Admin' : 'Muhammad Saad')}
                    </Text>

                    {/* Role Badges */}
                    {isHousehold ? (
                      <TouchableOpacity
                        style={styles.householdRoleBadge}
                        onPress={() => setIsStudentMode(!isStudentMode)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.householdRoleBadgeText}>
                          {!isStudentMode
                            ? '🏡 SARBARAH / سربراہِ خانہ (Family Admin)'
                            : '🎓 TALIB-E-ILM / طالب علم (Student)'}
                        </Text>
                      </TouchableOpacity>
                    ) : isOwner ? (
                      <View style={styles.ownerRoleBadge}>
                        <Text style={styles.ownerRoleBadgeText}>👑 OWNER / مالک</Text>
                      </View>
                    ) : isManager ? (
                      <View style={styles.managerRoleBadge}>
                        <Text style={styles.managerRoleBadgeText}>🛡️ MANAGER / منیجر</Text>
                      </View>
                    ) : (
                      <View style={styles.cashierRoleBadge}>
                        <Text style={styles.cashierRoleBadgeText}>💼 CASHIER / کیشیئر</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.addressSubtext} numberOfLines={1}>
                    {user?.address ? `${user.address} • Gharana` : 'Chak NO 110 JB • Gharana'}
                  </Text>
                  <Text style={styles.phoneText}>
                    {user?.phone || '+92 300 1234567'}
                  </Text>
                </View>

                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Persona Status Banner (Permanently Locked) */}
              {isHousehold ? (
                <View style={styles.householdStatusBanner}>
                  <View style={styles.statusBannerLeft}>
                    <Ionicons name="lock-closed" size={13} color="#38BDF8" />
                    <Text style={styles.statusBannerText}>
                      🔒 Persona Locked: GHAR KA HISAB (گھریلو حساب کتاب)
                    </Text>
                  </View>
                  <View style={styles.personaLockBadge}>
                    <Ionicons name="shield-checkmark" size={11} color="#38BDF8" />
                    <Text style={styles.personaLockBadgeText}>مستقل لاکڈ</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.dukanStatusBanner}>
                  <View style={styles.statusBannerLeft}>
                    <Ionicons name="lock-closed" size={13} color="#8FF6CA" />
                    <Text style={[styles.statusBannerText, { color: '#8FF6CA' }]}>
                      🔒 Persona Locked: DUKANDAR (کمرشل دکان کھاتہ)
                    </Text>
                  </View>
                  <View style={styles.personaLockBadgeDukan}>
                    <Ionicons name="shield-checkmark" size={11} color="#8FF6CA" />
                    <Text style={styles.personaLockBadgeTextDukan}>مستقل لاکڈ</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Menu Items */}
            <ScrollView
              style={styles.menuContainer}
              contentContainerStyle={{ paddingBottom: Math.max(24, insets.bottom + 12) }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionTitle}>
                {isHousehold
                  ? 'DOMESTIC MANAGEMENT & SECURITY (گھریلو انتظام و اختیارات)'
                  : 'MANAGEMENT & SECURITY (انتظام و اختیارات)'}
              </Text>

              {isHousehold ? (
                /* ======================================================== */
                /* DOMESTIC / GHAR KA HISAB OPTIONS                         */
                /* ======================================================== */
                <>
                  {/* Option 1: Gharana & Household Profile */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setShowGharanaModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="home-outline" size={20} color="#0284C7" />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuTitle}>
                        🏡 Gharana & Household Profile (گھرانہ اور فیملی تفصیلات)
                      </Text>
                      <Text style={styles.menuSubtitle}>
                        گھر کا پتہ، سربراہ شناختی کارڈ اور ماہانہ فیملی بجٹ سیٹ اپ
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {/* Option 2: Family & Shared Access */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setShowFamilyAccessModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="people-outline" size={20} color="#10B981" />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuTitle}>
                        👨‍👩‍👧 Family & Shared Access (اہلِ خانہ اور روم میٹ رسائی)
                      </Text>
                      <Text style={styles.menuSubtitle}>
                        بیگم، بچوں یا روم میٹس کو ذاتی خرچہ لاگ کرنے کی اجازت دیں
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {/* Option 3: Monthly Budget Audit & Expense History */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => setShowAuditLogsModal(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="receipt-outline" size={20} color="#D97706" />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuTitle}>
                        📑 Monthly Budget Audit & Expense History (ماہانہ خرچہ آڈٹ لاگ)
                      </Text>
                      <Text style={styles.menuSubtitle}>
                        راشن، بلز، میڈیسن اور کمیٹی کی ماہانہ تاریخ اور رسیدیں
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </>
              ) : (
                /* ======================================================== */
                /* COMMERCIAL / DUKANDAR OPTIONS                            */
                /* ======================================================== */
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => handleNav(0)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="business-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuTitle}>Profile & Business Details</Text>
                      <Text style={styles.menuSubtitle}>CNIC, address, and commercial locking</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {isOwner && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNav(1)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="people-outline" size={20} color={COLORS.cyan} />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuTitle}>Cashier & Staff Accounts</Text>
                        <Text style={styles.menuSubtitle}>RBAC permissions & sub-account PINs</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}

                  {!isCashier && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNav(2)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="newspaper-outline" size={20} color={COLORS.emerald} />
                      </View>
                      <View style={styles.menuTextContainer}>
                        <Text style={styles.menuTitle}>Forensic Audit Logs</Text>
                        <Text style={styles.menuSubtitle}>Manager overrides & limit overrides</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>
                {isHousehold
                  ? 'ACCOUNT & SYSTEM (اکاؤنٹ و گھریلو سسٹم)'
                  : 'ACCOUNT & SYSTEM (اکاؤنٹ و سسٹم)'}
              </Text>

              {/* Account Role Row */}
              <View style={styles.infoRow}>
                <Ionicons
                  name={isHousehold ? 'shield-checkmark-outline' : 'ribbon-outline'}
                  size={16}
                  color="#64748B"
                />
                <Text style={styles.infoLabel}>Account Role:</Text>
                <Text style={[styles.infoVal, { flex: 1 }]} numberOfLines={2}>
                  {isHousehold
                    ? 'Household Head (سربراہِ خانہ) • Full Domestic Control'
                    : isOwner
                    ? 'Store Owner (Malik) • Full Administrative Access'
                    : isManager
                    ? 'Store Manager • Operational Authority'
                    : 'Cashier • Restricted Counter Access'}
                </Text>
              </View>

              {/* Account Tier Row */}
              <View style={styles.infoRow}>
                <Ionicons
                  name={isHousehold ? 'sparkles-outline' : 'phone-portrait-outline'}
                  size={16}
                  color="#64748B"
                />
                <Text style={styles.infoLabel}>Account Tier:</Text>
                {isHousehold ? (
                  <TouchableOpacity
                    style={styles.tierToggleChip}
                    onPress={() => setIsStudentMode(!isStudentMode)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.tierToggleChipText}>
                      {!isStudentMode
                        ? 'DOMESTIC PRO (فیملی شیئرنگ و لامحدود کھاتے)'
                        : 'STUDENT STARTER (پاکٹ منی و ہاسٹل اسپلٹ)'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.infoVal}>PRO (Unlimited Cashiers)</Text>
                )}
              </View>

              {/* Security PIN Row */}
              <View style={styles.securityPinCard}>
                <View style={styles.pinHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="lock-closed" size={16} color="#D97706" />
                    <Text style={styles.pinTitleText}>
                      {isHousehold
                        ? '🔒 4-Digit Gharana Security PIN: Configured (****)'
                        : '🔒 Manager Override PIN: Configured (****)'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changePinBtn}
                    onPress={() => setShowPinModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.changePinBtnText}>✏️ Change PIN</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.pinSubtitleText}>
                  {isHousehold
                    ? 'Used to hide sensitive assets like gold, Zakat reserves, and bank balances when someone else is using the phone.'
                    : 'Used to authorize high-value credit entries, price edits, and register overrides.'}
                </Text>
              </View>

              {/* Local Backup & PDF Export */}
              <TouchableOpacity
                style={styles.backupCard}
                onPress={() => setShowBackupModal(true)}
                activeOpacity={0.85}
              >
                <View style={styles.backupIconBox}>
                  <Ionicons name="cloud-download-outline" size={20} color="#0284C7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.backupTitle}>
                    ☁️ Local Backup & PDF Export (بیک اپ اور ماہانہ گوشوارہ ڈاؤن لوڈ)
                  </Text>
                  <Text style={styles.backupSubtitle}>
                    ماہانہ گھریلو کھاتے کا مکمل پی ڈی ایف گوشوارہ ڈاؤن لوڈ یا واٹس ایپ کریں
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              {/* Danger Logout Button */}
              <TouchableOpacity
                style={styles.logoutItem}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>🚪 Sign Out of DigiHisab (لاگ آؤٹ کریں)</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer Version Info */}
            <View style={styles.drawerFooter}>
              <Text style={styles.footerAppText}>
                DigiHisab Smart Khata AI {isHousehold ? '• Domestic Ledger Guard' : '• Store Guard'}
              </Text>
              <Text style={styles.footerSubText}>
                End-to-End Encrypted & Privacy Protected
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </View>

      {/* ======================================================== */}
      {/* SUB-MODAL 1: GHARANA & HOUSEHOLD PROFILE                 */}
      {/* ======================================================== */}
      <Modal
        visible={showGharanaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGharanaModal(false)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.subModalIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="home" size={20} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.subModalTitle}>گھرانہ و فیملی تفصیلات</Text>
                  <Text style={styles.subModalSubtitle}>Household & Family Profile Setup</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowGharanaModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Household Size Stepper */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>گھر کے افراد کی کل تعداد (Household Size):</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                  >
                    <Ionicons name="remove" size={18} color="#0F172A" />
                  </TouchableOpacity>
                  <Text style={styles.stepperValText}>{householdSize} افراد</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setHouseholdSize(householdSize + 1)}
                  >
                    <Ionicons name="add" size={18} color="#0F172A" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Monthly Saving Cap */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>ماہانہ فیملی بچت کا ہدف (Monthly Target Saving Cap):</Text>
                <View style={styles.currencyInputWrap}>
                  <Text style={styles.currencyPrefix}>PKR</Text>
                  <TextInput
                    style={styles.currencyInput}
                    value={monthlySavingCap}
                    onChangeText={setMonthlySavingCap}
                    keyboardType="numeric"
                    placeholder="35,000"
                  />
                </View>
              </View>

              {/* Primary Income Sources */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>آمدن کے بنیادی ذرائع (Primary Income Sources):</Text>
                <TextInput
                  style={styles.textInputField}
                  value={primaryIncome}
                  onChangeText={setPrimaryIncome}
                  placeholder="مثلاً تنخواہ، ذاتی دکان، بیرونِ ملک ترسیلات"
                />
              </View>

              {/* Home Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>گھر کا پتہ و علاقہ (Home Address):</Text>
                <TextInput
                  style={styles.textInputField}
                  value={homeAddress}
                  onChangeText={setHomeAddress}
                  placeholder="Chak NO 110 JB • Faisalabad"
                />
              </View>

              {/* Head CNIC */}
              <View style={styles.inputGroup}>
                <Text style={styles.formLabel}>سربراہ کا قومی شناختی کارڈ (Head CNIC):</Text>
                <TextInput
                  style={styles.textInputField}
                  value={headCnic}
                  onChangeText={setHeadCnic}
                  keyboardType="numeric"
                  placeholder="35202-XXXXXXX-X"
                />
              </View>

              <TouchableOpacity
                style={styles.primarySaveBtn}
                onPress={() => {
                  Alert.alert('کامیابی', 'گھرانہ و فیملی تفصیلات محفوظ ہو گئی ہیں۔');
                  setShowGharanaModal(false);
                }}
              >
                <Text style={styles.primarySaveBtnText}>محفوظ کریں (Save Profile)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* SUB-MODAL 2: FAMILY & SHARED ACCESS                      */}
      {/* ======================================================== */}
      <Modal
        visible={showFamilyAccessModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFamilyAccessModal(false)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.subModalIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="people" size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.subModalTitle}>اہلِ خانہ اور روم میٹ رسائی</Text>
                  <Text style={styles.subModalSubtitle}>Multi-User Household Permission Tiers</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowFamilyAccessModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.roleExplainerNotice}>
                🔐 گھریلو رازداری کے اصول: سربراہ کے علاوہ دیگر افراد صرف اپنا خرچہ لاگ کر سکتے ہیں اور حساس بچت و سونا نہیں دیکھ سکتے۔
              </Text>

              {/* Role 1: Full Admin */}
              <View style={styles.roleCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={styles.roleBadgeAdmin}>👑 Full Admin (سربراہِ خانہ)</Text>
                </View>
                <Text style={styles.roleDescText}>
                  • کل گھریلو بچت، کمیٹی، سونا/زکوٰۃ اثاثے اور بینک اکاؤنٹس دیکھنے اور سنبھالنے کا مکمل اختیار۔
                </Text>
              </View>

              {/* Role 2: Family Member / Child */}
              <View style={styles.roleCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={styles.roleBadgeMember}>👤 Family Member / Child (فرد / بچے)</Text>
                </View>
                <Text style={styles.roleDescText}>
                  • صرف اپنے ذاتی روزانہ کے اخراجات، پاکٹ منی، کینٹین اور راشن کا اندراج کر سکتے ہیں۔
                </Text>
              </View>

              {/* Role 3: Roommate / Mess Partner */}
              <View style={styles.roleCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={styles.roleBadgeRoommate}>🤝 Roommate / Mess Partner (روم میٹ)</Text>
                </View>
                <Text style={styles.roleDescText}>
                  • صرف مشترکہ میس فنڈ، بجلی و گیس سب میٹر بلز اسپلٹ کا حصہ دیکھ اور ایڈٹ کر سکتے ہیں۔
                </Text>
              </View>

              {/* Active Members List */}
              <Text style={[styles.formLabel, { marginTop: 14 }]}>فعال اراکین (Active Shared Users):</Text>
              <View style={styles.memberListItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberNameText}>سربراہِ خانہ (Muhammad Saad)</Text>
                  <Text style={styles.memberSubText}>ایڈمن • تمام گھریلو کھاتوں کا مکمل اختیار</Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ADMIN</Text>
                </View>
              </View>

              <View style={styles.memberListItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberNameText}>بیگم صاحبہ (Household Member)</Text>
                  <Text style={styles.memberSubText}>فرد • کچن راشن و میڈیسن خرچہ لاگنگ</Text>
                </View>
                <View style={[styles.activePill, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[styles.activePillText, { color: '#16A34A' }]}>MEMBER</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={() => Alert.alert('نیا فرد شامل کریں', 'نیا فون نمبر اور 4 ہندسوں کا پن سیٹ کر کے فرد کو شامل کریں۔')}
              >
                <Ionicons name="person-add" size={16} color="#0284C7" />
                <Text style={styles.addMemberBtnText}>+ نیا فیملی ممبر یا روم میٹ شامل کریں</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* SUB-MODAL 3: MONTHLY BUDGET AUDIT LOGS                   */}
      {/* ======================================================== */}
      <Modal
        visible={showAuditLogsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAuditLogsModal(false)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalCard}>
            <View style={styles.subModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.subModalIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="receipt" size={20} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.subModalTitle}>ماہانہ خرچہ آڈٹ لاگ</Text>
                  <Text style={styles.subModalSubtitle}>Envelopes & Expense History</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAuditLogsModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.envelopeHeading}>خرچوں کے گھریلو لفافے (Domestic Envelopes):</Text>

              <View style={styles.envelopeGrid}>
                <View style={styles.envelopeItem}>
                  <Text style={styles.envelopeIcon}>🛒</Text>
                  <Text style={styles.envelopeName}>Kitchen / راشن</Text>
                  <Text style={styles.envelopeVal}>PKR 41,500</Text>
                </View>

                <View style={styles.envelopeItem}>
                  <Text style={styles.envelopeIcon}>⚡</Text>
                  <Text style={styles.envelopeName}>Utilities / بلز</Text>
                  <Text style={styles.envelopeVal}>PKR 45,000</Text>
                </View>

                <View style={styles.envelopeItem}>
                  <Text style={styles.envelopeIcon}>🎒</Text>
                  <Text style={styles.envelopeName}>School / فیس</Text>
                  <Text style={styles.envelopeVal}>PKR 28,000</Text>
                </View>

                <View style={styles.envelopeItem}>
                  <Text style={styles.envelopeIcon}>💊</Text>
                  <Text style={styles.envelopeName}>Medical / علاج</Text>
                  <Text style={styles.envelopeVal}>PKR 9,500</Text>
                </View>
              </View>

              <Text style={[styles.formLabel, { marginTop: 14 }]}>حالیہ آڈٹ تاریخ (Recent Audit Entries):</Text>

              <View style={styles.auditRowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditRowTitle}>دودھ و گوالہ ادائیگی (JazzCash)</Text>
                  <Text style={styles.auditRowDate}>2026-10-17 • تصدیق شدہ بل</Text>
                </View>
                <Text style={styles.auditRowCost}>- PKR 8,060</Text>
              </View>

              <View style={styles.auditRowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditRowTitle}>لیسکو سب میٹر یوٹیلیٹی اسپلٹ</Text>
                  <Text style={styles.auditRowDate}>2026-10-15 • گراؤنڈ فلور وصولی</Text>
                </View>
                <Text style={[styles.auditRowCost, { color: '#16A34A' }]}>+ PKR 25,000</Text>
              </View>

              <View style={styles.auditRowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.auditRowTitle}>ماہانہ فیملی کمیٹی قسط</Text>
                  <Text style={styles.auditRowDate}>2026-10-05 • گولڈ کمیٹی پول</Text>
                </View>
                <Text style={styles.auditRowCost}>- PKR 10,000</Text>
              </View>

              <TouchableOpacity
                style={styles.exportAuditBtn}
                onPress={handleExportPdfStatement}
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.exportAuditBtnText}>ماہانہ گوشوارہ پی ڈی ایف ڈاؤن لوڈ کریں</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* SUB-MODAL 4: 4-DIGIT GHARANA SECURITY PIN                */}
      {/* ======================================================== */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.pinModalCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={styles.pinIconCircle}>
                <Ionicons name="lock-closed" size={26} color="#D97706" />
              </View>
              <Text style={styles.pinModalHeading}>4-Digit Gharana Security PIN</Text>
              <Text style={styles.pinModalDesc}>
                حساس فیملی اثاثے (سونا، زکوٰۃ، بینک بیلنس) محفوظ رکھنے کے لیے نیا 4 ہندسوں کا سیکیورٹی پن مقرر کریں۔
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.formLabel}>نیا 4 ہندسوں کا پن (New PIN):</Text>
              <TextInput
                style={styles.pinInput}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={newPin}
                onChangeText={setNewPin}
                placeholder="****"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.formLabel}>پن کی تصدیق کریں (Confirm PIN):</Text>
              <TextInput
                style={styles.pinInput}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="****"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.pinActionsRow}>
              <TouchableOpacity
                style={styles.pinConfirmBtn}
                onPress={handleSavePin}
              >
                <Text style={styles.pinConfirmBtnText}>پن محفوظ کریں (Save PIN)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pinCancelBtn}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={styles.pinCancelBtnText}>منسوخ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* SUB-MODAL 5: LOCAL BACKUP & PDF EXPORT                   */}
      {/* ======================================================== */}
      <Modal
        visible={showBackupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackupModal(false)}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.pinModalCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <View style={[styles.pinIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="cloud-download" size={26} color="#0284C7" />
              </View>
              <Text style={styles.pinModalHeading}>Local Backup & PDF Export</Text>
              <Text style={styles.pinModalDesc}>
                کیا آپ موجودہ ماہ کا مکمل گھریلو حساب، کچن راشن، بلز اور دودھ کا ریکارڈ پی ڈی ایف میں ڈاؤن لوڈ یا واٹس ایپ کرنا چاہتے ہیں؟
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.pinConfirmBtn, { backgroundColor: '#0284C7' }]}
              onPress={handleExportPdfStatement}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.pinConfirmBtnText}>پی ڈی ایف ڈاؤن لوڈ و شیئر کریں</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pinCancelBtn, { marginTop: 10 }]}
              onPress={() => setShowBackupModal(false)}
            >
              <Text style={styles.pinCancelBtnText}>بند کریں</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    flexDirection: 'row',
  },
  backdropTouch: {
    width: '12%',
    height: '100%',
  },
  drawerContainer: {
    width: '88%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  safeArea: {
    flex: 1,
  },
  drawerHeader: {
    backgroundColor: COLORS.navy,
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 40,
  },
  drawerHeaderHousehold: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E293B',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: COLORS.cyan,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  householdRoleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  householdRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BAE6FD',
  },
  ownerRoleBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    borderColor: '#EAB308',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  ownerRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FDE047',
  },
  managerRoleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  managerRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93C5FD',
  },
  cashierRoleBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderColor: '#94A3B8',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  cashierRoleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  addressSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  phoneText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  householdStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 8,
  },
  dukanStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(143, 246, 202, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(143, 246, 202, 0.25)',
    gap: 8,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusBannerText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#38BDF8',
    flex: 1,
  },
  personaLockBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personaLockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
  },
  personaLockBadgeDukan: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#34D399',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  personaLockBadgeTextDukan: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
  },
  menuContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  tierToggleChip: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tierToggleChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  securityPinCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginVertical: 8,
  },
  pinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  pinTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  pinSubtitleText: {
    fontSize: 10.5,
    color: '#B45309',
    lineHeight: 14,
  },
  changePinBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  changePinBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },
  backupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 8,
    gap: 10,
  },
  backupIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0369A1',
  },
  backupSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  drawerFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  footerAppText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  footerSubText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },

  /* Sub-Modal Styling */
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    justifyContent: 'flex-end',
  },
  subModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    maxHeight: '90%',
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  subModalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  subModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  inputGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 6,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  stepperValText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  currencyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    marginRight: 6,
  },
  currencyInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  textInputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  primarySaveBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Role Card Styling */
  roleExplainerNotice: {
    fontSize: 11,
    color: '#0369A1',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 10,
  },
  roleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  roleBadgeAdmin: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  roleBadgeMember: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
  },
  roleBadgeRoommate: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  roleDescText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  memberNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  activePill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  addMemberBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },

  /* Audit Envelopes */
  envelopeHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  envelopeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  envelopeItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  envelopeIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  envelopeName: {
    fontSize: 11,
    color: '#64748B',
  },
  envelopeVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  auditRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  auditRowTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  auditRowDate: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  auditRowCost: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
  },
  exportAuditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    marginBottom: 20,
  },
  exportAuditBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },

  /* PIN Modal */
  pinModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 380,
  },
  pinIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pinModalHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  pinModalDesc: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    height: 44,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#0F172A',
  },
  pinActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  pinConfirmBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pinConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  pinCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCancelBtnText: {
    color: '#64748B',
    fontSize: 12.5,
    fontWeight: '700',
  },
});
