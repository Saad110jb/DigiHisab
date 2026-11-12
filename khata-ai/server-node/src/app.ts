import express, { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/error.middleware';
import { geoFenceSentinel } from './middleware/geoFence.middleware';
import apiV1Router from './routes';
import { socketService } from './services/socket.service';

import path from 'path';

const app: Express = express();

// Security & Logging Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// Static Uploads Directory Serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Master API V1 Router (Strictly Fresh Data - No Stale 304 Caching for Financial Routes)
app.use(
  '/api/v1',
  geoFenceSentinel,
  (req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  },
  apiV1Router
);

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'Digi Hisab Core Ledger Service', timestamp: new Date() });
});

// Centralized Error Handler
app.use(errorHandler);

// Create HTTP Server & Attach Real-Time Multi-Terminal WebSocket Engine
const httpServer = http.createServer(app);
socketService.init(httpServer);

// Connect to MongoDB and start HTTP server
const startServer = async () => {
  await connectDB();
  httpServer.listen(env.PORT, () => {
    console.log(`[Express] Core Ledger Service listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;

