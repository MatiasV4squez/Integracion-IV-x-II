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
import { Prisma, PrismaClient, type sesion_estado_sesion_enum } from '../src/generated/prisma/client';
import { SessionsModule } from '../src/sessions/sessions.module';
import { SessionsService } from '../src/sessions/sessions.service';
import { ReputacionIntegracionService } from '../src/sessions/reputacion-integracion.service';

// Pruebas de sesiones y JWT con PostgreSQL real en un esquema aislado.
describe('Aceptar, rechazar y cancelar sesiones', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: Client;
  let service: SessionsService;
  let integracion: ReputacionIntegracionService;
  let configuracion: ConfigService;
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
        roles: sub === tutor ? ['TUTOR'] : ['TUTEE'],
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
  function declare(
    id: string | bigint,
    body: Record<string, unknown>,
    user = tutor,
  ) {
    return request(app.getHttpServer())
      .post(`/sessions/${id}/closure-declarations`)
      .set('Authorization', `Bearer ${token(user)}`)
      .send(body);
  }
  function calificar(
    id: string | bigint,
    puntuacion: unknown,
    usuario = tutee,
  ) {
    return request(app.getHttpServer())
      .post(`/sessions/${id}/ratings`)
      .set('Authorization', `Bearer ${token(usuario)}`)
      .send({ puntuacion });
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
    for (const table of [
      'sesion',
      'bloque_horario',
      'reserva_bloque',
      'declaracion_cierre',
      'resolucion_conflicto_sesion',
      'calificacion',
      'entrega_reputacion_tutor',
    ]) {
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
    integracion = app.get(ReputacionIntegracionService);
    configuracion = app.get(ConfigService);
  }, 30000);
  beforeEach(async () => {
    await prisma.entrega_reputacion_tutor.deleteMany();
    await prisma.calificacion.deleteMany();
    await prisma.resolucion_conflicto_sesion.deleteMany();
    await prisma.declaracion_cierre.deleteMany();
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
    estudiante = tutee,
    docente = tutor,
  ) {
    return prisma.sesion.create({
      data: {
        id_tutor: BigInt(docente),
        id_tutee: BigInt(estudiante),
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

  it('solo los participantes pueden calificar una sesión completada', async () => {
    const completada = await fixture('COMPLETADA');
    const pendiente = await fixture('PENDIENTE_CIERRE');
    const conflicto = await fixture('EN_CONFLICTO');
    await request(app.getHttpServer())
      .post(`/sessions/${completada.id_sesion}/ratings`)
      .send({ puntuacion: 4 })
      .expect(401);
    await calificar(completada.id_sesion, 4, outsider).expect(403);
    await calificar(pendiente.id_sesion, 4).expect(409);
    await calificar(conflicto.id_sesion, 4).expect(409);
    await calificar('9223372036854775807', 4).expect(404);
    expect(await prisma.calificacion.count()).toBe(0);
  });

  it('valida la escala entera y rechaza datos de evaluador enviados por el cliente', async () => {
    const sesion = await fixture('COMPLETADA');
    for (const puntuacion of [0, 6, 2.5, '4', null]) {
      await calificar(sesion.id_sesion, puntuacion).expect(400);
    }
    await request(app.getHttpServer())
      .post(`/sessions/${sesion.id_sesion}/ratings`)
      .set('Authorization', `Bearer ${token(tutee)}`)
      .send({ puntuacion: 4, id_evaluado: outsider })
      .expect(400);
    expect(await prisma.calificacion.count()).toBe(0);
  });

  it('registra ambas calificaciones, conserva su unicidad y las muestra en el historial', async () => {
    const sesion = await fixture('COMPLETADA');
    const primera = await calificar(sesion.id_sesion, 4).expect(201);
    expect(primera.body.calificacion).toMatchObject({
      id_sesion: sesion.id_sesion.toString(),
      id_evaluador: tutee,
      id_evaluado: tutor,
      puntuacion: 4,
    });
    expect(primera.body.reputacion_tutor).toMatchObject({
      id_tutor: tutor,
      cantidad_calificaciones: 1,
      promedio: 4,
      requiere_revision: false,
    });
    await calificar(sesion.id_sesion, 2, tutor).expect(201);
    await calificar(sesion.id_sesion, 5).expect(409);
    expect(await prisma.calificacion.count()).toBe(2);
    const registros = await prisma.calificacion.findMany({
      where: { id_sesion: sesion.id_sesion },
      orderBy: { id_evaluador: 'asc' },
    });
    expect(registros.map((registro) => registro.id_evaluado)).toEqual([
      BigInt(tutee),
      BigInt(tutor),
    ]);
    expect(registros.map((registro) => registro.puntuacion).sort()).toEqual([
      2, 4,
    ]);
    const historial = await request(app.getHttpServer())
      .get('/sessions/history')
      .set('Authorization', `Bearer ${token(tutee)}`)
      .expect(200);
    const sesionHistorial = historial.body.find(
      (item: { id_sesion: string }) =>
        item.id_sesion === sesion.id_sesion.toString(),
    );
    expect(sesionHistorial.calificaciones).toHaveLength(2);
  });

  it('calcula reputación solo con notas recibidas como tutor y detecta el umbral', async () => {
    const inicial = await request(app.getHttpServer())
      .get(`/sessions/tutors/${tutor}/reputation`)
      .expect(200);
    expect(inicial.body).toMatchObject({
      cantidad_calificaciones: 0,
      promedio: null,
      requiere_revision: false,
    });
    for (const puntuacion of [2, 2, 3]) {
      const sesion = await fixture('COMPLETADA');
      await calificar(sesion.id_sesion, puntuacion).expect(201);
      await calificar(sesion.id_sesion, 1, tutor).expect(201);
    }
    const comoEstudiante = await fixture(
      'COMPLETADA',
      '2099-06-20',
      tutor,
      outsider,
    );
    await calificar(comoEstudiante.id_sesion, 1, outsider).expect(201);
    const reputacion = await request(app.getHttpServer())
      .get(`/sessions/tutors/${tutor}/reputation`)
      .expect(200);
    expect(reputacion.body.cantidad_calificaciones).toBe(3);
    expect(reputacion.body.promedio).toBeCloseTo(7 / 3);
    expect(reputacion.body.requiere_revision).toBe(true);
    const cuarta = await fixture('COMPLETADA');
    await calificar(cuarta.id_sesion, 5).expect(201);
    const recuperada = await request(app.getHttpServer())
      .get(`/sessions/tutors/${tutor}/reputation`)
      .expect(200);
    expect(recuperada.body).toMatchObject({
      cantidad_calificaciones: 4,
      promedio: 3,
      requiere_revision: false,
    });
  });

  it('dos calificaciones simultáneas del mismo participante solo crean una', async () => {
    const sesion = await fixture('COMPLETADA');
    const respuestas = await Promise.all([
      calificar(sesion.id_sesion, 1),
      calificar(sesion.id_sesion, 5),
    ]);
    expect(respuestas.map((respuesta) => respuesta.status).sort()).toEqual([
      201, 409,
    ]);
    const puntuacionGanadora = respuestas.find(
      (respuesta) => respuesta.status === 201,
    )!.body.calificacion.puntuacion;
    const registro = await prisma.calificacion.findUniqueOrThrow({
      where: {
        id_sesion_id_evaluador: {
          id_sesion: sesion.id_sesion,
          id_evaluador: BigInt(tutee),
        },
      },
    });
    expect(registro.puntuacion).toBe(puntuacionGanadora);
    expect(await prisma.calificacion.count()).toBe(1);
  });

  it('envía al otro micro solo las notas recibidas como tutor', async () => {
    jest.spyOn(configuracion, 'get').mockImplementation((clave) => {
      if (clave === 'MATERIAS_TUTORES_URL') return 'http://127.0.0.1:3001';
      if (clave === 'INTEGRACION_SECRET') return secret;
      return clave === 'JWT_SECRET' ? secret : undefined;
    });
    const enviar = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, status: 201 } as Response);
    const sesion = await fixture('COMPLETADA');
    const respuesta = await calificar(sesion.id_sesion, 5).expect(201);
    const idCalificacion = respuesta.body.calificacion.id_calificacion;
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(String(enviar.mock.calls[0][0])).toBe(
      `http://127.0.0.1:3001/integraciones/tutores/${tutor}/calificaciones`,
    );
    expect(enviar.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      redirect: 'error',
      headers: {
        'Content-Type': 'application/json',
        'X-Integracion-Secret': secret,
      },
      body: JSON.stringify({
        idCalificacion,
        puntuacion: 5,
        rolEvaluado: 'TUTOR',
      }),
    });
    const entrega = await prisma.entrega_reputacion_tutor.findUniqueOrThrow({
      where: { id_calificacion: BigInt(idCalificacion) },
    });
    expect(entrega.fecha_entrega).toBeInstanceOf(Date);
    await calificar(sesion.id_sesion, 2, tutor).expect(201);
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(await prisma.entrega_reputacion_tutor.count()).toBe(1);
  });

  it('conserva y reintenta la entrega cuando materias-tutores falla', async () => {
    jest.spyOn(configuracion, 'get').mockImplementation((clave) => {
      if (clave === 'MATERIAS_TUTORES_URL') return 'http://127.0.0.1:3001';
      if (clave === 'INTEGRACION_SECRET') return secret;
      return clave === 'JWT_SECRET' ? secret : undefined;
    });
    const enviar = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      .mockResolvedValueOnce({ ok: true, status: 201 } as Response);
    const sesion = await fixture('COMPLETADA');
    await calificar(sesion.id_sesion, 4).expect(201);
    expect(await prisma.calificacion.count()).toBe(1);
    const pendiente = await prisma.entrega_reputacion_tutor.findFirstOrThrow();
    expect(pendiente.fecha_entrega).toBeNull();
    expect(pendiente.intentos).toBe(1);

    await integracion.reenviarPendientes();
    const entregada = await prisma.entrega_reputacion_tutor.findFirstOrThrow();
    expect(entregada.fecha_entrega).toBeInstanceOf(Date);
    expect(entregada.intentos).toBe(2);
    expect(enviar).toHaveBeenCalledTimes(2);
    await integracion.reenviarPendientes();
    expect(enviar).toHaveBeenCalledTimes(2);
  });

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
  it('retira la ruta de estado que aceptaba id_tutor desde el cuerpo', async () => {
    const session = await fixture();
    await request(app.getHttpServer())
      .patch(`/sessions/${session.id_sesion}/status`)
      .set('Authorization', `Bearer ${token(outsider)}`)
      .send({ id_tutor: tutor, estado: 'RECHAZADA' })
      .expect(404);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe('PENDIENTE');
  });
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
  it('pasa a pendiente de cierre una sesión confirmada cuyo horario terminó', async () => {
    const session = await fixture('CONFIRMADA', '2020-01-01');

    await service.handleFinishedSessions();

    const updated = await stateOf(session.id_sesion);
    expect(updated.estado_sesion).toBe('PENDIENTE_CIERRE');
    expect(updated.fecha_actualizacion.getTime()).toBeGreaterThan(
      session.fecha_actualizacion.getTime(),
    );
  });
  it('mantiene confirmada una sesión cuyo horario aún no termina', async () => {
    const session = await fixture('CONFIRMADA');

    await service.handleFinishedSessions();

    expect(await stateOf(session.id_sesion)).toEqual(session);
  });
  it.each(['CANCELADA', 'PENDIENTE'] as const)(
    'no cambia una sesión %s aunque su horario haya terminado',
    async (state) => {
      const session = await fixture(state, '2020-01-01');

      await service.handleFinishedSessions();

      expect(await stateOf(session.id_sesion)).toEqual(session);
    },
  );
  it('repetir el cierre no vuelve a modificar la sesión', async () => {
    const session = await fixture('CONFIRMADA', '2020-01-01');

    await service.handleFinishedSessions();
    const closed = await stateOf(session.id_sesion);
    await service.handleFinishedSessions();

    expect(await stateOf(session.id_sesion)).toEqual(closed);
  });
  it('guarda una declaración por participante y conserva PENDIENTE_CIERRE hasta la segunda', async () => {
    const session = await fixture('PENDIENTE_CIERRE');
    const response = await declare(session.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    expect(response.body.sesion).toMatchObject({
      id_sesion: session.id_sesion.toString(),
      estado_sesion: 'PENDIENTE_CIERRE',
      resultado_provisional: false,
    });
    expect(response.body.declaracion).toMatchObject({
      id_usuario: tutor,
      resultado_declarado: 'COMPLETADA',
      id_usuario_inasistente: null,
    });
    await declare(session.id_sesion, {
      resultado_declarado: 'NO_REALIZADA',
    }).expect(409);
    expect(await prisma.declaracion_cierre.count()).toBe(1);
  });
  it.each(['COMPLETADA', 'NO_REALIZADA'] as const)(
    'dos declaraciones %s coincidentes cierran la sesión',
    async (outcome) => {
      const session = await fixture('PENDIENTE_CIERRE');
      await declare(session.id_sesion, { resultado_declarado: outcome }).expect(
        201,
      );
      const response = await declare(
        session.id_sesion,
        { resultado_declarado: outcome },
        tutee,
      ).expect(201);
      expect(response.body.sesion.estado_sesion).toBe(outcome);
      expect((await stateOf(session.id_sesion)).resultado_provisional).toBe(
        false,
      );
    },
  );
  it('solo cierra por inasistencia cuando ambas partes señalan a la misma persona', async () => {
    const session = await fixture('PENDIENTE_CIERRE');
    const body = {
      resultado_declarado: 'INASISTENCIA',
      id_usuario_inasistente: tutee,
    };
    await declare(session.id_sesion, body).expect(201);
    await declare(session.id_sesion, body, tutee).expect(201);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
      'INASISTENCIA',
    );
  });
  it('declaraciones diferentes dejan la sesión EN_CONFLICTO', async () => {
    const session = await fixture('PENDIENTE_CIERRE');
    await declare(session.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    await declare(
      session.id_sesion,
      { resultado_declarado: 'NO_REALIZADA' },
      tutee,
    ).expect(201);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
      'EN_CONFLICTO',
    );
    expect(await prisma.declaracion_cierre.count()).toBe(2);
  });
  it('dos declaraciones de inasistencia que acusan a personas distintas generan conflicto', async () => {
    const session = await fixture('PENDIENTE_CIERRE');
    await declare(session.id_sesion, {
      resultado_declarado: 'INASISTENCIA',
      id_usuario_inasistente: tutee,
    }).expect(201);
    await declare(
      session.id_sesion,
      { resultado_declarado: 'INASISTENCIA', id_usuario_inasistente: tutor },
      tutee,
    ).expect(201);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
      'EN_CONFLICTO',
    );
  });
  it('solo un administrador puede resolver una sesión en conflicto', async () => {
    const session = await fixture('EN_CONFLICTO');
    const ruta = `/sessions/${session.id_sesion}/resolve-conflict`;
    const cuerpo = {
      nuevo_estado: 'COMPLETADA',
      motivo_resolucion: 'Revisión de declaraciones',
    };

    await request(app.getHttpServer()).patch(ruta).send(cuerpo).expect(401);
    await request(app.getHttpServer())
      .patch(ruta)
      .set('Authorization', `Bearer ${token(tutor)}`)
      .send(cuerpo)
      .expect(403);
    await request(app.getHttpServer())
      .patch(ruta)
      .set('Authorization', `Bearer ${token(outsider, { roles: [123] })}`)
      .send(cuerpo)
      .expect(401);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
      'EN_CONFLICTO',
    );
    expect(await prisma.resolucion_conflicto_sesion.count()).toBe(0);
  });

  it('registra administrador, motivo y observaciones al resolver el conflicto', async () => {
    const session = await fixture('EN_CONFLICTO');
    const cuerpo = {
      nuevo_estado: 'COMPLETADA',
      motivo_resolucion: 'Revisión de declaraciones',
      observaciones: 'Coincide con la evidencia revisada',
    };
    const respuesta = await request(app.getHttpServer())
      .patch(`/sessions/${session.id_sesion}/resolve-conflict`)
      .set(
        'Authorization',
        `Bearer ${token(outsider, { roles: ['ADMINISTRADOR'] })}`,
      )
      .send(cuerpo)
      .expect(200);
    expect(respuesta.body.estado_sesion).toBe('COMPLETADA');
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe('COMPLETADA');
    const resolucion =
      await prisma.resolucion_conflicto_sesion.findUniqueOrThrow({
        where: { id_sesion: session.id_sesion },
      });
    expect(resolucion.id_administrador).toBe(BigInt(outsider));
    expect(resolucion.estado_final).toBe('COMPLETADA');
    expect(resolucion.motivo_resolucion).toBe(cuerpo.motivo_resolucion);
    expect(resolucion.observaciones).toBe(cuerpo.observaciones);
    expect(resolucion.fecha_resolucion).toBeInstanceOf(Date);
  });

  it('rechaza un segundo intento y conserva la primera resolución', async () => {
    const session = await fixture('EN_CONFLICTO');
    const ruta = `/sessions/${session.id_sesion}/resolve-conflict`;
    const autorizacion = `Bearer ${token(outsider, { roles: ['ADMINISTRADOR'] })}`;
    await request(app.getHttpServer())
      .patch(ruta)
      .set('Authorization', autorizacion)
      .send({ nuevo_estado: 'COMPLETADA', motivo_resolucion: 'Primer motivo' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(ruta)
      .set('Authorization', autorizacion)
      .send({
        nuevo_estado: 'NO_REALIZADA',
        motivo_resolucion: 'Segundo motivo',
      })
      .expect(409);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe('COMPLETADA');
    expect(await prisma.resolucion_conflicto_sesion.count()).toBe(1);
    const resolucion =
      await prisma.resolucion_conflicto_sesion.findUniqueOrThrow({
        where: { id_sesion: session.id_sesion },
      });
    expect(resolucion.estado_final).toBe('COMPLETADA');
    expect(resolucion.motivo_resolucion).toBe('Primer motivo');
  });

  it('solo una de dos resoluciones simultáneas cambia el estado y crea auditoría', async () => {
    const session = await fixture('EN_CONFLICTO');
    const ruta = `/sessions/${session.id_sesion}/resolve-conflict`;
    const intentos = [
      {
        admin: outsider,
        estado: 'COMPLETADA',
        motivo: 'Revisión del administrador uno',
      },
      {
        admin: tutor,
        estado: 'NO_REALIZADA',
        motivo: 'Revisión del administrador dos',
      },
    ];
    const respuestas = await Promise.all(
      intentos.map((intento) =>
        request(app.getHttpServer())
          .patch(ruta)
          .set(
            'Authorization',
            `Bearer ${token(intento.admin, { roles: ['ADMIN'] })}`,
          )
          .send({
            nuevo_estado: intento.estado,
            motivo_resolucion: intento.motivo,
          }),
      ),
    );
    expect(respuestas.map((respuesta) => respuesta.status).sort()).toEqual([
      200, 409,
    ]);
    const ganador =
      intentos[respuestas.findIndex((respuesta) => respuesta.status === 200)];
    const resolucion =
      await prisma.resolucion_conflicto_sesion.findUniqueOrThrow({
        where: { id_sesion: session.id_sesion },
      });
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
      ganador.estado,
    );
    expect(resolucion.estado_final).toBe(ganador.estado);
    expect(resolucion.id_administrador).toBe(BigInt(ganador.admin));
    expect(resolucion.motivo_resolucion).toBe(ganador.motivo);
    expect(await prisma.resolucion_conflicto_sesion.count()).toBe(1);
  });
  it('rechaza resoluciones sin motivo válido y no registra una decisión', async () => {
    const session = await fixture('EN_CONFLICTO');
    const ruta = `/sessions/${session.id_sesion}/resolve-conflict`;
    const autorizacion = `Bearer ${token(outsider, { roles: ['ADMINISTRADOR'] })}`;
    for (const motivo_resolucion of ['', '   ', 'x'.repeat(501)]) {
      await request(app.getHttpServer())
        .patch(ruta)
        .set('Authorization', autorizacion)
        .send({ nuevo_estado: 'COMPLETADA', motivo_resolucion })
        .expect(400);
    }
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe(
      'EN_CONFLICTO',
    );
    expect(await prisma.resolucion_conflicto_sesion.count()).toBe(0);
  });
  it('rechaza declaraciones sin permiso, datos inválidos y estados ajenos al cierre', async () => {
    const session = await fixture('PENDIENTE_CIERRE');
    await request(app.getHttpServer())
      .post(`/sessions/${session.id_sesion}/closure-declarations`)
      .send({ resultado_declarado: 'COMPLETADA' })
      .expect(401);
    await declare(
      session.id_sesion,
      { resultado_declarado: 'COMPLETADA' },
      outsider,
    ).expect(403);
    for (const body of [
      {},
      { resultado_declarado: 'OTRA' },
      { resultado_declarado: 'COMPLETADA', id_usuario_inasistente: tutor },
      { resultado_declarado: 'INASISTENCIA' },
      { resultado_declarado: 'INASISTENCIA', id_usuario_inasistente: outsider },
      {
        resultado_declarado: 'INASISTENCIA',
        id_usuario_inasistente: '9223372036854775808',
      },
      { resultado_declarado: 'COMPLETADA', extra: true },
    ])
      await declare(session.id_sesion, body).expect(400);
    expect(await prisma.declaracion_cierre.count()).toBe(0);
    await declare((await fixture('CONFIRMADA')).id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(409);
    await declare('9223372036854775807', {
      resultado_declarado: 'COMPLETADA',
    }).expect(404);
  });
  it('acepta provisionalmente el primer resultado tras 48 horas sin respuesta', async () => {
    const session = await fixture('PENDIENTE_CIERRE');
    await declare(session.id_sesion, {
      resultado_declarado: 'NO_REALIZADA',
    }).expect(201);
    await prisma.declaracion_cierre.updateMany({
      where: { id_sesion: session.id_sesion },
      data: { fecha_declaracion: new Date('2020-01-01') },
    });
    await service.resolverDeclaracionesVencidas();
    const closed = await stateOf(session.id_sesion);
    expect(closed.estado_sesion).toBe('NO_REALIZADA');
    expect(closed.resultado_provisional).toBe(true);
    await service.resolverDeclaracionesVencidas();
    expect(await stateOf(session.id_sesion)).toEqual(closed);
    await declare(
      session.id_sesion,
      { resultado_declarado: 'COMPLETADA' },
      tutee,
    ).expect(409);
  });
  it('no resuelve provisionalmente antes de 48 horas ni sin declaración', async () => {
    const recent = await fixture('PENDIENTE_CIERRE');
    const empty = await fixture('PENDIENTE_CIERRE');
    await declare(recent.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    await service.resolverDeclaracionesVencidas();
    expect((await stateOf(recent.id_sesion)).estado_sesion).toBe(
      'PENDIENTE_CIERRE',
    );
    expect((await stateOf(empty.id_sesion)).estado_sesion).toBe(
      'PENDIENTE_CIERRE',
    );
  });
  it('dos participantes concurrentes dejan exactamente dos declaraciones y un resultado', async () => {
    const session = await fixture('PENDIENTE_CIERRE');
    const results = await Promise.all([
      declare(session.id_sesion, { resultado_declarado: 'COMPLETADA' }),
      declare(session.id_sesion, { resultado_declarado: 'COMPLETADA' }, tutee),
    ]);
    expect(results.map((result) => result.status)).toEqual([201, 201]);
    expect(await prisma.declaracion_cierre.count()).toBe(2);
    expect((await stateOf(session.id_sesion)).estado_sesion).toBe('COMPLETADA');
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
      const removalIndex = directories.findIndex((directory) =>
        directory.endsWith('_retirar_integracion_bloques'),
      );
      expect(removalIndex).toBeGreaterThan(0);
      for (const directory of directories.slice(0, removalIndex))
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
            join(migrations, directories[removalIndex], 'migration.sql'),
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
