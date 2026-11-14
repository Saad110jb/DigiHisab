export interface IEdgeJwtPayload {
  adminId: string;
  nodeLabel: string;
  sessionId: string;
  sessionVersion: number;
  role: string;
  iat: number;
  exp: number;
}

export function parseJwtPayloadEdge(token: string): IEdgeJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp && parsed.exp < now) {
      return null; // Expired
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

export async function verifyJwtSignatureEdge(
  token: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode base64url signature
    const sigBase64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (sigBase64.length % 4)) % 4;
    const padded = sigBase64 + '='.repeat(padLen);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return await crypto.subtle.verify('HMAC', key, bytes, data);
  } catch (e) {
    return false;
  }
}
