import type {
  ResultadoAsignarTutor,
  RolesRepository,
} from '../dominio/auth.ports';
import { usuarioIdValido } from '../dominio/usuario-id';

export class AsignarTutorUseCase {
  constructor(private readonly roles: RolesRepository) {}

  async ejecutar(
    idUsuario: string,
  ): Promise<ResultadoAsignarTutor | 'ID_INVALIDO'> {
    if (!usuarioIdValido(idUsuario)) return 'ID_INVALIDO';
    return this.roles.asignarTutor(BigInt(idUsuario));
  }
}
