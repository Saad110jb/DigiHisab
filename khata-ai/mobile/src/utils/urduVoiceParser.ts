import { ILedgerItem } from '../api/ledger.api';

export interface CustomerCandidate {
  _id: string;
  name: string;
  phone?: string;
  creditLimit?: number;
  currentBalance?: number;
}

export interface ParsedVoiceEntry {
  rawTranscript: string;
  entryType: 'RECEIVABLE' | 'PAYABLE' | 'SETTLEMENT';
  amount?: number;
  customerName?: string;
  customerId?: string;
  matchedCustomer?: CustomerCandidate;
  itemsText?: string;
  extractedItems: ILedgerItem[];
  promiseDays?: number;
  dueDate?: string;
  notes?: string;
}

/**
 * Common Roman Urdu and Urdu number word mappings
 */
const WORD_TO_NUMBER: Record<string, number> = {
  // Roman Urdu
  sau: 100,
  so: 100,
  'ek sau': 100,
  'do sau': 200,
  'tin sau': 300,
  'teen sau': 300,
  'char sau': 400,
  'chaar sau': 400,
  'paanch sau': 500,
  'panch sau': 500,
  'che sau': 600,
  'sat sau': 700,
  'saat sau': 700,
  'aath sau': 800,
  'nau sau': 900,
  hazar: 1000,
  hazaar: 1000,
  'ek hazar': 1000,
  'dedh hazar': 1500,
  'pandra sau': 1500,
  'pandrah sau': 1500,
  'do hazar': 2000,
  'dhai hazar': 2500,
  'tin hazar': 3000,
  'teen hazar': 3000,
  'char hazar': 4000,
  'chaar hazar': 4000,
  'paanch hazar': 5000,
  'panch hazar': 5000,
  'che hazar': 6000,
  'saat hazar': 7000,
  'aath hazar': 8000,
  'nau hazar': 9000,
  'das hazar': 10000,
  'pandrah hazar': 15000,
  'bees hazar': 20000,
  'pachees hazar': 25000,
  'tees hazar': 30000,
  'pachaas hazar': 50000,
  'ek lakh': 100000,

  // Urdu Script
  'سو': 100,
  'ایک سو': 100,
  'دو سو': 200,
  'تین سو': 300,
  'چار سو': 400,
  'پانچ سو': 500,
  'چھ سو': 600,
  'سات سو': 700,
  'آٹھ سو': 800,
  'نو سو': 900,
  'ہزار': 1000,
  'ایک ہزار': 1000,
  'پندرہ سو': 1500,
  'ڈیڑھ ہزار': 1500,
  'دو ہزار': 2000,
  'ڈھائی ہزار': 2500,
  'تین ہزار': 3000,
  'چار ہزار': 4000,
  'پانچ ہزار': 5000,
  'دس ہزار': 10000,
  'پندرہ ہزار': 15000,
  'بیس ہزار': 20000,
  'پچیس ہزار': 25000,
  'پچاس ہزار': 50000,
  'ایک لاکھ': 100000,
};

/**
 * Extracts numeric amount from text (e.g. "1,500", "5000", "pandra sau", "پانچ سو")
 */
export function extractAmount(text: string): number | undefined {
  const clean = text.toLowerCase().trim();

  // 1. Direct digit matching with optional commas or currency prefix/suffix
  // e.g. "1,500", "Rs 2000", "500 rupey", "1500/="
  const digitMatch = clean.match(/(?:rs\.?|pkr|روپے)?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:rupay|rupey|rs|pkr|روپے)?/i);
  if (digitMatch && digitMatch[1]) {
    const parsed = parseFloat(digitMatch[1].replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 2. Check for written words in Roman Urdu / Urdu
  for (const [phrase, value] of Object.entries(WORD_TO_NUMBER)) {
    if (clean.includes(phrase)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Parses Roman Urdu / Urdu transaction transcripts
 * Examples:
 * - "Tariq ko 1,500 ka ghee aur atta udhaar diya"
 * - "Rashid se 500 rupay wasool huay"
 * - "Akram ko 3,000 ka ration diya 15 din baad wapas karega"
 */
export function parseUrduVoiceTranscript(
  transcript: string,
  customersList: CustomerCandidate[] = []
): ParsedVoiceEntry {
  const cleanText = transcript.trim();
  const lowerText = cleanText.toLowerCase();

  // 1. Determine Entry Type
  let entryType: 'RECEIVABLE' | 'PAYABLE' | 'SETTLEMENT' = 'RECEIVABLE';
  if (
    lowerText.includes('wasool') ||
    lowerText.includes('wapas') ||
    lowerText.includes('mil gaye') ||
    lowerText.includes('jama') ||
    lowerText.includes('ada') ||
    cleanText.includes('وصول') ||
    cleanText.includes('جمع') ||
    cleanText.includes('واپس')
  ) {
    entryType = 'SETTLEMENT';
  } else if (
    lowerText.includes('udhaar liya') ||
    lowerText.includes('udhar liya') ||
    lowerText.includes('dene hain') ||
    cleanText.includes('ادھار لیا') ||
    cleanText.includes('دینے ہیں')
  ) {
    entryType = 'PAYABLE';
  } else {
    // Default to RECEIVABLE (Udhaar Diya / Maine lene hain)
    entryType = 'RECEIVABLE';
  }

  // 2. Extract Amount
  const amount = extractAmount(cleanText);

  // 3. Match Customer Name
  let customerName: string | undefined;
  let customerId: string | undefined;
  let matchedCustomer: CustomerCandidate | undefined;

  // First, check if any existing customer's name matches in the transcript
  if (customersList.length > 0) {
    for (const cust of customersList) {
      const cName = cust.name.toLowerCase().trim();
      const firstName = cName.split(' ')[0];
      if (lowerText.includes(cName) || (firstName.length >= 3 && lowerText.includes(firstName))) {
        customerName = cust.name;
        customerId = cust._id;
        matchedCustomer = cust;
        break;
      }
    }
  }

  // If no existing customer matched, extract name from grammar patterns:
  // e.g., "Tariq ko", "Rashid se", "Ali nay", "طاہر کو"
  if (!customerName) {
    const nameMatch = cleanText.match(
      /(?:^|\s)([A-Z\u0600-\u06FF][a-zA-Z\u0600-\u06FF]{2,}(?:\s+[A-Z\u0600-\u06FF][a-zA-Z\u0600-\u06FF]+)?)\s+(?:ko|se|ne|nay|کو|سے|نے)\b/i
    );
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      // Avoid matching common filler words
      const stopWords = ['aaj', 'kal', 'parson', 'humein', 'hum', 'mujhe', 'dukan', 'khata', 'bill'];
      if (!stopWords.includes(candidate.toLowerCase())) {
        customerName = candidate;
      }
    }
  }

  // 4. Extract Promise / Due Date
  let promiseDays: number | undefined;
  let dueDate: string | undefined;

  if (lowerText.includes('kal') || cleanText.includes('کل')) {
    promiseDays = 1;
  } else if (lowerText.includes('parson') || cleanText.includes('پرسوں')) {
    promiseDays = 2;
  } else if (lowerText.includes('hafta') || lowerText.includes('hafte') || cleanText.includes('ہفتہ')) {
    promiseDays = 7;
  } else if (lowerText.includes('15 din') || lowerText.includes('pandrah din') || cleanText.includes('۱۵ دن') || cleanText.includes('پندرہ دن')) {
    promiseDays = 15;
  } else if (lowerText.includes('mahina') || lowerText.includes('mahine') || cleanText.includes('مہینہ')) {
    promiseDays = 30;
  } else if (lowerText.includes('pehli tareekh') || cleanText.includes('پہلی تاریخ')) {
    // Days until 1st of next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diffTime = Math.abs(nextMonth.getTime() - now.getTime());
    promiseDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (promiseDays !== undefined) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + promiseDays);
    dueDate = targetDate.toISOString().split('T')[0];
  }

  // 5. Extract Items / Description
  // Pattern: "ka [items] udhaar diya" or "ka [items] diya"
  let itemsText: string | undefined;
  const itemsRegex = /(?:ka|ki|کا|کی)\s+([a-zA-Z0-9\s,\u0600-\u06FF]+?)\s+(?:udhaar|udhar|diya|diye|ادھار|دیا)/i;
  const itemMatch = cleanText.match(itemsRegex);
  if (itemMatch && itemMatch[1]) {
    itemsText = itemMatch[1].trim();
  }

  // Fallback description if itemsText wasn't extracted specifically
  if (!itemsText && entryType === 'RECEIVABLE') {
    const afterAmount = cleanText.replace(/^[^\d]*(?:\d+([,\.]\d+)?)\s*(?:ka|ki)?/i, '').trim();
    if (afterAmount.length > 3) {
      itemsText = afterAmount.replace(/(?:udhaar|udhar|diya|diye|adaye|ادھار|دیا).*/i, '').trim();
    }
  }

  // Clean out date/time phrases from itemsText if accidentally included
  if (itemsText) {
    itemsText = itemsText
      .replace(/(?:kal|parson|hafta|hafte|\d+\s*din|mahina|mahine|tareekh)\s*(?:baad|tak|ko)?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 6. Build ILedgerItem[] array from extracted items
  const extractedItems: ILedgerItem[] = [];
  if (itemsText) {
    // Split by "aur", "and", ",", "اور"
    const rawTokens = itemsText
      .split(/(?:\s+aur\s+|\s+and\s+|,\s*|\s+اور\s+)/i)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const totalAmt = amount || 0;
    const count = rawTokens.length;

    rawTokens.forEach((token, idx) => {
      // Look for quantities like "2kg ghee", "5L tel", "10 kilo atta", "2 dabba"
      const qtyMatch = token.match(/^(\d+(?:\.\d+)?)\s*(kg|kilo|litre|l|g|gm|packet|dabba|bora)?\s*(.*)$/i);
      let qty = 1;
      let itemName = token;

      if (qtyMatch && qtyMatch[1]) {
        qty = parseFloat(qtyMatch[1]) || 1;
        const unit = qtyMatch[2] ? ` (${qtyMatch[1]}${qtyMatch[2]})` : '';
        const namePart = qtyMatch[3] ? qtyMatch[3].trim() : token;
        itemName = namePart + unit;
      }

      // Distribute amount if multiple items or assign total
      const itemTotal = count > 1 ? Math.round(totalAmt / count) : totalAmt;
      const unitPrice = qty > 0 ? Math.round(itemTotal / qty) : itemTotal;

      extractedItems.push({
        name: itemName.charAt(0).toUpperCase() + itemName.slice(1),
        quantity: qty,
        unitPrice: unitPrice > 0 ? unitPrice : totalAmt,
        total: itemTotal > 0 ? itemTotal : totalAmt,
      });
    });
  }

  return {
    rawTranscript: cleanText,
    entryType,
    amount,
    customerName,
    customerId,
    matchedCustomer,
    itemsText,
    extractedItems,
    promiseDays,
    dueDate,
    notes: itemsText ? `Items: ${itemsText}` : undefined,
  };
}
