/**
 * Digi Hisab Multi-Terminal Real-Time Till Pooling Client (Socket.io)
 *
 * Keeps cash counters, tills, and owner dashboards synchronized in real time:
 * - Live Today's Counter Sale volume & counter animations
 * - Instant Short Drawer / Variance Alerts to Owner/Manager
 * - Real-time Udhaar / Ledger balance sync preventing double-credit at checkouts
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocketBaseUrl } from '../config/env';

export interface ISaleCompletedEvent {
  saleId?: string;
  amount: number;
  paymentDestination: string;
  itemsCount?: number;
  cashierName?: string;
  note?: string;
  timestamp: string;
}

export interface IDrawerVarianceEvent {
  subAccountId?: string;
  cashierName: string;
  discrepancyAmount: number;
  systemExpectedCash: number;
  physicalCountedCash: number;
  isDeficit: boolean;
  timestamp: string;
}

export interface IUdhaarUpdatedEvent {
  counterpartyId: string;
  counterpartyName: string;
  newBalance: number;
  lastAmount: number;
  entryType: 'CREDIT' | 'PAYMENT' | 'ADJUSTMENT';
  updatedBy?: string;
  timestamp: string;
}

export interface IBullionRatesUpdatedEvent {
  rates: any;
  timestamp: string;
}

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;
  private listeners: {
    saleCompleted: Set<EventCallback<ISaleCompletedEvent>>;
    drawerVariance: Set<EventCallback<IDrawerVarianceEvent>>;
    udhaarUpdated: Set<EventCallback<IUdhaarUpdatedEvent>>;
    bullionRatesUpdated: Set<EventCallback<IBullionRatesUpdatedEvent>>;
  } = {
    saleCompleted: new Set(),
    drawerVariance: new Set(),
    udhaarUpdated: new Set(),
    bullionRatesUpdated: new Set(),
  };

  /**
   * Derives root WebSocket URL from REST API base URL (stripping /api/v1)
   */
  private getSocketUrl(): string {
    return getSocketBaseUrl();
  }

  /**
   * Connects to the store's WebSocket room using the saved JWT session token
   */
  public async connect(): Promise<Socket | null> {
    if (this.socket?.connected) {
      return this.socket;
    }
    if (this.isConnecting) return null;

    try {
      this.isConnecting = true;
      const token = await AsyncStorage.getItem('@auth_token');
      const socketUrl = this.getSocketUrl();

      console.log(`[SocketService] Connecting to WebSocket gateway at ${socketUrl}...`);

      this.socket = io(socketUrl, {
        auth: {
          token: token || '',
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log(`[SocketService] Connected to Till Pooling Gateway (ID: ${this.socket?.id})`);
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (err) => {
        console.warn(`[SocketService] Connection warning: ${err.message}`);
        this.isConnecting = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`[SocketService] Disconnected from Till Gateway: ${reason}`);
      });

      // --- Internal Dispatchers to Registered Screen Observers ---
      this.socket.on('till:sale_completed', (data: ISaleCompletedEvent) => {
        console.log('[SocketService] Received till:sale_completed:', data);
        this.listeners.saleCompleted.forEach((cb) => {
          try {
            cb(data);
          } catch (e) {
            console.error('Error in saleCompleted listener:', e);
          }
        });
      });

      this.socket.on('till:cash_drawer_variance', (data: IDrawerVarianceEvent) => {
        console.log('[SocketService] Received till:cash_drawer_variance:', data);
        this.listeners.drawerVariance.forEach((cb) => {
          try {
            cb(data);
          } catch (e) {
            console.error('Error in drawerVariance listener:', e);
          }
        });
      });

      this.socket.on('khata:udhaar_updated', (data: IUdhaarUpdatedEvent) => {
        console.log('[SocketService] Received khata:udhaar_updated:', data);
        this.listeners.udhaarUpdated.forEach((cb) => {
          try {
            cb(data);
          } catch (e) {
            console.error('Error in udhaarUpdated listener:', e);
          }
        });
      });

      this.socket.on('bullion:rates_updated', (data: IBullionRatesUpdatedEvent) => {
        console.log('[SocketService] Received bullion:rates_updated:', data);
        this.listeners.bullionRatesUpdated.forEach((cb) => {
          try {
            cb(data);
          } catch (e) {
            console.error('Error in bullionRatesUpdated listener:', e);
          }
        });
      });

      return this.socket;
    } catch (error) {
      console.warn('[SocketService] Init error:', error);
      this.isConnecting = false;
      return null;
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }

  /**
   * Subscribe to real-time sales across all store terminals
   * Returns an unsubscribe cleanup function
   */
  public onSaleCompleted(callback: EventCallback<ISaleCompletedEvent>): () => void {
    this.listeners.saleCompleted.add(callback);
    if (!this.socket?.connected) {
      this.connect();
    }
    return () => {
      this.listeners.saleCompleted.delete(callback);
    };
  }

  /**
   * Subscribe to cash drawer shortage / surplus variance alerts
   */
  public onDrawerVariance(callback: EventCallback<IDrawerVarianceEvent>): () => void {
    this.listeners.drawerVariance.add(callback);
    if (!this.socket?.connected) {
      this.connect();
    }
    return () => {
      this.listeners.drawerVariance.delete(callback);
    };
  }

  /**
   * Subscribe to live customer khata / udhaar balance updates across terminals
   */
  public onUdhaarUpdated(callback: EventCallback<IUdhaarUpdatedEvent>): () => void {
    this.listeners.udhaarUpdated.add(callback);
    if (!this.socket?.connected) {
      this.connect();
    }
    return () => {
      this.listeners.udhaarUpdated.delete(callback);
    };
  }

  /**
   * Subscribe to real-time Karachi Sarafa bullion market updates & Nisab threshold shifts
   */
  public onBullionRatesUpdated(callback: EventCallback<IBullionRatesUpdatedEvent>): () => void {
    this.listeners.bullionRatesUpdated.add(callback);
    if (!this.socket?.connected) {
      this.connect();
    }
    return () => {
      this.listeners.bullionRatesUpdated.delete(callback);
    };
  }
}

export const socketService = new SocketService();
export default socketService;
