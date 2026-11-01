import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { parse } from 'dotenv';
import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { PostulacionesModule } from '../dist/postulaciones/postulaciones.module.js';
import { TutoresModule } from '../dist/tutores/tutores.module.js';

const schema = `test_postulaciones_${randomUUID().replaceAll('-', '')}`;
const secreto = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret: secreto });
const usuario = '9007199254740995';
const administrador = '99';
const pdf = Buffer.from('%PDF-1.7\ncertificado de prueba');
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
let pool, prisma, app, gateway, url, certificadosDir, auth, authUrl, snapshot;
let creado = false;
let estadoAuth = 204;
let llamadasAuth = [];

function token(id = usuario, roles = ['ESTUDIANTE']) {
  return jwt.sign({ sub: id, roles, jti: randomUUID(), correo_institucional: 'prueba@alu.uct.cl' }, {
    algorithm: 'HS256', issuer: 'stp-usuarios-auth', audience: 'stp-clients', expiresIn: '10m',
  });
}
const tokenAdmin = token(administrador, ['ADMINISTRADOR']);

async function snapshotPublico() {
  const { rows } = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  const resultado = {};
  for (const { tablename } of rows) {
    const tabla = '"' + tablename.replaceAll('"', '""') + '"';
    const r = await pool.query(`SELECT md5(COALESCE(jsonb_agg(j ORDER BY j::text)::text,'[]')) hash FROM (SELECT to_jsonb(t) j FROM public.${tabla} t) filas`);
    resultado[tablename] = r.rows[0].hash;
  }
  return resultado;
}

before(async () => {
  const env = parse(await readFile('.env'));
  const databaseUrl = process.env.TEST_DATABASE_URL ?? env.TEST_DATABASE_URL ?? env.DATABASE_URL;
  assert.ok(databaseUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname), 'Solo PostgreSQL local');
  assert.match(schema, /^test_postulaciones_[a-f0-9]{32}$/);
  pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  snapshot = await snapshotPublico();
  await pool.query(`CREATE SCHEMA "${schema}"`);
  creado = true;
  const cliente = await pool.connect();
  try {
    await cliente.query(`SET search_path TO "${schema}"`);
    for (const carpeta of (await readdir('prisma/migrations', { withFileTypes: true })).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await cliente.query(await readFile(join('prisma/migrations', carpeta.name, 'migration.sql'), 'utf8'));
    }
  } finally { await cliente.query('RESET search_path'); cliente.release(); }
  certificadosDir = await mkdtemp(join(tmpdir(), 'stp-postulaciones-'));
  auth = createServer(async (req, res) => {
    const fragmentos = [];
    for await (const fragmento of req) fragmentos.push(fragmento);
    llamadasAuth.push({ metodo: req.method, ruta: req.url, secreto: req.headers['x-integracion-secret'], tipo: req.headers['content-type'], datos: JSON.parse(Buffer.concat(fragmentos).toString()) });
    res.writeHead(estadoAuth).end();
  });
  await new Promise((r) => auth.listen(0, '127.0.0.1', r));
  authUrl = `http://127.0.0.1:${auth.address().port}/asignar-tutor`;
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }, { schema }) });
  const modulo = await Test.createTestingModule({ imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ DATABASE_URL: databaseUrl, JWT_SECRET: secreto, INTEGRACION_SECRET: secreto, CERTIFICADOS_DIR: certificadosDir, USUARIOS_AUTH_ASIGNAR_TUTOR_URL: authUrl })] }),
    PostulacionesModule, TutoresModule,
  ] }).overrideProvider(PrismaService).useValue(prisma).compile();
  app = modulo.createNestApplication({ logger: false });
  await app.listen(0, '127.0.0.1');
  Object.assign(process.env, { MATERIAS_TUTORES_URL: await app.getUrl(), USUARIOS_AUTH_URL: '', AGENDAMIENTO_SESIONES_URL: '', REPORTES_MODERACION_URL: '', CORS_ORIGIN: 'http://localhost:5173' });
  const gatewayDir = resolve(process.env.GATEWAY_PROJECT_DIR ?? '../../../apiGateway/api-gateway');
  const { crearAplicacion } = await import(pathToFileURL(join(gatewayDir, 'dist/crear-aplicacion.js')).href);
  gateway = await crearAplicacion({ logger: false });
  await gateway.listen(0, '127.0.0.1');
  url = await gateway.getUrl() + '/api/materias-tutores';
}, { timeout: 60000 });

beforeEach(async () => {
  await pool.query(`TRUNCATE "${schema}".materia, "${schema}".perfil_tutor RESTART IDENTITY CASCADE`);
  await prisma.materia.create({ data: { idMateria: 2n, codigo: 'HEX-001', nombre: 'Materia de prueba aislada' } });
  estadoAuth = 204; llamadasAuth = [];
  app.get(ConfigService).set('USUARIOS_AUTH_ASIGNAR_TUTOR_URL', authUrl);
});

after(async () => {
  try {
    await gateway?.close();
    await app?.close();
    await prisma?.$disconnect();
    if (auth) { auth.closeAllConnections(); await new Promise((r) => auth.close(r)); }
  } finally {
    if (pool) {
      try {
        if (creado) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
        if (snapshot) assert.deepEqual(await snapshotPublico(), snapshot, 'Se conservan los datos reales');
        assert.equal((await pool.query('SELECT to_regnamespace($1) existe', [schema])).rows[0].existe, null);
      } finally { await pool.end(); }
    }
    if (certificadosDir) {
      assert.equal(dirname(certificadosDir), resolve(tmpdir()));
      assert.ok(basename(certificadosDir).startsWith('stp-postulaciones-'));
      await rm(certificadosDir, { recursive: true, force: true });
    }
  }
}, { timeout: 30000 });

function pedir(ruta, { method = 'GET', body, credencial = token() } = {}) {
  const headers = {};
  if (credencial) headers.Authorization = `Bearer ${credencial}`;
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const opciones = { method, headers, signal: AbortSignal.timeout(15000) };
  if (body && !['GET', 'HEAD'].includes(method)) opciones.body = body instanceof FormData ? body : JSON.stringify(body);
  return fetch(url + ruta, opciones);
}

function postular({ contenido = pdf, tipo = 'application/pdf', nombre = 'notas.pdf', idMateria = '2', credencial = token() } = {}) {
  const body = new FormData(); body.append('idMateria', idMateria); body.append('certificado', new Blob([contenido], { type: tipo }), nombre);
  return pedir('/postulaciones', { method: 'POST', body, credencial });
}
async function crear() {
  const respuesta = await postular(); assert.equal(respuesta.status, 201); return respuesta.json();
}
function aprobar(id, nota = 5.5) { return pedir(`/postulaciones/${id}/aprobar`, { method: 'PATCH', credencial: tokenAdmin, body: { notaAcreditada: nota } }); }

void test('Gateway conserva multipart, JSON público, BIGINT, fechas y consultas propias', async () => {
  const creada = await crear();
  assert.deepEqual(creada, {
    idPostulacion: '1', idUsuario: usuario, idMateria: '2', idAdministradorRevision: null,
    certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf', notaAcreditada: null, estado: 'PENDIENTE',
    fechaPostulacion: creada.fechaPostulacion, fechaRevision: null, motivoRechazo: null,
  });
  assert.ok(Number.isFinite(Date.parse(creada.fechaPostulacion)));
  assert.deepEqual(await (await pedir('/postulaciones/mias')).json(), [creada]);
  assert.deepEqual(await (await pedir('/postulaciones/mias', { credencial: token('11') })).json(), []);
  assert.deepEqual(await (await pedir('/postulaciones/pendientes', { credencial: tokenAdmin })).json(), [creada]);
});

void test('JWT y permisos siguen protegiendo altas, revisión y certificados', async () => {
  assert.equal((await postular({ credencial: null })).status, 401);
  await crear();
  for (const ruta of ['/postulaciones/pendientes', '/postulaciones/1/certificado']) {
    assert.equal((await pedir(ruta, { credencial: null })).status, 401);
  }
  assert.equal((await pedir('/postulaciones/pendientes')).status, 403);
  assert.equal((await pedir('/postulaciones/1/aprobar', { method: 'PATCH', body: { notaAcreditada: 5 } })).status, 403);
  assert.equal((await pedir('/postulaciones/1/certificado', { credencial: token('11') })).status, 404);
  assert.equal(llamadasAuth.length, 0);
});

void test('certificados inválidos, archivos ausentes, IDs y materias inexistentes conservan sus errores', async () => {
  assert.equal((await postular({ contenido: Buffer.from('falso') })).status, 400);
  assert.equal((await postular({ contenido: Buffer.alloc(0) })).status, 400);
  assert.equal((await postular({ contenido: Buffer.alloc(5_000_001) })).status, 413);
  assert.equal((await postular({ idMateria: 'abc' })).status, 400);
  assert.equal((await postular({ idMateria: '99' })).status, 404);
  const body = new FormData(); body.append('idMateria', '2');
  assert.equal((await pedir('/postulaciones', { method: 'POST', body })).status, 400);
  assert.equal(await prisma.postulacionTutor.count(), 0);
});

void test('las postulaciones simultáneas no crean duplicados', async () => {
  const respuestas = await Promise.all(Array.from({ length: 6 }, () => postular()));
  assert.equal(respuestas.filter((r) => r.status === 201).length, 1);
  assert.equal(respuestas.filter((r) => r.status === 409).length, 5);
  assert.equal(await prisma.postulacionTutor.count(), 1);
  assert.equal((await postular()).status, 409);
});

void test('descarga los bytes PDF/PNG originales con cabeceras seguras', async () => {
  for (const [contenido, tipo, nombre] of [[pdf, 'application/pdf', 'notas.pdf'], [png, 'image/png', 'notas.png']]) {
    const creada = await (await postular({ contenido, tipo, nombre, credencial: token(tipo === 'image/png' ? '12' : usuario) })).json();
    const respuesta = await pedir(`/postulaciones/${creada.idPostulacion}/certificado`, { credencial: tokenAdmin });
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get('content-type'), tipo);
    assert.equal(respuesta.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(respuesta.headers.get('content-disposition'), `attachment; filename="certificado.${tipo === 'image/png' ? 'png' : 'pdf'}"`);
    assert.deepEqual(Buffer.from(await respuesta.arrayBuffer()), contenido);
  }
});

void test('la validación académica y de entrada precede a cualquier revisión persistida', async () => {
  const creada = await crear();
  for (const [nota, status] of [[4.9, 409], [5.05, 400], [7.1, 400]]) assert.equal((await aprobar(creada.idPostulacion, nota)).status, status);
  assert.equal((await pedir('/postulaciones/1/aprobar', { method: 'PATCH', credencial: tokenAdmin, body: { notaAcreditada: 5, idUsuario: '12' } })).status, 400);
  assert.equal((await prisma.postulacionTutor.findFirstOrThrow()).estado, 'PENDIENTE');
  assert.equal(llamadasAuth.length, 0);
});

void test('sin configuración de Auth devuelve el mismo 503 y mantiene PENDIENTE_ROL sin habilitación', async () => {
  const creada = await crear();
  app.get(ConfigService).set('USUARIOS_AUTH_ASIGNAR_TUTOR_URL', '');
  const respuesta = await aprobar(creada.idPostulacion);
  assert.equal(respuesta.status, 503);
  assert.deepEqual(await respuesta.json(), { statusCode: 503, message: 'La asignación del rol TUTOR no está configurada', error: 'Service Unavailable' });
  const registro = await prisma.postulacionTutor.findFirstOrThrow();
  assert.equal(registro.estado, 'PENDIENTE_ROL'); assert.equal(registro.notaAcreditada.toNumber(), 5.5); assert.equal(registro.idAdministradorRevision, BigInt(administrador));
  assert.equal((await prisma.tutorMateria.findFirstOrThrow()).vigente, false);
  assert.equal(await prisma.perfilTutor.count(), 0); assert.equal(llamadasAuth.length, 0);
});

void test('un fallo remoto conserva el pendiente y el reintento usa el mismo contrato HTTP', async () => {
  const creada = await crear(); estadoAuth = 503;
  assert.equal((await aprobar(creada.idPostulacion)).status, 503);
  assert.equal((await prisma.tutorMateria.findFirstOrThrow()).vigente, false);
  assert.equal((await (await pedir('/tutores?materiaId=2')).json()).total, 0);
  estadoAuth = 204;
  const respuesta = await pedir(`/postulaciones/${creada.idPostulacion}/reintentar-rol`, { method: 'POST', credencial: tokenAdmin });
  assert.equal(respuesta.status, 200); assert.equal((await respuesta.json()).estado, 'APROBADA');
  assert.equal(llamadasAuth.length, 2);
  for (const llamada of llamadasAuth) assert.deepEqual(llamada, { metodo: 'POST', ruta: '/asignar-tutor', secreto, tipo: 'application/json', datos: { idUsuario: usuario, rol: 'TUTOR' } });
  assert.equal((await prisma.tutorMateria.findFirstOrThrow()).vigente, true);
  assert.equal((await prisma.perfilTutor.findFirstOrThrow()).estado, 'ACTIVO');
  const tutores = await (await pedir('/tutores?materiaId=2')).json();
  assert.equal(tutores.total, 1); assert.equal(tutores.items[0].idTutor, usuario);
  assert.equal((await aprobar(creada.idPostulacion)).status, 409);
  assert.equal((await pedir('/postulaciones/1/reintentar-rol', { method: 'POST', credencial: tokenAdmin })).status, 409);
  assert.equal(llamadasAuth.length, 2);
});

void test('la aprobación directa mantiene nota, administrador y respuesta pública', async () => {
  const creada = await crear(); const respuesta = await aprobar(creada.idPostulacion, 7);
  assert.equal(respuesta.status, 200); const datos = await respuesta.json();
  assert.equal(datos.idAdministradorRevision, administrador); assert.equal(datos.notaAcreditada, 7); assert.equal(datos.estado, 'APROBADA');
  assert.ok(Number.isFinite(Date.parse(datos.fechaRevision))); assert.equal('certificadoRef' in datos, false);
  assert.equal((await prisma.tutorMateria.findFirstOrThrow()).vigente, true);
});

void test('rechazar conserva el motivo, impide una segunda revisión y permite otra postulación', async () => {
  const creada = await crear();
  const respuesta = await pedir(`/postulaciones/${creada.idPostulacion}/rechazar`, { method: 'PATCH', credencial: tokenAdmin, body: { motivoRechazo: '  Certificado ilegible  ' } });
  assert.equal(respuesta.status, 200); const datos = await respuesta.json();
  assert.equal(datos.estado, 'RECHAZADA'); assert.equal(datos.motivoRechazo, 'Certificado ilegible'); assert.equal(datos.idAdministradorRevision, administrador);
  assert.equal((await aprobar(creada.idPostulacion)).status, 409); assert.equal(llamadasAuth.length, 0);
  assert.equal((await postular()).status, 201);
});

void test('aprobar y rechazar simultáneamente conservan una única revisión', async () => {
  const creada = await crear();
  const respuestas = await Promise.all([aprobar(creada.idPostulacion), pedir('/postulaciones/1/rechazar', { method: 'PATCH', credencial: tokenAdmin, body: { motivoRechazo: 'No acredita nota' } })]);
  assert.deepEqual(respuestas.map((r) => r.status).sort((a, b) => a - b), [200, 409]);
  const registro = await prisma.postulacionTutor.findFirstOrThrow();
  assert.ok(['APROBADA', 'RECHAZADA'].includes(registro.estado));
  assert.equal(llamadasAuth.length, registro.estado === 'APROBADA' ? 1 : 0);
});
