import { RegistrarUsuarioUseCase } from './registrar-usuario.use-case';
import { CorreoDuplicadoError } from '../dominio/correo-duplicado.error';
import { Usuario } from '../dominio/usuario';
import { EmailVerificationError } from '../../verificacion-correo/dominio/email-verification.error';

describe('Registro con puertos sustituidos', () => {
  const usuarios = { buscarPorCorreo: jest.fn(), guardar: jest.fn() };
  const contrasenas = { generarHash: jest.fn() };
  const verificacion = { solicitarVerificacion: jest.fn() };
  const registrar = new RegistrarUsuarioUseCase(
    usuarios,
    contrasenas,
    verificacion,
  );
  const datos = {
    nombre: 'Ana',
    correoInstitucional: 'ana@alu.uct.cl',
    password: 'contrasena-de-prueba',
  };
  const guardado = new Usuario(
    1n,
    datos.nombre,
    datos.correoInstitucional,
    'hash-seguro',
    'INACTIVO',
    false,
    ['ESTUDIANTE'],
  );

  beforeEach(() => {
    jest.resetAllMocks();
    usuarios.buscarPorCorreo.mockResolvedValue(null);
    contrasenas.generarHash.mockResolvedValue('hash-seguro');
    usuarios.guardar.mockResolvedValue(guardado);
    verificacion.solicitarVerificacion.mockResolvedValue(undefined);
  });

  it('guarda ESTUDIANTE inactivo y solicita el primer enlace despues de persistir', async () => {
    await expect(registrar.ejecutar(datos)).resolves.toEqual({
      usuario: guardado,
      verificacion: 'ENLACE_GENERADO',
    });
    expect(usuarios.buscarPorCorreo).toHaveBeenCalledWith(
      datos.correoInstitucional,
    );
    expect(contrasenas.generarHash).toHaveBeenCalledWith(datos.password);
    expect(usuarios.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: datos.nombre,
        correo_institucional: datos.correoInstitucional,
        password_hash: 'hash-seguro',
        roles: ['ESTUDIANTE'],
        estado_cuenta: 'INACTIVO',
        correo_verificado: false,
      }),
    );
    expect(verificacion.solicitarVerificacion).toHaveBeenCalledWith(
      1n,
      datos.correoInstitucional,
    );
    expect(usuarios.guardar.mock.invocationCallOrder[0]).toBeLessThan(
      verificacion.solicitarVerificacion.mock.invocationCallOrder[0],
    );
  });

  it('rechaza un correo existente antes de generar el hash o escribir', async () => {
    usuarios.buscarPorCorreo.mockResolvedValueOnce(guardado);
    await expect(registrar.ejecutar(datos)).rejects.toBeInstanceOf(
      CorreoDuplicadoError,
    );
    expect(contrasenas.generarHash).not.toHaveBeenCalled();
    expect(usuarios.guardar).not.toHaveBeenCalled();
    expect(verificacion.solicitarVerificacion).not.toHaveBeenCalled();
  });

  it('no guarda la contrasena si falla la generacion del hash', async () => {
    const error = new Error('Hash no disponible');
    contrasenas.generarHash.mockRejectedValueOnce(error);
    await expect(registrar.ejecutar(datos)).rejects.toBe(error);
    expect(usuarios.guardar).not.toHaveBeenCalled();
    expect(verificacion.solicitarVerificacion).not.toHaveBeenCalled();
  });

  it.each([new CorreoDuplicadoError(), new Error('BD no disponible')])(
    'propaga el fallo de persistencia sin ocultarlo: %s',
    async (error) => {
      usuarios.guardar.mockRejectedValueOnce(error);
      await expect(registrar.ejecutar(datos)).rejects.toBe(error);
      expect(verificacion.solicitarVerificacion).not.toHaveBeenCalled();
    },
  );

  it('normaliza el correo antes de comprobar duplicados, guardar y entregar el enlace', async () => {
    await registrar.ejecutar({
      ...datos,
      nombre: ' Ana ',
      correoInstitucional: ' ANA@ALU.UCT.CL ',
    });
    expect(usuarios.buscarPorCorreo).toHaveBeenCalledWith('ana@alu.uct.cl');
    expect(usuarios.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Ana',
        correo_institucional: 'ana@alu.uct.cl',
      }),
    );
    expect(verificacion.solicitarVerificacion).toHaveBeenCalledWith(
      1n,
      'ana@alu.uct.cl',
    );
  });

  it('conserva la cuenta inactiva y permite recuperar la entrega con el reenvio', async () => {
    verificacion.solicitarVerificacion.mockRejectedValueOnce(
      new EmailVerificationError('EMAIL_DELIVERY_FAILED', 'Fallo SMTP'),
    );
    await expect(registrar.ejecutar(datos)).resolves.toEqual({
      usuario: guardado,
      verificacion: 'PENDIENTE_ENVIO',
    });
    expect(guardado.estado_cuenta).toBe('INACTIVO');
    expect(guardado.correo_verificado).toBe(false);
    expect(usuarios.guardar).toHaveBeenCalledTimes(1);
    expect(verificacion.solicitarVerificacion).toHaveBeenCalledTimes(1);
  });

  it('propaga fallos inesperados de la verificacion sin simular una entrega', async () => {
    const error = new Error('BD de verificaciones no disponible');
    verificacion.solicitarVerificacion.mockRejectedValueOnce(error);
    await expect(registrar.ejecutar(datos)).rejects.toBe(error);
  });

  it('no solicita un enlace si el repositorio no devolvio un identificador', async () => {
    usuarios.guardar.mockResolvedValueOnce(
      new Usuario(
        null,
        guardado.nombre,
        guardado.correo_institucional,
        guardado.password_hash,
        guardado.estado_cuenta,
        guardado.correo_verificado,
        guardado.roles,
      ),
    );
    await expect(registrar.ejecutar(datos)).rejects.toThrow(
      'El usuario guardado no tiene identificador.',
    );
    expect(verificacion.solicitarVerificacion).not.toHaveBeenCalled();
  });
});
