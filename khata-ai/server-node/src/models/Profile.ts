import { Schema, model, Document, Types } from 'mongoose';

export type PersonaType = 'HOUSEHOLD' | 'VENDOR' | 'HYBRID';
export type SubscriptionTier = 'FREE' | 'PRO';
export type SubAccountRole = 'CASHIER' | 'FAMILY_MEMBER' | 'MANAGER';

export interface ISubAccount {
  _id?: Types.ObjectId;
  name: string;
  phone: string;
  pinHash: string;
  role: SubAccountRole;
  permissions: string[];
  isActive: boolean;
  resetOtpCode?: string;
  resetOtpExpiresAt?: Date;
}

export interface IShopAddress {
  street?: string;
  areaOrChak?: string;
  city?: string;
  formattedAddress?: string;
}

export interface IPaymentAccountDetails {
  accountNumber?: string;
  accountTitle?: string;
}

export interface IRaastPaymentDetails {
  idOrIban?: string;
  bankName?: string;
  accountTitle?: string;
}

export interface IPaymentDetails {
  jazzcash?: IPaymentAccountDetails;
  easypaisa?: IPaymentAccountDetails;
  raast?: IRaastPaymentDetails;
}

export interface IMerchantPaymentSettings {
  jazzCashNumber?: string;
  jazzCashTitle?: string;
  easypaisaNumber?: string;
  easypaisaTitle?: string;
  raastId?: string;
  bankName?: string;
  bankTitle?: string;
  iban?: string;
  jazzCashQrUrl?: string;
  easypaisaQrUrl?: string;
  raastQrUrl?: string;
}

export interface IPaymentChannels {
  cashDrawer: number;
  bankAccount: number;
  digitalWallet: number;
}

export interface IGeoLockConfig {
  storeCoordinates?: {
    latitude: number;
    longitude: number;
    radiusMeters: number; // default: 500m
  };
  locationStatus?: 'GRANTED' | 'DENIED' | 'UNPROMPTED';
  safeCounterMode?: boolean;
  diasporaExemptions?: Array<{
    name: string;
    phone: string;
    country: string;
    addedAt: Date;
  }>;
  activeDeviceFingerprint?: string;
}

export interface IProfile extends Document {
  fullName: string;
  phone: string; // Normalized E.164: +923001234567
  email?: string;
  isEmailVerified?: boolean;
  passwordHash?: string;
  pinHash: string; // Master 4-6 digit security PIN
  managerPinHash?: string; // 4-digit override PIN
  managerOverridePin?: string; // 4-digit override PIN alias
  lastLoginAt?: Date;
  registeredAccountType?: PersonaType;
  activePersona: PersonaType;

  baseCurrency: string;
  businessName?: string;
  businessCategory?: string;
  businessAddress?: string;
  shopAddress?: IShopAddress;
  cnic?: string;
  ownerCnic?: string;
  cashierPinRequired?: boolean;
  paymentDetails?: IPaymentDetails;
  paymentSettings?: IMerchantPaymentSettings;
  paymentChannels?: IPaymentChannels;
  resetOtpCode?: string;
  resetOtpExpiresAt?: Date;
  welcomeEmailSent?: boolean;
  geoLockConfig?: IGeoLockConfig;
  subscription: {
    tier: SubscriptionTier;
    planKey?: string;
    personaScope?: 'DUKANDAR_ONLY' | 'HOUSEHOLD_ONLY' | 'DUAL_ACCESS';
    startDate: Date;
    expiresAt?: Date;
    paymentMethod?: 'JAZZCASH' | 'EASYPAISA' | 'STRIPE' | 'MANUAL';
    autoRenew: boolean;
    lastPromptAt?: Date;
    hasDismissedInitial?: boolean;
    allowedFeatures?: string[];
  };
  subAccounts: Types.DocumentArray<ISubAccount & Document>;
  createdAt: Date;
  updatedAt: Date;
}

const SubAccountSchema = new Schema<ISubAccount>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    pinHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['CASHIER', 'FAMILY_MEMBER', 'MANAGER'],
      default: 'CASHIER',
    },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    resetOtpCode: { type: String },
    resetOtpExpiresAt: { type: Date },
  },
  { _id: true }
);

const ProfileSchema = new Schema<IProfile>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    email: { type: String, trim: true, lowercase: true },
    isEmailVerified: { type: Boolean, default: false },
    passwordHash: { type: String },
    pinHash: { type: String, required: true },
    managerPinHash: { type: String },
    managerOverridePin: { type: String },
    lastLoginAt: { type: Date },
    registeredAccountType: {
      type: String,
      enum: ['HOUSEHOLD', 'VENDOR', 'HYBRID'],
      default: 'VENDOR',
      required: false,
    },
    activePersona: {
      type: String,
      enum: ['HOUSEHOLD', 'VENDOR', 'HYBRID'],
      default: 'VENDOR',
      required: true,
    },

    baseCurrency: { type: String, default: 'PKR' },
    businessName: { type: String, trim: true },
    businessCategory: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    shopAddress: {
      street: { type: String, trim: true },
      areaOrChak: { type: String, trim: true },
      city: { type: String, trim: true },
      formattedAddress: { type: String, trim: true },
    },
    cnic: { type: String, trim: true },
    ownerCnic: { type: String, trim: true },
    cashierPinRequired: { type: Boolean, default: true },
    paymentDetails: {
      jazzcash: {
        accountNumber: { type: String, trim: true },
        accountTitle: { type: String, trim: true },
      },
      easypaisa: {
        accountNumber: { type: String, trim: true },
        accountTitle: { type: String, trim: true },
      },
      raast: {
        idOrIban: { type: String, trim: true },
        bankName: { type: String, trim: true },
        accountTitle: { type: String, trim: true },
      },
    },
    paymentSettings: {
      jazzCashNumber: { type: String, trim: true },
      jazzCashTitle: { type: String, trim: true },
      easypaisaNumber: { type: String, trim: true },
      easypaisaTitle: { type: String, trim: true },
      raastId: { type: String, trim: true },
      bankName: { type: String, trim: true },
      bankTitle: { type: String, trim: true },
      iban: { type: String, trim: true },
      jazzCashQrUrl: { type: String, trim: true },
      easypaisaQrUrl: { type: String, trim: true },
      raastQrUrl: { type: String, trim: true },
    },
    paymentChannels: {
      cashDrawer: { type: Number, default: 0 },
      bankAccount: { type: Number, default: 0 },
      digitalWallet: { type: Number, default: 0 },
    },
    resetOtpCode: { type: String },
    resetOtpExpiresAt: { type: Date },
    welcomeEmailSent: { type: Boolean, default: false },
    geoLockConfig: {
      storeCoordinates: {
        latitude: { type: Number },
        longitude: { type: Number },
        radiusMeters: { type: Number, default: 500 },
      },
      locationStatus: {
        type: String,
        enum: ['GRANTED', 'DENIED', 'UNPROMPTED'],
        default: 'UNPROMPTED',
      },
      safeCounterMode: { type: Boolean, default: false },
      diasporaExemptions: [
        {
          name: { type: String, trim: true },
          phone: { type: String, trim: true },
          country: { type: String, trim: true },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      activeDeviceFingerprint: { type: String },
    },
    subscription: {
      tier: { type: String, enum: ['FREE', 'PRO'], default: 'FREE' },
      planKey: {
        type: String,
        enum: ['FREE_STARTER', 'GHAR_AI_PRO_200', 'DUKAN_BASIC_250', 'DUKAN_PRO_MALIK_400', 'DUAL_VIP_750'],
        default: 'FREE_STARTER'
      },
      personaScope: {
        type: String,
        enum: ['DUKANDAR_ONLY', 'HOUSEHOLD_ONLY', 'DUAL_ACCESS'],
        default: 'DUKANDAR_ONLY'
      },
      startDate: { type: Date, default: Date.now },
      expiresAt: { type: Date },
      paymentMethod: {
        type: String,
        enum: ['JAZZCASH', 'EASYPAISA', 'STRIPE', 'MANUAL'],
      },
      autoRenew: { type: Boolean, default: false },
      lastPromptAt: { type: Date },
      hasDismissedInitial: { type: Boolean, default: false },
      allowedFeatures: [{ type: String }],
    },
    subAccounts: [SubAccountSchema],
  },
  { timestamps: true }
);

ProfileSchema.pre('validate', function (next) {
  if (!this.registeredAccountType) {
    this.registeredAccountType = this.activePersona || 'VENDOR';
  }
  next();
});

ProfileSchema.pre('save', function (next) {
  if (!this.registeredAccountType) {
    this.registeredAccountType = this.activePersona || 'VENDOR';
  }
  next();
});

export const Profile = model<IProfile>('Profile', ProfileSchema);
