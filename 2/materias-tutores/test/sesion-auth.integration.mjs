import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'dotenv';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedJwtGuard } from '../dist/auth/authenticated-jwt.guard.js';
import { TutorJwtGuard } from '../dist/auth/tutor-jwt.guard.js';
import { HttpSesionAuthClient } from '../dist/auth/http-sesion-auth.client.js';
import { ConsultaTutoresGuard } from '../dist/auth/consulta-tutores.guard.js';
import { IntegracionSecretGuard } from '../dist/auth/integracion-secret.guard.js';

// Guards reales -> HTTP real de Auth -> PostgreSQL en un esquema temporal.
// Requiere compilar previamente Auth, Sesiones y Reportes.
const authDir = resolve(process.env.AUTH_PROJECT_DIR ?? '../../usuarios-auth/usuarios-auth');
const sesionesDir = resolve(
  process.env.SESIONES_PROJECT_DIR ?? '../../agendamiento-sesiones/agendamiento-sesiones',
);
const reportesDir = resolve(
  process.env.REPORTES_PROJECT_DIR ?? '../../Integracion-IV-x-II/reportes-moderacion',
);
const authRequire = createRequire(join(authDir, 'package.json'));
const sesionesRequire = createRequire(join(sesionesDir, 'package.json'));
const { Test } = authRequire('@nestjs/testing');
const { ConfigModule } = authRequire('@nestjs/config');
const { PrismaClient } = authRequire('@prisma/client');
const { AuthModule } = authRequire(join(authDir, 'dist/auth/auth.module.js'));
const { PrismaService } = authRequire(join(authDir, 'dist/prisma/prisma.service.js'));
const { hash } = authRequire('argon2');
const { JwtAuthGuard } = sesionesRequire(join(sesionesDir, 'dist/auth/jwt-auth.guard.js'));
const { HttpSesionAuthClient: SesionesAuthClient } = sesionesRequire(
  join(sesionesDir, 'dist/auth/http-sesion-auth.client.js'),
);
const { IntegracionSecretGuard: IntegracionSesionesGuard } = sesionesRequire(
  join(sesionesDir, 'dist/auth/integracion-secret.guard.js'),
);
const importarReporte = (archivo) =>
  import(pathToFileURL(join(reportesDir, 'dist/reportes/infraestructura', archivo)).href);
const { UsuarioJwtGuard } = await importarReporte('http/guards/usuario-jwt.guard.js');
const { AdminJwtGuard } = await importarReporte('http/guards/admin-jwt.guard.js');
const { HttpSesionAuthClient: ReportesAuthClient } = await importarReporte(
  'clientes/http-sesion-auth.client.js',
);
const schema = `test_sesion_auth_${randomUUID().replaceAll('-', '')}`;
const secret = randomBytes(32).toString('hex');
const correo = 'prueba-sesion@alu.uct.cl';
const password = 'Clave ficticia de pruebas 123';
const entornoAnterior = {
  JWT_SECRET: process.env.JWT_SECRET,
  USUARIOS_AUTH_URL: process.env.USUARIOS_AUTH_URL,
  MODERACION_INTEGRACION_SECRET: process.env.MODERACION_INTEGRACION_SECRET,
};
let app, prisma, pool, authUrl, usuario, consultaInterna, integracionSesiones;
let creado = false;
let guards = [];

function contexto(headers) {
  const request = { headers };
  return { switchToHttp: () => ({ getRequest: () => request }) };
}
async function autenticar() {
  const respuesta = await fetch(authUrl + '/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ correo_institucional: correo, password }),
  });
  assert.equal(respuesta.status, 200);
  return (await respuesta.json()).access_token;
}
async function comprobar(token, estado = 200) {
  for (const [nombre, guard] of guards) {
    const accion = () => guard.canActivate(contexto({ authorization: `Bearer ${token}` }));
    if (estado === 200) assert.equal(await accion(), true, nombre);
    else await assert.rejects(accion, (error) => error.getStatus() === estado, nombre);
  }
}
async function moderar(estado) {
  const respuesta = await fetch(
    `${authUrl}/internal/usuarios/${usuario.id_usuario}/estado-cuenta`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-internal-service-key': secret },
      body: JSON.stringify({ estado }),
    },
  );
  assert.equal(respuesta.status, 200);
}

before(
  async () => {
    const env = parse(await readFile(join(authDir, '.env')));
    const databaseUrl = process.env.AUTH_TEST_DATABASE_URL ?? env.DATABASE_URL;
    assert.ok(databaseUrl, 'Configura la base local de Auth.');
    assert.ok(
      ['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname),
      'Solo PostgreSQL local.',
    );
    assert.match(schema, /^test_sesion_auth_[a-f0-9]{32}$/);
    pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
    await pool.query(`CREATE SCHEMA "${schema}"`);
    creado = true;
    const cliente = await pool.connect();
    try {
      await cliente.query(`SET search_path TO "${schema}"`);
      const directorio = join(authDir, 'prisma/migrations');
      for (const entrada of (await readdir(directorio, { withFileTypes: true }))
        .filter((e) => e.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name))) {
        await cliente.query(
          await readFile(join(directorio, entrada.name, 'migration.sql'), 'utf8'),
        );
      }
    } finally {
      await cliente.query('RESET search_path');
      cliente.release();
    }
    const url = new URL(databaseUrl);
    url.searchParams.set('schema', schema);
    prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
    usuario = await prisma.usuario.create({
      data: {
        nombre: 'Prueba de sesiones',
        correo_institucional: correo,
        password_hash: await hash(password),
        estado_cuenta: 'ACTIVO',
        correo_verificado: true,
        roles: {
          create: ['ESTUDIANTE', 'TUTOR', 'ADMINISTRADOR'].map((nombre) => ({
            rol: { connectOrCreate: { where: { nombre }, create: { nombre } } },
          })),
        },
      },
    });
    const modulo = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: secret,
              JWT_ACCESS_TTL_SECONDS: 1800,
              JWT_IDLE_TIMEOUT_SECONDS: 1800,
              INTERNAL_SERVICE_API_KEY: secret,
            }),
          ],
        }),
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = modulo.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    authUrl = await app.getUrl();
    process.env.USUARIOS_AUTH_URL = authUrl;
    process.env.JWT_SECRET = secret;
    process.env.MODERACION_INTEGRACION_SECRET = secret;
    const config = new ConfigService({ USUARIOS_AUTH_URL: authUrl, INTEGRACION_SECRET: secret });
    const jwt = new JwtService({
      secret,
      verifyOptions: {
        algorithms: ['HS256'],
        issuer: 'stp-usuarios-auth',
        audience: 'stp-clients',
      },
    });
    const materiasAuth = new HttpSesionAuthClient(config);
    const usuarios = new AuthenticatedJwtGuard(jwt, materiasAuth);
    const reportesAuth = new ReportesAuthClient();
    guards = [
      ['Materias usuario', usuarios],
      ['Materias tutor', new TutorJwtGuard(jwt, materiasAuth)],
      ['Sesiones', new JwtAuthGuard(jwt, new SesionesAuthClient(config))],
      ['Reportes usuario', new UsuarioJwtGuard(reportesAuth)],
      ['Reportes administrador', new AdminJwtGuard(reportesAuth)],
    ];
    consultaInterna = new ConsultaTutoresGuard(usuarios, new IntegracionSecretGuard(config));
    integracionSesiones = new IntegracionSesionesGuard();
  },
  { timeout: 30000 },
);

void test('permite una sesión real y registra actividad al operar en los microservicios', async () => {
  const token = await autenticar();
  const { jti } = new JwtService().decode(token);
  const anterior = new Date(Date.now() - 60000);
  await prisma.sesion.update({ where: { jti }, data: { ultima_actividad: anterior } });
  await comprobar(token);
  assert.ok(
    (await prisma.sesion.findUniqueOrThrow({ where: { jti } })).ultima_actividad > anterior,
  );
});

void test('rechaza el mismo JWT después del logout', async () => {
  const token = await autenticar();
  await comprobar(token);
  const respuesta = await fetch(authUrl + '/auth/logout', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(respuesta.status, 204);
  await comprobar(token, 401);
});

void test('suspensión revoca el acceso y reactivación no revive el JWT anterior', async () => {
  const token = await autenticar();
  await moderar('SUSPENDIDO');
  await comprobar(token, 401);
  await moderar('ACTIVO');
  await comprobar(token, 401);
  await comprobar(await autenticar());
});

void test('rechaza una sesión por inactividad aunque el JWT no haya vencido', async () => {
  const token = await autenticar();
  const { jti } = new JwtService().decode(token);
  await prisma.sesion.update({
    where: { jti },
    data: { ultima_actividad: new Date(Date.now() - 1900000) },
  });
  await comprobar(token, 401);
});

void test('rechaza cuentas inactivas y cuentas que dejan de estar verificadas', async () => {
  for (const cambio of [{ estado_cuenta: 'INACTIVO' }, { correo_verificado: false }]) {
    const token = await autenticar();
    try {
      await prisma.usuario.update({ where: { id_usuario: usuario.id_usuario }, data: cambio });
      await comprobar(token, 401);
    } finally {
      await prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: { estado_cuenta: 'ACTIVO', correo_verificado: true },
      });
    }
  }
});

void test('conserva las llamadas internas y rechaza Bearer inválido con secreto correcto', async () => {
  const headers = { 'x-integracion-secret': secret };
  assert.equal(await consultaInterna.canActivate(contexto(headers)), true);
  assert.equal(integracionSesiones.canActivate(contexto(headers)), true);
  await assert.rejects(
    () => consultaInterna.canActivate(contexto({ ...headers, authorization: 'Bearer invalido' })),
    (error) => error.getStatus() === 401,
  );
  assert.throws(
    () => integracionSesiones.canActivate(contexto({ 'x-integracion-secret': 'incorrecto' })),
    (error) => error.getStatus() === 401,
  );
});

void test('con Auth detenido bloquea usuarios con 503 y mantiene la integración interna', async () => {
  const token = await autenticar();
  await app.close();
  app = undefined;
  await comprobar(token, 503);
  assert.equal(
    await consultaInterna.canActivate(contexto({ 'x-integracion-secret': secret })),
    true,
  );
});

after(async () => {
  try {
    await app?.close();
    await prisma?.$disconnect();
    if (creado) {
      assert.match(schema, /^test_sesion_auth_[a-f0-9]{32}$/);
      await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    }
  } finally {
    await pool?.end();
    for (const [clave, valor] of Object.entries(entornoAnterior)) {
      if (valor === undefined) delete process.env[clave];
      else process.env[clave] = valor;
    }
  }
});
