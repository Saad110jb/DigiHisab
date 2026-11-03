import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts/legacy';
import { COLORS } from '../theme/colors';
import { counterpartyApi, ICounterparty } from '../api/counterparty.api';

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: ICounterparty) => void;
}

const CREDIT_PRESETS = [5000, 10000, 25000, 50000];
const RETURN_CYCLE_PRESETS = [
  { label: '7 Din', days: 7 },
  { label: '15 Din', days: 15 },
  { label: '30 Din (Pehli Tareekh)', days: 30 },
];

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cnic, setCnic] = useState('');
  const [creditLimit, setCreditLimit] = useState('10000');
  const [defaultReturnDays, setDefaultReturnDays] = useState(7);
  const [isCreditBlocked, setIsCreditBlocked] = useState(false);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPhonebookPicker, setShowPhonebookPicker] = useState(false);
  const [contactsList, setContactsList] = useState<Array<{ name: string; phone: string; address?: string }>>([]);
  const [contactPermissionDenied, setContactPermissionDenied] = useState(false);
  const [searchContactQuery, setSearchContactQuery] = useState('');

  const handleImportFromContacts = async () => {
    try {
      setContactPermissionDenied(false);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });
        if (data && data.length > 0) {
          const parsed = data
            .filter((c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
            .map((c) => {
              const raw = c.phoneNumbers![0].number || '';
              const clean = raw.replace(/[^0-9+]/g, '');
              return {
                name: c.name,
                phone: clean,
              };
            });
          if (parsed.length > 0) {
            setContactsList(parsed);
            setShowPhonebookPicker(true);
          } else {
            Alert.alert('Phonebook Empty', 'آپ کے موبائل میں کوئی محفوظ کانٹیکٹ نہیں ملا۔ تفصیلات دستی درج کریں۔');
          }
        } else {
          Alert.alert('Phonebook Empty', 'آپ کے موبائل میں کوئی محفوظ کانٹیکٹ نہیں ملا۔ تفصیلات دستی درج کریں۔');
        }
      } else {
        setContactPermissionDenied(true);
      }
    } catch (err) {
      setContactPermissionDenied(true);
    }
  };

  // Format CNIC as XXXXX-XXXXXXX-X
  const handleCnicChange = (text: string) => {
    const raw = text.replace(/[^0-9]/g, '').slice(0, 13);
    if (raw.length <= 5) {
      setCnic(raw);
    } else if (raw.length <= 12) {
      setCnic(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    } else {
      setCnic(`${raw.slice(0, 5)}-${raw.slice(5, 12)}-${raw.slice(12, 13)}`);
    }
  };

  // Format Pakistani Mobile Number
  const handlePhoneChange = (text: string) => {
    const raw = text.replace(/[^0-9+]/g, '');
    setPhone(raw);
  };

  const handleSelectFromPhonebook = (contact: { name: string; phone: string; address?: string }) => {
    setName(contact.name);
    setPhone(contact.phone);
    if (contact.address) setAddress(contact.address);
    setShowPhonebookPicker(false);
    setErrorMsg(null);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setCnic('');
    setCreditLimit('10000');
    setDefaultReturnDays(7);
    setIsCreditBlocked(false);
    setNotes('');
    setErrorMsg(null);
    setShowPhonebookPicker(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Gahak ka naam darj karna zaroori hai (Name is required).');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Mobile number darj karna zaroori hai (Phone is required).');
      return;
    }

    if (cnic.trim()) {
      const cnicDigits = cnic.replace(/[^0-9]/g, '');
      if (cnicDigits.length !== 13) {
        setErrorMsg('Pakistani CNIC 13 hindson par mushtamil hona chahiye (13 digits required).');
        return;
      }
    }

    const limitNum = parseFloat(creditLimit) || 5000;

    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await counterpartyApi.create({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        cnic: cnic.trim() || undefined,
        relationType: 'CUSTOMER',
        creditLimit: limitNum,
        defaultReturnDays,
        isCreditBlocked,
        notes: notes.trim() || undefined,
      });

      if (response.success && response.data) {
        onSuccess(response.data);
        resetForm();
        onClose();
      } else {
        setErrorMsg(response.message || 'Khata banane mein masla paish aya.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.message || 'Khata save karne mein nakami hui.';
      setErrorMsg(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="person-add" size={20} color="#006C4E" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Naya Gahak Shamil Karein</Text>
                <Text style={styles.modalUrduTitle}>نیا صارف کھاتہ اور حدِ ادھار</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Phonebook Import Shortcut */}
          <TouchableOpacity
            style={styles.phonebookBtn}
            onPress={handleImportFromContacts}
            activeOpacity={0.8}
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#006C4E" />
            <Text style={styles.phonebookBtnText}>
              📱 Phonebook se Contact Muntakhib Karein (One-Tap Import)
            </Text>
          </TouchableOpacity>

          {/* Contact Permission Denied Fallback Banner */}
          {contactPermissionDenied && (
            <View style={{ backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1, borderRadius: 10, padding: 10, marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="alert-circle-outline" size={20} color="#E11D48" />
              <Text style={{ flex: 1, fontSize: 11, color: '#9F1239', fontWeight: '600' }}>
                Permission required to access contacts. Enter details manually (کونٹیکٹس تک رسائی کی اجازت درکار ہے).
              </Text>
            </View>
          )}

          {/* Phonebook Contacts Selection Drawer */}
          {showPhonebookPicker && (
            <View style={styles.phonebookDrawer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.phonebookDrawerTitle}>Select Contact ({contactsList.length}):</Text>
                <TouchableOpacity onPress={() => setShowPhonebookPicker(false)}>
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={{ backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, height: 36, fontSize: 12, marginBottom: 8 }}
                placeholder="Search contact name or number..."
                placeholderTextColor="#94A3B8"
                value={searchContactQuery}
                onChangeText={setSearchContactQuery}
              />

              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={true}>
                {contactsList
                  .filter((c) =>
                    !searchContactQuery ||
                    c.name.toLowerCase().includes(searchContactQuery.toLowerCase()) ||
                    c.phone.includes(searchContactQuery)
                  ).length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#64748B', fontSize: 12, paddingVertical: 14 }}>
                      کوئی کانٹیکٹ نہیں ملا (No contacts found)
                    </Text>
                  ) : (
                    contactsList
                      .filter((c) =>
                        !searchContactQuery ||
                        c.name.toLowerCase().includes(searchContactQuery.toLowerCase()) ||
                        c.phone.includes(searchContactQuery)
                      )
                      .slice(0, 30)
                      .map((item, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.phonebookItem}
                          onPress={() => handleSelectFromPhonebook(item)}
                        >
                          <View style={styles.contactAvatar}>
                            <Text style={styles.contactAvatarText}>{item.name ? item.name[0].toUpperCase() : '?'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.contactName}>{item.name}</Text>
                            <Text style={styles.contactPhone}>{item.phone} {item.address ? `• ${item.address}` : ''}</Text>
                          </View>
                          <Ionicons name="checkmark-circle-outline" size={20} color="#108A65" />
                        </TouchableOpacity>
                      ))
                  )}
              </ScrollView>
            </View>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#E11D48" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* 1. Customer Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Gahak Ka Naam (نام) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputField}>
                <Ionicons name="person-outline" size={18} color="#64748B" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Tariq Mehmood / طارق محمود"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setErrorMsg(null);
                  }}
                />
              </View>
            </View>

            {/* 2. Mobile Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Mobile Number (موبائل نمبر) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.inputField}>
                <View style={styles.flagBox}>
                  <Text style={styles.flagEmoji}>🇵🇰</Text>
                  <Text style={styles.codeText}>+92</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="0300 1234567"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={handlePhoneChange}
                />
              </View>
            </View>

            {/* 3. Address / Mohallah */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pata / Mohallah (پتہ / محلہ)</Text>
              <View style={styles.inputField}>
                <Ionicons name="location-outline" size={18} color="#64748B" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Gali # 4, Mohallah Farooqia, Lahore"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* 4. Pakistani CNIC (Optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Pakistani CNIC (شناختی کارڈ نمبر)</Text>
                <Text style={styles.optionalBadge}>Ikhtiyari (Optional)</Text>
              </View>
              <View style={styles.inputField}>
                <Ionicons name="card-outline" size={18} color="#64748B" style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="XXXXX-XXXXXXX-X (13 digits)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  maxLength={15}
                  value={cnic}
                  onChangeText={handleCnicChange}
                />
              </View>
            </View>

            {/* 5. Hard & Soft Credit Limit (حدِ ادھار) */}
            <View style={styles.creditGovernanceBox}>
              <View style={styles.creditGovHeader}>
                <View style={styles.govTitleRow}>
                  <Ionicons name="shield-checkmark" size={18} color="#006C4E" />
                  <Text style={styles.govTitle}>حدِ ادھار (Credit Ceiling Governance)</Text>
                </View>
                <Text style={styles.govSubtitle}>
                  Is limit se zyada udhaar par app fori warning degi
                </Text>
              </View>

              {/* Limit Presets */}
              <View style={styles.presetsRow}>
                {CREDIT_PRESETS.map((preset) => {
                  const isSelected = creditLimit === String(preset);
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => setCreditLimit(String(preset))}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        Rs. {(preset / 1000)}k
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Credit Limit Input */}
              <View style={[styles.inputField, { marginTop: 10 }]}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Custom Credit Limit"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                />
              </View>
            </View>

            {/* 6. Agreed Return Cycle (وعدے کی مدت) */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mamool Ki Adaigi Ka Waqt (Default Repayment Cycle)</Text>
              <View style={styles.returnCycleRow}>
                {RETURN_CYCLE_PRESETS.map((item) => {
                  const isSelected = defaultReturnDays === item.days;
                  return (
                    <TouchableOpacity
                      key={item.days}
                      style={[styles.cycleBtn, isSelected && styles.cycleBtnActive]}
                      onPress={() => setDefaultReturnDays(item.days)}
                    >
                      <Text style={[styles.cycleBtnText, isSelected && styles.cycleBtnTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 7. Hard Credit Lock Switch (ادھار پر فوری پابندی) */}
            <View style={styles.lockRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={styles.lockTitleRow}>
                  <Ionicons name="lock-closed" size={16} color={isCreditBlocked ? '#E11D48' : '#64748B'} />
                  <Text style={[styles.lockTitle, isCreditBlocked && { color: '#E11D48' }]}>
                    Credit Lock (فوری ادھار بند رکھیں)
                  </Text>
                </View>
                <Text style={styles.lockSubtitle}>
                  Naye udhaar par bandish lagayein jab tak pichla hisab saaf na ho
                </Text>
              </View>
              <Switch
                value={isCreditBlocked}
                onValueChange={setIsCreditBlocked}
                trackColor={{ false: '#CBD5E1', true: '#FDA4AF' }}
                thumbColor={isCreditBlocked ? '#E11D48' : '#F1F5F9'}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Mansookh (Cancel)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#00201A" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#00201A" />
                  <Text style={styles.submitBtnText}>Khata Kholein (محفوظ کریں)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 34, 57, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B2239',
  },
  modalUrduTitle: {
    fontSize: 12,
    color: '#006C4E',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  phonebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  phonebookBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006C4E',
  },
  phonebookDrawer: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  phonebookDrawerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  phonebookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    gap: 10,
  },
  contactAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0B2239',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  contactName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B2239',
  },
  contactPhone: {
    fontSize: 11,
    color: '#64748B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#E11D48',
    fontWeight: '600',
    flex: 1,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: 460,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#E11D48',
  },
  optionalBadge: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  fieldIcon: {
    marginRight: 8,
  },
  flagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
    marginRight: 8,
    gap: 4,
  },
  flagEmoji: {
    fontSize: 15,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B2239',
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006C4E',
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0B2239',
    fontWeight: '600',
  },
  creditGovernanceBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  creditGovHeader: {
    marginBottom: 10,
  },
  govTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  govTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#006C4E',
  },
  govSubtitle: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#86EFAC',
    alignItems: 'center',
  },
  presetChipActive: {
    backgroundColor: '#006C4E',
    borderColor: '#006C4E',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#006C4E',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  returnCycleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cycleBtnActive: {
    backgroundColor: '#0B2239',
    borderColor: '#0B2239',
  },
  cycleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  cycleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  lockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  lockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },
  lockSubtitle: {
    fontSize: 11,
    color: '#B45309',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00D2B4',
    gap: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#00D2B4',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00201A',
  },
});
