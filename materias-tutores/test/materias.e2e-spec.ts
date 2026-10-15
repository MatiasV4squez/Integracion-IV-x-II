import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/database/prisma.service.js';

const materiasEsperadas = [
  { codigo: 'INFO1126', nombre: 'PROGRAMACIÓN III' },
  { codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' },
];

const prismaMock = {
  materia: {
    findMany: vi.fn(),
  },
};

describe('MateriasController (e2e)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    vi.resetAllMocks();
    prismaMock.materia.findMany.mockResolvedValue(materiasEsperadas);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication({ logger: false });
    await app.init();
  });

  it('responde con [] cuando el catálogo está vacío', async () => {
    prismaMock.materia.findMany.mockResolvedValue([]);
    await request(app.getHttpServer()).get('/materias').expect(200).expect([]);
  });

  it('no expone campos de persistencia ni falla al serializar BIGINT', async () => {
    prismaMock.materia.findMany.mockResolvedValue([{ idMateria: 9007199254740993n, codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' }]);
    await request(app.getHttpServer())
      .get('/materias')
      .expect(200)
      .expect([{ codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' }]);
  });

  it('un fallo de consulta devuelve 500 sin filtrar el error interno', async () => {
    prismaMock.materia.findMany.mockRejectedValue(new Error('detalle-privado-de-la-conexión'));
    const respuesta = await request(app.getHttpServer()).get('/materias').expect(500);
    expect(respuesta.body).toMatchObject({ statusCode: 500, message: 'Internal server error' });
    expect(respuesta.text).not.toContain('detalle-privado');
  });

  it('/materias (GET)', () => {
    return request(app.getHttpServer()).get('/materias').expect(200).expect(materiasEsperadas);
  });

  afterEach(async () => {
    await app.close();
  });
});
