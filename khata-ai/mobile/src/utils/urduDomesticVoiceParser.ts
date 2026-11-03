export type DomesticVoiceIntent =
  | 'MANDI_EXPENSE'
  | 'STAFF_ADVANCE'
  | 'UTILITY_PAYMENT'
  | 'KAMETI_INSTALLMENT'
  | 'SCHOOL_FEE_PAYMENT'
  | 'GENERAL_EXPENSE';

export type PaymentVaultChannel = 'CASH' | 'BANK' | 'WALLET';

export interface IDomesticVoiceItemSplit {
  itemNameUrdu: string;
  itemNameEn: string;
  amount: number;
}

export interface IParsedDomesticVoiceResult {
  rawTranscript: string;
  intent: DomesticVoiceIntent;
  targetModuleKey: 'MANDI' | 'STAFF' | 'UTILITY' | 'KAMETI' | 'SCHOOL_FEE' | 'GENERAL';
  titleUrdu: string;
  titleEn: string;
  totalAmount: number;
  itemSplits: IDomesticVoiceItemSplit[];
  paymentChannel: PaymentVaultChannel;
  detectedVaultNameUrdu: string;
  detectedVaultNameEn: string;
  voucherType: 'CPV' | 'BPV' | 'WPV';
  entityNameHint?: string;
  notesUrdu: string;
  notesEn: string;
  isAdvancePayment: boolean;
}

/**
 * Converts Eastern Arabic numerals (۰-۹) to standard ASCII (0-9)
 */
export const convertUrduDigits = (str: string): string => {
  const urduDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[۰-۹]/g, (w) => urduDigits.indexOf(w).toString());
};

/**
 * Common Urdu and Roman Urdu number dictionary
 */
const URDU_NUMBERS_MAP: Array<{ pattern: RegExp; value: number }> = [
  // Compound lakhs and tens of thousands
  { pattern: /(?:ایک\s*لاکھ|ek\s*lakh)/i, value: 100000 },
  { pattern: /(?:پچاس\s*ہزار|pachaas\s*hazar|50\s*hazar)/i, value: 50000 },
  { pattern: /(?:پینتیس\s*ہزار|paintis\s*hazar|35\s*hazar)/i, value: 35000 },
  { pattern: /(?:بتیس\s*ہزار|battis\s*hazar|32\s*hazar)/i, value: 32000 },
  { pattern: /(?:تیس\s*ہزار|tees\s*hazar|30\s*hazar)/i, value: 30000 },
  { pattern: /(?:پچیس\s*ہزار|pachees\s*hazar|25\s*hazar)/i, value: 25000 },
  { pattern: /(?:بیس\s*ہزار|bees\s*hazar|20\s*hazar)/i, value: 20000 },
  { pattern: /(?:سولہ\s*ہزار|solah\s*hazar|16\s*hazar)/i, value: 16000 },
  { pattern: /(?:پندرہ\s*ہزار|pandrah\s*hazar|15\s*hazar)/i, value: 15000 },
  { pattern: /(?:دس\s*ہزار|das\s*hazar|10\s*hazar)/i, value: 10000 },
  { pattern: /(?:آٹھ\s*ہزار|aath\s*hazar|8\s*hazar)/i, value: 8000 },
  { pattern: /(?:سات\s*ہزار|saat\s*hazar|7\s*hazar)/i, value: 7000 },
  { pattern: /(?:چھ\s*ہزار|che\s*hazar|6\s*hazar)/i, value: 6000 },
  { pattern: /(?:پانچ\s*ہزار|paanch\s*hazar|panch\s*hazar|5\s*hazar)/i, value: 5000 },
  { pattern: /(?:چار\s*ہزار|chaar\s*hazar|char\s*hazar|4\s*hazar)/i, value: 4000 },
  { pattern: /(?:تین\s*ہزار|teen\s*hazar|tin\s*hazar|3\s*hazar)/i, value: 3000 },
  { pattern: /(?:ڈھائی\s*ہزار|dhai\s*hazar)/i, value: 2500 },
  { pattern: /(?:دو\s*ہزار|do\s*hazar|2\s*hazar)/i, value: 2000 },
  { pattern: /(?:ڈیڑھ\s*ہزار|dedh\s*hazar|pandra\s*sau|pandrah\s*sau|پندرہ\s*سو)/i, value: 1500 },
  { pattern: /(?:ایک\s*ہزار|ek\s*hazar|1\s*hazar|ہزار)/i, value: 1000 },

  // Hundreds
  { pattern: /(?:نو\s*سو|nau\s*sau|9\s*sau)/i, value: 900 },
  { pattern: /(?:آٹھ\s*سو|aath\s*sau|8\s*sau)/i, value: 800 },
  { pattern: /(?:سات\s*سو|saat\s*sau|7\s*sau)/i, value: 700 },
  { pattern: /(?:چھ\s*سو|che\s*sau|6\s*sau)/i, value: 600 },
  { pattern: /(?:پانچ\s*سو|paanch\s*sau|panch\s*sau|5\s*sau)/i, value: 500 },
  { pattern: /(?:چار\s*سو|chaar\s*sau|char\s*sau|4\s*sau)/i, value: 400 },
  { pattern: /(?:تین\s*سو|teen\s*sau|tin\s*sau|3\s*sau)/i, value: 300 },
  { pattern: /(?:ڈھائی\s*سو|dhai\s*sau)/i, value: 250 },
  { pattern: /(?:دو\s*سو|do\s*sau|2\s*sau)/i, value: 200 },
  { pattern: /(?:ایک\s*سو|ek\s*sau|سو)/i, value: 100 },
];

/**
 * Normalizes input text and converts all spelled Urdu/Roman Urdu numbers to digits
 */
export const normalizeDomesticUrduText = (text: string): string => {
  let normalized = convertUrduDigits(text);

  for (const item of URDU_NUMBERS_MAP) {
    normalized = normalized.replace(item.pattern, item.value.toString());
  }

  return normalized.trim();
};

/**
 * Main Household Voice Parser
 */
export const parseDomesticUrduVoice = (rawText: string): IParsedDomesticVoiceResult => {
  const normalized = normalizeDomesticUrduText(rawText);
  const lower = normalized.toLowerCase();

  // 1. Detect Payment Vault & Channel
  let paymentChannel: PaymentVaultChannel = 'CASH';
  let detectedVaultNameUrdu = 'گھریلو نقدی (دراز)';
  let detectedVaultNameEn = 'Wardrobe Cash Safe';
  let voucherType: 'CPV' | 'BPV' | 'WPV' = 'CPV';

  if (
    lower.includes('جاز کیش') ||
    lower.includes('jazzcash') ||
    lower.includes('جازکیش')
  ) {
    paymentChannel = 'WALLET';
    detectedVaultNameUrdu = 'جاز کیش والٹ (JazzCash)';
    detectedVaultNameEn = 'JazzCash Wallet';
    voucherType = 'WPV';
  } else if (
    lower.includes('ایزی پیسہ') ||
    lower.includes('easypaisa') ||
    lower.includes('ایزیپیسہ')
  ) {
    paymentChannel = 'WALLET';
    detectedVaultNameUrdu = 'ایزی پیسہ والٹ (Easypaisa)';
    detectedVaultNameEn = 'Easypaisa Wallet';
    voucherType = 'WPV';
  } else if (
    lower.includes('میزان') ||
    lower.includes('meezan')
  ) {
    paymentChannel = 'BANK';
    detectedVaultNameUrdu = 'میزان بینک (Meezan Bank)';
    detectedVaultNameEn = 'Meezan Bank';
    voucherType = 'BPV';
  } else if (
    lower.includes('حبیب') ||
    lower.includes('hbl')
  ) {
    paymentChannel = 'BANK';
    detectedVaultNameUrdu = 'حبیب بینک (HBL)';
    detectedVaultNameEn = 'Habib Bank Limited';
    voucherType = 'BPV';
  } else if (
    lower.includes('بینک') ||
    lower.includes('bank') ||
    lower.includes('اکاؤنٹ')
  ) {
    paymentChannel = 'BANK';
    detectedVaultNameUrdu = 'بینک اکاؤنٹ (Commercial Bank)';
    detectedVaultNameEn = 'Commercial Bank Account';
    voucherType = 'BPV';
  } else {
    // Default to Cash Safe
    paymentChannel = 'CASH';
    detectedVaultNameUrdu = 'گھریلو نقدی (دراز)';
    detectedVaultNameEn = 'Wardrobe Cash Safe';
    voucherType = 'CPV';
  }

  // 2. Identify Intent & Target Domestic Module
  let intent: DomesticVoiceIntent = 'GENERAL_EXPENSE';
  let targetModuleKey: 'MANDI' | 'STAFF' | 'UTILITY' | 'KAMETI' | 'SCHOOL_FEE' | 'GENERAL' = 'GENERAL';
  let isAdvancePayment = false;
  let entityNameHint: string | undefined = undefined;

  // Staff check: Driver / Maid / Cook / Peshgi / Advance
  if (
    lower.includes('ڈرائیور') ||
    lower.includes('driver') ||
    lower.includes('ملازمہ') ||
    lower.includes('ماسی') ||
    lower.includes('maid') ||
    lower.includes('کوک') ||
    lower.includes('cook') ||
    lower.includes('پیشگی') ||
    lower.includes('advance') ||
    lower.includes('تنخواہ') ||
    lower.includes('salary')
  ) {
    intent = 'STAFF_ADVANCE';
    targetModuleKey = 'STAFF';
    isAdvancePayment = lower.includes('پیشگی') || lower.includes('advance');
    if (lower.includes('ڈرائیور') || lower.includes('driver')) {
      entityNameHint = 'ڈرائیور (Driver)';
    } else if (lower.includes('ملازمہ') || lower.includes('ماسی') || lower.includes('maid')) {
      entityNameHint = 'ملازمہ (Maid)';
    } else if (lower.includes('کوک') || lower.includes('cook')) {
      entityNameHint = 'باورچی / کوک (Cook)';
    }
  }
  // Utility Bill check: Bijli / Gas / LESCO / Bill
  else if (
    lower.includes('بل') ||
    lower.includes('bill') ||
    lower.includes('بجلی') ||
    lower.includes('لیسکو') ||
    lower.includes('گیس') ||
    lower.includes('سوئی گیس') ||
    lower.includes('واپڈا') ||
    lower.includes('k-electric')
  ) {
    intent = 'UTILITY_PAYMENT';
    targetModuleKey = 'UTILITY';
    if (lower.includes('بجلی') || lower.includes('لیسکو') || lower.includes('electricity')) {
      entityNameHint = 'بجلی کا بل (Electricity Bill)';
    } else if (lower.includes('گیس') || lower.includes('gas')) {
      entityNameHint = 'سوئی گیس کا بل (Sui Gas Bill)';
    } else {
      entityNameHint = 'یوٹیلیٹی بل (Utility Bill)';
    }
  }
  // Kameti / BC check: Committee / Qist
  else if (
    lower.includes('کمیٹی') ||
    lower.includes('بی سی') ||
    lower.includes('kameti') ||
    lower.includes('committee') ||
    lower.includes('قسط') ||
    lower.includes('bc')
  ) {
    intent = 'KAMETI_INSTALLMENT';
    targetModuleKey = 'KAMETI';
    entityNameHint = 'ماہانہ بی سی قسط (Kameti Installment)';
  }
  // School / Tuition Fee check
  else if (
    lower.includes('اسکول') ||
    lower.includes('school') ||
    lower.includes('فیس') ||
    lower.includes('fee') ||
    lower.includes('اکیڈمی') ||
    lower.includes('ٹیوشن')
  ) {
    intent = 'SCHOOL_FEE_PAYMENT';
    targetModuleKey = 'SCHOOL_FEE';
    entityNameHint = 'اسکول و اکیڈمی فیس (School Fee)';
  }
  // Mandi / Fresh Perishables / Kitchen check
  else if (
    lower.includes('منڈی') ||
    lower.includes('mandi') ||
    lower.includes('چکن') ||
    lower.includes('chicken') ||
    lower.includes('گوشت') ||
    lower.includes('سبزی') ||
    lower.includes('پھل') ||
    lower.includes('دودھ') ||
    lower.includes('راشن') ||
    lower.includes('کچن') ||
    lower.includes('kitchen')
  ) {
    if (lower.includes('کچن') || lower.includes('kitchen')) {
      intent = 'GENERAL_EXPENSE';
      targetModuleKey = 'MANDI';
      entityNameHint = 'کچن کا روزمرہ خرچ (Kitchen Expense)';
    } else {
      intent = 'MANDI_EXPENSE';
      targetModuleKey = 'MANDI';
      entityNameHint = 'منڈی خریداری (Fresh Mandi & Meat)';
    }
  }

  // 3. Extract Multi-Item Splits and Numeric Amounts
  const itemSplits: IDomesticVoiceItemSplit[] = [];

  // Look for compound patterns like: "1500 کا چکن اور 500 کی سبزی"
  const chickenMatch = normalized.match(/(\d+)\s*(?:روپے|کا|کی)?\s*(?:چکن|مرغی|chicken)/i);
  if (chickenMatch) {
    itemSplits.push({
      itemNameUrdu: 'چکن / مرغی',
      itemNameEn: 'Fresh Chicken',
      amount: parseInt(chickenMatch[1], 10),
    });
  }

  const meatMatch = normalized.match(/(\d+)\s*(?:روپے|کا|کی)?\s*(?:گوشت|beef|mutton)/i);
  if (meatMatch) {
    itemSplits.push({
      itemNameUrdu: 'گوشت (بیف / مٹن)',
      itemNameEn: 'Meat (Beef/Mutton)',
      amount: parseInt(meatMatch[1], 10),
    });
  }

  const vegMatch = normalized.match(/(\d+)\s*(?:روپے|کا|کی)?\s*(?:سبزی|sabzi|vegetables)/i);
  if (vegMatch) {
    itemSplits.push({
      itemNameUrdu: 'تازہ سبزی',
      itemNameEn: 'Fresh Vegetables',
      amount: parseInt(vegMatch[1], 10),
    });
  }

  const fruitMatch = normalized.match(/(\d+)\s*(?:روپے|کا|کی)?\s*(?:پھل|fruit|fruits)/i);
  if (fruitMatch) {
    itemSplits.push({
      itemNameUrdu: 'تازہ پھل',
      itemNameEn: 'Fresh Fruits',
      amount: parseInt(fruitMatch[1], 10),
    });
  }

  const milkMatch = normalized.match(/(\d+)\s*(?:روپے|کا|کی)?\s*(?:دودھ|milk)/i);
  if (milkMatch) {
    itemSplits.push({
      itemNameUrdu: 'دودھ و دہی',
      itemNameEn: 'Fresh Milk & Yogurt',
      amount: parseInt(milkMatch[1], 10),
    });
  }

  // Calculate Total Amount
  let totalAmount = 0;
  if (itemSplits.length > 0) {
    totalAmount = itemSplits.reduce((acc, curr) => acc + curr.amount, 0);
  } else {
    // Single amount extraction (e.g. "دو ہزار روپے پیشگی" -> "2000 روپے پیشگی")
    const allNumbers = normalized.match(/\b\d{2,7}\b/g);
    if (allNumbers && allNumbers.length > 0) {
      totalAmount = parseInt(allNumbers[0], 10);
    }
  }

  // 4. Construct Titles & Bilingual Notes
  let titleUrdu = 'گھریلو خرچ';
  let titleEn = 'Household Domestic Expense';

  switch (intent) {
    case 'MANDI_EXPENSE':
      titleUrdu = `منڈی خریداری (${itemSplits.length > 0 ? itemSplits.map((i) => i.itemNameUrdu).join(' + ') : 'سبزی و گوشت'})`;
      titleEn = `Mandi Purchase (${itemSplits.length > 0 ? itemSplits.map((i) => i.itemNameEn).join(', ') : 'Provisions'})`;
      break;
    case 'STAFF_ADVANCE':
      titleUrdu = `${entityNameHint || 'گھریلو ملازم'} کو ${isAdvancePayment ? 'پیشگی ادائیگی (Advance)' : 'تنخواہ'}`;
      titleEn = `${isAdvancePayment ? 'Advance Payment to' : 'Salary Payment to'} ${entityNameHint || 'Staff'}`;
      break;
    case 'UTILITY_PAYMENT':
      titleUrdu = `${entityNameHint || 'یوٹیلیٹی بل'} کی ادائیگی`;
      titleEn = `Payment for ${entityNameHint || 'Utility Bill'}`;
      break;
    case 'KAMETI_INSTALLMENT':
      titleUrdu = 'کمیٹی / بی سی کی ماہانہ قسط';
      titleEn = 'Kameti Monthly BC Installment';
      break;
    case 'SCHOOL_FEE_PAYMENT':
      titleUrdu = 'بچوں کی اسکول و اکیڈمی فیس چالان';
      titleEn = 'Children School / College Fee Challan';
      break;
    default:
      titleUrdu = entityNameHint || 'متفرق گھریلو ادائیگی';
      titleEn = entityNameHint ? 'Kitchen / Household Expense' : 'Miscellaneous Household Expense';
      break;
  }

  const notesUrdu = `بذریعہ آواز: "${rawText}" • ادائیگی اکاؤنٹ: ${detectedVaultNameUrdu}`;
  const notesEn = `Logged via Voice: "${rawText}" • Channel: ${detectedVaultNameEn}`;

  return {
    rawTranscript: rawText,
    intent,
    targetModuleKey,
    titleUrdu,
    titleEn,
    totalAmount,
    itemSplits,
    paymentChannel,
    detectedVaultNameUrdu,
    detectedVaultNameEn,
    voucherType,
    entityNameHint,
    notesUrdu,
    notesEn,
    isAdvancePayment,
  };
};
