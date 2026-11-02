import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { parse } from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { DisponibilidadModule } from '../dist/disponibilidad/disponibilidad.module.js';
import { DISPONIBILIDAD_REPOSITORY } from '../dist/disponibilidad/aplicacion/puertos/disponibilidad.repository.js';
import { TutoresModule } from '../dist/tutores/tutores.module.js';
import { IntegracionesModule } from '../dist/integraciones/integraciones.module.js';

const sesionesDir = resolve(process.env.SESIONES_PROJECT_DIR ?? '../agendamiento-sesiones');
const gatewayDir = resolve(process.env.GATEWAY_PROJECT_DIR ?? '../../../apiGateway/api-gateway');
const requireSesiones = createRequire(join(sesionesDir, 'package.json'));
const { Test: TestSesiones } = requireSesiones('@nestjs/testing');
const { ConfigService } = requireSesiones('@nestjs/config');
const { ValidationPipe } = requireSesiones('@nestjs/common');
const { PrismaService: PrismaSesionesService } = requireSesiones(join(sesionesDir, 'dist/database/prisma.service.js'));
const { PrismaClient: PrismaSesiones } = requireSesiones(join(sesionesDir, 'dist/generated/prisma/client.js'));
const { SessionsModule } = requireSesiones(join(sesionesDir, 'dist/sessions/infraestructura/sessions.module.js'));
const sufijo = randomUUID().replaceAll('-', '');
const schemas = [`test_flujo_materias_${sufijo}`, `test_flujo_sesiones_${sufijo}`];
const secret = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret });
const tutor = '9007199254740993';
const estudiante = '9007199254740995';
const aplicaciones = [];
const metricas = [];
let pool, materias, sesiones, gatewayUrl, materiasUrl, proxy;
let snapshotInicial;
let repositorioDisponibilidad;
let compuertas = [];
const esquemasCreados = [];

function token(sub = tutor, roles = ['TUTOR']) {
  return jwt.sign({ sub, roles, jti: randomUUID(), correo_institucional: 'prueba@alu.uct.cl' }, { algorithm: 'HS256', issuer: 'stp-usuarios-auth', audience: 'stp-clients', expiresIn: '15m' });
}
const tutorToken = token();
const estudianteToken = token(estudiante, ['ESTUDIANTE']);
const fecha = '2099-11-10';
const horario = { dia: fecha, horaInicio: '10:00', horaFin: '11:00' };

async function snapshotPublico() {
  const { rows } = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
  const resultado = {};
  for (const { tablename } of rows) {
    const tabla = '"' + tablename.replaceAll('"', '""') + '"';
    const r = await pool.query(`SELECT md5(COALESCE(jsonb_agg(j ORDER BY j::text)::text,'[]')) AS hash FROM (SELECT to_jsonb(t) j FROM public.${tabla} t) filas`);
    resultado[tablename] = r.rows[0].hash;
  }
  return resultado;
}

async function aplicarMigraciones(schema, directorio) {
  assert.match(schema, /^test_flujo_(materias|sesiones)_[a-f0-9]{32}$/);
  await pool.query(`CREATE SCHEMA "${schema}"`);
  esquemasCreados.push(schema);
  const cliente = await pool.connect();
  try {
    await cliente.query(`SET search_path TO "${schema}", public`);
    for (const carpeta of (await readdir(directorio, { withFileTypes: true })).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await cliente.query(await readFile(join(directorio, carpeta.name, 'migration.sql'), 'utf8'));
    }
  } finally {
    await cliente.query('RESET search_path');
    cliente.release();
  }
}

async function iniciar(app) {
  aplicaciones.push(app);
  await app.listen(0, '127.0.0.1');
  return await app.getUrl();
}

function sincronizarRespuestas(fragmento, cantidad) {
  let liberar;
  const promesa = new Promise((r) => {
    liberar = r;
  });
  const timer = setTimeout(() => liberar(), 10000);
  const barrera = {
    fragmento,
    cantidad,
    vistas: 0,
    promesa,
    liberar: () => {
      clearTimeout(timer);
      liberar();
    },
  };
  compuertas.push(barrera);
}

before(
  async () => {
  const env = parse(await readFile('.env').catch((error) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  }));
    const databaseUrl = process.env.TEST_DATABASE_URL ?? env.TEST_DATABASE_URL ?? env.DATABASE_URL;
    assert.ok(databaseUrl, 'Configura TEST_DATABASE_URL o DATABASE_URL local.');
    assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname), 'Solo PostgreSQL local.');
    pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, max: 20 });
    snapshotInicial = await snapshotPublico();
    await aplicarMigraciones(schemas[0], resolve('prisma/migrations'));
    await aplicarMigraciones(schemas[1], join(sesionesDir, 'prisma/migrations'));
    materias = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 16 }, { schema: schemas[0] }) });
    sesiones = new PrismaSesiones({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 16 }, { schema: schemas[1] }) });
    const moduloMaterias = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ ignoreEnvFile: true, load: [() => ({ DATABASE_URL: databaseUrl, JWT_SECRET: secret, INTEGRACION_SECRET: secret })] }),
        DisponibilidadModule,
        TutoresModule,
        IntegracionesModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(materias)
      .compile();
    materiasUrl = await iniciar(moduloMaterias.createNestApplication({ logger: false }));
    repositorioDisponibilidad = aplicaciones[0].get(DISPONIBILIDAD_REPOSITORY);
    proxy = createServer(async (req, res) => {
      try {
        const datos = [];
        for await (const c of req) datos.push(c);
        const opciones = { method: req.method, headers: { 'Content-Type': 'application/json', ...(req.headers['x-integracion-secret'] ? { 'X-Integracion-Secret': req.headers['x-integracion-secret'] } : {}) }, signal: AbortSignal.timeout(15000) };
        if (!['GET', 'HEAD'].includes(req.method)) opciones.body = Buffer.concat(datos);
        const respuesta = await fetch(materiasUrl + req.url, opciones);
        const cuerpo = Buffer.from(await respuesta.arrayBuffer());
        const barrera = compuertas.find((c) => req.url.includes(c.fragmento) && c.vistas < c.cantidad);
        if (barrera) {
          if (++barrera.vistas === barrera.cantidad) barrera.liberar();
          await barrera.promesa;
        }
        res.writeHead(respuesta.status, { 'Content-Type': 'application/json' });
        res.end(cuerpo);
      } catch {
        res.writeHead(502);
        res.end('{}');
      }
    });
    await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
    const configuracion = new ConfigService({ JWT_SECRET: secret, MATERIAS_TUTORES_URL: `http://127.0.0.1:${proxy.address().port}`, INTEGRACION_SECRET: secret });
    const moduloSesiones = await TestSesiones.createTestingModule({ imports: [SessionsModule] })
      .overrideProvider(PrismaSesionesService)
      .useValue(sesiones)
      .overrideProvider(ConfigService)
      .useValue(configuracion)
      .compile();
    const appSesiones = moduloSesiones.createNestApplication({ logger: false });
    appSesiones.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const sesionesUrl = await iniciar(appSesiones);
    Object.assign(process.env, { MATERIAS_TUTORES_URL: materiasUrl, AGENDAMIENTO_SESIONES_URL: sesionesUrl, CORS_ORIGIN: 'http://localhost:5173', USUARIOS_AUTH_URL: '' });
    const { crearAplicacion } = await import(pathToFileURL(join(gatewayDir, 'dist/crear-aplicacion.js')).href);
    gatewayUrl = await iniciar(await crearAplicacion({ logger: false }));
  },
  { timeout: 60000 },
);

beforeEach(async () => {
  compuertas.forEach((c) => c.liberar());
  compuertas = [];
  await pool.query(`TRUNCATE "${schemas[1]}".sesion RESTART IDENTITY CASCADE`);
  await pool.query(`TRUNCATE "${schemas[0]}".materia, "${schemas[0]}".bloque_horario, "${schemas[0]}".perfil_tutor RESTART IDENTITY CASCADE`);
  await materias.materia.create({ data: { idMateria: 1n, codigo: 'PRUEBA-001', nombre: 'Materia de prueba aislada' } });
  await materias.tutorMateria.create({ data: { idUsuario: BigInt(tutor), idMateria: 1n } });
});

after(
  async () => {
    compuertas.forEach((c) => c.liberar());
    try {
      for (const app of aplicaciones.reverse()) await app.close();
      if (proxy) {
        proxy.closeAllConnections();
        await new Promise((r) => proxy.close(r));
      }
      await materias?.$disconnect();
      await sesiones?.$disconnect();
    } finally {
      if (pool) {
        try {
          for (const schema of esquemasCreados.reverse()) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
          if (snapshotInicial) assert.deepEqual(await snapshotPublico(), snapshotInicial, 'Los datos públicos deben conservarse.');
          for (const schema of esquemasCreados) assert.equal((await pool.query('SELECT to_regnamespace($1) AS existe', [schema])).rows[0].existe, null);
        } finally {
          await pool.end();
        }
      }
      console.log('MÉTRICAS LOCALES:', JSON.stringify(metricas));
    }
  },
  { timeout: 30000 },
);

async function pedir(ruta, { method = 'GET', body, credencial = tutorToken } = {}) {
  const inicio = performance.now();
  const opciones = { method, headers: { Authorization: `Bearer ${credencial}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) };
  if (body !== undefined) {
    assert.ok(!['GET', 'HEAD'].includes(method));
    opciones.body = JSON.stringify(body);
  }
  const respuesta = await fetch(`${gatewayUrl}/api/${ruta}`, opciones);
  const datos = await respuesta.json();
  return { status: respuesta.status, body: datos, ms: performance.now() - inicio };
}
const crearBloque = (body = horario) => pedir('materias-tutores/disponibilidad/bloques', { method: 'POST', body });
const crearSesion = (id) => pedir('agendamiento-sesiones/sessions', { method: 'POST', credencial: estudianteToken, body: { id_tutor: tutor, id_materia: '1', id_bloque: id } });
const accion = (id, nombre) => pedir(`agendamiento-sesiones/sessions/${id}/${nombre}`, { method: 'PATCH' });

void test('crear bloques idénticos en paralelo conserva una sola fila activa', async () => {
  const listar = repositorioDisponibilidad.listarActivosDelDia.bind(repositorioDisponibilidad);
  let lecturas = 0,
    liberar;
  const barrera = new Promise((r) => {
    liberar = r;
  });
  const timer = setTimeout(() => liberar(), 10000);
  repositorioDisponibilidad.listarActivosDelDia = async (...args) => {
    const datos = await listar(...args);
    if (++lecturas === 12) liberar();
    await barrera;
    return datos;
  };
  let respuestas;
  try {
    respuestas = await Promise.all(Array.from({ length: 12 }, () => crearBloque()));
  } finally {
    clearTimeout(timer);
    liberar();
    repositorioDisponibilidad.listarActivosDelDia = listar;
  }
  assert.equal(respuestas.filter((r) => r.status === 201).length, 1);
  assert.ok(respuestas.every((r) => [201, 409].includes(r.status)));
  assert.equal(await materias.bloqueHorario.count(), 1);
});

void test('editar un bloque no permite superponerlo con otro ni ante repeticiones', async () => {
  assert.equal((await crearBloque()).status, 201);
  const segundo = await crearBloque({ ...horario, horaInicio: '11:00', horaFin: '12:00' });
  assert.equal(segundo.status, 201);
  for (let i = 0; i < 3; i++) assert.equal((await pedir(`materias-tutores/disponibilidad/bloques/${segundo.body.idBloque}`, { method: 'PATCH', body: { horaInicio: '10:30' } })).status, 409);
  assert.equal((await materias.bloqueHorario.findUniqueOrThrow({ where: { idBloque: BigInt(segundo.body.idBloque) } })).horaInicio.toISOString().slice(11, 16), '11:00');
});

void test('dos ediciones concurrentes no ocupan el mismo intervalo libre', async () => {
  const primero = await crearBloque();
  const segundo = await crearBloque({ ...horario, horaInicio: '11:00', horaFin: '12:00' });
  const respuestas = await Promise.all(
    [primero, segundo].map((r) =>
      pedir(`materias-tutores/disponibilidad/bloques/${r.body.idBloque}`, {
        method: 'PATCH',
        body: { horaInicio: '12:00', horaFin: '13:00' },
      }),
    ),
  );
  assert.deepEqual(respuestas.map((r) => r.status).sort((a, b) => a - b), [200, 409]);
  assert.equal(await materias.bloqueHorario.count({ where: { horaInicio: new Date('1970-01-01T12:00:00Z') } }), 1);
});

void test('repetir desactivaciones conserva una sola fila inactiva y no permite reservarla', async () => {
  const bloque = (await crearBloque()).body.idBloque;
  const respuestas = await Promise.all(Array.from({ length: 8 }, () => pedir(`materias-tutores/disponibilidad/bloques/${bloque}`, { method: 'DELETE' })));
  assert.equal(respuestas.filter((r) => r.status === 200).length, 1);
  assert.ok(respuestas.every((r) => [200, 409].includes(r.status)));
  assert.equal(await materias.bloqueHorario.count(), 1);
  assert.equal((await materias.bloqueHorario.findFirstOrThrow()).estadoBloque, 'INACTIVO');
  assert.equal((await crearSesion(bloque)).status, 409);
  assert.equal(await sesiones.sesion.count(), 0);
});

void test('reserva y liberación internas repetidas/concurrentes conservan el mismo efecto', async () => {
  const bloque = (await crearBloque()).body.idBloque;
  for (const estado of ['RESERVADO', 'DISPONIBLE']) {
    const respuestas = await Promise.all(
      Array.from({ length: 12 }, async () => {
        const respuesta = await fetch(`${materiasUrl}/integraciones/bloques/${bloque}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'X-Integracion-Secret': secret },
          body: JSON.stringify({ estado }),
        });
        return respuesta.status;
      }),
    );
    assert.deepEqual([...new Set(respuestas)], [200]);
    assert.equal((await materias.bloqueHorario.findUniqueOrThrow({ where: { idBloque: BigInt(bloque) } })).estadoBloque, estado);
  }
});

void test('repetir creación y aceptación por Gateway no duplica sesiones ni libera el bloque confirmado', async () => {
  const bloque = (await crearBloque()).body.idBloque;
  const creada = await crearSesion(bloque);
  assert.equal(creada.status, 201, JSON.stringify(creada.body));
  assert.equal((await crearSesion(bloque)).status, 409);
  const respuestas = await Promise.all(Array.from({ length: 12 }, () => accion(creada.body.id_sesion, 'accept')));
  assert.equal(respuestas.filter((r) => r.status === 200).length, 1);
  assert.ok(respuestas.every((r) => [200, 409].includes(r.status)));
  assert.equal(await sesiones.sesion.count(), 1);
  assert.equal((await sesiones.sesion.findFirstOrThrow()).estado_sesion, 'CONFIRMADA');
  assert.equal((await materias.bloqueHorario.findFirstOrThrow()).estadoBloque, 'RESERVADO');
  const historial = await pedir('agendamiento-sesiones/sessions/history');
  assert.equal(historial.status, 200);
  assert.equal(historial.body.length, 1);
  assert.equal(historial.body[0].id_sesion, creada.body.id_sesion);
});

void test('solicitudes en vuelo al mismo bloque no compensan liberando la reserva ganadora', { timeout: 60000 }, async () => {
  const bloque = (await crearBloque()).body.idBloque;
  sincronizarRespuestas('/tutores?', 6);
  sincronizarRespuestas(`/integraciones/bloques/${bloque}/estado`, 6);
  const respuestas = await Promise.all(Array.from({ length: 6 }, () => crearSesion(bloque)));
  assert.ok(compuertas.every((barrera) => barrera.vistas === barrera.cantidad), 'Todas las solicitudes deben atravesar las barreras HTTP.');
  assert.equal(respuestas.filter((r) => r.status === 201).length, 1, JSON.stringify(respuestas));
  assert.ok(respuestas.every((r) => [201, 409].includes(r.status)));
  assert.equal(await sesiones.sesion.count(), 1);
  assert.equal((await materias.bloqueHorario.findFirstOrThrow()).estadoBloque, 'RESERVADO');
});

void test('rechazo repetido o concurrente libera una sola sesión y permite una nueva solicitud', async () => {
  const bloque = (await crearBloque()).body.idBloque;
  const creada = await crearSesion(bloque);
  assert.equal(creada.status, 201);
  const respuestas = await Promise.all(Array.from({ length: 8 }, () => accion(creada.body.id_sesion, 'reject')));
  assert.equal(respuestas.filter((r) => r.status === 200).length, 1);
  assert.ok(respuestas.every((r) => [200, 409].includes(r.status)));
  assert.equal((await sesiones.sesion.findFirstOrThrow()).estado_sesion, 'RECHAZADA');
  assert.equal(await sesiones.liberacion_bloque_sesion.count(), 1);
  assert.equal((await materias.bloqueHorario.findFirstOrThrow()).estadoBloque, 'DISPONIBLE');
  assert.equal((await crearSesion(bloque)).status, 201);
  assert.equal(await sesiones.sesion.count({ where: { estado_sesion: 'PENDIENTE' } }), 1);
});

void test('JWT ausente/ajeno no altera sesiones ni bloques', async () => {
  const bloque = (await crearBloque()).body.idBloque;
  const creada = await crearSesion(bloque);
  assert.equal(creada.status, 201);
  const sinToken = await pedir('agendamiento-sesiones/sessions/history', { credencial: '' });
  assert.equal(sinToken.status, 401);
  assert.equal((await pedir(`agendamiento-sesiones/sessions/${creada.body.id_sesion}/accept`, { method: 'PATCH', credencial: token('20') })).status, 403);
  assert.equal((await sesiones.sesion.findFirstOrThrow()).estado_sesion, 'PENDIENTE');
  assert.equal((await materias.bloqueHorario.findFirstOrThrow()).estadoBloque, 'RESERVADO');
});

async function medir(nombre, operacion, esperado, limiteP95, muestras = 100, concurrencia = 10) {
  for (let i = 0; i < 5; i++) assert.equal((await operacion()).status, esperado);
  const tiempos = [];
  const inicio = performance.now();
  for (let lote = 0; lote < muestras / concurrencia; lote++) {
    const respuestas = await Promise.all(Array.from({ length: concurrencia }, operacion));
    for (const r of respuestas) {
      assert.equal(r.status, esperado, JSON.stringify(r.body));
      tiempos.push(r.ms);
    }
  }
  const duracion = performance.now() - inicio;
  tiempos.sort((a, b) => a - b);
  const percentil = (p) => Math.round(tiempos[Math.ceil(tiempos.length * p) - 1] * 100) / 100;
  const muestra = {
    nombre,
    solicitudes: tiempos.length,
    concurrencia,
    unidad: 'ms',
    p50: percentil(0.5),
    p95: percentil(0.95),
    p99: percentil(0.99),
    max: percentil(1),
    rps: Math.round(((tiempos.length * 1000) / duracion) * 100) / 100,
    limiteP95,
  };
  metricas.push(muestra);
  assert.ok(muestra.p95 < limiteP95, JSON.stringify(muestra));
}

void test('rendimiento local con datos y concurrencia acotada: lecturas y repeticiones rechazadas', { timeout: 60000 }, async () => {
  await materias.tutorMateria.createMany({ data: Array.from({ length: 199 }, (_, i) => ({ idUsuario: BigInt(i + 100), idMateria: 1n })) });
  await materias.bloqueHorario.createMany({
    data: Array.from({ length: 1000 }, (_, i) => ({
      idTutor: i % 200 === 199 ? BigInt(tutor) : BigInt((i % 200) + 100),
      dia: new Date(`2099-11-${11 + Math.floor(i / 200)}T00:00:00Z`),
      horaInicio: new Date('1970-01-01T12:00:00Z'),
      horaFin: new Date('1970-01-01T13:00:00Z'),
    })),
  });
  const bloque = (await crearBloque()).body.idBloque;
  const creada = await crearSesion(bloque);
  assert.equal(creada.status, 201);
  assert.equal((await accion(creada.body.id_sesion, 'accept')).status, 200);
  await sesiones.sesion.createMany({
    data: Array.from({ length: 500 }, (_, i) => ({
      id_tutor: BigInt(tutor),
      id_tutee: BigInt(i + 1000),
      id_materia: 1n,
      id_bloque: BigInt(i + 1000),
      estado_sesion: 'COMPLETADA',
      inicio: new Date(`2020-01-01T10:00:00Z`),
      fin: new Date(`2020-01-01T11:00:00Z`),
    })),
  });
  await medir('buscar-tutores-paginado', () => pedir('materias-tutores/tutores?materiaId=1&page=1&limit=10'), 200, 1000);
  await medir('consultar-disponibilidad', () => pedir('materias-tutores/disponibilidad/bloques'), 200, 1000);
  await medir('historial-tutor', () => pedir('agendamiento-sesiones/sessions/history'), 200, 1000);
  await medir('aceptacion-repetida-sin-efectos', () => accion(creada.body.id_sesion, 'accept'), 409, 1500);
  assert.equal(await sesiones.sesion.count(), 501);
  assert.equal((await sesiones.sesion.findUniqueOrThrow({ where: { id_sesion: BigInt(creada.body.id_sesion) } })).estado_sesion, 'CONFIRMADA');
});

void test('rendimiento de escrituras exitosas del recorrido con cinco tutores simultáneos', { timeout: 60000 }, async () => {
  const contextos = Array.from({ length: 35 }, (_, i) => ({ tutor: String(i + 100), estudiante: String(i + 1000) }));
  await materias.tutorMateria.createMany({ data: contextos.map((c) => ({ idUsuario: BigInt(c.tutor), idMateria: 1n })) });
  const bloques = [];
  const solicitudes = [];
  let posicion = 0;
  await medir(
    'crear-bloque',
    async () => {
      const c = contextos[posicion++];
      const r = await pedir('materias-tutores/disponibilidad/bloques', { method: 'POST', body: horario, credencial: token(c.tutor) });
      bloques.push({ ...c, idBloque: r.body.idBloque });
      return r;
    },
    201,
    2000,
    30,
    5,
  );
  posicion = 0;
  await medir(
    'crear-solicitud-con-reserva',
    async () => {
      const c = bloques[posicion++];
      const r = await pedir('agendamiento-sesiones/sessions', { method: 'POST', credencial: token(c.estudiante, ['ESTUDIANTE']), body: { id_tutor: c.tutor, id_materia: '1', id_bloque: c.idBloque } });
      solicitudes.push({ ...c, idSesion: r.body.id_sesion });
      return r;
    },
    201,
    2000,
    30,
    5,
  );
  posicion = 0;
  await medir(
    'aceptar-solicitud',
    () => {
      const c = solicitudes[posicion++];
      return pedir(`agendamiento-sesiones/sessions/${c.idSesion}/accept`, { method: 'PATCH', credencial: token(c.tutor) });
    },
    200,
    2000,
    30,
    5,
  );
  assert.equal(await sesiones.sesion.count({ where: { estado_sesion: 'CONFIRMADA' } }), 35);
  assert.equal(await materias.bloqueHorario.count({ where: { estadoBloque: 'RESERVADO' } }), 35);
});
