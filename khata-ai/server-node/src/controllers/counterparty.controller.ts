import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { Counterparty, RelationType, RiskTier } from '../models/Counterparty';
import { LedgerEntry } from '../models/LedgerEntry';
import { AuditLog } from '../models/AuditLog';
import { Profile } from '../models/Profile';
import { dispatchPushNotification, dispatchMetricsSync } from '../services/notificationDispatcher.service';
import { TaqazaPolicyClassifier } from '../services/taqazaClassifier.service';
import { getAggregatedStoreMetrics } from '../services/ledgerMetrics.service';

/**
 * Normalizes local Pakistani mobile formats to E.164:
 * "03001234567" -> "+923001234567"
 */
const sanitizePhoneNumber = (raw: string): string => {
  let cleaned = raw.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('03')) {
    cleaned = '+92' + cleaned.substring(1);
  } else if (cleaned.startsWith('92') && !cleaned.startsWith('+92')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

/**
 * Normalizes and formats Pakistani CNIC:
 * "4210112345671" -> "42101-1234567-1"
 */
const sanitizeCnic = (raw?: string): string | undefined => {
  if (!raw || !raw.trim()) return undefined;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 13) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }
  return raw.trim();
};

/**
 * 1. Create New Counterparty Contact
 * POST /api/v1/counterparties
 */
export const createCounterparty = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const {
      name,
      phone,
      alternatePhone,
      email,
      address,
      cnic,
      relationType: rawRelationType,
      type,
      creditLimit,
      defaultReturnDays,
      isCreditBlocked,
      supplierCategory,
      deliveryRep,
      companyBankDetails,
      tradeCreditTerms,
      notes,
    } = req.body;
    const relationType = rawRelationType || type;

    if (!name || !phone || !relationType) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, and relation type (CUSTOMER | SUPPLIER | STAFF | FAMILY) are required.',
      });
    }

    const validRelations: RelationType[] = ['CUSTOMER', 'SUPPLIER', 'STAFF', 'FAMILY'];
    if (!validRelations.includes(relationType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid relationType. Allowed: ${validRelations.join(', ')}`,
      });
    }

    if (relationType === 'SUPPLIER' && req.user?.role === 'CASHIER') {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: '🔒 رسائی کی اجازت نہیں: کیشیئر نیا سپلائر شامل نہیں کر سکتا۔ (Only Manager or Owner can create suppliers)',
      });
    }

    // Validate CNIC format if provided
    let formattedCnic: string | undefined;
    if (cnic && cnic.trim()) {
      formattedCnic = sanitizeCnic(cnic);
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
      if (!formattedCnic || !cnicRegex.test(formattedCnic)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid CNIC format. Pakistani CNIC must have 13 digits (e.g. 42101-1234567-1).',
        });
      }
    }

    const normalizedPhone = sanitizePhoneNumber(phone);

    // Check duplicate phone for the current profile
    const existing = await Counterparty.findOne({ profileId, phone: normalizedPhone });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A counterparty with this phone number already exists in your roster.',
      });
    }

    const counterparty = await Counterparty.create({
      profileId,
      name: name.trim(),
      phone: normalizedPhone,
      alternatePhone: alternatePhone ? sanitizePhoneNumber(alternatePhone) : undefined,
      email: email ? email.trim().toLowerCase() : undefined,
      address: address ? address.trim() : undefined,
      cnic: formattedCnic,
      relationType: rawRelationType,
      type,
      creditLimit: creditLimit !== undefined ? Number(creditLimit) : 5000.0,
      defaultReturnDays: defaultReturnDays !== undefined ? Number(defaultReturnDays) : 7,
      currentBalance: 0.0,
      isCreditBlocked: Boolean(isCreditBlocked),
      supplierCategory: supplierCategory || undefined,
      deliveryRep: deliveryRep ? {
        name: deliveryRep.name ? String(deliveryRep.name).trim() : undefined,
        phone: deliveryRep.phone ? sanitizePhoneNumber(String(deliveryRep.phone)) : undefined,
      } : undefined,
      companyBankDetails: companyBankDetails ? {
        bankName: companyBankDetails.bankName ? String(companyBankDetails.bankName).trim() : undefined,
        accountTitle: companyBankDetails.accountTitle ? String(companyBankDetails.accountTitle).trim() : undefined,
        accountNumber: companyBankDetails.accountNumber ? String(companyBankDetails.accountNumber).trim() : undefined,
        iban: companyBankDetails.iban ? String(companyBankDetails.iban).trim() : undefined,
      } : undefined,
      tradeCreditTerms: tradeCreditTerms ? {
        termType: tradeCreditTerms.termType || 'NET_7',
        creditPeriodDays: Number(tradeCreditTerms.creditPeriodDays) || 7,
        settlementScheduleNote: tradeCreditTerms.settlementScheduleNote ? String(tradeCreditTerms.settlementScheduleNote).trim() : undefined,
      } : undefined,
      riskProfile: {
        defaultProbability: 0.0,
        riskTier: 'LOW',
        overdueDays: 0,
        currentToneTier: 1,
      },
      notes: notes ? notes.trim() : undefined,
    });

    return res.status(201).json({
      success: true,
      message: 'Counterparty created successfully.',
      data: counterparty,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get All Counterparties (with search, relation filter, and pagination)
 * GET /api/v1/counterparties
 */
export const getCounterparties = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { relationType, search, sortBy = 'createdAt', sortOrder = 'desc', page = '1', limit = '20' } = req.query;

    const filter: any = { profileId, isArchived: { $ne: true } };

    if (relationType && typeof relationType === 'string') {
      filter.relationType = relationType.toUpperCase();
    }

    if (search && typeof search === 'string') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { alternatePhone: searchRegex },
        { email: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    if (sortBy === 'balance') {
      sortOptions.currentBalance = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'overdueDays') {
      sortOptions['riskProfile.overdueDays'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'name') {
      sortOptions.name = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    const [counterparties, totalCount] = await Promise.all([
      Counterparty.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
      Counterparty.countDocuments(filter),
    ]);

    // Auto-reconcile advanceDeposit against debt for counterparties
    for (const cp of counterparties) {
      let modified = false;
      if (cp.advanceDeposit && cp.advanceDeposit > 0 && cp.currentBalance < 0) {
        const debt = Math.abs(cp.currentBalance);
        const useAdv = Math.min(debt, cp.advanceDeposit);
        cp.currentBalance += useAdv;
        cp.advanceDeposit -= useAdv;
        modified = true;
      }
      if (modified) {
        await cp.save();
      }
    }

    const totalPayables = counterparties.reduce(
      (sum, cp) => sum + (cp.currentBalance < 0 ? Math.abs(cp.currentBalance) : cp.currentBalance > 0 ? cp.currentBalance : 0),
      0
    );

    return res.status(200).json({
      success: true,
      totalPayables,
      suppliers: counterparties,
      data: counterparties,
      pagination: {
        totalItems: totalCount,
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        pageSize: limitNum,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 3. Get Single Counterparty Profile by ID
 * GET /api/v1/counterparties/:id
 */
export const getCounterpartyById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    return res.status(200).json({
      success: true,
      data: counterparty,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Update Counterparty Info (Name, Email, Alternate Phone, Notes, Relation)
 * PUT /api/v1/counterparties/:id
 */
export const updateCounterparty = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const {
      name,
      alternatePhone,
      email,
      address,
      cnic,
      relationType: rawRelationType,
      type,
      creditLimit,
      defaultReturnDays,
      isCreditBlocked,
      supplierCategory,
      deliveryRep,
      companyBankDetails,
      tradeCreditTerms,
      notes,
    } = req.body;

    const relationType = (rawRelationType || type) as RelationType | undefined;

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    if (name) counterparty.name = name.trim();
    if (alternatePhone !== undefined) counterparty.alternatePhone = alternatePhone ? sanitizePhoneNumber(alternatePhone) : undefined;
    if (email !== undefined) counterparty.email = email ? email.trim().toLowerCase() : undefined;
    if (address !== undefined) counterparty.address = address ? address.trim() : undefined;
    if (cnic !== undefined) {
      if (cnic && cnic.trim()) {
        const formattedCnic = sanitizeCnic(cnic);
        const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
        if (!formattedCnic || !cnicRegex.test(formattedCnic)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid CNIC format. Pakistani CNIC must have 13 digits (e.g. 42101-1234567-1).',
          });
        }
        counterparty.cnic = formattedCnic;
      } else {
        counterparty.cnic = undefined;
      }
    }
    if (relationType) {
      const validRelations: RelationType[] = ['CUSTOMER', 'SUPPLIER', 'STAFF', 'FAMILY'];
      if (validRelations.includes(relationType)) {
        counterparty.relationType = relationType;
      }
    }
    if (creditLimit !== undefined && !isNaN(Number(creditLimit)) && Number(creditLimit) >= 0) {
      counterparty.creditLimit = Number(creditLimit);
      if (counterparty.currentBalance > counterparty.creditLimit) {
        counterparty.isCreditBlocked = true;
      }
    }
    if (defaultReturnDays !== undefined && !isNaN(Number(defaultReturnDays))) {
      counterparty.defaultReturnDays = Math.max(1, Number(defaultReturnDays));
    }
    if (typeof isCreditBlocked === 'boolean') {
      counterparty.isCreditBlocked = isCreditBlocked;
    }
    if (supplierCategory !== undefined) counterparty.supplierCategory = supplierCategory || undefined;
    if (deliveryRep !== undefined) {
      counterparty.deliveryRep = deliveryRep ? {
        name: deliveryRep.name ? String(deliveryRep.name).trim() : undefined,
        phone: deliveryRep.phone ? sanitizePhoneNumber(String(deliveryRep.phone)) : undefined,
      } : undefined;
    }
    if (companyBankDetails !== undefined) {
      counterparty.companyBankDetails = companyBankDetails ? {
        bankName: companyBankDetails.bankName ? String(companyBankDetails.bankName).trim() : undefined,
        accountTitle: companyBankDetails.accountTitle ? String(companyBankDetails.accountTitle).trim() : undefined,
        accountNumber: companyBankDetails.accountNumber ? String(companyBankDetails.accountNumber).trim() : undefined,
        iban: companyBankDetails.iban ? String(companyBankDetails.iban).trim() : undefined,
      } : undefined;
    }
    if (tradeCreditTerms !== undefined) {
      counterparty.tradeCreditTerms = tradeCreditTerms ? {
        termType: tradeCreditTerms.termType || 'NET_7',
        creditPeriodDays: Number(tradeCreditTerms.creditPeriodDays) || 7,
        settlementScheduleNote: tradeCreditTerms.settlementScheduleNote ? String(tradeCreditTerms.settlementScheduleNote).trim() : undefined,
      } : undefined;
    }
    if (notes !== undefined) counterparty.notes = notes ? notes.trim() : undefined;

    await counterparty.save();

    return res.status(200).json({
      success: true,
      message: 'Counterparty updated successfully.',
      data: counterparty,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 5. Update Dynamic Credit Limit Ceiling
 * PATCH /api/v1/counterparties/:id/credit-limit
 */
export const updateCreditLimit = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { creditLimit } = req.body;

    if (creditLimit === undefined || isNaN(Number(creditLimit)) || Number(creditLimit) < 0) {
      return res.status(400).json({ success: false, message: 'Valid positive credit limit is required.' });
    }

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    counterparty.creditLimit = Number(creditLimit);

    // Auto toggle credit block if balance exceeds newly set limit
    if (counterparty.currentBalance > counterparty.creditLimit) {
      counterparty.isCreditBlocked = true;
    } else {
      counterparty.isCreditBlocked = false;
    }

    await counterparty.save();

    return res.status(200).json({
      success: true,
      message: `Credit limit updated to PKR ${counterparty.creditLimit}`,
      data: counterparty,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Toggle Manual Psychological Credit Lock
 * PATCH /api/v1/counterparties/:id/toggle-block
 */
export const toggleCreditBlock = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { isCreditBlocked } = req.body;

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    if (typeof isCreditBlocked === 'boolean') {
      counterparty.isCreditBlocked = isCreditBlocked;
    } else {
      counterparty.isCreditBlocked = !counterparty.isCreditBlocked;
    }

    await counterparty.save();

    return res.status(200).json({
      success: true,
      message: `Credit lock ${counterparty.isCreditBlocked ? 'enabled' : 'disabled'}.`,
      data: {
        id: counterparty._id,
        isCreditBlocked: counterparty.isCreditBlocked,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 7. Update ML Risk Metrics & Tone Ladder (Internal/FastAPI Callback)
 * PATCH /api/v1/counterparties/:id/risk-metrics
 */
export const updateRiskMetrics = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { defaultProbability, riskTier, overdueDays, currentToneTier } = req.body;

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    if (defaultProbability !== undefined) {
      counterparty.riskProfile.defaultProbability = Math.min(1.0, Math.max(0.0, Number(defaultProbability)));
    }
    if (riskTier && ['LOW', 'MEDIUM', 'HIGH'].includes(riskTier)) {
      counterparty.riskProfile.riskTier = riskTier as RiskTier;
    }
    if (overdueDays !== undefined) {
      counterparty.riskProfile.overdueDays = Math.max(0, parseInt(overdueDays, 10));
    }
    if (currentToneTier !== undefined) {
      counterparty.riskProfile.currentToneTier = Math.min(3, Math.max(1, parseInt(currentToneTier, 10)));
    }
    counterparty.riskProfile.lastEvaluatedAt = new Date();

    await counterparty.save();

    return res.status(200).json({
      success: true,
      message: 'Risk profile metrics updated successfully.',
      data: counterparty.riskProfile,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 8. Generate One-Time Discounted Debt Settlement Offer (>60-90 Days Overdue)
 * POST /api/v1/counterparties/:id/settlement-offer
 */
export const generateSettlementOffer = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;
    const { discountPercentage = 20, validDays = 14 } = req.body;

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    // Settlement offer only applies if counterparty owes receivable debt (>0)
    if (counterparty.currentBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Settlement offer is only eligible for counterparties with outstanding receivable debt.',
      });
    }

    const discountRate = Math.min(50, Math.max(5, Number(discountPercentage))) / 100;
    const originalDebt = counterparty.currentBalance;
    const discountedAmount = Math.round(originalDebt * (1 - discountRate));

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Number(validDays));

    counterparty.settlementOffer = {
      eligible: true,
      originalDebt,
      discountedAmount,
      expiresAt,
    };

    await counterparty.save();

    return res.status(200).json({
      success: true,
      message: 'Settlement offer generated successfully.',
      data: counterparty.settlementOffer,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9. Delete Counterparty Contact (Only if running balance is $0.00$)
 * DELETE /api/v1/counterparties/:id
 */
export const deleteCounterparty = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const counterparty = await Counterparty.findOne({ _id: id, profileId, isArchived: { $ne: true } });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    // Safety Gate: Prevent deleting contact with active balance unless force flag is specified
    const force = req.query.force === 'true';
    if (!force && (Math.abs(counterparty.currentBalance) > 0 || Math.abs(counterparty.advanceDeposit || 0) > 0)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an account with an active outstanding balance. Use force=true to override.',
      });
    }

    counterparty.isArchived = true;
    counterparty.archivedAt = new Date();
    await counterparty.save();

    return res.status(200).json({
      success: true,
      message: 'Counterparty contact archived successfully.',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 9b. Record Customer Udhaar Wasooli & Settlement
 * POST /api/v1/counterparties/:id/wasooli
 * POST /api/v1/counterparties/wasooli
 */
export const recordCustomerWasooli = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const subAccountId = req.user?.subAccountId;
    const counterpartyId = req.params.id || req.body.counterpartyId;
    const { amount, paymentDestination = 'CASH', notes } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive wasooli amount is required.' });
    }

    if (!counterpartyId || !Types.ObjectId.isValid(counterpartyId)) {
      return res.status(400).json({ success: false, message: 'Invalid customer ID format.' });
    }

    const customer = await Counterparty.findOne({ _id: counterpartyId, profileId });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer counterparty not found.' });
    }

    // 1. Decrease Customer Debt & handle Jama Khata rollover
    if (customer.currentBalance > 0) {
      if (numericAmount > customer.currentBalance) {
        const excessJama = numericAmount - customer.currentBalance;
        customer.currentBalance = 0;
        customer.advanceDeposit = (customer.advanceDeposit || 0) + excessJama;
      } else {
        customer.currentBalance -= numericAmount;
      }
    } else {
      // Customer has 0 or negative balance, whole payment rolls into advance deposit
      customer.advanceDeposit = (customer.advanceDeposit || 0) + numericAmount;
    }

    // Auto update credit block if balance is back within credit limit
    if (customer.currentBalance <= customer.creditLimit) {
      customer.isCreditBlocked = false;
    }

    customer.updatedAt = new Date();
    await customer.save();

    // 2. Increase Profile Liquidity Channel
    const profile = await Profile.findById(profileId);
    if (profile) {
      if (!profile.paymentChannels) {
        profile.paymentChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 };
      }
      let channelKey: 'cashDrawer' | 'bankAccount' | 'digitalWallet' = 'cashDrawer';
      const dest = String(paymentDestination).toUpperCase();
      if (dest.includes('BANK') || dest.includes('RAAST')) {
        channelKey = 'bankAccount';
      } else if (dest.includes('WALLET') || dest.includes('JAZZ') || dest.includes('EASY')) {
        channelKey = 'digitalWallet';
      } else {
        channelKey = 'cashDrawer';
      }

      profile.paymentChannels[channelKey] = (profile.paymentChannels[channelKey] || 0) + numericAmount;
      profile.markModified('paymentChannels');
      await profile.save();
    }

    // 3. Create Immutable Ledger Entry
    let paymentMode: string = 'CASH';
    const destUpper = String(paymentDestination).toUpperCase();
    if (destUpper.includes('BANK') || destUpper.includes('RAAST')) paymentMode = 'BANK_TRANSFER';
    else if (destUpper.includes('WALLET') || destUpper.includes('JAZZ') || destUpper.includes('EASY')) paymentMode = 'JAZZCASH';
    else paymentMode = 'CASH';

    const ledgerEntry = await LedgerEntry.create({
      profileId: new Types.ObjectId(profileId),
      counterpartyId: customer._id,
      subAccountId: subAccountId ? new Types.ObjectId(subAccountId) : undefined,
      entryType: 'SETTLEMENT',
      amount: numericAmount,
      paymentMode,
      category: 'Udhaar Wasooli',
      description: notes ? notes.trim() : `Wasooli received from ${customer.name}`,
      isSettled: true,
      settledAt: new Date(),
    });

    // 4. Trigger Push-Down Notification
    if (profileId) {
      dispatchPushNotification(profileId.toString(), {
        id: `wasooli-${customer._id}-${Date.now()}`,
        category: 'PAYMENT_RECEIVED',
        priority: 'SUCCESS',
        titleUrdu: 'وصولی رجسٹر ہو گئی',
        titleEnglish: 'Payment Received',
        messageUrdu: `گاہک ${customer.name} سے Rs. ${numericAmount.toLocaleString()} کی وصولی موصول ہوئی۔`,
        messageEnglish: `Received payment of Rs. ${numericAmount.toLocaleString()} from ${customer.name}.`,
        timestamp: new Date().toISOString(),
        actionLabel: 'تاریخ دیکھئے',
        actionRoute: 'CashflowHistoryModal',
        durationMs: 4500,
      });

      try {
        const updatedMetrics = await getAggregatedStoreMetrics(profileId);
        dispatchMetricsSync(profileId.toString(), updatedMetrics);
      } catch (metricErr) {
        console.warn('[recordCustomerWasooli] Failed to dispatch metrics sync:', metricErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Wasooli of Rs. ${numericAmount.toLocaleString()} from ${customer.name} recorded successfully.`,
      data: {
        customer,
        ledgerEntry,
        updatedChannels: profile?.paymentChannels,
      },
    });
  } catch (error: any) {
    console.error('[recordCustomerWasooli Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error recording customer wasooli.' });
  }
};

/**
 * 10. Record Supplier Payment Disbursement & Roznamcha Galla Deduction
 * POST /api/v1/counterparties/:id/pay
 */
export const paySupplier = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const subAccountId = req.user?.subAccountId;
    const { id } = req.params;
    const {
      amount,
      paymentMode = 'CASH',
      isAdvance = false,
      referenceNo,
      notes,
    } = req.body;

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive payment amount is required.' });
    }

    if (!id || !Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier ID format.' });
    }

    const supplier = await Counterparty.findOne({ _id: id, profileId });
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier counterparty not found.' });
    }

    const ledgerEntryType: 'CASH_OUT' | 'SETTLEMENT' = paymentMode === 'CASH' ? 'CASH_OUT' : 'SETTLEMENT';

    if (isAdvance) {
      supplier.advanceDeposit = (supplier.advanceDeposit || 0) + numericAmount;
    } else {
      // 1. Pay off supplier payable debt (handles both negative convention and positive balance)
      if (supplier.currentBalance < 0) {
        supplier.currentBalance += numericAmount;
      } else if (supplier.currentBalance > 0) {
        supplier.currentBalance = Math.max(0, supplier.currentBalance - numericAmount);
      }

      // 2. Consume any remaining advance prepayment credit against remaining negative debt
      if (supplier.currentBalance < 0 && (supplier.advanceDeposit || 0) > 0) {
        const debt = Math.abs(supplier.currentBalance);
        const useAdv = Math.min(debt, supplier.advanceDeposit!);
        supplier.currentBalance += useAdv;
        supplier.advanceDeposit! -= useAdv;
      }

      // 3. If debt is completely cleared (currentBalance >= 0) and supplier has leftover advanceDeposit that was applied to settle the bill, consume it!
      if (supplier.currentBalance >= 0 && (supplier.advanceDeposit || 0) > 0) {
        // If payment plus advance cleared the debt, consume the advance deposit
        const overpaid = supplier.currentBalance;
        supplier.advanceDeposit = overpaid > 0 ? (supplier.advanceDeposit || 0) + overpaid : 0;
        supplier.currentBalance = 0;
      }
    }

    await supplier.save();

    // Create LedgerEntry for Roznamcha / Cash Drawer tracking
    const ledgerEntry = await LedgerEntry.create({
      profileId,
      counterpartyId: supplier._id,
      subAccountId: subAccountId ? new Types.ObjectId(subAccountId) : undefined,
      entryType: ledgerEntryType,
      amount: numericAmount,
      paymentMode: ['CASH', 'BANK_TRANSFER', 'JAZZCASH', 'CHEQUE'].includes(paymentMode) ? paymentMode : 'CASH',
      category: isAdvance ? 'Supplier Advance Prepayment' : 'Supplier Payment Disbursement',
      description: notes || `${isAdvance ? 'Advance Prepayment' : 'Payment Disbursement'} to ${supplier.name} ${referenceNo ? '(Ref: ' + referenceNo + ')' : ''}`,
      isSettled: true,
      settledAt: new Date(),
    });

    // Also record immutable forensic audit log entry
    await AuditLog.create({
      profileId: new Types.ObjectId(profileId),
      authorizedById: new Types.ObjectId(profileId),
      authorizedByName: (req.user as any)?.fullName || 'Dukandar',
      authorizedByRole: req.user?.role || 'OWNER',
      actionType: isAdvance ? 'SUPPLIER_ADVANCE_PAID' : 'SUPPLIER_PAYMENT_DISBURSED',
      counterpartyId: supplier._id,
      counterpartyName: supplier.name,
      counterpartyPhone: supplier.phone,
      financialSnapshot: {
        creditLimit: supplier.creditLimit || 0,
        balanceBefore: supplier.currentBalance - (isAdvance ? 0 : numericAmount),
        attemptedAmount: numericAmount,
        resultingBalance: supplier.currentBalance,
      },
      reason: `${isAdvance ? 'Advance Prepayment' : 'Disbursement'} of Rs. ${numericAmount} paid to supplier ${supplier.name}.`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Payment of Rs. ${numericAmount.toLocaleString()} to ${supplier.name} recorded successfully.`,
      data: {
        supplier,
        ledgerEntry,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 11. Get Upcoming Supplier Payment Due Reminders (24-48 Hours Alert)
 * GET /api/v1/counterparties/supplier-due-reminders
 */
export const getSupplierDueReminders = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;

    // Find all active suppliers with money owed (negative balance)
    const suppliers = await Counterparty.find({
      profileId,
      relationType: 'SUPPLIER',
      currentBalance: { $lt: 0 },
    });

    const now = new Date();
    const upcomingReminders = suppliers.map((sup) => {
      const owedAmount = Math.abs(sup.currentBalance);
      const periodDays = sup.tradeCreditTerms?.creditPeriodDays || 7;
      const termType = sup.tradeCreditTerms?.termType || 'NET_7';

      // Estimate due date based on updatedAt or credit period
      const lastUpdate = new Date(sup.updatedAt);
      const dueDate = new Date(lastUpdate.getTime() + periodDays * 86400000);
      const hoursRemaining = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));

      const isDueSoon = hoursRemaining <= 48; // 24-48 hours alert

      return {
        supplierId: sup._id,
        supplierName: sup.name,
        phone: sup.phone,
        owedAmount,
        termType,
        creditPeriodDays: periodDays,
        dueDate: dueDate.toISOString(),
        hoursRemaining,
        isDueSoon,
        repName: sup.deliveryRep?.name,
        repPhone: sup.deliveryRep?.phone,
        bankDetails: sup.companyBankDetails,
      };
    });

    return res.status(200).json({
      success: true,
      data: upcomingReminders,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 12. Recalculate XGBoost AI Default Risk Scoring for Counterparty
 * POST /api/v1/counterparties/:id/recalculate-risk
 */
export const recalculateCounterpartyRisk = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Counterparty not found.' });
    }

    const now = Date.now();
    const lastActivity = counterparty.updatedAt ? new Date(counterparty.updatedAt).getTime() : now;
    const diffDays = Math.max(0, Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)));

    const balanceRatio = counterparty.creditLimit > 0
      ? Math.min(1.5, counterparty.currentBalance / counterparty.creditLimit)
      : 0.5;

    // XGBoost ML Default Risk Feature Score Simulation
    let rawScore = (diffDays * 0.03) + (balanceRatio * 0.4);
    if (counterparty.isCreditBlocked) rawScore += 0.3;
    if (diffDays > 30) rawScore += 0.25;

    const defaultProbability = Math.min(0.99, Math.max(0.05, Math.round(rawScore * 100) / 100));

    let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (defaultProbability >= 0.6 || diffDays > 15) riskTier = 'HIGH';
    else if (defaultProbability >= 0.3 || diffDays > 7) riskTier = 'MEDIUM';

    counterparty.riskProfile = {
      defaultProbability,
      riskTier,
      lastEvaluatedAt: new Date(),
      overdueDays: diffDays,
      currentToneTier: riskTier === 'HIGH' ? 3 : riskTier === 'MEDIUM' ? 2 : 1,
      lastReminderSentAt: counterparty.riskProfile?.lastReminderSentAt,
    };

    await counterparty.save();

    return res.status(200).json({
      success: true,
      message: `Risk score recalculated for ${counterparty.name}.`,
      data: {
        counterpartyId: counterparty._id,
        name: counterparty.name,
        riskProfile: counterparty.riskProfile,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 13. Get Debt Aging Radar (تاخیر کا ریکارڈ) & Risk Categorization
 * GET /api/v1/counterparties/debt-aging-radar
 */
export const getDebtAgingRadar = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;

    const customers = await Counterparty.find({
      profileId,
      relationType: 'CUSTOMER',
      currentBalance: { $gt: 0 },
    });

    const now = Date.now();

    const buckets = {
      days0To7: { count: 0, totalAmount: 0 },
      days8To15: { count: 0, totalAmount: 0 },
      days16To30: { count: 0, totalAmount: 0 },
      days30Plus: { count: 0, totalAmount: 0 },
    };

    const debtorsList = customers.map((c) => {
      const lastActivity = c.updatedAt ? new Date(c.updatedAt).getTime() : now;
      const overdueDays = Math.max(0, Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24)));
      const amt = c.currentBalance;

      let agingCategory: '0-7d' | '8-15d' | '16-30d' | '30+d' = '0-7d';
      if (overdueDays > 30) {
        agingCategory = '30+d';
        buckets.days30Plus.count += 1;
        buckets.days30Plus.totalAmount += amt;
      } else if (overdueDays > 15) {
        agingCategory = '16-30d';
        buckets.days16To30.count += 1;
        buckets.days16To30.totalAmount += amt;
      } else if (overdueDays > 7) {
        agingCategory = '8-15d';
        buckets.days8To15.count += 1;
        buckets.days8To15.totalAmount += amt;
      } else {
        agingCategory = '0-7d';
        buckets.days0To7.count += 1;
        buckets.days0To7.totalAmount += amt;
      }

      let riskTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      let riskScore = 0.15;
      if (overdueDays > 15 || amt > c.creditLimit) {
        riskTier = 'HIGH';
        riskScore = 0.82;
      } else if (overdueDays > 7 || amt > c.creditLimit * 0.7) {
        riskTier = 'MEDIUM';
        riskScore = 0.45;
      }

      const formattedAmt = amt.toLocaleString('en-PK');
      const tagazaTemplate = `Assalam-o-Alaikum ${c.name}, Digi Hisab record ke mutabiq aap ka Rs. ${formattedAmt} ka udhaar ${overdueDays > 0 ? overdueDays + ' dino se ' : ''}wajib-ul-ada hai. Baraye meherbani is link se ghar baithe JazzCash / Easypaisa se adaigi karein. Shukriya!`;

      return {
        id: c._id,
        name: c.name,
        phone: c.phone,
        currentBalance: c.currentBalance,
        creditLimit: c.creditLimit,
        overdueDays,
        agingCategory,
        riskTier: c.riskProfile?.riskTier || riskTier,
        riskScore: c.riskProfile?.defaultProbability || riskScore,
        tagazaTemplate,
      };
    });

    // Sort highest overdue first
    debtorsList.sort((a, b) => b.overdueDays - a.overdueDays);

    return res.status(200).json({
      success: true,
      data: {
        buckets,
        debtors: debtorsList,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 10. Get Dynamic Jev Taqaza Policy for Counterparty
 * GET /api/v1/counterparties/:id/taqaza-policy
 */
export const getCounterpartyTaqazaPolicy = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id;
    const { id } = req.params;

    const counterparty = await Counterparty.findOne({ _id: id, profileId });
    if (!counterparty) {
      return res.status(404).json({ success: false, message: 'Customer khata not found.' });
    }

    const profile = await Profile.findById(profileId);
    const storeName = profile?.businessName || profile?.fullName || 'ڈیجی حساب اسٹور';

    const paymentDetails = {
      jazzCash: profile?.paymentDetails?.jazzcash?.accountNumber || profile?.paymentSettings?.jazzCashNumber,
      easypaisa: profile?.paymentDetails?.easypaisa?.accountNumber || profile?.paymentSettings?.easypaisaNumber,
      raast: profile?.paymentDetails?.raast?.idOrIban || profile?.paymentSettings?.raastId,
      accountTitle: profile?.paymentDetails?.jazzcash?.accountTitle || profile?.fullName,
    };

    const overdueDays = counterparty.riskProfile?.overdueDays ?? 0;
    const toneTier = counterparty.riskProfile?.currentToneTier ?? 1;

    const policy = TaqazaPolicyClassifier.evaluate(
      {
        customerName: counterparty.name,
        currentBalance: counterparty.currentBalance,
        creditLimit: counterparty.creditLimit,
        daysPastDue: overdueDays,
        historicalRepaymentRatio: 0.85,
        priorRemindersSentCount: toneTier > 1 ? toneTier - 1 : 0,
        defaultProbability: counterparty.riskProfile?.defaultProbability ?? 0.15,
        address: counterparty.address,
        phone: counterparty.phone,
      },
      storeName,
      paymentDetails
    );

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 15. Bulk Delete All Customers & Clear Local Ledger History
 * DELETE /api/v1/khata/customers/bulk-delete
 * DELETE /api/v1/counterparties/bulk-delete
 */
export const bulkDeleteCustomers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const result = await Counterparty.deleteMany({
      profileId,
      relationType: 'CUSTOMER',
    });

    return res.status(200).json({
      success: true,
      message: `تمام گاہک اور ان کا کھاتہ کامیابی سے حذف ہو گیا۔ (${result.deletedCount || 0} customers deleted)`,
      deletedCount: result.deletedCount || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 16. Single Customer Deletion
 * DELETE /api/v1/khata/customers/:id
 * DELETE /api/v1/counterparties/:id (with force deletion option)
 */
export const deleteCustomerById = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { id } = req.params;

    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const customer = await Counterparty.findOneAndDelete({
      _id: id,
      profileId,
      relationType: 'CUSTOMER',
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer record not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `گاہک ${customer.name} کا کھاتہ کامیابی سے حذف کر دیا گیا ہے۔`,
      data: { id: customer._id, name: customer.name },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


