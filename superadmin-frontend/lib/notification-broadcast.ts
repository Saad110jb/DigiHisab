export interface IBroadcastPayload {
  titleEnglish: string;
  titleUrdu: string;
  messageEnglish: string;
  messageUrdu: string;
  targetAudience?: 'ALL' | 'DUKANDAR' | 'HOUSEHOLD';
  priority?: 'CRITICAL' | 'WARNING' | 'SUCCESS' | 'INFO';
  category?: string;
  actionLabel?: string;
  actionRoute?: string;
  durationMs?: number;
}

export async function broadcastAlertToClients(payload: IBroadcastPayload): Promise<boolean> {
  const candidateUrls = [
    'http://localhost:5000/api/v1/notifications/broadcast',
    'http://127.0.0.1:5000/api/v1/notifications/broadcast'
  ];

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      clearTimeout(timeout);

      if (res.ok) {
        return true;
      }
    } catch (err) {
      // Backend might be quiet, continue to next candidate
    }
  }
  return false;
}
