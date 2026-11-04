export const ASIGNAR_ROL_TUTOR = Symbol('ASIGNAR_ROL_TUTOR');

export interface AsignarRolTutorPort {
  asignar(idUsuario: bigint): Promise<void>;
}
