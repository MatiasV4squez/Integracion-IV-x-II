import { usuarioIdValido } from '../../auth/dominio/usuario-id';
import type {
  DatosPublicosRepository,
  DatosPublicosUsuario,
} from '../dominio/ports/usuario.repository';

export class ConsultarDatosPublicosUseCase {
  constructor(private readonly usuarios: DatosPublicosRepository) {}

  async ejecutar(
    ids: string[],
  ): Promise<DatosPublicosUsuario[] | 'IDS_INVALIDOS'> {
    if (!ids.length || ids.length > 100 || !ids.every(usuarioIdValido))
      return 'IDS_INVALIDOS';
    const unicos = [...new Set(ids)];
    const datos = await this.usuarios.buscarPorIds(
      unicos.map((id) => BigInt(id)),
    );
    const porId = new Map(datos.map((usuario) => [usuario.id, usuario]));
    return unicos.flatMap((id) => {
      const usuario = porId.get(id);
      return usuario ? [usuario] : [];
    });
  }
}
