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
import { BlockReservationsService } from '../src/integrations/materias-tutores/block-reservations.service';
import { HttpBlocksGateway } from '../src/integrations/materias-tutores/http-blocks.gateway';
import { MateriasTutoresStub } from './support/materias-tutores.stub';

// PostgreSQL real en esquema aislado y HTTP real contra un proveedor simulado.
describe('Sesiones y contrato de materias-tutores', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: Client;
  let service: SessionsService;
  let reservations: BlockReservationsService;
  const schema = `test_sessions_${randomUUID().replaceAll('-', '')}`;
  const secret = randomBytes(32).toString('hex');
  const internalToken = randomBytes(32).toString('hex');
  const remote = new MateriasTutoresStub(internalToken);
  const jwt = new JwtService({ secret });
  const tutor = '9007199254740993';
  const tutee = '9007199254740995';
  const outsider = '9007199254740997';
  const materia = '9007199254740999';
  let publicBefore: unknown;
  let baseUrl: string;

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
    baseUrl = await remote.start();
    const module = await Test.createTestingModule({ imports: [SessionsModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          JWT_SECRET: secret,
          MATERIAS_TUTORES_URL: baseUrl,
          MATERIAS_TUTORES_TOKEN: internalToken,
          MATERIAS_TUTORES_TIMEOUT_MS: 500,
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
    reservations = app.get(BlockReservationsService);
  }, 30000);
  beforeEach(async () => {
    await prisma.sesion.deleteMany();
    await prisma.reserva_bloque.deleteMany();
    remote.reset();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    try {
      await app?.close();
      await remote.close();
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
    const block = remote.addBlock(tutor, materia, day);
    const reservation = await prisma.reserva_bloque.create({
      data: {
        id: randomUUID(),
        id_bloque: BigInt(block.id_bloque),
        id_tutor: BigInt(tutor),
        id_materia: BigInt(materia),
        estado: 'ASOCIADA',
      },
    });
    remote.reservations.set(reservation.id, {
      id_bloque: block.id_bloque,
      estado: 'RESERVADA',
    });
    return prisma.sesion.create({
      data: {
        id_tutor: BigInt(tutor),
        id_tutee: BigInt(tutee),
        id_materia: BigInt(materia),
        id_bloque: BigInt(block.id_bloque),
        id_reserva: reservation.id,
        estado_sesion: state,
        inicio: new Date(block.inicio),
        fin: new Date(block.fin),
        fecha_actualizacion: new Date('2020-01-01T00:00:00Z'),
      },
    });
  }
  function stateOf(id: bigint | string) {
    return prisma.sesion.findUniqueOrThrow({
      where: { id_sesion: BigInt(id) },
      include: { reserva: true },
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
  it('crea por HTTP, acepta y cancela con identificadores sin pérdida de precisión', async () => {
    const block = remote.addBlock(tutor, materia);
    const response = await create(block.id_bloque).expect(201);
    expect(response.body).toMatchObject({
      id_tutor: tutor,
      id_tutee: tutee,
      id_materia: materia,
      id_bloque: block.id_bloque,
      estado_sesion: 'PENDIENTE',
      estado_reserva: 'RESERVADA',
    });
    expect(typeof response.body.id_sesion).toBe('string');
    await act(response.body.id_sesion, 'accept').expect(200);
    const cancelled = await act(
      response.body.id_sesion,
      'cancel',
      tutee,
    ).expect(200);
    expect(cancelled.body).toMatchObject({
      estado_sesion: 'CANCELADA',
      estado_reserva: 'LIBERADA',
    });
    expect(remote.calls.map((call) => call.state)).toEqual([
      'RESERVADA',
      'LIBERADA',
    ]);
  });
  it.each(['id_tutor', 'id_tutee', 'id_materia', 'id_bloque'])(
    'valida %s antes de llamar al proveedor',
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
      expect(remote.calls).toHaveLength(0);
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
  it('impide cancelar a terceros o después del inicio; usa el instante UTC de la reserva', async () => {
    const session = await fixture('CONFIRMADA', '2020-01-01');
    await act(session.id_sesion, 'cancel', outsider).expect(403);
    await act(session.id_sesion, 'cancel').expect(409);
    expect(remote.calls).toHaveLength(0);
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
    const saved = await stateOf(session.id_sesion);
    expect(remote.reservations.get(saved.id_reserva)?.estado).toBe(
      saved.estado_sesion === 'CONFIRMADA' ? 'RESERVADA' : 'LIBERADA',
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
  it('expira y libera; repetir no altera el resultado', async () => {
    const session = await fixture();
    await prisma.sesion.update({
      where: { id_sesion: session.id_sesion },
      data: { fecha_creacion: new Date('2020-01-01') },
    });
    await service.handleExpiredSessions();
    const saved = await stateOf(session.id_sesion);
    expect(saved.estado_sesion).toBe('EXPIRADA');
    expect(saved.reserva.estado).toBe('LIBERADA');
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
  it('con tres pendientes y dos solicitudes simultáneas solo crea la cuarta y compensa la otra', async () => {
    for (const day of ['2099-06-20', '2099-06-21', '2099-06-22'])
      await fixture('PENDIENTE', day);
    const blocks = ['2099-06-23', '2099-06-24'].map((day) =>
      remote.addBlock(tutor, materia, day),
    );
    const results = await Promise.all(
      blocks.map((block) => create(block.id_bloque)),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await prisma.sesion.count()).toBe(4);
    expect(
      [...remote.reservations.values()].filter((r) => r.estado === 'LIBERADA'),
    ).toHaveLength(1);
  });
  it('impide crear solicitudes superpuestas simultáneas y compensa la perdedora', async () => {
    const a = remote.addBlock(tutor, materia);
    const b = remote.addBlock(tutor, materia, '2099-06-20', '10:30', '11:30');
    const results = await Promise.all([
      create(a.id_bloque),
      create(b.id_bloque, outsider),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await prisma.sesion.count()).toBe(1);
  });
  it.each([404, 409, 500])(
    'maneja error remoto %s sin crear sesiones',
    async (status) => {
      remote.reserveStatus = status;
      await create(remote.addBlock(tutor, materia).id_bloque).expect(
        status === 500 ? 503 : status,
      );
      expect(await prisma.sesion.count()).toBe(0);
    },
  );
  it('compensa una reserva con respuesta inválida', async () => {
    remote.invalidSchedule = true;
    await create(remote.addBlock(tutor, materia).id_bloque).expect(502);
    expect(await prisma.sesion.count()).toBe(0);
    expect([...remote.reservations.values()][0].estado).toBe('LIBERADA');
  });
  it('compensa cuando el proveedor reservó pero se perdió la respuesta', async () => {
    remote.loseReserveResponse = true;
    await create(remote.addBlock(tutor, materia).id_bloque).expect(503);
    expect(await prisma.sesion.count()).toBe(0);
    expect([...remote.reservations.values()][0].estado).toBe('LIBERADA');
  });
  it('no libera una reserva ajena al fallar por bloque ocupado', async () => {
    const session = await fixture();
    await create(session.id_bloque.toString(), outsider).expect(409);
    expect(remote.reservations.get(session.id_reserva)?.estado).toBe(
      'RESERVADA',
    );
  });
  it('persiste la liberación durante una caída y un nuevo worker la reintenta', async () => {
    const session = await fixture('CONFIRMADA');
    remote.releaseStatus = 503;
    const response = await act(session.id_sesion, 'cancel').expect(200);
    expect(response.body.estado_reserva).toBe('LIBERACION_PENDIENTE');
    expect((await stateOf(session.id_sesion)).reserva.intentos).toBe(1);
    remote.releaseStatus = 204;
    await prisma.reserva_bloque.update({
      where: { id: session.id_reserva },
      data: { proximo_intento: new Date(0) },
    });
    const restarted = new BlockReservationsService(
      prisma as PrismaService,
      new HttpBlocksGateway(
        new ConfigService({
          MATERIAS_TUTORES_URL: baseUrl,
          MATERIAS_TUTORES_TOKEN: internalToken,
        }),
      ),
    );
    await restarted.retryPendingReleases();
    expect((await stateOf(session.id_sesion)).reserva.estado).toBe('LIBERADA');
  });
  it('un 404 al liberar no confirma la liberación', async () => {
    const session = await fixture();
    remote.releaseStatus = 404;
    await act(session.id_sesion, 'reject').expect(200);
    expect((await stateOf(session.id_sesion)).reserva.estado).toBe('LIBERAR');
  });
  it('recupera reservas huérfanas después de una caída sin tocar las asociadas', async () => {
    const associated = await fixture();
    const prepared = await reservations.prepare({
      id_bloque: 42n,
      id_tutor: BigInt(tutor),
      id_materia: BigInt(materia),
    });
    remote.reservations.set(prepared.id, {
      id_bloque: '42',
      estado: 'RESERVADA',
    });
    await prisma.reserva_bloque.updateMany({
      data: { fecha_creacion: new Date(0) },
    });
    await reservations.retryPendingReleases();
    expect(remote.reservations.get(prepared.id)?.estado).toBe('LIBERADA');
    expect(remote.reservations.get(associated.id_reserva)?.estado).toBe(
      'RESERVADA',
    );
  });
  it('la compensación no libera si el commit ya asoció la reserva', async () => {
    const session = await fixture();
    await reservations.compensate(session.id_reserva);
    expect(remote.reservations.get(session.id_reserva)?.estado).toBe(
      'RESERVADA',
    );
    expect(remote.calls).toHaveLength(0);
  });
  it('la liberación preventiva impide reservar después de un timeout', async () => {
    remote.delayedReserveMs = 700;
    await create(remote.addBlock(tutor, materia).id_bloque).expect(503);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(await prisma.sesion.count()).toBe(0);
    expect([...remote.reservations.values()][0].estado).toBe('LIBERADA');
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
  it('sin configuración falla antes de escribir una reserva', async () => {
    const unconfigured = new BlockReservationsService(
      prisma as PrismaService,
      new HttpBlocksGateway(new ConfigService({})),
    );
    await expect(
      unconfigured.prepare({ id_bloque: 1n, id_tutor: 2n, id_materia: 3n }),
    ).rejects.toMatchObject({ status: 503 });
    expect(await prisma.reserva_bloque.count()).toBe(0);
  });
  it('la migración se detiene sin borrar bloques antiguos con datos', async () => {
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
      await admin.query(`INSERT INTO bloque_horario(id_tutor, dia, hora_inicio, hora_fin)
        VALUES (2, '2099-06-20', '10:00', '11:00')`);
      await expect(
        admin.query(
          readFileSync(
            join(migrations, directories.at(-1)!, 'migration.sql'),
            'utf8',
          ),
        ),
      ).rejects.toThrow('Migración detenida');
      await admin.query('ROLLBACK');
      expect(
        (await admin.query('SELECT count(*)::int AS count FROM bloque_horario'))
          .rows[0].count,
      ).toBe(1);
    } finally {
      await admin.query('ROLLBACK');
      await admin.query(`SET search_path TO "${schema}", public`);
      await admin.query(`DROP SCHEMA "${guarded}" CASCADE`);
    }
  });
  it('si falla el commit local, compensa la reserva remota sin crear una sesión', async () => {
    jest
      .spyOn(prisma, '$transaction')
      .mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('conflict', {
          code: 'P2034',
          clientVersion: '7',
        }),
      );
    await create(remote.addBlock(tutor, materia).id_bloque).expect(409);
    expect(await prisma.sesion.count()).toBe(0);
    expect([...remote.reservations.values()][0].estado).toBe('LIBERADA');
  });
  it('revierte el rechazo si no puede guardar la liberación durable', async () => {
    const session = await fixture();
    await admin.query(
      `ALTER TABLE "${schema}".reserva_bloque ADD CONSTRAINT prevent_release CHECK (estado <> 'LIBERAR') NOT VALID`,
    );
    try {
      await expect(
        service.rejectSession(session.id_sesion.toString(), tutor),
      ).rejects.toThrow();
      expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
        'PENDIENTE',
      );
      expect(remote.calls).toHaveLength(0);
    } finally {
      await admin.query(
        `ALTER TABLE "${schema}".reserva_bloque DROP CONSTRAINT prevent_release`,
      );
    }
  });
  it('dos workers pueden liberar la misma operación sin liberar otra reserva del bloque', async () => {
    const session = await fixture();
    await prisma.reserva_bloque.update({
      where: { id: session.id_reserva },
      data: { estado: 'LIBERAR' },
    });
    await Promise.all([
      reservations.tryRelease(session.id_reserva),
      reservations.tryRelease(session.id_reserva),
    ]);
    const newId = randomUUID();
    remote.reservations.set(newId, {
      id_bloque: session.id_bloque.toString(),
      estado: 'RESERVADA',
    });
    const gateway = new HttpBlocksGateway(
      new ConfigService({
        MATERIAS_TUTORES_URL: baseUrl,
        MATERIAS_TUTORES_TOKEN: internalToken,
      }),
    );
    await gateway.release({
      id: session.id_reserva,
      id_bloque: session.id_bloque,
      id_tutor: session.id_tutor,
      id_materia: session.id_materia,
    });
    expect(remote.reservations.get(newId)?.estado).toBe('RESERVADA');
  });
});
