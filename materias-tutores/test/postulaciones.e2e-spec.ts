import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { PostularTutorUseCase } from '../src/postulaciones/aplicacion/postular-tutor.use-case.js';
import { ConsultarPostulacionesPropiasUseCase } from '../src/postulaciones/aplicacion/consultar-postulaciones-propias.use-case.js';
import { ListarPostulacionesPendientesUseCase } from '../src/postulaciones/aplicacion/listar-postulaciones-pendientes.use-case.js';
import { ObtenerCertificadoUseCase } from '../src/postulaciones/aplicacion/obtener-certificado.use-case.js';
import { AprobarPostulacionUseCase } from '../src/postulaciones/aplicacion/aprobar-postulacion.use-case.js';
import { RechazarPostulacionUseCase } from '../src/postulaciones/aplicacion/rechazar-postulacion.use-case.js';
import { ReintentarAsignacionRolUseCase } from '../src/postulaciones/aplicacion/reintentar-asignacion-rol.use-case.js';

const registro = {
  idPostulacion: 1n, idUsuario: 10n, idMateria: 2n, idAdministradorRevision: null,
  certificadoRef: 'privado.pdf', certificadoNombre: 'notas.pdf', certificadoTipo: 'application/pdf',
  notaAcreditada: null, estado: 'PENDIENTE', fechaPostulacion: new Date('2026-10-01T12:00:00Z'),
  fechaRevision: null, motivoRechazo: null,
};

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
  let aplicacion: INestApplication<Server>;
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
      .overrideProvider(PostularTutorUseCase)
      .useValue({ ejecutar: postulaciones.postular })
      .overrideProvider(ConsultarPostulacionesPropiasUseCase)
      .useValue({ ejecutar: postulaciones.consultarPropias })
      .overrideProvider(ListarPostulacionesPendientesUseCase)
      .useValue({ ejecutar: postulaciones.listarPendientes })
      .overrideProvider(ObtenerCertificadoUseCase)
      .useValue({ ejecutar: postulaciones.obtenerCertificado })
      .overrideProvider(AprobarPostulacionUseCase)
      .useValue({ ejecutar: postulaciones.aprobar })
      .overrideProvider(RechazarPostulacionUseCase)
      .useValue({ ejecutar: postulaciones.rechazar })
      .overrideProvider(ReintentarAsignacionRolUseCase)
      .useValue({ ejecutar: postulaciones.reintentarAsignacion })
      .compile();
    aplicacion = modulo.createNestApplication();
    await aplicacion.init();
  });

  afterEach(async () => {
    await aplicacion.close();
  });

  it('recibe un certificado del estudiante y usa el ID del token', async () => {
    postulaciones.postular.mockResolvedValue({
      ...registro,
      estado: 'PENDIENTE',
    });
    await request(aplicacion.getHttpServer())
      .post('/postulaciones')
      .set('Authorization', `Bearer ${crearToken(['ESTUDIANTE'])}`)
      .field('idMateria', '2')
      .attach('certificado', Buffer.from('%PDF-1.7\n'), 'notas.pdf')
      .expect(201)
      .expect((respuesta) => { expect(respuesta.body).toMatchObject({ idPostulacion: '1', idUsuario: '10', estado: 'PENDIENTE' }); expect(respuesta.body).not.toHaveProperty('certificadoRef'); });
    expect(postulaciones.postular).toHaveBeenCalledWith(
      10n,
      2n,
      expect.objectContaining({ nombre: 'notas.pdf' }),
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
      ...registro,
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
