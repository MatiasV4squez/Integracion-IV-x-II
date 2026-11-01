import { AsignarTutorUseCase } from './asignar-tutor.use-case';

describe('AsignarTutorUseCase con persistencia sustituida', () => {
  const roles = { asignarTutor: jest.fn() };
  const asignar = new AsignarTutorUseCase(roles);

  beforeEach(() => {
    jest.resetAllMocks();
    roles.asignarTutor.mockResolvedValue('ASIGNADO');
  });

  it('asigna TUTOR y conserva la precisión de un identificador BIGINT', async () => {
    await expect(asignar.ejecutar('9007199254740993')).resolves.toBe(
      'ASIGNADO',
    );
    expect(roles.asignarTutor).toHaveBeenCalledWith(9007199254740993n);
  });

  it.each(['', '0', '-1', '1.5', '01', 'abc', '9223372036854775808'])(
    'rechaza el ID inválido %j antes de acceder a persistencia',
    async (id) => {
      await expect(asignar.ejecutar(id)).resolves.toBe('ID_INVALIDO');
      expect(roles.asignarTutor).not.toHaveBeenCalled();
    },
  );

  it.each(['USUARIO_NO_ENCONTRADO', 'ROL_NO_CONFIGURADO'] as const)(
    'comunica el resultado %s sin depender de excepciones HTTP',
    async (resultado) => {
      roles.asignarTutor.mockResolvedValue(resultado);
      await expect(asignar.ejecutar('12')).resolves.toBe(resultado);
    },
  );

  it('propaga fallos de persistencia sin informar una asignación exitosa', async () => {
    const error = new Error('Persistencia no disponible');
    roles.asignarTutor.mockRejectedValue(error);
    await expect(asignar.ejecutar('12')).rejects.toBe(error);
  });
});
