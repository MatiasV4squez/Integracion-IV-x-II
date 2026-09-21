import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface IdentidadAutenticada {
  id_usuario: string;
  correo_institucional: string;
  roles: string[];
}

interface TokenEmitido {
  valor: string;
  expiraEnSegundos: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async emitir(usuario: IdentidadAutenticada): Promise<TokenEmitido> {
    const expiraEnSegundos = this.config.getOrThrow<number>(
      'JWT_ACCESS_TTL_SECONDS',
    );
    const valor = await this.jwt.signAsync({
      sub: usuario.id_usuario,
      correo_institucional: usuario.correo_institucional,
      roles: usuario.roles,
    });

    return { valor, expiraEnSegundos };
  }
}
