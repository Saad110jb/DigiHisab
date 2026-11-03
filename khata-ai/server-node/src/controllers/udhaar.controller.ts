import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Counterparty } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';
import { Profile } from '../models/Profile';
import { AuditLog } from '../models/AuditLog';
import { JevCreditService } from '../services/jevCredit.service';
import { dispatchPushNotification, dispatchMetricsSync } from '../services/notificationDispatcher.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';

/**
 * 1. Pre-flight Jev Credit Risk Evaluation
 * POST /api/v1/udhaar/evaluate
 */
export const evaluateUdhaar = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { customerId, requestedAmount = 0 } = req.body;

    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid customerId is required for credit evaluation.',
      });
    }

    const { counterparty, evaluation } = await JevCreditService.evaluateCreditRisk({
      profileId,
      customerId,
      requestedAmount: Number(requestedAmount) || 0,
    });

    return res.status(200).json({
      success: true,
      data: {
        customer: {
          id: counterparty._id,
          name: counterparty.name,
          phone: counterparty.phone,
          currentBalance: counterparty.currentBalance,
          creditLimit: counterparty.creditLimit,
          isCreditBlocked: counterparty.isCreditBlocked,
        },
        evaluation,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error evaluating credit risk with Jev engine.',
    });
  }
};

/**
 * 2. Process Udhaar Sale with Jev Enforcement
 * POST /api/v1/udhaar/sale
 */
export const processUdhaarSale = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const subAccountId = req.user?.subAccountId;
    const userRole = req.user?.role || 'OWNER';

    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      customerId,
      amount,
      category = 'General Khata (عام کھاتہ)',
      description,
      items,
      receiptImageUrl,
      rawInput,
      dueDate,
      inputMode = 'MANUAL',
      managerPin,
      overrideReason,
    } = req.body;

    if (!customerId || !Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ success: false, message: 'Valid customerId is required.' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive amount is required.' });
    }

    // 1. Evaluate Credit Risk with Jev
    const { counterparty, evaluation } = await JevCreditService.evaluateCreditRisk({
      profileId,
      customerId,
      requestedAmount: numericAmount,
    });

    const isMasterOrManager = userRole === 'OWNER' || userRole === 'MANAGER';

    // 2. Enforce Action Verdict
    if (evaluation.action_verdict === 'HARD_BLOCK') {
      // Real-time Push Notification: Credit Prohibited
      dispatchPushNotification(profileId.toString(), {
        id: `block-${counterparty._id}-${Date.now()}`,
        category: 'CREDIT_LIMIT',
        priority: 'CRITICAL',
        titleUrdu: '⛔ ادھار پر سخت پابندی (Hard Block)',
        titleEnglish: 'Credit Prohibited - High Default Risk',
        messageUrdu: `گاہک ${counterparty.name} پر مزید ادھار بلاک ہے۔ ڈیفالٹ کا خطرہ: ${Math.round(evaluation.default_probability * 100)}%۔`,
        messageEnglish: `Credit blocked for ${counterparty.name}. Default Risk: ${Math.round(evaluation.default_probability * 100)}%. Settled recovery required first.`,
        timestamp: new Date().toISOString(),
        actionLabel: 'کھاتہ دیکھیں',
        actionRoute: 'CounterpartyDetailScreen',
        metadata: { counterpartyId: counterparty._id.toString() },
        durationMs: 5000,
      });

      return res.status(403).json({
        success: false,
        code: 'CREDIT_HARD_BLOCKED',
        verdict: 'HARD_BLOCK',
        message: evaluation.reasons.urdu,
        reasonEnglish: evaluation.reasons.english,
        evaluation,
      });
    }

    let wasOverridden = false;
    let authorizerInfo: { id: Types.ObjectId; name: string; role: string } | null = null;

    if (evaluation.action_verdict === 'REQUIRE_MANAGER_PIN') {
      // If cashier or non-owner, check manager PIN
      if (!isMasterOrManager || managerPin) {
        if (!managerPin) {
          // Real-time Push Notification: Manager Approval Alert
          dispatchPushNotification(profileId.toString(), {
            id: `pin-req-${counterparty._id}-${Date.now()}`,
            category: 'CREDIT_LIMIT',
            priority: 'WARNING',
            titleUrdu: '🔑 منیجر سیکیورٹی پن درکار ہے',
            titleEnglish: 'Manager Approval Required',
            messageUrdu: `گاہک ${counterparty.name} کے لیے Rs. ${numericAmount.toLocaleString()} کے ادھار پر منیجر کا سیکیورٹی پن درکار ہے۔`,
            messageEnglish: `Manager PIN authorization required for Rs. ${numericAmount.toLocaleString()} credit to ${counterparty.name}.`,
            timestamp: new Date().toISOString(),
            actionLabel: 'تفصیل',
            actionRoute: 'CounterpartyDetailScreen',
            metadata: { counterpartyId: counterparty._id.toString() },
            durationMs: 5000,
          });

          return res.status(403).json({
            success: false,
            code: 'REQUIRE_MANAGER_PIN',
            verdict: 'REQUIRE_MANAGER_PIN',
            message: evaluation.reasons.urdu,
            reasonEnglish: evaluation.reasons.english,
            evaluation,
          });
        }

        // Verify PIN against Profile master pin, manager pin hash, or manager sub-account
        const profile = await Profile.findById(profileId);
        if (!profile) {
          return res.status(404).json({ success: false, message: 'Store profile not found.' });
        }

        let isPinValid = false;

        if (profile.managerPinHash && (await bcrypt.compare(String(managerPin), profile.managerPinHash))) {
          isPinValid = true;
          authorizerInfo = {
            id: profile._id as Types.ObjectId,
            name: profile.fullName,
            role: 'MANAGER',
          };
        } else if (profile.pinHash && (await bcrypt.compare(String(managerPin), profile.pinHash))) {
          isPinValid = true;
          authorizerInfo = {
            id: profile._id as Types.ObjectId,
            name: profile.fullName,
            role: 'OWNER',
          };
        } else if (profile.subAccounts && profile.subAccounts.length > 0) {
          for (const sub of profile.subAccounts) {
            if (sub.isActive && sub.role === 'MANAGER') {
              if (await bcrypt.compare(String(managerPin), sub.pinHash)) {
                isPinValid = true;
                authorizerInfo = {
                  id: sub._id as Types.ObjectId,
                  name: sub.name,
                  role: 'MANAGER',
                };
                break;
              }
            }
          }
        }

        if (!isPinValid) {
          return res.status(401).json({
            success: false,
            code: 'INVALID_MANAGER_PIN',
            message: 'غلط پن: منیجر یا دکان کے مالک کا سیکیورٹی پن درست نہیں ہے (Invalid Manager PIN).',
          });
        }
      } else {
        // Owner or Manager performing transaction directly
        authorizerInfo = {
          id: new Types.ObjectId(profileId),
          name: (req.user as any)?.fullName || userRole,
          role: userRole,
        };
      }

      wasOverridden = true;

      // Log forensic audit log
      if (authorizerInfo) {
        await AuditLog.create({
          profileId,
          authorizedById: authorizerInfo.id,
          authorizedByName: authorizerInfo.name,
          authorizedByRole: authorizerInfo.role,
          actionType: counterparty.isCreditBlocked ? 'CREDIT_LOCK_OVERRIDE' : 'CREDIT_LIMIT_OVERRIDE',
          counterpartyId: counterparty._id,
          counterpartyName: counterparty.name,
          counterpartyPhone: counterparty.phone,
          financialSnapshot: {
            creditLimit: counterparty.creditLimit,
            balanceBefore: counterparty.currentBalance,
            attemptedAmount: numericAmount,
            resultingBalance: counterparty.currentBalance + numericAmount,
          },
          reason: overrideReason || `Jev Risk Override: P_def = ${evaluation.default_probability} (${evaluation.risk_tier} tier)`,
          details: {
            defaultProbability: evaluation.default_probability,
            riskTier: evaluation.risk_tier,
            repaymentVelocity: evaluation.metrics.repaymentVelocity,
            maxOverdueDays: evaluation.metrics.maxOverdueDays,
          },
          ipAddress: req.ip,
        });
      }
    }

    // 3. Balance Adjustment & Jama Khata Auto-Deduction
    const jamaBalance = counterparty.advanceDeposit || 0;
    let balanceAdjustment = numericAmount;

    if (jamaBalance > 0) {
      const coveredByJama = Math.min(numericAmount, jamaBalance);
      counterparty.advanceDeposit = jamaBalance - coveredByJama;
      balanceAdjustment = numericAmount - coveredByJama;
    }

    counterparty.currentBalance += balanceAdjustment;

    // 4. Create Ledger Entry
    const newEntry = await LedgerEntry.create({
      profileId,
      counterpartyId: counterparty._id,
      subAccountId: subAccountId ? new Types.ObjectId(subAccountId) : undefined,
      entryType: 'RECEIVABLE',
      amount: numericAmount,
      paymentMode: 'CREDIT',
      category: category || 'General Khata (عام کھاتہ)',
      description: description?.trim() || undefined,
      items: items && items.length > 0 ? items : undefined,
      receiptImageUrl,
      rawInput,
      inputMode: inputMode || (rawInput ? 'VOICE' : receiptImageUrl ? 'OCR' : 'MANUAL'),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      wasOverridden,
      isSettled: false,
    });

    // 5. Update Risk Profile on Counterparty
    await JevCreditService.persistRiskProfile(counterparty, evaluation);

    // 6. Push real-time notification
    dispatchPushNotification(profileId.toString(), {
      id: `udhaar-${newEntry._id}-${Date.now()}`,
      category: 'CREDIT_LIMIT',
      priority: evaluation.risk_tier === 'HIGH' ? 'CRITICAL' : evaluation.risk_tier === 'MEDIUM' ? 'WARNING' : 'INFO',
      titleUrdu: 'نیا ادھار درج ہو گیا',
      titleEnglish: 'Udhaar Recorded',
      messageUrdu: `گاہک ${counterparty.name} کے کھاتے میں Rs. ${numericAmount.toLocaleString()} کا ادھار درج ہوا۔ نئی بقایا: Rs. ${counterparty.currentBalance.toLocaleString()}۔`,
      messageEnglish: `Credit of Rs. ${numericAmount.toLocaleString()} added for ${counterparty.name}. New balance: Rs. ${counterparty.currentBalance.toLocaleString()}.`,
      timestamp: new Date().toISOString(),
      actionLabel: 'کھاتہ دیکھیں',
      actionRoute: 'CounterpartyDetailScreen',
      metadata: { counterpartyId: counterparty._id.toString() },
      durationMs: 5000,
    });

    // Broadcast real-time metrics sync to all connected clients
    try {
      const updatedMetrics = await getAggregatedStoreMetrics(profileId);
      dispatchMetricsSync(profileId.toString(), updatedMetrics);
    } catch (syncErr) {
      console.warn('[processUdhaarSale] Metrics sync broadcast failed:', syncErr);
    }

    return res.status(201).json({
      success: true,
      message: 'نیا ادھار کامیابی سے درج کر لیا گیا ہے۔ (Udhaar recorded successfully)',
      data: newEntry,
      evaluation,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Error processing udhaar transaction.',
    });
  }
};
