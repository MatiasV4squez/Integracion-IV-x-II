import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMockToken, decodeToken, isTokenExpired } from './token.ts';
import { emailDomain, isInstitutionalEmail, isValidEmailFormat, normalizeEmail } from './email.ts';

describe('correo institucional (RF01, BR11, NFR06)', () => {
  it('normaliza espacios y mayúsculas', () => {
    assert.equal(normalizeEmail('  Ana.Perez@ALU.UCT.CL '), 'ana.perez@alu.uct.cl');
  });

  it('acepta los dominios institucionales', () => {
    assert.equal(isInstitutionalEmail('ana@alu.uct.cl'), true);
    assert.equal(isInstitutionalEmail('Ana@UCT.cl'), true);
  });

  it('rechaza dominios externos y variantes engañosas', () => {
    for (const email of ['ana@gmail.com', 'ana@alu.uct.cl.evil.com', 'ana@fakeuct.cl', 'ana@uct.cl.', 'ana', '@alu.uct.cl', '']) {
      assert.equal(isInstitutionalEmail(email), false, email);
    }
  });

  it('emailDomain y formato', () => {
    assert.equal(emailDomain('ana@alu.uct.cl'), 'alu.uct.cl');
    assert.equal(emailDomain('no-es-correo'), null);
    assert.equal(isValidEmailFormat('a b@c.cl'), false);
  });
});

describe('token de demostración', () => {
  it('se crea, se decodifica y vence', () => {
    const token = createMockToken('u-me', 1000, 5000);
    assert.equal(token.split('.').length, 3);
    assert.deepEqual(decodeToken(token), { sub: 'u-me', iat: 1000, exp: 6000 });
    assert.equal(isTokenExpired(token, 5999), false);
    assert.equal(isTokenExpired(token, 6000), true);
  });

  it('un token mal formado se considera vencido', () => {
    assert.equal(decodeToken('basura'), null);
    assert.equal(isTokenExpired('basura', 0), true);
  });
});
