export type DiscoCode = 'LESCO' | 'KELECTRIC' | 'IESCO' | 'GEPCO' | 'FESCO' | 'MEPCO';

export type TariffCategory = 'PROTECTED' | 'UNPROTECTED';

export interface IDiscoTariffSlab {
  id: string; // e.g. "NAT-U-3" or "LESCO-U-3"
  disco: DiscoCode;
  category: TariffCategory;
  slabName: string; // e.g. "201 - 300 Units"
  minUnits: number;
  maxUnits: number; // 9999 for infinity
  baseRatePKR: number;
  fpaRatePKR: number;
  fcSurchargePKR: number;
  electricityDutyPct: number; // 1.5%
  gstPercentage: number; // 18%
  effectiveDate: string;
  isNationalUniform?: boolean;
  gazetteReference?: string; // S.R.O. 279(I)/2026
}

export interface ISubMeterAllocationItem {
  id: string;
  tenantName: string;
  portionName: string; // e.g., "Upper Portion (Flat A)"
  subMeterUnits: number;
  computedBaseSharePKR: number;
  computedTaxesSharePKR: number;
  computedTotalPKR: number;
  effectiveRatePerUnit: number;
}

export interface ISubMeterSplitSimulation {
  disco: DiscoCode;
  billingMonth: string;
  masterUnits: number;
  masterBillAmountPKR: number;
  isMasterProtected: boolean;
  fixedTvFeePKR: number;
  fixedMeterRentPKR: number;
  allocations: ISubMeterAllocationItem[];
}

export interface ISharedUtilityDisputeRecord {
  id: string; // e.g. "DISP-2026-081"
  landlordId: string;
  landlordName: string;
  landlordPhone: string;
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  propertyAddress: string;
  tenantPortion: string; // "Upper Portion (Flat 2)"
  utilityType: 'WATER_PUMP' | 'SNGPL_GAS' | 'LESCO_ELECTRICITY';
  disputeReason: string;
  disputeReasonUrdu: string;
  masterBillAmountPKR: number;
  demandedSharePKR: number;
  fairCalculatedSharePKR: number;
  contestedDifferencePKR: number;
  status: 'PENDING_AUDIT' | 'RESOLVED' | 'ADJUSTMENT_ORDERED';
  timestamp: string;
  notes?: string;
}

export interface IDiscoSummary {
  disco: DiscoCode;
  fullName: string;
  city: string;
  currentFpaPKR: number;
  qtaRatePKR: number;
  provincialDutyPct: number;
  activeConsumersCount: number;
  protectedSlabsCount: number;
  unprotectedSlabsCount: number;
  lastGazetteUpdated: string;
  gazetteSro: string;
}
