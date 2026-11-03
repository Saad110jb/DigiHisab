import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { Profile, PersonaType, SubAccountRole } from '../models/Profile';
import { AuditLog } from '../models/AuditLog';

const BCRYPT_SALT_ROUNDS = 10;

const isEmailFormat = (val?: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  return val.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
};

const validateAndCleanCnic = (cnicRaw?: string): { valid: boolean; formatted?: string; error?: string } => {
  if (!cnicRaw || !cnicRaw.trim()) return { valid: true };
  const trimmed = cnicRaw.trim();
  if (isEmailFormat(trimmed)) {
    return { valid: false, error: '⚠️ Email address cannot be passed as owner CNIC.' };
  }
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length === 13) {
    const formatted = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
    return { valid: true, formatted };
  }
  const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
  if (cnicRegex.test(trimmed)) {
    return { valid: true, formatted: trimmed };
  }
  return {
    valid: false,
    error: '⚠️ Invalid CNIC format. Pakistani CNIC must have 13 digits (e.g. 42101-1234567-1).',
  };
};

const handleControllerError = (res: Response, controllerName: string, error: any): Response => {
  console.error(`[${controllerName} ERROR]:`, error);
  return res.status(500).json({
    success: false,
    message: error.message || 'An internal server error occurred.',
    errorDetails: error.stack || String(error),
  });
};

/**
 * 1. Get Merchant/Household Profile Details
 * GET /api/v1/profile
 */
export const getProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized: Profile ID missing from token.' });
    }

    const profile = await Profile.findById(profileId)
      .select('-pinHash -passwordHash -subAccounts.pinHash')
      .lean();

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const defaultPaymentChannels = {
      cashDrawer: 45000,
      bankAccount: 125000,
      digitalWallet: 32000,
    };

    // Filter master owner profile out from sub-accounts list
    const masterPhoneClean = profile.phone ? profile.phone.replace(/[^0-9]/g, '') : '';
    const masterIdStr = profile._id ? profile._id.toString() : '';

    const cleanSubAccounts = (profile.subAccounts || []).filter((sub: any) => {
      const subPhoneClean = sub.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
      const subIdStr = sub._id ? sub._id.toString() : (sub.subAccountId ? sub.subAccountId.toString() : '');
      const isMasterProfile =
        (subIdStr && subIdStr === masterIdStr) ||
        (subPhoneClean && masterPhoneClean && subPhoneClean === masterPhoneClean);
      return !isMasterProfile;
    });

    const shopCity =
      profile.shopAddress?.city ||
      profile.shopAddress?.areaOrChak ||
      profile.businessAddress ||
      'Pakistan';
    const headerPreview = `${profile.businessName || 'Store'} • ${shopCity}`;

    const effectiveOwnerCnic = profile.ownerCnic || profile.cnic || '';
    const effectiveShopAddress = profile.shopAddress || {
      formattedAddress: profile.businessAddress || '',
      city: shopCity,
    };
    const effectivePaymentDetails = profile.paymentDetails || {
      jazzcash: {
        accountNumber: profile.paymentSettings?.jazzCashNumber || '',
        accountTitle: profile.paymentSettings?.jazzCashTitle || profile.fullName || '',
      },
      easypaisa: {
        accountNumber: profile.paymentSettings?.easypaisaNumber || '',
        accountTitle: profile.paymentSettings?.easypaisaTitle || profile.fullName || '',
      },
      raast: {
        idOrIban: profile.paymentSettings?.raastId || profile.paymentSettings?.iban || '',
        bankName: profile.paymentSettings?.bankName || '',
        accountTitle: profile.paymentSettings?.bankTitle || profile.fullName || '',
      },
    };

    return res.status(200).json({
      success: true,
      data: {
        ...profile,
        ownerCnic: effectiveOwnerCnic,
        cnic: effectiveOwnerCnic,
        shopAddress: effectiveShopAddress,
        paymentDetails: effectivePaymentDetails,
        headerPreview,
        subAccounts: cleanSubAccounts,
        paymentChannels: profile.paymentChannels || defaultPaymentChannels,
        address: profile.businessAddress || (profile as any).address || '',
      },
    });
  } catch (error: any) {
    return handleControllerError(res, 'getProfile', error);
  }
};

/**
 * 2. Update General Profile Details
 * PUT /api/v1/profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized: Profile ID missing from token.' });
    }

    const { fullName, email, businessName, businessAddress, baseCurrency } = req.body;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    if (typeof fullName === 'string' && fullName.trim()) profile.fullName = fullName.trim();
    if (typeof email === 'string' && email.trim()) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!isEmailFormat(trimmedEmail)) {
        return res.status(400).json({ success: false, message: '⚠️ Invalid email address format.' });
      }
      profile.email = trimmedEmail;
    }
    if (typeof businessName === 'string') profile.businessName = businessName.trim();
    if (typeof businessAddress === 'string') profile.businessAddress = businessAddress.trim();
    if (typeof baseCurrency === 'string') profile.baseCurrency = baseCurrency.toUpperCase();

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        id: profile._id,
        fullName: profile.fullName,
        email: profile.email,
        businessName: profile.businessName,
        businessAddress: profile.businessAddress,
        baseCurrency: profile.baseCurrency,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, 'updateProfile', error);
  }
};

/**
 * 3. Update Business Profile & Strict Persona Switching
 * PUT /api/v1/profile/business
 * PATCH /api/v1/profile/business-details
 */
export const updateBusinessProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized: Profile ID missing from token.' });
    }

    const {
      fullName,
      email,
      businessName,
      businessCategory,
      address,
      businessAddress,
      cnic,
      ownerCnic,
      shopAddress,
      activePersona,
      managerPin,
      cashierPinRequired,
      paymentSettings,
      paymentDetails,
    } = req.body;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    // Validate email
    if (email !== undefined && email !== null && String(email).trim()) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!isEmailFormat(cleanEmail)) {
        return res.status(400).json({ success: false, message: '⚠️ Invalid email address format.' });
      }
      profile.email = cleanEmail;
    }

    // Validate CNIC (reject email in CNIC field & check 13 digit format)
    const targetCnic = ownerCnic || cnic;
    if (targetCnic !== undefined && targetCnic !== null && String(targetCnic).trim()) {
      const cnicCheck = validateAndCleanCnic(String(targetCnic));
      if (!cnicCheck.valid) {
        return res.status(400).json({ success: false, message: cnicCheck.error || 'Invalid CNIC format.' });
      }
      profile.ownerCnic = cnicCheck.formatted;
      profile.cnic = cnicCheck.formatted;
    }

    // Check bankName for email pollution
    const checkBankName = paymentSettings?.bankName || paymentDetails?.raast?.bankName || req.body.bankName;
    if (checkBankName && isEmailFormat(String(checkBankName))) {
      return res.status(400).json({ success: false, message: '⚠️ Email address cannot be passed as Bank Name.' });
    }

    if (paymentSettings && typeof paymentSettings === 'object') {
      profile.paymentSettings = {
        ...profile.paymentSettings,
        ...paymentSettings,
      };
    }

    if (paymentDetails && typeof paymentDetails === 'object') {
      profile.paymentDetails = {
        ...profile.paymentDetails,
        ...paymentDetails,
      };
    }

    // Direct flat keys support
    if (req.body.jazzCashNumber !== undefined || req.body.easypaisaNumber !== undefined || req.body.raastId !== undefined) {
      if (!profile.paymentSettings) profile.paymentSettings = {};
      if (req.body.jazzCashNumber !== undefined) profile.paymentSettings.jazzCashNumber = req.body.jazzCashNumber;
      if (req.body.jazzCashTitle !== undefined) profile.paymentSettings.jazzCashTitle = req.body.jazzCashTitle;
      if (req.body.easypaisaNumber !== undefined) profile.paymentSettings.easypaisaNumber = req.body.easypaisaNumber;
      if (req.body.easypaisaTitle !== undefined) profile.paymentSettings.easypaisaTitle = req.body.easypaisaTitle;
      if (req.body.raastId !== undefined) profile.paymentSettings.raastId = req.body.raastId;
      if (req.body.bankName !== undefined) profile.paymentSettings.bankName = req.body.bankName;
      if (req.body.bankTitle !== undefined) profile.paymentSettings.bankTitle = req.body.bankTitle;
      if (req.body.iban !== undefined) profile.paymentSettings.iban = req.body.iban;

      profile.paymentDetails = {
        jazzcash: {
          accountNumber: profile.paymentSettings.jazzCashNumber,
          accountTitle: profile.paymentSettings.jazzCashTitle,
        },
        easypaisa: {
          accountNumber: profile.paymentSettings.easypaisaNumber,
          accountTitle: profile.paymentSettings.easypaisaTitle,
        },
        raast: {
          idOrIban: profile.paymentSettings.raastId || profile.paymentSettings.iban,
          bankName: profile.paymentSettings.bankName,
          accountTitle: profile.paymentSettings.bankTitle || profile.fullName,
        },
      };
    }

    // Persona is permanently locked to the registered account type.
    // Any request trying to switch persona is safely ignored to maintain lock integrity with 200 OK.
    if (activePersona && String(activePersona).toUpperCase() !== profile.activePersona) {
      console.log(`[Persona Guard] Account ${profile._id} persona switch attempt ignored. Retaining locked persona: ${profile.activePersona}`);
    }

    if (typeof fullName === 'string' && fullName.trim()) profile.fullName = fullName.trim();
    if (typeof businessName === 'string') profile.businessName = businessName.trim();
    if (typeof businessCategory === 'string') profile.businessCategory = businessCategory.trim();

    const targetAddress = typeof address === 'string' ? address.trim() : (typeof businessAddress === 'string' ? businessAddress.trim() : undefined);
    if (targetAddress !== undefined) profile.businessAddress = targetAddress;

    if (shopAddress && typeof shopAddress === 'object') {
      const cityStr = shopAddress.city ? shopAddress.city.trim() : '';
      const areaStr = shopAddress.areaOrChak ? shopAddress.areaOrChak.trim() : '';
      const streetStr = shopAddress.street ? shopAddress.street.trim() : '';
      const formatted = shopAddress.formattedAddress || `${areaStr ? areaStr + ', ' : ''}${cityStr}`.trim();
      profile.shopAddress = {
        street: streetStr,
        areaOrChak: areaStr,
        city: cityStr,
        formattedAddress: formatted || profile.businessAddress || '',
      };
      if (formatted) profile.businessAddress = formatted;
    }

    if (managerPin && /^\d{4,6}$/.test(String(managerPin).trim())) {
      const hashedPin = await bcrypt.hash(String(managerPin).trim(), BCRYPT_SALT_ROUNDS);
      profile.pinHash = hashedPin;
      profile.managerPinHash = hashedPin;
    }

    if (!profile.registeredAccountType) {
      profile.registeredAccountType = profile.activePersona || 'VENDOR';
    }

    await profile.save();

    const shopCity = profile.shopAddress?.city || profile.shopAddress?.areaOrChak || profile.businessAddress || 'Pakistan';
    const headerPreview = `${profile.businessName || 'Store'} • ${shopCity}`;

    return res.status(200).json({
      success: true,
      message: 'Business profile updated successfully.',
      data: {
        id: profile._id,
        fullName: profile.fullName,
        email: profile.email,
        activePersona: profile.activePersona,
        registeredAccountType: profile.registeredAccountType || profile.activePersona,
        businessName: profile.businessName,
        businessCategory: profile.businessCategory,
        businessAddress: profile.businessAddress,
        shopAddress: profile.shopAddress,
        cnic: profile.ownerCnic || profile.cnic,
        ownerCnic: profile.ownerCnic || profile.cnic,
        paymentDetails: profile.paymentDetails,
        paymentSettings: profile.paymentSettings,
        headerPreview,
        cashierPinRequired: profile.cashierPinRequired,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, 'updateBusinessProfile', error);
  }
};

/**
 * 3B. Update Payment Accounts Endpoint
 * PATCH /api/v1/profile/payment-accounts
 */
export const updatePaymentAccounts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized: Profile ID missing from token.' });
    }

    const { paymentDetails, paymentSettings, jazzCashNumber, jazzCashTitle, easypaisaNumber, easypaisaTitle, raastId, bankName, bankTitle, iban } = req.body;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const targetBankName = bankName || paymentDetails?.raast?.bankName || paymentSettings?.bankName;
    if (targetBankName && isEmailFormat(String(targetBankName))) {
      return res.status(400).json({ success: false, message: '⚠️ Email address cannot be passed as Bank Name.' });
    }

    const jNum = jazzCashNumber !== undefined ? jazzCashNumber : (paymentDetails?.jazzcash?.accountNumber || paymentSettings?.jazzCashNumber);
    const jTitle = jazzCashTitle !== undefined ? jazzCashTitle : (paymentDetails?.jazzcash?.accountTitle || paymentSettings?.jazzCashTitle);
    const eNum = easypaisaNumber !== undefined ? easypaisaNumber : (paymentDetails?.easypaisa?.accountNumber || paymentSettings?.easypaisaNumber);
    const eTitle = easypaisaTitle !== undefined ? easypaisaTitle : (paymentDetails?.easypaisa?.accountTitle || paymentSettings?.easypaisaTitle);
    const rId = raastId !== undefined ? raastId : (paymentDetails?.raast?.idOrIban || paymentSettings?.raastId || paymentSettings?.iban);
    const bName = bankName !== undefined ? bankName : (paymentDetails?.raast?.bankName || paymentSettings?.bankName);
    const bTitle = bankTitle !== undefined ? bankTitle : (paymentDetails?.raast?.accountTitle || paymentSettings?.bankTitle || profile.fullName);

    profile.paymentDetails = {
      jazzcash: { accountNumber: jNum, accountTitle: jTitle },
      easypaisa: { accountNumber: eNum, accountTitle: eTitle },
      raast: { idOrIban: rId, bankName: bName, accountTitle: bTitle },
    };

    profile.paymentSettings = {
      ...profile.paymentSettings,
      jazzCashNumber: jNum,
      jazzCashTitle: jTitle,
      easypaisaNumber: eNum,
      easypaisaTitle: eTitle,
      raastId: rId,
      bankName: bName,
      bankTitle: bTitle,
      iban: iban || rId,
    };

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Direct payment accounts updated successfully.',
      data: {
        paymentDetails: profile.paymentDetails,
        paymentSettings: profile.paymentSettings,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, 'updatePaymentAccounts', error);
  }
};

/**
 * 3C. Update Manager Security PIN Endpoint
 * PATCH /api/v1/profile/manager-pin
 */
export const updateManagerPin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const userRole = req.user?.role || 'OWNER';

    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized: Profile ID missing from token.' });
    }

    if (userRole === 'CASHIER') {
      return res.status(403).json({
        success: false,
        message: '🔒 صرف دکان کے مالک یا منیجر کو پن تبدیل کرنے کی اجازت ہے۔',
      });
    }

    const { managerPin, pin } = req.body;
    const targetPin = managerPin || pin;

    if (!targetPin || !/^\d{4}$/.test(String(targetPin).trim())) {
      return res.status(400).json({
        success: false,
        message: '⚠️ Manager Security PIN must be exactly 4 numeric digits (چار ہندسوں کا پن درج کریں).',
      });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const hashedPin = await bcrypt.hash(String(targetPin).trim(), BCRYPT_SALT_ROUNDS);
    profile.managerPinHash = hashedPin;
    profile.managerOverridePin = hashedPin;

    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Manager Security PIN updated successfully.',
    });
  } catch (error: any) {
    return handleControllerError(res, 'updateManagerPin', error);
  }
};

/**
 * 4. Upgrade / Renew Subscription
 * POST /api/v1/profile/subscription/upgrade
 */
export const upgradeSubscription = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized: Profile ID missing from token.' });
    }

    const { tier, paymentMethod, durationDays = 30 } = req.body;

    if (!['FREE', 'PRO'].includes(tier)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription tier.' });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const startDate = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(startDate.getDate() + Number(durationDays));

    profile.subscription = {
      tier,
      startDate,
      expiresAt: tier === 'FREE' ? undefined : expiresAt,
      paymentMethod: paymentMethod || 'MANUAL',
      autoRenew: tier === 'PRO',
    };

    await profile.save();

    return res.status(200).json({
      success: true,
      message: `Subscription successfully updated to ${tier}`,
      data: profile.subscription,
    });
  } catch (error: any) {
    return handleControllerError(res, 'upgradeSubscription', error);
  }
};

/**
 * 5. Add Sub-Account (Cashier / Manager / Family Member)
 * POST /api/v1/profile/sub-accounts
 */
export const addSubAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    if (!profileId) {
      return res.status(401).json({ success: false, message: 'Not authorized: Profile ID missing from token.' });
    }

    const { name, fullName, phone, pin, role, permissions } = req.body;
    const rawName = name || fullName;
    const targetName = typeof rawName === 'string' ? rawName.trim() : undefined;

    if (!targetName || !phone || !pin || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, 4-digit PIN, and role are required.',
      });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    // Enforce Pro-tier limitation for multi-cashier setups
    const currentTier = profile.subscription?.tier || 'FREE';
    const subAccountsList = profile.subAccounts || [];

    if (currentTier === 'FREE' && subAccountsList.length >= 1) {
      return res.status(403).json({
        success: false,
        code: 'PRO_TIER_REQUIRED',
        message: 'Free tier permits only 1 sub-account. Upgrade to PRO for unlimited cashiers/managers.',
      });
    }

    // Format phone to E.164
    const phoneStr = String(phone);
    let cleanPhone = phoneStr.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('03')) cleanPhone = '+92' + cleanPhone.substring(1);

    // Check duplicate phone across existing sub-accounts in this tenant
    const exists = subAccountsList.some((sub) => sub.phone === cleanPhone);
    if (exists) {
      return res.status(409).json({ success: false, message: 'A sub-account with this phone already exists.' });
    }

    const pinHash = await bcrypt.hash(String(pin), BCRYPT_SALT_ROUNDS);

    const newSubAccount = {
      _id: new Types.ObjectId(),
      name: targetName,
      phone: cleanPhone,
      pinHash,
      role: (role as SubAccountRole) || 'CASHIER',
      permissions: permissions || ['CREATE_TRANSACTION', 'VIEW_CUSTOMER_BALANCE'],
      isActive: true,
    };

    if (!profile.subAccounts) {
      profile.subAccounts = [] as any;
    }
    profile.subAccounts.push(newSubAccount as any);
    await profile.save();

    // Safely log creation in audit table
    try {
      await AuditLog.create({
        profileId: profile._id,
        authorizedById: profile._id,
        authorizedByName: profile.fullName || 'OWNER',
        authorizedByRole: 'OWNER',
        actionType: 'SUB_ACCOUNT_CREATED',
        financialSnapshot: { creditLimit: 0, balanceBefore: 0, attemptedAmount: 0, resultingBalance: 0 },
        reason: `Created sub-account ${targetName} with role ${role}`,
        ipAddress: req.ip,
      });
    } catch (auditErr: any) {
      console.warn('[AuditLog] Failed to log sub-account creation:', auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Sub-account created successfully.',
      data: {
        _id: newSubAccount._id,
        name: newSubAccount.name,
        phone: newSubAccount.phone,
        role: newSubAccount.role,
        permissions: newSubAccount.permissions,
        isActive: newSubAccount.isActive,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, 'addSubAccount', error);
  }
};

/**
 * 6. Toggle Active/Deactivated Status of Sub-Account
 * PATCH /api/v1/profile/sub-accounts/:subAccountId/status
 */
export const updateSubAccountStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { subAccountId } = req.params;
    const { isActive } = req.body;

    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

    const sub = profile.subAccounts.id(subAccountId);
    if (!sub) return res.status(404).json({ success: false, message: 'Sub-account not found.' });

    sub.isActive = Boolean(isActive);
    await profile.save();

    try {
      await AuditLog.create({
        profileId: profile._id,
        authorizedById: profile._id,
        authorizedByName: profile.fullName,
        authorizedByRole: 'OWNER',
        actionType: 'SUB_ACCOUNT_DEACTIVATED',
        financialSnapshot: { creditLimit: 0, balanceBefore: 0, attemptedAmount: 0, resultingBalance: 0 },
        reason: `Sub-account ${sub.name} status updated to: ${sub.isActive ? 'ACTIVE' : 'DEACTIVATED'}`,
        ipAddress: req.ip,
      });
    } catch (auditErr: any) {
      console.warn('[AuditLog] Deactivation log error:', auditErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Sub-account has been ${sub.isActive ? 'activated' : 'deactivated'}.`,
    });
  } catch (error: any) {
    return handleControllerError(res, 'updateSubAccountStatus', error);
  }
};

/**
 * 7. Update Sub-Account Details
 * PUT /api/v1/profile/sub-accounts/:subAccountId
 */
export const updateSubAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { subAccountId } = req.params;
    const { name, role, permissions, isActive, pin } = req.body;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const sub = profile.subAccounts.id(subAccountId);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Sub-account not found.' });
    }

    if (typeof name === 'string' && name.trim()) sub.name = name.trim();
    if (role) sub.role = role;
    if (permissions && Array.isArray(permissions)) sub.permissions = permissions;
    if (typeof isActive === 'boolean') sub.isActive = isActive;
    if (pin) sub.pinHash = await bcrypt.hash(String(pin), BCRYPT_SALT_ROUNDS);

    await profile.save();

    const sanitizedSub = sub.toObject();
    delete (sanitizedSub as any).pinHash;

    return res.status(200).json({
      success: true,
      message: 'Sub-account updated successfully.',
      data: sanitizedSub,
    });
  } catch (error: any) {
    return handleControllerError(res, 'updateSubAccount', error);
  }
};

/**
 * 8. Delete Sub-Account
 * DELETE /api/v1/profile/sub-accounts/:subAccountId
 */
export const deleteSubAccount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { subAccountId } = req.params;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const sub = profile.subAccounts.id(subAccountId);
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Sub-account not found.' });
    }

    sub.deleteOne();
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Sub-account deleted successfully.',
    });
  } catch (error: any) {
    return handleControllerError(res, 'deleteSubAccount', error);
  }
};

/**
 * 9. Verify Manager/Owner PIN for Real-Time Override Gatekeeper
 * POST /api/v1/profile/verify-override-pin
 */
export const verifyManagerPin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const profileId = req.user?.id || req.user?.profileId;
    const { managerPin } = req.body;

    if (!managerPin) {
      return res.status(400).json({ success: false, message: 'Manager or Owner PIN is required.' });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });

    // 1. Check Owner PIN
    const isOwner = await bcrypt.compare(String(managerPin), profile.pinHash);
    if (isOwner) {
      return res.status(200).json({
        success: true,
        authorizer: {
          id: profile._id,
          name: profile.fullName,
          role: 'OWNER',
        },
      });
    }

    // 2. Check active Sub-Accounts with MANAGER role
    const subAccountsList = profile.subAccounts || [];
    for (const sub of subAccountsList) {
      if (sub.isActive && sub.role === 'MANAGER') {
        const isMatch = await bcrypt.compare(String(managerPin), sub.pinHash);
        if (isMatch) {
          return res.status(200).json({
            success: true,
            authorizer: {
              id: sub._id,
              name: sub.name,
              role: 'MANAGER',
            },
          });
        }
      }
    }

    return res.status(401).json({
      success: false,
      code: 'INVALID_OVERRIDE_PIN',
      message: 'Entered PIN does not belong to an authorized Owner or Manager.',
    });
  } catch (error: any) {
    return handleControllerError(res, 'verifyManagerPin', error);
  }
};

/**
 * 10. Verify Sub-Account PIN for Restricted Shift Logins
 * POST /api/v1/profile/sub-accounts/verify-pin
 */
export const verifySubAccountPin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ success: false, message: 'Phone and PIN are required.' });
    }

    const profile = await Profile.findOne({ 'subAccounts.phone': String(phone).trim() });
    if (!profile) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const subAccountsList = profile.subAccounts || [];
    const subAccount = subAccountsList.find((sub) => sub.phone === String(phone).trim());
    if (!subAccount || !subAccount.isActive) {
      return res.status(403).json({ success: false, message: 'Sub-account is inactive or missing.' });
    }

    const isPinValid = await bcrypt.compare(String(pin), subAccount.pinHash);
    if (!isPinValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Sub-account verified successfully.',
      data: {
        profileId: profile._id,
        subAccountId: subAccount._id,
        name: subAccount.name,
        role: subAccount.role,
        permissions: subAccount.permissions,
        activePersona: profile.activePersona,
      },
    });
  } catch (error: any) {
    return handleControllerError(res, 'verifySubAccountPin', error);
  }
};
