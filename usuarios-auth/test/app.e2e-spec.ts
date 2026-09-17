import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { serializeBigInt } from '../src/config/json-serialization';
import { loginFixture } from './fixtures/login.fixture';

describe('Login básico (HTTP con persistencia simulada)', () => {
  let app: NestExpressApplication;
  const email = 'estudiante@alu.uct.cl';
  const usuarioExistente = {
    id_usuario: 1n,
    nombre: 'Estudiante',
    correo_institucional: email,
    password_hash: loginFixture.passwordHash,
    estado_cuenta: 'ACTIVO',
    correo_verificado: true,
    roles: [{ rol: { nombre: 'Tutor' } }],
  };
  const prisma = {
    usuario: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    rol: { create: jest.fn(), findMany: jest.fn() },
    usuarioRol: { create: jest.fn(), findMany: jest.fn() },
  };

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: 'postgresql://test@localhost/usuarios_auth_test',
      PORT: '3000',
    });
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.set('json replacer', serializeBigInt);
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.usuario.findUnique.mockResolvedValue(usuarioExistente);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  function login(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo_institucional: email,
        password: loginFixture.password,
        ...overrides,
      });
  }

  it('valida un usuario existente, consulta sus roles y no expone el hash ni emite tokens', async () => {
    const respuesta = await login({
      correo_institucional: ' ESTUDIANTE@ALU.UCT.CL ',
    }).expect(200);
    expect(respuesta.body).toEqual({
      usuario: {
        id_usuario: '1',
        nombre: 'Estudiante',
        correo_institucional: email,
        estado_cuenta: 'ACTIVO',
        correo_verificado: true,
        roles: ['Tutor'],
      },
      mensaje: 'Credenciales válidas.',
    });
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { correo_institucional: email },
      }),
    );
    expect(JSON.stringify(respuesta.body)).not.toContain(
      loginFixture.passwordHash,
    );
    expect(respuesta.body).not.toHaveProperty('access_token');
  });

  it('responde igual para un usuario inexistente y una contraseña incorrecta', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    const desconocido = await login().expect(401);
    const incorrecta = await login({ password: 'otra contraseña' }).expect(401);
    expect(desconocido.body).toEqual(incorrecta.body);
    expect(incorrecta.body.message).toBe('Correo o contraseña incorrectos.');
  });

  it('rechaza un hash inválido sin producir un error interno', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce({
      ...usuarioExistente,
      password_hash: 'inválido',
    });
    await login().expect(401);
  });

  it.each([
    { password: '' },
    { password: 123 },
    { correo_institucional: 'inválido' },
    { roles: ['Administrador'] },
  ])('rechaza datos inválidos de login: %j', async (overrides) => {
    await login(overrides).expect(400);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it('requiere la contraseña', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo_institucional: email,
      })
      .expect(400);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    '/auth/registro',
    '/auth/verificar-correo',
    '/auth/reenviar-verificacion',
  ])('no expone la ruta fuera de alcance %s', async (path) => {
    await request(app.getHttpServer()).post(path).send({}).expect(404);
  });

  it('restaura el POST y GET originales de usuarios sin aplicar las reglas nuevas del login', async () => {
    const dto = {
      nombre: 'Usuario previo',
      correo_institucional: email,
      password_hash: loginFixture.passwordHash,
    };
    const guardado = {
      id_usuario: 9007199254740993n,
      ...dto,
      estado_cuenta: 'ACTIVO',
      correo_verificado: false,
    };
    prisma.usuario.create.mockResolvedValue(guardado);
    prisma.usuario.findMany.mockResolvedValue([guardado]);

    const respuesta = await request(app.getHttpServer())
      .post('/usuarios')
      .send(dto)
      .expect(201);
    expect(respuesta.body.id_usuario).toBe('9007199254740993');
    expect(prisma.usuario.create).toHaveBeenCalledWith({
      data: { ...dto, estado_cuenta: 'ACTIVO', correo_verificado: false },
    });
    const listado = await request(app.getHttpServer())
      .get('/usuarios')
      .expect(200);
    expect(listado.body).toEqual([respuesta.body]);
  });

  it('vuelve a conectar el POST y GET originales de roles', async () => {
    const rol = { id_rol: 1, nombre: 'Tutor' };
    prisma.rol.create.mockResolvedValue(rol);
    prisma.rol.findMany.mockResolvedValue([rol]);

    await request(app.getHttpServer())
      .post('/roles')
      .send({ nombre: 'Tutor' })
      .expect(201, rol);
    expect(prisma.rol.create).toHaveBeenCalledWith({
      data: { nombre: 'Tutor' },
    });
    await request(app.getHttpServer()).get('/roles').expect(200, [rol]);
  });

  it('vuelve a conectar el POST y GET originales de usuario-rol y serializa BigInt', async () => {
    const relacion = { id_usuario: 1n, id_rol: 1 };
    prisma.usuarioRol.create.mockResolvedValue(relacion);
    prisma.usuarioRol.findMany.mockResolvedValue([relacion]);
    const esperado = { id_usuario: '1', id_rol: 1 };

    await request(app.getHttpServer())
      .post('/usuario-rol')
      .send({ id_usuario: 1, id_rol: 1 })
      .expect(201, esperado);
    expect(prisma.usuarioRol.create).toHaveBeenCalledWith({ data: relacion });
    await request(app.getHttpServer())
      .get('/usuario-rol')
      .expect(200, [esperado]);
  });
});
