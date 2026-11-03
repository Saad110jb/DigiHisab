import { Types } from 'mongoose';
import { Counterparty, ICounterparty, RiskTier } from '../models/Counterparty';
import { LedgerEntry, ILedgerEntry } from '../models/LedgerEntry';

export type JevActionVerdict = 'APPROVE' | 'REQUIRE_MANAGER_PIN' | 'HARD_BLOCK';

export interface IJevMetrics {
  borrowed90d: number;
  settled90d: number;
  repaymentVelocity: number; // 0.00 to 1.00
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
  default_probability: number; // 0.00 to 1.00
  risk_tier: RiskTier;
  action_verdict: JevActionVerdict;
  credit_limit_recommendation: number; // in PKR
  confidence_interval: [number, number];
  metrics: IJevMetrics;
  reasons: {
    urdu: string;
    english: string;
  };
}

export interface IEvaluateRiskParams {
  profileId: string | Types.ObjectId;
  customerId: string | Types.ObjectId;
  requestedAmount: number;
}

export class JevCreditService {
  /**
   * Evaluate customer default risk probability and determine enforcement action verdict
   */
  public static async evaluateCreditRisk(params: IEvaluateRiskParams): Promise<{
    counterparty: ICounterparty;
    evaluation: IJevCreditEvaluation;
  }> {
    const { profileId, customerId, requestedAmount = 0 } = params;

    const counterparty = await Counterparty.findOne({
      _id: customerId,
      profileId,
    });

    if (!counterparty) {
      throw new Error('Counterparty not found.');
    }

    const numericAmount = Math.max(0, Number(requestedAmount) || 0);
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // 1. Fetch relevant ledger transactions
    const ledgerEntries = await LedgerEntry.find({
      profileId,
      counterpartyId: customerId,
    }).sort({ createdAt: -1 });

    const totalEntriesCount = ledgerEntries.length;

    // Filter last 90 days entries (or use all if small history)
    const recentEntries = totalEntriesCount <= 10
      ? ledgerEntries
      : ledgerEntries.filter((e) => new Date(e.createdAt) >= ninetyDaysAgo);

    let borrowed90d = 0;
    let settled90d = 0;
    let totalLagDays = 0;
    let settledReceivablesCount = 0;
    let maxOverdueDays = 0;
    let promiseBreachCount = 0;

    const defaultReturnDays = counterparty.defaultReturnDays || 7;

    for (const entry of recentEntries) {
      if (entry.entryType === 'RECEIVABLE') {
        borrowed90d += entry.amount;

        const entryDueDate = entry.dueDate
          ? new Date(entry.dueDate)
          : new Date(new Date(entry.createdAt).getTime() + defaultReturnDays * 24 * 60 * 60 * 1000);

        if (!entry.isSettled) {
          if (now.getTime() > entryDueDate.getTime()) {
            const overdue = Math.floor((now.getTime() - entryDueDate.getTime()) / (24 * 60 * 60 * 1000));
            if (overdue > maxOverdueDays) {
              maxOverdueDays = overdue;
            }
            promiseBreachCount += 1;
          }
        } else if (entry.settledAt) {
          const lag = Math.max(
            0,
            Math.floor((new Date(entry.settledAt).getTime() - new Date(entry.createdAt).getTime()) / (24 * 60 * 60 * 1000))
          );
          totalLagDays += lag;
          settledReceivablesCount += 1;
        }
      } else if (entry.entryType === 'SETTLEMENT' || entry.entryType === 'CASH_IN') {
        settled90d += entry.amount;
      }
    }

    // 2. Compute Repayment Velocity V_repay = Settled / Borrowed
    let repaymentVelocity = 1.0;
    if (borrowed90d > 0) {
      repaymentVelocity = Math.min(1.0, Math.max(0.0, settled90d / borrowed90d));
    } else if (counterparty.currentBalance > 0) {
      // Outstanding balance without recent borrow records
      repaymentVelocity = settled90d > 0 ? 0.8 : 0.4;
    } else {
      repaymentVelocity = 1.0; // Clean slate
    }

    const avgLagDays = settledReceivablesCount > 0 ? Math.round(totalLagDays / settledReceivablesCount) : defaultReturnDays;

    // 3. Credit Utilization U = (currentBalance + requestedAmount) / creditLimit
    const currentBalance = counterparty.currentBalance || 0;
    const creditLimit = Math.max(1000, counterparty.creditLimit || 5000);
    const projectedBalance = currentBalance + numericAmount;
    const utilizationRate = Math.round((projectedBalance / creditLimit) * 100) / 100;

    // 4. Default Probability P_def computation (0.00 - 1.00)
    let pDef = 0.05; // Base low baseline

    if (counterparty.isCreditBlocked) {
      // Account is manually locked or restricted
      pDef = Math.max(pDef, 0.88);
    } else {
      // A. Velocity penalty (up to +0.35)
      const velocityPenalty = (1.0 - repaymentVelocity) * 0.35;

      // B. Utilization penalty (up to +0.35)
      let utilPenalty = 0;
      if (utilizationRate > 1.0) {
        // Exceeding ceiling
        utilPenalty = 0.22 + Math.min(0.18, (utilizationRate - 1.0) * 0.30);
      } else if (utilizationRate > 0.70) {
        utilPenalty = (utilizationRate - 0.70) * 0.40;
      }

      // C. Overdue days penalty (up to +0.25)
      const overduePenalty = Math.min(0.25, (maxOverdueDays / 30) * 0.25);

      // D. Promise breach count penalty (up to +0.15)
      const breachPenalty = Math.min(0.15, (promiseBreachCount / 3) * 0.15);

      // E. New customer adjustment: no history -> slightly higher uncertainty baseline
      let newCustomerFactor = 0;
      if (totalEntriesCount === 0) {
        newCustomerFactor = 0.15;
      }

      pDef = pDef + velocityPenalty + utilPenalty + overduePenalty + breachPenalty + newCustomerFactor;
    }

    // Heavy penalty if overdue > 21 days and balance already exceeds limit
    if (maxOverdueDays >= 21 && projectedBalance > creditLimit) {
      pDef = Math.max(pDef, 0.78);
    }

    // Clamp between 0.02 and 0.99
    pDef = Math.min(0.99, Math.max(0.02, Math.round(pDef * 100) / 100));

    // 5. Determine Verdict and Risk Tier
    let action_verdict: JevActionVerdict;
    let risk_tier: RiskTier;

    if (pDef > 0.75 || counterparty.isCreditBlocked) {
      action_verdict = 'HARD_BLOCK';
      risk_tier = 'HIGH';
    } else if (pDef >= 0.30 || projectedBalance > creditLimit) {
      action_verdict = 'REQUIRE_MANAGER_PIN';
      risk_tier = 'MEDIUM';
    } else {
      action_verdict = 'APPROVE';
      risk_tier = 'LOW';
    }

    // 6. Safe Credit Limit Recommendation (PKR)
    let recommendedLimit = creditLimit;
    const monthlySettlementEstimate = settled90d > 0 ? Math.round(settled90d / 3) : creditLimit;

    if (pDef < 0.30) {
      // Safe customer -> can comfortably handle 120% of monthly settlements
      recommendedLimit = Math.max(creditLimit, Math.round(monthlySettlementEstimate * 1.2));
    } else if (pDef <= 0.75) {
      // Moderate risk -> adjust limit down proportional to risk
      const safeVolume = Math.round(monthlySettlementEstimate * (1 - pDef));
      recommendedLimit = Math.max(2000, safeVolume);
    } else {
      // High risk -> clamp to minimal recovery balance
      recommendedLimit = Math.max(1000, Math.min(creditLimit, currentBalance));
    }
    // Round to nearest 500 PKR
    recommendedLimit = Math.max(1000, Math.round(recommendedLimit / 500) * 500);

    // 7. Confidence interval
    const sampleSize = Math.max(1, totalEntriesCount);
    const margin = Math.round(Math.max(0.03, Math.min(0.12, 0.25 / Math.sqrt(sampleSize))) * 100) / 100;
    const confidence_interval: [number, number] = [
      Math.max(0.01, Math.round((pDef - margin) * 100) / 100),
      Math.min(0.99, Math.round((pDef + margin) * 100) / 100),
    ];

    // 8. Bilingual human-actionable reasons
    let reasonUrdu = '';
    let reasonEnglish = '';

    if (action_verdict === 'HARD_BLOCK') {
      if (counterparty.isCreditBlocked) {
        reasonUrdu = 'کھاتہ بند ہے: اس گاہک کا کھاتہ بند (Blocked) ہے۔ مزید ادھار مکمل منع ہے۔';
        reasonEnglish = 'Account Locked: Customer credit is blocked. Additional credit prohibited.';
      } else {
        reasonUrdu = `سخت پابندی: ڈیفالٹ کا خطرہ انتہائی زیادہ ہے (${Math.round(pDef * 100)}%)۔ پرانا ادھار (${maxOverdueDays} دن سے واجب الادا) وصول کیے بغیر نیا ادھار نہیں دیا جا سکتا۔`;
        reasonEnglish = `Hard Block: Severe default risk (${Math.round(pDef * 100)}%). Outstanding balance is ${maxOverdueDays} days overdue.`;
      }
    } else if (action_verdict === 'REQUIRE_MANAGER_PIN') {
      if (projectedBalance > creditLimit) {
        reasonUrdu = `حدِ ادھار سے تجاوز: نئی بقایا (Rs. ${projectedBalance.toLocaleString()}) حد (Rs. ${creditLimit.toLocaleString()}) سے زیادہ ہے۔ منیجر کا سیکیورٹی پن درکار ہے۔`;
        reasonEnglish = `Credit Ceiling Exceeded: Projected balance (Rs. ${projectedBalance.toLocaleString()}) exceeds limit (Rs. ${creditLimit.toLocaleString()}). Manager PIN required.`;
      } else {
        reasonUrdu = `درمیانہ خطرہ (${Math.round(pDef * 100)}%): سابقہ واپسی کی رفتار سست ہے۔ آگے بڑھنے کے لیے منیجر کی اجازت اور پن لازمی ہے۔`;
        reasonEnglish = `Moderate Risk (${Math.round(pDef * 100)}%): Suboptimal repayment velocity. Manager override PIN required.`;
      }
    } else {
      reasonUrdu = `محفوظ گاہک (${Math.round(pDef * 100)}% خطرہ): ادائیگیوں کا ریکارڈ قابل اعتماد ہے۔ نیا ادھار فوری طور پر منظور ہے۔`;
      reasonEnglish = `Approved Safe Credit (${Math.round(pDef * 100)}% risk): Excellent repayment track record. Credit cleared.`;
    }

    const metrics: IJevMetrics = {
      borrowed90d,
      settled90d,
      repaymentVelocity: Math.round(repaymentVelocity * 100) / 100,
      avgLagDays,
      maxOverdueDays,
      promiseBreachCount,
      currentBalance,
      requestedAmount: numericAmount,
      projectedBalance,
      creditLimit,
      utilizationRate,
      isCreditBlocked: counterparty.isCreditBlocked,
      totalEntriesCount,
    };

    const evaluation: IJevCreditEvaluation = {
      default_probability: pDef,
      risk_tier,
      action_verdict,
      credit_limit_recommendation: recommendedLimit,
      confidence_interval,
      metrics,
      reasons: {
        urdu: reasonUrdu,
        english: reasonEnglish,
      },
    };

    return {
      counterparty,
      evaluation,
    };
  }

  /**
   * Sync evaluated risk metrics back to the Counterparty document
   */
  public static async persistRiskProfile(
    counterparty: ICounterparty,
    evaluation: IJevCreditEvaluation
  ): Promise<void> {
    counterparty.riskProfile = {
      defaultProbability: evaluation.default_probability,
      riskTier: evaluation.risk_tier,
      lastEvaluatedAt: new Date(),
      overdueDays: evaluation.metrics.maxOverdueDays,
      currentToneTier: evaluation.action_verdict === 'HARD_BLOCK' ? 3 : evaluation.action_verdict === 'REQUIRE_MANAGER_PIN' ? 2 : 1,
      lastReminderSentAt: counterparty.riskProfile?.lastReminderSentAt,
    };

    // Auto flag credit block if risk exceeds hard threshold
    if (evaluation.action_verdict === 'HARD_BLOCK') {
      counterparty.isCreditBlocked = true;
    }

    await counterparty.save();
  }
}
