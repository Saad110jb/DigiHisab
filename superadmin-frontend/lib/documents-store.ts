import { IKycDocumentRecord, KycSubmissionStatus, NadraVerisysMockStatus } from '@/types/admin';

// In-memory Master Store for Document & KYC Intelligence Desk
export let KYC_DOCUMENTS_STORE: IKycDocumentRecord[] = [
  {
    id: 'DOC_001',
    userId: 'USR_9921',
    userName: 'Muhammad Saad',
    userPhone: '+923009663004',
    userPersona: 'DUKANDAR',
    entityName: 'Saad store',
    city: 'Faisalabad (Chak 110 JB)',
    // High-resolution Pakistani Smart CNIC SVGs with realistic chip, crest, and watermarks
    frontImageUrl: 'https://images.unsplash.com/photo-1633265486064-086b219458ec?auto=format&fit=crop&w=800&q=80',
    backImageUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    status: 'APPROVED',
    ocrDetails: {
      cnicNumber: '33101-2155778-3',
      fullName: 'Muhammad Saad',
      fatherOrHusbandName: 'Bashir Ahmad',
      dateOfBirth: '14.08.1994',
      issueDate: '28.11.2021',
      expiryDate: '28.11.2031',
      gender: 'M',
      familyTreeNumber: 'FT-9921-FAIS',
      addressUrdu: 'چک نمبر 110 ج ب، جھنگ روڈ، فیصل آباد',
      confidenceScore: 99.1,
      extractedAt: '2026-11-04 11:20 PKT'
    },
    profileComparison: {
      cnicMatch: true,
      nameMatch: true,
      dobMatch: true,
      overallConfidence: 99.1
    },
    nadraVerisys: {
      status: 'VERIFIED',
      simulatedLookupId: 'NADRA_SIM_8821094',
      biometricMatchScore: 98.4,
      lastCheckedAt: '2026-11-04 11:22 PKT',
      remarks: 'Citizen identity confirmed via Simulated NADRA Verisys Engine (National Database Match).'
    },
    expiryStatus: {
      expiryDate: '2031-11-28',
      daysRemaining: 1850,
      isExpiringWithin30Days: false,
      isExpired: false
    },
    submittedAt: '2026-11-04 10:15 PKT',
    reviewedAt: '2026-11-04 11:30 PKT',
    reviewedBy: 'SuperAdmin Sentinel'
  },
  {
    id: 'DOC_002',
    userId: 'USR_8812',
    userName: 'Tariq Mehmood',
    userPhone: '+923014589211',
    userPersona: 'HOUSEHOLD',
    entityName: 'Mehmood House #14',
    city: 'Lahore (Model Town)',
    frontImageUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=800&q=80',
    backImageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    status: 'PENDING_REVIEW',
    ocrDetails: {
      cnicNumber: '35201-9876543-3',
      fullName: 'Tariq Mehmood',
      fatherOrHusbandName: 'Muhammad Mehmood Akhtar',
      dateOfBirth: '10.02.1988',
      issueDate: '15.01.2022',
      expiryDate: '15.01.2032',
      gender: 'M',
      familyTreeNumber: 'FT-8812-LHR',
      addressUrdu: 'مکان نمبر 14، بلاک سی، ماڈل ٹاؤن، لاہور',
      confidenceScore: 96.8,
      extractedAt: '2026-11-04 14:10 PKT'
    },
    profileComparison: {
      cnicMatch: true,
      nameMatch: true,
      dobMatch: true,
      overallConfidence: 96.8
    },
    nadraVerisys: {
      status: 'PENDING_CHECK',
      simulatedLookupId: 'NADRA_SIM_PENDING',
      biometricMatchScore: 0,
      lastCheckedAt: 'Not yet verified',
      remarks: 'Simulated Verisys query queued. Ready for admin-triggered mock check.'
    },
    expiryStatus: {
      expiryDate: '2032-01-15',
      daysRemaining: 1898,
      isExpiringWithin30Days: false,
      isExpired: false
    },
    submittedAt: '2026-11-04 14:05 PKT'
  },
  {
    id: 'DOC_003',
    userId: 'USR_6610',
    userName: 'Kamran Karyana Store',
    userPhone: '+923456781290',
    userPersona: 'DUKANDAR',
    entityName: 'Kamran Bakers & Store',
    city: 'Jhang',
    frontImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
    backImageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
    status: 'EXPIRING_SOON',
    ocrDetails: {
      cnicNumber: '33100-8812399-7',
      fullName: 'Kamran Ali',
      fatherOrHusbandName: 'Muhammad Akram',
      dateOfBirth: '05.07.1984',
      issueDate: '20.11.2016',
      expiryDate: '20.11.2026', // Expiring in 16 days!
      gender: 'M',
      familyTreeNumber: 'FT-6610-JHNG',
      addressUrdu: 'شاہد روڈ بازار، جھنگ سٹی',
      confidenceScore: 94.2,
      extractedAt: '2026-11-04 09:12 PKT'
    },
    profileComparison: {
      cnicMatch: true,
      nameMatch: true,
      dobMatch: true,
      overallConfidence: 94.2
    },
    nadraVerisys: {
      status: 'VERIFIED',
      simulatedLookupId: 'NADRA_SIM_661088',
      biometricMatchScore: 92.0,
      lastCheckedAt: '2026-11-04 09:15 PKT',
      remarks: 'Card verified in NADRA database but expiry date is within 30 days. Renewal required.'
    },
    expiryStatus: {
      expiryDate: '2026-11-20',
      daysRemaining: 16,
      isExpiringWithin30Days: true,
      isExpired: false
    },
    submittedAt: '2026-11-04 09:00 PKT'
  },
  {
    id: 'DOC_004',
    userId: 'USR_5521',
    userName: 'Sheikh Usman Ali',
    userPhone: '+923214580911',
    userPersona: 'HOUSEHOLD',
    entityName: 'Gharana Haveli (G-11)',
    city: 'Islamabad',
    frontImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    backImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
    status: 'PENDING_REVIEW',
    ocrDetails: {
      cnicNumber: '33102-9901234-9',
      fullName: 'Sheikh Usman Ali',
      fatherOrHusbandName: 'Sheikh Liaquat Ali',
      dateOfBirth: '22.09.1991',
      issueDate: '01.06.2020',
      expiryDate: '01.06.2030',
      gender: 'M',
      familyTreeNumber: 'FT-5521-ISB',
      addressUrdu: 'گلی نمبر 18، سیکٹر جی 11/2، اسلام آباد',
      confidenceScore: 97.5,
      extractedAt: '2026-11-04 16:30 PKT'
    },
    profileComparison: {
      cnicMatch: true,
      nameMatch: true,
      dobMatch: true,
      overallConfidence: 97.5
    },
    nadraVerisys: {
      status: 'PENDING_CHECK',
      simulatedLookupId: 'NADRA_SIM_PENDING',
      biometricMatchScore: 0,
      lastCheckedAt: 'Not yet verified',
      remarks: 'Pending admin review and NADRA check.'
    },
    expiryStatus: {
      expiryDate: '2030-06-01',
      daysRemaining: 1305,
      isExpiringWithin30Days: false,
      isExpired: false
    },
    submittedAt: '2026-11-04 16:25 PKT'
  },
  {
    id: 'DOC_005',
    userId: 'USR_3311',
    userName: 'Chaudhry Riaz Ahmad',
    userPhone: '+923028877110',
    userPersona: 'HOUSEHOLD',
    entityName: 'Riaz Farmhouse & Tenancy',
    city: 'Gujranwala',
    frontImageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=800&q=80',
    backImageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=800&q=80',
    status: 'REJECTED',
    ocrDetails: {
      cnicNumber: '34101-6677889-5',
      fullName: 'Riaz Ahmad',
      fatherOrHusbandName: 'Chaudhry Ghulam Rasool',
      dateOfBirth: '03.11.1979',
      issueDate: '10.04.2018',
      expiryDate: '10.04.2028',
      gender: 'M',
      familyTreeNumber: 'FT-3311-GUJ',
      addressUrdu: 'جی ٹی روڈ، ماڈل ٹاؤن، گوجرانوالہ',
      confidenceScore: 68.2, // Low confidence
      extractedAt: '2026-11-03 18:40 PKT'
    },
    profileComparison: {
      cnicMatch: true,
      nameMatch: false, // Name had typo on registration
      dobMatch: true,
      overallConfidence: 68.2
    },
    nadraVerisys: {
      status: 'MISMATCH',
      simulatedLookupId: 'NADRA_SIM_331102',
      biometricMatchScore: 45.0,
      lastCheckedAt: '2026-11-03 18:50 PKT',
      remarks: 'Simulated NADRA OCR mismatch: Name on card does not match registered owner name.'
    },
    expiryStatus: {
      expiryDate: '2028-04-10',
      daysRemaining: 522,
      isExpiringWithin30Days: false,
      isExpired: false
    },
    rejectionReason: 'Blurry photo and Smart Chip glare. Name on card (Riaz Ahmad) differs from profile name.',
    submittedAt: '2026-11-03 18:30 PKT',
    reviewedAt: '2026-11-03 19:00 PKT',
    reviewedBy: 'SuperAdmin Sentinel'
  }
];

export function getKycDocuments(statusFilter = 'ALL'): IKycDocumentRecord[] {
  if (statusFilter === 'ALL') return KYC_DOCUMENTS_STORE;
  if (statusFilter === 'EXPIRING_SOON') {
    return KYC_DOCUMENTS_STORE.filter((d) => d.expiryStatus.isExpiringWithin30Days);
  }
  return KYC_DOCUMENTS_STORE.filter((d) => d.status === statusFilter);
}

export function updateKycStatus(
  docId: string,
  newStatus: KycSubmissionStatus,
  reason?: string
): IKycDocumentRecord | null {
  const index = KYC_DOCUMENTS_STORE.findIndex((d) => d.id === docId);
  if (index === -1) return null;

  const current = KYC_DOCUMENTS_STORE[index];
  KYC_DOCUMENTS_STORE[index] = {
    ...current,
    status: newStatus,
    rejectionReason: reason || current.rejectionReason,
    reviewedAt: new Date().toISOString(),
    reviewedBy: 'SuperAdmin Sentinel'
  };

  return KYC_DOCUMENTS_STORE[index];
}

export function runMockNadraVerisysCheck(docId: string): IKycDocumentRecord | null {
  const index = KYC_DOCUMENTS_STORE.findIndex((d) => d.id === docId);
  if (index === -1) return null;

  const current = KYC_DOCUMENTS_STORE[index];
  const now = new Date();
  const timeStr = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)} PKT`;

  // Deterministic simulation based on CNIC checksum
  const isHealthy = current.ocrDetails.confidenceScore >= 80;
  const simulatedScore = isHealthy ? Number((95 + Math.random() * 4).toFixed(1)) : 48.5;

  KYC_DOCUMENTS_STORE[index] = {
    ...current,
    nadraVerisys: {
      status: isHealthy ? 'VERIFIED' : 'MISMATCH',
      simulatedLookupId: `NADRA_SIM_${Math.floor(100000 + Math.random() * 900000)}`,
      biometricMatchScore: simulatedScore,
      lastCheckedAt: timeStr,
      remarks: isHealthy
        ? `Citizen record confirmed via Simulated NADRA Verisys Engine (Match: ${simulatedScore}%).`
        : `Simulated Verisys alert: Facial or biographical mismatch detected (Score: ${simulatedScore}%).`
    }
  };

  return KYC_DOCUMENTS_STORE[index];
}
