/**
 * Token de demostración con la forma de un JWT (header.payload.firma). NO es seguro: solo se usa
 * sin backend. Con backend, usuarios-auth emite y firma el JWT (NFR01) y la app solo lo guarda y lee
 * su vigencia.
 */

export type TokenPayload = { sub: string; iat: number; exp: number };

const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const decode = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4)));
};

export function createMockToken(userId: string, nowMs: number, ttlMs: number): string {
  const payload: TokenPayload = { sub: userId, iat: nowMs, exp: nowMs + ttlMs };
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.mock-signature`;
}


/** Devuelve el contenido del token (con `iat`/`exp` en ms) o null si está mal formado. */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const [header, payload] = token.split('.');
    const data = decode(payload);
    if (typeof data.sub !== 'string' || typeof data.exp !== 'number') return null;
    // Un JWT firmado (el de usuarios-auth) guarda `iat`/`exp` en segundos; el de demostración (alg "none"), en ms.
    const toMs = decode(header).alg === 'none' ? (value: number) => value : (value: number) => value * 1000;
    return { sub: data.sub, iat: typeof data.iat === 'number' ? toMs(data.iat) : 0, exp: toMs(data.exp) };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, nowMs: number): boolean {
  const payload = decodeToken(token);
  return payload === null || payload.exp <= nowMs;
}
