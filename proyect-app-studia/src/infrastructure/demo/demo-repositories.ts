/**
 * Adaptadores demo de los puertos de datos: responden con los datos de ejemplo de `./data` y una
 * latencia simulada. La raíz de composición los usa cuando no hay EXPO_PUBLIC_API_URL.
 */
import type {
  CatalogoRepository,
  DatosPublicos,
  PerfilRepository,
  PostulacionesRepository,
  TutoresRepository,
  UsuariosRepository,
} from '@/application/ports/repositories';
import { ESTADOS_POSTULACION_ACTIVA, type Postulacion } from '@/domain/postulaciones/postulacion';
import { AppError } from '@/shared/errors';
import { paginate } from '@/shared/pagination';

import { ME, ME_AS_TUTOR, ME_PROFILE } from './data/sessions';
import { SUBJECTS } from './data/subjects';
import { getTutorById, tutorsForSubject } from './data/tutors';
import { mockResponse } from './latency';

export function createDemoCatalogoRepository(): CatalogoRepository {
  // En la demo el código de la materia hace de identificador.
  return { listar: (signal) => mockResponse(() => SUBJECTS.map((s) => ({ ...s, id: s.code })), signal) };
}

export function createDemoTutoresRepository(): TutoresRepository {
  return {
    buscarPorMateria: (params, signal) => mockResponse(() => paginate(tutorsForSubject(params.subjectCode), params.page, params.pageSize), signal),
    obtener: (id, signal) =>
      mockResponse(() => {
        const tutor = getTutorById(id);
        if (!tutor) throw new AppError('No encontramos a este tutor.', 404, 'NOT_FOUND');
        return tutor;
      }, signal),
  };
}

export function createDemoPerfilRepository(): PerfilRepository {
  return {
    obtener: (_user, signal) =>
      mockResponse(() => ({ ...ME, ...ME_PROFILE, reputation: ME_AS_TUTOR.reputation, ratingsCount: ME_AS_TUTOR.ratingsCount }), signal),
  };
}

export function createDemoUsuariosRepository(): UsuariosRepository {
  return { datosPublicos: async () => new Map<string, DatosPublicos>() };
}

/** Postulaciones en memoria; `getUserId` entrega el usuario de la sesión (lo conecta la raíz de composición). */
export function createDemoPostulacionesRepository(deps: { getUserId: () => string }): PostulacionesRepository {
  let lista: Postulacion[] = [];
  let seq = 1;
  const revisar = (id: string, cambios: Partial<Postulacion>) => {
    const actual = lista.find((p) => p.idPostulacion === id);
    if (!actual) throw new Error('La postulación no existe.');
    if (actual.estado !== 'PENDIENTE' && actual.estado !== 'PENDIENTE_ROL') throw new Error('La postulación no está pendiente.');
    Object.assign(actual, cambios, { fechaRevision: new Date().toISOString() });
    return { ...actual };
  };

  return {
    mias: (signal) => mockResponse(() => lista.filter((p) => p.idUsuario === deps.getUserId()), signal),
    postular: (idMateria, certificado) =>
      mockResponse(() => {
        if (lista.some((p) => p.idMateria === idMateria && ESTADOS_POSTULACION_ACTIVA.includes(p.estado))) {
          throw new Error('Ya existe una postulación activa para esta materia.');
        }
        const nueva: Postulacion = {
          idPostulacion: String(seq++),
          idUsuario: deps.getUserId(),
          idMateria,
          idAdministradorRevision: null,
          certificadoNombre: certificado.name,
          certificadoTipo: certificado.name.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf',
          notaAcreditada: null,
          estado: 'PENDIENTE',
          fechaPostulacion: new Date().toISOString(),
          fechaRevision: null,
          motivoRechazo: null,
        };
        lista = [nueva, ...lista];
        return nueva;
      }),
    pendientes: (signal) => mockResponse(() => lista.filter((p) => p.estado === 'PENDIENTE' || p.estado === 'PENDIENTE_ROL'), signal),
    aprobar: (id, notaAcreditada) => mockResponse(() => revisar(id, { estado: 'APROBADA', notaAcreditada, idAdministradorRevision: deps.getUserId() })),
    rechazar: (id, motivoRechazo) => mockResponse(() => revisar(id, { estado: 'RECHAZADA', motivoRechazo, idAdministradorRevision: deps.getUserId() })),
    reintentarRol: (id) => mockResponse(() => revisar(id, { estado: 'APROBADA' })),
    descargarCertificado: async () => {
      throw new Error('En la demo el certificado no se sube a ningún servidor.');
    },
  };
}
