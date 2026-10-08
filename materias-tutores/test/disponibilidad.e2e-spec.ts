import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

const jwt = new JwtService({
  secret: process.env.JWT_SECRET,
  signOptions: {
    algorithm: 'HS256',
    issuer: 'stp-usuarios-auth',
    audience: 'stp-clients',
    expiresIn: 1800,
  },
});

function token(roles: string[] = ['TUTOR']): string {
  return jwt.sign({
    sub: '10',
    jti: 'prueba-sesion-1',
    correo_institucional: 'tutor@alu.uct.cl',
    roles,
  });
}

const bloqueDisponible = {
  idBloque: 1n,
  idTutor: 10n,
  dia: new Date('2026-10-01T00:00:00.000Z'),
  horaInicio: new Date('1970-01-01T09:00:00.000Z'),
  horaFin: new Date('1970-01-01T10:00:00.000Z'),
  estadoBloque: 'DISPONIBLE',
};

const prismaMock = {
  bloqueHorario: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

describe('DisponibilidadController (e2e)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('crea un bloque para el tutor identificado por el token', async () => {
    prismaMock.bloqueHorario.create.mockResolvedValue(bloqueDisponible);

    await request(app.getHttpServer())
      .post('/disponibilidad/bloques')
      .set('Authorization', `Bearer ${token()}`)
      .send({ dia: '2026-10-01', horaInicio: '09:00', horaFin: '10:00' })
      .expect(201)
      .expect({
        idBloque: '1',
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '10:00',
        estadoBloque: 'DISPONIBLE',
      });

    expect(prismaMock.bloqueHorario.create).toHaveBeenCalledWith({
      data: {
        idTutor: 10n,
        dia: bloqueDisponible.dia,
        horaInicio: bloqueDisponible.horaInicio,
        horaFin: bloqueDisponible.horaFin,
      },
    });
  });

  it('lista solo los bloques del tutor autenticado', async () => {
    prismaMock.bloqueHorario.findMany.mockResolvedValue([bloqueDisponible]);

    await request(app.getHttpServer())
      .get('/disponibilidad/bloques')
      .set('Authorization', `Bearer ${token()}`)
      .expect(200)
      .expect([
        {
          idBloque: '1',
          dia: '2026-10-01',
          horaInicio: '09:00',
          horaFin: '10:00',
          estadoBloque: 'DISPONIBLE',
        },
      ]);

    expect(prismaMock.bloqueHorario.findMany).toHaveBeenCalledWith({
      where: { idTutor: 10n },
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }],
    });
  });

  it('permite a un estudiante consultar los bloques libres de otro tutor', async () => {
    prismaMock.bloqueHorario.findMany.mockResolvedValue([bloqueDisponible]);

    await request(app.getHttpServer())
      .get('/disponibilidad/tutores/10')
      .set('Authorization', `Bearer ${token(['TUTEE'])}`)
      .expect(200)
      .expect([
        {
          idBloque: '1',
          dia: '2026-10-01',
          horaInicio: '09:00',
          horaFin: '10:00',
          estadoBloque: 'DISPONIBLE',
        },
      ]);

    expect(prismaMock.bloqueHorario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          idTutor: 10n,
          estadoBloque: 'DISPONIBLE',
        }),
      }),
    );
  });

  it('protege la consulta y rechaza identificadores inválidos', async () => {
    await request(app.getHttpServer())
      .get('/disponibilidad/tutores/10')
      .expect(401);
    for (const id of ['0', 'abc', '9223372036854775808']) {
      await request(app.getHttpServer())
        .get(`/disponibilidad/tutores/${id}`)
        .set('Authorization', `Bearer ${token(['TUTEE'])}`)
        .expect(400);
    }
    expect(prismaMock.bloqueHorario.findMany).not.toHaveBeenCalled();
  });

  it('actualiza un bloque propio', async () => {
    prismaMock.bloqueHorario.findUnique.mockResolvedValue(bloqueDisponible);
    prismaMock.bloqueHorario.update.mockResolvedValue({
      ...bloqueDisponible,
      horaFin: new Date('1970-01-01T10:30:00.000Z'),
    });

    await request(app.getHttpServer())
      .patch('/disponibilidad/bloques/1')
      .set('Authorization', `Bearer ${token()}`)
      .send({ horaFin: '10:30' })
      .expect(200)
      .expect({
        idBloque: '1',
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '10:30',
        estadoBloque: 'DISPONIBLE',
      });

    expect(prismaMock.bloqueHorario.update).toHaveBeenCalledWith({
      where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' },
      data: {
        dia: bloqueDisponible.dia,
        horaInicio: bloqueDisponible.horaInicio,
        horaFin: new Date('1970-01-01T10:30:00.000Z'),
      },
    });
  });

  it('desactiva un bloque propio sin eliminarlo físicamente', async () => {
    prismaMock.bloqueHorario.findUnique.mockResolvedValue(bloqueDisponible);
    prismaMock.bloqueHorario.update.mockResolvedValue({
      ...bloqueDisponible,
      estadoBloque: 'INACTIVO',
    });

    await request(app.getHttpServer())
      .delete('/disponibilidad/bloques/1')
      .set('Authorization', `Bearer ${token()}`)
      .expect(200)
      .expect({
        idBloque: '1',
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '10:00',
        estadoBloque: 'INACTIVO',
      });

    expect(prismaMock.bloqueHorario.update).toHaveBeenCalledWith({
      where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' },
      data: { estadoBloque: 'INACTIVO' },
    });
  });

  it('rechaza peticiones sin token o con otro rol', async () => {
    await request(app.getHttpServer())
      .get('/disponibilidad/bloques')
      .expect(401);
    await request(app.getHttpServer())
      .get('/disponibilidad/bloques')
      .set('Authorization', `Bearer ${token(['ESTUDIANTE'])}`)
      .expect(403);
    expect(prismaMock.bloqueHorario.findMany).not.toHaveBeenCalled();
  });

  it('rechaza tokens con firma incorrecta o vencidos', async () => {
    const otroEmisor = new JwtService({
      secret: 'otra-clave-exclusiva-para-pruebas-0123456789',
      signOptions: {
        algorithm: 'HS256',
        issuer: 'stp-usuarios-auth',
        audience: 'stp-clients',
      },
    });
    const tokenConOtraFirma = otroEmisor.sign({
      sub: '10',
      jti: 'prueba-sesion-2',
      correo_institucional: 'tutor@alu.uct.cl',
      roles: ['TUTOR'],
    });
    const tokenVencido = new JwtService({
      secret: process.env.JWT_SECRET,
      signOptions: {
        algorithm: 'HS256',
        issuer: 'stp-usuarios-auth',
        audience: 'stp-clients',
      },
    }).sign({
      sub: '10',
      jti: 'prueba-sesion-3',
      correo_institucional: 'tutor@alu.uct.cl',
      roles: ['TUTOR'],
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    for (const invalidToken of [tokenConOtraFirma, tokenVencido]) {
      await request(app.getHttpServer())
        .get('/disponibilidad/bloques')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    }
    expect(prismaMock.bloqueHorario.findMany).not.toHaveBeenCalled();
  });

  it('rechaza IDs y cuerpos inválidos antes de consultar Prisma', async () => {
    await request(app.getHttpServer())
      .patch('/disponibilidad/bloques/0')
      .set('Authorization', `Bearer ${token()}`)
      .send({ horaFin: '10:30' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/disponibilidad/bloques')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        dia: '2026-10-01',
        horaInicio: '09:00',
        horaFin: '10:00',
        idTutor: '99',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/disponibilidad/bloques')
      .set('Authorization', `Bearer ${token()}`)
      .send({ dia: '2026-10-01', horaInicio: '09:00' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/disponibilidad/bloques/1')
      .set('Authorization', `Bearer ${token()}`)
      .send({})
      .expect(400);
    expect(prismaMock.bloqueHorario.create).not.toHaveBeenCalled();
    expect(prismaMock.bloqueHorario.update).not.toHaveBeenCalled();
  });
});
