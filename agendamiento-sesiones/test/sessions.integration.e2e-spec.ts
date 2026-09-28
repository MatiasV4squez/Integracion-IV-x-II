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

// Pruebas de sesiones y JWT con PostgreSQL real en un esquema aislado.
describe('Aceptar, rechazar y cancelar sesiones', () => {
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
  const materia = '9007199254740999';
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
  function act(id: string | bigint, action: string, user = tutor) {
    return request(app.getHttpServer())
      .patch(`/sessions/${id}/${action}`)
      .set('Authorization', `Bearer ${token(user)}`);
  }
  function create(blockId: string, student = tutee, owner = tutor) {
    return request(app.getHttpServer()).post('/sessions').send({
      id_tutee: student,
      id_tutor: owner,
      id_materia: materia,
      id_bloque: blockId,
    });
  }
  async function publicSnapshot() {
    const result: Record<string, unknown> = {};
    for (const table of ['sesion', 'bloque_horario', 'reserva_bloque']) {
      const found = await admin.query('SELECT to_regclass($1) AS name', [
        `public.${table}`,
      ]);
      if (found.rows[0].name)
        result[table] = (
          await admin.query(
            `SELECT md5(COALESCE(jsonb_agg(j ORDER BY j::text)::text, '[]')) AS hash FROM (SELECT to_jsonb(t) AS j FROM public.${table} t) s`,
          )
        ).rows;
    }
    return result;
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
      .sort())
      await admin.query(
        readFileSync(join(migrations, directory, 'migration.sql'), 'utf8'),
      );
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
  });
  afterEach(() => jest.restoreAllMocks());
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

  async function fixture(
    state: sesion_estado_sesion_enum = 'PENDIENTE',
    day = '2099-06-20',
  ) {
    return prisma.sesion.create({
      data: {
        id_tutor: BigInt(tutor),
        id_tutee: BigInt(tutee),
        id_materia: BigInt(materia),
        id_bloque: 9007199254741000n,
        estado_sesion: state,
        inicio: new Date(`${day}T10:00:00.000Z`),
        fin: new Date(`${day}T11:00:00.000Z`),
        fecha_actualizacion: new Date('2020-01-01T00:00:00Z'),
      },
    });
  }
  function stateOf(id: bigint | string) {
    return prisma.sesion.findUniqueOrThrow({
      where: { id_sesion: BigInt(id) },
    });
  }

  it('no expone creación de bloques ni conserva su tabla', async () => {
    await request(app.getHttpServer())
      .post('/sessions/blocks')
      .send({})
      .expect(404);
    expect(
      (
        await admin.query('SELECT to_regclass($1) AS name', [
          `${schema}.bloque_horario`,
        ])
      ).rows[0].name,
    ).toBeNull();
  });
  it.each(['accept', 'reject', 'cancel'])(
    '%s exige JWT e identificador BigInt válido',
    async (action) => {
      await request(app.getHttpServer())
        .patch(`/sessions/1/${action}`)
        .expect(401);
      for (const invalid of [
        randomUUID(),
        '0',
        '-1',
        '1.5',
        '9223372036854775808',
      ])
        await act(invalid, action).expect(400);
      await act('9223372036854775807', action).expect(404);
    },
  );
  it.each([
    ['firma', {}, 'x'.repeat(64)],
    ['expirado', { exp: 1 }, secret],
    ['sin expiración', { exp: undefined }, secret],
    ['emisor', { iss: 'otro' }, secret],
    ['audiencia', { aud: 'otro' }, secret],
    ['sub numérico', { sub: 2 }, secret],
    ['sub fuera de rango', { sub: '9223372036854775808' }, secret],
  ])('rechaza JWT inválido: %s', async (_name, claims, signingSecret) => {
    await request(app.getHttpServer())
      .patch('/sessions/1/accept')
      .set('Authorization', `Bearer ${token(tutor, claims, signingSecret)}`)
      .expect(401);
  });
  it.each(['id_tutor', 'id_tutee', 'id_materia', 'id_bloque'])(
    'valida el identificador %s',
    async (field) => {
      for (const invalid of [
        2,
        '0',
        randomUUID(),
        '9223372036854775808',
        undefined,
      ]) {
        await request(app.getHttpServer())
          .post('/sessions')
          .send({
            id_tutee: tutee,
            id_tutor: tutor,
            id_materia: materia,
            id_bloque: '12',
            [field]: invalid,
          })
          .expect(400);
      }
    },
  );
  it.each(['accept', 'reject'])(
    '%s solo permite al tutor aunque se suplante el body',
    async (action) => {
      const session = await fixture();
      await act(session.id_sesion, action, tutee).expect(403);
      await act(session.id_sesion, action, outsider)
        .send({ id_usuario: tutor })
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
    await act((await fixture(state)).id_sesion, 'cancel').expect(409);
  });
  it.each([tutor, tutee])(
    'permite cancelar antes del inicio al participante %s',
    async (user) => {
      await act((await fixture('CONFIRMADA')).id_sesion, 'cancel', user).expect(
        200,
      );
    },
  );
  it('impide cancelar a terceros o después del inicio; usa el instante UTC de la sesión', async () => {
    const session = await fixture('CONFIRMADA', '2020-01-01');
    await act(session.id_sesion, 'cancel', outsider).expect(403);
    await act(session.id_sesion, 'cancel').expect(409);
  });
  it('actualiza fecha_actualizacion y excluye la propia solicitud al aceptar', async () => {
    const session = await fixture();
    await act(session.id_sesion, 'accept').expect(200);
    expect(
      (await stateOf(session.id_sesion)).fecha_actualizacion.getTime(),
    ).toBeGreaterThan(session.fecha_actualizacion.getTime());
  });
  it.each(['PENDIENTE', 'CONFIRMADA', 'PENDIENTE_CIERRE'] as const)(
    'impide aceptar cuando otra sesión %s se superpone',
    async (state) => {
      const session = await fixture();
      await fixture(state);
      await act(session.id_sesion, 'accept').expect(409);
    },
  );
  it('permite horarios adyacentes e ignora estados finales', async () => {
    const session = await fixture();
    await fixture('RECHAZADA');
    const adjacent = await fixture('CONFIRMADA');
    await prisma.sesion.update({
      where: { id_sesion: adjacent.id_sesion },
      data: {
        inicio: session.fin,
        fin: new Date(session.fin.getTime() + 3600000),
      },
    });
    await act(session.id_sesion, 'accept').expect(200);
  });
  it('aceptar y rechazar simultáneamente permite una sola transición', async () => {
    const session = await fixture();
    const responses = await Promise.all([
      act(session.id_sesion, 'accept'),
      act(session.id_sesion, 'reject'),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(['CONFIRMADA', 'RECHAZADA']).toContain(
      (await stateOf(session.id_sesion)).estado_sesion,
    );
  });
  it('dos cancelaciones simultáneas permiten una sola transición', async () => {
    const session = await fixture('CONFIRMADA');
    const results = await Promise.all([
      act(session.id_sesion, 'cancel'),
      act(session.id_sesion, 'cancel', tutee),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });
  it('expira; repetir no altera el resultado', async () => {
    const session = await fixture();
    await prisma.sesion.update({
      where: { id_sesion: session.id_sesion },
      data: { fecha_creacion: new Date('2020-01-01') },
    });
    await service.handleExpiredSessions();
    const saved = await stateOf(session.id_sesion);
    expect(saved.estado_sesion).toBe('EXPIRADA');
    await service.handleExpiredSessions();
    expect(await stateOf(session.id_sesion)).toEqual(saved);
  });
  it('aceptar y expirar no sobrescriben al ganador', async () => {
    const session = await fixture();
    await prisma.sesion.update({
      where: { id_sesion: session.id_sesion },
      data: { fecha_creacion: new Date('2020-01-01') },
    });
    const [result] = await Promise.all([
      act(session.id_sesion, 'accept'),
      service.handleExpiredSessions(),
    ]);
    const saved = await stateOf(session.id_sesion);
    expect(['CONFIRMADA', 'EXPIRADA']).toContain(saved.estado_sesion);
    expect(result.status).toBe(
      saved.estado_sesion === 'CONFIRMADA' ? 200 : 409,
    );
  });
  it('limita reintentos de conflictos serializables', async () => {
    const session = await fixture();
    const spy = jest.spyOn(prisma, '$transaction').mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2034',
        clientVersion: '7',
      }),
    );
    await act(session.id_sesion, 'accept').expect(409);
    expect(spy).toHaveBeenCalledTimes(3);
  });
  it('reintenta conflictos y confirma cuando desaparecen', async () => {
    const session = await fixture();
    const spy = jest.spyOn(prisma, '$transaction').mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2034',
        clientVersion: '7',
      }),
    );
    await act(session.id_sesion, 'accept').expect(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('mantiene pendiente la creación sin inventar un horario de bloque', async () => {
    await create('4').expect(503);
    expect(await prisma.sesion.count()).toBe(0);
  });
  it('devuelve únicamente los datos de la sesión con BigInt como texto', async () => {
    const session = await fixture();
    const result = await act(session.id_sesion, 'accept').expect(200);
    expect(result.body).toMatchObject({
      id_sesion: session.id_sesion.toString(),
      id_tutor: tutor,
      id_tutee: tutee,
      id_materia: materia,
      id_bloque: '9007199254741000',
      estado_sesion: 'CONFIRMADA',
    });
    expect(result.body.estado_reserva).toBeUndefined();
  });
  it('rechaza una solicitud pendiente como tutor', async () => {
    const session = await fixture();
    await act(session.id_sesion, 'reject').expect(200);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe('RECHAZADA');
  });
  it('detiene el retiro del registro de reservas si hay datos', async () => {
    const guarded = `${schema}_guard`;
    const migrations = join(__dirname, '../prisma/migrations');
    const directories = readdirSync(migrations)
      .filter((name) => /^\d/.test(name))
      .sort();
    await admin.query(`CREATE SCHEMA "${guarded}"`);
    try {
      await admin.query(`SET search_path TO "${guarded}", public`);
      for (const directory of directories.slice(0, -1))
        await admin.query(
          readFileSync(join(migrations, directory, 'migration.sql'), 'utf8'),
        );
      await admin.query(
        'INSERT INTO reserva_bloque(id, id_bloque, id_tutor, id_materia) VALUES ($1, 1, 2, 3)',
        [randomUUID()],
      );
      await expect(
        admin.query(
          readFileSync(
            join(migrations, directories.at(-1)!, 'migration.sql'),
            'utf8',
          ),
        ),
      ).rejects.toThrow('Retiro detenido');
      await admin.query('ROLLBACK');
      expect(
        (await admin.query('SELECT count(*)::int AS count FROM reserva_bloque'))
          .rows[0].count,
      ).toBe(1);
    } finally {
      await admin.query('ROLLBACK');
      await admin.query(`SET search_path TO "${schema}", public`);
      await admin.query(`DROP SCHEMA "${guarded}" CASCADE`);
    }
  });
});
