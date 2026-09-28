import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { DisponibilidadService } from './disponibilidad.service.js';

describe('DisponibilidadService', () => {
  let service: DisponibilidadService;

  const prismaMock = {
    bloqueHorario: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisponibilidadService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<DisponibilidadService>(DisponibilidadService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deberia crear un bloque de disponibilidad correctamente', async () => {
    const bloqueCreado = {
      idBloque: 1n,
      dia: new Date('2026-10-01T00:00:00.000Z'),
      horaInicio: new Date('1970-01-01T09:00:00.000Z'),
      horaFin: new Date('1970-01-01T10:30:00.000Z'),
      estadoBloque: 'DISPONIBLE',
    };
    prismaMock.bloqueHorario.create.mockResolvedValue(bloqueCreado);

    const resultado = await service.crearBloque(10n, {
      dia: '2026-10-01',
      horaInicio: '09:00',
      horaFin: '10:30',
    });

    expect(resultado).toEqual({
      idBloque: '1',
      dia: '2026-10-01',
      horaInicio: '09:00',
      horaFin: '10:30',
      estadoBloque: 'DISPONIBLE',
    });
    expect(prismaMock.bloqueHorario.create).toHaveBeenCalledWith({
      data: {
        idTutor: 10n,
        dia: new Date('2026-10-01T00:00:00.000Z'),
        horaInicio: new Date('1970-01-01T09:00:00.000Z'),
        horaFin: new Date('1970-01-01T10:30:00.000Z'),
      },
    });
  });

  it('la hora de inicio debe ser anterior a la hora de fin', async () => {
    await expect(
      service.crearBloque(10n, {
        dia: '2026-10-01',
        horaInicio: '10:30',
        horaFin: '09:00',
      }),
    ).rejects.toThrow('La hora de inicio debe ser menor que la hora de fin');

    expect(prismaMock.bloqueHorario.create).not.toHaveBeenCalled();
  });

  it('horaInicio debe usar el formato HH:mm', async () => {
    await expect(
      service.crearBloque(10n, {
        dia: '2026-10-01',
        horaInicio: '9:00',
        horaFin: '10:30',
      }),
    ).rejects.toThrow('horaInicio debe usar el formato HH:mm');

    expect(prismaMock.bloqueHorario.create).not.toHaveBeenCalled();
  });

  it('horaFin debe usar el formato HH:mm', async () => {
    await expect(
      service.crearBloque(10n, {
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '10.30',
      }),
    ).rejects.toThrow('horaFin debe usar el formato HH:mm');

    expect(prismaMock.bloqueHorario.create).not.toHaveBeenCalled();
  });

  it('dia debe ser una fecha valida', async () => {
    await expect(
      service.crearBloque(10n, {
        dia: '2026-13-01',
        horaInicio: '09:00',
        horaFin: '10:30',
      }),
    ).rejects.toThrow('La fecha no es valida');

    expect(prismaMock.bloqueHorario.create).not.toHaveBeenCalled();
  });

  it('la fecha debe ser valida', async () => {
    await expect(
      service.crearBloque(10n, {
        dia: '2026-02-30',
        horaInicio: '09:00',
        horaFin: '10:30',
      }),
    ).rejects.toThrow('La fecha no es valida');

    expect(prismaMock.bloqueHorario.create).not.toHaveBeenCalled();
  });

  it('la hora de inicio es igual a la hora de fin', async () => {
    await expect(
      service.crearBloque(10n, {
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '09:00',
      }),
    ).rejects.toThrow('La hora de inicio debe ser menor que la hora de fin');

    expect(prismaMock.bloqueHorario.create).not.toHaveBeenCalled();
  });

  it('deberia listar los bloques de disponibilidad correctamente', async () => {
    const bloquesEncontrados = [
      {
        idBloque: 1n,
        dia: new Date('2026-10-01T00:00:00.000Z'),
        horaInicio: new Date('1970-01-01T09:00:00.000Z'),
        horaFin: new Date('1970-01-01T10:00:00.000Z'),
        estadoBloque: 'DISPONIBLE',
      },
      {
        idBloque: 2n,
        dia: new Date('2026-10-02T00:00:00.000Z'),
        horaInicio: new Date('1970-01-01T11:00:00.000Z'),
        horaFin: new Date('1970-01-01T12:00:00.000Z'),
        estadoBloque: 'DISPONIBLE',
      },
    ];
    prismaMock.bloqueHorario.findMany.mockResolvedValue(bloquesEncontrados);

    const resultado = await service.listarBloques(10n);

    expect(prismaMock.bloqueHorario.findMany).toHaveBeenCalledWith({
      where: { idTutor: 10n },
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    });

    expect(resultado).toEqual([
      {
        idBloque: '1',
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '10:00',
        estadoBloque: 'DISPONIBLE',
      },
      {
        idBloque: '2',
        dia: '2026-10-02',
        horaInicio: '11:00',
        horaFin: '12:00',
        estadoBloque: 'DISPONIBLE',
      },
    ]);
  });

  it('consulta solo los bloques libres que aún no comienzan en horario de Santiago', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:30:00.000Z'));
    const bloque = {
      idBloque: 3n,
      idTutor: 10n,
      dia: new Date('2026-10-01T00:00:00.000Z'),
      horaInicio: new Date('1970-01-01T10:00:00.000Z'),
      horaFin: new Date('1970-01-01T11:00:00.000Z'),
      estadoBloque: 'DISPONIBLE',
    };
    prismaMock.bloqueHorario.findMany.mockResolvedValue([bloque]);

    await expect(service.consultarDisponibilidadTutor(10n)).resolves.toEqual([
      {
        idBloque: '3',
        dia: '2026-10-01',
        horaInicio: '10:00',
        horaFin: '11:00',
        estadoBloque: 'DISPONIBLE',
      },
    ]);
    expect(prismaMock.bloqueHorario.findMany).toHaveBeenCalledWith({
      where: {
        idTutor: 10n,
        estadoBloque: 'DISPONIBLE',
        OR: [
          { dia: { gt: new Date('2026-10-01T00:00:00.000Z') } },
          {
            dia: new Date('2026-10-01T00:00:00.000Z'),
            horaInicio: { gt: new Date('1970-01-01T09:30:00.000Z') },
          },
        ],
      },
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }, { idBloque: 'asc' }],
    });
  });

  it('usa el cambio estacional de Santiago para excluir horarios iniciados', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:30:00.000Z'));
    prismaMock.bloqueHorario.findMany.mockResolvedValue([]);

    await expect(service.consultarDisponibilidadTutor(10n)).resolves.toEqual(
      [],
    );
    expect(prismaMock.bloqueHorario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { dia: { gt: new Date('2026-06-01T00:00:00.000Z') } },
            {
              dia: new Date('2026-06-01T00:00:00.000Z'),
              horaInicio: { gt: new Date('1970-01-01T08:30:00.000Z') },
            },
          ],
        }),
      }),
    );
  });

  it('actualiza solo la hora de fin y conserva los demás datos', async () => {
    const bloqueExistente = {
      idBloque: 1n,
      idTutor: 10n,
      dia: new Date('2026-10-01T00:00:00.000Z'),
      horaInicio: new Date('1970-01-01T09:00:00.000Z'),
      horaFin: new Date('1970-01-01T10:00:00.000Z'),
      estadoBloque: 'DISPONIBLE',
    };
    prismaMock.bloqueHorario.findUnique.mockResolvedValue(bloqueExistente);
    prismaMock.bloqueHorario.update.mockResolvedValue({
      ...bloqueExistente,
      horaFin: new Date('1970-01-01T10:30:00.000Z'),
    });

    const resultado = await service.actualizarBloque(10n, 1n, {
      horaFin: '10:30',
    });

    expect(prismaMock.bloqueHorario.findUnique).toHaveBeenCalledWith({
      where: { idTutor: 10n, idBloque: 1n },
    });
    expect(prismaMock.bloqueHorario.update).toHaveBeenCalledWith({
      where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' },
      data: {
        dia: new Date('2026-10-01T00:00:00.000Z'),
        horaInicio: new Date('1970-01-01T09:00:00.000Z'),
        horaFin: new Date('1970-01-01T10:30:00.000Z'),
      },
    });
    expect(resultado).toEqual({
      idBloque: '1',
      dia: '2026-10-01',
      horaInicio: '09:00',
      horaFin: '10:30',
      estadoBloque: 'DISPONIBLE',
    });
  });

  it('rechaza actualizar un bloque inexistente o de otro tutor', async () => {
    prismaMock.bloqueHorario.findUnique.mockResolvedValue(null);

    await expect(
      service.actualizarBloque(10n, 1n, { horaFin: '10:30' }),
    ).rejects.toMatchObject({ status: 404 });

    expect(prismaMock.bloqueHorario.findUnique).toHaveBeenCalledWith({
      where: { idTutor: 10n, idBloque: 1n },
    });
    expect(prismaMock.bloqueHorario.update).not.toHaveBeenCalled();
  });

  it('rechaza actualizar un bloque reservado', async () => {
    prismaMock.bloqueHorario.findUnique.mockResolvedValue({
      idBloque: 1n,
      idTutor: 10n,
      dia: new Date('2026-10-01T00:00:00.000Z'),
      horaInicio: new Date('1970-01-01T09:00:00.000Z'),
      horaFin: new Date('1970-01-01T10:00:00.000Z'),
      estadoBloque: 'RESERVADO',
    });

    await expect(
      service.actualizarBloque(10n, 1n, { horaFin: '10:30' }),
    ).rejects.toMatchObject({ status: 409 });

    expect(prismaMock.bloqueHorario.update).not.toHaveBeenCalled();
  });

  it('responde con conflicto si el bloque cambia antes de actualizarlo', async () => {
    prismaMock.bloqueHorario.findUnique.mockResolvedValue({
      idBloque: 1n,
      idTutor: 10n,
      dia: new Date('2026-10-01T00:00:00.000Z'),
      horaInicio: new Date('1970-01-01T09:00:00.000Z'),
      horaFin: new Date('1970-01-01T10:00:00.000Z'),
      estadoBloque: 'DISPONIBLE',
    });
    prismaMock.bloqueHorario.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('El registro no coincide', {
        code: 'P2025',
        clientVersion: '7.10.0',
      }),
    );

    await expect(
      service.actualizarBloque(10n, 1n, { horaFin: '10:30' }),
    ).rejects.toMatchObject({ status: 409 });

    expect(prismaMock.bloqueHorario.update).toHaveBeenCalledWith({
      where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' },
      data: {
        dia: new Date('2026-10-01T00:00:00.000Z'),
        horaInicio: new Date('1970-01-01T09:00:00.000Z'),
        horaFin: new Date('1970-01-01T10:30:00.000Z'),
      },
    });
  });

  describe('desactivarBloque', () => {
    const bloqueDisponible = {
      idBloque: 1n,
      idTutor: 10n,
      dia: new Date('2026-10-01T00:00:00.000Z'),
      horaInicio: new Date('1970-01-01T09:00:00.000Z'),
      horaFin: new Date('1970-01-01T10:00:00.000Z'),
      estadoBloque: 'DISPONIBLE',
    };

    it('inactiva el bloque del tutor sin borrarlo', async () => {
      prismaMock.bloqueHorario.findUnique.mockResolvedValue(bloqueDisponible);
      prismaMock.bloqueHorario.update.mockResolvedValue({
        ...bloqueDisponible,
        estadoBloque: 'INACTIVO',
      });

      const resultado = await service.desactivarBloque(10n, 1n);

      expect(prismaMock.bloqueHorario.findUnique).toHaveBeenCalledWith({
        where: { idTutor: 10n, idBloque: 1n },
      });
      expect(prismaMock.bloqueHorario.update).toHaveBeenCalledWith({
        where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' },
        data: { estadoBloque: 'INACTIVO' },
      });
      expect(resultado).toEqual({
        idBloque: '1',
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '10:00',
        estadoBloque: 'INACTIVO',
      });
    });

    it('rechaza un bloque inexistente o de otro tutor', async () => {
      prismaMock.bloqueHorario.findUnique.mockResolvedValue(null);

      await expect(service.desactivarBloque(10n, 1n)).rejects.toMatchObject({
        status: 404,
      });

      expect(prismaMock.bloqueHorario.findUnique).toHaveBeenCalledWith({
        where: { idTutor: 10n, idBloque: 1n },
      });
      expect(prismaMock.bloqueHorario.update).not.toHaveBeenCalled();
    });

    it.each(['RESERVADO', 'INACTIVO'])(
      'rechaza un bloque en estado %s',
      async (estadoBloque) => {
        prismaMock.bloqueHorario.findUnique.mockResolvedValue({
          ...bloqueDisponible,
          estadoBloque,
        });

        await expect(service.desactivarBloque(10n, 1n)).rejects.toMatchObject({
          status: 409,
        });

        expect(prismaMock.bloqueHorario.update).not.toHaveBeenCalled();
      },
    );

    it('responde con conflicto si el bloque se reserva antes de la escritura', async () => {
      prismaMock.bloqueHorario.findUnique.mockResolvedValue(bloqueDisponible);
      prismaMock.bloqueHorario.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('El registro no coincide', {
          code: 'P2025',
          clientVersion: '7.10.0',
        }),
      );

      await expect(service.desactivarBloque(10n, 1n)).rejects.toMatchObject({
        status: 409,
      });

      expect(prismaMock.bloqueHorario.update).toHaveBeenCalledWith({
        where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' },
        data: { estadoBloque: 'INACTIVO' },
      });
    });
  });
});
