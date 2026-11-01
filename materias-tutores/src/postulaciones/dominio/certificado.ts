import { PostulacionesError } from './postulacion.js';

export interface ArchivoCertificado {
  nombre: string;
  tipoDeclarado: string;
  tamano: number;
  contenido: Uint8Array;
}

export interface CertificadoValidado {
  nombre: string;
  tipo: 'application/pdf' | 'image/png';
  contenido: Uint8Array;
}

export function validarCertificado(archivo: ArchivoCertificado | undefined): CertificadoValidado {
  if (!archivo || !(archivo.contenido instanceof Uint8Array) || archivo.tamano < 1 || archivo.tamano > 5_000_000) {
    throw new PostulacionesError('ENTRADA_INVALIDA', 'Adjunta un certificado de hasta 5 MB');
  }
  const nombre = archivo.nombre.toLowerCase();
  const empiezaCon = (firma: readonly number[]) => firma.every((byte, indice) => archivo.contenido[indice] === byte);
  const pdf = nombre.endsWith('.pdf') && archivo.tipoDeclarado === 'application/pdf' && empiezaCon([37, 80, 68, 70, 45]);
  const png = nombre.endsWith('.png') && archivo.tipoDeclarado === 'image/png' && empiezaCon([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!pdf && !png) throw new PostulacionesError('ENTRADA_INVALIDA', 'El certificado debe ser PDF o PNG válido');
  if (archivo.nombre.length > 255) throw new PostulacionesError('ENTRADA_INVALIDA', 'El nombre del certificado es demasiado largo');
  return { nombre: archivo.nombre, contenido: archivo.contenido, tipo: pdf ? 'application/pdf' : 'image/png' };
}
