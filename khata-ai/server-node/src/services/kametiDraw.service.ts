/**
 * Digi Hisab - Kameti (Committee) Draw & Payout Engine
 *
 * Implements:
 * 1. Cryptographically Fair Lucky Draw (Fisher-Yates shuffle with crypto.randomInt)
 * 2. Bidding / Neelaam Auction mode (with member discount dividend calculations)
 * 3. 58mm / 80mm Thermal Receipt Voucher generator for Pakistani bazaar printers
 * 4. Monthly Installment Lifecycle Sentinel (1st & 5th grace period alerts)
 */

import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  DomesticKameti,
  IDomesticKameti,
  IKametiDrawScheduleItem,
  IPayoutVoucher,
} from '../models/DomesticKameti';
import { dispatchPushNotification } from './notificationDispatcher.service';
import { socketService } from './socket.service';

export interface IMemberDrawCandidate {
  id: string;
  name: string;
  phone?: string;
  pinnedMonth?: number; // Pre-agreed or fixed slot (e.g. Organizer Month 1)
}

export interface IFairDrawResult {
  schedule: IKametiDrawScheduleItem[];
  drawSeedHash: string;
  drawDate: Date;
  summaryUrdu: string;
}

export class KametiDrawService {
  /**
   * Cryptographically fair lottery draw using crypto.randomInt
   */
  public executeFairDraw(
    members: IMemberDrawCandidate[],
    totalMonths: number,
    poolAmount: number
  ): IFairDrawResult {
    if (members.length === 0) {
      throw new Error('قرعہ اندازی کے لیے کم از کم ایک ممبر درکار ہے۔');
    }

    // 1. Collect and validate pinned months
    const pinnedSet = new Set<number>();
    const pinnedMembers: IMemberDrawCandidate[] = [];
    const unpinnedMembers: IMemberDrawCandidate[] = [];

    for (const m of members) {
      if (m.pinnedMonth && m.pinnedMonth >= 1 && m.pinnedMonth <= totalMonths) {
        if (pinnedSet.has(m.pinnedMonth)) {
          throw new Error(`ماہ #${m.pinnedMonth} ایک سے زائد ممبرز کے لیے فکس نہیں ہو سکتا۔`);
        }
        pinnedSet.add(m.pinnedMonth);
        pinnedMembers.push(m);
      } else {
        unpinnedMembers.push(m);
      }
    }

    // 2. Identify available months for random assignment
    const availableMonths: number[] = [];
    for (let m = 1; m <= totalMonths; m++) {
      if (!pinnedSet.has(m)) {
        availableMonths.push(m);
      }
    }

    // 3. Cryptographically unbiased Fisher-Yates shuffle on availableMonths
    for (let i = availableMonths.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [availableMonths[i], availableMonths[j]] = [availableMonths[j], availableMonths[i]];
    }

    // 4. Build immutable draw schedule
    const schedule: IKametiDrawScheduleItem[] = [];

    // Add pinned slots first
    pinnedMembers.forEach((m) => {
      schedule.push({
        cycleNumber: m.pinnedMonth!,
        memberId: new Types.ObjectId(m.id),
        memberName: m.name,
        memberPhone: m.phone,
        isPinned: true,
        expectedPayoutAmount: poolAmount,
        netPayoutAmount: poolAmount,
        payoutStatus: 'SCHEDULED',
      });
    });

    // Add fairly randomized unpinned slots
    unpinnedMembers.forEach((m, idx) => {
      const assignedMonth = availableMonths[idx] || (idx + 1);
      schedule.push({
        cycleNumber: assignedMonth,
        memberId: new Types.ObjectId(m.id),
        memberName: m.name,
        memberPhone: m.phone,
        isPinned: false,
        expectedPayoutAmount: poolAmount,
        netPayoutAmount: poolAmount,
        payoutStatus: 'SCHEDULED',
      });
    });

    // Sort in sequential chronological order (Month 1 to N)
    schedule.sort((a, b) => a.cycleNumber - b.cycleNumber);

    // 5. Generate cryptographic audit hash for transparency
    const now = new Date();
    const entropySource = `${now.toISOString()}:${schedule.map((s) => `${s.cycleNumber}-${s.memberName}`).join('|')}`;
    const drawSeedHash = crypto.createHash('sha256').update(entropySource).digest('hex').substring(0, 16);

    const summaryUrdu = `🎉 باضابطہ قرعہ اندازی مکمل ہو گئی ہے! کل ${schedule.length} ممبرز کو 1 تا ${totalMonths} ماہ الاٹ کر دیے گئے ہیں۔ تصدیقی کوڈ: ${drawSeedHash}`;

    return {
      schedule,
      drawSeedHash,
      drawDate: now,
      summaryUrdu,
    };
  }

  /**
   * Applies bidding / neelaam auction discount to a cycle payout
   */
  public applyBiddingAuction(
    schedule: IKametiDrawScheduleItem[],
    cycleNumber: number,
    winningMemberId: string,
    bidDiscountAmount: number,
    totalMonths: number,
    poolAmount: number
  ): { updatedSchedule: IKametiDrawScheduleItem[]; dividendPerMember: number } {
    const item = schedule.find((s) => s.cycleNumber === cycleNumber);
    if (!item) {
      throw new Error(`ماہ #${cycleNumber} کا شیڈول موجود نہیں ہے۔`);
    }

    const discount = Math.max(0, Number(bidDiscountAmount) || 0);
    const netPayout = Math.max(0, poolAmount - discount);
    const dividendPerMember = totalMonths > 1 ? Math.floor(discount / (totalMonths - 1)) : 0;

    item.memberId = new Types.ObjectId(winningMemberId);
    item.bidDiscountAmount = discount;
    item.dividendPerMember = dividendPerMember;
    item.netPayoutAmount = netPayout;

    return { updatedSchedule: schedule, dividendPerMember };
  }

  /**
   * Formats official Pakistani thermal receipt (58mm / 80mm ESC/POS compatible) & WhatsApp slip
   */
  public formatPayoutChit(payload: {
    kametiTitle: string;
    organizerName: string;
    organizerPhone?: string;
    voucherNumber: string;
    cycleNumber: number;
    totalMonths: number;
    recipientName: string;
    recipientPhone?: string;
    grossPoolAmount: number;
    bidDiscountAmount?: number;
    netAmount: number;
    paymentMode: string;
    vaultAccountTitle?: string;
    disbursementDate?: Date;
    notes?: string;
  }): { thermalChit: string; whatsappSlip: string } {
    const d = payload.disbursementDate || new Date();
    const dateFormatted = d.toLocaleDateString('ur-PK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. WhatsApp formatted text with bold & emojis
    const whatsappSlip = `🤝 *ڈیجی حساب — کمیٹی کیش ادائیگی تصدیق*
━━━━━━━━━━━━━━━━━━━━━━━━
🔢 *واؤچر نمبر*: ${payload.voucherNumber}
📅 *تاریخ*: ${dateFormatted} (${timeFormatted})
🏷️ *کمیٹی*: ${payload.kametiTitle}
👤 *وصول کنندہ*: ${payload.recipientName} ${payload.recipientPhone ? `(${payload.recipientPhone})` : ''}
🗓️ *سائیکل / باری*: ماہ ${payload.cycleNumber} از ${payload.totalMonths}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 *کل کمیٹی پول*: Rs. ${payload.grossPoolAmount.toLocaleString()}
${payload.bidDiscountAmount && payload.bidDiscountAmount > 0 ? `📉 *نیلامی ڈسکاؤنٹ*: -Rs. ${payload.bidDiscountAmount.toLocaleString()}\n` : ''}✅ *خالص ادا شدہ رقم*: *Rs. ${payload.netAmount.toLocaleString()}*
💳 *طریقۂ ادائیگی*: ${payload.paymentMode}${payload.vaultAccountTitle ? ` (${payload.vaultAccountTitle})` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━
🤲 *نوٹ*: یہ کمیٹی رقم باہمی رضامندی و قرعہ اندازی کے تحت کامیابی سے ادا کر دی گئی ہے۔
🛡️ منتظم: ${payload.organizerName} ${payload.organizerPhone ? `• ${payload.organizerPhone}` : ''}
✅ DigiHisab Domestic Ledger • خاندانی شفافیت`;

    // 2. 58mm / 80mm Thermal Printer Monospace Layout (Raw ESC/POS friendly)
    const thermalChit = `
================================
     DIGI HISAB - KHATA AI
   *** کمیٹی ادائیگی رسید ***
================================
Voucher No : ${payload.voucherNumber}
Date       : ${d.toISOString().slice(0, 10)} ${timeFormatted}
Kameti     : ${payload.kametiTitle.slice(0, 24)}
Member     : ${payload.recipientName.slice(0, 24)}
Month/Turn : Cycle #${payload.cycleNumber} of ${payload.totalMonths}
--------------------------------
Gross Pool : PKR ${payload.grossPoolAmount.toLocaleString()}
${payload.bidDiscountAmount ? `Auction Dis: -PKR ${payload.bidDiscountAmount.toLocaleString()}\n` : ''}NET PAID   : PKR ${payload.netAmount.toLocaleString()}
Pay Mode   : ${payload.paymentMode}
Source     : ${payload.vaultAccountTitle || 'Cash Till'}
--------------------------------
Organized By: ${payload.organizerName}
Phone       : ${payload.organizerPhone || 'N/A'}
================================
  شکریہ! باہمی اعتماد، باہمی تحفظ
================================
`;

    return { thermalChit, whatsappSlip };
  }

  /**
   * Generates a unique sequential voucher number (e.g. KMT-202611-001)
   */
  public generateVoucherNumber(cycleNumber: number): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `KMT-${y}${m}-C${cycleNumber}-${randomHex}`;
  }

  /**
   * Scheduled sentinel: Checks unpaid installments across all active Kametis
   * Runs daily, prioritizing 1st and 5th of each month
   */
  public async runMonthlyInstallmentSentinel(): Promise<{
    checkedCount: number;
    remindersDispatched: number;
  }> {
    const now = new Date();
    const day = now.getDate();
    console.log(`[KametiSentinel] Running monthly installment check for day ${day}...`);

    let checkedCount = 0;
    let remindersDispatched = 0;

    try {
      const activeKametis = await DomesticKameti.find({ status: 'ACTIVE' });

      for (const k of activeKametis) {
        checkedCount++;
        const currentCycle = k.currentCycle;

        // 1. Check if recipient of this month should be alerted
        const scheduleRecipient = k.drawSchedule?.find(
          (s) => s.cycleNumber === currentCycle && s.payoutStatus === 'SCHEDULED'
        );

        if (scheduleRecipient && scheduleRecipient.memberId) {
          try {
            const memberObj = (k.members as any[])?.find(
              (m) => m._id?.toString() === scheduleRecipient.memberId?.toString()
            );
            if (memberObj?.memberProfileId) {
              dispatchPushNotification(memberObj.memberProfileId.toString(), {
                id: `kameti-payout-ready-${k._id}-${currentCycle}`,
                category: 'FINANCIAL_METRICS_SYNC',
                priority: 'SUCCESS',
                titleUrdu: 'مبارک ہو! کمیٹی وصولی کا مہینہ 🎉',
                titleEnglish: 'Your Kameti Payout is Ready!',
                messageUrdu: `اس ماہ "${k.title}" کی کمیٹی وصولی (Rs. ${scheduleRecipient.netPayoutAmount.toLocaleString()}) آپ کی باری ہے۔`,
                messageEnglish: `Your turn to collect Rs. ${scheduleRecipient.netPayoutAmount.toLocaleString()} in ${k.title}.`,
                timestamp: now.toISOString(),
                actionRoute: 'KametiCommitteeModal',
                metadata: { kametiId: k._id.toString(), cycle: currentCycle },
              });
              remindersDispatched++;
            }
          } catch (e: any) {
            console.warn('[KametiSentinel] Payout alert warning:', e.message);
          }
        }

        // 2. Check unpaid installments among organizer members
        if (k.role === 'ORGANIZER' && Array.isArray(k.members)) {
          for (const m of k.members) {
            const hasPaid = m.paidCycles && m.paidCycles.includes(currentCycle);
            if (!hasPaid && m.memberProfileId) {
              const isGracePeriod = day >= 5;
              dispatchPushNotification(m.memberProfileId.toString(), {
                id: `kameti-due-${k._id}-${currentCycle}-${m._id}`,
                category: 'FINANCIAL_METRICS_SYNC',
                priority: isGracePeriod ? 'WARNING' : 'INFO',
                titleUrdu: isGracePeriod ? 'کمیٹی قسط تاخیر الرٹ ⚠️' : 'کمیٹی قسط کا وقت 📅',
                titleEnglish: isGracePeriod ? 'Kameti Installment Overdue' : 'Kameti Installment Due',
                messageUrdu: `السلام علیکم ${m.memberName}! "${k.title}" کی ماہ #${currentCycle} کی قسط (Rs. ${k.monthlyContribution.toLocaleString()}) واجب الادا ہے۔`,
                messageEnglish: `Installment for cycle ${currentCycle} in ${k.title} is pending.`,
                timestamp: now.toISOString(),
                actionRoute: 'KametiCommitteeModal',
                metadata: { kametiId: k._id.toString(), cycle: currentCycle },
              });
              remindersDispatched++;
            }
          }
        }
      }

      console.log(
        `[KametiSentinel] Completed check: ${checkedCount} active pools inspected, ${remindersDispatched} alerts dispatched.`
      );
    } catch (err: any) {
      console.error('[KametiSentinel] Sentinel execution error:', err.message);
    }

    return { checkedCount, remindersDispatched };
  }
}

export const kametiDrawService = new KametiDrawService();
export default kametiDrawService;
