import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AsignarRolTutorPort } from '../aplicacion/puertos/asignar-rol-tutor.port.js';
import { PostulacionesError } from '../dominio/postulacion.js';

@Injectable()
export class HttpAsignarRolTutorAdapter implements AsignarRolTutorPort {
  constructor(private readonly config: ConfigService) {}

  async asignar(idUsuario: bigint): Promise<void> {
    const url = this.config.get<string>('USUARIOS_AUTH_ASIGNAR_TUTOR_URL');
    const clave = this.config.get<string>('INTEGRACION_SECRET');
    if (!url || !clave) throw new PostulacionesError('NO_DISPONIBLE', 'La asignación del rol TUTOR no está configurada');
    try {
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Integracion-Secret': clave },
        body: JSON.stringify({ idUsuario: idUsuario.toString(), rol: 'TUTOR' }),
        signal: AbortSignal.timeout(5000),
      });
      if (!respuesta.ok) throw new Error(`Respuesta ${respuesta.status}`);
    } catch {
      throw new PostulacionesError('NO_DISPONIBLE', 'No se pudo asignar el rol TUTOR; la postulación queda pendiente de reintento');
    }
  }
}
