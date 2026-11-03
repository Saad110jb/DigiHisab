import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dukanStaffPayrollApi } from '../../api/dukanStaffPayroll.api';
import { businessLogsApi } from '../../api/businessLogs.api';

interface NewStaffOnboardingFormProps {
  onRefresh: () => void;
  onShowToast?: (msg: string) => void;
  onSuccess?: () => void;
}

export const NewStaffOnboardingForm: React.FC<NewStaffOnboardingFormProps> = ({
  onRefresh,
  onShowToast,
  onSuccess,
}) => {
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [roleTitle, setRoleTitle] = useState<string>('Helper / Sales Boy');
  const [wageType, setWageType] = useState<'MONTHLY' | 'DAILY'>('DAILY');
  const [baseRate, setBaseRate] = useState<string>('800');
  const [openingAdvance, setOpeningAdvance] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const predefinedRoles = [
    { id: 'Helper / Sales Boy', title: 'Helper / Sales Boy', ur: 'سیلز بوائے / چھوٹا', icon: 'person' },
    { id: 'Cashier Assistant', title: 'Cashier Assistant', ur: 'کیشیئر اسسٹنٹ', icon: 'calculator' },
    { id: 'Delivery Rider', title: 'Delivery Rider', ur: 'ڈیلیوری بوائے', icon: 'bicycle' },
    { id: 'Karigar / Master', title: 'Karigar / Master', ur: 'کاریگر / ماسٹر', icon: 'hammer' },
    { id: 'Store Keeper', title: 'Store Keeper', ur: 'سٹور کیپر / گودام', icon: 'cube' },
  ];

  const handleSubmit = async () => {
    if (!name.trim()) {
      onShowToast?.('⚠️ Helper name is required.');
      return;
    }

    if (!phone.trim() || phone.trim().length < 10) {
      onShowToast?.('⚠️ Valid 11-digit mobile number required (03XXXXXXXXX).');
      return;
    }

    const rateNum = parseFloat(baseRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      onShowToast?.('⚠️ Please enter a valid base rate/salary.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await dukanStaffPayrollApi.createStaff({
        staffName: name.trim(),
        phone: phone.trim(),
        roleTitle,
        wageType,
        baseRate: rateNum,
      });

      if (res.success && res.data) {
        const createdStaff = res.data;
        const advanceNum = parseFloat(openingAdvance);

        // If dukandar specified an opening advance, log it directly
        if (!isNaN(advanceNum) && advanceNum > 0) {
          try {
            await dukanStaffPayrollApi.addAdvanceKharcha(createdStaff._id, {
              amount: advanceNum,
              type: 'ADVANCE_WAGE',
              note: 'Opening advance balance (شروع کی پیشگی)',
              paymentMode: 'PHYSICAL_CASH',
            });
          } catch (e) {}
        }

        businessLogsApi.createAuditLog({
          actionType: 'STAFF_ADDED',
          reason: `Added new staff helper ${createdStaff.staffName} (${roleTitle}) with base rate Rs. ${rateNum}`,
        });

        onShowToast?.(`✓ Helper "${createdStaff.staffName}" successfully registered!`);

        // Reset form
        setName('');
        setPhone('');
        setOpeningAdvance('');
        setBaseRate(wageType === 'DAILY' ? '800' : '25000');

        onRefresh();
        onSuccess?.();
      } else {
        onShowToast?.(res.message || 'Failed to add staff helper');
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || 'Failed to add staff helper';
      onShowToast?.(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Basic Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={16} color="#4F46E5" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Naye Helper Ki Maloomat (نیا ملازم اندراج)</Text>
            <Text style={styles.cardSub}>Enter helper identity & contact details</Text>
          </View>
        </View>

        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mukammal Naam (پورا نام) *</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="مثلاً: محمد سعد / علی رضا"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Phone Number */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mobile Number (موبائل نمبر) *</Text>
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="03001234567"
            placeholderTextColor="#94A3B8"
            maxLength={11}
          />
        </View>
      </View>

      {/* 2. Role Selector */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="briefcase" size={16} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Dukan Role (عہدہ و ذمہ داری)</Text>
            <Text style={styles.cardSub}>Select the staff member's primary job title</Text>
          </View>
        </View>

        <View style={styles.rolesGrid}>
          {predefinedRoles.map((r) => {
            const isSelected = roleTitle === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.roleCard, isSelected && styles.roleCardActive]}
                onPress={() => setRoleTitle(r.id)}
              >
                <Ionicons
                  name={r.icon as any}
                  size={18}
                  color={isSelected ? '#4F46E5' : '#64748B'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleTitleText, isSelected && styles.roleTitleActive]}>
                    {r.title}
                  </Text>
                  <Text style={[styles.roleSubUrdu, isSelected && styles.roleSubUrduActive]}>
                    {r.ur}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark-circle" size={16} color="#4F46E5" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Wage Model & Base Rate */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="cash" size={16} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Ujrat Ka Tareeqa (اجرت ماڈل)</Text>
            <Text style={styles.cardSub}>Choose daily wage or fixed monthly salary</Text>
          </View>
        </View>

        {/* Wage Type Selector */}
        <View style={styles.wageTypeTabs}>
          <TouchableOpacity
            style={[
              styles.wageTypeTab,
              wageType === 'DAILY' && styles.wageTypeTabActive,
            ]}
            onPress={() => {
              setWageType('DAILY');
              setBaseRate('800');
            }}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={wageType === 'DAILY' ? '#FFFFFF' : '#4F46E5'}
            />
            <Text
              style={[
                styles.wageTypeTabText,
                wageType === 'DAILY' && styles.wageTypeTabTextActive,
              ]}
            >
              Rozana Dehari (روزانہ دیہاڑی)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.wageTypeTab,
              wageType === 'MONTHLY' && styles.wageTypeTabActive,
            ]}
            onPress={() => {
              setWageType('MONTHLY');
              setBaseRate('25000');
            }}
          >
            <Ionicons
              name="cash"
              size={16}
              color={wageType === 'MONTHLY' ? '#FFFFFF' : '#4F46E5'}
            />
            <Text
              style={[
                styles.wageTypeTabText,
                wageType === 'MONTHLY' && styles.wageTypeTabTextActive,
              ]}
            >
              Mahana Tankha (ماہانہ تنخواہ)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Base Rate Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            {wageType === 'DAILY' ? 'Dehari Rate (فی دن رقم)' : 'Mahana Tankha (ماہانہ تنخواہ)'} *
          </Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencyPrefix}>Rs.</Text>
            <TextInput
              style={styles.amountInput}
              value={baseRate}
              onChangeText={setBaseRate}
              keyboardType="numeric"
              placeholder={wageType === 'DAILY' ? '800' : '25000'}
              placeholderTextColor="#94A3B8"
            />
            <Text style={styles.amountSuffix}>
              {wageType === 'DAILY' ? '/ دن' : '/ مہینہ'}
            </Text>
          </View>
        </View>

        {/* 4. Opening Advance Balance (Optional) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Peshgi / Opening Advance (شروع کی پیشگی - اختیاری)</Text>
          <View style={styles.amountInputRow}>
            <Text style={styles.currencyPrefix}>Rs.</Text>
            <TextInput
              style={styles.amountInput}
              value={openingAdvance}
              onChangeText={setOpeningAdvance}
              keyboardType="numeric"
              placeholder="0 (اگر کوئی پیشگی دی ہے)"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        disabled={submitting}
        onPress={handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>نیا ملازم رجسٹر کریں (Save Helper)</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  rolesGrid: {
    gap: 8,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  roleCardActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  roleTitleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  roleTitleActive: {
    color: '#4F46E5',
  },
  roleSubUrdu: {
    fontSize: 10,
    color: '#64748B',
  },
  roleSubUrduActive: {
    color: '#6366F1',
  },
  wageTypeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  wageTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  wageTypeTabActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4338CA',
  },
  wageTypeTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  wageTypeTabTextActive: {
    color: '#FFFFFF',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748B',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    paddingVertical: 8,
  },
  amountSuffix: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
