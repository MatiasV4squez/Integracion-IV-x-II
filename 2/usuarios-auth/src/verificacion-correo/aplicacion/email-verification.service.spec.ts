import { EmailVerificationService } from './email-verification.service';
import { EmailVerificationError } from '../dominio/email-verification.error';

describe('EmailVerificationService', () => {
  const correo = 'estudiante@alu.uct.cl';
  const token = 'a'.repeat(64);
  const tokens = {
    generar: () => token,
    hash: (value: string) => `hash:${value}`,
  };
  const sender = { enviar: jest.fn() };
  const repository = {
    buscarUsuario: jest.fn(),
    crear: jest.fn(),
    eliminar: jest.fn(),
    invalidarAnteriores: jest.fn(),
    buscarPorHash: jest.fn(),
    confirmar: jest.fn(),
  };
  const registro = () => ({
    idVerificacion: 10n,
    idUsuario: 1n,
    fechaExpiracion: new Date(Date.now() + 60_000),
    fechaUtilizacion: null,
    correoVerificado: false,
  });
  let service: EmailVerificationService;

  beforeEach(() => {
    jest.resetAllMocks();
    sender.enviar.mockResolvedValue(undefined);
    repository.crear.mockResolvedValue(10n);
    repository.buscarPorHash.mockResolvedValue(registro());
    repository.confirmar.mockResolvedValue(true);
    service = new EmailVerificationService(repository, sender, tokens, {
      url: 'https://app.example.test/verificar-correo',
      ttlMinutos: 30,
    });
  });

  it('persiste el hash y entrega el token original solo en el enlace', async () => {
    const inicio = Date.now();
    await service.solicitarVerificacion(1n, correo);
    const [id, hash, fecha] = repository.crear.mock.calls[0];
    expect(id).toBe(1n);
    expect(hash).toBe(tokens.hash(token));
    expect(fecha.getTime()).toBeGreaterThanOrEqual(inicio + 30 * 60_000);
    expect(sender.enviar).toHaveBeenCalledWith(
      correo,
      `https://app.example.test/verificar-correo?token=${token}`,
    );
    expect(repository.invalidarAnteriores).toHaveBeenCalledWith(
      1n,
      10n,
      expect.any(Date),
    );
  });

  it('elimina el token nuevo si falla el envio y conserva los anteriores', async () => {
    sender.enviar.mockRejectedValueOnce(new Error('SMTP no disponible'));
    await expect(
      service.solicitarVerificacion(1n, correo),
    ).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_FAILED' });
    expect(repository.eliminar).toHaveBeenCalledWith(10n);
    expect(repository.invalidarAnteriores).not.toHaveBeenCalled();
  });

  it('responde igual si la cuenta no existe o ya esta verificada', async () => {
    repository.buscarUsuario.mockResolvedValueOnce(null).mockResolvedValueOnce({
      idUsuario: 1n,
      correoInstitucional: correo,
      correoVerificado: true,
    });
    expect(await service.reenviar(correo)).toEqual(
      await service.reenviar(correo),
    );
    expect(sender.enviar).not.toHaveBeenCalled();
  });

  it('confirma mediante una operacion atomica del repositorio', async () => {
    await expect(service.confirmar(token)).resolves.toEqual({
      mensaje: 'Correo verificado correctamente.',
    });
    expect(repository.buscarPorHash).toHaveBeenCalledWith(tokens.hash(token));
    expect(repository.confirmar).toHaveBeenCalledWith(
      10n,
      1n,
      expect.any(Date),
    );
  });

  it.each([
    ['EMAIL_VERIFICATION_TOKEN_INVALID', null],
    [
      'EMAIL_VERIFICATION_TOKEN_USED',
      () => ({ ...registro(), fechaUtilizacion: new Date() }),
    ],
    [
      'EMAIL_VERIFICATION_TOKEN_EXPIRED',
      () => ({ ...registro(), fechaExpiracion: new Date(Date.now() - 1) }),
    ],
    [
      'EMAIL_ALREADY_VERIFIED',
      () => ({ ...registro(), correoVerificado: true }),
    ],
  ] as const)(
    'rechaza %s antes de modificar la cuenta',
    async (code, value) => {
      repository.buscarPorHash.mockResolvedValueOnce(value ? value() : null);
      await expect(service.confirmar(token)).rejects.toMatchObject({ code });
      expect(repository.confirmar).not.toHaveBeenCalled();
    },
  );

  it('rechaza el token si otra peticion lo consume antes de confirmar', async () => {
    repository.confirmar.mockResolvedValueOnce(false);
    await expect(service.confirmar(token)).rejects.toBeInstanceOf(
      EmailVerificationError,
    );
  });
});
