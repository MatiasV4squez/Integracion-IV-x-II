import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

const secreto = randomBytes(32).toString('hex');
const jwt = new JwtService({ secret: secreto });
const token = jwt.sign(
  { sub: '10', jti: 'prueba-reputacion', correo_institucional: 'prueba@alu.uct.cl', roles: ['ESTUDIANTE'] },
  { algorithm: 'HS256', issuer: 'stp-usuarios-auth', audience: 'stp-clients', expiresIn: '5m' },
);

describe('Reputación HTTP', () => {
  let app: INestApplication<Server>;
  const perfil = { idUsuario: 10n, sumaCalificaciones: 7, cantidadCalificaciones: 3, estado: 'EN_REVISION' };
  const prisma = {
    tutorMateria: { findFirst: vi.fn() },
    perfilTutor: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    calificacionTutorProcesada: { findUnique: vi.fn(), create: vi.fn() },
    bloqueHorario: { findUnique: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  };
  const evento = { idCalificacion: '42', puntuacion: 2, rolEvaluado: 'TUTOR' };
  beforeEach(async () => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation((operacion: (tx: unknown) => Promise<unknown>) => operacion(prisma));
    prisma.tutorMateria.findFirst.mockResolvedValue({ idTutorMateria: 1n });
    prisma.calificacionTutorProcesada.findUnique.mockResolvedValue(null);
    prisma.perfilTutor.upsert.mockResolvedValue({ ...perfil, estado: 'ACTIVO' });
    prisma.perfilTutor.findUnique.mockResolvedValue(perfil);
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ ...process.env, JWT_SECRET: secreto, INTEGRACION_SECRET: secreto }))
      .compile();
    app = modulo.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
  });

  it('registra una nota y devuelve promedio y revisión sin cambiar el contrato HTTP', async () => {
    await request(app.getHttpServer())
      .post('/integraciones/tutores/10/calificaciones')
      .set('X-Integracion-Secret', secreto)
      .send(evento)
      .expect(201)
      .expect({ idTutor: '10', cantidadCalificaciones: 3, promedio: 7 / 3, estado: 'EN_REVISION' });
    expect(prisma.calificacionTutorProcesada.create).toHaveBeenCalledWith({ data: { idTutor: 10n, idCalificacion: 42n, puntuacion: 2 } });
    expect(prisma.perfilTutor.update).toHaveBeenCalledWith({ where: { idUsuario: 10n }, data: { estado: 'EN_REVISION' } });
  });
  it.each([undefined, 'incorrecta', 'x'.repeat(64)])('rechaza una clave interna ausente o incorrecta', async (clave) => {
    const peticion = request(app.getHttpServer()).post('/integraciones/tutores/10/calificaciones');
    if (clave !== undefined) peticion.set('X-Integracion-Secret', clave);
    await peticion.send(evento).expect(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each([
    {},
    { ...evento, puntuacion: 0 },
    { ...evento, puntuacion: 6 },
    { ...evento, puntuacion: 1.5 },
    { ...evento, puntuacion: '2' },
    { ...evento, idCalificacion: 42 },
    { ...evento, idCalificacion: '0' },
    { ...evento, idCalificacion: '9223372036854775808' },
    { ...evento, extra: 'dato' },
    [],
  ])('rechaza cuerpos inválidos antes de persistir: %j', async (cuerpo) => {
    await request(app.getHttpServer()).post('/integraciones/tutores/10/calificaciones').set('X-Integracion-Secret', secreto).send(cuerpo).expect(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('no contabiliza notas recibidas como tutee', async () => {
    await request(app.getHttpServer())
      .post('/integraciones/tutores/10/calificaciones')
      .set('X-Integracion-Secret', secreto)
      .send({ ...evento, rolEvaluado: 'TUTEE' })
      .expect(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('no vuelve a acumular un evento duplicado', async () => {
    prisma.calificacionTutorProcesada.findUnique.mockResolvedValue({ idTutor: 10n, idCalificacion: 42n, puntuacion: 2 });
    await request(app.getHttpServer()).post('/integraciones/tutores/10/calificaciones').set('X-Integracion-Secret', secreto).send(evento).expect(201);
    expect(prisma.perfilTutor.upsert).not.toHaveBeenCalled();
  });
  it('traduce el conflicto de un evento reutilizado a 409', async () => {
    prisma.calificacionTutorProcesada.findUnique.mockResolvedValue({ idTutor: 10n, idCalificacion: 42n, puntuacion: 5 });
    await request(app.getHttpServer()).post('/integraciones/tutores/10/calificaciones').set('X-Integracion-Secret', secreto).send(evento).expect(409);
    expect(prisma.perfilTutor.upsert).not.toHaveBeenCalled();
  });
  it('rechaza el registro para un tutor no habilitado', async () => {
    prisma.tutorMateria.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).post('/integraciones/tutores/10/calificaciones').set('X-Integracion-Secret', secreto).send(evento).expect(409);
  });
  it('consulta reputación con JWT válido', async () => {
    await request(app.getHttpServer())
      .get('/tutores/10/reputacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ idTutor: '10', cantidadCalificaciones: 3, promedio: 7 / 3, estado: 'EN_REVISION' });
  });
  it.each([undefined, 'token-invalido'])('rechaza consultar sin JWT válido', async (valor) => {
    const peticion = request(app.getHttpServer()).get('/tutores/10/reputacion');
    if (valor) peticion.set('Authorization', `Bearer ${valor}`);
    await peticion.expect(401);
    expect(prisma.perfilTutor.findUnique).not.toHaveBeenCalled();
  });
  it('devuelve 404 para tutor desconocido y 400 para ID inválido', async () => {
    prisma.perfilTutor.findUnique.mockResolvedValue(null);
    prisma.tutorMateria.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).get('/tutores/10/reputacion').set('Authorization', `Bearer ${token}`).expect(404);
    await request(app.getHttpServer()).get('/tutores/0/reputacion').set('Authorization', `Bearer ${token}`).expect(400);
  });
  it('devuelve cero notas y promedio null para tutor habilitado sin perfil', async () => {
    prisma.perfilTutor.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/tutores/10/reputacion')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ idTutor: '10', cantidadCalificaciones: 0, promedio: null, estado: 'ACTIVO' });
  });
  it('conserva la precisión BIGINT en el evento y la respuesta', async () => {
    const id = '9007199254740993';
    prisma.perfilTutor.upsert.mockResolvedValue({ ...perfil, idUsuario: BigInt(id) });
    await request(app.getHttpServer())
      .post(`/integraciones/tutores/${id}/calificaciones`)
      .set('X-Integracion-Secret', secreto)
      .send({ ...evento, idCalificacion: id })
      .expect(201)
      .expect({ idTutor: id, cantidadCalificaciones: 3, promedio: 7 / 3, estado: 'EN_REVISION' });
    expect(prisma.calificacionTutorProcesada.create).toHaveBeenCalledWith({ data: { idTutor: BigInt(id), idCalificacion: BigInt(id), puntuacion: 2 } });
  });
  it('conserva la protección y comportamiento de reserva de bloques', async () => {
    prisma.bloqueHorario.findUnique.mockResolvedValue({ idBloque: 1n, estadoBloque: 'DISPONIBLE' });
    prisma.bloqueHorario.updateMany.mockResolvedValue({ count: 1 });
    await request(app.getHttpServer()).patch('/integraciones/bloques/1/estado').send({ estado: 'RESERVADO' }).expect(401);
    await request(app.getHttpServer())
      .patch('/integraciones/bloques/1/estado')
      .set('X-Integracion-Secret', secreto)
      .send({ estado: 'RESERVADO' })
      .expect(200)
      .expect({ idBloque: '1', estadoBloque: 'RESERVADO' });
    expect(prisma.bloqueHorario.updateMany).toHaveBeenCalledOnce();
  });
});
