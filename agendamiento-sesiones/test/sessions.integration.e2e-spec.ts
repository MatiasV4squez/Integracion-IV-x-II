import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import request from 'supertest';
import { getDatabaseUrl } from '../src/database/database.config';
import { PrismaService } from '../src/database/prisma.service';
import {
  Prisma,
  PrismaClient,
  type sesion_estado_sesion_enum,
} from '../src/generated/prisma/client';
import { SessionsModule } from '../src/sessions/sessions.module';
import { SessionsService } from '../src/sessions/sessions.service';

// Las migraciones y fixtures viven exclusivamente en un esquema aleatorio propio.
describe('Sesiones: HTTP, JWT y transacciones PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: Client;
  let service: SessionsService;
  const schema = `test_sessions_${randomUUID().replaceAll('-', '')}`;
  const secret = randomBytes(32).toString('hex');
  const jwt = new JwtService({ secret });
  const tutor = '9007199254740993';
  const tutee = '9007199254740995';
  const outsider = '9007199254740997';
  const materia = randomUUID();
  let publicBefore: unknown;

  function token(
    sub = tutor,
    claims: Record<string, unknown> = {},
    signingSecret = secret,
  ) {
    const payload = Object.fromEntries(
      Object.entries({
        sub,
        iss: 'stp-usuarios-auth',
        aud: 'stp-clients',
        exp: Math.floor(Date.now() / 1000) + 600,
        ...claims,
      }).filter(([, value]) => value !== undefined),
    );
    return jwt.sign(payload, { secret: signingSecret, algorithm: 'HS256' });
  }

  function act(id: string, action: string, user = tutor) {
    return request(app.getHttpServer())
      .patch(`/sessions/${id}/${action}`)
      .set('Authorization', `Bearer ${token(user)}`);
  }

  async function publicSnapshot() {
    return (
      await admin.query(`
      SELECT (SELECT md5(COALESCE(jsonb_agg(to_jsonb(s) ORDER BY id_sesion)::text, '[]')) FROM public.sesion s) AS sesiones,
             (SELECT md5(COALESCE(jsonb_agg(to_jsonb(b) ORDER BY id_bloque)::text, '[]')) FROM public.bloque_horario b) AS bloques
    `)
    ).rows;
  }

  beforeAll(async () => {
    loadEnv({ quiet: true });
    const connectionString =
      process.env.TEST_DATABASE_URL ?? getDatabaseUrl(process.env);
    admin = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    await admin.connect();
    publicBefore = await publicSnapshot();
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await admin.query(`SET search_path TO "${schema}", public`);
    const migrations = join(__dirname, '../prisma/migrations');
    for (const directory of readdirSync(migrations)
      .filter((name) => /^\d/.test(name))
      .sort()) {
      await admin.query(
        readFileSync(join(migrations, directory, 'migration.sql'), 'utf8'),
      );
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }, { schema }),
    });
    await prisma.$connect();
    const module = await Test.createTestingModule({ imports: [SessionsModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          JWT_SECRET: secret,
          SESSION_TIME_ZONE: 'America/Santiago',
        }),
      )
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    service = app.get(SessionsService);
  }, 30000);

  beforeEach(async () => {
    await prisma.sesion.deleteMany();
    await prisma.bloque_horario.deleteMany();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    try {
      await app?.close();
      await prisma?.$disconnect();
      if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        expect(await publicSnapshot()).toEqual(publicBefore);
      }
    } finally {
      await admin?.end();
    }
  });

  async function block(
    day = '2099-06-20',
    start = '10:00',
    end = '11:00',
    owner = tutor,
  ) {
    return prisma.bloque_horario.create({
      data: {
        id_tutor: BigInt(owner),
        dia: new Date(`${day}T00:00:00Z`),
        hora_inicio: new Date(`1970-01-01T${start}:00Z`),
        hora_fin: new Date(`1970-01-01T${end}:00Z`),
        estado_bloque: 'RESERVADO',
      },
    });
  }

  async function fixture(
    state: sesion_estado_sesion_enum = 'PENDIENTE',
    day = '2099-06-20',
  ) {
    const slot = await block(day);
    return prisma.sesion.create({
      data: {
        id_tutor: BigInt(tutor),
        id_tutee: BigInt(tutee),
        id_materia: materia,
        id_bloque: slot.id_bloque,
        estado_sesion: state,
        fecha_actualizacion: new Date('2020-01-01T00:00:00Z'),
      },
    });
  }

  async function stateOf(id: string) {
    return prisma.sesion.findUniqueOrThrow({
      where: { id_sesion: id },
      include: { bloque_horario: true },
    });
  }

  it.each(['accept', 'reject', 'cancel'])(
    '%s exige JWT y UUID válido',
    async (action) => {
      await request(app.getHttpServer())
        .patch(`/sessions/${randomUUID()}/${action}`)
        .expect(401);
      await act('no-es-uuid', action).expect(400);
      await act(randomUUID(), action).expect(404);
    },
  );

  it.each([
    ['firma incorrecta', {}, 'x'.repeat(64)],
    ['expirado', { exp: 1 }, secret],
    ['sin expiración', { exp: undefined }, secret],
    ['emisor incorrecto', { iss: 'otro' }, secret],
    ['audiencia incorrecta', { aud: 'otro' }, secret],
    ['sub numérico', { sub: 2 }, secret],
    ['sub fuera de rango', { sub: '9223372036854775808' }, secret],
  ])('rechaza JWT %s', async (_name, claims, signingSecret) => {
    await request(app.getHttpServer())
      .patch(`/sessions/${randomUUID()}/accept`)
      .set('Authorization', `Bearer ${token(tutor, claims, signingSecret)}`)
      .expect(401);
  });

  it('acepta como tutor, excluye la propia solicitud y devuelve BigInt como texto', async () => {
    const session = await fixture();
    const response = await act(session.id_sesion, 'accept').expect(200);
    expect(response.body).toMatchObject({
      estado_sesion: 'CONFIRMADA',
      id_tutor: tutor,
      id_tutee: tutee,
    });
    expect(response.body.bloque_horario).toBeUndefined();
    const saved = await stateOf(session.id_sesion);
    expect(saved.bloque_horario.estado_bloque).toBe('RESERVADO');
    expect(saved.fecha_actualizacion.getTime()).toBeGreaterThan(
      session.fecha_actualizacion.getTime(),
    );
  });

  it.each(['accept', 'reject'])(
    '%s solo permite al tutor, aunque se suplante el body',
    async (action) => {
      const session = await fixture();
      await act(session.id_sesion, action, tutee).expect(403);
      await act(session.id_sesion, action, outsider)
        .send({ id_usuario: tutor, id_tutor: tutor })
        .expect(403);
      expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
        'PENDIENTE',
      );
    },
  );

  it.each([
    'CONFIRMADA',
    'RECHAZADA',
    'EXPIRADA',
    'CANCELADA',
    'PENDIENTE_CIERRE',
    'COMPLETADA',
    'NO_REALIZADA',
    'INASISTENCIA',
    'EN_CONFLICTO',
  ] as const)('no acepta ni rechaza desde %s', async (state) => {
    const session = await fixture(state);
    await act(session.id_sesion, 'accept').expect(409);
    await act(session.id_sesion, 'reject').expect(409);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe(state);
  });

  it('rechaza y libera el bloque', async () => {
    const session = await fixture();
    await act(session.id_sesion, 'reject')
      .expect(200)
      .expect(({ body }) => expect(body.estado_sesion).toBe('RECHAZADA'));
    expect(
      (await stateOf(session.id_sesion)).bloque_horario.estado_bloque,
    ).toBe('DISPONIBLE');
  });

  it.each(['PENDIENTE', 'CONFIRMADA', 'PENDIENTE_CIERRE'] as const)(
    'no libera un bloque que otra sesión %s ocupa',
    async (state) => {
      const session = await fixture();
      await prisma.sesion.create({
        data: {
          id_bloque: session.id_bloque,
          id_tutor: BigInt(tutor),
          id_tutee: BigInt(outsider),
          id_materia: materia,
          estado_sesion: state,
        },
      });
      await act(session.id_sesion, 'reject').expect(200);
      expect(
        (await stateOf(session.id_sesion)).bloque_horario.estado_bloque,
      ).toBe('RESERVADO');
    },
  );

  it('rechazar no reactiva un bloque inactivo', async () => {
    const session = await fixture();
    await prisma.bloque_horario.update({
      where: { id_bloque: session.id_bloque },
      data: { estado_bloque: 'INACTIVO' },
    });
    await act(session.id_sesion, 'reject').expect(200);
    expect(
      (await stateOf(session.id_sesion)).bloque_horario.estado_bloque,
    ).toBe('INACTIVO');
  });

  it.each([tutor, tutee])(
    'permite cancelar antes del inicio al participante %s',
    async (user) => {
      const session = await fixture('CONFIRMADA');
      await act(session.id_sesion, 'cancel', user)
        .expect(200)
        .expect(({ body }) => expect(body.estado_sesion).toBe('CANCELADA'));
      expect(
        (await stateOf(session.id_sesion)).bloque_horario.estado_bloque,
      ).toBe('DISPONIBLE');
    },
  );

  it('impide cancelar a terceros y después del inicio', async () => {
    const session = await fixture('CONFIRMADA', '2020-01-01');
    await act(session.id_sesion, 'cancel', outsider).expect(403);
    await act(session.id_sesion, 'cancel').expect(409);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe('CONFIRMADA');
  });

  it('evalúa la cancelación con la zona configurada, no con la zona del servidor', async () => {
    const session = await fixture('CONFIRMADA');
    const {
      rows: [wall],
    } = await admin.query(`SELECT
      to_char((clock_timestamp() AT TIME ZONE 'UTC') - interval '1 hour', 'YYYY-MM-DD') AS day,
      to_char((clock_timestamp() AT TIME ZONE 'UTC') - interval '1 hour', 'HH24:MI:SS') AS time`);
    await prisma.bloque_horario.update({
      where: { id_bloque: session.id_bloque },
      data: {
        dia: new Date(`${wall.day}T00:00:00Z`),
        hora_inicio: new Date(`1970-01-01T${wall.time}Z`),
      },
    });
    const utcService = new SessionsService(
      prisma as PrismaService,
      new ConfigService({ SESSION_TIME_ZONE: 'UTC' }),
    );
    await expect(
      utcService.cancelSession(session.id_sesion, tutor),
    ).rejects.toMatchObject({ status: 409 });
    // El mismo horario de pared en Santiago comienza 2 o 3 horas después de ahora.
    await act(session.id_sesion, 'cancel').expect(200);
  });

  it('al alcanzar el segundo de inicio ya no permite cancelar', async () => {
    const session = await fixture('CONFIRMADA');
    const {
      rows: [wall],
    } = await admin.query(`SELECT
      to_char(clock_timestamp() AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS day,
      to_char(clock_timestamp() AT TIME ZONE 'America/Santiago', 'HH24:MI:SS') AS time`);
    await prisma.bloque_horario.update({
      where: { id_bloque: session.id_bloque },
      data: {
        dia: new Date(`${wall.day}T00:00:00Z`),
        hora_inicio: new Date(`1970-01-01T${wall.time}Z`),
      },
    });
    await act(session.id_sesion, 'cancel').expect(409);
  });

  it('cancelar mantiene reservado un bloque con otra sesión activa', async () => {
    const session = await fixture('CONFIRMADA');
    await prisma.sesion.create({
      data: {
        id_bloque: session.id_bloque,
        id_tutor: BigInt(tutor),
        id_tutee: BigInt(outsider),
        id_materia: materia,
        estado_sesion: 'PENDIENTE',
      },
    });
    await act(session.id_sesion, 'cancel').expect(200);
    expect(
      (await stateOf(session.id_sesion)).bloque_horario.estado_bloque,
    ).toBe('RESERVADO');
  });

  it.each([
    'PENDIENTE',
    'RECHAZADA',
    'EXPIRADA',
    'CANCELADA',
    'PENDIENTE_CIERRE',
    'COMPLETADA',
    'NO_REALIZADA',
    'INASISTENCIA',
    'EN_CONFLICTO',
  ] as const)('no cancela desde %s', async (state) => {
    const session = await fixture(state);
    await act(session.id_sesion, 'cancel', tutee).expect(409);
  });

  it.each(['PENDIENTE', 'CONFIRMADA', 'PENDIENTE_CIERRE'] as const)(
    'impide aceptar cuando otra sesión %s se superpone',
    async (state) => {
      const session = await fixture();
      const other = await block('2099-06-20', '10:30', '11:30');
      await prisma.sesion.create({
        data: {
          id_bloque: other.id_bloque,
          id_tutor: BigInt(tutor),
          id_tutee: BigInt(outsider),
          id_materia: materia,
          estado_sesion: state,
        },
      });
      await act(session.id_sesion, 'accept').expect(409);
    },
  );

  it('permite horarios adyacentes y no cuenta sesiones finales', async () => {
    const session = await fixture();
    const adjacent = await block('2099-06-20', '11:00', '12:00');
    await prisma.sesion.create({
      data: {
        id_bloque: adjacent.id_bloque,
        id_tutor: BigInt(tutor),
        id_tutee: BigInt(outsider),
        id_materia: materia,
        estado_sesion: 'CONFIRMADA',
      },
    });
    await prisma.sesion.create({
      data: {
        id_bloque: session.id_bloque,
        id_tutor: BigInt(tutor),
        id_tutee: BigInt(outsider),
        id_materia: materia,
        estado_sesion: 'RECHAZADA',
      },
    });
    await act(session.id_sesion, 'accept').expect(200);
  });

  it.each(['inactivo', 'otro tutor'])(
    'impide aceptar un bloque %s',
    async (reason) => {
      const session = await fixture();
      await prisma.bloque_horario.update({
        where: { id_bloque: session.id_bloque },
        data:
          reason === 'inactivo'
            ? { estado_bloque: 'INACTIVO' }
            : { id_tutor: BigInt(outsider) },
      });
      await act(session.id_sesion, 'accept').expect(409);
    },
  );

  it('aceptar y rechazar simultáneamente permite una sola transición', async () => {
    const session = await fixture();
    const responses = await Promise.all([
      act(session.id_sesion, 'accept'),
      act(session.id_sesion, 'reject'),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const saved = await stateOf(session.id_sesion);
    expect(saved.bloque_horario.estado_bloque).toBe(
      saved.estado_sesion === 'CONFIRMADA' ? 'RESERVADO' : 'DISPONIBLE',
    );
  });

  it('dos cancelaciones simultáneas permiten una sola transición', async () => {
    const session = await fixture('CONFIRMADA');
    const responses = await Promise.all([
      act(session.id_sesion, 'cancel'),
      act(session.id_sesion, 'cancel', tutee),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
  });

  it('expirar y aceptar simultáneamente no sobrescribe el estado ganador', async () => {
    const session = await fixture();
    await prisma.sesion.update({
      where: { id_sesion: session.id_sesion },
      data: { fecha_creacion: new Date('2020-01-01T00:00:00Z') },
    });
    const [response] = await Promise.all([
      act(session.id_sesion, 'accept'),
      service.handleExpiredSessions(),
    ]);
    const saved = await stateOf(session.id_sesion);
    expect(['CONFIRMADA', 'EXPIRADA']).toContain(saved.estado_sesion);
    expect(response.status).toBe(
      saved.estado_sesion === 'CONFIRMADA' ? 200 : 409,
    );
    expect(saved.bloque_horario.estado_bloque).toBe(
      saved.estado_sesion === 'CONFIRMADA' ? 'RESERVADO' : 'DISPONIBLE',
    );
  });

  it('expira y libera una reserva; volver a ejecutar no cambia la sesión', async () => {
    const session = await fixture();
    await prisma.sesion.update({
      where: { id_sesion: session.id_sesion },
      data: { fecha_creacion: new Date('2020-01-01T00:00:00Z') },
    });
    await service.handleExpiredSessions();
    const first = await stateOf(session.id_sesion);
    expect(first.estado_sesion).toBe('EXPIRADA');
    expect(first.bloque_horario.estado_bloque).toBe('DISPONIBLE');
    await service.handleExpiredSessions();
    expect(await stateOf(session.id_sesion)).toEqual(first);
  });

  it('revierte la sesión si falla la reserva del bloque', async () => {
    const session = await fixture();
    await admin.query(
      `ALTER TABLE "${schema}".bloque_horario ADD CONSTRAINT prevent_reservation CHECK (estado_bloque <> 'RESERVADO') NOT VALID`,
    );
    try {
      await expect(
        service.acceptSession(session.id_sesion, tutor),
      ).rejects.toThrow();
      expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
        'PENDIENTE',
      );
    } finally {
      await admin.query(
        `ALTER TABLE "${schema}".bloque_horario DROP CONSTRAINT prevent_reservation`,
      );
    }
  });

  it('limita los reintentos P2034 y devuelve un conflicto controlado', async () => {
    const spy = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('conflict', {
          code: 'P2034',
          clientVersion: '7',
        }),
      );
    await act(randomUUID(), 'accept').expect(409);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('reintenta P2034 y confirma cuando desaparece el conflicto', async () => {
    const session = await fixture();
    const error = new Prisma.PrismaClientKnownRequestError('conflict', {
      code: 'P2034',
      clientVersion: '7',
    });
    const spy = jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);
    await act(session.id_sesion, 'accept').expect(200);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('crea bloque y solicitud por HTTP, confirma y cancela', async () => {
    const created = await request(app.getHttpServer())
      .post('/sessions/blocks')
      .send({
        id_tutor: tutor,
        dia: '2099-06-20',
        hora_inicio: '10:00',
        hora_fin: '11:00',
      })
      .expect(201);
    expect(created.body.id_tutor).toBe(tutor);
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .send({
        id_tutee: tutee,
        id_tutor: tutor,
        id_materia: materia,
        id_bloque: created.body.id_bloque,
      })
      .expect(201);
    await act(response.body.id_sesion, 'accept').expect(200);
    await act(response.body.id_sesion, 'cancel', tutee).expect(200);
    expect(
      (await stateOf(response.body.id_sesion)).bloque_horario.estado_bloque,
    ).toBe('DISPONIBLE');
  });

  it('con tres pendientes y dos solicitudes simultáneas solo crea la cuarta', async () => {
    for (const day of ['2099-06-20', '2099-06-21', '2099-06-22'])
      await fixture('PENDIENTE', day);
    const candidates = await Promise.all(
      ['2099-06-23', '2099-06-24'].map(async (day) => {
        const slot = await block(day);
        await prisma.bloque_horario.update({
          where: { id_bloque: slot.id_bloque },
          data: { estado_bloque: 'DISPONIBLE' },
        });
        return slot;
      }),
    );
    const responses = await Promise.all(
      candidates.map((slot) =>
        request(app.getHttpServer()).post('/sessions').send({
          id_tutee: tutee,
          id_tutor: tutor,
          id_materia: materia,
          id_bloque: slot.id_bloque,
        }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 400,
    ]);
    expect(
      await prisma.sesion.count({
        where: { id_tutee: BigInt(tutee), estado_sesion: 'PENDIENTE' },
      }),
    ).toBe(4);
  });

  it('no crea dos solicitudes simultáneas en bloques superpuestos del tutor', async () => {
    const candidates = await Promise.all([
      block('2099-06-20', '10:00', '11:00'),
      block('2099-06-20', '10:30', '11:30'),
    ]);
    await prisma.bloque_horario.updateMany({
      data: { estado_bloque: 'DISPONIBLE' },
    });
    const responses = await Promise.all(
      candidates.map((slot, index) =>
        request(app.getHttpServer())
          .post('/sessions')
          .send({
            id_tutee: index ? outsider : tutee,
            id_tutor: tutor,
            id_materia: materia,
            id_bloque: slot.id_bloque,
          }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await prisma.sesion.count()).toBe(1);
  });

  it.each([
    { dia: '2099-02-30' },
    { hora_inicio: '8:00' },
    { hora_fin: '09:00' },
    { id_tutor: '9223372036854775808' },
    { id_tutor: 2 },
  ])('rechaza un bloque inválido %j', async (invalid) => {
    await request(app.getHttpServer())
      .post('/sessions/blocks')
      .send({
        id_tutor: tutor,
        dia: '2099-06-20',
        hora_inicio: '10:00',
        hora_fin: '11:00',
        ...invalid,
      })
      .expect(400);
  });
});
