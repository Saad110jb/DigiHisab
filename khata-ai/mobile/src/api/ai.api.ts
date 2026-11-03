import { apiClient } from './client';

export interface IOcrExtractedResult {
  amount?: number;
  dueAmount?: number;
  vendorName?: string;
  invoiceNumber?: string;
  category?: string;
  items?: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  rawOcrText?: string;
  confidenceScore?: number;
}

export interface IVoiceParsedResult {
  parsed: {
    action: string;
    entryType: string;
    counterpartyName: string | null;
    amount: number;
    rawTranscript: string;
  };
  autoCreated: boolean;
  counterparty?: any;
  ledgerEntry?: any;
}

export const aiApi = {
  uploadAsset: async (base64Data: string, filename?: string): Promise<{ success: boolean; data: { url: string; filename: string } }> => {
    const res = await apiClient.post('/ai/upload', { base64Data, filename });
    return res.data;
  },

  extractOcrData: async (imageBase64: string): Promise<{ success: boolean; data: IOcrExtractedResult }> => {
    const res = await apiClient.post('/ai/ocr-extract', { imageBase64 });
    return res.data;
  },

  parseVoiceCommand: async (
    payload: string | { transcript?: string; audioBase64?: string; mimeType?: string }
  ): Promise<{ success: boolean; message: string; data: IVoiceParsedResult }> => {
    const body = typeof payload === 'string' ? { transcript: payload } : payload;
    const res = await apiClient.post('/ai/parse-voice', body);
    return res.data;
  },
};

