import { PostulacionesError } from '../dominio/postulacion.js';
import type { CertificadosPort } from './puertos/certificados.port.js';
import type { PostulacionesRepository } from './puertos/postulaciones.repository.js';

export class ObtenerCertificadoUseCase {
  constructor(private readonly postulaciones: PostulacionesRepository, private readonly certificados: CertificadosPort) {}

  async ejecutar(idPostulacion: bigint, idUsuario: bigint | null) {
    const postulacion = await this.postulaciones.obtener(idPostulacion);
    if (!postulacion || (idUsuario !== null && postulacion.idUsuario !== idUsuario)) {
      throw new PostulacionesError('NO_ENCONTRADO', 'Postulación no encontrada');
    }
    const contenido = await this.certificados.leer(postulacion.certificadoRef);
    return { contenido, tipo: postulacion.certificadoTipo, nombre: postulacion.certificadoNombre };
  }
}
