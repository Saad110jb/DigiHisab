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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { counterpartyApi, ICounterparty, RelationType } from '../api/counterparty.api';

interface EditCounterpartyModalProps {
  visible: boolean;
  counterparty: ICounterparty | null;
  onClose: () => void;
  onSuccess: (updated: ICounterparty) => void;
}

export const EditCounterpartyModal: React.FC<EditCounterpartyModalProps> = ({
  visible,
  counterparty,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cnic, setCnic] = useState('');
  const [relationType, setRelationType] = useState<RelationType>('CUSTOMER');
  const [creditLimit, setCreditLimit] = useState('10000');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (counterparty) {
      setName(counterparty.name || '');
      setPhone(counterparty.phone || '');
      setAddress(counterparty.address || '');
      setCnic(counterparty.cnic || '');
      setRelationType(counterparty.relationType || 'CUSTOMER');
      setCreditLimit(counterparty.creditLimit ? String(counterparty.creditLimit) : '10000');
      setNotes(counterparty.notes || '');
      setErrorMsg(null);
    }
  }, [counterparty, visible]);

  const handleSave = async () => {
    if (!counterparty || !counterparty._id) return;

    if (!name.trim()) {
      setErrorMsg('Naam darj karna zaroori hai (Name is required).');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Mobile number darj karna zaroori hai (Phone number is required).');
      return;
    }

    const limitNum = parseFloat(creditLimit) || 5000;

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await counterpartyApi.update(counterparty._id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        cnic: cnic.trim() || undefined,
        relationType,
        creditLimit: limitNum,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        setErrorMsg((res as any).message || 'Tafseelat update nahi ho sakin.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Update request fail ho gayi.');
    } finally {
      setLoading(false);
    }
  };

  if (!counterparty) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="create" size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Tafseelat Tabdeel Karein (Edit Contact)</Text>
                <Text style={styles.modalUrduTitle}>کھاتہ دار کے فون نمبر اور معلومات میں تبدیلی</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Relation Type Toggle (CUSTOMER | SUPPLIER) */}
            <Text style={styles.inputLabel}>Relation Type (قسم / حیثیت)</Text>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeBtn, relationType === 'CUSTOMER' && styles.typeBtnActive]}
                onPress={() => setRelationType('CUSTOMER')}
              >
                <Ionicons name="person" size={16} color={relationType === 'CUSTOMER' ? '#FFF' : COLORS.textPrimary} />
                <Text style={[styles.typeBtnText, relationType === 'CUSTOMER' && styles.typeBtnTextActive]}>
                  Gahak / Customer (صارف)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, relationType === 'SUPPLIER' && styles.typeBtnActive]}
                onPress={() => setRelationType('SUPPLIER')}
              >
                <Ionicons name="storefront" size={16} color={relationType === 'SUPPLIER' ? '#FFF' : COLORS.textPrimary} />
                <Text style={[styles.typeBtnText, relationType === 'SUPPLIER' && styles.typeBtnTextActive]}>
                  Thok Supplier (سپلائر)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Naam (نام) *</Text>
              <View style={styles.inputField}>
                <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full Name"
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mobile Phone Number (فون نمبر) *</Text>
              <View style={styles.inputField}>
                <Ionicons name="call-outline" size={18} color={COLORS.primary} style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="0300-1234567"
                />
              </View>
            </View>

            {/* Credit Limit */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Credit Limit (حدِ ادھار - Rs.)</Text>
              <View style={styles.inputField}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.textInput}
                  value={creditLimit}
                  onChangeText={setCreditLimit}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pata / Mohallah (پتہ)</Text>
              <View style={styles.inputField}>
                <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Address or shop location"
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tafseel / Notes (نوٹس)</Text>
              <View style={styles.inputField}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
                <TextInput
                  style={styles.textInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Extra notes or shop details"
                />
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Mansookh (Cancel)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={18} color="#FFF" />
                  <Text style={styles.submitBtnText}>Update Karein (سیو)</Text>
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
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalUrduTitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '600',
    flex: 1,
  },
  scrollArea: {
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: 440,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  typeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  typeBtnTextActive: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  fieldIcon: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.lightBg,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    gap: 6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
});
