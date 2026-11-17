import { Types } from 'mongoose';
import { Counterparty } from '../models/Counterparty';
import { Profile } from '../models/Profile';
import { LedgerEntry } from '../models/LedgerEntry';

export interface IAggregatedStoreMetrics {
  totalNetPosition: number;
  channels: {
    physicalCash: number;
    bankAccount: number;
    digitalWallet: number;
  };
  maineLeneHain: {
    totalAmount: number;
    customerCount: number;
  };
  maineDeneHain: {
    totalAmount: number;
    supplierCount: number;
  };
  totalAdvances: number;
}

/**
 * Unified real-time MongoDB Aggregation Engine
 * Calculates true store metrics directly from active Counterparty documents.
 * 
 * Rules:
 * 1. Maine Lene Hain = Sum of all active Customer positive balances (currentBalance > 0).
 *    Customer negative balances represent advances (Peshgi) and are NOT added to receivables.
 * 2. Maine Dene Hain = Sum of all active Supplier debts.
 * 3. Kul Maleyat (Net Position) = Liquid Reserves + Maine Lene Hain - Maine Dene Hain.
 */
export const getAggregatedStoreMetrics = async (
  profileId: string | Types.ObjectId
): Promise<IAggregatedStoreMetrics> => {
  const pId = new Types.ObjectId(profileId);

  // 1. Aggregate Customers (Maine Lene Hain)
  const customerStats = await Counterparty.aggregate([
    {
      $match: {
        profileId: pId,
        relationType: 'CUSTOMER',
        isArchived: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        // Only sum positive balances where customer actually owes money
        totalReceivable: {
          $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0] },
        },
        debtorCount: {
          $sum: { $cond: [{ $gt: ['$currentBalance', 0] }, 1, 0] },
        },
        totalAdvances: {
          $sum: { $cond: [{ $lt: ['$currentBalance', 0] }, { $abs: '$currentBalance' }, 0] },
        },
      },
    },
  ]);

  // 2. Aggregate Suppliers (Maine Dene Hain)
  // Store owes supplier: negative balance or positive debt
  const supplierStats = await Counterparty.aggregate([
    {
      $match: {
        profileId: pId,
        relationType: 'SUPPLIER',
        isArchived: { $ne: true },
      },
    },
    {
      $group: {
        _id: null,
        totalPayable: {
          $sum: {
            $cond: [
              { $lt: ['$currentBalance', 0] },
              { $abs: '$currentBalance' },
              { $cond: [{ $gt: ['$currentBalance', 0] }, '$currentBalance', 0] },
            ],
          },
        },
        creditorCount: {
          $sum: { $cond: [{ $ne: ['$currentBalance', 0] }, 1, 0] },
        },
        totalSupplierAdvances: {
          $sum: { $ifNull: ['$advanceDeposit', 0] },
        },
      },
    },
  ]);

  const profile = await Profile.findById(pId).select('paymentChannels');
  let cash = profile?.paymentChannels?.cashDrawer ?? 0;
  let bank = profile?.paymentChannels?.bankAccount ?? 0;
  let wallet = profile?.paymentChannels?.digitalWallet ?? 0;

  // Auto-sanitize legacy dummy values (45k/47k, 125k, 32k) if account has no real transactions
  if ((cash === 45000 || cash === 47000) && bank === 125000 && wallet === 32000) {
    const entryCount = await LedgerEntry.countDocuments({ profileId: pId });
    if (entryCount === 0) {
      cash = 0;
      bank = 0;
      wallet = 0;
      if (profile) {
        profile.paymentChannels = { cashDrawer: 0, bankAccount: 0, digitalWallet: 0 };
        await profile.save();
      }
    }
  }

  const totalReceivable = customerStats[0]?.totalReceivable ?? 0;
  const debtorCount = customerStats[0]?.debtorCount ?? 0;
  const totalAdvances = customerStats[0]?.totalAdvances ?? 0;

  const totalPayable = supplierStats[0]?.totalPayable ?? 0;
  const creditorCount = supplierStats[0]?.creditorCount ?? 0;

  // Total Net Position Formula (Kul Maleyat)
  const liquidReserves = cash + bank + wallet;
  const totalNetPosition = liquidReserves + totalReceivable - totalPayable;

  return {
    totalNetPosition,
    channels: {
      physicalCash: cash,
      bankAccount: bank,
      digitalWallet: wallet,
    },
    maineLeneHain: {
      totalAmount: totalReceivable,
      customerCount: debtorCount,
    },
    maineDeneHain: {
      totalAmount: totalPayable,
      supplierCount: creditorCount,
    },
    totalAdvances,
  };
};
