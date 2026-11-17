import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { apiClient } from '../api/client';
import { IJevLiquidityHorizon, JevRunwayState, jevRunwayApi } from '../api/jevRunway.api';

export interface IFinancialState {
  totalNetPosition: number;
  runwayDays: number;
  runwayState: JevRunwayState;
  liquidityHorizon?: IJevLiquidityHorizon;
  maineLeneHain: { totalAmount: number; customerCount: number };
  maineDeneHain: { totalAmount: number; supplierCount: number };
  channels: {
    physicalCash: number;
    digitalWallet: number;
    bankAccount: number;
  };
}

interface FinancialContextType {
  metrics: IFinancialState;
  isMasked: boolean;
  toggleMask: () => void;
  syncWasooli: (amount: number, destination: 'CASH' | 'WALLET' | 'BANK') => void;
  syncQuickSale: (amount: number, destination: 'CASH' | 'WALLET' | 'BANK') => void;
  syncExpense: (amount: number, mode: 'CASH' | 'WALLET' | 'BANK') => void;
  syncSupplierBill: (netAmountAdded: number) => void;
  syncSupplierPaid: (amount: number, mode: 'CASH' | 'WALLET' | 'BANK') => void;
  syncCreditSale: (amount: number) => void;
  syncChannels: (channels: { physicalCash: number; digitalWallet: number; bankAccount: number }) => void;
  refreshMetricsFromServer: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
}

const FinancialMetricsContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialMetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMasked, setIsMasked] = useState(false);
  const [metrics, setMetrics] = useState<IFinancialState>({
    totalNetPosition: 0,
    runwayDays: 16,
    runwayState: 'SAFE',
    maineLeneHain: { totalAmount: 0, customerCount: 0 },
    maineDeneHain: { totalAmount: 0, supplierCount: 0 },
    channels: {
      physicalCash: 0,
      digitalWallet: 0,
      bankAccount: 0,
    },
  });

  const toggleMask = () => setIsMasked((prev) => !prev);

  // Recalculates Net Position based on double-entry formula: Liquid Reserves + Receivables - Payables
  const recalculateNetPosition = (state: IFinancialState): number => {
    const liquidReserves = (state.channels.physicalCash || 0) + (state.channels.digitalWallet || 0) + (state.channels.bankAccount || 0);
    const lene = state.maineLeneHain?.totalAmount || 0;
    const dene = state.maineDeneHain?.totalAmount || 0;
    return liquidReserves + lene - dene;
  };

  // 1. Optimistic Wasooli Update (Debt recovered into specific channel)
  const syncWasooli = useCallback((amount: number, destination: 'CASH' | 'WALLET' | 'BANK') => {
    setMetrics((prev) => {
      const channelKey = destination === 'CASH' ? 'physicalCash' : destination === 'WALLET' ? 'digitalWallet' : 'bankAccount';
      const updatedState = {
        ...prev,
        maineLeneHain: {
          ...prev.maineLeneHain,
          totalAmount: Math.max(0, prev.maineLeneHain.totalAmount - amount),
        },
        channels: {
          ...prev.channels,
          [channelKey]: (prev.channels[channelKey] || 0) + amount,
        },
      };
      updatedState.totalNetPosition = recalculateNetPosition(updatedState);
      return updatedState;
    });
  }, []);

  // 2. Optimistic Quick Cash / Counter Sale Update
  const syncQuickSale = useCallback((amount: number, destination: 'CASH' | 'WALLET' | 'BANK') => {
    setMetrics((prev) => {
      const channelKey = destination === 'CASH' ? 'physicalCash' : destination === 'WALLET' ? 'digitalWallet' : 'bankAccount';
      const updatedState = {
        ...prev,
        channels: {
          ...prev.channels,
          [channelKey]: (prev.channels[channelKey] || 0) + amount,
        },
      };
      updatedState.totalNetPosition = recalculateNetPosition(updatedState);
      return updatedState;
    });
  }, []);

  // 3. Optimistic Credit Sale Update (+ Naya Udhaar)
  const syncCreditSale = useCallback((amount: number) => {
    setMetrics((prev) => {
      const updatedState = {
        ...prev,
        maineLeneHain: {
          ...prev.maineLeneHain,
          totalAmount: prev.maineLeneHain.totalAmount + amount,
        },
      };
      updatedState.totalNetPosition = recalculateNetPosition(updatedState);
      return updatedState;
    });
  }, []);

  // 4. Optimistic Expense Outflow Update
  const syncExpense = useCallback((amount: number, mode: 'CASH' | 'WALLET' | 'BANK') => {
    setMetrics((prev) => {
      const channelKey = mode === 'CASH' ? 'physicalCash' : mode === 'WALLET' ? 'digitalWallet' : 'bankAccount';
      const updatedState = {
        ...prev,
        channels: {
          ...prev.channels,
          [channelKey]: Math.max(0, (prev.channels[channelKey] || 0) - amount),
        },
      };
      updatedState.totalNetPosition = recalculateNetPosition(updatedState);
      return updatedState;
    });
  }, []);

  // 5. Optimistic Supplier Bill Inward Update
  const syncSupplierBill = useCallback((netAmountAdded: number) => {
    setMetrics((prev) => {
      const updatedState = {
        ...prev,
        maineDeneHain: {
          ...prev.maineDeneHain,
          totalAmount: prev.maineDeneHain.totalAmount + netAmountAdded,
        },
      };
      updatedState.totalNetPosition = recalculateNetPosition(updatedState);
      return updatedState;
    });
  }, []);

  // 6. Optimistic Supplier Payment Disbursement Update
  const syncSupplierPaid = useCallback((amount: number, mode: 'CASH' | 'WALLET' | 'BANK') => {
    setMetrics((prev) => {
      const channelKey = mode === 'CASH' ? 'physicalCash' : mode === 'WALLET' ? 'digitalWallet' : 'bankAccount';
      const updatedState = {
        ...prev,
        maineDeneHain: {
          ...prev.maineDeneHain,
          totalAmount: Math.max(0, prev.maineDeneHain.totalAmount - amount),
        },
        channels: {
          ...prev.channels,
          [channelKey]: Math.max(0, (prev.channels[channelKey] || 0) - amount),
        },
      };
      updatedState.totalNetPosition = recalculateNetPosition(updatedState);
      return updatedState;
    });
  }, []);

  // 7. Optimistic Unified Channel Balance Update
  const syncChannels = useCallback((channels: { physicalCash: number; digitalWallet: number; bankAccount: number }) => {
    setMetrics((prev) => {
      const updatedState = {
        ...prev,
        channels: {
          physicalCash: channels.physicalCash,
          digitalWallet: channels.digitalWallet,
          bankAccount: channels.bankAccount,
        },
      };
      updatedState.totalNetPosition = recalculateNetPosition(updatedState);
      return updatedState;
    });
  }, []);

  // Fetch full state from backend API
  const refreshMetricsFromServer = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token || token === 'null' || token === 'undefined') {
        return;
      }

      const [summaryRes, radarRes] = await Promise.allSettled([
        apiClient.get('/ledger/summary'),
        jevRunwayApi.getLiquidityRadar(),
      ]);

      let horizonData: IJevLiquidityHorizon | undefined;
      if (radarRes.status === 'fulfilled' && radarRes.value.success && radarRes.value.data) {
        horizonData = radarRes.value.data;
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.data?.success && summaryRes.value.data.data) {
        const d = summaryRes.value.data.data;
        const lene = d.kulLena !== undefined ? d.kulLena : (d.receivables !== undefined ? d.receivables : 0);
        const dene = d.kulDena !== undefined ? d.kulDena : (d.payables !== undefined ? d.payables : 0);
        const customerCount = d.activeCustomerCount !== undefined ? d.activeCustomerCount : 0;
        const supplierCount = d.activeSupplierCount !== undefined ? d.activeSupplierCount : 0;
        const cash = d.channels?.physicalCash !== undefined ? d.channels.physicalCash : (d.gallaCash !== undefined ? d.gallaCash : (horizonData?.breakdown.current_galla_cash ?? 0));
        const wallet = d.channels?.digitalWallet !== undefined ? d.channels.digitalWallet : (d.digitalWallet !== undefined ? d.digitalWallet : (horizonData?.breakdown.digital_wallet ?? 0));
        const bank = d.channels?.bankAccount !== undefined ? d.channels.bankAccount : (d.bankAccount !== undefined ? d.bankAccount : (horizonData?.breakdown.bank_account ?? 0));
        const runway = horizonData ? horizonData.safe_runway_days : d.cashRunwayDays || 16;
        const state: JevRunwayState = horizonData
          ? horizonData.runway_state
          : (d.runwayState as JevRunwayState) || (runway >= 14 ? 'SAFE' : runway >= 7 ? 'WARNING' : 'CRITICAL');

        const liquidReserves = cash + wallet + bank;
        const totalNetPosition = d.totalNetPosition !== undefined ? d.totalNetPosition : (liquidReserves + lene - dene);

        setMetrics({
          totalNetPosition,
          runwayDays: runway,
          runwayState: state,
          liquidityHorizon: horizonData,
          maineLeneHain: { totalAmount: lene, customerCount },
          maineDeneHain: { totalAmount: dene, supplierCount },
          channels: {
            physicalCash: cash,
            digitalWallet: wallet,
            bankAccount: bank,
          },
        });
      }
    } catch (err) {
      // Retain current metrics on error
    }
  }, []);

  useEffect(() => {
    refreshMetricsFromServer();

    const sub = DeviceEventEmitter.addListener('FINANCIAL_METRICS_SYNC', (data) => {
      if (data && data.maineLeneHain && data.maineDeneHain) {
        setMetrics((prev) => ({
          ...prev,
          totalNetPosition: data.totalNetPosition ?? prev.totalNetPosition,
          maineLeneHain: data.maineLeneHain,
          maineDeneHain: data.maineDeneHain,
          channels: data.channels ?? prev.channels,
        }));
      }
      refreshMetricsFromServer();
    });

    return () => {
      sub.remove();
    };
  }, [refreshMetricsFromServer]);

  return (
    <FinancialMetricsContext.Provider
      value={{
        metrics,
        isMasked,
        toggleMask,
        syncWasooli,
        syncQuickSale,
        syncExpense,
        syncSupplierBill,
        syncSupplierPaid,
        syncCreditSale,
        syncChannels,
        refreshMetricsFromServer,
        refreshMetrics: refreshMetricsFromServer,
      }}
    >
      {children}
    </FinancialMetricsContext.Provider>
  );
};

export const useFinancialMetrics = (): FinancialContextType => {
  const context = useContext(FinancialMetricsContext);
  if (!context) throw new Error('useFinancialMetrics must be used within FinancialMetricsProvider');
  return context;
};
