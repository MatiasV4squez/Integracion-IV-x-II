import type { CertificadoValidado } from '../../dominio/certificado.js';

export const CERTIFICADOS = Symbol('CERTIFICADOS');

export interface CertificadosPort {
  guardar(certificado: CertificadoValidado): Promise<string>;
  leer(referencia: string): Promise<Uint8Array>;
}
