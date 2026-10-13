import type { RepositorioSesiones } from './repositorio-sesiones.puerto';
import type { RepositorioDeclaraciones } from './repositorio-declaraciones.puerto';
import type { RepositorioCalificaciones } from './repositorio-calificaciones.puerto';
import type { RepositorioResoluciones } from './repositorio-resoluciones.puerto';
import type { RepositorioEntregas } from './repositorio-entregas.puerto';
import type { RepositorioLiberaciones } from './repositorio-liberaciones.puerto';
import type { RepositorioAvisosModeracion } from './repositorio-avisos-moderacion.puerto';

export interface ContextoTransaccion {
  sesiones: RepositorioSesiones;
  declaraciones: RepositorioDeclaraciones;
  calificaciones: RepositorioCalificaciones;
  resoluciones: RepositorioResoluciones;
  entregas: RepositorioEntregas;
  liberaciones: RepositorioLiberaciones;
  avisosModeracion: RepositorioAvisosModeracion;
}

export interface UnidadDeTrabajo {
  ejecutar<T>(
    operacion: (contexto: ContextoTransaccion) => Promise<T>,
  ): Promise<T>;
}
