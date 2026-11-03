import type { PostulacionesRepository } from '@/application/ports/repositories';
import type { Postulacion } from '@/domain/postulaciones/postulacion';
import { descargarArchivo } from '@/infrastructure/platform/descargar-archivo';

import { api, SERVICIOS } from './http-client';

const BASE = `${SERVICIOS.materias}/postulaciones`;
const porId = (id: string) => `${BASE}/${encodeURIComponent(id)}`;

/** Adaptador del puerto PostulacionesRepository: postulaciones a tutor en materias-tutores. */
export function createHttpPostulacionesRepository(): PostulacionesRepository {
  return {
    /** GET /postulaciones/mias */
    mias: (signal) => api.get<Postulacion[]>(`${BASE}/mias`, undefined, signal),

    /** POST /postulaciones (multipart: idMateria + certificado). */
    postular(idMateria, certificado) {
      const form = new FormData();
      form.append('idMateria', idMateria);
      const type = certificado.name.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf';
      if (certificado.file) form.append('certificado', certificado.file, certificado.name);
      // En el celular, React Native sube el archivo a partir de su uri.
      else form.append('certificado', { uri: certificado.uri, name: certificado.name, type } as unknown as Blob);
      return api.postForm<Postulacion>(BASE, form);
    },

    /** GET /postulaciones/pendientes — solo administradores. */
    pendientes: (signal) => api.get<Postulacion[]>(`${BASE}/pendientes`, undefined, signal),

    /** PATCH /postulaciones/:id/aprobar — aprueba con la nota acreditada y asigna el rol TUTOR. */
    aprobar: (id, notaAcreditada) => api.patch<Postulacion>(`${porId(id)}/aprobar`, { notaAcreditada }),

    /** PATCH /postulaciones/:id/rechazar */
    rechazar: (id, motivoRechazo) => api.patch<Postulacion>(`${porId(id)}/rechazar`, { motivoRechazo }),

    /** POST /postulaciones/:id/reintentar-rol — cuando quedó aprobada pero sin asignar el rol TUTOR. */
    reintentarRol: (id) => api.post<Postulacion>(`${porId(id)}/reintentar-rol`, undefined),

    /** GET /postulaciones/:id/certificado (con el JWT) y se entrega al usuario. */
    descargarCertificado: (p) => descargarArchivo(`${porId(p.idPostulacion)}/certificado`, p.certificadoNombre, p.certificadoTipo),
  };
}
