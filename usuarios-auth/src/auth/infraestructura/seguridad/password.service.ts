import { Injectable } from '@nestjs/common';
import { verify } from 'argon2';
import type { PasswordVerifier } from '../../dominio/auth.ports';

@Injectable()
export class PasswordService implements PasswordVerifier {
  async verificar(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
