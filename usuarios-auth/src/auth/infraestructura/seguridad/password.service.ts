import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import type { PasswordVerifier } from '../../dominio/auth.ports';
import type { PasswordHasher } from '../../../usuarios/dominio/ports/password.hasher';

@Injectable()
export class PasswordService implements PasswordVerifier, PasswordHasher {
  generarHash(password: string): Promise<string> {
    return hash(password);
  }

  async verificar(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
