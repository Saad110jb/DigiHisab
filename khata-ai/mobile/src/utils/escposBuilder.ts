/**
 * Digi Hisab - Pure TypeScript ESC/POS Thermal Printer Command Builder
 * Supports 58mm (32 columns standard) and 80mm (48 columns standard) thermal paper.
 * Implements ESC/POS byte sequence generation for bazaar thermal receipt printers.
 */

export interface ThermalReceiptItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  total: number;
}

export interface ThermalReceiptData {
  storeName?: string;
  storeTagline?: string;
  storeAddress?: string;
  storePhone?: string;
  ntn?: string;
  strn?: string;
  receiptNo?: string;
  dateStr?: string;
  cashierName?: string;
  customerName?: string;
  customerPhone?: string;
  paymentMode?: string;
  items?: ThermalReceiptItem[];
  subtotal?: number;
  discountAmount?: number;
  grandTotal: number;
  amountPaid?: number;
  changeDue?: number;
  remainingBalance?: number;
  raastId?: string;
  raastQrData?: string;
  footerNoteUrdu?: string;
  footerNoteEnglish?: string;
}

export type PaperWidth = '58mm' | '80mm';

export interface EscposOptions {
  paperWidth?: PaperWidth;
  openDrawer?: boolean;
  cutPaper?: boolean;
}

// Low-level ESC/POS control byte constants
export const ESC_POS_BYTES = {
  // Initialization & Hardware
  INIT: [0x1b, 0x40], // ESC @ (Initialize printer)
  DRAWER_KICK: [0x1b, 0x70, 0x00, 0x19, 0xfa], // ESC p 0 25 250 (Kick open RJ11 cash drawer)

  // Alignment
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],

  // Text Formats & Sizing
  NORMAL: [0x1b, 0x21, 0x00], // Normal font
  BOLD_ON: [0x1b, 0x45, 0x01], // ESC E 1 (Bold ON)
  BOLD_OFF: [0x1b, 0x45, 0x00], // ESC E 0 (Bold OFF)
  DOUBLE_HEIGHT: [0x1b, 0x21, 0x10], // Double height
  DOUBLE_WIDTH: [0x1b, 0x21, 0x20], // Double width
  HEADER_LARGE: [0x1b, 0x21, 0x30], // Double height + Double width (Large Header)
  UNDERLINE_ON: [0x1b, 0x2d, 0x01],
  UNDERLINE_OFF: [0x1b, 0x2d, 0x00],
  INVERT_ON: [0x1d, 0x42, 0x01], // GS B 1 (White on Black)
  INVERT_OFF: [0x1d, 0x42, 0x00], // GS B 0

  // Feeds and Cutting
  LINE_FEED: [0x0a],
  FEED_3_LINES: [0x1b, 0x64, 0x03],
  FEED_5_LINES: [0x1b, 0x64, 0x05],
  CUT_FULL: [0x1d, 0x56, 0x41, 0x03], // GS V A 3 (Feed and full cut)
  CUT_PARTIAL: [0x1d, 0x56, 0x01], // GS V 1 (Partial cut)
};

export class EscposBuilder {
  private buffer: number[] = [];
  private readonly maxCols: number;

  constructor(paperWidth: PaperWidth = '58mm') {
    // 58mm thermal rolls typically accommodate 32 chars in standard Font A (12x24)
    // 80mm rolls accommodate 48 chars in standard Font A
    this.maxCols = paperWidth === '80mm' ? 48 : 32;
    this.init();
  }

  public getColumnWidth(): number {
    return this.maxCols;
  }

  public raw(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  public init(): this {
    return this.raw(ESC_POS_BYTES.INIT);
  }

  public alignLeft(): this {
    return this.raw(ESC_POS_BYTES.ALIGN_LEFT);
  }

  public alignCenter(): this {
    return this.raw(ESC_POS_BYTES.ALIGN_CENTER);
  }

  public alignRight(): this {
    return this.raw(ESC_POS_BYTES.ALIGN_RIGHT);
  }

  public bold(enable: boolean = true): this {
    return this.raw(enable ? ESC_POS_BYTES.BOLD_ON : ESC_POS_BYTES.BOLD_OFF);
  }

  public normal(): this {
    return this.raw(ESC_POS_BYTES.NORMAL).raw(ESC_POS_BYTES.BOLD_OFF);
  }

  public headerLarge(): this {
    return this.raw(ESC_POS_BYTES.HEADER_LARGE).raw(ESC_POS_BYTES.BOLD_ON);
  }

  public doubleHeight(): this {
    return this.raw(ESC_POS_BYTES.DOUBLE_HEIGHT).raw(ESC_POS_BYTES.BOLD_ON);
  }

  public lineFeed(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.raw(ESC_POS_BYTES.LINE_FEED);
    }
    return this;
  }

  public feedAndCut(full: boolean = true): this {
    this.raw(ESC_POS_BYTES.FEED_3_LINES);
    return this.raw(full ? ESC_POS_BYTES.CUT_FULL : ESC_POS_BYTES.CUT_PARTIAL);
  }

  public openDrawer(): this {
    return this.raw(ESC_POS_BYTES.DRAWER_KICK);
  }

  /**
   * Encodes standard ASCII string to bytes (sanitizing non-ASCII to closest representation)
   */
  public text(str: string): this {
    if (!str) return this;
    for (let i = 0; i < str.length; i++) {
      let code = str.charCodeAt(i);
      // Fallback for non-ASCII characters to prevent corrupting printer control codes
      if (code > 255) {
        code = 63; // '?'
      }
      this.buffer.push(code);
    }
    return this;
  }

  public textLine(str: string = ''): this {
    this.text(str);
    return this.lineFeed(1);
  }

  /**
   * Prints a continuous divider line across the full paper width
   */
  public divider(char: string = '-'): this {
    const line = char.repeat(this.maxCols).slice(0, this.maxCols);
    return this.alignLeft().normal().textLine(line);
  }

  /**
   * Prints double dashed divider
   */
  public doubleDivider(): this {
    return this.divider('=');
  }

  /**
   * Prints two columns: left aligned and right aligned to exact paper width
   */
  public twoColumns(leftText: string, rightText: string, bold: boolean = false): this {
    if (bold) this.bold(true);
    const left = leftText || '';
    const right = rightText || '';
    const spacesNeeded = this.maxCols - (left.length + right.length);

    if (spacesNeeded <= 0) {
      // If text exceeds column width, truncate left text
      const maxLeft = Math.max(1, this.maxCols - right.length - 1);
      const truncatedLeft = left.slice(0, maxLeft);
      const adjustedSpaces = Math.max(1, this.maxCols - (truncatedLeft.length + right.length));
      this.textLine(`${truncatedLeft}${' '.repeat(adjustedSpaces)}${right}`);
    } else {
      this.textLine(`${left}${' '.repeat(spacesNeeded)}${right}`);
    }

    if (bold) this.bold(false);
    return this;
  }

  /**
   * Prints a three column table row (e.g., Item, Qty, Total)
   * 58mm: 16 chars Item | 5 chars Qty | 11 chars Price
   * 80mm: 26 chars Item | 8 chars Qty | 14 chars Price
   */
  public tableRow(item: string, qty: string, price: string, bold: boolean = false): this {
    if (bold) this.bold(true);

    const is80 = this.maxCols >= 48;
    const itemColWidth = is80 ? 26 : 15;
    const qtyColWidth = is80 ? 8 : 6;
    const priceColWidth = this.maxCols - itemColWidth - qtyColWidth;

    const trimmedItem = item.length > itemColWidth ? item.slice(0, itemColWidth - 1) + '.' : item.padEnd(itemColWidth, ' ');
    const trimmedQty = qty.padStart(qtyColWidth, ' ');
    const trimmedPrice = price.padStart(priceColWidth, ' ');

    this.textLine(`${trimmedItem}${trimmedQty}${trimmedPrice}`);
    if (bold) this.bold(false);
    return this;
  }

  /**
   * Appends Native ESC/POS QR code command bytes (Epson Model 2)
   */
  public qrCode(content: string, moduleSize: number = 4): this {
    if (!content) return this;
    const sanitized = content.trim();
    const len = sanitized.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);

    const contentBytes: number[] = [];
    for (let i = 0; i < sanitized.length; i++) {
      contentBytes.push(sanitized.charCodeAt(i) & 0xff);
    }

    // 1. Select Model (Model 2)
    this.raw([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    // 2. Set module size (3-8 dots)
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(8, Math.max(2, moduleSize))]);
    // 3. Set error correction level M (49)
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
    // 4. Store QR data in symbol storage area
    this.raw([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...contentBytes]);
    // 5. Print the symbol data in the symbol storage area
    this.raw([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);
    this.lineFeed(1);

    return this;
  }

  /**
   * Build final byte array
   */
  public toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

/**
 * Formats a complete Pakistani Bazaar Thermal Receipt (Kacha Parcha / Cash Memo)
 */
export function buildPakistaniThermalReceipt(
  data: ThermalReceiptData,
  options: EscposOptions = {}
): Uint8Array {
  const paperWidth = options.paperWidth || '58mm';
  const builder = new EscposBuilder(paperWidth);

  if (options.openDrawer) {
    builder.openDrawer();
  }

  // --- HEADER SECTION ---
  builder.alignCenter();
  builder.normal().textLine('BISMILLAH-IR-RAHMAN-IR-RAHEEM');
  builder.lineFeed(1);

  // Store Name
  const storeName = (data.storeName || 'DIGI HISAB KAROBAR').toUpperCase();
  builder.headerLarge().textLine(storeName);
  builder.normal();

  if (data.storeTagline) {
    builder.textLine(data.storeTagline);
  }
  if (data.storeAddress) {
    builder.textLine(data.storeAddress);
  }
  if (data.storePhone) {
    builder.textLine(`Tel/WhatsApp: ${data.storePhone}`);
  }
  if (data.ntn) {
    builder.textLine(`NTN: ${data.ntn}${data.strn ? ` | STRN: ${data.strn}` : ''}`);
  }

  builder.divider('=');

  // Slip Title
  builder.doubleHeight().textLine('KACHA PARCHA / CASH MEMO');
  builder.normal();
  builder.divider('-');

  // Metadata rows
  builder.alignLeft();
  const receiptNo = data.receiptNo || `RCP-${Date.now().toString().slice(-6)}`;
  builder.twoColumns('Receipt #:', receiptNo);

  const dateStr =
    data.dateStr ||
    new Date().toLocaleString('en-PK', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  builder.twoColumns('Date & Time:', dateStr);

  if (data.cashierName) {
    builder.twoColumns('Cashier (Galla):', data.cashierName);
  }
  if (data.customerName) {
    builder.twoColumns('Customer (Gahak):', data.customerName, true);
    if (data.customerPhone) {
      builder.twoColumns('Phone:', data.customerPhone);
    }
  }
  if (data.paymentMode) {
    builder.twoColumns('Payment Mode:', data.paymentMode);
  }

  builder.divider('-');

  // --- ITEM TABLE ---
  builder.tableRow('ITEM', 'QTY', 'AMOUNT', true);
  builder.divider('-');

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      const priceStr = `Rs ${item.total.toLocaleString()}`;
      builder.tableRow(item.name, `${item.quantity}`, priceStr);
    }
  } else {
    // Single counter sale line
    const total = data.grandTotal || 0;
    builder.tableRow('Counter Cash Sale', '1', `Rs ${total.toLocaleString()}`);
  }

  builder.divider('-');

  // --- TOTALS SECTION ---
  if (data.subtotal && data.subtotal !== data.grandTotal) {
    builder.twoColumns('Subtotal:', `Rs ${data.subtotal.toLocaleString()}`);
  }
  if (data.discountAmount && data.discountAmount > 0) {
    builder.twoColumns('Riyayat (Discount):', `- Rs ${data.discountAmount.toLocaleString()}`);
  }

  builder.doubleDivider();
  // Grand total emphasized
  builder.doubleHeight();
  builder.twoColumns('TOTAL (PKR):', `Rs ${data.grandTotal.toLocaleString()}`, true);
  builder.normal();
  builder.doubleDivider();

  // Cash Tend / Change / Remaining balance
  if (data.amountPaid !== undefined && data.amountPaid > 0) {
    builder.twoColumns('Wasool (Paid):', `Rs ${data.amountPaid.toLocaleString()}`);
  }
  if (data.changeDue !== undefined && data.changeDue > 0) {
    builder.twoColumns('Baqaya (Change):', `Rs ${data.changeDue.toLocaleString()}`);
  }
  if (data.remainingBalance !== undefined && data.remainingBalance > 0) {
    builder.bold(true);
    builder.twoColumns('Baqaya Khata (Due):', `Rs ${data.remainingBalance.toLocaleString()}`);
    builder.bold(false);
  }

  // --- RAAST QR SECTION ---
  const qrData = data.raastQrData || (data.raastId ? `raast://${data.raastId}?amt=${data.grandTotal}` : undefined);
  if (qrData) {
    builder.divider('-');
    builder.alignCenter();
    builder.bold(true).textLine('RAAST INSTANT PAYMENT');
    builder.normal().textLine('Scan via JazzCash / Easypaisa / Any Bank');
    builder.lineFeed(1);
    builder.qrCode(qrData, paperWidth === '80mm' ? 6 : 4);
    if (data.raastId) {
      builder.textLine(`Raast ID: ${data.raastId}`);
    }
  }

  // --- FOOTER SECTION ---
  builder.divider('-');
  builder.alignCenter().normal();
  builder.textLine(data.footerNoteUrdu || '*** SHUKRIYA TASHREEF AAWRI KA ***');
  builder.textLine(data.footerNoteEnglish || 'Tabdeeli sirf 3 din mein raseed k sath');
  builder.textLine('Powered by Digi Hisab (khata.ai)');
  builder.lineFeed(2);

  if (options.cutPaper !== false) {
    builder.feedAndCut(true);
  } else {
    builder.lineFeed(4);
  }

  return builder.toUint8Array();
}
