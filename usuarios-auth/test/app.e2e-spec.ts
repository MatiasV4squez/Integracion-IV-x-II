import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { serializeBigInt } from '../src/config/json-serialization';
import { EMAIL_VERIFICATION_SENDER } from '../src/verificacion-correo/ports/email-verification.sender';
import { loginFixture } from './fixtures/login.fixture';

interface SesionSimulada {
  id_usuario: bigint;
  jti: string;
  fecha_expiracion: Date;
  ultima_actividad: Date;
  fecha_revocacion: Date | null;
}

describe('Autenticación y sesiones (HTTP con persistencia simulada)', () => {
  let app: NestExpressApplication;
  let jwt: JwtService;
  const sesiones = new Map<string, SesionSimulada>();
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
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    rol: { create: jest.fn(), findMany: jest.fn() },
    usuarioRol: { create: jest.fn(), findMany: jest.fn() },
    sesion: { create: jest.fn(), updateMany: jest.fn() },
    verificacionCorreo: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const correoSender = { enviar: jest.fn() };

  beforeAll(async () => {
    Object.assign(process.env, {
      DATABASE_URL: 'postgresql://test@localhost/usuarios_auth_test',
      PORT: '3000',
      JWT_SECRET: 'secreto-jwt-de-prueba-con-al-menos-32-bytes',
      JWT_ACCESS_TTL_SECONDS: '1800',
      JWT_IDLE_TIMEOUT_SECONDS: '1800',
      SMTP_HOST: 'smtp.example.test',
      SMTP_PORT: '587',
      SMTP_SECURE: 'false',
      SMTP_USER: 'usuario-smtp',
      SMTP_PASSWORD: 'secreto-smtp',
      SMTP_FROM: 'STP <no-reply@example.test>',
      EMAIL_VERIFICATION_URL: 'https://app.example.test/verificar-correo',
      EMAIL_VERIFICATION_SECRET:
        'secreto-de-verificacion-con-al-menos-32-bytes',
      EMAIL_VERIFICATION_TTL_MINUTES: '30',
    });
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(EMAIL_VERIFICATION_SENDER)
      .useValue(correoSender)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.set('json replacer', serializeBigInt);
    await app.init();
    jwt = app.get(JwtService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    sesiones.clear();
    prisma.sesion.create.mockImplementation(
      async ({
        data,
      }: {
        data: Omit<SesionSimulada, 'ultima_actividad' | 'fecha_revocacion'>;
      }) => {
        const sesion = {
          ...data,
          ultima_actividad: new Date(),
          fecha_revocacion: null,
        };
        sesiones.set(data.jti, sesion);
        return sesion;
      },
    );
    prisma.sesion.updateMany.mockImplementation(
      async ({
        where,
        data,
      }: {
        where: {
          id_usuario: bigint;
          jti: string;
          fecha_revocacion: null;
          fecha_expiracion?: { gt: Date };
          ultima_actividad?: { gt: Date };
        };
        data: Partial<SesionSimulada>;
      }) => {
        const sesion = sesiones.get(where.jti);
        if (
          !sesion ||
          sesion.id_usuario !== where.id_usuario ||
          sesion.fecha_revocacion !== where.fecha_revocacion ||
          (where.fecha_expiracion &&
            sesion.fecha_expiracion <= where.fecha_expiracion.gt) ||
          (where.ultima_actividad &&
            sesion.ultima_actividad <= where.ultima_actividad.gt)
        ) {
          return { count: 0 };
        }
        Object.assign(sesion, data);
        return { count: 1 };
      },
    );
    prisma.usuario.findUnique.mockResolvedValue(usuarioExistente);
    prisma.verificacionCorreo.create.mockResolvedValue({
      id_verificacion: 10n,
    });
    prisma.verificacionCorreo.updateMany.mockResolvedValue({ count: 1 });
    prisma.usuario.update.mockResolvedValue({});
    prisma.usuario.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    correoSender.enviar.mockResolvedValue(undefined);
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

  it('emite un JWT firmado con la identidad mínima y no expone el hash', async () => {
    const respuesta = await login({
      correo_institucional: ' ESTUDIANTE@ALU.UCT.CL ',
    }).expect(200);
    expect(respuesta.body).toMatchObject({
      usuario: {
        id_usuario: '1',
        nombre: 'Estudiante',
        correo_institucional: email,
        estado_cuenta: 'ACTIVO',
        correo_verificado: true,
        roles: ['Tutor'],
      },
      access_token: expect.any(String),
      token_type: 'Bearer',
      expires_in: 1800,
      mensaje: 'Autenticación exitosa.',
    });
    expect(prisma.usuario.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { correo_institucional: email },
      }),
    );
    expect(JSON.stringify(respuesta.body)).not.toContain(
      loginFixture.passwordHash,
    );
    const payload = await jwt.verifyAsync(respuesta.body.access_token, {
      issuer: 'stp-usuarios-auth',
      audience: 'stp-clients',
    });
    expect(payload).toMatchObject({
      sub: '1',
      jti: expect.any(String),
      correo_institucional: email,
      roles: ['Tutor'],
      iss: 'stp-usuarios-auth',
      aud: 'stp-clients',
    });
    expect(payload.exp - payload.iat).toBe(1800);
    expect(payload).not.toHaveProperty('password_hash');
    expect(payload).not.toHaveProperty('nombre');
    expect(sesiones.get(payload.jti)).toMatchObject({
      id_usuario: 1n,
      fecha_revocacion: null,
    });
  });

  it('responde igual para un usuario inexistente y una contraseña incorrecta', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    const desconocido = await login().expect(401);
    const incorrecta = await login({ password: 'otra contraseña' }).expect(401);
    expect(desconocido.body).toEqual(incorrecta.body);
    expect(incorrecta.body).toMatchObject({
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Correo o contraseña incorrectos.',
    });
    expect(incorrecta.body).not.toHaveProperty('access_token');
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
    const respuesta = await login(overrides).expect(400);
    expect(respuesta.body).toMatchObject({
      statusCode: 400,
      code: 'AUTH_INVALID_REQUEST',
      message: 'Los datos de autenticación no son válidos.',
      details: expect.any(Array),
    });
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

  it.each(['/auth/registro'])(
    'no expone la ruta fuera de alcance %s',
    async (path) => {
      await request(app.getHttpServer()).post(path).send({}).expect(404);
    },
  );

  it('reenvía un enlace sin exponer ni almacenar el token original', async () => {
    prisma.usuario.findUnique.mockResolvedValueOnce({
      id_usuario: 1n,
      correo_institucional: email,
      correo_verificado: false,
    });

    const respuesta = await request(app.getHttpServer())
      .post('/auth/reenviar-verificacion')
      .send({ correo_institucional: ` ${email.toUpperCase()} ` })
      .expect(202);
    expect(respuesta.body).toEqual({
      mensaje:
        'Si la cuenta existe y requiere verificación, se enviará un correo.',
    });
    const enlace = correoSender.enviar.mock.calls[0][1] as string;
    const token = new URL(enlace).searchParams.get('token') as string;
    expect(token).toHaveLength(64);
    expect(prisma.verificacionCorreo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_usuario: 1n,
          token: createHmac(
            'sha256',
            process.env.EMAIL_VERIFICATION_SECRET as string,
          )
            .update(token)
            .digest('hex'),
        }),
      }),
    );
    expect(correoSender.enviar).toHaveBeenCalledWith(email, enlace);
  });

  it('no revela si el correo de reenvío existe o ya fue verificado', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id_usuario: 1n,
        correo_institucional: email,
        correo_verificado: true,
      });

    const inexistente = await request(app.getHttpServer())
      .post('/auth/reenviar-verificacion')
      .send({ correo_institucional: 'desconocido@alu.uct.cl' })
      .expect(202);
    const verificado = await request(app.getHttpServer())
      .post('/auth/reenviar-verificacion')
      .send({ correo_institucional: email })
      .expect(202);
    expect(inexistente.body).toEqual(verificado.body);
    expect(correoSender.enviar).not.toHaveBeenCalled();
  });

  it('confirma un token vigente y activa una cuenta INACTIVA', async () => {
    const token = 'a'.repeat(64);
    prisma.verificacionCorreo.findUnique.mockResolvedValueOnce({
      id_verificacion: 10n,
      id_usuario: 1n,
      fecha_expiracion: new Date(Date.now() + 60_000),
      fecha_utilizacion: null,
      usuario: { correo_verificado: false },
    });

    await request(app.getHttpServer())
      .post('/auth/verificar-correo')
      .send({ token })
      .expect(200, { mensaje: 'Correo verificado correctamente.' });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id_usuario: 1n },
      data: { correo_verificado: true },
    });
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { id_usuario: 1n, estado_cuenta: 'INACTIVO' },
      data: { estado_cuenta: 'ACTIVO' },
    });
  });

  it('rechaza un token inexistente con un error controlado', async () => {
    prisma.verificacionCorreo.findUnique.mockResolvedValueOnce(null);

    const respuesta = await request(app.getHttpServer())
      .post('/auth/verificar-correo')
      .send({ token: 'a'.repeat(64) })
      .expect(400);
    expect(respuesta.body).toMatchObject({
      statusCode: 400,
      code: 'EMAIL_VERIFICATION_TOKEN_INVALID',
      message: 'El enlace de verificación no es válido.',
    });
  });

  it('valida el formato de las solicitudes de verificación', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/auth/verificar-correo')
      .send({ token: 'corto' })
      .expect(400);
    expect(respuesta.body).toMatchObject({
      statusCode: 400,
      code: 'EMAIL_VERIFICATION_INVALID_REQUEST',
      message: 'Los datos de verificación no son válidos.',
    });
    expect(prisma.verificacionCorreo.findUnique).not.toHaveBeenCalled();
  });

  it.each(['/usuarios', '/roles', '/usuario-rol', '/verificacion-correo'])(
    'rechaza GET y POST sin sesión en %s',
    async (path) => {
      for (const method of ['get', 'post'] as const) {
        const respuesta = await request(app.getHttpServer())
          [method](path)
          .expect(401);
        expect(respuesta.body.code).toBe('AUTH_SESSION_INVALID');
      }
      expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
    },
  );

  it('cierra solo la sesión actual y rechaza la reutilización de su JWT', async () => {
    const primera = (await login().expect(200)).body.access_token as string;
    const segunda = (await login().expect(200)).body.access_token as string;
    prisma.usuario.findMany.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get('/usuarios')
      .auth(primera, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(primera, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/usuarios')
      .auth(primera, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(primera, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/usuarios')
      .auth(segunda, { type: 'bearer' })
      .expect(200);
    const { jti } = jwt.decode<{ jti: string }>(primera);
    expect(sesiones.get(jti)?.fecha_revocacion).toBeInstanceOf(Date);
  });

  it('rechaza el cierre de sesión sin un token', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
    expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
  });

  it('permite consultar las verificaciones previas con una sesión activa', async () => {
    const { body } = await login().expect(200);
    prisma.verificacionCorreo.findMany.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get('/verificacion-correo')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200, []);
  });

  it('actualiza la actividad de una sesión vigente', async () => {
    const { body } = await login().expect(200);
    const { jti } = jwt.decode<{ jti: string }>(body.access_token);
    const sesion = sesiones.get(jti)!;
    const anterior = new Date(Date.now() - 60_000);
    sesion.ultima_actividad = anterior;
    prisma.usuario.findMany.mockResolvedValue([]);
    await request(app.getHttpServer())
      .get('/usuarios')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200);
    expect(sesion.ultima_actividad.getTime()).toBeGreaterThan(
      anterior.getTime(),
    );
  });

  it.each(['inactiva', 'expirada', 'inexistente'])(
    'rechaza un JWT vigente cuya sesión está %s',
    async (estado) => {
      const { body } = await login().expect(200);
      const { jti } = jwt.decode<{ jti: string }>(body.access_token);
      const sesion = sesiones.get(jti)!;
      if (estado === 'inactiva')
        sesion.ultima_actividad = new Date(Date.now() - 1800_000);
      if (estado === 'expirada')
        sesion.fecha_expiracion = new Date(Date.now() - 1000);
      if (estado === 'inexistente') sesiones.delete(jti);
      const anterior = sesion.ultima_actividad;
      const respuesta = await request(app.getHttpServer())
        .get('/usuarios')
        .auth(body.access_token, { type: 'bearer' })
        .expect(401);
      expect(respuesta.body.code).toBe('AUTH_SESSION_INVALID');
      expect(prisma.usuario.findMany).not.toHaveBeenCalled();
      expect(sesion.ultima_actividad).toEqual(anterior);
    },
  );

  it.each([
    { secret: 'firma-incorrecta-con-al-menos-32-bytes' },
    { expiresIn: -1 },
    { issuer: 'otro-emisor' },
    { audience: 'otro-cliente' },
    { algorithm: 'HS384' as const },
  ])('rechaza un JWT con firma o metadatos inválidos: %j', async (options) => {
    const token = await jwt.signAsync(
      {
        sub: '1',
        jti: 'sesion-de-prueba',
        correo_institucional: email,
        roles: ['Tutor'],
      },
      options,
    );
    await request(app.getHttpServer())
      .get('/usuarios')
      .auth(token, { type: 'bearer' })
      .expect(401);
    expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
  });

  it.each(['no-numerico', '0', '9223372036854775808'])(
    'rechaza un identificador de usuario inválido sin producir un 500: %s',
    async (sub) => {
      const token = await jwt.signAsync({
        sub,
        jti: 'sesion-de-prueba',
        correo_institucional: email,
        roles: ['Tutor'],
      });
      await request(app.getHttpServer())
        .get('/usuarios')
        .auth(token, { type: 'bearer' })
        .expect(401);
      expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
    },
  );

  it('restaura el POST y GET originales de usuarios sin aplicar las reglas nuevas del login', async () => {
    const { body } = await login().expect(200);
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
      .auth(body.access_token, { type: 'bearer' })
      .send(dto)
      .expect(201);
    expect(respuesta.body.id_usuario).toBe('9007199254740993');
    expect(prisma.usuario.create).toHaveBeenCalledWith({
      data: { ...dto, estado_cuenta: 'ACTIVO', correo_verificado: false },
    });
    const listado = await request(app.getHttpServer())
      .get('/usuarios')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200);
    expect(listado.body).toEqual([respuesta.body]);
  });

  it('vuelve a conectar el POST y GET originales de roles', async () => {
    const { body } = await login().expect(200);
    const rol = { id_rol: 1, nombre: 'Tutor' };
    prisma.rol.create.mockResolvedValue(rol);
    prisma.rol.findMany.mockResolvedValue([rol]);

    await request(app.getHttpServer())
      .post('/roles')
      .auth(body.access_token, { type: 'bearer' })
      .send({ nombre: 'Tutor' })
      .expect(201, rol);
    expect(prisma.rol.create).toHaveBeenCalledWith({
      data: { nombre: 'Tutor' },
    });
    await request(app.getHttpServer())
      .get('/roles')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200, [rol]);
  });

  it('vuelve a conectar el POST y GET originales de usuario-rol y serializa BigInt', async () => {
    const { body } = await login().expect(200);
    const relacion = { id_usuario: 1n, id_rol: 1 };
    prisma.usuarioRol.create.mockResolvedValue(relacion);
    prisma.usuarioRol.findMany.mockResolvedValue([relacion]);
    const esperado = { id_usuario: '1', id_rol: 1 };

    await request(app.getHttpServer())
      .post('/usuario-rol')
      .auth(body.access_token, { type: 'bearer' })
      .send({ id_usuario: 1, id_rol: 1 })
      .expect(201, esperado);
    expect(prisma.usuarioRol.create).toHaveBeenCalledWith({ data: relacion });
    await request(app.getHttpServer())
      .get('/usuario-rol')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200, [esperado]);
  });
});
