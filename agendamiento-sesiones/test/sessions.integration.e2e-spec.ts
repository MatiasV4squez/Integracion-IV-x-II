import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import request from 'supertest';
import { getDatabaseUrl } from '../src/database/database.config';
import { PrismaService } from '../src/database/prisma.service';
import { Prisma, PrismaClient, type sesion_estado_sesion_enum } from '../src/generated/prisma/client';
import { SessionsModule } from '../src/sessions/infraestructura/sessions.module';
import { ProcesarSesiones } from '../src/sessions/aplicacion/casos-de-uso/procesar-sesiones';
import { EntregarReputacion } from '../src/sessions/aplicacion/casos-de-uso/entregar-reputacion';
import { LiberarBloques } from '../src/sessions/aplicacion/casos-de-uso/liberar-bloques';
import { EntregarAvisosModeracion } from '../src/sessions/aplicacion/casos-de-uso/entregar-avisos-moderacion';

// Pruebas de sesiones y JWT con PostgreSQL real en un esquema aislado.
describe('Aceptar, rechazar y cancelar sesiones', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let admin: Client;
  let service: ProcesarSesiones;
  let integracion: EntregarReputacion;
  let liberaciones: LiberarBloques;
  let entregasModeracion: EntregarAvisosModeracion;
  let configuracion: ConfigService;
  let servidorMaterias: Server;
  let urlMaterias: string;
  let estadoBloque: string;
  let errorConsulta: number;
  let errorReserva: number;
  let errorLiberacion: number;
  let tutorHabilitado: boolean;
  let operacionesBloques: string[];
  let errorModeracion: number;
  let avisosRecibidos: Array<{
    ruta: string;
    clave: string | string[] | undefined;
    cuerpo: Record<string, unknown>;
    estadoPersistido: string | undefined;
    avisoPersistido: boolean;
  }>;
  let avisosRegistrados: Map<string, Record<string, unknown>>;
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
    return request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${token(student)}`)
      .send({
        id_tutor: owner,
        id_materia: materia,
        id_bloque: blockId,
      });
  }

  function habilitarMaterias() {
    jest.spyOn(configuracion, 'get').mockImplementation((clave) => {
      if (clave === 'MATERIAS_TUTORES_URL') return urlMaterias;
      if (clave === 'INTEGRACION_SECRET') return secret;
      return clave === 'JWT_SECRET' ? secret : undefined;
    });
  }

  function habilitarModeracion() {
    jest.spyOn(configuracion, 'get').mockImplementation((clave) => {
      if (['MATERIAS_TUTORES_URL', 'REPORTES_MODERACION_URL'].includes(clave))
        return urlMaterias;
      if (
        [
          'INTEGRACION_SECRET',
          'MODERACION_INTEGRACION_SECRET',
          'JWT_SECRET',
        ].includes(clave)
      )
        return secret;
      return undefined;
    });
  }

  async function crearSesionReservada(
    estado: sesion_estado_sesion_enum = 'PENDIENTE',
  ) {
    habilitarMaterias();
    const respuesta = await create('4').expect(201);
    const id = BigInt(respuesta.body.id_sesion);
    if (estado !== 'PENDIENTE')
      await prisma.sesion.update({
        where: { id_sesion: id },
        data: { estado_sesion: estado },
      });
    return id;
  }

  function responder(
    respuesta: ServerResponse,
    estado: number,
    cuerpo: unknown,
  ) {
    respuesta.writeHead(estado, { 'Content-Type': 'application/json' });
    respuesta.end(JSON.stringify(cuerpo));
  }

  // Receptor HTTP local para los contratos de materias-tutores y moderación.
  async function atenderMaterias(
    solicitud: IncomingMessage,
    respuesta: ServerResponse,
  ) {
    const url = new URL(solicitud.url!, 'http://localhost');
    if (
      solicitud.method === 'POST' &&
      [
        '/integraciones/sesiones/conflictos',
        '/integraciones/sesiones/resoluciones',
      ].includes(url.pathname)
    ) {
      if (solicitud.headers['x-integracion-secret'] !== secret)
        return responder(respuesta, 401, {});
      let cuerpo = '';
      for await (const fragmento of solicitud) cuerpo += fragmento.toString();
      const datos = JSON.parse(cuerpo) as Record<string, unknown>;
      const avisoPersistido = await prisma.aviso_moderacion_sesion.findUnique({
        where: { id_aviso: BigInt(String(datos.id_aviso)) },
      });
      const sesionPersistida = await prisma.sesion.findUnique({
        where: { id_sesion: BigInt(String(datos.id_sesion)) },
      });
      const clave = solicitud.headers['idempotency-key'];
      avisosRecibidos.push({
        ruta: url.pathname,
        clave,
        cuerpo: datos,
        estadoPersistido: sesionPersistida?.estado_sesion,
        avisoPersistido: avisoPersistido !== null,
      });
      if (errorModeracion) return responder(respuesta, errorModeracion, {});
      avisosRegistrados.set(String(clave), datos);
      return responder(respuesta, 200, {});
    }
    if (solicitud.method === 'GET' && url.pathname === '/tutores') {
      if (errorConsulta) return responder(respuesta, errorConsulta, {});
      const items =
        tutorHabilitado && url.searchParams.get('materiaId') === materia
          ? [
              {
                idTutor: tutor,
                horariosDisponibles:
                  estadoBloque === 'DISPONIBLE'
                    ? [
                        {
                          idBloque: '4',
                          dia: '2099-06-20',
                          horaInicio: '10:00',
                          horaFin: '11:00',
                        },
                      ]
                    : [],
              },
            ]
          : [];
      return responder(respuesta, 200, {
        items,
        total: items.length,
        page: Number(url.searchParams.get('page')),
        limit: 100,
        totalPages: items.length ? 1 : 0,
      });
    }
    if (
      solicitud.method === 'PATCH' &&
      url.pathname === '/integraciones/bloques/4/estado'
    ) {
      if (solicitud.headers['x-integracion-secret'] !== secret)
        return responder(respuesta, 401, {});
      let cuerpo = '';
      for await (const fragmento of solicitud) cuerpo += fragmento.toString();
      const datos = JSON.parse(cuerpo) as { estado: string };
      operacionesBloques.push(datos.estado);
      const error =
        datos.estado === 'RESERVADO' ? errorReserva : errorLiberacion;
      if (error) return responder(respuesta, error, {});
      estadoBloque = datos.estado;
      return responder(respuesta, 200, { idBloque: '4', estadoBloque });
    }
    responder(respuesta, 404, {});
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
      'liberacion_bloque_sesion',
      'aviso_moderacion_sesion',
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
    service = app.get(ProcesarSesiones);
    integracion = app.get(EntregarReputacion);
    liberaciones = app.get(LiberarBloques);
    entregasModeracion = app.get(EntregarAvisosModeracion);
    configuracion = app.get(ConfigService);
    servidorMaterias = createServer((solicitud, respuesta) => {
      void atenderMaterias(solicitud, respuesta).catch(() =>
        responder(respuesta, 500, {}),
      );
    });
    await new Promise<void>((resolver) =>
      servidorMaterias.listen(0, '127.0.0.1', resolver),
    );
    const direccion = servidorMaterias.address();
    if (!direccion || typeof direccion === 'string')
      throw new Error('No se pudo iniciar el receptor HTTP de prueba.');
    urlMaterias = `http://127.0.0.1:${direccion.port}`;
  }, 30000);
  beforeEach(async () => {
    estadoBloque = 'DISPONIBLE';
    errorConsulta = errorReserva = errorLiberacion = 0;
    tutorHabilitado = true;
    operacionesBloques = [];
    errorModeracion = 0;
    avisosRecibidos = [];
    avisosRegistrados = new Map();
    await prisma.aviso_moderacion_sesion.deleteMany();
    await prisma.entrega_reputacion_tutor.deleteMany();
    await prisma.liberacion_bloque_sesion.deleteMany();
    await prisma.calificacion.deleteMany();
    await prisma.resolucion_conflicto_sesion.deleteMany();
    await prisma.declaracion_cierre.deleteMany();
    await prisma.sesion.deleteMany();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    try {
      await app?.close();
      if (servidorMaterias)
        await new Promise<void>((resolver, rechazar) =>
          servidorMaterias.close((error) =>
            error ? rechazar(error) : resolver(),
          ),
        );
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

  it('consulta las sesiones activas propias como estudiante, con orden estable y sin alterar el historial', async () => {
    const confirmada = await fixture('CONFIRMADA', '2099-06-21');
    const pendiente = await fixture('PENDIENTE', '2099-06-20');
    const porCerrar = await fixture('PENDIENTE_CIERRE', '2099-06-20');
    const conflicto = await fixture('EN_CONFLICTO', '2099-06-22');
    for (const estado of ['COMPLETADA', 'CANCELADA', 'RECHAZADA', 'EXPIRADA', 'NO_REALIZADA', 'INASISTENCIA'] as const)
      await fixture(estado);
    await fixture('CONFIRMADA', '2099-06-20', outsider);
    const comoTutor = await fixture('CONFIRMADA', '2099-06-20', outsider, tutee);

    const respuesta = await request(app.getHttpServer())
      .get(`/sessions/active?id_usuario=${outsider}&estado=COMPLETADA`)
      .set('Authorization', `Bearer ${token(tutee)}`)
      .expect(200);
    expect(respuesta.body.map((fila: { id_sesion: string }) => fila.id_sesion)).toEqual(
      [pendiente, porCerrar, confirmada, conflicto].map((fila) => fila.id_sesion.toString()),
    );
    expect(respuesta.body[0]).toMatchObject({
      id_tutee: tutee, id_tutor: tutor, id_bloque: '9007199254741000',
      estado_sesion: 'PENDIENTE', inicio: pendiente.inicio.toISOString(),
    });
    expect(respuesta.body[0]).not.toHaveProperty('calificaciones');

    const historial = await request(app.getHttpServer()).get('/sessions/history')
      .set('Authorization', `Bearer ${token(tutee)}`).expect(200);
    expect(historial.body.some((fila: { estado_sesion: string }) => fila.estado_sesion === 'COMPLETADA')).toBe(true);
    expect(historial.body.some((fila: { id_sesion: string }) => fila.id_sesion === comoTutor.id_sesion.toString())).toBe(true);
  });

  it('la consulta de activas devuelve una lista vacía si solo hay sesiones terminadas', async () => {
    await fixture('COMPLETADA');
    const respuesta = await request(app.getHttpServer()).get('/sessions/active')
      .set('Authorization', `Bearer ${token(tutee)}`).expect(200);
    expect(respuesta.body).toEqual([]);
  });

  it.each([null, 'token-invalido'])('la consulta de activas rechaza el token %s', async (bearer) => {
    const peticion = request(app.getHttpServer()).get('/sessions/active');
    if (bearer) peticion.set('Authorization', `Bearer ${bearer}`);
    await peticion.expect(401);
  });

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

  it('mantiene el promedio null si solo hay calificaciones recibidas como estudiante', async () => {
    for (let indice = 0; indice < 3; indice++) {
      const sesion = await fixture('COMPLETADA', '2099-06-20', tutor, outsider);
      const respuesta = await calificar(sesion.id_sesion, 1, outsider).expect(
        201,
      );
      expect(respuesta.body.reputacion_tutor).toEqual({
        id_tutor: outsider,
        cantidad_calificaciones: 0,
        promedio: null,
        requiere_revision: false,
      });
    }
    expect(await prisma.calificacion.count()).toBe(3);
    const reputacion = await request(app.getHttpServer())
      .get(`/sessions/tutors/${tutor}/reputation`)
      .expect(200);
    expect(reputacion.body).toEqual({
      id_tutor: tutor,
      cantidad_calificaciones: 0,
      promedio: null,
      requiere_revision: false,
    });
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
  it.each(['id_tutor', 'id_materia', 'id_bloque'])(
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
          .set('Authorization', `Bearer ${token(tutee)}`)
          .send({
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

    await service.pasarAPendienteCierre();

    const updated = await stateOf(session.id_sesion);
    expect(updated.estado_sesion).toBe('PENDIENTE_CIERRE');
    expect(updated.fecha_actualizacion.getTime()).toBeGreaterThan(
      session.fecha_actualizacion.getTime(),
    );
  });
  it('mantiene confirmada una sesión cuyo horario aún no termina', async () => {
    const session = await fixture('CONFIRMADA');

    await service.pasarAPendienteCierre();

    expect(await stateOf(session.id_sesion)).toEqual(session);
  });
  it.each(['CANCELADA', 'PENDIENTE'] as const)(
    'no cambia una sesión %s aunque su horario haya terminado',
    async (state) => {
      const session = await fixture(state, '2020-01-01');

      await service.pasarAPendienteCierre();

      expect(await stateOf(session.id_sesion)).toEqual(session);
    },
  );
  it('repetir el cierre no vuelve a modificar la sesión', async () => {
    const session = await fixture('CONFIRMADA', '2020-01-01');

    await service.pasarAPendienteCierre();
    const closed = await stateOf(session.id_sesion);
    await service.pasarAPendienteCierre();

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
    await service.expirarSolicitudes();
    const saved = await stateOf(session.id_sesion);
    expect(saved.estado_sesion).toBe('EXPIRADA');
    await service.expirarSolicitudes();
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
      service.expirarSolicitudes(),
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

  it('devuelve 503 sin guardar si no está configurada la integración de bloques', async () => {
    await create('4').expect(503);
    expect(await prisma.sesion.count()).toBe(0);
  });

  it('comunica el conflicto y su resolución después de confirmar cada transacción', async () => {
    habilitarModeracion();
    const sesion = await fixture('PENDIENTE_CIERRE');
    await declare(sesion.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    expect(avisosRecibidos).toHaveLength(0);
    await declare(
      sesion.id_sesion,
      {
        resultado_declarado: 'INASISTENCIA',
        id_usuario_inasistente: tutor,
      },
      tutee,
    ).expect(201);
    expect(avisosRecibidos).toHaveLength(1);
    expect(avisosRecibidos[0]).toMatchObject({
      ruta: '/integraciones/sesiones/conflictos',
      estadoPersistido: 'EN_CONFLICTO',
      avisoPersistido: true,
      cuerpo: {
        origen: 'agendamiento-sesiones',
        version: 1,
        tipo: 'CONFLICTO_DETECTADO',
        id_sesion: sesion.id_sesion.toString(),
        id_tutor: tutor,
        id_tutee: tutee,
        id_materia: materia,
        declaraciones: expect.arrayContaining([
          expect.objectContaining({
            id_usuario: tutor,
            resultado_declarado: 'COMPLETADA',
            id_usuario_inasistente: null,
          }),
          expect.objectContaining({
            id_usuario: tutee,
            resultado_declarado: 'INASISTENCIA',
            id_usuario_inasistente: tutor,
          }),
        ]),
      },
    });
    await request(app.getHttpServer())
      .patch(`/sessions/${sesion.id_sesion}/resolve-conflict`)
      .set('Authorization', `Bearer ${token(outsider, { roles: ['ADMIN'] })}`)
      .send({
        nuevo_estado: 'COMPLETADA',
        motivo_resolucion: '  Revisión de declaraciones  ',
        observaciones: 'Acuerdo confirmado',
      })
      .expect(200);
    const resolucion =
      await prisma.resolucion_conflicto_sesion.findUniqueOrThrow({
        where: { id_sesion: sesion.id_sesion },
      });
    expect(avisosRecibidos[1]).toMatchObject({
      ruta: '/integraciones/sesiones/resoluciones',
      estadoPersistido: 'COMPLETADA',
      avisoPersistido: true,
      cuerpo: {
        tipo: 'CONFLICTO_RESUELTO',
        id_sesion: sesion.id_sesion.toString(),
        id_resolucion: resolucion.id_resolucion.toString(),
        id_administrador: outsider,
        estado_final: 'COMPLETADA',
        motivo_resolucion: 'Revisión de declaraciones',
        observaciones: 'Acuerdo confirmado',
        fecha_resolucion: resolucion.fecha_resolucion.toISOString(),
      },
    });
    expect(
      await prisma.aviso_moderacion_sesion.count({
        where: { fecha_entrega: { not: null } },
      }),
    ).toBe(2);
    await entregasModeracion.reenviarPendientes();
    expect(avisosRecibidos).toHaveLength(2);
  });

  it('mantiene la decisión local ante un fallo remoto y entrega el conflicto antes de la resolución', async () => {
    habilitarModeracion();
    errorModeracion = 503;
    const sesion = await fixture('PENDIENTE_CIERRE');
    await declare(sesion.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    await declare(
      sesion.id_sesion,
      { resultado_declarado: 'NO_REALIZADA' },
      tutee,
    ).expect(201);
    expect((await stateOf(sesion.id_sesion)).estado_sesion).toBe(
      'EN_CONFLICTO',
    );
    await request(app.getHttpServer())
      .patch(`/sessions/${sesion.id_sesion}/resolve-conflict`)
      .set('Authorization', `Bearer ${token(outsider, { roles: ['ADMIN'] })}`)
      .send({ nuevo_estado: 'NO_REALIZADA', motivo_resolucion: 'Revisión' })
      .expect(200);
    expect((await stateOf(sesion.id_sesion)).estado_sesion).toBe(
      'NO_REALIZADA',
    );
    expect(avisosRecibidos).toHaveLength(1);
    const pendientes = await prisma.aviso_moderacion_sesion.findMany({
      orderBy: { id_aviso: 'asc' },
    });
    expect(pendientes.map((aviso) => aviso.fecha_entrega)).toEqual([
      null,
      null,
    ]);
    expect(pendientes.map((aviso) => aviso.intentos)).toEqual([1, 0]);
    expect(pendientes[0].ultimo_error).toBeTruthy();
    errorModeracion = 0;
    await entregasModeracion.reenviarPendientes();
    expect(avisosRecibidos.map((aviso) => aviso.cuerpo.tipo)).toEqual([
      'CONFLICTO_DETECTADO',
      'CONFLICTO_DETECTADO',
    ]);
    expect(avisosRecibidos[1].cuerpo).toEqual(avisosRecibidos[0].cuerpo);
    await entregasModeracion.reenviarPendientes();
    expect(avisosRecibidos[2].cuerpo.tipo).toBe('CONFLICTO_RESUELTO');
    expect(
      await prisma.aviso_moderacion_sesion.count({
        where: { fecha_entrega: null },
      }),
    ).toBe(0);
    expect(
      await prisma.aviso_moderacion_sesion.count({
        where: { ultimo_error: { not: null } },
      }),
    ).toBe(0);
    expect(avisosRegistrados.size).toBe(2);
  });

  it('guarda los avisos sin configuración y los entrega cuando se configura el receptor', async () => {
    const sesion = await fixture('PENDIENTE_CIERRE');
    await declare(sesion.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    await declare(
      sesion.id_sesion,
      { resultado_declarado: 'NO_REALIZADA' },
      tutee,
    ).expect(201);
    const pendiente = await prisma.aviso_moderacion_sesion.findFirstOrThrow();
    expect(pendiente.fecha_entrega).toBeNull();
    expect(pendiente.intentos).toBe(0);
    expect(avisosRecibidos).toHaveLength(0);
    habilitarModeracion();
    await entregasModeracion.reenviarPendientes();
    expect(
      (await prisma.aviso_moderacion_sesion.findFirstOrThrow()).fecha_entrega,
    ).not.toBeNull();
    expect(avisosRecibidos).toHaveLength(1);
  });

  it('reutiliza la misma clave si el receptor recibió el aviso pero falló el guardado de la confirmación', async () => {
    habilitarModeracion();
    const sesion = await fixture('PENDIENTE_CIERRE');
    await declare(sesion.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    jest
      .spyOn(prisma.aviso_moderacion_sesion, 'updateMany')
      .mockRejectedValueOnce(new Error('Fallo de confirmación de prueba'));
    await declare(
      sesion.id_sesion,
      { resultado_declarado: 'NO_REALIZADA' },
      tutee,
    ).expect(201);
    expect(
      (await prisma.aviso_moderacion_sesion.findFirstOrThrow()).fecha_entrega,
    ).toBeNull();
    await entregasModeracion.reenviarPendientes();
    expect(avisosRecibidos).toHaveLength(2);
    expect(avisosRecibidos[0].clave).toBe(avisosRecibidos[1].clave);
    expect(avisosRecibidos[0].cuerpo).toEqual(avisosRecibidos[1].cuerpo);
    expect(avisosRegistrados.size).toBe(1);
    expect(
      (await prisma.aviso_moderacion_sesion.findFirstOrThrow()).fecha_entrega,
    ).not.toBeNull();
  });

  it('revierte la segunda declaración y el conflicto si no puede guardar el aviso pendiente', async () => {
    habilitarModeracion();
    const sesion = await fixture('PENDIENTE_CIERRE');
    await declare(sesion.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    await admin.query(
      `ALTER TABLE "${schema}".aviso_moderacion_sesion ADD CONSTRAINT impedir_aviso_prueba CHECK (false) NOT VALID`,
    );
    try {
      await declare(
        sesion.id_sesion,
        { resultado_declarado: 'NO_REALIZADA' },
        tutee,
      ).expect(500);
    } finally {
      await admin.query(
        `ALTER TABLE "${schema}".aviso_moderacion_sesion DROP CONSTRAINT impedir_aviso_prueba`,
      );
    }
    expect((await stateOf(sesion.id_sesion)).estado_sesion).toBe(
      'PENDIENTE_CIERRE',
    );
    expect(await prisma.declaracion_cierre.count()).toBe(1);
    expect(await prisma.liberacion_bloque_sesion.count()).toBe(0);
    expect(await prisma.aviso_moderacion_sesion.count()).toBe(0);
    expect(avisosRecibidos).toHaveLength(0);
  });

  it('revierte la resolución y su auditoría si no puede guardar el aviso pendiente', async () => {
    habilitarModeracion();
    const sesion = await fixture('EN_CONFLICTO');
    await admin.query(
      `ALTER TABLE "${schema}".aviso_moderacion_sesion ADD CONSTRAINT impedir_aviso_prueba CHECK (false) NOT VALID`,
    );
    try {
      await request(app.getHttpServer())
        .patch(`/sessions/${sesion.id_sesion}/resolve-conflict`)
        .set('Authorization', `Bearer ${token(outsider, { roles: ['ADMIN'] })}`)
        .send({ nuevo_estado: 'COMPLETADA', motivo_resolucion: 'Revisión' })
        .expect(500);
    } finally {
      await admin.query(
        `ALTER TABLE "${schema}".aviso_moderacion_sesion DROP CONSTRAINT impedir_aviso_prueba`,
      );
    }
    expect((await stateOf(sesion.id_sesion)).estado_sesion).toBe(
      'EN_CONFLICTO',
    );
    expect(await prisma.resolucion_conflicto_sesion.count()).toBe(0);
    expect(await prisma.liberacion_bloque_sesion.count()).toBe(0);
    expect(await prisma.aviso_moderacion_sesion.count()).toBe(0);
    expect(avisosRecibidos).toHaveLength(0);
  });

  it('no avisa a moderación por cierres coincidentes ni resoluciones sin autorización', async () => {
    habilitarModeracion();
    const sesion = await fixture('PENDIENTE_CIERRE');
    await declare(sesion.id_sesion, {
      resultado_declarado: 'COMPLETADA',
    }).expect(201);
    await declare(
      sesion.id_sesion,
      { resultado_declarado: 'COMPLETADA' },
      tutee,
    ).expect(201);
    const conflicto = await fixture('EN_CONFLICTO');
    await request(app.getHttpServer())
      .patch(`/sessions/${conflicto.id_sesion}/resolve-conflict`)
      .set('Authorization', `Bearer ${token(tutor)}`)
      .send({ nuevo_estado: 'COMPLETADA', motivo_resolucion: 'Revisión' })
      .expect(403);
    expect(await prisma.aviso_moderacion_sesion.count()).toBe(0);
    expect(avisosRecibidos).toHaveLength(0);
  });

  it('no repite el aviso ni la auditoría al intentar resolver nuevamente la misma sesión', async () => {
    habilitarModeracion();
    const sesion = await fixture('EN_CONFLICTO');
    for (const estadoEsperado of [200, 409]) {
      await request(app.getHttpServer())
        .patch(`/sessions/${sesion.id_sesion}/resolve-conflict`)
        .set('Authorization', `Bearer ${token(outsider, { roles: ['ADMIN'] })}`)
        .send({ nuevo_estado: 'COMPLETADA', motivo_resolucion: 'Revisión' })
        .expect(estadoEsperado);
    }
    expect(await prisma.aviso_moderacion_sesion.count()).toBe(1);
    expect(await prisma.resolucion_conflicto_sesion.count()).toBe(1);
    expect(avisosRecibidos).toHaveLength(1);
  });

  it('Swagger documenta la creación autenticada con tres IDs y su respuesta 201', () => {
    const documento = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    const operacion = documento.paths['/sessions']?.post;
    expect(operacion?.security).toContainEqual({ bearer: [] });
    const entrada = documento.components?.schemas?.CreateSessionDto;
    if (!entrada || '$ref' in entrada)
      throw new Error('No se generó el esquema de entrada.');
    expect(entrada.required?.slice().sort()).toEqual([
      'id_bloque',
      'id_materia',
      'id_tutor',
    ]);
    expect(Object.keys(entrada.properties ?? {}).sort()).toEqual([
      'id_bloque',
      'id_materia',
      'id_tutor',
    ]);
    expect(operacion?.requestBody).toMatchObject({
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CreateSessionDto' },
        },
      },
    });
    expect(Object.keys(operacion?.responses ?? {}).sort()).toEqual([
      '201',
      '400',
      '401',
      '404',
      '409',
      '500',
      '503',
    ]);
    expect(operacion?.responses?.['201']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SesionCreadaResponseDto' },
        },
      },
    });
    const salida = documento.components?.schemas?.SesionCreadaResponseDto;
    if (!salida || '$ref' in salida)
      throw new Error('No se generó el esquema de respuesta.');
    expect(salida.properties?.id_sesion).toMatchObject({ type: 'string' });
    expect(salida.properties?.estado_sesion).toMatchObject({
      enum: ['PENDIENTE'],
    });
    expect(salida.properties?.inicio).toMatchObject({
      type: 'string',
      format: 'date-time',
    });
    expect(salida.properties?.fin).toMatchObject({
      type: 'string',
      format: 'date-time',
    });
  });

  it('crea una sesión PENDIENTE con el estudiante del JWT y el horario canónico de Santiago', async () => {
    habilitarMaterias();
    const respuesta = await create('4').expect(201);
    expect(respuesta.body).toMatchObject({
      id_tutee: tutee,
      id_tutor: tutor,
      id_materia: materia,
      id_bloque: '4',
      estado_sesion: 'PENDIENTE',
      inicio: '2099-06-20T14:00:00.000Z',
      fin: '2099-06-20T15:00:00.000Z',
    });
    expect((await stateOf(respuesta.body.id_sesion)).id_tutee).toBe(
      BigInt(tutee),
    );
    expect(estadoBloque).toBe('RESERVADO');
    expect(operacionesBloques).toEqual(['RESERVADO']);
  });

  it('la creación exige JWT', async () => {
    await request(app.getHttpServer())
      .post('/sessions')
      .send({ id_tutor: tutor, id_materia: materia, id_bloque: '4' })
      .expect(401);
  });

  it.each(['id_tutee', 'fechaInicio', 'fechaFin', 'notas'])(
    'rechaza el campo de creación no permitido %s',
    async (campo) => {
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${token(tutee)}`)
        .send({
          id_tutor: tutor,
          id_materia: materia,
          id_bloque: '4',
          [campo]: 'dato del cliente',
        })
        .expect(400);
      expect(await prisma.sesion.count()).toBe(0);
    },
  );

  it.each(['0', '-1', '1.5', '9223372036854775808'])(
    'rechaza el ID de bloque inválido %s al crear',
    async (idBloque) => {
      await create(idBloque).expect(400);
      expect(await prisma.sesion.count()).toBe(0);
    },
  );

  it('con tres pendientes permite crear la cuarta', async () => {
    habilitarMaterias();
    for (let numero = 0; numero < 3; numero++) await fixture();
    await create('4').expect(201);
    expect(
      await prisma.sesion.count({
        where: { id_tutee: BigInt(tutee), estado_sesion: 'PENDIENTE' },
      }),
    ).toBe(4);
  });

  it('con cuatro pendientes rechaza la quinta sin reservar', async () => {
    habilitarMaterias();
    for (let numero = 0; numero < 4; numero++) await fixture();
    await create('4').expect(409);
    expect(await prisma.sesion.count()).toBe(4);
    expect(operacionesBloques).toEqual([]);
  });

  it('no cuenta otros estudiantes ni estados para el límite de pendientes', async () => {
    habilitarMaterias();
    for (let numero = 0; numero < 4; numero++)
      await fixture('PENDIENTE', '2099-06-20', outsider);
    for (const estado of [
      'CONFIRMADA',
      'RECHAZADA',
      'EXPIRADA',
      'CANCELADA',
      'PENDIENTE_CIERRE',
      'COMPLETADA',
      'NO_REALIZADA',
      'INASISTENCIA',
      'EN_CONFLICTO',
    ] as sesion_estado_sesion_enum[])
      await fixture(estado);
    await create('4').expect(201);
    expect(
      await prisma.sesion.count({
        where: { id_tutee: BigInt(tutee), estado_sesion: 'PENDIENTE' },
      }),
    ).toBe(1);
  });

  it('rechaza una tutoría con uno mismo', async () => {
    await create('4', tutor).expect(400);
    expect(await prisma.sesion.count()).toBe(0);
  });

  it('rechaza un tutor no habilitado para la materia', async () => {
    habilitarMaterias();
    tutorHabilitado = false;
    await create('4').expect(409);
    expect(operacionesBloques).toEqual([]);
  });

  it('rechaza un bloque que no aparece disponible para el tutor', async () => {
    habilitarMaterias();
    estadoBloque = 'RESERVADO';
    await create('4').expect(409);
    expect(await prisma.sesion.count()).toBe(0);
  });

  it('rechaza un bloque ya comprometido localmente aunque el proveedor lo liste libre', async () => {
    habilitarMaterias();
    const ocupada = await fixture();
    await prisma.sesion.update({
      where: { id_sesion: ocupada.id_sesion },
      data: { id_bloque: 4n },
    });
    await create('4').expect(409);
    expect(operacionesBloques).toEqual([]);
  });

  it('rechaza un horario solapado en otro bloque', async () => {
    habilitarMaterias();
    const ocupada = await fixture('CONFIRMADA');
    await prisma.sesion.update({
      where: { id_sesion: ocupada.id_sesion },
      data: {
        inicio: new Date('2099-06-20T14:30:00Z'),
        fin: new Date('2099-06-20T15:30:00Z'),
      },
    });
    await create('4').expect(409);
    expect(operacionesBloques).toEqual([]);
  });

  it('devuelve 503 si falla la consulta a materias-tutores sin insertar una sesión', async () => {
    habilitarMaterias();
    errorConsulta = 500;
    await create('4').expect(503);
    expect(await prisma.sesion.count()).toBe(0);
    expect(operacionesBloques).toEqual([]);
  });

  it.each([409, 503])(
    'no guarda una sesión si reservar devuelve %s',
    async (estado) => {
      habilitarMaterias();
      errorReserva = estado;
      await create('4').expect(estado);
      expect(await prisma.sesion.count()).toBe(0);
      expect(operacionesBloques).toEqual(['RESERVADO']);
    },
  );

  it('libera la reserva confirmada si falla la creación en PostgreSQL', async () => {
    habilitarMaterias();
    await admin.query(
      `ALTER TABLE "${schema}".sesion ADD CONSTRAINT impedir_creacion_prueba CHECK (false) NOT VALID`,
    );
    try {
      await create('4').expect(500);
      expect(await prisma.sesion.count()).toBe(0);
      expect(estadoBloque).toBe('DISPONIBLE');
      expect(operacionesBloques).toEqual(['RESERVADO', 'DISPONIBLE']);
    } finally {
      await admin.query(
        `ALTER TABLE "${schema}".sesion DROP CONSTRAINT impedir_creacion_prueba`,
      );
    }
  });

  it('informa 503 si no logra compensar una creación fallida', async () => {
    habilitarMaterias();
    errorLiberacion = 503;
    await admin.query(
      `ALTER TABLE "${schema}".sesion ADD CONSTRAINT impedir_creacion_prueba CHECK (false) NOT VALID`,
    );
    try {
      await create('4').expect(503);
      expect(await prisma.sesion.count()).toBe(0);
      expect(estadoBloque).toBe('RESERVADO');
      expect(operacionesBloques).toEqual(['RESERVADO', 'DISPONIBLE']);
    } finally {
      await admin.query(
        `ALTER TABLE "${schema}".sesion DROP CONSTRAINT impedir_creacion_prueba`,
      );
    }
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

  it('rechazar libera el bloque y confirma el registro durable de liberación', async () => {
    const id = await crearSesionReservada();
    await act(id, 'reject').expect(200);
    expect((await stateOf(id)).estado_sesion).toBe('RECHAZADA');
    expect(estadoBloque).toBe('DISPONIBLE');
    expect(operacionesBloques).toEqual(['RESERVADO', 'DISPONIBLE']);
    const pendiente = await prisma.liberacion_bloque_sesion.findUniqueOrThrow({
      where: { id_sesion: id },
    });
    expect(pendiente.fecha_liberacion).toBeInstanceOf(Date);
    expect(pendiente.intentos).toBe(1);
  });

  it('cancelar una confirmada libera el bloque', async () => {
    const id = await crearSesionReservada('CONFIRMADA');
    await act(id, 'cancel', tutee).expect(200);
    expect((await stateOf(id)).estado_sesion).toBe('CANCELADA');
    expect(estadoBloque).toBe('DISPONIBLE');
  });

  it('expirar una pendiente de 24 horas libera el bloque una sola vez', async () => {
    const id = await crearSesionReservada();
    await prisma.sesion.update({
      where: { id_sesion: id },
      data: { fecha_creacion: new Date('2020-01-01') },
    });
    await service.expirarSolicitudes();
    expect((await stateOf(id)).estado_sesion).toBe('EXPIRADA');
    expect(estadoBloque).toBe('DISPONIBLE');
    await service.expirarSolicitudes();
    await liberaciones.reenviarPendientes();
    expect(operacionesBloques).toEqual(['RESERVADO', 'DISPONIBLE']);
  });

  it('pasar a pendiente de cierre conserva la reserva hasta declarar el resultado', async () => {
    const id = await crearSesionReservada('CONFIRMADA');
    await prisma.sesion.update({
      where: { id_sesion: id },
      data: {
        inicio: new Date('2020-01-01T10:00:00Z'),
        fin: new Date('2020-01-01T11:00:00Z'),
      },
    });
    await service.pasarAPendienteCierre();
    expect((await stateOf(id)).estado_sesion).toBe('PENDIENTE_CIERRE');
    expect(estadoBloque).toBe('RESERVADO');
    expect(await prisma.liberacion_bloque_sesion.count()).toBe(0);
    await declare(id, { resultado_declarado: 'COMPLETADA' }).expect(201);
    expect(estadoBloque).toBe('RESERVADO');
    expect(await prisma.liberacion_bloque_sesion.count()).toBe(0);
  });

  it.each(['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA'])(
    'el cierre coincidente %s libera el bloque',
    async (resultado) => {
      const id = await crearSesionReservada('PENDIENTE_CIERRE');
      const cuerpo = {
        resultado_declarado: resultado,
        ...(resultado === 'INASISTENCIA'
          ? { id_usuario_inasistente: tutee }
          : {}),
      };
      await declare(id, cuerpo).expect(201);
      await declare(id, cuerpo, tutee).expect(201);
      expect((await stateOf(id)).estado_sesion).toBe(resultado);
      expect(estadoBloque).toBe('DISPONIBLE');
      expect(operacionesBloques).toEqual(['RESERVADO', 'DISPONIBLE']);
    },
  );

  it('la adopción provisional tras 48 horas libera el bloque', async () => {
    const id = await crearSesionReservada('PENDIENTE_CIERRE');
    await declare(id, { resultado_declarado: 'COMPLETADA' }).expect(201);
    await prisma.declaracion_cierre.updateMany({
      where: { id_sesion: id },
      data: { fecha_declaracion: new Date('2020-01-01') },
    });
    await service.resolverDeclaracionesVencidas();
    expect(await stateOf(id)).toMatchObject({
      estado_sesion: 'COMPLETADA',
      resultado_provisional: true,
    });
    expect(estadoBloque).toBe('DISPONIBLE');
    expect(operacionesBloques).toEqual(['RESERVADO', 'DISPONIBLE']);
  });

  it('el conflicto libera el bloque y su resolución no reenvía una liberación confirmada', async () => {
    const id = await crearSesionReservada('PENDIENTE_CIERRE');
    await declare(id, { resultado_declarado: 'COMPLETADA' }).expect(201);
    await declare(id, { resultado_declarado: 'NO_REALIZADA' }, tutee).expect(
      201,
    );
    expect((await stateOf(id)).estado_sesion).toBe('EN_CONFLICTO');
    expect(estadoBloque).toBe('DISPONIBLE');
    await request(app.getHttpServer())
      .patch(`/sessions/${id}/resolve-conflict`)
      .set(
        'Authorization',
        `Bearer ${token(outsider, { roles: ['ADMINISTRADOR'] })}`,
      )
      .send({
        nuevo_estado: 'COMPLETADA',
        motivo_resolucion: 'Resolución de cierre de prueba.',
      })
      .expect(200);
    expect(operacionesBloques).toEqual(['RESERVADO', 'DISPONIBLE']);
    expect(await prisma.liberacion_bloque_sesion.count()).toBe(1);
  });

  it('si liberar falla conserva el rechazo y reintenta desde el registro de PostgreSQL', async () => {
    const id = await crearSesionReservada();
    errorLiberacion = 503;
    await act(id, 'reject').expect(200);
    expect((await stateOf(id)).estado_sesion).toBe('RECHAZADA');
    expect(estadoBloque).toBe('RESERVADO');
    const pendiente = await prisma.liberacion_bloque_sesion.findUniqueOrThrow({
      where: { id_sesion: id },
    });
    expect(pendiente.fecha_liberacion).toBeNull();
    expect(pendiente.intentos).toBe(1);
    expect(pendiente.ultimo_error).toBeTruthy();
    errorLiberacion = 0;
    await liberaciones.reenviarPendientes();
    const entregada = await prisma.liberacion_bloque_sesion.findUniqueOrThrow({
      where: { id_sesion: id },
    });
    expect(entregada.fecha_liberacion).toBeInstanceOf(Date);
    expect(entregada.intentos).toBe(2);
    expect(entregada.ultimo_error).toBeNull();
    expect(estadoBloque).toBe('DISPONIBLE');
    const intentos = operacionesBloques.length;
    await liberaciones.reenviarPendientes();
    expect(operacionesBloques).toHaveLength(intentos);
  });

  it('una operación sin permiso no registra ni envía una liberación', async () => {
    const id = await crearSesionReservada();
    await act(id, 'reject', outsider).expect(403);
    expect(await prisma.liberacion_bloque_sesion.count()).toBe(0);
    expect(operacionesBloques).toEqual(['RESERVADO']);
  });

  it('un fallo al registrar la liberación revierte el cambio de estado local', async () => {
    const id = await crearSesionReservada();
    await admin.query(
      `ALTER TABLE "${schema}".liberacion_bloque_sesion ADD CONSTRAINT verif_impedir_liberacion CHECK (false) NOT VALID`,
    );
    try {
      await act(id, 'reject').expect(500);
      expect((await stateOf(id)).estado_sesion).toBe('PENDIENTE');
      expect(await prisma.liberacion_bloque_sesion.count()).toBe(0);
      expect(operacionesBloques).toEqual(['RESERVADO']);
    } finally {
      await admin.query(
        `ALTER TABLE "${schema}".liberacion_bloque_sesion DROP CONSTRAINT verif_impedir_liberacion`,
      );
    }
  });

  it('una liberación pendiente no libera el bloque de otra sesión activa', async () => {
    habilitarMaterias();
    estadoBloque = 'RESERVADO';
    const terminada = await fixture('RECHAZADA');
    const activa = await fixture('PENDIENTE');
    await prisma.sesion.updateMany({
      where: { id_sesion: { in: [terminada.id_sesion, activa.id_sesion] } },
      data: { id_bloque: 4n },
    });
    await prisma.liberacion_bloque_sesion.create({
      data: { id_sesion: terminada.id_sesion, id_bloque: 4n },
    });
    await liberaciones.reenviarPendientes();
    expect(estadoBloque).toBe('RESERVADO');
    expect(operacionesBloques).toEqual([]);
    await prisma.sesion.update({
      where: { id_sesion: activa.id_sesion },
      data: { estado_sesion: 'RECHAZADA' },
    });
    await liberaciones.reenviarPendientes();
    expect(estadoBloque).toBe('DISPONIBLE');
  });

  it('el bloque liberado al rechazar vuelve a poder solicitarse', async () => {
    const id = await crearSesionReservada();
    await act(id, 'reject').expect(200);
    await create('4').expect(201);
    expect(estadoBloque).toBe('RESERVADO');
    await liberaciones.reenviarPendientes();
    expect(estadoBloque).toBe('RESERVADO');
    expect(operacionesBloques).toEqual([
      'RESERVADO',
      'DISPONIBLE',
      'RESERVADO',
    ]);
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
