/**
 * Digi Hisab Multi-Terminal Real-Time Till Pooling & Synchronization Service (Socket.io)
 *
 * Synchronizes sales, drawer balances, and credit khata updates across multiple cash
 * counters and owner dashboards in real time without manual screen refreshes.
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthPayload } from '../middleware/auth.middleware';

export interface ISocketUser extends AuthPayload {
  socketId: string;
}

export interface ISaleCompletedBroadcast {
  saleId?: string;
  amount: number;
  paymentDestination: string;
  itemsCount?: number;
  cashierName?: string;
  note?: string;
  timestamp: string;
}

export interface IDrawerVarianceBroadcast {
  subAccountId?: string;
  cashierName: string;
  discrepancyAmount: number;
  systemExpectedCash: number;
  physicalCountedCash: number;
  isDeficit: boolean;
  timestamp: string;
}

export interface IUdhaarUpdatedBroadcast {
  counterpartyId: string;
  counterpartyName: string;
  newBalance: number;
  lastAmount: number;
  entryType: 'CREDIT' | 'PAYMENT' | 'ADJUSTMENT';
  updatedBy?: string;
  timestamp: string;
}

class SocketService {
  private io: Server | null = null;

  /**
   * Initializes Socket.io attached to the HTTP server with JWT Auth Middleware
   */
  public init(httpServer: HttpServer): Server {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 30000,
      pingInterval: 10000,
    });

    // Authentication Middleware for all Socket Handshakes
    this.io.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

        if (!token) {
          // Allow dev anonymous connections with fallback room if needed, or reject
          if (env.NODE_ENV === 'development') {
            socket.data.user = {
              profileId: 'dev_store',
              role: 'OWNER',
            };
            return next();
          }
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        socket.data.user = decoded;
        next();
      } catch (err: any) {
        return next(new Error(`Socket authentication failed: ${err.message}`));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = socket.data.user as AuthPayload | undefined;
      const storeId = user?.profileId ? String(user.profileId) : 'default_store';
      const storeRoom = `store_${storeId}`;

      // Join the store tenant pool room
      socket.join(storeRoom);

      console.log(
        `[Socket.io] Terminal connected: ${socket.id} | Store Room: ${storeRoom} | Role: ${user?.role || 'USER'}`
      );

      // Terminal heartbeat / ping
      socket.on('till:heartbeat', (data) => {
        socket.emit('till:heartbeat_ack', {
          serverTime: new Date().toISOString(),
          terminalId: data?.terminalId,
        });
      });

      // Join dedicated cashier till room if requested
      socket.on('till:register_terminal', (terminalInfo) => {
        if (terminalInfo?.terminalId) {
          socket.join(`terminal_${terminalInfo.terminalId}`);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`[Socket.io] Terminal disconnected: ${socket.id} (Reason: ${reason})`);
      });
    });

    console.log('[Socket.io] Multi-Terminal WebSocket Engine attached and initialized.');
    return this.io;
  }

  public getIO(): Server | null {
    return this.io;
  }

  /**
   * Broadcasts real-time sale completion to all terminals in the store tenant
   */
  public broadcastSaleCompleted(storeId: string, data: ISaleCompletedBroadcast): void {
    if (!this.io) return;
    const room = `store_${storeId}`;
    this.io.to(room).emit('till:sale_completed', {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    });
    console.log(`[Socket.io] Broadcasted till:sale_completed to room ${room} (Rs. ${data.amount})`);
  }

  /**
   * Broadcasts cash drawer variance / shortage alert instantly to owner & manager screens
   */
  public broadcastDrawerVariance(storeId: string, data: IDrawerVarianceBroadcast): void {
    if (!this.io) return;
    const room = `store_${storeId}`;
    this.io.to(room).emit('till:cash_drawer_variance', {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    });
    console.log(
      `[Socket.io] Broadcasted till:cash_drawer_variance to room ${room} (Variance: Rs. ${data.discrepancyAmount})`
    );
  }

  /**
   * Broadcasts customer udhaar balance update across all cash counters
   * to immediately prevent double customer credit / exceeded credit limits
   */
  public broadcastUdhaarUpdated(storeId: string, data: IUdhaarUpdatedBroadcast): void {
    if (!this.io) return;
    const room = `store_${storeId}`;
    this.io.to(room).emit('khata:udhaar_updated', {
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    });
    console.log(
      `[Socket.io] Broadcasted khata:udhaar_updated to room ${room} (Customer: ${data.counterpartyName}, New Balance: Rs. ${data.newBalance})`
    );
  }
}

export const socketService = new SocketService();
export default socketService;
