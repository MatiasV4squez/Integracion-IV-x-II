import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { Pool } from 'pg';
import request from 'supertest';
import { PrismaService } from '../src/database/prisma.service.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { MateriasModule } from '../src/materias/materias.module.js';

describe('Catálogo de materias con PostgreSQL real', () => {
  const schema = `test_materias_${randomUUID().replaceAll('-', '')}`;
  let pool: Pool | undefined;
  let prisma: PrismaClient | undefined;
  let app: INestApplication<Server> | undefined;
  let creado = false;
  let estadoPublico: string;

  async function snapshotPublico(): Promise<string> {
    const existe = await pool!.query<{ existe: string | null }>("SELECT to_regclass('public.materia')::text AS existe");
    if (!existe.rows[0].existe) return 'ausente';
    const resultado = await pool!.query<{ hash: string }>(
      "SELECT md5(COALESCE(jsonb_agg(data ORDER BY data::text)::text, '[]')) AS hash FROM (SELECT to_jsonb(t) AS data FROM public.materia t) filas",
    );
    return resultado.rows[0].hash;
  }

  beforeAll(async () => {
    const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('Configura TEST_DATABASE_URL o DATABASE_URL para PostgreSQL.');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(databaseUrl).hostname)) throw new Error('Estas pruebas solo permiten PostgreSQL local.');
    if (!/^test_materias_[a-f0-9]{32}$/.test(schema)) throw new Error('Esquema inesperado.');
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
      for (const migracion of migraciones) {
        await cliente.query(await readFile(`prisma/migrations/${migracion}/migration.sql`, 'utf8'));
      }
    } finally {
      await cliente.query('RESET search_path');
      cliente.release();
    }
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }, { schema }) });
    const modulo = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, load: [() => ({ DATABASE_URL: databaseUrl })] }), MateriasModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = modulo.createNestApplication<INestApplication<Server>>({ logger: false });
    await app.init();
  });

  beforeEach(async () => {
    await prisma!.materia.deleteMany();
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

  it('devuelve [] con una tabla real vacía', async () => {
    await request(app!.getHttpServer()).get('/materias').expect(200).expect([]);
  });

  it('ordena por código aunque se inserten en otro orden y conserva Unicode', async () => {
    await prisma!.materia.createMany({
      data: [
        { idMateria: 300n, codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' },
        { idMateria: 200n, codigo: 'INFO1157', nombre: 'SISTEMAS INTELIGENTES' },
        { idMateria: 100n, codigo: 'INFO1126', nombre: 'PROGRAMACIÓN III' },
      ],
    });
    await request(app!.getHttpServer())
      .get('/materias')
      .expect(200)
      .expect([
        { idMateria: '100', codigo: 'INFO1126', nombre: 'PROGRAMACIÓN III' },
        { idMateria: '200', codigo: 'INFO1157', nombre: 'SISTEMAS INTELIGENTES' },
        { idMateria: '300', codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' },
      ]);
  });

  it('expone el ID BIGINT como texto sin perder precisión', async () => {
    await prisma!.materia.create({ data: { idMateria: 9007199254740993n, codigo: 'TEST_BIGINT', nombre: 'Prueba de identificador' } });
    await request(app!.getHttpServer())
      .get('/materias')
      .expect(200)
      .expect([{ idMateria: '9007199254740993', codigo: 'TEST_BIGINT', nombre: 'Prueba de identificador' }]);
  });

  it('refleja cambios persistidos sin usar un catálogo fijo o cacheado', async () => {
    await request(app!.getHttpServer()).get('/materias').expect(200).expect([]);
    const materia = await prisma!.materia.create({ data: { codigo: 'TEST_CAMBIO', nombre: 'Nombre inicial' } });
    await prisma!.materia.update({ where: { idMateria: materia.idMateria }, data: { nombre: 'Nombre actualizado' } });
    await request(app!.getHttpServer())
      .get('/materias')
      .expect(200)
      .expect([{ idMateria: materia.idMateria.toString(), codigo: 'TEST_CAMBIO', nombre: 'Nombre actualizado' }]);
  });
});
