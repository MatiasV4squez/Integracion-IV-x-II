import { FILES } from '@/shared/app-config';

export type EstadoPostulacion = 'PENDIENTE' | 'PENDIENTE_ROL' | 'APROBADA' | 'RECHAZADA';

/** Postulación a tutor tal como la responde materias-tutores (IDs BIGINT como texto). */
export type Postulacion = {
  idPostulacion: string;
  idUsuario: string;
  idMateria: string;
  idAdministradorRevision: string | null;
  certificadoNombre: string;
  certificadoTipo: string;
  notaAcreditada: number | null;
  estado: EstadoPostulacion;
  fechaPostulacion: string;
  fechaRevision: string | null;
  motivoRechazo: string | null;
};

export const DESCRIPCION_ESTADO_POSTULACION: Record<EstadoPostulacion, { etiqueta: string; detalle: string }> = {
  PENDIENTE: { etiqueta: 'En revisión', detalle: 'La administración está revisando tu certificado.' },
  PENDIENTE_ROL: {
    etiqueta: 'Aprobada, habilitando tutor',
    detalle: 'Tu postulación fue aprobada y estamos habilitando tu perfil de tutor.',
  },
  APROBADA: {
    etiqueta: 'Aprobada',
    detalle: 'Ya puedes dictar tutorías de esta materia. Si no ves el modo Tutor, cierra sesión y vuelve a ingresar.',
  },
  RECHAZADA: { etiqueta: 'Rechazada', detalle: 'Puedes volver a postular a esta materia con un nuevo certificado.' },
};

/** Estados que materias-tutores considera activos: no se puede volver a postular a esa materia. */
export const ESTADOS_POSTULACION_ACTIVA: readonly EstadoPostulacion[] = ['PENDIENTE', 'PENDIENTE_ROL', 'APROBADA'];

/** Nota acreditada para aprobar: entre 5,0 y 7,0 con un decimal (regla de materias-tutores). */
export const NOTA_APROBACION = { MIN: 5, MAX: 7 } as const;

/** Archivo elegido con expo-document-picker. En la web trae además el `File` del navegador. */
export type Certificado = { uri: string; name: string; size?: number; mimeType?: string; file?: Blob };

/** Mismas reglas que materias-tutores (el servicio vuelve a validar el contenido del archivo). */
export function validarCertificado(certificado: Certificado | null): string | null {
  if (!certificado) return 'Adjunta tu certificado en PDF o PNG.';
  if (certificado.size !== undefined && certificado.size < 1) return 'El certificado está vacío.';
  if (certificado.size !== undefined && certificado.size > FILES.MAX_BYTES) return 'El certificado debe pesar como máximo 5 MB.';
  if (certificado.name.length > 255) return 'El nombre del archivo debe tener como máximo 255 caracteres.';
  const extension = certificado.name.toLowerCase().split('.').pop() ?? '';
  const tipo = extension === 'pdf' ? 'application/pdf' : extension === 'png' ? 'image/png' : null;
  if (!tipo || (certificado.mimeType && certificado.mimeType !== tipo)) return 'El certificado debe ser un archivo PDF o PNG.';
  return null;
}

export function esNotaValida(nota: number): boolean {
  return Number.isFinite(nota) && nota >= NOTA_APROBACION.MIN && nota <= NOTA_APROBACION.MAX && Math.abs(nota * 10 - Math.round(nota * 10)) < 1e-9;
}
