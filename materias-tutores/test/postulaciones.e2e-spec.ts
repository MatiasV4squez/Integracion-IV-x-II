import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { PostulacionesService } from '../src/postulaciones/postulaciones.service.js';

const jwt = new JwtService({
  secret: process.env.JWT_SECRET,
  signOptions: {
    algorithm: 'HS256',
    issuer: 'stp-usuarios-auth',
    audience: 'stp-clients',
    expiresIn: 1800,
  },
});

function crearToken(roles: string[]) {
  return jwt.sign({
    sub: '10',
    jti: 'sesion-prueba',
    correo_institucional: 'persona@alu.uct.cl',
    roles,
  });
}

describe('Postulaciones HTTP', () => {
  let aplicacion: INestApplication<App>;
  const postulaciones = {
    postular: vi.fn(),
    consultarPropias: vi.fn(),
    listarPendientes: vi.fn(),
    aprobar: vi.fn(),
    rechazar: vi.fn(),
    reintentarAsignacion: vi.fn(),
    obtenerCertificado: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PostulacionesService)
      .useValue(postulaciones)
      .compile();
    aplicacion = modulo.createNestApplication();
    await aplicacion.init();
  });

  afterEach(async () => {
    await aplicacion.close();
  });

  it('recibe un certificado del estudiante y usa el ID del token', async () => {
    postulaciones.postular.mockResolvedValue({
      idPostulacion: '1',
      estado: 'PENDIENTE',
    });
    await request(aplicacion.getHttpServer())
      .post('/postulaciones')
      .set('Authorization', `Bearer ${crearToken(['ESTUDIANTE'])}`)
      .field('idMateria', '2')
      .attach('certificado', Buffer.from('%PDF-1.7\n'), 'notas.pdf')
      .expect(201)
      .expect({ idPostulacion: '1', estado: 'PENDIENTE' });
    expect(postulaciones.postular).toHaveBeenCalledWith(
      10n,
      2n,
      expect.objectContaining({ originalname: 'notas.pdf' }),
    );
  });

  it('impide revisar sin rol administrativo', async () => {
    await request(aplicacion.getHttpServer())
      .get('/postulaciones/pendientes')
      .expect(401);
    await request(aplicacion.getHttpServer())
      .get('/postulaciones/pendientes')
      .set('Authorization', `Bearer ${crearToken(['ESTUDIANTE'])}`)
      .expect(403);
    expect(postulaciones.listarPendientes).not.toHaveBeenCalled();
  });

  it('valida la revisión antes de llamar al servicio', async () => {
    const autorizacion = `Bearer ${crearToken(['ADMINISTRADOR'])}`;
    await request(aplicacion.getHttpServer())
      .patch('/postulaciones/1/aprobar')
      .set('Authorization', autorizacion)
      .send({ notaAcreditada: 5.05 })
      .expect(400);
    await request(aplicacion.getHttpServer())
      .patch('/postulaciones/1/rechazar')
      .set('Authorization', autorizacion)
      .send({ motivoRechazo: '' })
      .expect(400);
    expect(postulaciones.aprobar).not.toHaveBeenCalled();
    expect(postulaciones.rechazar).not.toHaveBeenCalled();
  });

  it('envía al servicio el ID del administrador y la nota', async () => {
    postulaciones.aprobar.mockResolvedValue({
      idPostulacion: '1',
      estado: 'APROBADA',
    });
    await request(aplicacion.getHttpServer())
      .patch('/postulaciones/1/aprobar')
      .set('Authorization', `Bearer ${crearToken(['ADMINISTRADOR'])}`)
      .send({ notaAcreditada: 5 })
      .expect(200);
    expect(postulaciones.aprobar).toHaveBeenCalledWith(1n, 10n, 5);
  });
});
