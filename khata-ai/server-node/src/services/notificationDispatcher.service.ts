import { Response } from 'express';
import { IPushNotification } from '../types/notification';

// Connection pool: Map of profileId -> Array of active express Response streams
const activeSseClients = new Map<string, Response[]>();

/**
 * Register an active SSE response stream for a given profile ID
 */
export function registerSseClient(profileId: string, res: Response): void {
  if (!activeSseClients.has(profileId)) {
    activeSseClients.set(profileId, []);
  }

  const clients = activeSseClients.get(profileId)!;
  clients.push(res);

  // Send initial connection acknowledgment event
  const connEvent = {
    status: 'connected',
    profileId,
    timestamp: new Date().toISOString(),
  };
  res.write(`event: connected\ndata: ${JSON.stringify(connEvent)}\n\n`);

  res.on('close', () => {
    removeSseClient(profileId, res);
  });
}

/**
 * Remove an SSE client response stream upon disconnect or error
 */
export function removeSseClient(profileId: string, res: Response): void {
  const clients = activeSseClients.get(profileId);
  if (clients) {
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    if (clients.length === 0) {
      activeSseClients.delete(profileId);
    }
  }
}

/**
 * Dispatch a real-time push notification payload to all active SSE connections for a profile
 */
export function dispatchPushNotification(profileId: string, notification: IPushNotification): void {
  const clients = activeSseClients.get(profileId);
  if (clients && clients.length > 0) {
    const sseData = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
    clients.forEach((client) => {
      try {
        client.write(sseData);
      } catch (err) {
        // Stream writing failed, clean up client
        removeSseClient(profileId, client);
      }
    });
  }
}

/**
 * Dispatch notification to ALL currently active SSE clients across the entire platform
 */
export function broadcastToAllActiveSseClients(notification: IPushNotification): number {
  let count = 0;
  const sseData = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  activeSseClients.forEach((clients, profileId) => {
    clients.forEach((client) => {
      try {
        client.write(sseData);
        count++;
      } catch (err) {
        removeSseClient(profileId, client);
      }
    });
  });
  return count;
}

/**
 * Dispatch real-time financial metrics sync to all active SSE clients for a profile
 */
export function dispatchMetricsSync(profileId: string, metrics: any): void {
  const clients = activeSseClients.get(profileId);
  if (clients && clients.length > 0) {
    const sseEventData = `event: FINANCIAL_METRICS_SYNC\ndata: ${JSON.stringify(metrics)}\n\n`;
    const notificationData = `event: notification\ndata: ${JSON.stringify({
      id: `metrics-sync-${Date.now()}`,
      category: 'FINANCIAL_METRICS_SYNC',
      priority: 'INFO',
      titleUrdu: 'مالیاتی سنک',
      titleEnglish: 'Financial Metrics Sync',
      messageUrdu: 'مالیاتی اعداد و شمار ریئل ٹائم سنک ہو گئے ہیں۔',
      messageEnglish: 'Store financial metrics updated in real-time.',
      timestamp: new Date().toISOString(),
      actionRoute: 'Dashboard',
      metadata: metrics,
    })}\n\n`;

    clients.forEach((client) => {
      try {
        client.write(sseEventData);
        client.write(notificationData);
      } catch (err) {
        removeSseClient(profileId, client);
      }
    });
  }
}

/**
 * Heartbeat ticker every 25 seconds to keep SSE connections open through proxies/firewalls
 */
setInterval(() => {
  activeSseClients.forEach((clients, profileId) => {
    clients.forEach((client) => {
      try {
        client.write(': heartbeat\n\n');
      } catch (err) {
        removeSseClient(profileId, client);
      }
    });
  });
}, 25000);
