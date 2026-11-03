import type { PostulacionesRepository, UsuariosRepository } from '@/application/ports/repositories';
import { esNotaValida, validarCertificado, type Certificado, type Postulacion } from '@/domain/postulaciones/postulacion';

/** Casos de uso de postulación a tutor y su revisión por un administrador. Validan con las reglas del dominio. */
export function createPostulacionesUseCases(deps: { postulaciones: PostulacionesRepository; usuarios: UsuariosRepository }) {
  return {
    /** Postulaciones propias, de la más nueva a la más antigua. */
    async mias(signal?: AbortSignal): Promise<Postulacion[]> {
      const lista = await deps.postulaciones.mias(signal);
      return [...lista].sort((a, b) => b.fechaPostulacion.localeCompare(a.fechaPostulacion));
    },
    postular(idMateria: string, certificado: Certificado): Promise<Postulacion> {
      const problema = validarCertificado(certificado);
      if (problema) return Promise.reject(new Error(problema));
      return deps.postulaciones.postular(idMateria, certificado);
    },
    /** Pendientes con el nombre de quien postula. */
    async pendientes(signal?: AbortSignal): Promise<{ postulaciones: Postulacion[]; nombres: Map<string, string> }> {
      const postulaciones = await deps.postulaciones.pendientes(signal);
      const personas = await deps.usuarios.datosPublicos(postulaciones.map((p) => p.idUsuario), signal);
      return { postulaciones, nombres: new Map([...personas].map(([id, d]) => [id, d.nombre])) };
    },
    aprobar(id: string, nota: number): Promise<Postulacion> {
      if (!esNotaValida(nota)) return Promise.reject(new Error('La nota acreditada debe estar entre 5,0 y 7,0, con un máximo de un decimal.'));
      return deps.postulaciones.aprobar(id, nota);
    },
    rechazar(id: string, motivo: string): Promise<Postulacion> {
      const texto = motivo.trim();
      if (texto.length < 3 || texto.length > 500) return Promise.reject(new Error('El motivo de rechazo debe contener entre 3 y 500 caracteres.'));
      return deps.postulaciones.rechazar(id, texto);
    },
    reintentarRol: (id: string) => deps.postulaciones.reintentarRol(id),
    descargarCertificado: (p: Postulacion) => deps.postulaciones.descargarCertificado(p),
  };
}

export type PostulacionesUseCases = ReturnType<typeof createPostulacionesUseCases>;
