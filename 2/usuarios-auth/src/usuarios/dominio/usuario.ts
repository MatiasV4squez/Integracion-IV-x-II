export class Usuario {
  constructor(
    public readonly id_usuario: bigint | null,
    public nombre: string,
    public correo_institucional: string,
    public password_hash: string,
    public estado_cuenta: string,
    public correo_verificado: boolean,
    public roles: string[],
    public carrera: string | null = null,
    public semestre_actual: number | null = null,
    public biografia: string | null = null,
    public fecha_registro?: Date,
  ) {}
}
