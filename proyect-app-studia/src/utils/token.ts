/**
 * Token de demostración con la forma de un JWT (header.payload.firma). NO es seguro: solo existe
 * mientras no haya backend. El servidor real emite y firma el JWT (NFR01) y la app solo lo guarda.
 */

export type TokenPayload = { sub: string; iat: number; exp: number };

const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const decode = (value: string) => JSON.parse(atob(value.replace(/-/g, '+').replace(/_/g, '/')));

export function createMockToken(userId: string, nowMs: number, ttlMs: number): string {
  const payload: TokenPayload = { sub: userId, iat: nowMs, exp: nowMs + ttlMs };
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.mock-signature`;
}

/** Devuelve el contenido del token o null si está mal formado. */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    const data = decode(payload);
    return typeof data.sub === 'string' && typeof data.iat === 'number' && typeof data.exp === 'number' ? data : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, nowMs: number): boolean {
  const payload = decodeToken(token);
  return payload === null || payload.exp <= nowMs;
}
