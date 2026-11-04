import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { CertificadosPort } from '../aplicacion/puertos/certificados.port.js';
import type { CertificadoValidado } from '../dominio/certificado.js';
import { PostulacionesError } from '../dominio/postulacion.js';

@Injectable()
export class CertificadosDiscoAdapter implements CertificadosPort {
  constructor(private readonly config: ConfigService) {}

  private directorio(): string {
    return resolve(this.config.get<string>('CERTIFICADOS_DIR') ?? './certificados');
  }

  async guardar(certificado: CertificadoValidado): Promise<string> {
    const extension = certificado.tipo === 'application/pdf' ? 'pdf' : 'png';
    const referencia = `${createHash('sha256').update(certificado.contenido).digest('hex')}.${extension}`;
    await mkdir(this.directorio(), { recursive: true, mode: 0o700 });
    await writeFile(join(this.directorio(), referencia), certificado.contenido, { flag: 'wx', mode: 0o600 }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'EEXIST') throw error;
    });
    return referencia;
  }

  async leer(referencia: string): Promise<Uint8Array> {
    return readFile(join(this.directorio(), referencia)).catch(() => {
      throw new PostulacionesError('NO_ENCONTRADO', 'Certificado no disponible');
    });
  }
}
