import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Share,
  useWindowDimensions,
  Linking,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts/legacy';
import {
  domesticKametiApi,
  IDomesticKameti,
  IKametiSummary,
  IVaultOption,
  CreateKametiPayload,
  KametiRole,
  IOrganizerMember,
  IMemberLookupResult,
} from '../api/domesticKameti.api';

interface KametiCommitteeModalProps {
  visible: boolean;
  onClose: () => void;
  onShowToast?: (message: string) => void;
}

export interface ICreationSlot {
  payoutMonth: number;
  memberName: string;
  memberPhone: string;
  isSelf?: boolean;
  isGharUser?: boolean;
}

type FilterTab = 'ALL' | 'PARTICIPANT' | 'ORGANIZER' | 'COMPLETED';

export const KametiCommitteeModal: React.FC<KametiCommitteeModalProps> = ({
  visible,
  onClose,
  onShowToast,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;

  const [loading, setLoading] = useState<boolean>(true);
  const [kametis, setKametis] = useState<IDomesticKameti[]>([]);
  const [summary, setSummary] = useState<IKametiSummary | null>(null);
  const [availableVaults, setAvailableVaults] = useState<IVaultOption[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // Sub-modal states
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedKametiForPay, setSelectedKametiForPay] = useState<IDomesticKameti | null>(null);
  const [selectedKametiForPayout, setSelectedKametiForPayout] = useState<IDomesticKameti | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Add Member / Contacts Picker states
  const [selectedKametiForAddMember, setSelectedKametiForAddMember] = useState<IDomesticKameti | null>(null);
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberPhone, setNewMemberPhone] = useState<string>('');
  const [newMemberPayoutMonth, setNewMemberPayoutMonth] = useState<string>('2');
  const [lookupLoading, setLookupLoading] = useState<boolean>(false);
  const [lookupResult, setLookupResult] = useState<IMemberLookupResult | null>(null);
  const [showContactPicker, setShowContactPicker] = useState<boolean>(false);
  const [contactsList, setContactsList] = useState<Array<{ name: string; phone: string }>>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState<string>('');
  const [targetSlotForContact, setTargetSlotForContact] = useState<number | null>(null);
  const [expandedOrganizerMembers, setExpandedOrganizerMembers] = useState<Record<string, boolean>>({});

  // Swap Payout Turn Modal State
  const [swapModalKameti, setSwapModalKameti] = useState<IDomesticKameti | null>(null);
  const [swapMember1Id, setSwapMember1Id] = useState<string>('');
  const [swapMember2Id, setSwapMember2Id] = useState<string>('');

  // Add Kameti Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newRole, setNewRole] = useState<KametiRole>('PARTICIPANT');
  const [newOrganizerName, setNewOrganizerName] = useState<string>('');
  const [newOrganizerPhone, setNewOrganizerPhone] = useState<string>('');
  const [newMonthlyContribution, setNewMonthlyContribution] = useState<string>('10000');
  const [newTotalMonths, setNewTotalMonths] = useState<string>('10');
  const [newUserPayoutMonth, setNewUserPayoutMonth] = useState<string>('4');
  const [newStartDate, setNewStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [newNotes, setNewNotes] = useState<string>('');

  // Organizer Dynamic Member Slots (Months 1 to N with Designated Payout Turn)
  const [creationSlots, setCreationSlots] = useState<ICreationSlot[]>(() =>
    Array.from({ length: 10 }, (_, i) => ({
      payoutMonth: i + 1,
      memberName: i === 0 ? 'میں خود (ہولڈر)' : '',
      memberPhone: '',
      isSelf: i === 0,
      isGharUser: false,
    }))
  );

  // Pay Installment Form State
  const [payCycleNumber, setPayCycleNumber] = useState<number>(1);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payVaultId, setPayVaultId] = useState<string>('');
  const [payMode, setPayMode] = useState<string>('CASH');
  const [payNotes, setPayNotes] = useState<string>('');

  // Collect Payout Form State
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutVaultId, setPayoutVaultId] = useState<string>('');
  const [payoutMode, setPayoutMode] = useState<string>('BANK_TRANSFER');
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // Synchronize creation slots when total months change
  const handleMonthsChange = (val: string) => {
    setNewTotalMonths(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 2 && parsed <= 50) {
      setCreationSlots((prev) => {
        const slots: ICreationSlot[] = [];
        for (let i = 1; i <= parsed; i++) {
          const existing = prev.find((s) => s.payoutMonth === i);
          if (existing) {
            slots.push(existing);
          } else {
            slots.push({
              payoutMonth: i,
              memberName: '',
              memberPhone: '',
              isSelf: false,
              isGharUser: false,
            });
          }
        }
        return slots;
      });
    }
  };

  // Update specific creation slot member name
  const handleUpdateSlotName = (payoutMonth: number, name: string) => {
    setCreationSlots((prev) =>
      prev.map((s) => (s.payoutMonth === payoutMonth ? { ...s, memberName: name } : s))
    );
  };

  // Update specific creation slot member phone & check Ghar Persona
  const handleUpdateSlotPhone = async (payoutMonth: number, phone: string) => {
    setCreationSlots((prev) =>
      prev.map((s) => (s.payoutMonth === payoutMonth ? { ...s, memberPhone: phone } : s))
    );
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.length >= 10) {
      try {
        const res = await domesticKametiApi.lookupMember(cleaned);
        if (res.isGharPersona) {
          setCreationSlots((prev) =>
            prev.map((s) =>
              s.payoutMonth === payoutMonth
                ? {
                    ...s,
                    isGharUser: true,
                    memberName: s.memberName.trim() ? s.memberName : res.memberName || s.memberName,
                  }
                : s
            )
          );
        } else {
          setCreationSlots((prev) =>
            prev.map((s) => (s.payoutMonth === payoutMonth ? { ...s, isGharUser: false } : s))
          );
        }
      } catch (err) {
        console.error('Slot phone lookup error:', err);
      }
    }
  };

  // Quick 1-tap self assign to slot
  const handleAssignSelfToSlot = (payoutMonth: number) => {
    setCreationSlots((prev) =>
      prev.map((s) =>
        s.payoutMonth === payoutMonth
          ? {
              ...s,
              memberName: s.isSelf ? '' : 'میں خود (ہولڈر)',
              memberPhone: '',
              isSelf: !s.isSelf,
              isGharUser: false,
            }
          : s
      )
    );
  };

  // Pick contact specifically for a slot
  const handlePickContactForSlot = async (payoutMonth: number) => {
    setTargetSlotForContact(payoutMonth);
    await handlePickFromPhonebook();
  };

  // Dynamically delete a slot from creation modal
  const handleDeleteSlot = (payoutMonth: number) => {
    if (creationSlots.length <= 2) {
      Alert.alert('کم از کم حد', 'کمیٹی پول کے لیے کم از کم 2 ممبرز / مہینوں کا ہونا لازمی ہے۔');
      return;
    }
    setCreationSlots((prev) => {
      const filtered = prev.filter((s) => s.payoutMonth !== payoutMonth);
      // Re-index remaining slots to maintain consecutive months 1..N
      const reindexed = filtered.map((s, idx) => ({
        ...s,
        payoutMonth: idx + 1,
      }));
      setNewTotalMonths(reindexed.length.toString());
      return reindexed;
    });
  };

  // Dynamically add a slot to creation modal
  const handleAddSlot = () => {
    setCreationSlots((prev) => {
      const nextMonth = prev.length + 1;
      const updated = [
        ...prev,
        {
          payoutMonth: nextMonth,
          memberName: '',
          memberPhone: '',
          isSelf: false,
          isGharUser: false,
        },
      ];
      setNewTotalMonths(updated.length.toString());
      return updated;
    });
  };

  // Delete member from an existing Kameti
  const handleDeleteMemberFromKameti = (kametiId: string, memberId: string, memberName: string) => {
    Alert.alert(
      'ممبر خارج کریں؟',
      `کیا آپ واقعی "${memberName}" کو اس کمیٹی سے خارج کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'خارج کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              await domesticKametiApi.deleteMember(kametiId, memberId);
              fetchData();
              if (onShowToast) onShowToast(`ممبر "${memberName}" کو خارج کر دیا گیا`);
            } catch (err: any) {
              Alert.alert('خرابی', err?.response?.data?.message || 'ممبر خارج نہ ہو سکا۔');
            }
          },
        },
      ]
    );
  };

  // Load data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await domesticKametiApi.getKametis();
      setKametis(res.kametis || []);
      setSummary(res.summary || null);
      setAvailableVaults(res.availableVaults || []);
      if (res.availableVaults && res.availableVaults.length > 0) {
        if (!payVaultId) setPayVaultId(res.availableVaults[0].id);
        if (!payoutVaultId) setPayoutVaultId(res.availableVaults[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch Kametis:', err);
      Alert.alert('خرابی (Error)', err?.response?.data?.message || 'کمیٹی کا ڈیٹا لوڈ نہیں ہو سکا۔');
    } finally {
      setLoading(false);
    }
  }, [payVaultId, payoutVaultId]);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible, fetchData]);

  // Filtered Kametis
  const filteredKametis = useMemo(() => {
    return kametis.filter((k) => {
      if (activeTab === 'COMPLETED') return k.status === 'COMPLETED';
      if (k.status === 'COMPLETED') return false;
      if (activeTab === 'PARTICIPANT') return k.role === 'PARTICIPANT';
      if (activeTab === 'ORGANIZER') return k.role === 'ORGANIZER';
      return true;
    });
  }, [kametis, activeTab]);

  // Find if any Kameti is due for payout right now
  const dueNowKameti = useMemo(() => {
    return kametis.find((k) => k.status === 'ACTIVE' && k.isPayoutDueNow && !k.payoutReceived);
  }, [kametis]);

  // Toggle expanded members section for organizer card
  const toggleOrganizerMembers = (kametiId: string) => {
    setExpandedOrganizerMembers((prev) => ({
      ...prev,
      [kametiId]: prev[kametiId] === undefined ? true : !prev[kametiId],
    }));
  };

  // Open Pay Installment Sheet
  const handleOpenPay = (k: IDomesticKameti) => {
    setSelectedKametiForPay(k);
    setPayCycleNumber(k.currentCycle || 1);
    setPayAmount(String(k.monthlyContribution));
    if (availableVaults.length > 0 && !payVaultId) {
      setPayVaultId(availableVaults[0].id);
    }
  };

  // Open Collect Payout Sheet
  const handleOpenPayout = (k: IDomesticKameti) => {
    setSelectedKametiForPayout(k);
    setPayoutAmount(String(k.poolAmount));
    if (availableVaults.length > 0 && !payoutVaultId) {
      setPayoutVaultId(availableVaults[0].id);
    }
  };

  // Open Add Member Sheet
  const handleOpenAddMember = (k: IDomesticKameti) => {
    setSelectedKametiForAddMember(k);
    setNewMemberName('');
    setNewMemberPhone('');
    setLookupResult(null);
    const nextAvailableMonth = (k.members.length || 0) + 1;
    setNewMemberPayoutMonth(String(Math.min(nextAvailableMonth, k.totalMonths)));
  };

  // Live Phone Lookup for Member
  const checkMemberPhone = async (phone: string) => {
    setNewMemberPhone(phone);
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.length >= 10) {
      try {
        setLookupLoading(true);
        const res = await domesticKametiApi.lookupMember(cleaned);
        setLookupResult(res);
        if (res.isRegistered && res.memberName && !newMemberName.trim()) {
          setNewMemberName(res.memberName);
        }
      } catch (err) {
        console.error('Member lookup error:', err);
      } finally {
        setLookupLoading(false);
      }
    } else {
      setLookupResult(null);
    }
  };

  // Launch Contact Picker from Phonebook
  const handlePickFromPhonebook = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });
        if (data && data.length > 0) {
          const list: Array<{ name: string; phone: string }> = [];
          data.forEach((c) => {
            if (c.phoneNumbers && c.phoneNumbers.length > 0) {
              c.phoneNumbers.forEach((p) => {
                if (p.number) {
                  list.push({
                    name: c.name || 'نامعلوم رابطہ',
                    phone: p.number.trim(),
                  });
                }
              });
            }
          });
          setContactsList(list);
          setShowContactPicker(true);
        } else {
          Alert.alert('رابطے نہیں ملے', 'فون بک میں کوئی رابطہ فون نمبر کے ساتھ نہیں ملا۔');
        }
      } else {
        Alert.alert('اجازت درکار ہے', 'فون بک سے ممبر شامل کرنے کے لیے کنٹیکٹس کی اجازت درکار ہے۔');
      }
    } catch (err: any) {
      console.error('Contact picker error:', err);
      Alert.alert('خرابی', 'فون بک روابط لوڈ نہ ہو سکے۔');
    }
  };

  // Select Contact from List
  const handleSelectContact = (c: { name: string; phone: string }) => {
    setShowContactPicker(false);
    if (targetSlotForContact !== null) {
      handleUpdateSlotName(targetSlotForContact, c.name);
      handleUpdateSlotPhone(targetSlotForContact, c.phone);
      setTargetSlotForContact(null);
    } else {
      setNewMemberName(c.name);
      checkMemberPhone(c.phone);
    }
  };

  // Submit Add Member to Kameti
  const handleSubmitAddMember = async () => {
    if (!selectedKametiForAddMember) return;
    if (!newMemberName.trim()) {
      Alert.alert('نام درکار ہے', 'برائے مہربانی ممبر کا نام درج کریں۔');
      return;
    }
    const pMonth = parseInt(newMemberPayoutMonth, 10);
    if (isNaN(pMonth) || pMonth < 1 || pMonth > selectedKametiForAddMember.totalMonths) {
      Alert.alert('وصولی کا مہینہ', `وصولی کا مہینہ 1 سے ${selectedKametiForAddMember.totalMonths} کے درمیان منتخب کریں۔`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await domesticKametiApi.addMember(selectedKametiForAddMember._id, {
        memberName: newMemberName.trim(),
        memberPhone: newMemberPhone.trim() || undefined,
        payoutMonth: pMonth,
      });

      setSelectedKametiForAddMember(null);
      fetchData();

      if (res.isGharUser) {
        Alert.alert(
          'نوٹیفکیشن ارسال! 🎉',
          `"${newMemberName}" DigiHisab ایپ صارف ہیں۔ ان کے موبائل پر کمیٹی دعوت اور ریئل ٹائم سنک کا نوٹیفکیشن کامیابی سے بھیج دیا گیا ہے۔`
        );
      } else {
        // Non-app user: Offer WhatsApp invite slip
        Alert.alert(
          'ممبر شامل ہو گیا! 📋',
          `"${newMemberName}" کو کمیٹی میں شامل کر لیا گیا ہے۔ کیا آپ انہیں واٹس ایپ پر کمیٹی کی تفصیلات بھیجنا چاہتے ہیں؟`,
          [
            { text: 'بعد میں', style: 'cancel' },
            {
              text: 'واٹس ایپ پر دعوت بھیجیں 💬',
              onPress: () => {
                Share.share({
                  message: res.whatsappInvite,
                  title: 'کمیٹی شمولیت دعوت',
                });
              },
            },
          ]
        );
      }

      if (onShowToast) onShowToast('ممبر کامیابی سے شامل ہو گیا!');
    } catch (err: any) {
      console.error('Add member error:', err);
      Alert.alert('خرابی', err?.response?.data?.message || 'ممبر شامل نہ ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle member's payment
  const handleToggleMemberPayment = async (kametiId: string, memberId: string, cycleNumber: number) => {
    try {
      await domesticKametiApi.toggleMemberPayment(kametiId, memberId, cycleNumber);
      fetchData();
      if (onShowToast) onShowToast('قسط کی کیفیت تبدیل ہو گئی');
    } catch (err: any) {
      Alert.alert('خرابی', err?.response?.data?.message || 'قسط اپ ڈیٹ نہ ہو سکی۔');
    }
  };

  // Send member WhatsApp invite / reminder
  const handleSendMemberWhatsApp = async (kametiId: string, memberId: string) => {
    try {
      const res = await domesticKametiApi.getMemberInviteSlip(kametiId, memberId);
      await Share.share({
        message: res.shareText,
        title: `کمیٹی تفصیلات • ${res.memberName}`,
      });
    } catch (err: any) {
      console.error('Share error:', err);
    }
  };

  // Submit Swap Payout Turn Months
  const handleConfirmSwapMonths = async () => {
    if (!swapModalKameti || !swapMember1Id || !swapMember2Id) {
      Alert.alert('انتخاب کریں', 'تبدیلی کے لیے دونوں ممبرز کا انتخاب کریں۔');
      return;
    }
    try {
      setSubmitting(true);
      await domesticKametiApi.swapPayoutMonths(swapModalKameti._id, {
        memberId1: swapMember1Id,
        memberId2: swapMember2Id,
      });
      setSwapModalKameti(null);
      setSwapMember1Id('');
      setSwapMember2Id('');
      fetchData();
      if (onShowToast) onShowToast('وصولی کے مہینوں کا تبادلہ کامیابی سے ہو گیا!');
    } catch (err: any) {
      console.error('Swap error:', err);
      Alert.alert('خرابی', err?.response?.data?.message || 'تبادلہ نہ ہو سکا۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Add Kameti
  const handleCreateKameti = async () => {
    const contribution = parseFloat(newMonthlyContribution);
    const months = parseInt(newTotalMonths, 10);
    const userPayout = parseInt(newUserPayoutMonth, 10);

    if (!newTitle.trim()) {
      Alert.alert('نام درکار ہے', 'برائے مہربانی کمیٹی کا نام درج کریں۔');
      return;
    }
    if (isNaN(contribution) || contribution <= 0) {
      Alert.alert('رقم درست کریں', 'ماہانہ قسط کی رقم درست درج کریں۔');
      return;
    }
    if (isNaN(months) || months < 2) {
      Alert.alert('مدت درست کریں', 'کم از کم 2 ماہ یا 2 ممبرز درکار ہیں۔');
      return;
    }
    if (newRole === 'PARTICIPANT' && (isNaN(userPayout) || userPayout < 1 || userPayout > months)) {
      Alert.alert('وصولی کا مہینہ', `وصولی کا مہینہ 1 سے ${months} کے درمیان منتخب کریں۔`);
      return;
    }

    try {
      setSubmitting(true);

      // Prepare populated member slots if Organizer
      const formattedMembers =
        newRole === 'ORGANIZER'
          ? creationSlots
              .filter((s) => s.memberName.trim().length > 0)
              .map((s) => ({
                memberName: s.memberName.trim(),
                memberPhone: s.memberPhone ? s.memberPhone.trim() : undefined,
                payoutMonth: s.payoutMonth,
              }))
          : undefined;

      const payload: CreateKametiPayload = {
        title: newTitle.trim(),
        role: newRole,
        organizerName: newOrganizerName.trim() || undefined,
        organizerPhone: newOrganizerPhone.trim() || undefined,
        monthlyContribution: contribution,
        totalMonths: months,
        startDate: newStartDate,
        userPayoutMonth: newRole === 'PARTICIPANT' ? userPayout : 1,
        notes: newNotes.trim() || undefined,
        members: formattedMembers,
      };

      await domesticKametiApi.createKameti(payload);
      setShowAddModal(false);
      resetNewForm();
      fetchData();
      if (onShowToast) {
        onShowToast(
          newRole === 'ORGANIZER' && formattedMembers && formattedMembers.length > 0
            ? `نئی کمیٹی مع ${formattedMembers.length} ممبران وصولی شیڈول محفوظ ہو گئی!`
            : 'نئی کمیٹی کامیابی سے شامل کر دی گئی!'
        );
      }
    } catch (err: any) {
      console.error('Error creating kameti:', err);
      Alert.alert('خرابی', err?.response?.data?.message || 'کمیٹی شامل نہ ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  const resetNewForm = () => {
    setNewTitle('');
    setNewRole('PARTICIPANT');
    setNewOrganizerName('');
    setNewOrganizerPhone('');
    setNewMonthlyContribution('10000');
    setNewTotalMonths('10');
    setNewUserPayoutMonth('4');
    setNewNotes('');
    setCreationSlots(
      Array.from({ length: 10 }, (_, i) => ({
        payoutMonth: i + 1,
        memberName: i === 0 ? 'میں خود (ہولڈر)' : '',
        memberPhone: '',
        isSelf: i === 0,
        isGharUser: false,
      }))
    );
  };

  // Submit Installment Payment
  const handleSubmitPayment = async () => {
    if (!selectedKametiForPay) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('رقم درست کریں', 'قسط کی رقم درج کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      await domesticKametiApi.payInstallment(selectedKametiForPay._id, {
        cycleNumber: payCycleNumber,
        amount,
        debitedFromVaultAccountId: payVaultId || undefined,
        paymentMode: payMode,
        notes: payNotes.trim() || undefined,
      });

      const currentPayKameti = selectedKametiForPay;
      setSelectedKametiForPay(null);
      fetchData();
      if (onShowToast) onShowToast(`ماہ ${payCycleNumber} کی قسط کامیابی سے ادا ہوگئی!`);

      // Prompt to share WhatsApp slip
      Alert.alert(
        'قسط جمع ہو گئی! 🎉',
        'کیا آپ منتظم کو واٹس ایپ پر ادائیگی کی رسید بھیجنا چاہتے ہیں؟',
        [
          { text: 'بعد میں', style: 'cancel' },
          {
            text: 'واٹس ایپ رسید بھیجیں',
            onPress: () => handleShareSlip(currentPayKameti._id, payCycleNumber),
          },
        ]
      );
    } catch (err: any) {
      console.error('Error paying installment:', err);
      Alert.alert('خرابی', err?.response?.data?.message || 'ادائیگی محفوظ نہ ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Payout Collection
  const handleSubmitPayout = async () => {
    if (!selectedKametiForPayout) return;
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('رقم درست کریں', 'وصولی کی رقم درج کریں۔');
      return;
    }

    try {
      setSubmitting(true);
      await domesticKametiApi.collectPayout(selectedKametiForPayout._id, {
        amount,
        creditedToVaultAccountId: payoutVaultId || undefined,
        paymentMode: payoutMode,
        notes: payoutNotes.trim() || undefined,
      });

      setSelectedKametiForPayout(null);
      fetchData();
      if (onShowToast) onShowToast(`مبارک ہو! Rs. ${amount.toLocaleString()} والٹ میں جمع ہو گئے!`);
      Alert.alert(
        'مبارک ہو! 🎊',
        `کمیٹی پول کی رقم Rs. ${amount.toLocaleString()} آپ کے والٹ میں وصول کر لی گئی ہے۔`
      );
    } catch (err: any) {
      console.error('Error collecting payout:', err);
      Alert.alert('خرابی', err?.response?.data?.message || 'وصولی درج نہ ہو سکی۔');
    } finally {
      setSubmitting(false);
    }
  };

  // Advance Month Cycle
  const handleAdvanceCycle = async (k: IDomesticKameti) => {
    Alert.alert(
      'اگلا ماہ منتخب کریں',
      `کیا آپ "${k.title}" کا اگلا ماہ (${k.currentCycle + 1} / ${k.totalMonths}) شروع کرنا چاہتے ہیں؟`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'جی ہاں، اگلا ماہ',
          onPress: async () => {
            try {
              await domesticKametiApi.advanceCycle(k._id);
              fetchData();
              if (onShowToast) onShowToast('اگلا ماہ سائیکل فعال کر دیا گیا!');
            } catch (err: any) {
              Alert.alert('خرابی', err?.response?.data?.message || 'سائیکل تبدیل نہ ہو سکا۔');
            }
          },
        },
      ]
    );
  };

  // Share WhatsApp Slip
  const handleShareSlip = async (kametiId: string, cycle?: number) => {
    try {
      const res = await domesticKametiApi.getShareSlip(kametiId, cycle);
      await Share.share({
        message: res.shareText,
        title: res.kametiTitle,
      });
    } catch (err: any) {
      console.error('Error sharing receipt:', err);
    }
  };

  // Delete Kameti
  const handleDeleteKameti = (k: IDomesticKameti) => {
    Alert.alert(
      'کمیٹی حذف کریں؟',
      `کیا آپ واقعی "${k.title}" کو حذف کرنا چاہتے ہیں؟ اس کا تمام ریکارڈ مٹا دیا جائے گا۔`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'حذف کریں',
          style: 'destructive',
          onPress: async () => {
            try {
              await domesticKametiApi.deleteKameti(k._id);
              fetchData();
              if (onShowToast) onShowToast('کمیٹی کامیابی سے حذف کر دی گئی');
            } catch (err: any) {
              Alert.alert('خرابی', err?.response?.data?.message || 'کمیٹی حذف نہ ہو سکی۔');
            }
          },
        },
      ]
    );
  };

  // Call or WhatsApp Organizer
  const handleContactOrganizer = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Alert.alert(
      'آرگنائزر سے رابطہ',
      `فون نمبر: ${phone}`,
      [
        { text: 'منسوخ', style: 'cancel' },
        {
          text: 'کال کریں 📞',
          onPress: () => Linking.openURL(`tel:${cleanPhone}`),
        },
        {
          text: 'واٹس ایپ 💬',
          onPress: () => Linking.openURL(`https://wa.me/${cleanPhone.replace('+', '')}`),
        },
      ]
    );
  };

  // Filtered contacts list for picker
  const filteredContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) return contactsList.slice(0, 50);
    const q = contactSearchQuery.toLowerCase();
    return contactsList
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 50);
  }, [contactsList, contactSearchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#F8FAFC" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitleUrdu}>بی سی اور کمیٹی کھاتہ</Text>
              <View style={styles.liveTag}>
                <View style={styles.liveDot} />
                <Text style={styles.liveTagText}>روٹیشنل سیونگز</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Kameti & Committee Savings Ledger</Text>
          </View>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={fetchData}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="refresh" size={20} color="#C084FC" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C084FC" />
            <Text style={styles.loadingText}>کمیٹی کھاتہ لوڈ ہو رہا ہے...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Top 4-Metric Summary Cards */}
            {summary && (
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Ionicons name="people-outline" size={16} color="#C084FC" />
                    <Text style={styles.summaryCardLabel}>فعال کمیٹیاں</Text>
                  </View>
                  <Text style={[styles.summaryCardValue, { color: '#C084FC' }]}>
                    {summary.totalActiveCount}
                  </Text>
                  <Text style={styles.summaryCardSub}>جاری سیونگ پولز</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Ionicons name="arrow-up-circle-outline" size={16} color="#FB7185" />
                    <Text style={styles.summaryCardLabel}>ماہانہ قسط اخراجات</Text>
                  </View>
                  <Text style={[styles.summaryCardValue, { color: '#FB7185' }]}>
                    Rs. {summary.totalMonthlyOutflow.toLocaleString()}
                  </Text>
                  <Text style={styles.summaryCardSub}>ہر ماہ لازمی قسط</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Ionicons name="calendar-outline" size={16} color="#38BDF8" />
                    <Text style={styles.summaryCardLabel}>اگلی وصولی کی باری</Text>
                  </View>
                  <Text style={[styles.summaryCardValue, { color: '#38BDF8' }]}>
                    {summary.nextUpcomingPayout
                      ? summary.nextUpcomingPayout.isDueNow
                        ? 'رواں ماہ! 🎉'
                        : `${summary.nextUpcomingPayout.monthsRemaining} ماہ بعد`
                      : 'کوئی نہیں'}
                  </Text>
                  <Text style={styles.summaryCardSub}>
                    {summary.nextUpcomingPayout
                      ? `Rs. ${summary.nextUpcomingPayout.poolAmount.toLocaleString()}`
                      : 'وصولی مکمل'}
                  </Text>
                </View>

                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#00d49f" />
                    <Text style={styles.summaryCardLabel}>مجموعی جمع پونجی</Text>
                  </View>
                  <Text style={[styles.summaryCardValue, { color: '#00d49f' }]}>
                    Rs. {summary.totalCapitalSaved.toLocaleString()}
                  </Text>
                  <Text style={styles.summaryCardSub}>اب تک ادا شدہ رقم</Text>
                </View>
              </View>
            )}

            {/* 2. Celebration Radar Banner (Due-Now Payout) */}
            {dueNowKameti && (
              <View style={styles.celebrationBanner}>
                <View style={styles.celebrationGlow}>
                  <Ionicons name="sparkles" size={28} color="#00d49f" />
                </View>
                <View style={styles.celebrationTextCol}>
                  <Text style={styles.celebrationHeading}>
                    🎉 مبارک ہو! رواں ماہ آپ کی کمیٹی کی وصولی ہے!
                  </Text>
                  <Text style={styles.celebrationSub}>
                    "{dueNowKameti.title}" کا پورا پول Rs.{' '}
                    {dueNowKameti.poolAmount.toLocaleString()} وصول کرنے کے لیے تیار ہے۔
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.celebrationBtn}
                  onPress={() => handleOpenPayout(dueNowKameti)}
                >
                  <Ionicons name="wallet-outline" size={16} color="#070d18" />
                  <Text style={styles.celebrationBtnText}>ابھی وصول کریں</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 3. Action Toolbar & Filter Tabs */}
            <View style={styles.actionToolbar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
                <TouchableOpacity
                  style={[styles.filterTab, activeTab === 'ALL' && styles.filterTabActive]}
                  onPress={() => setActiveTab('ALL')}
                >
                  <Text
                    style={[styles.filterTabText, activeTab === 'ALL' && styles.filterTabTextActive]}
                  >
                    تمام کمیٹیاں ({kametis.filter((k) => k.status !== 'COMPLETED').length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, activeTab === 'PARTICIPANT' && styles.filterTabActive]}
                  onPress={() => setActiveTab('PARTICIPANT')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      activeTab === 'PARTICIPANT' && styles.filterTabTextActive,
                    ]}
                  >
                    میں ممبر ہوں
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, activeTab === 'ORGANIZER' && styles.filterTabActive]}
                  onPress={() => setActiveTab('ORGANIZER')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      activeTab === 'ORGANIZER' && styles.filterTabTextActive,
                    ]}
                  >
                    میں ہولڈر ہوں
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, activeTab === 'COMPLETED' && styles.filterTabActive]}
                  onPress={() => setActiveTab('COMPLETED')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      activeTab === 'COMPLETED' && styles.filterTabTextActive,
                    ]}
                  >
                    مکمل شدہ ({kametis.filter((k) => k.status === 'COMPLETED').length})
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Add New Kameti Button (Supports adding any number of Kametis) */}
              <TouchableOpacity
                style={styles.addKametiPrimaryBtn}
                onPress={() => {
                  resetNewForm();
                  setShowAddModal(true);
                }}
              >
                <Ionicons name="add-circle" size={18} color="#070d18" />
                <Text style={styles.addKametiPrimaryBtnText}>+ نئی کمیٹی شامل کریں</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Kameti List */}
            {filteredKametis.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyStateIconCircle}>
                  <Ionicons name="people-circle-outline" size={48} color="#C084FC" />
                </View>
                <Text style={styles.emptyStateTitle}>کوئی کمیٹی موجود نہیں ہے</Text>
                <Text style={styles.emptyStateSubtitle}>
                  آپ جتنی چاہیں نئی کمیٹیاں / بی سی شامل کر سکتے ہیں۔ قسط کی یاددہانی، وصولی کا وقت،
                  اور ممبران کے فون نمبرز کنٹیکٹ لسٹ سے خودکار سنک ہوں گے۔
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => {
                    resetNewForm();
                    setShowAddModal(true);
                  }}
                >
                  <Ionicons name="add" size={18} color="#070d18" />
                  <Text style={styles.emptyAddBtnText}>پہلی کمیٹی شامل کریں</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.kametiList}>
                {filteredKametis.map((k) => {
                  const isParticipant = k.role === 'PARTICIPANT';
                  // Organizer members roster open by default
                  const isMembersExpanded =
                    expandedOrganizerMembers[k._id] !== undefined
                      ? expandedOrganizerMembers[k._id]
                      : true;

                  // Sort members by payout month order for a clean calendar view
                  const sortedMembers = k.members
                    ? [...k.members].sort((a, b) => a.payoutMonth - b.payoutMonth)
                    : [];

                  return (
                    <View key={k._id} style={styles.kametiCard}>
                      {/* Top Card Header */}
                      <View style={styles.kametiCardTop}>
                        <View style={styles.kametiTitleGroup}>
                          <View style={styles.kametiIconBox}>
                            <Ionicons
                              name={isParticipant ? 'person' : 'ribbon'}
                              size={20}
                              color="#C084FC"
                            />
                          </View>
                          <View>
                            <Text style={styles.kametiTitle}>{k.title}</Text>
                            <View style={styles.badgeRow}>
                              <View
                                style={[
                                  styles.roleBadge,
                                  isParticipant ? styles.roleBadgeMember : styles.roleBadgeOrganizer,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.roleBadgeText,
                                    isParticipant
                                      ? styles.roleBadgeTextMember
                                      : styles.roleBadgeTextOrganizer,
                                  ]}
                                >
                                  {isParticipant ? 'میں ممبر ہوں' : 'میں ہولڈر ہوں'}
                                </Text>
                              </View>
                              <Text style={styles.cycleBadge}>
                                ماہ {k.currentCycle} / {k.totalMonths}
                              </Text>
                              {k.status === 'COMPLETED' && (
                                <View style={styles.completedBadge}>
                                  <Text style={styles.completedBadgeText}>مکمل شدہ</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Top Actions */}
                        <View style={styles.topActionGroup}>
                          <TouchableOpacity
                            style={styles.miniIconBtn}
                            onPress={() => handleShareSlip(k._id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.miniIconBtn}
                            onPress={() => handleDeleteKameti(k)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#FB7185" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Organizer Details (If Participant) */}
                      {isParticipant && (
                        <View style={styles.organizerRow}>
                          <View style={styles.organizerInfo}>
                            <Ionicons name="person-circle-outline" size={16} color="#94A3B8" />
                            <Text style={styles.organizerText}>
                              منتظم:{' '}
                              <Text style={styles.organizerNameText}>
                                {k.organizerName || 'نامعلوم'}
                              </Text>
                            </Text>
                          </View>
                          {k.organizerPhone ? (
                            <TouchableOpacity
                              style={styles.contactBtn}
                              onPress={() => handleContactOrganizer(k.organizerPhone)}
                            >
                              <Ionicons name="call-outline" size={12} color="#38BDF8" />
                              <Text style={styles.contactBtnText}>{k.organizerPhone}</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}

                      {/* Payout Radar Banner Inside Card */}
                      <View
                        style={[
                          styles.cardRadarBox,
                          k.isPayoutDueNow && !k.payoutReceived
                            ? styles.cardRadarBoxDueNow
                            : k.payoutReceived
                            ? styles.cardRadarBoxPaid
                            : styles.cardRadarBoxUpcoming,
                        ]}
                      >
                        <Ionicons
                          name={
                            k.payoutReceived
                              ? 'checkmark-done-circle'
                              : k.isPayoutDueNow
                              ? 'alarm'
                              : 'time-outline'
                          }
                          size={18}
                          color={
                            k.payoutReceived
                              ? '#00d49f'
                              : k.isPayoutDueNow
                              ? '#F59E0B'
                              : '#C084FC'
                          }
                        />
                        <View style={styles.cardRadarTextCol}>
                          {k.payoutReceived ? (
                            <Text style={[styles.cardRadarTitle, { color: '#00d49f' }]}>
                              کمیٹی رقم وصول شدہ (Rs. {(k.payoutAmountReceived || k.poolAmount).toLocaleString()})
                            </Text>
                          ) : k.isPayoutDueNow ? (
                            <Text style={[styles.cardRadarTitle, { color: '#F59E0B' }]}>
                              🎉 رواں ماہ وصولی کا وقت ہے! (Rs. {k.poolAmount.toLocaleString()})
                            </Text>
                          ) : (
                            <Text style={[styles.cardRadarTitle, { color: '#C084FC' }]}>
                              {isParticipant
                                ? `آپ کی وصولی: ماہ ${k.userPayoutMonth} میں (${
                                    k.monthsRemainingUntilPayout > 0
                                      ? `${k.monthsRemainingUntilPayout} ماہ باقی`
                                      : 'قریب ہے'
                                  })`
                                : `رواں سائیکل: ماہ ${k.currentCycle} / ${k.totalMonths} • کل پول: Rs. ${k.poolAmount.toLocaleString()}`}
                            </Text>
                          )}

                          {/* Post-payout debtor liability warning */}
                          {k.isPostPayoutDebtor && (
                            <Text style={styles.cardRadarDebtorWarning}>
                              ⚠️ کمیٹی پیشگی وصول شدہ • بقایا واجب الادا: Rs.{' '}
                              {k.postPayoutLiability.toLocaleString()} (
                              {k.totalMonths - k.totalPaidCycles} اقساط)
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Financial Key Figures Grid */}
                      <View style={styles.cardMetricsGrid}>
                        <View style={styles.cardMetricItem}>
                          <Text style={styles.cardMetricLabel}>کل کمیٹی پول</Text>
                          <Text style={[styles.cardMetricValue, { color: '#00d49f' }]}>
                            Rs. {k.poolAmount.toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.cardMetricItem}>
                          <Text style={styles.cardMetricLabel}>ماہانہ قسط</Text>
                          <Text style={[styles.cardMetricValue, { color: '#C084FC' }]}>
                            Rs. {k.monthlyContribution.toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.cardMetricItem}>
                          <Text style={styles.cardMetricLabel}>اب تک ادا شدہ</Text>
                          <Text style={[styles.cardMetricValue, { color: '#38BDF8' }]}>
                            Rs. {k.totalPaidSoFar.toLocaleString()}
                          </Text>
                        </View>

                        <View style={styles.cardMetricItem}>
                          <Text style={styles.cardMetricLabel}>بقایا اقساط</Text>
                          <Text style={[styles.cardMetricValue, { color: '#FB7185' }]}>
                            Rs. {k.remainingOutflow.toLocaleString()}
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${Math.min(k.progressPercentage || 0, 100)}%` },
                            ]}
                          />
                        </View>
                        <View style={styles.progressLabelRow}>
                          <Text style={styles.progressText}>
                            اقساط جمع: {k.totalPaidCycles} / {k.totalMonths}
                          </Text>
                          <Text style={styles.progressPercentText}>{k.progressPercentage}% مکمل</Text>
                        </View>
                      </View>

                      {/* Visual Month Cycle Beads */}
                      <View style={styles.cycleBeadsRow}>
                        {Array.from({ length: k.totalMonths }, (_, idx) => {
                          const cycleNum = idx + 1;
                          const isPaid = k.installments.some((ins) => ins.cycleNumber === cycleNum);
                          const isPayoutCycle = cycleNum === k.userPayoutMonth;
                          const isCurrent = cycleNum === k.currentCycle;

                          return (
                            <View
                              key={cycleNum}
                              style={[
                                styles.cycleBead,
                                isPaid && styles.cycleBeadPaid,
                                isPayoutCycle && styles.cycleBeadPayout,
                                isCurrent && !isPaid && styles.cycleBeadCurrent,
                              ]}
                            >
                              {isPaid ? (
                                <Ionicons name="checkmark" size={10} color="#070d18" />
                              ) : isPayoutCycle ? (
                                <Ionicons name="star" size={10} color="#F59E0B" />
                              ) : (
                                <Text style={styles.cycleBeadText}>{cycleNum}</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>

                      {/* ------------------------------------------------------------- */}
                      {/* ORGANIZER MEMBERS ROSTER & PAYOUT SCHEDULE (If Holder)         */}
                      {/* ------------------------------------------------------------- */}
                      {!isParticipant && (
                        <View style={styles.organizerRosterSection}>
                          <View style={styles.organizerRosterHeader}>
                            <TouchableOpacity
                              style={styles.rosterTitleBtn}
                              onPress={() => toggleOrganizerMembers(k._id)}
                            >
                              <Ionicons
                                name={isMembersExpanded ? 'chevron-down' : 'chevron-forward'}
                                size={16}
                                color="#38BDF8"
                              />
                              <Text style={styles.rosterTitleText}>
                                ممبران و وصولی باری شیڈول ({k.members ? k.members.length : 0} / {k.totalMonths})
                              </Text>
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {k.members && k.members.length >= 2 && (
                                <TouchableOpacity
                                  style={styles.swapTurnsBtn}
                                  onPress={() => {
                                    setSwapModalKameti(k);
                                    setSwapMember1Id(k.members[0]._id ? k.members[0]._id.toString() : '');
                                    setSwapMember2Id(k.members[1]._id ? k.members[1]._id.toString() : '');
                                  }}
                                >
                                  <Ionicons name="swap-horizontal" size={12} color="#F59E0B" />
                                  <Text style={styles.swapTurnsBtnText}>باری تبدیل ⇄</Text>
                                </TouchableOpacity>
                              )}

                              <TouchableOpacity
                                style={styles.addMemberBtn}
                                onPress={() => handleOpenAddMember(k)}
                              >
                                <Ionicons name="person-add" size={12} color="#070d18" />
                                <Text style={styles.addMemberBtnText}>+ ممبر شامل</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Expanded Members List with Designated Payout Month */}
                          {isMembersExpanded && (
                            <View style={styles.membersListContainer}>
                              {sortedMembers.length === 0 ? (
                                <Text style={styles.noMembersHint}>
                                  ابھی کوئی ممبر شامل نہیں ہے۔ تمام ممبران اور ان کی وصولی کا مہینہ سیٹ کرنے کے لیے "+ ممبر شامل" دبائیں۔
                                </Text>
                              ) : (
                                sortedMembers.map((m, mIdx) => {
                                  const isCyclePaid = m.paidCycles && m.paidCycles.includes(k.currentCycle);
                                  const isLinkedGharUser = m.inviteStatus === 'LINKED' || !!m.memberProfileId;
                                  const isThisMonthRecipient = m.payoutMonth === k.currentCycle;

                                  return (
                                    <View
                                      key={m._id || mIdx}
                                      style={[
                                        styles.memberItemCard,
                                        isThisMonthRecipient && styles.memberItemCardDueRecipient,
                                      ]}
                                    >
                                      <View style={styles.memberItemTop}>
                                        <View style={styles.memberItemNameCol}>
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.memberNameText}>{m.memberName}</Text>
                                            {isLinkedGharUser ? (
                                              <View style={styles.linkedBadge}>
                                                <Ionicons name="shield-checkmark" size={10} color="#00d49f" />
                                                <Text style={styles.linkedBadgeText}>ایپ صارف (منسلک)</Text>
                                              </View>
                                            ) : (
                                              <View style={styles.unregisteredBadge}>
                                                <Ionicons name="logo-whatsapp" size={10} color="#38BDF8" />
                                                <Text style={styles.unregisteredBadgeText}>واٹس ایپ رابطہ</Text>
                                              </View>
                                            )}
                                          </View>

                                          {/* Designated Month of Receiving Highlight */}
                                          <View style={styles.memberPayoutTagRow}>
                                            <View
                                              style={[
                                                styles.payoutMonthPill,
                                                isThisMonthRecipient && styles.payoutMonthPillDueNow,
                                              ]}
                                            >
                                              <Ionicons
                                                name="trophy"
                                                size={10}
                                                color={isThisMonthRecipient ? '#070d18' : '#F59E0B'}
                                              />
                                              <Text
                                                style={[
                                                  styles.payoutMonthPillText,
                                                  isThisMonthRecipient && styles.payoutMonthPillTextDueNow,
                                                ]}
                                              >
                                                وصولی کا مہینہ: ماہ {m.payoutMonth} (Rs. {k.poolAmount.toLocaleString()})
                                                {isThisMonthRecipient ? ' • رواں ماہ باری ہے!' : ''}
                                              </Text>
                                            </View>
                                            {m.memberPhone ? (
                                              <Text style={styles.memberPhoneText}>{m.memberPhone}</Text>
                                            ) : null}
                                          </View>
                                        </View>

                                        {/* Actions: Toggle paid + WhatsApp */}
                                        <View style={styles.memberItemActions}>
                                          <TouchableOpacity
                                            style={[
                                              styles.memberPayToggleBtn,
                                              isCyclePaid && styles.memberPayToggleBtnPaid,
                                            ]}
                                            onPress={() =>
                                              m._id && handleToggleMemberPayment(k._id, m._id, k.currentCycle)
                                            }
                                          >
                                            <Ionicons
                                              name={isCyclePaid ? 'checkmark-circle' : 'ellipse-outline'}
                                              size={13}
                                              color={isCyclePaid ? '#070d18' : '#94A3B8'}
                                            />
                                            <Text
                                              style={[
                                                styles.memberPayToggleText,
                                                isCyclePaid && styles.memberPayToggleTextPaid,
                                              ]}
                                            >
                                              {isCyclePaid ? 'قسط ادا' : 'قسط لیں'}
                                            </Text>
                                          </TouchableOpacity>

                                          <TouchableOpacity
                                            style={styles.memberShareBtn}
                                            onPress={() => m._id && handleSendMemberWhatsApp(k._id, m._id)}
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                          >
                                            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                                          </TouchableOpacity>

                                          <TouchableOpacity
                                            style={styles.memberDeleteBtn}
                                            onPress={() =>
                                              m._id &&
                                              handleDeleteMemberFromKameti(k._id, m._id, m.memberName)
                                            }
                                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                          >
                                            <Ionicons name="trash-outline" size={14} color="#FB7185" />
                                          </TouchableOpacity>
                                        </View>
                                      </View>

                                      {/* Mini Cycle progress for this member */}
                                      <View style={styles.memberCycleBeadsRow}>
                                        <Text style={styles.memberPaidStatsText}>
                                          ادا شدہ اقساط: {m.paidCycles ? m.paidCycles.length : 0} / {k.totalMonths}
                                        </Text>
                                        <Text style={styles.memberTurnStatusText}>
                                          {m.payoutReceived
                                            ? 'وصولی مکمل ہو چکی ہے ✅'
                                            : m.payoutMonth === k.currentCycle
                                            ? '🎉 رواں ماہ وصولی کا وقت'
                                            : m.payoutMonth > k.currentCycle
                                            ? `${m.payoutMonth - k.currentCycle} ماہ بعد وصولی`
                                            : 'وصولی باری گزر چکی ہے'}
                                        </Text>
                                      </View>
                                    </View>
                                  );
                                })
                              )}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Action Buttons Row */}
                      <View style={styles.cardButtonsRow}>
                        {/* Pay Installment Button */}
                        <TouchableOpacity
                          style={styles.payInstallmentBtn}
                          onPress={() => handleOpenPay(k)}
                        >
                          <Ionicons name="card-outline" size={15} color="#070d18" />
                          <Text style={styles.payInstallmentBtnText}>قسط جمع کروائیں</Text>
                        </TouchableOpacity>

                        {/* Collect Payout Pot (If eligible & not received) */}
                        {!k.payoutReceived && (
                          <TouchableOpacity
                            style={[
                              styles.collectPayoutBtn,
                              k.isPayoutDueNow && styles.collectPayoutBtnHighlight,
                            ]}
                            onPress={() => handleOpenPayout(k)}
                          >
                            <Ionicons
                              name="wallet"
                              size={15}
                              color={k.isPayoutDueNow ? '#070d18' : '#00d49f'}
                            />
                            <Text
                              style={[
                                styles.collectPayoutBtnText,
                                k.isPayoutDueNow && styles.collectPayoutBtnTextHighlight,
                              ]}
                            >
                              وصولی درج کریں
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* Advance Month Button */}
                        {k.status === 'ACTIVE' && (
                          <TouchableOpacity
                            style={styles.advanceMonthBtn}
                            onPress={() => handleAdvanceCycle(k)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="arrow-forward-outline" size={14} color="#94A3B8" />
                            <Text style={styles.advanceMonthBtnText}>اگلا ماہ</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}

        {/* ------------------------------------------------------------- */}
        {/* SUB-MODAL 1: Add New Kameti (With Dynamic Member Slots)        */}
        {/* ------------------------------------------------------------- */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>نئی کمیٹی شامل کریں</Text>
                  <Text style={styles.sheetSubtitle}>Add New Dynamic Kameti / BC Pool</Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setShowAddModal(false)}
                >
                  <Ionicons name="close" size={20} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {/* Role Switch: Member vs Organizer */}
                <Text style={styles.fieldLabel}>آپ کا کردار (Your Role)</Text>
                <View style={styles.roleToggleGroup}>
                  <TouchableOpacity
                    style={[
                      styles.roleToggleOption,
                      newRole === 'PARTICIPANT' && styles.roleToggleOptionActive,
                    ]}
                    onPress={() => setNewRole('PARTICIPANT')}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={newRole === 'PARTICIPANT' ? '#070d18' : '#C084FC'}
                    />
                    <Text
                      style={[
                        styles.roleToggleText,
                        newRole === 'PARTICIPANT' && styles.roleToggleTextActive,
                      ]}
                    >
                      میں ممبر ہوں (Participant)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleToggleOption,
                      newRole === 'ORGANIZER' && styles.roleToggleOptionActiveOrganizer,
                    ]}
                    onPress={() => setNewRole('ORGANIZER')}
                  >
                    <Ionicons
                      name="ribbon"
                      size={16}
                      color={newRole === 'ORGANIZER' ? '#070d18' : '#38BDF8'}
                    />
                    <Text
                      style={[
                        styles.roleToggleText,
                        newRole === 'ORGANIZER' && styles.roleToggleTextActive,
                      ]}
                    >
                      میں ہولڈر ہوں (Organizer)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={styles.fieldLabel}>کمیٹی کا نام (Title / Purpose) *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="مثلاً: محلہ کمیٹی (عید شاپنگ) یا دفتر بی سی"
                  placeholderTextColor="#475569"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                {/* Organizer Info (if member) */}
                {newRole === 'PARTICIPANT' && (
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>منتظم کا نام</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="حاجی اسلم صاحب"
                        placeholderTextColor="#475569"
                        value={newOrganizerName}
                        onChangeText={setNewOrganizerName}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>منتظم فون نمبر</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="0300-1234567"
                        placeholderTextColor="#475569"
                        keyboardType="phone-pad"
                        value={newOrganizerPhone}
                        onChangeText={setNewOrganizerPhone}
                      />
                    </View>
                  </View>
                )}

                {/* Financials: Contribution & Months */}
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>ماہانہ قسط (PKR) *</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="10000"
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                      value={newMonthlyContribution}
                      onChangeText={setNewMonthlyContribution}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.fieldLabel}>کل ماہ / ممبرز *</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="10"
                      placeholderTextColor="#475569"
                      keyboardType="numeric"
                      value={newTotalMonths}
                      onChangeText={handleMonthsChange}
                    />
                  </View>
                </View>

                {/* Calculated Pool Display */}
                <View style={styles.calculatedPoolCard}>
                  <View style={styles.calculatedPoolRow}>
                    <Text style={styles.calculatedPoolLabel}>کل کمیٹی پول (Total Pool Value):</Text>
                    <Text style={styles.calculatedPoolValue}>
                      Rs.{' '}
                      {(
                        (parseFloat(newMonthlyContribution) || 0) *
                        (parseInt(newTotalMonths, 10) || 0)
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Participant User Payout Turn */}
                {newRole === 'PARTICIPANT' && (
                  <View style={styles.formRow}>
                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>آپ کی وصولی کا مہینہ (Payout Turn)</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="مثلاً: 4"
                        placeholderTextColor="#475569"
                        keyboardType="numeric"
                        value={newUserPayoutMonth}
                        onChangeText={setNewUserPayoutMonth}
                      />
                    </View>
                    <View style={styles.formCol}>
                      <Text style={styles.fieldLabel}>شروع تاریخ (Start Date)</Text>
                      <TextInput
                        style={styles.inputField}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#475569"
                        value={newStartDate}
                        onChangeText={setNewStartDate}
                      />
                    </View>
                  </View>
                )}

                {/* ------------------------------------------------------------- */}
                {/* ORGANIZER SLOTS SECTION: ASSIGN EACH MONTH'S RECIPIENT MEMBER */}
                {/* ------------------------------------------------------------- */}
                {newRole === 'ORGANIZER' && (
                  <View style={styles.creationSlotsSection}>
                    <View style={styles.creationSlotsHeader}>
                      <Ionicons name="calendar" size={16} color="#38BDF8" />
                      <Text style={styles.creationSlotsTitle}>
                        کمیٹی ممبران اور وصولی کا مہینہ ({creationSlots.length} ماہ / ممبرز)
                      </Text>
                    </View>
                    <Text style={styles.creationSlotsHint}>
                      ہر مہینے کی وصولی کے لیے ممبر کا نام اور فون درج کریں یا فون بک سے چنیں:
                    </Text>

                    {creationSlots.map((slot) => {
                      const poolVal =
                        (parseFloat(newMonthlyContribution) || 0) *
                        (parseInt(newTotalMonths, 10) || 0);

                      return (
                        <View key={slot.payoutMonth} style={styles.slotCard}>
                          <View style={styles.slotCardTop}>
                            <View style={styles.slotMonthBadge}>
                              <Ionicons name="trophy" size={13} color="#F59E0B" />
                              <Text style={styles.slotMonthBadgeText}>
                                ماہ {slot.payoutMonth} وصولی • Rs. {poolVal.toLocaleString()}
                              </Text>
                            </View>

                            <View style={styles.slotQuickBtnsRow}>
                              <TouchableOpacity
                                style={[styles.slotQuickBtn, slot.isSelf && styles.slotQuickBtnActive]}
                                onPress={() => handleAssignSelfToSlot(slot.payoutMonth)}
                              >
                                <Ionicons
                                  name="person"
                                  size={11}
                                  color={slot.isSelf ? '#070d18' : '#C084FC'}
                                />
                                <Text
                                  style={[
                                    styles.slotQuickBtnText,
                                    slot.isSelf && styles.slotQuickBtnTextActive,
                                  ]}
                                >
                                  میں خود
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.slotQuickBtn}
                                onPress={() => handlePickContactForSlot(slot.payoutMonth)}
                              >
                                <Ionicons name="book-outline" size={11} color="#38BDF8" />
                                <Text style={[styles.slotQuickBtnText, { color: '#38BDF8' }]}>
                                  فون بک 📱
                                </Text>
                              </TouchableOpacity>

                              {/* Delete Slot Button */}
                              <TouchableOpacity
                                style={styles.slotDeleteBtn}
                                onPress={() => handleDeleteSlot(slot.payoutMonth)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="trash-outline" size={13} color="#FB7185" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={styles.slotInputsRow}>
                            <TextInput
                              style={[styles.inputField, { flex: 1.2 }]}
                              placeholder="ممبر کا نام"
                              placeholderTextColor="#475569"
                              value={slot.memberName}
                              onChangeText={(text) => handleUpdateSlotName(slot.payoutMonth, text)}
                            />
                            <TextInput
                              style={[styles.inputField, { flex: 1 }]}
                              placeholder="0300-1234567"
                              placeholderTextColor="#475569"
                              keyboardType="phone-pad"
                              value={slot.memberPhone}
                              onChangeText={(text) => handleUpdateSlotPhone(slot.payoutMonth, text)}
                            />
                          </View>

                          {slot.isGharUser ? (
                            <View style={styles.slotGharTag}>
                              <Ionicons name="shield-checkmark" size={11} color="#00d49f" />
                              <Text style={styles.slotGharTagText}>
                                DigiHisab ایپ صارف (محفوظ ہونے پر خودکار نوٹیفکیشن موصول ہوگا)
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}

                    {/* Dynamic Add Slot Button */}
                    <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddSlot}>
                      <Ionicons name="add-circle" size={16} color="#38BDF8" />
                      <Text style={styles.addSlotBtnText}>
                        + نیا سلاٹ / اگلا مہینہ شامل کریں (ماہ {creationSlots.length + 1})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Notes */}
                <Text style={styles.fieldLabel}>اضافی نوٹ / تفصیل (اختیاری)</Text>
                <TextInput
                  style={[styles.inputField, styles.textArea]}
                  placeholder="کوئی خاص شرط، قرعہ اندازی یا تاریخ کی تفصیل"
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={2}
                  value={newNotes}
                  onChangeText={setNewNotes}
                />

                {/* Submit Add Button */}
                <TouchableOpacity
                  style={[styles.confirmSheetBtn, submitting && styles.btnDisabled]}
                  onPress={handleCreateKameti}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#070d18" />
                      <Text style={styles.confirmSheetBtnText}>
                        {newRole === 'ORGANIZER'
                          ? 'کمیٹی اور وصولی شیڈول محفوظ کریں'
                          : 'کمیٹی محفوظ کریں'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ------------------------------------------------------------- */}
        {/* SUB-MODAL 2: Pay Installment with Vault Sync                   */}
        {/* ------------------------------------------------------------- */}
        <Modal
          visible={!!selectedKametiForPay}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedKametiForPay(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>ماہانہ قسط جمع کروائیں</Text>
                  <Text style={styles.sheetSubtitle}>
                    {selectedKametiForPay?.title} • ماہ {payCycleNumber} /{' '}
                    {selectedKametiForPay?.totalMonths}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setSelectedKametiForPay(null)}
                >
                  <Ionicons name="close" size={20} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {/* Cycle selector */}
                <Text style={styles.fieldLabel}>قسط نمبر (Cycle Month)</Text>
                <View style={styles.cycleSelectorRow}>
                  {Array.from(
                    { length: selectedKametiForPay?.totalMonths || 1 },
                    (_, i) => i + 1
                  ).map((cNum) => {
                    const isSelected = payCycleNumber === cNum;
                    const isAlreadyPaid = selectedKametiForPay?.installments.some(
                      (ins) => ins.cycleNumber === cNum
                    );
                    return (
                      <TouchableOpacity
                        key={cNum}
                        style={[
                          styles.cycleSelectChip,
                          isSelected && styles.cycleSelectChipActive,
                          isAlreadyPaid && styles.cycleSelectChipPaid,
                        ]}
                        onPress={() => setPayCycleNumber(cNum)}
                      >
                        <Text
                          style={[
                            styles.cycleSelectChipText,
                            isSelected && styles.cycleSelectChipTextActive,
                          ]}
                        >
                          ماہ {cNum} {isAlreadyPaid ? '✓' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Amount */}
                <Text style={styles.fieldLabel}>قسط کی رقم (PKR)</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="رقم درج کریں"
                  placeholderTextColor="#475569"
                />

                {/* Source Vault Selection (Double-Entry Debit) */}
                <Text style={styles.fieldLabel}>
                  ادائیگی کا اکاؤنٹ / والٹ (Debit Source Vault)
                </Text>
                <View style={styles.vaultSelectionGrid}>
                  {availableVaults.map((vault) => {
                    const isSelected = payVaultId === vault.id;
                    return (
                      <TouchableOpacity
                        key={vault.id}
                        style={[
                          styles.vaultOptionCard,
                          isSelected && styles.vaultOptionCardActive,
                        ]}
                        onPress={() => setPayVaultId(vault.id)}
                      >
                        <View style={styles.vaultOptionTop}>
                          <Ionicons
                            name={
                              vault.accountType === 'COMMERCIAL_BANK'
                                ? 'business'
                                : vault.accountType === 'MOBILE_WALLET'
                                ? 'phone-portrait'
                                : 'cash'
                            }
                            size={16}
                            color={isSelected ? '#00d49f' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.vaultOptionTitle,
                              isSelected && styles.vaultOptionTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {vault.accountTitle}
                          </Text>
                        </View>
                        <Text style={styles.vaultOptionBalance}>
                          Rs. {vault.currentBalance.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Payment Channel */}
                <Text style={styles.fieldLabel}>ادائیگی کا ذریعہ (Mode)</Text>
                <View style={styles.modePillsRow}>
                  {['CASH', 'RAAST', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modePill, payMode === m && styles.modePillActive]}
                      onPress={() => setPayMode(m)}
                    >
                      <Text style={[styles.modePillText, payMode === m && styles.modePillTextActive]}>
                        {m === 'CASH'
                          ? 'نقدی (Cash)'
                          : m === 'RAAST'
                          ? 'راست (Raast)'
                          : m === 'BANK_TRANSFER'
                          ? 'بینک ٹرانسفر'
                          : m === 'JAZZCASH'
                          ? 'جاز کیش'
                          : 'ایزی پیسہ'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes */}
                <Text style={styles.fieldLabel}>اضافی تفصیل / رسید ریفرنس</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="مثلاً: ٹرانزیکشن آئی ڈی یا رسید نمبر"
                  placeholderTextColor="#475569"
                  value={payNotes}
                  onChangeText={setPayNotes}
                />

                {/* Submit Pay */}
                <TouchableOpacity
                  style={[styles.confirmSheetBtn, submitting && styles.btnDisabled]}
                  onPress={handleSubmitPayment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={18} color="#070d18" />
                      <Text style={styles.confirmSheetBtnText}>
                        قسط ادا کریں اور کھاتہ اپ ڈیٹ کریں
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ------------------------------------------------------------- */}
        {/* SUB-MODAL 3: Collect Payout Pot with Vault Sync               */}
        {/* ------------------------------------------------------------- */}
        <Modal
          visible={!!selectedKametiForPayout}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedKametiForPayout(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>کمیٹی کی رقم وصول کریں</Text>
                  <Text style={styles.sheetSubtitle}>
                    {selectedKametiForPayout?.title} • فل پول وصولی
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setSelectedKametiForPayout(null)}
                >
                  <Ionicons name="close" size={20} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {/* Celebration Header */}
                <View style={styles.payoutCongratCard}>
                  <Ionicons name="trophy" size={24} color="#00d49f" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.payoutCongratTitle}>کمیٹی وصولی کا عمل</Text>
                    <Text style={styles.payoutCongratSub}>
                      رقم وصول ہونے کے بعد آپ کے منتخب کردہ والٹ اکاؤنٹ میں فوری جمع ہو جائے گی۔
                    </Text>
                  </View>
                </View>

                {/* Payout Amount */}
                <Text style={styles.fieldLabel}>وصول شدہ رقم (PKR)</Text>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  value={payoutAmount}
                  onChangeText={setPayoutAmount}
                  placeholder="کل پول رقم"
                  placeholderTextColor="#475569"
                />

                {/* Destination Vault Selection (Double-Entry Credit) */}
                <Text style={styles.fieldLabel}>
                  کس والٹ یا اکاؤنٹ میں جمع کرنی ہے؟ (Credit Destination Vault)
                </Text>
                <View style={styles.vaultSelectionGrid}>
                  {availableVaults.map((vault) => {
                    const isSelected = payoutVaultId === vault.id;
                    return (
                      <TouchableOpacity
                        key={vault.id}
                        style={[
                          styles.vaultOptionCard,
                          isSelected && styles.vaultOptionCardActive,
                        ]}
                        onPress={() => setPayoutVaultId(vault.id)}
                      >
                        <View style={styles.vaultOptionTop}>
                          <Ionicons
                            name={
                              vault.accountType === 'COMMERCIAL_BANK'
                                ? 'business'
                                : vault.accountType === 'MOBILE_WALLET'
                                ? 'phone-portrait'
                                : 'cash'
                            }
                            size={16}
                            color={isSelected ? '#00d49f' : '#94A3B8'}
                          />
                          <Text
                            style={[
                              styles.vaultOptionTitle,
                              isSelected && styles.vaultOptionTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {vault.accountTitle}
                          </Text>
                        </View>
                        <Text style={styles.vaultOptionBalance}>
                          Rs. {vault.currentBalance.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Payment Channel */}
                <Text style={styles.fieldLabel}>وصولی کا ذریعہ</Text>
                <View style={styles.modePillsRow}>
                  {['BANK_TRANSFER', 'CASH', 'CHEQUE', 'RAAST'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modePill, payoutMode === m && styles.modePillActive]}
                      onPress={() => setPayoutMode(m)}
                    >
                      <Text style={[styles.modePillText, payoutMode === m && styles.modePillTextActive]}>
                        {m === 'BANK_TRANSFER'
                          ? 'بینک ٹرانسفر'
                          : m === 'CASH'
                          ? 'نقدی کیش'
                          : m === 'CHEQUE'
                          ? 'بینک چیک'
                          : 'راست (Raast)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes */}
                <Text style={styles.fieldLabel}>تفصیل / نوٹ</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="مثلاً: چیک نمبر یا والٹ وصولی تصدیق"
                  placeholderTextColor="#475569"
                  value={payoutNotes}
                  onChangeText={setPayoutNotes}
                />

                {/* Submit Payout */}
                <TouchableOpacity
                  style={[
                    styles.confirmSheetBtn,
                    { backgroundColor: '#00d49f' },
                    submitting && styles.btnDisabled,
                  ]}
                  onPress={handleSubmitPayout}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#070d18" />
                      <Text style={styles.confirmSheetBtnText}>
                        وصولی کنفرم کریں اور والٹ میں شامل کریں
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ------------------------------------------------------------- */}
        {/* SUB-MODAL 4: Add Single Member & Phonebook Contact Picker     */}
        {/* ------------------------------------------------------------- */}
        <Modal
          visible={!!selectedKametiForAddMember}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedKametiForAddMember(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>کمیٹی میں ممبر شامل کریں</Text>
                  <Text style={styles.sheetSubtitle}>
                    {selectedKametiForAddMember?.title} • باہمی منسلک کھاتہ
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setSelectedKametiForAddMember(null)}
                >
                  <Ionicons name="close" size={20} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                {/* 1-Tap Phonebook Import Button */}
                <TouchableOpacity
                  style={styles.pickFromPhonebookBtn}
                  onPress={handlePickFromPhonebook}
                >
                  <Ionicons name="book-outline" size={18} color="#38BDF8" />
                  <Text style={styles.pickFromPhonebookBtnText}>
                    موبائل فون بک / رابطوں سے ممبر منتخب کریں 📱
                  </Text>
                </TouchableOpacity>

                {/* Member Name */}
                <Text style={styles.fieldLabel}>ممبر کا نام (Member Name) *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="مثلاً: احمد حسن، چوہدری عابد صاحب"
                  placeholderTextColor="#475569"
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                />

                {/* Member Phone with Live DB Lookup */}
                <Text style={styles.fieldLabel}>موبائل فون نمبر (Mobile Phone) *</Text>
                <View style={styles.phoneInputRow}>
                  <TextInput
                    style={[styles.inputField, { flex: 1 }]}
                    placeholder="0300-1234567"
                    placeholderTextColor="#475569"
                    keyboardType="phone-pad"
                    value={newMemberPhone}
                    onChangeText={checkMemberPhone}
                  />
                  {lookupLoading && (
                    <View style={styles.lookupLoader}>
                      <ActivityIndicator size="small" color="#38BDF8" />
                    </View>
                  )}
                </View>

                {/* Live Lookup Persona Indicator */}
                {lookupResult && (
                  <View
                    style={[
                      styles.lookupResultCard,
                      lookupResult.isRegistered && lookupResult.isGharPersona
                        ? styles.lookupResultCardGhar
                        : styles.lookupResultCardExternal,
                    ]}
                  >
                    <Ionicons
                      name={
                        lookupResult.isRegistered && lookupResult.isGharPersona
                          ? 'checkmark-circle'
                          : 'logo-whatsapp'
                      }
                      size={18}
                      color={
                        lookupResult.isRegistered && lookupResult.isGharPersona
                          ? '#00d49f'
                          : '#38BDF8'
                      }
                    />
                    <View style={{ flex: 1 }}>
                      {lookupResult.isRegistered && lookupResult.isGharPersona ? (
                        <>
                          <Text style={[styles.lookupResultTitle, { color: '#00d49f' }]}>
                            ✓ DigiHisab ایپ صارف (Ghar Persona) مل گیا!
                          </Text>
                          <Text style={styles.lookupResultSub}>
                            شمولیت پر ممبر کے فون پر خودکار نوٹیفکیشن اور منسلک کمیٹی سنک ہو جائے گی۔
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.lookupResultTitle, { color: '#38BDF8' }]}>
                            غیر رجسٹرڈ رابطہ (واٹس ایپ دعوت دستیاب ہے)
                          </Text>
                          <Text style={styles.lookupResultSub}>
                            شمولیت کے بعد 1-ٹیپ سے ممبر کو واٹس ایپ پر کمیٹی کی تفصیلات بھیجی جا سکتی ہیں۔
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* Payout Turn Selector (Month 1 to totalMonths) */}
                <Text style={styles.fieldLabel}>
                  اس ممبر کی وصولی کا مہینہ (Payout Turn Month) *
                </Text>
                <View style={styles.cycleSelectorRow}>
                  {Array.from(
                    { length: selectedKametiForAddMember?.totalMonths || 10 },
                    (_, i) => i + 1
                  ).map((mNum) => {
                    const isSelected = parseInt(newMemberPayoutMonth, 10) === mNum;
                    const isTakenByAnother = selectedKametiForAddMember?.members.some(
                      (m) => m.payoutMonth === mNum
                    );

                    return (
                      <TouchableOpacity
                        key={mNum}
                        style={[
                          styles.cycleSelectChip,
                          isSelected && styles.cycleSelectChipActive,
                          isTakenByAnother && styles.cycleSelectChipTaken,
                        ]}
                        onPress={() => setNewMemberPayoutMonth(String(mNum))}
                      >
                        <Text
                          style={[
                            styles.cycleSelectChipText,
                            isSelected && styles.cycleSelectChipTextActive,
                            isTakenByAnother && styles.cycleSelectChipTextTaken,
                          ]}
                        >
                          ماہ {mNum} {isTakenByAnother ? '(مقرر)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Submit Add Member Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmSheetBtn,
                    { backgroundColor: '#38BDF8' },
                    submitting && styles.btnDisabled,
                  ]}
                  onPress={handleSubmitAddMember}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="person-add" size={18} color="#070d18" />
                      <Text style={styles.confirmSheetBtnText}>
                        {lookupResult?.isGharPersona
                          ? 'ایپ میں شامل کریں اور نوٹیفکیشن بھیجیں'
                          : 'ممبر شامل کریں'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ------------------------------------------------------------- */}
        {/* SUB-MODAL 5: Contact Picker List from Device Phonebook        */}
        {/* ------------------------------------------------------------- */}
        <Modal
          visible={showContactPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowContactPicker(false);
            setTargetSlotForContact(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop, { height: '80%' }]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>فون بک سے رابطہ منتخب کریں</Text>
                  <Text style={styles.sheetSubtitle}>
                    {targetSlotForContact !== null
                      ? `ماہ ${targetSlotForContact} کی وصولی کے لیے ممبر منتخب کریں`
                      : 'Select Member from Mobile Contacts'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => {
                    setShowContactPicker(false);
                    setTargetSlotForContact(null);
                  }}
                >
                  <Ionicons name="close" size={20} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              {/* Search Box */}
              <View style={styles.contactSearchWrap}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.contactSearchInput}
                  placeholder="نام یا فون نمبر سے تلاش کریں..."
                  placeholderTextColor="#475569"
                  value={contactSearchQuery}
                  onChangeText={setContactSearchQuery}
                />
                {contactSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Contacts FlatList */}
              <FlatList
                data={filteredContacts}
                keyExtractor={(item, idx) => `${item.phone}-${idx}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contactRowItem}
                    onPress={() => handleSelectContact(item)}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.contactRowName}>{item.name}</Text>
                      <Text style={styles.contactRowPhone}>{item.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#94A3B8', fontSize: 13 }}>کوئی رابطہ نہیں ملا</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>

        {/* ------------------------------------------------------------- */}
        {/* SUB-MODAL 6: Swap Payout Turn Months Between Members          */}
        {/* ------------------------------------------------------------- */}
        <Modal
          visible={!!swapModalKameti}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSwapModalKameti(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, isDesktop && styles.modalSheetDesktop]}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>وصولی کے مہینوں کا تبادلہ (Swap Turns)</Text>
                  <Text style={styles.sheetSubtitle}>
                    {swapModalKameti?.title} • قرعہ اندازی یا باہمی تبدیلی
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={() => setSwapModalKameti(null)}
                >
                  <Ionicons name="close" size={20} color="#F8FAFC" />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetBody}>
                <Text style={styles.fieldLabel}>پہلا ممبر منتخب کریں</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {swapModalKameti?.members.map((m) => (
                    <TouchableOpacity
                      key={m._id ? m._id.toString() : m.memberName}
                      style={[
                        styles.swapMemberChip,
                        swapMember1Id === (m._id ? m._id.toString() : '') && styles.swapMemberChipActive,
                      ]}
                      onPress={() => setSwapMember1Id(m._id ? m._id.toString() : '')}
                    >
                      <Text
                        style={[
                          styles.swapMemberChipText,
                          swapMember1Id === (m._id ? m._id.toString() : '') && styles.swapMemberChipTextActive,
                        ]}
                      >
                        {m.memberName} (ماہ {m.payoutMonth})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <Ionicons name="swap-vertical" size={24} color="#F59E0B" />
                </View>

                <Text style={styles.fieldLabel}>دوسرا ممبر منتخب کریں جس سے باری تبدیل کرنی ہے</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {swapModalKameti?.members
                    .filter((m) => (m._id ? m._id.toString() : '') !== swapMember1Id)
                    .map((m) => (
                      <TouchableOpacity
                        key={m._id ? m._id.toString() : m.memberName}
                        style={[
                          styles.swapMemberChip,
                          swapMember2Id === (m._id ? m._id.toString() : '') && styles.swapMemberChipActive,
                        ]}
                        onPress={() => setSwapMember2Id(m._id ? m._id.toString() : '')}
                      >
                        <Text
                          style={[
                            styles.swapMemberChipText,
                            swapMember2Id === (m._id ? m._id.toString() : '') && styles.swapMemberChipTextActive,
                          ]}
                        >
                          {m.memberName} (ماہ {m.payoutMonth})
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.confirmSheetBtn,
                    { backgroundColor: '#F59E0B' },
                    submitting && styles.btnDisabled,
                  ]}
                  onPress={handleConfirmSwapMonths}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#070d18" />
                  ) : (
                    <>
                      <Ionicons name="swap-horizontal" size={18} color="#070d18" />
                      <Text style={styles.confirmSheetBtnText}>باریوں کا تبادلہ محفوظ کریں</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070d18',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0d1627',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleUrdu: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(192, 132, 252, 0.16)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C084FC',
  },
  liveTagText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  // Top 4 Metrics Strip
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#0d1627',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 4,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryCardLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  summaryCardSub: {
    color: '#64748B',
    fontSize: 10,
  },
  // Celebration Radar Banner
  celebrationBanner: {
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00d49f',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  celebrationGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 212, 159, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationTextCol: {
    flex: 1,
  },
  celebrationHeading: {
    color: '#00d49f',
    fontSize: 13,
    fontWeight: 'bold',
  },
  celebrationSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  celebrationBtn: {
    backgroundColor: '#00d49f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  celebrationBtnText: {
    color: '#070d18',
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Action Toolbar
  actionToolbar: {
    flexDirection: 'column',
    gap: 10,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#0d1627',
    borderWidth: 1,
    borderColor: '#17233b',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    borderColor: '#C084FC',
  },
  filterTabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#C084FC',
    fontWeight: 'bold',
  },
  addKametiPrimaryBtn: {
    backgroundColor: '#C084FC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addKametiPrimaryBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
  // Empty State
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    gap: 12,
    marginTop: 10,
  },
  emptyStateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyStateSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyAddBtn: {
    backgroundColor: '#C084FC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  emptyAddBtnText: {
    color: '#070d18',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Kameti Cards
  kametiList: {
    gap: 14,
  },
  kametiCard: {
    backgroundColor: '#0d1627',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 14,
    gap: 12,
  },
  kametiCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kametiTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  kametiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kametiTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeMember: {
    backgroundColor: 'rgba(192, 132, 252, 0.16)',
  },
  roleBadgeOrganizer: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  roleBadgeTextMember: {
    color: '#C084FC',
  },
  roleBadgeTextOrganizer: {
    color: '#38BDF8',
  },
  cycleBadge: {
    color: '#94A3B8',
    fontSize: 10,
  },
  completedBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedBadgeText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  topActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070d18',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  organizerText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  organizerNameText: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contactBtnText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
  },
  // Card Radar Box
  cardRadarBox: {
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  cardRadarBoxUpcoming: {
    backgroundColor: 'rgba(192, 132, 252, 0.08)',
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  cardRadarBoxDueNow: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
  },
  cardRadarBoxPaid: {
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    borderColor: 'rgba(0, 212, 159, 0.3)',
  },
  cardRadarTextCol: {
    flex: 1,
  },
  cardRadarTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardRadarDebtorWarning: {
    color: '#FB7185',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  // Card Metrics Grid
  cardMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#070d18',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
  },
  cardMetricItem: {
    flex: 1,
    minWidth: '45%',
  },
  cardMetricLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  cardMetricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Progress Bar
  progressContainer: {
    gap: 4,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#070d18',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#C084FC',
    borderRadius: 3,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  progressPercentText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Cycle Beads
  cycleBeadsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cycleBead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleBeadPaid: {
    backgroundColor: '#00d49f',
    borderColor: '#00d49f',
  },
  cycleBeadPayout: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  cycleBeadCurrent: {
    borderColor: '#C084FC',
    borderWidth: 2,
  },
  cycleBeadText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  // Organizer Roster Section
  organizerRosterSection: {
    backgroundColor: '#070d18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    gap: 8,
  },
  organizerRosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rosterTitleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rosterTitleText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  swapTurnsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  swapTurnsBtnText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addMemberBtn: {
    backgroundColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addMemberBtnText: {
    color: '#070d18',
    fontSize: 10,
    fontWeight: 'bold',
  },
  membersListContainer: {
    gap: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 8,
  },
  noMembersHint: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
  },
  memberItemCard: {
    backgroundColor: '#0d1627',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 8,
    gap: 6,
  },
  memberItemCardDueRecipient: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  memberItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberItemNameCol: {
    flex: 1,
    gap: 2,
  },
  memberNameText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  linkedBadgeText: {
    color: '#00d49f',
    fontSize: 9,
    fontWeight: '600',
  },
  unregisteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  unregisteredBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '600',
  },
  memberPayoutTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  payoutMonthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  payoutMonthPillDueNow: {
    backgroundColor: '#F59E0B',
  },
  payoutMonthPillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  payoutMonthPillTextDueNow: {
    color: '#070d18',
  },
  memberPhoneText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  memberItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberPayToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  memberPayToggleBtnPaid: {
    backgroundColor: '#00d49f',
    borderColor: '#00d49f',
  },
  memberPayToggleText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  memberPayToggleTextPaid: {
    color: '#070d18',
    fontWeight: 'bold',
  },
  memberShareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCycleBeadsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#17233b',
    paddingTop: 4,
  },
  memberPaidStatsText: {
    color: '#64748B',
    fontSize: 9,
  },
  memberTurnStatusText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '600',
  },
  // Card Buttons Row
  cardButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  payInstallmentBtn: {
    flex: 1,
    backgroundColor: '#C084FC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  payInstallmentBtnText: {
    color: '#070d18',
    fontSize: 11,
    fontWeight: 'bold',
  },
  collectPayoutBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    borderWidth: 1,
    borderColor: '#00d49f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  collectPayoutBtnHighlight: {
    backgroundColor: '#00d49f',
  },
  collectPayoutBtnText: {
    color: '#00d49f',
    fontSize: 11,
    fontWeight: 'bold',
  },
  collectPayoutBtnTextHighlight: {
    color: '#070d18',
  },
  advanceMonthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },
  advanceMonthBtnText: {
    color: '#94A3B8',
    fontSize: 11,
  },

  // -------------------------------------------------------------
  // Modals / Sheets Styling
  // -------------------------------------------------------------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0d1627',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#17233b',
    maxHeight: '90%',
  },
  modalSheetDesktop: {
    maxWidth: 580,
    alignSelf: 'center',
    borderRadius: 24,
    marginBottom: 40,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#070d18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  sheetBody: {
    padding: 16,
  },
  fieldLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  inputField: {
    backgroundColor: '#070d18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formCol: {
    flex: 1,
  },
  roleToggleGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  roleToggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  roleToggleOptionActive: {
    backgroundColor: '#C084FC',
    borderColor: '#C084FC',
  },
  roleToggleOptionActiveOrganizer: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  roleToggleText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  roleToggleTextActive: {
    color: '#070d18',
  },
  calculatedPoolCard: {
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 159, 0.3)',
    padding: 10,
    marginTop: 10,
  },
  calculatedPoolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculatedPoolLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  calculatedPoolValue: {
    color: '#00d49f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Creation Slots Section
  creationSlotsSection: {
    marginTop: 14,
    backgroundColor: '#070d18',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 12,
    gap: 10,
  },
  creationSlotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creationSlotsTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  creationSlotsHint: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  slotCard: {
    backgroundColor: '#0d1627',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    gap: 8,
  },
  slotCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotMonthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slotMonthBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  slotQuickBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotQuickBtnActive: {
    backgroundColor: '#C084FC',
    borderColor: '#C084FC',
  },
  slotQuickBtnText: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: 'bold',
  },
  slotQuickBtnTextActive: {
    color: '#070d18',
  },
  slotDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderStyle: 'dashed',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 6,
  },
  addSlotBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  memberDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(251, 113, 133, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotGharTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 212, 159, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  slotGharTagText: {
    color: '#00d49f',
    fontSize: 10,
    fontWeight: '600',
  },
  confirmSheetBtn: {
    backgroundColor: '#C084FC',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 20,
  },
  confirmSheetBtnText: {
    color: '#070d18',
    fontSize: 13,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  // Cycle Selector for Pay
  cycleSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cycleSelectChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  cycleSelectChipActive: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
  },
  cycleSelectChipPaid: {
    borderColor: '#00d49f',
  },
  cycleSelectChipTaken: {
    borderColor: '#64748B',
    opacity: 0.7,
  },
  cycleSelectChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  cycleSelectChipTextActive: {
    color: '#C084FC',
    fontWeight: 'bold',
  },
  cycleSelectChipTextTaken: {
    color: '#64748B',
  },
  // Vault Selection
  vaultSelectionGrid: {
    gap: 6,
  },
  vaultOptionCard: {
    backgroundColor: '#070d18',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#17233b',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vaultOptionCardActive: {
    borderColor: '#00d49f',
    backgroundColor: 'rgba(0, 212, 159, 0.08)',
  },
  vaultOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  vaultOptionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  vaultOptionTitleActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  vaultOptionBalance: {
    color: '#00d49f',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Mode Pills
  modePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
  },
  modePillActive: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
  },
  modePillText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  modePillTextActive: {
    color: '#C084FC',
    fontWeight: 'bold',
  },
  // Payout Congrats Card
  payoutCongratCard: {
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d49f',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutCongratTitle: {
    color: '#00d49f',
    fontSize: 13,
    fontWeight: 'bold',
  },
  payoutCongratSub: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  // Member & Contact Picker Styles
  pickFromPhonebookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickFromPhonebookBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  lookupLoader: {
    position: 'absolute',
    right: 12,
  },
  lookupResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
  },
  lookupResultCardGhar: {
    backgroundColor: 'rgba(0, 212, 159, 0.1)',
    borderColor: '#00d49f',
  },
  lookupResultCardExternal: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: '#38BDF8',
  },
  lookupResultTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lookupResultSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  contactSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#070d18',
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contactSearchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  contactRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#17233b',
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactAvatarText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  contactRowName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  contactRowPhone: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  // Swap Member Chips
  swapMemberChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#070d18',
    borderWidth: 1,
    borderColor: '#17233b',
    marginRight: 8,
  },
  swapMemberChipActive: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  swapMemberChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  swapMemberChipTextActive: {
    color: '#F59E0B',
    fontWeight: 'bold',
  },
});
