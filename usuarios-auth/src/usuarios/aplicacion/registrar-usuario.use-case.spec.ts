import { RegistrarUsuarioUseCase } from './registrar-usuario.use-case';
import { CorreoDuplicadoError } from '../dominio/correo-duplicado.error';
import { Usuario } from '../dominio/usuario';

describe('Registro con puertos sustituidos', () => {
  const usuarios = { buscarPorCorreo: jest.fn(), guardar: jest.fn() };
  const contrasenas = { generarHash: jest.fn() };
  const registrar = new RegistrarUsuarioUseCase(usuarios, contrasenas);
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
    'ACTIVO',
    false,
    ['ESTUDIANTE'],
  );

  beforeEach(() => {
    jest.resetAllMocks();
    usuarios.buscarPorCorreo.mockResolvedValue(null);
    contrasenas.generarHash.mockResolvedValue('hash-seguro');
    usuarios.guardar.mockResolvedValue(guardado);
  });

  it('registra ESTUDIANTE mediante el hash del adaptador y devuelve lo persistido', async () => {
    await expect(registrar.ejecutar(datos)).resolves.toBe(guardado);
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
        estado_cuenta: 'ACTIVO',
        correo_verificado: false,
      }),
    );
  });

  it('rechaza un correo existente antes de generar el hash o escribir', async () => {
    usuarios.buscarPorCorreo.mockResolvedValueOnce(guardado);
    await expect(registrar.ejecutar(datos)).rejects.toBeInstanceOf(
      CorreoDuplicadoError,
    );
    expect(contrasenas.generarHash).not.toHaveBeenCalled();
    expect(usuarios.guardar).not.toHaveBeenCalled();
  });

  it('no guarda la contrasena si falla la generacion del hash', async () => {
    const error = new Error('Hash no disponible');
    contrasenas.generarHash.mockRejectedValueOnce(error);
    await expect(registrar.ejecutar(datos)).rejects.toBe(error);
    expect(usuarios.guardar).not.toHaveBeenCalled();
  });

  it.each([new CorreoDuplicadoError(), new Error('BD no disponible')])(
    'propaga el fallo de persistencia sin ocultarlo: %s',
    async (error) => {
      usuarios.guardar.mockRejectedValueOnce(error);
      await expect(registrar.ejecutar(datos)).rejects.toBe(error);
    },
  );
});
