import {
  IDiscoTariffSlab,
  ISharedUtilityDisputeRecord,
  IDiscoSummary,
  DiscoCode,
  TariffCategory,
  ISubMeterSplitSimulation,
  ISubMeterAllocationItem
} from '@/types/tariffs';

// 1. DISCO Summaries with NEPRA National Uniform Tariff Details
export let DISCO_SUMMARIES: IDiscoSummary[] = [
  {
    disco: 'LESCO',
    fullName: 'Lahore Electric Supply Company',
    city: 'Lahore, Kasur, Okara, Sheikhupura',
    currentFpaPKR: 3.25,
    qtaRatePKR: 1.25,
    provincialDutyPct: 1.5,
    activeConsumersCount: 5400000,
    protectedSlabsCount: 3,
    unprotectedSlabsCount: 8,
    lastGazetteUpdated: '2026-10-15',
    gazetteSro: 'S.R.O. 279(I)/2026'
  },
  {
    disco: 'KELECTRIC',
    fullName: 'K-Electric (Karachi Supply)',
    city: 'Karachi & Hub Industrial',
    currentFpaPKR: 3.82,
    qtaRatePKR: 1.25,
    provincialDutyPct: 1.5,
    activeConsumersCount: 3200000,
    protectedSlabsCount: 3,
    unprotectedSlabsCount: 8,
    lastGazetteUpdated: '2026-10-20',
    gazetteSro: 'S.R.O. 279(I)/2026'
  },
  {
    disco: 'IESCO',
    fullName: 'Islamabad Electric Supply Company',
    city: 'Islamabad, Rawalpindi, Attock, Jhelum',
    currentFpaPKR: 2.94,
    qtaRatePKR: 1.25,
    provincialDutyPct: 1.5,
    activeConsumersCount: 3100000,
    protectedSlabsCount: 3,
    unprotectedSlabsCount: 8,
    lastGazetteUpdated: '2026-10-12',
    gazetteSro: 'S.R.O. 279(I)/2026'
  },
  {
    disco: 'GEPCO',
    fullName: 'Gujranwala Electric Power Company',
    city: 'Gujranwala, Sialkot, Gujrat, Hafizabad',
    currentFpaPKR: 3.10,
    qtaRatePKR: 1.25,
    provincialDutyPct: 1.5,
    activeConsumersCount: 2800000,
    protectedSlabsCount: 3,
    unprotectedSlabsCount: 8,
    lastGazetteUpdated: '2026-10-18',
    gazetteSro: 'S.R.O. 279(I)/2026'
  }
];

// Helper to generate full 11 S.R.O. 279(I)/2026 slabs for a DISCO
export function generateNationalSlabsForDisco(disco: DiscoCode, fpaRate: number): IDiscoTariffSlab[] {
  return [
    // Protected Slabs
    {
      id: `${disco}-P-1`,
      disco,
      category: 'PROTECTED',
      slabName: '1 - 50 Units (Lifeline)',
      minUnits: 1,
      maxUnits: 50,
      baseRatePKR: 3.95, // S.R.O. 279(I)/2026 Lifeline
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-P-2`,
      disco,
      category: 'PROTECTED',
      slabName: '51 - 100 Units',
      minUnits: 51,
      maxUnits: 100,
      baseRatePKR: 7.74,
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-P-3`,
      disco,
      category: 'PROTECTED',
      slabName: '101 - 200 Units',
      minUnits: 101,
      maxUnits: 200,
      baseRatePKR: 10.06,
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },

    // Unprotected Non-Telescopic Slabs
    {
      id: `${disco}-U-1`,
      disco,
      category: 'UNPROTECTED',
      slabName: 'Up to 100 Units',
      minUnits: 1,
      maxUnits: 100,
      baseRatePKR: 22.44, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-U-2`,
      disco,
      category: 'UNPROTECTED',
      slabName: '101 - 200 Units',
      minUnits: 101,
      maxUnits: 200,
      baseRatePKR: 28.91, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-U-3`,
      disco,
      category: 'UNPROTECTED',
      slabName: '201 - 300 Units',
      minUnits: 201,
      maxUnits: 300,
      baseRatePKR: 33.10, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-U-4`,
      disco,
      category: 'UNPROTECTED',
      slabName: '301 - 400 Units',
      minUnits: 301,
      maxUnits: 400,
      baseRatePKR: 36.46, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-U-5`,
      disco,
      category: 'UNPROTECTED',
      slabName: '401 - 500 Units',
      minUnits: 401,
      maxUnits: 500,
      baseRatePKR: 38.95, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-U-6`,
      disco,
      category: 'UNPROTECTED',
      slabName: '501 - 600 Units',
      minUnits: 501,
      maxUnits: 600,
      baseRatePKR: 40.22, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-U-7`,
      disco,
      category: 'UNPROTECTED',
      slabName: '601 - 700 Units',
      minUnits: 601,
      maxUnits: 700,
      baseRatePKR: 41.85, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    },
    {
      id: `${disco}-U-8`,
      disco,
      category: 'UNPROTECTED',
      slabName: 'Above 700 Units',
      minUnits: 701,
      maxUnits: 9999,
      baseRatePKR: 47.20, // S.R.O. 279(I)/2026 Official
      fpaRatePKR: fpaRate,
      fcSurchargePKR: 3.23,
      electricityDutyPct: 1.5,
      gstPercentage: 18.0,
      effectiveDate: '2026-07-01',
      isNationalUniform: true,
      gazetteReference: 'S.R.O. 279(I)/2026'
    }
  ];
}

// 2. Official NEPRA Slabs Store for all 4 DISCOs (Pre-loaded with S.R.O. 279(I)/2026)
export let DISCO_SLABS_STORE: IDiscoTariffSlab[] = [
  ...generateNationalSlabsForDisco('LESCO', 3.25),
  ...generateNationalSlabsForDisco('KELECTRIC', 3.82),
  ...generateNationalSlabsForDisco('IESCO', 2.94),
  ...generateNationalSlabsForDisco('GEPCO', 3.10)
];

// 3. Shared Utility Disputes Store
export let SHARED_UTILITY_DISPUTES_STORE: ISharedUtilityDisputeRecord[] = [
  {
    id: 'DISP-2026-101',
    landlordId: 'USR_9921',
    landlordName: 'Haji Bashir Ahmad (Landlord)',
    landlordPhone: '+923009663004',
    tenantId: 'USR_TENANT_441',
    tenantName: 'Farhan Zaidi',
    tenantPhone: '+923024419988',
    propertyAddress: 'House 42, Sector F, Model Town, Lahore',
    tenantPortion: 'Upper Portion (3 Bed)',
    utilityType: 'WATER_PUMP',
    disputeReason: 'Tenant contested 50% flat split on 2.0 HP motor. Landlord operates tube-well for ground lawn twice daily.',
    disputeReasonUrdu: 'اوپر والے کرایہ دار کا پانی موٹر بل پر اعتراض: مالک مکان گراؤنڈ لان کے لیے روزانہ دو بار ٹیوب ویل چلاتا ہے جبکہ بل آدھا مانگا گیا',
    masterBillAmountPKR: 18400,
    demandedSharePKR: 9200,
    fairCalculatedSharePKR: 5520, // 30% fair based on overhead tank runtime
    contestedDifferencePKR: 3680,
    status: 'PENDING_AUDIT',
    timestamp: '2026-11-04 18:20 PKT',
    notes: 'Ground floor lawn irrigation consumes 1.4 hours daily. Upper portion overhead tank takes 35 mins.'
  },
  {
    id: 'DISP-2026-102',
    landlordId: 'USR_8812',
    landlordName: 'Tariq Mehmood',
    landlordPhone: '+923014589211',
    tenantId: 'USR_TENANT_602',
    tenantName: 'Dr. Bilal Qureshi',
    tenantPhone: '+923338877112',
    propertyAddress: 'Plot 114, Block C, Gulshan-e-Iqbal, Karachi',
    tenantPortion: 'First Floor Annex',
    utilityType: 'SNGPL_GAS',
    disputeReason: 'Tenant billed for shared winter gas bill containing commercial tandoor burner running on ground floor bakery.',
    disputeReasonUrdu: 'سوئی گیس بل تنازعہ: گراؤنڈ فلور بیکری کے بڑے برنر کا بل اوپر رہائشی کرایہ دار پر 50 فیصد برابر ڈال دیا گیا',
    masterBillAmountPKR: 29500,
    demandedSharePKR: 14750,
    fairCalculatedSharePKR: 4425, // 15% fair domestic residential share
    contestedDifferencePKR: 10325,
    status: 'ADJUSTMENT_ORDERED',
    timestamp: '2026-11-04 14:10 PKT',
    notes: 'Bakery burner accounts for 85% of winter gas volume. Landlord ordered to re-bill tenant at Rs. 4,425.'
  },
  {
    id: 'DISP-2026-103',
    landlordId: 'USR_7730',
    landlordName: 'Malik Jahangir',
    landlordPhone: '+923451122334',
    tenantId: 'USR_TENANT_889',
    tenantName: 'Engr. Zeeshan Ali',
    tenantPhone: '+923214567890',
    propertyAddress: 'Street 9, F-8/2, Islamabad',
    tenantPortion: 'Basement Studio',
    utilityType: 'LESCO_ELECTRICITY',
    disputeReason: 'Landlord charged flat top-slab rate of Rs. 55/unit for small 120-unit basement consumer.',
    disputeReasonUrdu: 'بجلی سب میٹر کا تنازعہ: 120 یونٹ والے بیسمنٹ کرایہ دار کو ماسٹر میٹر کا آخری سلیب ریٹ 55 روپے فی یونٹ لگایا گیا',
    masterBillAmountPKR: 52000,
    demandedSharePKR: 6600,
    fairCalculatedSharePKR: 4320, // Proportional slab weighted share
    contestedDifferencePKR: 2280,
    status: 'RESOLVED',
    timestamp: '2026-11-03 21:00 PKT',
    notes: 'Arbitrated via Digi Hisab Proportional Split algorithm. Adjustment credited to tenant Khata.'
  }
];

// 4. Algorithms & Helpers

/**
 * Proportional Slab Weighted Sub-Meter Split Calculator
 */
export function calculateSubMeterSplit(
  disco: DiscoCode,
  masterUnits: number,
  masterBillAmountPKR: number,
  subTenants: { id: string; tenantName: string; portionName: string; subMeterUnits: number }[]
): ISubMeterSplitSimulation {
  const totalSubUnits = subTenants.reduce((acc, t) => acc + t.subMeterUnits, 0);
  const effectiveRate = masterUnits > 0 ? masterBillAmountPKR / masterUnits : 35;
  const fixedTvFee = 35;
  const fixedMeterRent = 50;
  const totalFixedCharges = fixedTvFee + fixedMeterRent;
  const tenantCount = subTenants.length || 1;
  const fixedPerTenant = Math.round(totalFixedCharges / tenantCount);

  const allocations: ISubMeterAllocationItem[] = subTenants.map((t) => {
    // Proportional share based on actual sub-meter units consumed
    const unitsShare = t.subMeterUnits;
    const computedBase = Math.round(unitsShare * (effectiveRate * 0.82)); // 82% base
    const computedTaxes = Math.round(unitsShare * (effectiveRate * 0.18)) + fixedPerTenant; // 18% tax + fixed
    const computedTotal = computedBase + computedTaxes;

    return {
      id: t.id,
      tenantName: t.tenantName,
      portionName: t.portionName,
      subMeterUnits: t.subMeterUnits,
      computedBaseSharePKR: computedBase,
      computedTaxesSharePKR: computedTaxes,
      computedTotalPKR: computedTotal,
      effectiveRatePerUnit: unitsShare > 0 ? Number((computedTotal / unitsShare).toFixed(2)) : 0
    };
  });

  return {
    disco,
    billingMonth: '2026-10',
    masterUnits,
    masterBillAmountPKR,
    isMasterProtected: masterUnits <= 200,
    fixedTvFeePKR: fixedTvFee,
    fixedMeterRentPKR: fixedMeterRent,
    allocations
  };
}

/**
 * Water Pump Tube-Well Runtime Calculator
 */
export function calculateWaterPumpShare(
  pumpHP: number, // 1.5 or 2.0 HP
  totalBillPKR: number,
  groundRuntimeMinsDaily: number,
  upperRuntimeMinsDaily: number
) {
  const totalMins = groundRuntimeMinsDaily + upperRuntimeMinsDaily || 1;
  const groundPct = (groundRuntimeMinsDaily / totalMins) * 100;
  const upperPct = (upperRuntimeMinsDaily / totalMins) * 100;

  return {
    groundSharePKR: Math.round((totalBillPKR * groundPct) / 100),
    upperSharePKR: Math.round((totalBillPKR * upperPct) / 100),
    groundPct: Number(groundPct.toFixed(1)),
    upperPct: Number(upperPct.toFixed(1))
  };
}

/**
 * SNGPL Winter Gas Burners & Geyser Weighted Split
 */
export function calculateGasPointsShare(
  totalBillPKR: number,
  landlordPoints: { burners: number; geysers: number; heaters: number },
  tenantPoints: { burners: number; geysers: number; heaters: number }
) {
  // Weights: Burner = 1, Geyser = 3, Room Heater = 4
  const landlordTotalWeight =
    landlordPoints.burners * 1 + landlordPoints.geysers * 3 + landlordPoints.heaters * 4;
  const tenantTotalWeight =
    tenantPoints.burners * 1 + tenantPoints.geysers * 3 + tenantPoints.heaters * 4;
  const grandWeight = landlordTotalWeight + tenantTotalWeight || 1;

  const landlordPct = (landlordTotalWeight / grandWeight) * 100;
  const tenantPct = (tenantTotalWeight / grandWeight) * 100;

  return {
    landlordSharePKR: Math.round((totalBillPKR * landlordPct) / 100),
    tenantSharePKR: Math.round((totalBillPKR * tenantPct) / 100),
    landlordPct: Number(landlordPct.toFixed(1)),
    tenantPct: Number(tenantPct.toFixed(1))
  };
}

// Store Mutation Methods
export function getTariffSlabs(disco: string = 'ALL', category: string = 'ALL') {
  return DISCO_SLABS_STORE.filter((s) => {
    const matchDisco = disco === 'ALL' || s.disco === disco;
    const matchCat = category === 'ALL' || s.category === category;
    return matchDisco && matchCat;
  });
}

export function updateSlabRate(
  slabId: string,
  baseRatePKR: number,
  fpaRatePKR?: number
): IDiscoTariffSlab | null {
  const slab = DISCO_SLABS_STORE.find((s) => s.id === slabId);
  if (slab) {
    slab.baseRatePKR = baseRatePKR;
    if (fpaRatePKR !== undefined) slab.fpaRatePKR = fpaRatePKR;
    slab.effectiveDate = new Date().toISOString().split('T')[0];
    return slab;
  }
  return null;
}

export function arbitrateDispute(
  disputeId: string,
  action: 'RESOLVE' | 'ORDER_ADJUSTMENT',
  fairCalculatedSharePKR?: number
) {
  const disp = SHARED_UTILITY_DISPUTES_STORE.find((d) => d.id === disputeId);
  if (disp) {
    if (action === 'ORDER_ADJUSTMENT') {
      disp.status = 'ADJUSTMENT_ORDERED';
      if (fairCalculatedSharePKR) {
        disp.fairCalculatedSharePKR = fairCalculatedSharePKR;
        disp.contestedDifferencePKR = disp.demandedSharePKR - fairCalculatedSharePKR;
      }
    } else {
      disp.status = 'RESOLVED';
    }
    return disp;
  }
  return null;
}

export function syncAllDiscosToNationalTariff() {
  const fpaMap: Record<DiscoCode, number> = {
    LESCO: 3.25,
    KELECTRIC: 3.82,
    IESCO: 2.94,
    GEPCO: 3.10,
    FESCO: 3.15,
    MEPCO: 3.30
  };

  DISCO_SLABS_STORE = [
    ...generateNationalSlabsForDisco('LESCO', fpaMap.LESCO),
    ...generateNationalSlabsForDisco('KELECTRIC', fpaMap.KELECTRIC),
    ...generateNationalSlabsForDisco('IESCO', fpaMap.IESCO),
    ...generateNationalSlabsForDisco('GEPCO', fpaMap.GEPCO)
  ];
  return DISCO_SLABS_STORE;
}
