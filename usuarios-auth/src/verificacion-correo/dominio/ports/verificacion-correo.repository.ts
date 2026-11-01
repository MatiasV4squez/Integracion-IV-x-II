export const VERIFICACION_CORREO_REPOSITORY = Symbol(
  'VERIFICACION_CORREO_REPOSITORY',
);

export interface UsuarioParaVerificacion {
  idUsuario: bigint;
  correoInstitucional: string;
  correoVerificado: boolean;
}

export interface VerificacionPendiente {
  idVerificacion: bigint;
  idUsuario: bigint;
  fechaExpiracion: Date;
  fechaUtilizacion: Date | null;
  correoVerificado: boolean;
}

export interface VerificacionCorreoRepository {
  buscarUsuario(correo: string): Promise<UsuarioParaVerificacion | null>;
  crear(
    idUsuario: bigint,
    tokenHash: string,
    fechaExpiracion: Date,
  ): Promise<bigint>;
  eliminar(idVerificacion: bigint): Promise<void>;
  invalidarAnteriores(
    idUsuario: bigint,
    excepto: bigint,
    ahora: Date,
  ): Promise<void>;
  buscarPorHash(tokenHash: string): Promise<VerificacionPendiente | null>;
  confirmar(
    idVerificacion: bigint,
    idUsuario: bigint,
    ahora: Date,
  ): Promise<boolean>;
}
