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
import { DisponibilidadModule } from '../src/disponibilidad/disponibilidad.module.js';
import { RELOJ_DISPONIBILIDAD } from '../src/disponibilidad/aplicacion/puertos/reloj.port.js';
import { PrismaDisponibilidadRepository } from '../src/disponibilidad/infraestructura/prisma-disponibilidad.repository.js';

describe('Disponibilidad con HTTP y PostgreSQL reales', () => {
  const schema = `test_disponibilidad_${randomUUID().replaceAll('-', '')}`;
  const secreto = randomBytes(32).toString('hex');
  const jwt = new JwtService({ secret: secreto });
  const horario = { dia: '2026-10-01', horaInicio: '10:00', horaFin: '11:00' };
  let pool: Pool | undefined;
  let prisma: PrismaClient | undefined;
  let app: INestApplication<Server> | undefined;
  let creado = false;
  let estadoPublico: string;

  function token(id = '10', roles = ['TUTOR']) {
    return jwt.sign(
      { sub: id, jti: 'test-disponibilidad', correo_institucional: 'prueba@alu.uct.cl', roles },
      { algorithm: 'HS256', issuer: 'stp-usuarios-auth', audience: 'stp-clients', expiresIn: '10m' },
    );
  }
  async function snapshotPublico(): Promise<string> {
    const existe = await pool!.query<{ existe: string | null }>("SELECT to_regclass('public.bloque_horario')::text AS existe");
    if (!existe.rows[0].existe) return 'ausente';
    const resultado = await pool!.query<{ hash: string }>(
      "SELECT md5(COALESCE(jsonb_agg(data ORDER BY data::text)::text, '[]')) AS hash FROM (SELECT to_jsonb(t) AS data FROM public.bloque_horario t) filas",
    );
    return resultado.rows[0].hash;
  }
  async function insertar(idTutor = 10n, datos: Partial<typeof horario> & { estadoBloque?: string; idBloque?: bigint } = {}) {
    const { dia, horaInicio, horaFin } = { ...horario, ...datos };
    return prisma!.bloqueHorario.create({
      data: {
        idTutor,
        dia: new Date(`${dia}T00:00:00Z`),
        horaInicio: new Date(`1970-01-01T${horaInicio}:00Z`),
        horaFin: new Date(`1970-01-01T${horaFin}:00Z`),
        estadoBloque: datos.estadoBloque,
        idBloque: datos.idBloque,
      },
    });
  }
  function crear(datos: object = horario, idTutor = '10', roles = ['TUTOR']) {
    return request(app!.getHttpServer())
      .post('/disponibilidad/bloques')
      .set('Authorization', `Bearer ${token(idTutor, roles)}`)
      .send(datos);
  }

  beforeAll(async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('Configura TEST_DATABASE_URL o DATABASE_URL.');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname)) throw new Error('Estas pruebas solo permiten PostgreSQL local.');
    if (!/^test_disponibilidad_[a-f0-9]{32}$/.test(schema)) throw new Error('Nombre de esquema inesperado.');
    pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
    estadoPublico = await snapshotPublico();
    await pool.query(`CREATE SCHEMA "${schema}"`);
    creado = true;
    const cliente = await pool.connect();
    try {
      await cliente.query(`SET search_path TO "${schema}"`);
      const migraciones = (await readdir('prisma/migrations', { withFileTypes: true }))
        .filter((entrada) => entrada.isDirectory())
        .map((entrada) => entrada.name)
        .sort();
      for (const migracion of migraciones) await cliente.query(await readFile(`prisma/migrations/${migracion}/migration.sql`, 'utf8'));
    } finally {
      await cliente.query('RESET search_path');
      cliente.release();
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }, { schema }) });
    const modulo = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, load: [() => ({ DATABASE_URL: databaseUrl, JWT_SECRET: secreto })] }), DisponibilidadModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(RELOJ_DISPONIBILIDAD)
      .useValue({ ahora: () => new Date('2026-10-01T12:30:00Z') })
      .compile();
    app = modulo.createNestApplication<INestApplication<Server>>({ logger: false });
    await app.init();
  });

  beforeEach(async () => {
    await prisma!.bloqueHorario.deleteMany();
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
              expect(await snapshotPublico()).toBe(estadoPublico);
              const restante = await pool.query<{ existe: string | null }>('SELECT to_regnamespace($1)::text AS existe', [schema]);
              expect(restante.rows[0].existe).toBeNull();
            }
          } finally {
            await pool.end();
          }
        }
      }
    }
  });

  it('crea un bloque con el propietario del JWT y respuesta pública sin idTutor', async () => {
    const respuesta = await crear().expect(201);
    expect(respuesta.body).toEqual({ idBloque: expect.any(String), ...horario, estadoBloque: 'DISPONIBLE' });
    const guardado = await prisma!.bloqueHorario.findUniqueOrThrow({ where: { idBloque: BigInt(respuesta.body.idBloque as string) } });
    expect(guardado.idTutor).toBe(10n);
    expect(guardado.horaInicio.toISOString()).toBe('1970-01-01T10:00:00.000Z');
  });
  it('lista solo los bloques propios, ordenados e incluidos los inactivos', async () => {
    await insertar(15n);
    const primero = await insertar(10n, { horaInicio: '08:00', horaFin: '09:00', estadoBloque: 'INACTIVO' });
    const segundo = await insertar();
    const respuesta = await request(app!.getHttpServer()).get('/disponibilidad/bloques').set('Authorization', `Bearer ${token()}`).expect(200);
    expect(respuesta.body).toEqual([
      { idBloque: primero.idBloque.toString(), dia: horario.dia, horaInicio: '08:00', horaFin: '09:00', estadoBloque: 'INACTIVO' },
      { idBloque: segundo.idBloque.toString(), ...horario, estadoBloque: 'DISPONIBLE' },
    ]);
  });
  it('rechaza formatos/horarios/campos inválidos sin escribir', async () => {
    for (const datos of [
      { ...horario, dia: '2026-02-30' },
      { ...horario, horaInicio: '9:00' },
      { ...horario, horaFin: '09:00' },
      { ...horario, idTutor: '15' },
    ])
      await crear(datos).expect(400);
    expect(await prisma!.bloqueHorario.count()).toBe(0);
  });
  it('rechaza solapamientos con bloques disponibles y reservados', async () => {
    const bloque = await insertar();
    await crear({ ...horario, horaInicio: '10:30', horaFin: '11:30' }).expect(409);
    await prisma!.bloqueHorario.update({ where: { idBloque: bloque.idBloque }, data: { estadoBloque: 'RESERVADO' } });
    await crear().expect(409);
    expect(await prisma!.bloqueHorario.count()).toBe(1);
  });
  it('permite adyacencia, otro tutor y reutilizar el horario de un bloque inactivo', async () => {
    const bloque = await insertar();
    await crear({ ...horario, horaInicio: '11:00', horaFin: '12:00' }).expect(201);
    await crear(horario, '15').expect(201);
    await prisma!.bloqueHorario.update({ where: { idBloque: bloque.idBloque }, data: { estadoBloque: 'INACTIVO' } });
    await crear().expect(201);
  });
  it('actualiza parcialmente y conserva los demás datos', async () => {
    const bloque = await insertar();
    await request(app!.getHttpServer())
      .patch(`/disponibilidad/bloques/${bloque.idBloque}`)
      .set('Authorization', `Bearer ${token()}`)
      .send({ horaFin: '11:30' })
      .expect(200)
      .expect({ idBloque: bloque.idBloque.toString(), ...horario, horaFin: '11:30', estadoBloque: 'DISPONIBLE' });
    await request(app!.getHttpServer()).patch(`/disponibilidad/bloques/${bloque.idBloque}`).set('Authorization', `Bearer ${token()}`).send({ horaFin: '09:00' }).expect(400);
    expect((await prisma!.bloqueHorario.findUniqueOrThrow({ where: { idBloque: bloque.idBloque } })).horaFin.toISOString()).toBe('1970-01-01T11:30:00.000Z');
  });
  it('rechaza edición y desactivación ajenas con 404 y estados comprometidos con 409', async () => {
    const ajeno = await insertar(15n);
    const reservado = await insertar(10n, { estadoBloque: 'RESERVADO' });
    const inactivo = await insertar(10n, { estadoBloque: 'INACTIVO' });
    for (const [bloque, codigo] of [
      [ajeno, 404],
      [reservado, 409],
      [inactivo, 409],
    ] as const) {
      await request(app!.getHttpServer()).patch(`/disponibilidad/bloques/${bloque.idBloque}`).set('Authorization', `Bearer ${token()}`).send({ horaFin: '11:30' }).expect(codigo);
      await request(app!.getHttpServer()).delete(`/disponibilidad/bloques/${bloque.idBloque}`).set('Authorization', `Bearer ${token()}`).expect(codigo);
    }
  });
  it('desactiva sin eliminar la fila y rechaza repetir la desactivación', async () => {
    const bloque = await insertar();
    await request(app!.getHttpServer())
      .delete(`/disponibilidad/bloques/${bloque.idBloque}`)
      .set('Authorization', `Bearer ${token()}`)
      .expect(200)
      .expect({ idBloque: bloque.idBloque.toString(), ...horario, estadoBloque: 'INACTIVO' });
    expect(await prisma!.bloqueHorario.count()).toBe(1);
    await request(app!.getHttpServer()).delete(`/disponibilidad/bloques/${bloque.idBloque}`).set('Authorization', `Bearer ${token()}`).expect(409);
  });
  it('la consulta autenticada excluye ocupados, inactivos, pasados y el minuto de inicio', async () => {
    await insertar(10n, { dia: '2026-09-30' });
    await insertar(10n, { horaInicio: '09:30', horaFin: '10:00' });
    await insertar(10n, { estadoBloque: 'RESERVADO' });
    await insertar(10n, { estadoBloque: 'INACTIVO' });
    await insertar(15n);
    const futuro = await insertar(10n, { dia: '2026-10-02' });
    const disponible = await insertar();
    const respuesta = await request(app!.getHttpServer())
      .get('/disponibilidad/tutores/10')
      .set('Authorization', `Bearer ${token('20', ['TUTEE'])}`)
      .expect(200);
    expect(respuesta.body).toEqual([
      { idBloque: disponible.idBloque.toString(), ...horario, estadoBloque: 'DISPONIBLE' },
      { idBloque: futuro.idBloque.toString(), ...horario, dia: '2026-10-02', estadoBloque: 'DISPONIBLE' },
    ]);
  });
  it('aplica JWT, roles e IDs válidos antes de acceder al negocio', async () => {
    await request(app!.getHttpServer()).get('/disponibilidad/bloques').expect(401);
    await crear(horario, '20', ['TUTEE']).expect(403);
    await request(app!.getHttpServer()).get('/disponibilidad/tutores/0').set('Authorization', `Bearer ${token()}`).expect(400);
    await request(app!.getHttpServer())
      .get('/disponibilidad/tutores/10')
      .set('Authorization', `Bearer ${token('20', ['TUTEE'])}`)
      .expect(200)
      .expect([]);
    expect(await prisma!.bloqueHorario.count()).toBe(0);
  });
  it('conserva BIGINT como texto en HTTP y como bigint en la persistencia', async () => {
    const bloque = await insertar(9007199254740993n, { idBloque: 9007199254740995n });
    await request(app!.getHttpServer())
      .get('/disponibilidad/bloques')
      .set('Authorization', `Bearer ${token('9007199254740993')}`)
      .expect(200)
      .expect([{ idBloque: bloque.idBloque.toString(), ...horario, estadoBloque: 'DISPONIBLE' }]);
  });
  it('una escritura condicionada no modifica un bloque reservado después de leerlo', async () => {
    const bloque = await insertar();
    const repo = new PrismaDisponibilidadRepository(prisma as unknown as PrismaService);
    expect((await repo.buscarPropio(10n, bloque.idBloque))?.estadoBloque).toBe('DISPONIBLE');
    await prisma!.bloqueHorario.update({ where: { idBloque: bloque.idBloque }, data: { estadoBloque: 'RESERVADO' } });
    await expect(repo.actualizarDisponible(10n, bloque.idBloque, { ...horario, horaFin: '11:30' })).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    await expect(repo.desactivarDisponible(10n, bloque.idBloque)).rejects.toMatchObject({ codigo: 'CONFLICTO' });
    expect((await prisma!.bloqueHorario.findUniqueOrThrow({ where: { idBloque: bloque.idBloque } })).estadoBloque).toBe('RESERVADO');
  });
});
