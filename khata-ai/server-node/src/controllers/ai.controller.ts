import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { Counterparty } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';

/**
 * Ensures uploads/receipts directory exists on disk
 */
const getUploadDir = (): string => {
  const uploadPath = path.join(__dirname, '../../uploads/receipts');
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  return uploadPath;
};

/**
 * 1. Upload & Compress Base64 Asset to Server Disk
 * POST /api/v1/ai/upload
 */
export const uploadAsset = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { base64Data, filename } = req.body;

    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'base64Data is required.' });
    }

    // Strip base64 data URI header if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // ENFORCE 1MB SIZE LIMIT
    const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
    if (buffer.length > MAX_SIZE_BYTES) {
      const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        success: false,
        message: `File size (${sizeMb} MB) exceeds maximum allowed limit of 1 MB (تصویر کا سائز 1MB سے بڑا ہے). Please compress or select a smaller photo.`,
      });
    }

    const uploadDir = getUploadDir();
    const safeFilename = filename
      ? `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      : `rec_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;

    const filePath = path.join(uploadDir, safeFilename);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/receipts/${safeFilename}`;

    return res.status(201).json({
      success: true,
      message: 'Image asset uploaded and stored on disk successfully.',
      data: {
        url: relativeUrl,
        filename: safeFilename,
        sizeBytes: buffer.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Multimodal OCR Data Extraction (Pakistani Bills, Receipts & Slips)
 * POST /api/v1/ai/ocr-extract
 */
export const extractOcrData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { imageBase64, imageUrl } = req.body;

    if (!imageBase64 && !imageUrl) {
      return res.status(400).json({ success: false, message: 'imageBase64 or imageUrl is required.' });
    }

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      if (buffer.length > 1 * 1024 * 1024) {
        const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
        return res.status(400).json({
          success: false,
          message: `Image size (${sizeMb} MB) exceeds 1 MB limit for OCR processing (سائز 1MB سے بڑا ہے).`,
        });
      }
    }

    let extractedDueAmount: number | undefined = undefined;
    let rawText = '';
    let extractedAmount: number | undefined = undefined;
    let extractedVendorName: string | undefined = undefined;
    let extractedInvoiceNo: string | undefined = undefined;
    let extractedCategory: string | undefined = undefined;
    let extractedItems: Array<{ name: string; quantity: number; unitPrice: number; total: number }> = [];

    // 1. Optional Cloud AI (if GEMINI_API_KEY present in .env)
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey && imageBase64) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `You are a financial document and receipt OCR AI. Analyze this receipt, invoice, payment slip, or handwritten Kacha Parcha image.
The document can be in ANY format (Thermal slip, Digital voucher, Handwritten bill, Bank transfer screenshot, etc.).

CRITICAL EXTRACTION RULES:
1. "amount": The primary transaction or bill amount.
   - If this is a Payment Voucher / Settlement Slip showing "Amount Paid" / "ادا کردہ رقم", set "amount" to the exact AMOUNT PAID (e.g. 20000).
   - If this is a Supplier Invoice / Bill showing "Total Amount", "Bill Amount", or "Net Amount", set "amount" to the Net Bill Total.
2. "dueAmount": If the document shows "Remaining Payable Balance", "Due Amount", "Wajib Ul Ada" (باقی واجب الادا رقم), extract it as a number (e.g. 15000).
3. "vendorName": Extract the Supplier, Payee, Merchant, or Business Name (e.g. "Ali Wholesale Distributors" or "Saad General Store"). Ignore static app system headers like "DigiHisab".
4. "invoiceNumber": Extract the Voucher No, Slip No, Invoice No, or Txn ID (e.g. "DH-PAY-20260929-8812" or "RAAST-PK-99482104").
5. "category": Infer category like "Supplier Bill", "Stock Purchase", "Expense", "Bill Settlement".
6. "items": Extract line items if present.

Return ONLY valid JSON matching this schema:
{
  "amount": number or null,
  "dueAmount": number or null,
  "vendorName": string or null,
  "invoiceNumber": string or null,
  "category": string or null,
  "date": string or null,
  "items": [{"name": string, "quantity": number, "unitPrice": number, "total": number}],
  "rawText": string
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                { text: prompt },
              ],
            },
          ],
        });

        const textResp = response.text || '';
        rawText = textResp;

        const jsonMatch = textResp.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.amount) extractedAmount = Number(parsed.amount);
          if (parsed.dueAmount) extractedDueAmount = Number(parsed.dueAmount);
          if (parsed.vendorName) extractedVendorName = String(parsed.vendorName);
          if (parsed.invoiceNumber) extractedInvoiceNo = String(parsed.invoiceNumber);
          if (parsed.category) extractedCategory = String(parsed.category);
          if (Array.isArray(parsed.items)) extractedItems = parsed.items;
        }
      } catch (geminiErr: any) {
        console.log('[AI Controller] Cloud API bypassed/failed:', geminiErr?.message);
      }
    }

    // 2. FREE LOCAL OFFLINE OCR (Tesseract.js Engine - $0 / Rs. 0 Cost)
    if (!rawText && imageBase64) {
      try {
        const { recognize } = require('tesseract.js');
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(cleanBase64, 'base64');
        const tessResult = await recognize(imgBuffer, 'eng');
        rawText = tessResult.data.text || '';
      } catch (tessErr: any) {
        console.log('[AI Controller] Tesseract local OCR fallback:', tessErr?.message);
      }
    }

    // 3. Dynamic Financial Regex Parser (Works for Tesseract & Raw OCR text)
    if (rawText) {
      if (!extractedAmount) {
        const paidMatch = rawText.match(/(?:AMOUNT\s*PAID|ADA\s*KARDA|PAID\s*AMOUNT|AMOUNT|PAYMENT)[\s\S]{0,30}?Rs\.?\s*([\d,]+(?:\.\d{2})?)/i);
        const totalMatch = rawText.match(/(?:TOTAL\s*AMOUNT|NET\s*AMOUNT|BILL\s*AMOUNT|TOTAL)[\s\S]{0,30}?Rs\.?\s*([\d,]+(?:\.\d{2})?)/i);
        if (paidMatch) {
          extractedAmount = parseFloat(paidMatch[1].replace(/,/g, ''));
        } else if (totalMatch) {
          extractedAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
        }
      }

      if (!extractedDueAmount) {
        const dueMatch = rawText.match(/(?:REMAINING\s*PAYABLE|REMAINING\s*BALANCE|WAJIB\s*UL\s*ADA|DUE\s*AMOUNT|DUE)[\s\S]{0,30}?Rs\.?\s*([\d,]+(?:\.\d{2})?)/i);
        if (dueMatch) {
          extractedDueAmount = parseFloat(dueMatch[1].replace(/,/g, ''));
        }
      }

      if (!extractedVendorName) {
        const supplierMatch = rawText.match(/(?:Supplier\s*\/\s*Payee|Payee|Vendor|Supplier|Merchant)[\s:]*([A-Za-z0-9\s()&.-]+)/i);
        if (supplierMatch) {
          extractedVendorName = supplierMatch[1].trim().split('\n')[0];
        }
      }

      if (!extractedInvoiceNo) {
        const voucherMatch = rawText.match(/(?:Voucher\s*No|Invoice\s*No|Txn\s*ID|Reference)[\s:]*([A-Za-z0-9\-_]+)/i);
        if (voucherMatch) {
          extractedInvoiceNo = voucherMatch[1].trim();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'OCR data extracted successfully (Local/Free Engine).',
      data: {
        amount: extractedAmount || 0,
        dueAmount: extractedDueAmount || undefined,
        vendorName: extractedVendorName || undefined,
        invoiceNumber: extractedInvoiceNo || undefined,
        category: extractedCategory || 'General Bill',
        items: extractedItems,
        rawOcrText: rawText || 'Receipt processed locally',
        confidenceScore: extractedAmount ? 0.92 : 0.5,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Process Voice Command with NLU Engine & Auto-Creation of Missing Counterparties
 * POST /api/v1/ai/parse-voice
 */
export const parseVoiceCommand = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.body.profileId;
    let text = req.body.transcript ? req.body.transcript.trim() : '';

    // If base64 recorded audio was sent from mobile/browser microphone
    if (!text && req.body.audioBase64) {
      const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const { GoogleGenAI } = require('@google/genai');
          const ai = new GoogleGenAI({ apiKey });
          const cleanAudioBase64 = req.body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
          const audioMimeType = req.body.mimeType || 'audio/webm';

          const audioPrompt = `You are a Roman Urdu voice transcription engine for Pakistani financial ledger app DigiHisab. Listen to this recorded audio clip carefully.
Return ONLY the single exact spoken transcript in Roman Urdu or Urdu (e.g. "Amna ko 1000 ka udhar dia", "Muhammad Asad ko 1000 ka udhar dia ha", "Tariq se 5000 rupees wasool hue"). Do not add commentary or extra text.`;

          const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  { inlineData: { mimeType: audioMimeType, data: cleanAudioBase64 } },
                  { text: audioPrompt },
                ],
              },
            ],
          });
          if (response.text) {
            text = response.text.trim().replace(/^["']|["']$/g, '');
          }
        } catch (sttErr: any) {
          console.log('[AI Controller] Audio STT cloud fallback:', sttErr?.message);
        }
      }
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Voice transcript text or recorded audio is required (آواز یا متن درکار ہے).',
      });
    }

    let parsed: any = null;

    // 1. Call local Python FastAPI NLU Engine (http://127.0.0.1:8000/parse)
    try {
      const axios = require('axios');
      const pyRes = await axios.post('http://127.0.0.1:8000/parse', { transcript: text }, { timeout: 3500 });
      if (pyRes.data && pyRes.data.success) {
        parsed = pyRes.data;
      }
    } catch (pyErr: any) {
      // Fallback NLU parser if Python service is offline
    }

    if (!parsed) {
      const textLower = text.toLowerCase();
      let action = 'RECORD_UDHAAR';
      if (['wasool', 'wasooli', 'jama karwaye', 'wapis kiye', 'paise diye', 'miley', 'wasool hue'].some(k => textLower.includes(k))) {
        action = 'RECORD_WASOOLI';
      } else if (['maal mangwaya', 'wholesaler', 'supplier', 'stock aya', 'vendor', 'khareeda'].some(k => textLower.includes(k))) {
        action = 'RECORD_SUPPLIER_CREDIT';
      } else if (['naqad', 'cash sale', 'counter pe', 'sauda bika', 'bikri'].some(k => textLower.includes(k))) {
        action = 'RECORD_CASH_SALE';
      } else if (['dukan kharcha', 'kharch', 'chai', 'lunch', 'safai', 'jharoo', 'bill', 'bijli', 'kiraya', 'rent'].some(k => textLower.includes(k))) {
        action = 'RECORD_STORE_EXPENSE';
      } else {
        action = 'RECORD_UDHAAR';
      }

      let amount = 0;
      const numMatch = text.match(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b/);
      if (numMatch) {
        amount = parseFloat(numMatch[0].replace(/,/g, ''));
      } else {
        const urduMap: Record<string, number> = {
          'girayah sau': 1100, 'gyarah sau': 1100, 'giraya so': 1100, 'gyara so': 1100,
          'barah sau': 1200, 'bara sau': 1200, 'bara so': 1200,
          'teerah sau': 1300, 'tera sau': 1300, 'tera so': 1300,
          'choudah sau': 1400, 'chauda so': 1400,
          'pandrah sau': 1500, 'pandra sau': 1500, 'pandra so': 1500,
          'soolah sau': 1600, 'sola so': 1600,
          'satrah sau': 1700, 'satra so': 1700,
          'athara sau': 1800, 'athara so': 1800,
          'unnis sau': 1900, 'unnis so': 1900,
          'dhai hazar': 2500, 'dedh hazar': 1500, 'das hazar': 10000,
          'hazar': 1000, 'hazaar': 1000, 'paanch so': 500, 'panch so': 500,
          'sau': 100, 'so': 100,
        };
        for (const [k, v] of Object.entries(urduMap)) {
          if (textLower.includes(k)) {
            amount = v;
            break;
          }
        }
      }

      let name = 'Gahak';
      const cleanTextForName = text.replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b/g, '');
      const nameMatch = cleanTextForName.match(/\b([A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){0,2})\b\s+(?:ka|ko|se|ne|la)\b/i);
      if (nameMatch) {
        const candidate = nameMatch[1].trim();
        const stopWords = [
          'dukan', 'counter', 'aaj', 'kal', 'bhai', 'shukriya', 'supplier',
          'maal', 'sauda', 'kharcha', 'chai', 'lunch', 'safai', 'jharoo', 'bill',
          'wasool', 'wasooli', 'udhar', 'udhaar', 'naqad', 'cash', 'pe', 'se', 'ko', 'ka', 'ne', 'la',
          'das', 'hazar', 'hazaar', 'so', 'sau', 'dhai', 'dedh', 'diya', 'liye', 'khatay', 'mein', 'daal', 'likh', 'lo', 'dia', 'ha', 'hai', 'rupees', 'rs', 'doodh'
        ];
        const words = candidate.split(/\s+/).filter((w: string) => !stopWords.includes(w.toLowerCase()));
        if (words.length > 0) {
          name = words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
      }

      const entryTypeMap: Record<string, string> = {
        RECORD_UDHAAR: 'RECEIVABLE',
        RECORD_WASOOLI: 'SETTLEMENT',
        RECORD_CASH_SALE: 'CASH_IN',
        RECORD_STORE_EXPENSE: 'CASH_OUT',
        RECORD_SUPPLIER_CREDIT: 'PAYABLE',
      };

      parsed = {
        success: true,
        action,
        entryType: entryTypeMap[action] || 'RECEIVABLE',
        counterpartyName: (['RECORD_UDHAAR', 'RECORD_WASOOLI', 'RECORD_SUPPLIER_CREDIT'].includes(action) || (name && name !== 'Gahak')) ? name : null,
        amount,
        rawTranscript: text,
      };
    }

    // 2. AUTO-CREATION OF MISSING COUNTERPARTY / GAHAK / SUPPLIER / STAFF
    let counterpartyDoc = null;
    let autoCreated = false;

    if (profileId && parsed.counterpartyName && parsed.counterpartyName !== 'Gahak') {
      const cpName = parsed.counterpartyName.trim();
      counterpartyDoc = await Counterparty.findOne({
        profileId,
        name: new RegExp('^' + cpName + '$', 'i'),
      });

      if (!counterpartyDoc) {
        const relationType = parsed.action === 'RECORD_SUPPLIER_CREDIT'
          ? 'SUPPLIER'
          : (parsed.action === 'RECORD_STORE_EXPENSE' ? 'STAFF' : 'CUSTOMER');
        const uniquePhone = '0300' + Math.floor(1000000 + Math.random() * 9000000);

        counterpartyDoc = await Counterparty.create({
          profileId,
          name: cpName,
          phone: uniquePhone,
          relationType,
          currentBalance: 0,
          creditLimit: 50000,
          riskProfile: {
            defaultProbability: 0.1,
            riskTier: 'LOW',
            overdueDays: 0,
            currentToneTier: 1,
          },
          notes: 'Auto-created via Voice Command (خودکار کھاتہ شامل ہوا)',
        });
        autoCreated = true;
      }
    }

    // 3. AUTO-RECORD FINANCIAL ENTRY
    let entry = null;
    if (profileId && parsed.amount > 0) {
      let currentBalChange = 0;
      if (parsed.entryType === 'RECEIVABLE') {
        currentBalChange = parsed.amount;
      } else if (parsed.entryType === 'SETTLEMENT') {
        currentBalChange = -parsed.amount;
      } else if (parsed.entryType === 'PAYABLE') {
        currentBalChange = -parsed.amount;
      }

      entry = await LedgerEntry.create({
        profileId,
        counterpartyId: counterpartyDoc ? counterpartyDoc._id : undefined,
        entryType: parsed.entryType,
        amount: parsed.amount,
        paymentMode: 'CASH',
        category: parsed.action,
        description: `Voice Command: "${text}"`,
        inputMode: 'VOICE',
        isSettled: true,
      });

      if (counterpartyDoc && currentBalChange !== 0) {
        counterpartyDoc.currentBalance += currentBalChange;
        await counterpartyDoc.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: autoCreated
        ? `Voice command processed & counterparty "${parsed.counterpartyName}" automatically added to Khata!`
        : 'Voice command processed successfully.',
      data: {
        parsed,
        autoCreated,
        counterparty: counterpartyDoc,
        ledgerEntry: entry,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
