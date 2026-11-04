import { validarCertificado, type ArchivoCertificado } from '../dominio/certificado.js';
import { PostulacionesError } from '../dominio/postulacion.js';
import type { CertificadosPort } from './puertos/certificados.port.js';
import type { PostulacionesRepository } from './puertos/postulaciones.repository.js';

export class PostularTutorUseCase {
  constructor(private readonly postulaciones: PostulacionesRepository, private readonly certificados: CertificadosPort) {}

  async ejecutar(idUsuario: bigint, idMateria: bigint, archivo: ArchivoCertificado | undefined) {
    const certificado = validarCertificado(archivo);
    if (!await this.postulaciones.existeMateria(idMateria)) throw new PostulacionesError('NO_ENCONTRADO', 'Materia no encontrada');
    if (await this.postulaciones.existeActiva(idUsuario, idMateria)) {
      throw new PostulacionesError('CONFLICTO', 'Ya existe una postulación activa para esta materia');
    }
    const referencia = await this.certificados.guardar(certificado);
    return this.postulaciones.crear({
      idUsuario, idMateria, certificadoRef: referencia, certificadoNombre: certificado.nombre, certificadoTipo: certificado.tipo,
    });
  }
}
