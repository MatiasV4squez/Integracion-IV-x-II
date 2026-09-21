import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/database/prisma.service.js';

const materiasEsperadas = [
  { codigo: 'INFO1126', nombre: 'PROGRAMACIÓN III' },
  { codigo: 'MAT1188', nombre: 'CÁLCULO INTERMEDIO' },
];

const prismaMock = {
  materia: {
    findMany: vi.fn().mockResolvedValue(materiasEsperadas),
  },
};

describe('MateriasController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/materias (GET)', () => {
    return request(app.getHttpServer())
      .get('/materias')
      .expect(200)
      .expect(materiasEsperadas);
  });

  afterEach(async () => {
    await app.close();
  });
});
