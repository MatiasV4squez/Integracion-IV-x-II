import { createHmac } from 'node:crypto';
import { CryptoVerificationTokenProvider } from './crypto-verification-token.provider';

describe('Tokens de verificacion', () => {
  it('genera tokens aleatorios de 256 bits y calcula un HMAC SHA256 con el secreto', () => {
    const secret = 'secreto-de-prueba-de-al-menos-32-bytes';
    const tokens = new CryptoVerificationTokenProvider(secret);
    const token = tokens.generar();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(tokens.generar()).not.toBe(token);
    expect(tokens.hash(token)).toBe(
      createHmac('sha256', secret).update(token).digest('hex'),
    );
    expect(tokens.hash(token)).not.toBe(token);
    expect(
      new CryptoVerificationTokenProvider('otro-secreto').hash(token),
    ).not.toBe(tokens.hash(token));
  });
});
