import { Injectable } from '@nestjs/common';
import { verify } from 'argon2';

@Injectable()
export class PasswordService {
  async verificar(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }
}
