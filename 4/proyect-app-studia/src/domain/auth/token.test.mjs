import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { describe, it } from 'node:test';

import { createMockToken, decodeToken, isTokenExpired } from './token.ts';
import { santiagoDay, santiagoToIso } from '../../shared/santiago-time.ts';

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
/** JWT con la forma del que emite usuarios-auth (HS256, iat/exp en segundos, sin padding). */
const realJwt = (payload) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma`;

describe('decodeToken', () => {
  it('lee el token de demostración en milisegundos', () => {
    assert.deepEqual(decodeToken(createMockToken('u-me', 1000, 5000)), { sub: 'u-me', iat: 1000, exp: 6000 });
  });

  it('convierte a milisegundos el iat/exp en segundos de un JWT de usuarios-auth', () => {
    const token = realJwt({ sub: '42', jti: 'abc', roles: ['ESTUDIANTE'], iat: 1_800_000_000, exp: 1_800_001_800 });
    assert.deepEqual(decodeToken(token), { sub: '42', iat: 1_800_000_000_000, exp: 1_800_001_800_000 });
  });

  it('considera vigente un JWT real hasta su exp y vencido después', () => {
    const token = realJwt({ sub: '42', iat: 1_800_000_000, exp: 1_800_001_800 });
    assert.equal(isTokenExpired(token, 1_800_001_000_000), false);
    assert.equal(isTokenExpired(token, 1_800_001_800_000), true);
  });

  it('rechaza un token sin sub o mal formado', () => {
    assert.equal(decodeToken(realJwt({ exp: 1 })), null);
    assert.equal(decodeToken('no-es-un-token'), null);
  });
});

describe('santiago-time', () => {
  it('agrega el offset de Chile según la fecha (horario de verano e invierno)', () => {
    assert.equal(santiagoToIso('2026-11-02', '10:00'), '2026-11-02T10:00:00-03:00');
    assert.equal(santiagoToIso('2026-06-15', '10:00'), '2026-06-15T10:00:00-04:00');
  });

  it('el ISO generado representa la misma hora local en Santiago', () => {
    const iso = santiagoToIso('2026-06-15', '18:30');
    const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
    assert.equal(local, '18:30');
  });

  it('calcula la fecha de Santiago de hoy + n días', () => {
    // 2026-11-02 02:00 UTC es todavía 1 de noviembre en Santiago (UTC-3).
    const from = new Date('2026-11-02T02:00:00Z');
    assert.equal(santiagoDay(0, from), '2026-11-01');
    assert.equal(santiagoDay(1, from), '2026-11-02');
  });
});
