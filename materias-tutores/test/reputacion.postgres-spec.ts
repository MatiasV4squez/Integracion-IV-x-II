import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { Pool } from 'pg';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ReputacionModule } from '../src/reputacion/reputacion.module.js';

describe('Reputación con PostgreSQL real en esquema temporal', () => {
  const schema = `test_reputacion_${randomUUID().replaceAll('-', '')}`;
  const secreto = randomBytes(32).toString('hex');
  const jwt = new JwtService({ secret: secreto });
  const token = jwt.sign(
    { sub: '10', jti: 'test-postgres', correo_institucional: 'prueba@alu.uct.cl', roles: ['ESTUDIANTE'] },
    { algorithm: 'HS256', issuer: 'stp-usuarios-auth', audience: 'stp-clients', expiresIn: '10m' },
  );
  const tablas = ['materia', 'tutor_materia', 'perfil_tutor', 'calificacion_tutor_procesada', 'bloque_horario', 'postulacion_tutor'];
  let pool: Pool | undefined;
  let prisma: PrismaClient | undefined;
  let app: INestApplication<Server> | undefined;
  let creado = false;
  let estadoPublico: string[] = [];
  let materiaId: bigint;

  async function snapshotPublico(): Promise<string[]> {
    const fingerprints: string[] = [];
    for (const tabla of tablas) {
      const existe = await pool!.query<{ existe: string | null }>('SELECT to_regclass($1)::text AS existe', [`public.${tabla}`]);
      if (!existe.rows[0].existe) {
        fingerprints.push('ausente');
        continue;
      }
      const resultado = await pool!.query<{ fingerprint: string }>(
        `SELECT md5(COALESCE(jsonb_agg(data ORDER BY data::text)::text, '[]')) AS fingerprint FROM (SELECT to_jsonb(t) AS data FROM public."${tabla}" t) filas`,
      );
      fingerprints.push(resultado.rows[0].fingerprint);
    }
    return fingerprints;
  }

  beforeAll(async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('Configura TEST_DATABASE_URL o DATABASE_URL para PostgreSQL.');
    const destino = new URL(databaseUrl);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname)) {
      throw new Error('Estas pruebas solo permiten PostgreSQL local.');
    }
    pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
    estadoPublico = await snapshotPublico();
    if (!/^test_reputacion_[a-f0-9]{32}$/.test(schema)) throw new Error('Nombre de esquema inesperado.');
    await pool.query(`CREATE SCHEMA "${schema}"`);
    creado = true;
    const cliente = await pool.connect();
    try {
      await cliente.query(`SET search_path TO "${schema}"`);
      const migraciones = (await readdir('prisma/migrations', { withFileTypes: true }))
        .filter((entrada) => entrada.isDirectory())
        .map((entrada) => entrada.name)
        .sort();
      for (const migracion of migraciones) {
        const sql = await readFile(`prisma/migrations/${migracion}/migration.sql`, 'utf8');
        await cliente.query(sql);
      }
    } finally {
      await cliente.query('RESET search_path');
      cliente.release();
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }, { schema }) });
    const modulo = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ DATABASE_URL: databaseUrl, JWT_SECRET: secreto, INTEGRACION_SECRET: secreto })] }), ReputacionModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = modulo.createNestApplication<INestApplication<Server>>({ logger: false });
    await app.init();
  });

  beforeEach(async () => {
    await prisma!.calificacionTutorProcesada.deleteMany();
    await prisma!.perfilTutor.deleteMany();
    await prisma!.tutorMateria.deleteMany();
    await prisma!.materia.deleteMany();
    const materia = await prisma!.materia.create({ data: { codigo: 'TEST_REPUTACION', nombre: 'Prueba aislada' } });
    materiaId = materia.idMateria;
    await prisma!.tutorMateria.createMany({ data: [10n, 15n, 9007199254740993n].map((idUsuario) => ({ idUsuario, idMateria: materiaId })) });
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      try {
        if (prisma) await prisma.$disconnect();
      } finally {
        if (pool) {
          try {
            if (creado) {
              await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
              expect(await snapshotPublico()).toEqual(estadoPublico);
              const restantes = await pool.query<{ existe: string | null }>('SELECT to_regnamespace($1)::text AS existe', [schema]);
              expect(restantes.rows[0].existe).toBeNull();
            }
          } finally {
            await pool.end();
          }
        }
      }
    }
  });

  function enviar(idCalificacion: string, puntuacion: number, idTutor = '10') {
    return request(app!.getHttpServer()).post(`/integraciones/tutores/${idTutor}/calificaciones`).set('X-Integracion-Secret', secreto).send({ idCalificacion, puntuacion, rolEvaluado: 'TUTOR' });
  }

  it('recalcula inmediatamente y conserva revisión al recuperarse el promedio', async () => {
    await enviar('1', 1).expect(201).expect({ idTutor: '10', cantidadCalificaciones: 1, promedio: 1, estado: 'ACTIVO' });
    await enviar('2', 2).expect(201).expect({ idTutor: '10', cantidadCalificaciones: 2, promedio: 1.5, estado: 'ACTIVO' });
    await enviar('3', 4)
      .expect(201)
      .expect({ idTutor: '10', cantidadCalificaciones: 3, promedio: 7 / 3, estado: 'EN_REVISION' });
    await enviar('4', 5).expect(201).expect({ idTutor: '10', cantidadCalificaciones: 4, promedio: 3, estado: 'EN_REVISION' });
    await request(app!.getHttpServer())
      .get('/tutores/10/reputacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ idTutor: '10', cantidadCalificaciones: 4, promedio: 3, estado: 'EN_REVISION' });
    expect(await prisma!.perfilTutor.findUnique({ where: { idUsuario: 10n } })).toMatchObject({ sumaCalificaciones: 12, cantidadCalificaciones: 4, estado: 'EN_REVISION' });
  });
  it('no marca revisión cuando el promedio es exactamente 2.5', async () => {
    await enviar('1', 4).expect(201);
    await enviar('2', 3).expect(201);
    await enviar('3', 2).expect(201);
    await enviar('4', 1).expect(201).expect({ idTutor: '10', cantidadCalificaciones: 4, promedio: 2.5, estado: 'ACTIVO' });
  });
  it('es idempotente también después de deshabilitar al tutor', async () => {
    await enviar('1', 5).expect(201);
    await prisma!.tutorMateria.updateMany({ where: { idUsuario: 10n }, data: { vigente: false } });
    await enviar('1', 5).expect(201);
    expect(await prisma!.calificacionTutorProcesada.count()).toBe(1);
    expect(await prisma!.perfilTutor.findUnique({ where: { idUsuario: 10n } })).toMatchObject({ sumaCalificaciones: 5, cantidadCalificaciones: 1 });
  });
  it('rechaza reutilizar el identificador para otra nota o tutor sin efectos secundarios', async () => {
    await enviar('1', 5).expect(201);
    await enviar('1', 1).expect(409);
    await enviar('1', 5, '15').expect(409);
    expect(await prisma!.calificacionTutorProcesada.count()).toBe(1);
    expect(await prisma!.perfilTutor.count()).toBe(1);
  });
  it('cuenta una sola vez dos entregas simultáneas del mismo evento', async () => {
    const respuestas = await Promise.all([enviar('1', 5), enviar('1', 5)]);
    expect(respuestas.map((r) => r.status)).toEqual([201, 201]);
    expect(await prisma!.calificacionTutorProcesada.count()).toBe(1);
    expect(await prisma!.perfilTutor.findUnique({ where: { idUsuario: 10n } })).toMatchObject({ sumaCalificaciones: 5, cantidadCalificaciones: 1 });
  });
  it('no pierde actualizaciones con dos calificaciones diferentes simultáneas', async () => {
    const respuestas = await Promise.all([enviar('1', 4), enviar('2', 5)]);
    expect(respuestas.map((r) => r.status)).toEqual([201, 201]);
    expect(await prisma!.perfilTutor.findUnique({ where: { idUsuario: 10n } })).toMatchObject({ sumaCalificaciones: 9, cantidadCalificaciones: 2 });
    expect(await prisma!.calificacionTutorProcesada.count()).toBe(2);
  });
  it('revierte evento y acumuladores si falla la escritura del estado', async () => {
    await pool!.query(`CREATE FUNCTION "${schema}".fallo_estado() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo controlado de prueba'; END $$;
      CREATE TRIGGER fallo_estado BEFORE UPDATE ON "${schema}".perfil_tutor FOR EACH ROW EXECUTE FUNCTION "${schema}".fallo_estado();`);
    try {
      await enviar('1', 2).expect(500);
      expect(await prisma!.calificacionTutorProcesada.count()).toBe(0);
      expect(await prisma!.perfilTutor.count()).toBe(0);
    } finally {
      await pool!.query(`DROP TRIGGER fallo_estado ON "${schema}".perfil_tutor; DROP FUNCTION "${schema}".fallo_estado();`);
    }
  });
  it('rechaza entradas, rol incorrecto y claves inválidas sin escribir', async () => {
    await enviar('1', 0).expect(400);
    await request(app!.getHttpServer())
      .post('/integraciones/tutores/10/calificaciones')
      .set('X-Integracion-Secret', secreto)
      .send({ idCalificacion: '1', puntuacion: 5, rolEvaluado: 'TUTEE' })
      .expect(409);
    await request(app!.getHttpServer()).post('/integraciones/tutores/10/calificaciones').send({ idCalificacion: '1', puntuacion: 5, rolEvaluado: 'TUTOR' }).expect(401);
    expect(await prisma!.calificacionTutorProcesada.count()).toBe(0);
    expect(await prisma!.perfilTutor.count()).toBe(0);
  });
  it('consulta tutor sin notas y distingue tutor inexistente', async () => {
    await request(app!.getHttpServer())
      .get('/tutores/10/reputacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ idTutor: '10', cantidadCalificaciones: 0, promedio: null, estado: 'ACTIVO' });
    await request(app!.getHttpServer()).get('/tutores/999/reputacion').set('Authorization', `Bearer ${token}`).expect(404);
  });
  it('conserva BIGINT al persistir y consultar', async () => {
    await enviar('9007199254740993', 5, '9007199254740993').expect(201).expect({ idTutor: '9007199254740993', cantidadCalificaciones: 1, promedio: 5, estado: 'ACTIVO' });
    expect(await prisma!.calificacionTutorProcesada.findUnique({ where: { idCalificacion: 9007199254740993n } })).toMatchObject({ idTutor: 9007199254740993n, puntuacion: 5 });
  });
});
