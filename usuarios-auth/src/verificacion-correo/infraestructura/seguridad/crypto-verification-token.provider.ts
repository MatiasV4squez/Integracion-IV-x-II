import { createHmac, randomBytes } from 'node:crypto';
import type { VerificationTokenProvider } from '../../dominio/ports/verification-token.provider';

export class CryptoVerificationTokenProvider implements VerificationTokenProvider {
  constructor(private readonly secret: string) {}

  generar(): string {
    return randomBytes(32).toString('hex');
  }

  hash(token: string): string {
    return createHmac('sha256', this.secret).update(token).digest('hex');
  }
}
