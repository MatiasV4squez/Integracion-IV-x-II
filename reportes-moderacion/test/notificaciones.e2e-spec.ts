import { createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/compartido/prisma.service.js';
import { HttpSesionAuthClient } from '../src/reportes/infraestructura/clientes/http-sesion-auth.client.js';

const secreto = 'secreto-de-prueba';

function tokenDeUsuario() {
  const encabezado = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const datos = Buffer.from(JSON.stringify({
    iss: 'stp-usuarios-auth',
    aud: 'stp-clients',
    sub: '42',
    jti: 'sesion-de-prueba',
    correo_institucional: 'estudiante@alu.uct.cl',
    roles: ['ESTUDIANTE'],
    exp: Math.floor(Date.now() / 1000) + 300,
  })).toString('base64url');
  const firma = createHmac('sha256', secreto).update(`${encabezado}.${datos}`).digest('base64url');
  return `${encabezado}.${datos}.${firma}`;
}

describe('GET /notificaciones', () => {
  let app: INestApplication<App>;
  const findMany = vi.fn();
  const count = vi.fn();

  beforeEach(async () => {
    vi.stubEnv('JWT_SECRET', secreto);
    findMany.mockReset().mockResolvedValue([]);
    count.mockReset().mockResolvedValue(0);
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({
        notificacion: { findMany, count },
        $transaction: (consultas: Promise<unknown>[]) => Promise.all(consultas),
      })
      .overrideProvider(HttpSesionAuthClient)
      .useValue({ validar: vi.fn().mockResolvedValue(undefined) })
      .compile();
    app = modulo.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it('rechaza una consulta sin sesión', async () => {
    await request(app.getHttpServer()).get('/notificaciones').expect(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('pagina y cuenta únicamente las notificaciones del usuario autenticado', async () => {
    const notificacion = {
      id: 7,
      tipo: 'SESION',
      mensaje: 'Nueva notificación',
      creadoEn: '2026-11-27T22:00:00.000Z',
    };
    findMany.mockResolvedValue([notificacion]);
    count.mockResolvedValue(3);

    await request(app.getHttpServer())
      .get('/notificaciones?pagina=2&limite=2&usuarioId=99')
      .set('Authorization', `Bearer ${tokenDeUsuario()}`)
      .expect(200, {
        datos: [notificacion],
        paginacion: { pagina: 2, limite: 2, total: 3, total_paginas: 2 },
      });
    expect(findMany).toHaveBeenCalledWith({
      where: { usuarioId: 42n },
      skip: 2,
      take: 2,
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
      select: { id: true, tipo: true, mensaje: true, creadoEn: true },
    });
    expect(count).toHaveBeenCalledWith({ where: { usuarioId: 42n } });
  });

  it('devuelve una página vacía usando los valores predeterminados', async () => {
    await request(app.getHttpServer())
      .get('/notificaciones')
      .set('Authorization', `Bearer ${tokenDeUsuario()}`)
      .expect(200, {
        datos: [],
        paginacion: { pagina: 1, limite: 20, total: 0, total_paginas: 0 },
      });
  });

  it.each(['pagina=0', 'pagina=1.5', 'pagina=2147483648', 'limite=101'])(
    'rechaza la paginación inválida %s',
    async (consulta) => {
      await request(app.getHttpServer())
        .get(`/notificaciones?${consulta}`)
        .set('Authorization', `Bearer ${tokenDeUsuario()}`)
        .expect(400);
      expect(findMany).not.toHaveBeenCalled();
    },
  );
});
