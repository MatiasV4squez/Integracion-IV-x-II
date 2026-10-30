import { normalizarIdEntidad } from '../../compartido/identificadores.js';
import {
  esResultadoCierreValido,
  ORIGEN_AGENDAMIENTO,
  TIPO_CONFLICTO_DETECTADO,
  TIPO_CONFLICTO_RESUELTO,
  VERSION_AVISO_SOPORTADA,
  type ContenidoAvisoSesion,
  type ContenidoConflictoSesion,
  type ContenidoResolucionSesion,
  type DeclaracionCierreAviso,
  type TipoAvisoSesion,
} from '../dominio/aviso-sesion.js';
import type { DatosNuevoAvisoSesion } from '../dominio/ports/aviso-sesion.repository.js';
import { avisoInvalido } from './errores.js';

interface EnvelopeAviso {
  origen: string;
  version: number;
  idAviso: string;
  fechaAviso: Date;
  idSesion: string;
}

function comoObjeto(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw avisoInvalido(`${field} debe ser un objeto JSON.`);
  }
  return value as Record<string, unknown>;
}

function requerirTexto(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw avisoInvalido(`${field} debe ser un texto no vacío.`);
  }
  return value;
}

function requerirTextoONull(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw avisoInvalido(`${field} debe ser un texto o null.`);
  }
  return value;
}

function requerirId(value: unknown, field: string): string {
  const id = normalizarIdEntidad(value);
  if (id === undefined) {
    throw avisoInvalido(`${field} debe ser un identificador válido.`);
  }
  return id;
}

function requerirIdONull(value: unknown, field: string): string | null {
  if (value === null) return null;
  return requerirId(value, field);
}

function requerirFecha(value: unknown, field: string): Date {
  if (typeof value !== 'string') {
    throw avisoInvalido(`${field} debe ser una fecha ISO 8601.`);
  }
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) {
    throw avisoInvalido(`${field} debe ser una fecha ISO 8601.`);
  }
  return fecha;
}

function requerirFechaTexto(value: unknown, field: string): string {
  return requerirFecha(value, field).toISOString();
}

function requerirResultadoCierre(value: unknown, field: string) {
  if (typeof value !== 'string' || !esResultadoCierreValido(value)) {
    throw avisoInvalido(
      `${field} debe ser uno de: COMPLETADA, NO_REALIZADA, INASISTENCIA.`,
    );
  }
  return value;
}

function validarEnvelope(
  value: unknown,
  tipoEsperado: TipoAvisoSesion,
): EnvelopeAviso {
  const aviso = comoObjeto(value, 'aviso');

  if (aviso.origen !== ORIGEN_AGENDAMIENTO) {
    throw avisoInvalido(`origen debe ser "${ORIGEN_AGENDAMIENTO}".`);
  }
  if (aviso.version !== VERSION_AVISO_SOPORTADA) {
    throw avisoInvalido(
      `version debe ser ${VERSION_AVISO_SOPORTADA}.`,
    );
  }
  if (aviso.tipo !== tipoEsperado) {
    throw avisoInvalido(`tipo debe ser "${tipoEsperado}".`);
  }

  return {
    origen: ORIGEN_AGENDAMIENTO,
    version: VERSION_AVISO_SOPORTADA,
    idAviso: requerirId(aviso.id_aviso, 'id_aviso'),
    fechaAviso: requerirFecha(aviso.fecha_aviso, 'fecha_aviso'),
    idSesion: requerirId(aviso.id_sesion, 'id_sesion'),
  };
}

function validarDeclaraciones(value: unknown): DeclaracionCierreAviso[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw avisoInvalido('declaraciones debe ser una lista no vacía.');
  }

  return value.map((item, indice) => {
    const declaracion = comoObjeto(item, `declaraciones[${indice}]`);
    return {
      id_declaracion: requerirId(
        declaracion.id_declaracion,
        `declaraciones[${indice}].id_declaracion`,
      ),
      id_usuario: requerirId(
        declaracion.id_usuario,
        `declaraciones[${indice}].id_usuario`,
      ),
      resultado_declarado: requerirResultadoCierre(
        declaracion.resultado_declarado,
        `declaraciones[${indice}].resultado_declarado`,
      ),
      id_usuario_inasistente: requerirIdONull(
        declaracion.id_usuario_inasistente === undefined
          ? null
          : declaracion.id_usuario_inasistente,
        `declaraciones[${indice}].id_usuario_inasistente`,
      ),
      fecha_declaracion: requerirFechaTexto(
        declaracion.fecha_declaracion,
        `declaraciones[${indice}].fecha_declaracion`,
      ),
    };
  });
}

function datosRegistro(
  envelope: EnvelopeAviso,
  tipo: TipoAvisoSesion,
  datos: ContenidoAvisoSesion,
): DatosNuevoAvisoSesion {
  return {
    origen: envelope.origen,
    version: envelope.version,
    idAviso: envelope.idAviso,
    fechaAviso: envelope.fechaAviso,
    tipo,
    idSesion: BigInt(envelope.idSesion),
    datos,
  };
}

export function validarAvisoConflicto(value: unknown): DatosNuevoAvisoSesion {
  const aviso = comoObjeto(value, 'aviso');
  const envelope = validarEnvelope(aviso, TIPO_CONFLICTO_DETECTADO);

  const contenido: ContenidoConflictoSesion = {
    tipo: TIPO_CONFLICTO_DETECTADO,
    id_sesion: envelope.idSesion,
    id_tutor: requerirId(aviso.id_tutor, 'id_tutor'),
    id_tutee: requerirId(aviso.id_tutee, 'id_tutee'),
    id_materia: requerirId(aviso.id_materia, 'id_materia'),
    fecha_conflicto: requerirFechaTexto(aviso.fecha_conflicto, 'fecha_conflicto'),
    declaraciones: validarDeclaraciones(aviso.declaraciones),
  };

  return datosRegistro(envelope, TIPO_CONFLICTO_DETECTADO, contenido);
}

export function validarAvisoResolucion(value: unknown): DatosNuevoAvisoSesion {
  const aviso = comoObjeto(value, 'aviso');
  const envelope = validarEnvelope(aviso, TIPO_CONFLICTO_RESUELTO);

  const contenido: ContenidoResolucionSesion = {
    tipo: TIPO_CONFLICTO_RESUELTO,
    id_sesion: envelope.idSesion,
    id_resolucion: requerirId(aviso.id_resolucion, 'id_resolucion'),
    id_administrador: requerirId(aviso.id_administrador, 'id_administrador'),
    estado_final: requerirResultadoCierre(aviso.estado_final, 'estado_final'),
    motivo_resolucion: requerirTexto(
      aviso.motivo_resolucion,
      'motivo_resolucion',
    ),
    observaciones: requerirTextoONull(aviso.observaciones, 'observaciones'),
    fecha_resolucion: requerirFechaTexto(
      aviso.fecha_resolucion,
      'fecha_resolucion',
    ),
  };

  return datosRegistro(envelope, TIPO_CONFLICTO_RESUELTO, contenido);
}
