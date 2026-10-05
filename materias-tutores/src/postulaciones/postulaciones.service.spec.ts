import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service.js';
import { PostulacionesService } from './postulaciones.service.js';

const postulacion = {
  idPostulacion: 1n,
  idUsuario: 10n,
  idMateria: 2n,
  idAdministradorRevision: null,
  certificadoRef: 'archivo.pdf',
  certificadoNombre: 'notas.pdf',
  certificadoTipo: 'application/pdf',
  notaAcreditada: null,
  estado: 'PENDIENTE',
  fechaPostulacion: new Date(),
  fechaRevision: null,
  motivoRechazo: null,
};

describe('PostulacionesService', () => {
  const prisma = {
    postulacionTutor: {
      updateMany: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
    },
    tutorMateria: { upsert: vi.fn(), update: vi.fn() },
    perfilTutor: { upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  const config = { get: vi.fn() };
  let servicio: PostulacionesService;

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (operacion: (tx: unknown) => Promise<unknown>) => operacion(prisma),
    );
    servicio = new PostulacionesService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rechaza notas menores a 5.0 antes de escribir', async () => {
    await expect(servicio.aprobar(1n, 99n, 4.9)).rejects.toMatchObject({
      status: 409,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza una segunda revisión y no crea habilitación', async () => {
    prisma.postulacionTutor.updateMany.mockResolvedValue({ count: 0 });
    await expect(servicio.aprobar(1n, 99n, 5)).rejects.toMatchObject({
      status: 409,
    });
    expect(prisma.tutorMateria.upsert).not.toHaveBeenCalled();
  });

  it('deja la aprobación pendiente si no está configurado usuarios-auth', async () => {
    prisma.postulacionTutor.updateMany.mockResolvedValue({ count: 1 });
    prisma.postulacionTutor.findUniqueOrThrow.mockResolvedValue({
      ...postulacion,
      estado: 'PENDIENTE_ROL',
    });
    config.get.mockReturnValue(undefined);
    await expect(servicio.aprobar(1n, 99n, 5)).rejects.toMatchObject({
      status: 503,
    });
    expect(prisma.tutorMateria.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ vigente: false }),
      }),
    );
    expect(prisma.tutorMateria.update).not.toHaveBeenCalled();
  });

  it('registra el rechazo con administrador y motivo', async () => {
    prisma.postulacionTutor.updateMany.mockResolvedValue({ count: 1 });
    prisma.postulacionTutor.findUniqueOrThrow.mockResolvedValue({
      ...postulacion,
      estado: 'RECHAZADA',
      motivoRechazo: 'No acredita nota',
    });
    const respuesta = await servicio.rechazar(1n, 99n, 'No acredita nota');
    expect(respuesta.estado).toBe('RECHAZADA');
    expect(prisma.postulacionTutor.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idPostulacion: 1n, estado: 'PENDIENTE' },
        data: expect.objectContaining({
          idAdministradorRevision: 99n,
          motivoRechazo: 'No acredita nota',
        }),
      }),
    );
  });

  it('habilita al tutor solo tras confirmar la asignación remota del rol', async () => {
    prisma.postulacionTutor.updateMany.mockResolvedValue({ count: 1 });
    prisma.postulacionTutor.findUniqueOrThrow
      .mockResolvedValueOnce({ ...postulacion, estado: 'PENDIENTE_ROL' })
      .mockResolvedValueOnce({ ...postulacion, estado: 'APROBADA' });
    prisma.tutorMateria.upsert.mockResolvedValue({});
    prisma.tutorMateria.update.mockResolvedValue({});
    config.get.mockImplementation((clave: string) =>
      clave === 'USUARIOS_AUTH_ASIGNAR_TUTOR_URL'
        ? 'http://localhost:3001/roles'
        : 'secreto-de-prueba-de-al-menos-treinta-dos-bytes',
    );
    const llamarRol = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', llamarRol);

    const respuesta = await servicio.aprobar(1n, 99n, 5);
    expect(respuesta.estado).toBe('APROBADA');
    expect(llamarRol).toHaveBeenCalledWith(
      'http://localhost:3001/roles',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idUsuario: '10', rol: 'TUTOR' }),
      }),
    );
    expect(prisma.tutorMateria.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ vigente: true }),
      }),
    );
  });
});
