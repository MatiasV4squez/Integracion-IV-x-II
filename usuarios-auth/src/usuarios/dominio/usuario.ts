export class Usuario {
  constructor(
    public readonly id_usuario: bigint | null,
    
    public nombre: string,
    public correo_institucional: string,
    public password_hash: string,
    public estado_cuenta: string,
    public correo_verificado: boolean,
    public roles: string[], 
    public carrera?: string,
    public semestre_actual?: number,
    public biografia?: string,
    public fecha_registro?: Date,
  ) {}

  suspenderCuenta(): void {
    this.estado_cuenta = 'SUSPENDIDO';
  }

  activarCuenta(): void {
    this.estado_cuenta = 'ACTIVO';
  }

  verificarCorreo(): void {
    this.correo_verificado = true;
  }
}