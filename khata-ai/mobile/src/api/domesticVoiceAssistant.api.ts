import { apiClient } from './client';
import { IParsedDomesticVoiceResult } from '../utils/urduDomesticVoiceParser';

export interface IVoiceExecutionReceipt {
  success: boolean;
  voucherType: 'CPV' | 'BPV' | 'WPV';
  voucherNumber: string;
  amountDebited: number;
  debitedVaultTitle: string;
  remainingVaultBalance: number;
  targetModule: string;
  targetSummaryUrdu: string;
  targetSummaryEn: string;
  auditNotesUrdu: string;
  executedAt: string;
}

export const domesticVoiceAssistantApi = {
  /**
   * Execute interpreted voice command across domestic modules and debit the designated vault
   */
  executeVoiceTransaction: async (
    parsedResult: IParsedDomesticVoiceResult
  ): Promise<IVoiceExecutionReceipt> => {
    const res = await apiClient.post<{ success: boolean; data: IVoiceExecutionReceipt }>(
      '/domestic/voice/execute',
      {
        rawTranscript: parsedResult.rawTranscript,
        intent: parsedResult.intent,
        targetModuleKey: parsedResult.targetModuleKey,
        amount: parsedResult.totalAmount,
        itemSplits: parsedResult.itemSplits,
        paymentChannel: parsedResult.paymentChannel,
        entityNameHint: parsedResult.entityNameHint,
        notes: parsedResult.notesUrdu,
        isAdvancePayment: parsedResult.isAdvancePayment,
      }
    );
    return res.data.data;
  },
};
