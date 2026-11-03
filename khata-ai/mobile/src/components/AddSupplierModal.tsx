import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import {
  counterpartyApi,
  ICounterparty,
  SupplierCategory,
  TradeCreditTermType,
} from '../api/counterparty.api';

interface AddSupplierModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (supplier: ICounterparty) => void;
  initialData?: ICounterparty | null;
}

const SUPPLIER_CATEGORIES: { label: string; value: SupplierCategory; icon: string; urdu: string }[] = [
  { label: 'FMCG Distributor', value: 'FMCG_DISTRIBUTOR', icon: 'cart-outline', urdu: 'ایف ایم سی جی تقسیم کار' },
  { label: 'Mandi Supplier', value: 'MANDI_SUPPLIER', icon: 'leaf-outline', urdu: 'منڈی سپلائر' },
  { label: 'Dairy Vendor', value: 'DAIRY_VENDOR', icon: 'nutrition-outline', urdu: 'ڈیری سپلائر' },
  { label: 'Local Vendor', value: 'LOCAL_VENDOR', icon: 'storefront-outline', urdu: 'لوکل وینڈر' },
  { label: 'General Wholesaler', value: 'GENERAL_WHOLESALER', icon: 'business-outline', urdu: 'جنرل ہول سیلر' },
];

const CREDIT_TERMS: { label: string; value: TradeCreditTermType; days: number; note: string }[] = [
  { label: 'Net-7 (Haftawar)', value: 'NET_7', days: 7, note: '7 days settlement' },
  { label: 'Net-15 (Pakhwada)', value: 'NET_15', days: 15, note: '15 days settlement' },
  { label: 'Net-30 (Mahana)', value: 'NET_30', days: 30, note: '30 days monthly billing' },
  { label: 'Weekly Mandi', value: 'WEEKLY_MANDI', days: 7, note: 'Every Mandi Day (Juma/Somwar)' },
  { label: 'Custom', value: 'CUSTOM', days: 14, note: 'Custom settlement period' },
];

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [supplierCategory, setSupplierCategory] = useState<SupplierCategory>('FMCG_DISTRIBUTOR');
  
  // Credit terms
  const [creditTermType, setCreditTermType] = useState<TradeCreditTermType>('NET_7');
  const [customDays, setCustomDays] = useState('7');
  const [settlementNote, setSettlementNote] = useState('');

  // Delivery rep info
  const [repName, setRepName] = useState('');
  const [repPhone, setRepPhone] = useState('');

  // Company bank details
  const [bankName, setBankName] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setAddress(initialData.address || '');
      setSupplierCategory(initialData.supplierCategory || 'FMCG_DISTRIBUTOR');
      
      if (initialData.tradeCreditTerms) {
        setCreditTermType(initialData.tradeCreditTerms.termType || 'NET_7');
        setCustomDays(String(initialData.tradeCreditTerms.creditPeriodDays || 7));
        setSettlementNote(initialData.tradeCreditTerms.settlementScheduleNote || '');
      }

      if (initialData.deliveryRep) {
        setRepName(initialData.deliveryRep.name || '');
        setRepPhone(initialData.deliveryRep.phone || '');
      }

      if (initialData.companyBankDetails) {
        setBankName(initialData.companyBankDetails.bankName || '');
        setAccountTitle(initialData.companyBankDetails.accountTitle || '');
        setAccountNumber(initialData.companyBankDetails.accountNumber || '');
        setIban(initialData.companyBankDetails.iban || '');
      }

      setNotes(initialData.notes || '');
    } else {
      resetForm();
    }
  }, [initialData, visible]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setSupplierCategory('FMCG_DISTRIBUTOR');
    setCreditTermType('NET_7');
    setCustomDays('7');
    setSettlementNote('');
    setRepName('');
    setRepPhone('');
    setBankName('');
    setAccountTitle('');
    setAccountNumber('');
    setIban('');
    setNotes('');
    setErrorMsg(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Supplier ka naam darj karna zaroori hai (Supplier name required).');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Sutrabaz / Mobile number darj karein (Phone number required).');
      return;
    }

    const selectedTerm = CREDIT_TERMS.find((t) => t.value === creditTermType);
    const periodDays = creditTermType === 'CUSTOM'
      ? (parseInt(customDays, 10) || 7)
      : (selectedTerm?.days || 7);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      relationType: 'SUPPLIER' as const,
      supplierCategory,
      tradeCreditTerms: {
        termType: creditTermType,
        creditPeriodDays: periodDays,
        settlementScheduleNote: settlementNote.trim() || undefined,
      },
      deliveryRep: (repName.trim() || repPhone.trim()) ? {
        name: repName.trim() || undefined,
        phone: repPhone.trim() || undefined,
      } : undefined,
      companyBankDetails: (bankName.trim() || accountNumber.trim() || accountTitle.trim() || iban.trim()) ? {
        bankName: bankName.trim() || undefined,
        accountTitle: accountTitle.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        iban: iban.trim() || undefined,
      } : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      setLoading(true);
      setErrorMsg(null);

      let response;
      if (initialData?._id) {
        response = await counterpartyApi.update(initialData._id, payload);
      } else {
        response = await counterpartyApi.create(payload);
      }

      if (response.success && response.data) {
        onSuccess(response.data);
        resetForm();
        onClose();
      } else {
        setErrorMsg((response as any).message || 'Supplier mahfooz karne mein nakami hui.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Supplier save karne mein masla aya.';
      setErrorMsg(msg);
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
                <Ionicons name="business" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {initialData ? 'Edit Supplier Profile' : 'Naya Supplier / Wholesale Shamil Karein'}
                </Text>
                <Text style={styles.modalUrduTitle}>منڈی و ہول سیل سپلائر ڈائریکٹری</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Basic Details Section */}
            <Text style={styles.sectionHeading}>🏢 Base Profile (سپلائر کی بنیادی معلومات)</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Company / Distributor Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="briefcase-outline" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Nestlé Wholesale / Master Foods"
                  value={name}
                  onChangeText={setName}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Main Contact / Mobile Number *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="0300-1234567"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Office / Mandi Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={18} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Grain Market, Shop 42, Faisalabad"
                  value={address}
                  onChangeText={setAddress}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            {/* Category Selector */}
            <Text style={styles.sectionHeading}>🏷️ Supplier Category (سپلائر کی قسم)</Text>
            <View style={styles.categoryGrid}>
              {SUPPLIER_CATEGORIES.map((cat) => {
                const isSelected = supplierCategory === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setSupplierCategory(cat.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? '#FFFFFF' : '#0284C7'}
                    />
                    <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Trade Credit Terms */}
            <Text style={styles.sectionHeading}>📜 Trade Credit Terms (ادھار کی شرائط)</Text>
            <View style={styles.termsContainer}>
              {CREDIT_TERMS.map((term) => {
                const isSelected = creditTermType === term.value;
                return (
                  <TouchableOpacity
                    key={term.value}
                    style={[styles.termRadioOption, isSelected && styles.termRadioOptionSelected]}
                    onPress={() => {
                      setCreditTermType(term.value);
                      if (term.value !== 'CUSTOM') {
                        setCustomDays(String(term.days));
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? '#0284C7' : '#94A3B8'}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.termLabel, isSelected && styles.termLabelSelected]}>
                        {term.label}
                      </Text>
                      <Text style={styles.termSubtext}>{term.note}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {creditTermType === 'CUSTOM' && (
                <View style={[styles.fieldGroup, { marginTop: 10 }]}>
                  <Text style={styles.label}>Custom Credit Period (Days)</Text>
                  <TextInput
                    style={styles.inputSimple}
                    keyboardType="number-pad"
                    value={customDays}
                    onChangeText={setCustomDays}
                    placeholder="Days (e.g. 10)"
                  />
                </View>
              )}

              <View style={[styles.fieldGroup, { marginTop: 8 }]}>
                <Text style={styles.label}>Settlement Schedule Note (Optional)</Text>
                <TextInput
                  style={styles.inputSimple}
                  placeholder="e.g. Weekly Mandi Settlement on Fridays"
                  value={settlementNote}
                  onChangeText={setSettlementNote}
                />
              </View>
            </View>

            {/* Delivery Representative Info */}
            <Text style={styles.sectionHeading}>🚚 Delivery Representative (سپلائی آرڈر نمائندہ)</Text>
            <View style={styles.subCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Rep Name (آرڈر والا کا نام)</Text>
                <TextInput
                  style={styles.inputSimple}
                  placeholder="e.g. Ali Raza (Order Booker)"
                  value={repName}
                  onChangeText={setRepName}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Rep Phone / WhatsApp</Text>
                <TextInput
                  style={styles.inputSimple}
                  placeholder="0312-9876543"
                  keyboardType="phone-pad"
                  value={repPhone}
                  onChangeText={setRepPhone}
                />
              </View>
            </View>

            {/* Company Bank Details */}
            <Text style={styles.sectionHeading}>🏦 Company Bank Details (بینک اکاؤنٹ بمع IBAN)</Text>
            <View style={styles.subCard}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Bank Name</Text>
                <TextInput
                  style={styles.inputSimple}
                  placeholder="e.g. Meezan Bank / HBL"
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Account Title</Text>
                <TextInput
                  style={styles.inputSimple}
                  placeholder="e.g. Nestlé Traders Private Ltd"
                  value={accountTitle}
                  onChangeText={setAccountTitle}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Account Number / IBAN</Text>
                <TextInput
                  style={styles.inputSimple}
                  placeholder="PK36MEZN0001000123456789"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.sectionHeading}>📝 Additional Notes</Text>
            <TextInput
              style={[styles.inputSimple, { height: 60, textAlignVertical: 'top' }]}
              placeholder="e.g. Weekly stock delivery on Tuesdays"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>{initialData ? 'Update Supplier' : 'Save Supplier'}</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalUrduTitle: {
    fontSize: 13,
    color: '#64748B',
  },
  closeBtn: {
    padding: 6,
  },
  formScroll: {
    marginTop: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
    marginBottom: 8,
  },
  fieldGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  inputSimple: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  termsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  termRadioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  termRadioOptionSelected: {
    backgroundColor: '#E0F2FE',
  },
  termLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  termLabelSelected: {
    color: '#0369A1',
  },
  termSubtext: {
    fontSize: 11,
    color: '#64748B',
  },
  subCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
