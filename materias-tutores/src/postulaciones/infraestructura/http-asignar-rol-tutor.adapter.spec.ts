import { ConfigService } from '@nestjs/config';
import { HttpAsignarRolTutorAdapter } from './http-asignar-rol-tutor.adapter.js';

describe('HttpAsignarRolTutorAdapter', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('mantiene URL, método, secreto, cuerpo BIGINT y timeout del contrato existente', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal('fetch', fetchMock);
    const config = new ConfigService({ USUARIOS_AUTH_ASIGNAR_TUTOR_URL: 'http://localhost:3002/roles', INTEGRACION_SECRET: 'secreto-de-prueba' });
    await new HttpAsignarRolTutorAdapter(config).asignar(9007199254740993n);
    expect(timeout).toHaveBeenCalledExactlyOnceWith(5000);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('http://localhost:3002/roles', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Integracion-Secret': 'secreto-de-prueba' },
      body: '{"idUsuario":"9007199254740993","rol":"TUTOR"}', signal: expect.any(AbortSignal),
    });
  });

  it('sin URL o secreto falla sin enviar la petición', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    for (const datos of [{}, { USUARIOS_AUTH_ASIGNAR_TUTOR_URL: 'http://localhost/roles' }]) {
      await expect(new HttpAsignarRolTutorAdapter(new ConfigService(datos)).asignar(10n)).rejects.toMatchObject({
        codigo: 'NO_DISPONIBLE', message: 'La asignación del rol TUTOR no está configurada',
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mantiene un fallo controlado y no reintenta ante HTTP, red o timeout', async () => {
    const config = new ConfigService({ USUARIOS_AUTH_ASIGNAR_TUTOR_URL: 'http://localhost/roles', INTEGRACION_SECRET: 'prueba' });
    for (const resultado of [() => Promise.resolve({ ok: false }), () => Promise.reject(new TypeError('red')), () => Promise.reject(new DOMException('timeout', 'TimeoutError'))]) {
      const fetchMock = vi.fn(resultado); vi.stubGlobal('fetch', fetchMock);
      await expect(new HttpAsignarRolTutorAdapter(config).asignar(10n)).rejects.toMatchObject({ codigo: 'NO_DISPONIBLE' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });
});
