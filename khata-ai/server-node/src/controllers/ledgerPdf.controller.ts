import { Request, Response } from 'express';
import { Types } from 'mongoose';
import PDFDocument from 'pdfkit';
import { LedgerEntry } from '../models/LedgerEntry';
import { Profile } from '../models/Profile';

/**
 * Coordinate Matrix Constants (A4: 595.28 x 841.89 pt, 30 pt margins, 535 pt usable)
 */
const PAGE_MARGIN = 30;
const USABLE_WIDTH = 535;

const COLUMNS = {
  col1: { x: 30, width: 80, align: 'left' as const, label: 'Date & Time' },
  col2: { x: 110, width: 140, align: 'left' as const, label: 'Description / Khata Party' },
  col3: { x: 250, width: 65, align: 'center' as const, label: 'Channel' },
  col4: { x: 315, width: 60, align: 'center' as const, label: 'Voucher JEV' },
  col5: { x: 375, width: 65, align: 'right' as const, label: 'Inflow (+)' },
  col6: { x: 440, width: 65, align: 'right' as const, label: 'Outflow (-)' },
  col7: { x: 505, width: 60, align: 'right' as const, label: 'Run Balance' },
};

/**
 * Format currency in Pakistani Rupee standard
 */
const fmtPkr = (val: number): string => {
  return `Rs. ${Math.round(val).toLocaleString()}`;
};

/**
 * Structured Day-wise and Month-wise Tabular PDF Report Generator
 * GET /api/v1/ledger/cashflow-pdf
 * Query params: period=DAILY|MONTHLY|CUSTOM, date, month, startDate, endDate, channel=ALL|CASH|WALLET|BANK, format=base64|binary
 */
export const generateCashflowPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      res.status(401).json({ success: false, message: 'Unauthorized (لاگ ان لازمی ہے).' });
      return;
    }

    const {
      period = 'DAILY',
      date,
      month,
      startDate,
      endDate,
      channel = 'ALL',
      format = 'binary',
    } = req.query;

    // 1. Resolve date range
    let start: Date;
    let end: Date;
    let periodTitle: string;
    let reportBadge: string;

    const now = new Date();

    if (period === 'MONTHLY') {
      const monthStr = typeof month === 'string' && month ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const [y, m] = monthStr.split('-').map(Number);
      start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      end = new Date(y, m, 0, 23, 59, 59, 999);
      const monthName = start.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      periodTitle = `Monthly Statement: ${monthName}`;
      reportBadge = 'MONTHLY AUDIT STATEMENT (ماہانہ گوشوارہ)';
    } else if (period === 'CUSTOM') {
      const s = typeof startDate === 'string' && startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
      s.setHours(0, 0, 0, 0);
      const e = typeof endDate === 'string' && endDate ? new Date(endDate) : new Date();
      e.setHours(23, 59, 59, 999);
      start = s;
      end = e;
      periodTitle = `Custom Period: ${start.toLocaleDateString('en-PK')} to ${end.toLocaleDateString('en-PK')}`;
      reportBadge = 'CUSTOM PERIOD AUDIT REPORT (مدت وار گوشوارہ)';
    } else {
      // Default: DAILY
      const d = typeof date === 'string' && date ? new Date(date) : new Date();
      d.setHours(0, 0, 0, 0);
      start = new Date(d);
      end = new Date(d);
      end.setHours(23, 59, 59, 999);
      periodTitle = `Daily Roznamcha: ${start.toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}`;
      reportBadge = 'DAILY CASHFLOW ROZNAMCHA (روزنامچہ کیش فلو)';
    }

    // 2. Resolve Channel filter
    const matchStage: any = {
      profileId: new Types.ObjectId(profileId),
      createdAt: { $gte: start, $lte: end },
    };

    let channelBadge = 'All Channels (تمام اکاؤنٹس)';
    const chUpper = String(channel).toUpperCase();
    if (chUpper === 'CASH') {
      matchStage.paymentMode = 'CASH';
      channelBadge = 'Physical Cash Galla (دکان نقد گلہ)';
    } else if (chUpper === 'WALLET') {
      matchStage.paymentMode = { $in: ['JAZZCASH', 'EASYPAISA', 'RAAST', 'ONLINE'] };
      channelBadge = 'Digital Wallet (JazzCash / EasyPaisa / Raast)';
    } else if (chUpper === 'BANK') {
      matchStage.paymentMode = { $in: ['BANK_TRANSFER', 'CHEQUE'] };
      channelBadge = 'Bank Account (بینک کھاتہ)';
    }

    // 3. Query Shop Profile & Ledger Entries
    const [shopProfile, entries] = await Promise.all([
      Profile.findById(new Types.ObjectId(profileId)).lean(),
      LedgerEntry.find(matchStage)
        .populate('counterpartyId', 'name phone relationType')
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    const businessName = shopProfile?.businessName || shopProfile?.fullName || 'Saad Store (Digi Hisab)';
    const businessAddress = shopProfile?.businessAddress || 'Chak 110 JB, Faisalabad';
    const businessPhone = shopProfile?.phone || '+92 300 1234567';

    // 4. Compute Totals
    let totalInflows = 0;
    let totalOutflows = 0;
    entries.forEach((e) => {
      const isInflow = e.entryType === 'CASH_IN' || e.entryType === 'SETTLEMENT';
      const isOutflow = e.entryType === 'CASH_OUT' || e.entryType === 'RECEIVABLE';
      if (isInflow) totalInflows += e.amount;
      else if (isOutflow) totalOutflows += e.amount;
    });
    const netClosing = totalInflows - totalOutflows;

    // 5. Initialize PDF Document (A4 portrait)
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE_MARGIN,
      bufferPages: true,
      info: {
        Title: `${businessName} - Cashflow Report`,
        Author: 'DigiHisab Smart Khata AI',
      },
    });

    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));

    const drawHeaderBox = (yPos: number): number => {
      // Top header banner background
      doc.rect(PAGE_MARGIN, yPos, USABLE_WIDTH, 70).fill('#0f172a');

      // Business name & details
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
        .text(businessName, PAGE_MARGIN + 14, yPos + 12, { width: 330 });

      doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
        .text(`Address: ${businessAddress}   |   Phone: ${businessPhone}`, PAGE_MARGIN + 14, yPos + 34, { width: 330 })
        .text(`Channel: ${channelBadge}`, PAGE_MARGIN + 14, yPos + 48, { width: 330 });

      // Badge on right
      doc.roundedRect(PAGE_MARGIN + USABLE_WIDTH - 180, yPos + 10, 168, 22, 4).fill('#0369a1');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
        .text(reportBadge, PAGE_MARGIN + USABLE_WIDTH - 176, yPos + 16, { width: 160, align: 'center' });

      doc.fillColor('#cbd5e1').fontSize(8).font('Helvetica')
        .text(periodTitle, PAGE_MARGIN + USABLE_WIDTH - 180, yPos + 36, { width: 168, align: 'right' })
        .text(`Printed: ${new Date().toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, PAGE_MARGIN + USABLE_WIDTH - 180, yPos + 48, { width: 168, align: 'right' });

      return yPos + 78;
    };

    const drawKpiStrip = (yPos: number): number => {
      const cardWidth = (USABLE_WIDTH - 16) / 3;

      // Card 1: Inflows
      doc.rect(PAGE_MARGIN, yPos, cardWidth, 46).fill('#f0fdf4');
      doc.rect(PAGE_MARGIN, yPos, cardWidth, 46).strokeColor('#bbf7d0').lineWidth(1).stroke();
      doc.fillColor('#15803d').fontSize(8.5).font('Helvetica-Bold')
        .text('TOTAL INFLOWS (آمدن)', PAGE_MARGIN + 8, yPos + 8, { width: cardWidth - 16 });
      doc.fillColor('#16a34a').fontSize(13).font('Helvetica-Bold')
        .text(`+ ${fmtPkr(totalInflows)}`, PAGE_MARGIN + 8, yPos + 22, { width: cardWidth - 16 });

      // Card 2: Outflows
      const card2X = PAGE_MARGIN + cardWidth + 8;
      doc.rect(card2X, yPos, cardWidth, 46).fill('#fff1f2');
      doc.rect(card2X, yPos, cardWidth, 46).strokeColor('#fecdd3').lineWidth(1).stroke();
      doc.fillColor('#be123c').fontSize(8.5).font('Helvetica-Bold')
        .text('TOTAL OUTFLOWS (اخراجات)', card2X + 8, yPos + 8, { width: cardWidth - 16 });
      doc.fillColor('#dc2626').fontSize(13).font('Helvetica-Bold')
        .text(`- ${fmtPkr(totalOutflows)}`, card2X + 8, yPos + 22, { width: cardWidth - 16 });

      // Card 3: Net Closing Position
      const card3X = card2X + cardWidth + 8;
      doc.rect(card3X, yPos, cardWidth, 46).fill('#f8fafc');
      doc.rect(card3X, yPos, cardWidth, 46).strokeColor('#cbd5e1').lineWidth(1).stroke();
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
        .text('NET CLOSING POSITION (میزان)', card3X + 8, yPos + 8, { width: cardWidth - 16 });
      doc.fillColor(netClosing >= 0 ? '#0f172a' : '#b91c1c').fontSize(13).font('Helvetica-Bold')
        .text(fmtPkr(netClosing), card3X + 8, yPos + 22, { width: cardWidth - 16 });

      return yPos + 56;
    };

    const drawTableHeader = (yPos: number): number => {
      doc.rect(PAGE_MARGIN, yPos, USABLE_WIDTH, 22).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

      doc.text(COLUMNS.col1.label, COLUMNS.col1.x + 4, yPos + 7, { width: COLUMNS.col1.width - 6, align: COLUMNS.col1.align });
      doc.text(COLUMNS.col2.label, COLUMNS.col2.x + 4, yPos + 7, { width: COLUMNS.col2.width - 6, align: COLUMNS.col2.align });
      doc.text(COLUMNS.col3.label, COLUMNS.col3.x, yPos + 7, { width: COLUMNS.col3.width, align: COLUMNS.col3.align });
      doc.text(COLUMNS.col4.label, COLUMNS.col4.x, yPos + 7, { width: COLUMNS.col4.width, align: COLUMNS.col4.align });
      doc.text(COLUMNS.col5.label, COLUMNS.col5.x, yPos + 7, { width: COLUMNS.col5.width - 4, align: COLUMNS.col5.align });
      doc.text(COLUMNS.col6.label, COLUMNS.col6.x, yPos + 7, { width: COLUMNS.col6.width - 4, align: COLUMNS.col6.align });
      doc.text(COLUMNS.col7.label, COLUMNS.col7.x, yPos + 7, { width: COLUMNS.col7.width - 4, align: COLUMNS.col7.align });

      return yPos + 22;
    };

    const drawSignoffFooter = (yPos: number) => {
      const lineY = yPos + 26;
      doc.strokeColor('#cbd5e1').lineWidth(1);
      doc.moveTo(PAGE_MARGIN + 30, lineY).lineTo(PAGE_MARGIN + 190, lineY).stroke();
      doc.moveTo(PAGE_MARGIN + USABLE_WIDTH - 190, lineY).lineTo(PAGE_MARGIN + USABLE_WIDTH - 30, lineY).stroke();

      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold')
        .text('Store Owner Signature (دستخط مالک دکان)', PAGE_MARGIN + 30, lineY + 6, { width: 160, align: 'center' })
        .text('Cashier / Incharge Signature (دستخط کیشیئر)', PAGE_MARGIN + USABLE_WIDTH - 190, lineY + 6, { width: 160, align: 'center' });

      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
        .text('Verified by DigiHisab Smart Khata AI - Immutable Local Ledger', PAGE_MARGIN, lineY + 28, { width: USABLE_WIDTH, align: 'center' });
    };

    // 6. Draw Page 1
    let curY = drawHeaderBox(PAGE_MARGIN);
    curY = drawKpiStrip(curY);
    curY = drawTableHeader(curY);

    let runningBalance = 0;
    const ROW_HEIGHT = 20;
    const FOOTER_RESERVE = 80;
    const MAX_PAGE_Y = 841.89 - PAGE_MARGIN - FOOTER_RESERVE;

    if (entries.length === 0) {
      doc.rect(PAGE_MARGIN, curY, USABLE_WIDTH, 40).fill('#f8fafc');
      doc.fillColor('#64748b').fontSize(10).font('Helvetica')
        .text('Is muntakhib arsay mein koi transaction darj nahi hui (No records found for this period).', PAGE_MARGIN, curY + 14, { width: USABLE_WIDTH, align: 'center' });
      curY += 50;
    } else {
      entries.forEach((entry, idx) => {
        // Page break check
        if (curY + ROW_HEIGHT > MAX_PAGE_Y) {
          doc.addPage();
          curY = drawTableHeader(PAGE_MARGIN);
        }

        const isInflow = entry.entryType === 'CASH_IN' || entry.entryType === 'SETTLEMENT';
        const isOutflow = entry.entryType === 'CASH_OUT' || entry.entryType === 'RECEIVABLE';

        if (isInflow) runningBalance += entry.amount;
        else if (isOutflow) runningBalance -= entry.amount;

        // Zebra row background
        const isEven = idx % 2 === 0;
        doc.rect(PAGE_MARGIN, curY, USABLE_WIDTH, ROW_HEIGHT).fill(isEven ? '#ffffff' : '#f8fafc');

        // Border bottom
        doc.strokeColor('#e2e8f0').lineWidth(0.5);
        doc.moveTo(PAGE_MARGIN, curY + ROW_HEIGHT).lineTo(PAGE_MARGIN + USABLE_WIDTH, curY + ROW_HEIGHT).stroke();

        // Col 1: Date & Time
        const dt = new Date(entry.createdAt);
        const dateStr = `${dt.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' })} ${dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`;
        doc.fillColor('#334155').fontSize(7.5).font('Helvetica')
          .text(dateStr, COLUMNS.col1.x + 4, curY + 5, { width: COLUMNS.col1.width - 6, align: COLUMNS.col1.align });

        // Col 2: Description / Party
        const cp = entry.counterpartyId as any;
        const partyName = cp?.name ? String(cp.name) : '';
        const cat = entry.category || (isInflow ? 'Quick Cash Sale' : 'Expense');
        const descText = partyName ? `${partyName} (${cat})` : (entry.description || cat);
        const truncatedDesc = descText.length > 28 ? descText.substring(0, 26) + '...' : descText;

        doc.fillColor('#0f172a').fontSize(8).font('Helvetica')
          .text(truncatedDesc, COLUMNS.col2.x + 4, curY + 5, { width: COLUMNS.col2.width - 6, align: COLUMNS.col2.align });

        // Col 3: Channel
        let channelTag = 'CASH';
        const modeUpper = String(entry.paymentMode || 'CASH').toUpperCase();
        if (modeUpper.includes('BANK') || modeUpper.includes('CHEQUE')) channelTag = 'BANK';
        else if (modeUpper.includes('JAZZ') || modeUpper.includes('EASY') || modeUpper.includes('WALLET') || modeUpper.includes('RAAST')) channelTag = 'WALLET';
        else channelTag = 'CASH';

        doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
          .text(channelTag, COLUMNS.col3.x, curY + 5, { width: COLUMNS.col3.width, align: COLUMNS.col3.align });

        // Col 4: Voucher / JEV Code
        const jevCode = `JEV-${entry._id.toString().substring(18, 24).toUpperCase()}`;
        doc.fillColor('#64748b').fontSize(7).font('Helvetica')
          .text(jevCode, COLUMNS.col4.x, curY + 5, { width: COLUMNS.col4.width, align: COLUMNS.col4.align });

        // Col 5: Inflow (+)
        doc.fillColor('#16a34a').fontSize(8).font('Helvetica-Bold')
          .text(isInflow ? `+${entry.amount.toLocaleString()}` : '-', COLUMNS.col5.x, curY + 5, { width: COLUMNS.col5.width - 4, align: COLUMNS.col5.align });

        // Col 6: Outflow (-)
        doc.fillColor('#dc2626').fontSize(8).font('Helvetica-Bold')
          .text(isOutflow ? `-${entry.amount.toLocaleString()}` : '-', COLUMNS.col6.x, curY + 5, { width: COLUMNS.col6.width - 4, align: COLUMNS.col6.align });

        // Col 7: Running Balance
        doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
          .text(runningBalance.toLocaleString(), COLUMNS.col7.x, curY + 5, { width: COLUMNS.col7.width - 4, align: COLUMNS.col7.align });

        curY += ROW_HEIGHT;
      });
    }

    // Check if footer fits on current page
    if (curY + FOOTER_RESERVE > 841.89 - PAGE_MARGIN) {
      doc.addPage();
      curY = PAGE_MARGIN + 10;
    }

    drawSignoffFooter(curY + 12);

    doc.end();

    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      const filename = `Cashflow_${period}_${Date.now()}.pdf`;

      if (format === 'base64') {
        res.status(200).json({
          success: true,
          filename,
          base64: pdfBuffer.toString('base64'),
          summary: {
            totalInflows,
            totalOutflows,
            netClosing,
            recordCount: entries.length,
          },
        });
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.status(200).send(pdfBuffer);
      }
    });
  } catch (error: any) {
    console.error('[generateCashflowPdf Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error generating cashflow PDF report.',
    });
  }
};
