import { apiClient } from './client';
import { ILedgerItem, ILedgerEntry } from './ledger.api';

export type JevActionVerdict = 'APPROVE' | 'REQUIRE_MANAGER_PIN' | 'HARD_BLOCK';
export type JevRiskTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface IJevMetrics {
  borrowed90d: number;
  settled90d: number;
  repaymentVelocity: number;
  avgLagDays: number;
  maxOverdueDays: number;
  promiseBreachCount: number;
  currentBalance: number;
  requestedAmount: number;
  projectedBalance: number;
  creditLimit: number;
  utilizationRate: number;
  isCreditBlocked: boolean;
  totalEntriesCount: number;
}

export interface IJevCreditEvaluation {
  default_probability: number;
  risk_tier: JevRiskTier;
  action_verdict: JevActionVerdict;
  credit_limit_recommendation: number;
  confidence_interval: [number, number];
  metrics: IJevMetrics;
  reasons: {
    urdu: string;
    english: string;
  };
}

export interface IEvaluateUdhaarResponse {
  success: boolean;
  data: {
    customer: {
      id: string;
      name: string;
      phone: string;
      currentBalance: number;
      creditLimit: number;
      isCreditBlocked: boolean;
    };
    evaluation: IJevCreditEvaluation;
  };
}

export interface IProcessUdhaarSalePayload {
  customerId: string;
  amount: number;
  category?: string;
  description?: string;
  items?: ILedgerItem[];
  receiptImageUrl?: string;
  rawInput?: string;
  dueDate?: string;
  inputMode?: 'MANUAL' | 'VOICE' | 'OCR' | 'WHATSAPP';
  managerPin?: string;
  overrideReason?: string;
}

export interface IProcessUdhaarSaleResponse {
  success: boolean;
  message: string;
  data: ILedgerEntry;
  evaluation: IJevCreditEvaluation;
}

export const udhaarApi = {
  evaluate: async (customerId: string, requestedAmount: number): Promise<IEvaluateUdhaarResponse> => {
    const res = await apiClient.post<IEvaluateUdhaarResponse>('/udhaar/evaluate', {
      customerId,
      requestedAmount,
    });
    return res.data;
  },

  processSale: async (payload: IProcessUdhaarSalePayload): Promise<IProcessUdhaarSaleResponse> => {
    const res = await apiClient.post<IProcessUdhaarSaleResponse>('/udhaar/sale', payload);
    return res.data;
  },
};
