import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { HttpSesionAuthClient } from './http-sesion-auth.client.js';

describe('HttpSesionAuthClient', () => {
  const client = new HttpSesionAuthClient();
  const sesion = { sub: '10', jti: 'sesion-1' };
  const urlAnterior = process.env.USUARIOS_AUTH_URL;

  beforeEach(() => {
    process.env.USUARIOS_AUTH_URL = 'http://auth.local/';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    if (urlAnterior === undefined) delete process.env.USUARIOS_AUTH_URL;
    else process.env.USUARIOS_AUTH_URL = urlAnterior;
  });

  it('consulta Auth con el mismo Bearer y un límite de espera', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(sesion));
    await expect(client.validar('jwt-prueba', '10', 'sesion-1')).resolves.toBeUndefined();
    const [url, opciones] = fetchMock.mock.calls[0];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).href).toBe('http://auth.local/auth/sesion');
    expect(opciones).toMatchObject({
      headers: {
        authorization: 'Bearer jwt-prueba',
        accept: 'application/json',
      },
      redirect: 'error',
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    });
  });

  it.each([401, 403])('impide operar cuando Auth rechaza la sesión (%s)', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }));
    await expect(client.validar('jwt', '10', 'sesion-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('consulta de nuevo para detectar una revocación posterior', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json(sesion))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    await client.validar('jwt', '10', 'sesion-1');
    await expect(client.validar('jwt', '10', 'sesion-1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([204, 302, 404, 500, 503])(
    'falla con 503 ante un estado inesperado de Auth (%s)',
    async (status) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status }));
      await expect(client.validar('jwt', '10', 'sesion-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it.each([null, {}, { sub: 'otro', jti: 'sesion-1' }, { sub: '10', jti: 'otra' }])(
    'falla con 503 ante una respuesta incompatible: %j',
    async (cuerpo) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(cuerpo));
      await expect(client.validar('jwt', '10', 'sesion-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it('falla con 503 ante JSON inválido', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('no-json'));
    await expect(client.validar('jwt', '10', 'sesion-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it.each([new TypeError('conexión fallida'), new DOMException('timeout', 'TimeoutError')])(
    'falla con 503 ante desconexión o tiempo agotado',
    async (error) => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(error);
      await expect(client.validar('jwt', '10', 'sesion-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it.each(['', 'invalida', 'ftp://auth.local', 'http://usuario:clave@auth.local'])(
    'rechaza configuración ausente o inválida sin enviar el token: %s',
    async (base) => {
      process.env.USUARIOS_AUTH_URL = base;
      const fetchMock = vi.spyOn(globalThis, 'fetch');
      await expect(client.validar('jwt', '10', 'sesion-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
