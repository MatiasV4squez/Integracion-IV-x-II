import { Usuario } from '../../usuarios/dominio/usuario';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService con puertos sustituidos', () => {
  const usuario = new Usuario(
    1n,
    'Estudiante',
    'estudiante@alu.uct.cl',
    'hash',
    'ACTIVO',
    true,
    ['ESTUDIANTE'],
  );
  const usuarios = { buscarPorCorreo: jest.fn() };
  const passwords = { verificar: jest.fn() };
  const tokens = { emitir: jest.fn(), verificar: jest.fn() };
  const repositorioSesiones = {
    crearSiCuentaActiva: jest.fn(),
    registrarActividad: jest.fn(),
    revocar: jest.fn(),
  };
  const sesiones = new SessionService(repositorioSesiones, 1800);
  const login = new AuthService(usuarios, passwords, tokens, sesiones);

  beforeEach(() => {
    jest.resetAllMocks();
    usuarios.buscarPorCorreo.mockResolvedValue(usuario);
    passwords.verificar.mockResolvedValue(true);
    tokens.emitir.mockResolvedValue({
      valor: 'token-simulado',
      jti: 'sesion-1',
      fechaExpiracion: new Date(),
      expiraEnSegundos: 1800,
    });
    repositorioSesiones.crearSiCuentaActiva.mockResolvedValue(true);
  });

  it('autentica con adaptadores alternativos sin depender de Prisma, Argon2 ni JWT', async () => {
    const resultado = await login.login(
      ' ESTUDIANTE@ALU.UCT.CL ',
      'contraseña',
    );
    expect(usuarios.buscarPorCorreo).toHaveBeenCalledWith(
      'estudiante@alu.uct.cl',
    );
    expect(resultado.access_token).toBe('token-simulado');
    expect(resultado.usuario).not.toHaveProperty('password_hash');
  });

  it('rechaza credenciales antes de emitir o persistir un token', async () => {
    passwords.verificar.mockResolvedValue(false);
    await expect(
      login.login(usuario.correo_institucional, 'incorrecta'),
    ).rejects.toMatchObject({ status: 401 });
    expect(tokens.emitir).not.toHaveBeenCalled();
    expect(repositorioSesiones.crearSiCuentaActiva).not.toHaveBeenCalled();
  });

  it('no entrega el token si falla la persistencia de su sesión', async () => {
    const error = new Error('Persistencia no disponible');
    repositorioSesiones.crearSiCuentaActiva.mockRejectedValue(error);
    await expect(
      login.login(usuario.correo_institucional, 'contraseña'),
    ).rejects.toBe(error);
  });

  it('no crea una sesión cuando la cuenta fue suspendida durante el login', async () => {
    repositorioSesiones.crearSiCuentaActiva.mockResolvedValue(false);
    await expect(
      login.login(usuario.correo_institucional, 'contraseña'),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('conserva el login de cuentas activas con correo aún sin verificar', async () => {
    usuarios.buscarPorCorreo.mockResolvedValueOnce(
      new Usuario(
        usuario.id_usuario,
        usuario.nombre,
        usuario.correo_institucional,
        usuario.password_hash,
        usuario.estado_cuenta,
        false,
        usuario.roles,
      ),
    );
    expect(
      (await login.login(usuario.correo_institucional, 'contraseña'))
        .access_token,
    ).toBe('token-simulado');
  });
});
