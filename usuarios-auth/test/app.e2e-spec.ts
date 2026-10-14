import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import { verify } from 'argon2';
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
  let cuentaActual = { ...usuarioExistente };
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
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
      INTERNAL_SERVICE_API_KEY: 'clave-interna-de-prueba-con-al-menos-32-bytes',
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    jwt = app.get(JwtService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    sesiones.clear();
    cuentaActual = { ...usuarioExistente };
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
          jti?: string;
          fecha_revocacion: null;
          fecha_expiracion?: { gt: Date };
          ultima_actividad?: { gt: Date };
          OR?: Array<{
            fecha_expiracion?: { lte: Date };
            ultima_actividad?: { lte: Date };
          }>;
        };
        data: Partial<SesionSimulada>;
      }) => {
        let count = 0;
        for (const sesion of sesiones.values()) {
          if (
            sesion.id_usuario !== where.id_usuario ||
            (where.jti !== undefined && sesion.jti !== where.jti) ||
            sesion.fecha_revocacion !== where.fecha_revocacion ||
            (where.fecha_expiracion &&
              sesion.fecha_expiracion <= where.fecha_expiracion.gt) ||
            (where.ultima_actividad &&
              sesion.ultima_actividad <= where.ultima_actividad.gt) ||
            (where.OR &&
              !where.OR.some(
                (filtro) =>
                  (filtro.fecha_expiracion &&
                    sesion.fecha_expiracion <= filtro.fecha_expiracion.lte) ||
                  (filtro.ultima_actividad &&
                    sesion.ultima_actividad <= filtro.ultima_actividad.lte),
              ))
          )
            continue;
          Object.assign(sesion, data);
          count++;
        }
        return { count };
      },
    );
    prisma.usuario.findUnique.mockImplementation(async () => cuentaActual);
    prisma.usuario.updateMany.mockImplementation(
      async ({
        where,
        data,
      }: {
        where: {
          id_usuario: bigint;
          estado_cuenta?: string;
          correo_verificado?: boolean;
        };
        data: Partial<typeof usuarioExistente>;
      }) => {
        if (
          where.id_usuario !== cuentaActual.id_usuario ||
          (where.estado_cuenta !== undefined &&
            where.estado_cuenta !== cuentaActual.estado_cuenta) ||
          (where.correo_verificado !== undefined &&
            where.correo_verificado !== cuentaActual.correo_verificado)
        )
          return { count: 0 };
        Object.assign(cuentaActual, data);
        return { count: 1 };
      },
    );
    prisma.verificacionCorreo.create.mockResolvedValue({
      id_verificacion: 10n,
    });
    prisma.verificacionCorreo.updateMany.mockResolvedValue({ count: 1 });
    prisma.usuario.update.mockResolvedValue({});
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
  ])('rechaza datos inválidos de login: %j', async (overrides) => {
    const respuesta = await login(overrides).expect(400);
    expect(respuesta.body).toMatchObject({
      statusCode: 400,
      message: expect.any(Array),
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
      message: expect.any(Array),
    });
    expect(prisma.verificacionCorreo.findUnique).not.toHaveBeenCalled();
  });

  it('cierra solo la sesión actual y rechaza la reutilización de su JWT', async () => {
    const primera = (await login().expect(200)).body.access_token as string;
    const segunda = (await login().expect(200)).body.access_token as string;
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(primera, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(primera, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(primera, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .auth(primera, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(segunda, { type: 'bearer' })
      .expect(200);
    const { jti } = jwt.decode<{ jti: string }>(primera);
    expect(sesiones.get(jti)?.fecha_revocacion).toBeInstanceOf(Date);
  });

  it('rechaza el cierre de sesión sin un token', async () => {
    await request(app.getHttpServer()).post('/auth/logout').expect(401);
    expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
  });

  it('actualiza la actividad de una sesión vigente', async () => {
    const { body } = await login().expect(200);
    const { jti } = jwt.decode<{ jti: string }>(body.access_token);
    const sesion = sesiones.get(jti)!;
    const anterior = new Date(Date.now() - 60_000);
    sesion.ultima_actividad = anterior;
    await request(app.getHttpServer())
      .get('/auth/sesion')
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
        .get('/auth/sesion')
        .auth(body.access_token, { type: 'bearer' })
        .expect(401);
      expect(respuesta.body.code).toBe('AUTH_SESSION_INVALID');
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
      .get('/auth/sesion')
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
        .get('/auth/sesion')
        .auth(token, { type: 'bearer' })
        .expect(401);
      expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
    },
  );

  it('conserva el registro público y nunca devuelve el hash de contraseña', async () => {
    const dto = {
      nombre: 'Usuario nuevo',
      correo_institucional: 'nuevo@alu.uct.cl',
      password_hash: loginFixture.password,
    };
    prisma.usuario.findUnique.mockResolvedValueOnce(null);
    prisma.usuario.create.mockResolvedValueOnce({
      id_usuario: 9007199254740993n,
      ...dto,
      estado_cuenta: 'ACTIVO',
      correo_verificado: false,
      roles: [{ rol: { nombre: 'ESTUDIANTE' } }],
    });
    const respuesta = await request(app.getHttpServer())
      .post('/usuarios/registro')
      .send(dto)
      .expect(201);
    expect(respuesta.body).toEqual({
      id: '9007199254740993',
      nombre: dto.nombre,
      correo: dto.correo_institucional,
      estado: 'ACTIVO',
    });
    const datosGuardados = prisma.usuario.create.mock.calls[0][0] as {
      data: { password_hash: string };
    };
    expect(
      await verify(datosGuardados.data.password_hash, dto.password_hash),
    ).toBe(true);
    expect(respuesta.body).not.toHaveProperty('password_hash');
  });

  it('comparte el flujo JWT con el login de usuarios', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/usuarios/login')
      .send({ correo_institucional: email, password: loginFixture.password })
      .expect(200);
    expect(body.access_token).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200);
  });

  it.each([{ estado_cuenta: 'INACTIVO' }])(
    'rechaza cuentas pendientes de activación: %j',
    async (estado) => {
      Object.assign(cuentaActual, estado);
      const { body } = await login().expect(403);
      expect(body.code).toBe('AUTH_ACCOUNT_INACTIVE');
      expect(prisma.sesion.create).not.toHaveBeenCalled();
    },
  );

  it('no entrega JWT si la cuenta cambia de estado antes de crear la sesión', async () => {
    prisma.usuario.updateMany.mockResolvedValueOnce({ count: 0 });
    const { body } = await login().expect(403);
    expect(body).not.toHaveProperty('access_token');
    expect(prisma.sesion.create).not.toHaveBeenCalled();
  });

  function moderar(id: string, estado: string) {
    return request(app.getHttpServer())
      .patch('/internal/usuarios/' + id + '/estado-cuenta')
      .set(
        'x-internal-service-key',
        process.env.INTERNAL_SERVICE_API_KEY as string,
      )
      .send({ estado });
  }

  it('suspende todas las sesiones y la reactivación requiere un login nuevo', async () => {
    const primera = (await login().expect(200)).body.access_token as string;
    const segunda = (await login().expect(200)).body.access_token as string;
    await moderar('1', 'SUSPENDIDO').expect(200, {
      id_usuario: '1',
      estado_cuenta: 'SUSPENDIDO',
      sesiones_revocadas: 2,
    });
    expect((await login().expect(403)).body.code).toBe(
      'AUTH_ACCOUNT_SUSPENDED',
    );
    for (const token of [primera, segunda]) {
      await request(app.getHttpServer())
        .get('/auth/sesion')
        .auth(token, { type: 'bearer' })
        .expect(401);
    }
    await moderar('1', 'ACTIVO').expect(200, {
      id_usuario: '1',
      estado_cuenta: 'ACTIVO',
      sesiones_revocadas: 0,
    });
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(primera, { type: 'bearer' })
      .expect(401);
    const nueva = (await login().expect(200)).body.access_token as string;
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(nueva, { type: 'bearer' })
      .expect(200);
  });

  it('rechaza operaciones de una cuenta suspendida aunque la sesión no se haya revocado', async () => {
    const { body } = await login().expect(200);
    cuentaActual.estado_cuenta = 'SUSPENDIDO';
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(body.access_token, { type: 'bearer' })
      .expect(401);
  });

  it('revoca la sesión inactiva y no permite recuperarla alterando su actividad', async () => {
    const { body } = await login().expect(200);
    const { jti } = jwt.decode<{ jti: string }>(body.access_token);
    const sesion = sesiones.get(jti)!;
    sesion.ultima_actividad = new Date(Date.now() - 1800_000);
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(body.access_token, { type: 'bearer' })
      .expect(401);
    expect(sesion.fecha_revocacion).toBeInstanceOf(Date);
    sesion.ultima_actividad = new Date();
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(body.access_token, { type: 'bearer' })
      .expect(401);
  });

  it('protege la moderación interna con una clave de servicio', async () => {
    await request(app.getHttpServer())
      .patch('/internal/usuarios/1/estado-cuenta')
      .send({ estado: 'SUSPENDIDO' })
      .expect(401);
    await request(app.getHttpServer())
      .patch('/internal/usuarios/1/estado-cuenta')
      .set('x-internal-service-key', 'clave-incorrecta')
      .send({ estado: 'SUSPENDIDO' })
      .expect(401);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '9223372036854775808'])(
    'rechaza identificadores de moderación inválidos: %s',
    async (id) => {
      await moderar(id, 'SUSPENDIDO').expect(400);
      expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
    },
  );

  it('rechaza un estado de cuenta no permitido', async () => {
    await moderar('1', 'ADMINISTRADOR').expect(400);
    expect(prisma.usuario.updateMany).not.toHaveBeenCalled();
  });

  it('responde 404 al moderar un usuario inexistente', async () => {
    await moderar('2', 'SUSPENDIDO').expect(404);
    expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
  });

  it('mantiene el login de cuentas activas con correo sin verificar', async () => {
    cuentaActual.correo_verificado = false;
    const { body } = await login().expect(200);
    expect(body.usuario.correo_verificado).toBe(false);
    await request(app.getHttpServer())
      .get('/auth/sesion')
      .auth(body.access_token, { type: 'bearer' })
      .expect(200);
  });

  it('descarta los roles enviados por el cliente y utiliza los del usuario persistido', async () => {
    const { body } = await login({ roles: ['ADMINISTRADOR'] }).expect(200);
    const payload = jwt.decode<{ roles: string[] }>(body.access_token);
    expect(payload.roles).toEqual(['Tutor']);
  });

  it('requiere autenticación para consultar una sesión', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/auth/sesion')
      .expect(401);
    expect(body.code).toBe('AUTH_SESSION_INVALID');
    expect(prisma.sesion.updateMany).not.toHaveBeenCalled();
  });
});
