import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('Busqueda de tutores por materia (HTTP)', () => {
  let app: INestApplication<Server>;
  const prisma = {
    tutorMateria: { findMany: vi.fn() },
    perfilTutor: { findMany: vi.fn() },
    bloqueHorario: { findMany: vi.fn() },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.tutorMateria.findMany.mockResolvedValue([]);
    prisma.perfilTutor.findMany.mockResolvedValue([]);
    prisma.bloqueHorario.findMany.mockResolvedValue([]);

    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await app.close();
  });

  it('conecta controller, caso de uso y adaptador y devuelve los tutores con sus promedios', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-10T12:30:00.000Z'));
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 10n }, { idUsuario: 15n }, { idUsuario: 20n }]);
    prisma.perfilTutor.findMany.mockResolvedValue([
      { idUsuario: 15n, sumaCalificaciones: 0, cantidadCalificaciones: 0 },
      { idUsuario: 10n, sumaCalificaciones: 18, cantidadCalificaciones: 4 },
    ]);
    prisma.bloqueHorario.findMany.mockResolvedValueOnce([
      {
        idBloque: 1n,
        idTutor: 10n,
        dia: new Date('2026-10-10T00:00:00.000Z'),
        horaInicio: new Date('1970-01-01T10:00:00.000Z'),
        horaFin: new Date('1970-01-01T11:00:00.000Z'),
        estadoBloque: 'DISPONIBLE',
      },
    ]);

    await request(app.getHttpServer())
      .get('/tutores?materiaId=2')
      .expect(200)
      .expect([
        { idTutor: '10', promedioCalificaciones: 4.5, cantidadCalificaciones: 4, horariosDisponibles: [{ idBloque: '1', dia: '2026-10-10', horaInicio: '10:00', horaFin: '11:00' }] },
        { idTutor: '15', promedioCalificaciones: null, cantidadCalificaciones: 0, horariosDisponibles: [] },
        { idTutor: '20', promedioCalificaciones: null, cantidadCalificaciones: 0, horariosDisponibles: [] },
      ]);

    expect(prisma.tutorMateria.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { idMateria: 2n, vigente: true },
      select: { idUsuario: true },
    });
    expect(prisma.perfilTutor.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { idUsuario: { in: [10n, 15n, 20n] } },
      select: {
        idUsuario: true,
        sumaCalificaciones: true,
        cantidadCalificaciones: true,
      },
    });
    expect(prisma.bloqueHorario.findMany).toHaveBeenCalledTimes(3);
    for (const idTutor of [10n, 15n, 20n]) {
      expect(prisma.bloqueHorario.findMany).toHaveBeenCalledWith({
        where: {
          idTutor,
          estadoBloque: 'DISPONIBLE',
          OR: [{ dia: { gt: new Date('2026-10-10T00:00:00.000Z') } }, { dia: new Date('2026-10-10T00:00:00.000Z'), horaInicio: { gt: new Date('1970-01-01T09:30:00.000Z') } }],
        },
        orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }, { idBloque: 'asc' }],
      });
    }
  });

  it('devuelve una lista vacia cuando no hay tutores habilitados', async () => {
    await request(app.getHttpServer()).get('/tutores?materiaId=1').expect(200).expect([]);
    expect(prisma.bloqueHorario.findMany).not.toHaveBeenCalled();
  });

  it.each([
    '/tutores',
    '/tutores?materiaId=',
    '/tutores?materiaId=abc',
    '/tutores?materiaId=0',
    '/tutores?materiaId=-1',
    '/tutores?materiaId=1.5',
    '/tutores?materiaId=9223372036854775808',
    '/tutores?materiaId=1&materiaId=2',
  ])('rechaza el parametro invalido sin consultar Prisma: %s', async (ruta) => {
    await request(app.getHttpServer()).get(ruta).expect(400);
    expect(prisma.tutorMateria.findMany).not.toHaveBeenCalled();
    expect(prisma.perfilTutor.findMany).not.toHaveBeenCalled();
    expect(prisma.bloqueHorario.findMany).not.toHaveBeenCalled();
  });

  it('conserva identificadores BIGINT al recibir el parametro y enviar JSON', async () => {
    prisma.tutorMateria.findMany.mockResolvedValue([{ idUsuario: 9007199254740993n }]);

    await request(app.getHttpServer())
      .get('/tutores?materiaId=9223372036854775807')
      .expect(200)
      .expect([
        {
          idTutor: '9007199254740993',
          promedioCalificaciones: null,
          cantidadCalificaciones: 0,
          horariosDisponibles: [],
        },
      ]);

    expect(prisma.tutorMateria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idMateria: 9223372036854775807n, vigente: true },
      }),
    );
  });
});
