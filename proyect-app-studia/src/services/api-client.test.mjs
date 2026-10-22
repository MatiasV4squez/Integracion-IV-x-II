import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiError, createApiClient } from './api-client.ts';

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('cliente del API Gateway', () => {
  it('envía el JWT en Authorization y el cuerpo como JSON', async () => {
    let captured;
    const api = createApiClient({
      baseUrl: 'https://gateway.test',
      getToken: async () => 'abc.def.ghi',
      fetchImpl: async (url, init) => {
        captured = { url, init };
        return json({ ok: true });
      },
    });
    const res = await api.post('/sesiones', { materia: 'MAT1010' });
    assert.deepEqual(res, { ok: true });
    assert.equal(captured.url, 'https://gateway.test/sesiones');
    assert.equal(captured.init.method, 'POST');
    assert.equal(captured.init.headers.Authorization, 'Bearer abc.def.ghi');
    assert.equal(captured.init.headers['Content-Type'], 'application/json');
    assert.equal(captured.init.body, JSON.stringify({ materia: 'MAT1010' }));
  });

  it('sin token no manda Authorization', async () => {
    let headers;
    const api = createApiClient({ baseUrl: 'x', fetchImpl: async (_u, init) => ((headers = init.headers), json([])) });
    await api.get('/materias');
    assert.equal('Authorization' in headers, false);
  });

  it('una respuesta con error HTTP lanza ApiError con el status', async () => {
    const api = createApiClient({ baseUrl: 'x', fetchImpl: async () => json({}, 403) });
    await assert.rejects(api.get('/admin'), (e) => e instanceof ApiError && e.code === 'HTTP' && e.status === 403);
  });

  it('si no hay red lanza ApiError NETWORK', async () => {
    const api = createApiClient({ baseUrl: 'x', fetchImpl: async () => { throw new TypeError('network'); } });
    await assert.rejects(api.get('/x'), (e) => e instanceof ApiError && e.code === 'NETWORK');
  });

  it('si el servidor no responde a tiempo lanza ApiError TIMEOUT (NFR23)', async () => {
    const hang = (_u, init) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(new Error('abortado'))));
    const api = createApiClient({ baseUrl: 'x', timeoutMs: 20, fetchImpl: hang });
    await assert.rejects(api.get('/lento'), (e) => e instanceof ApiError && e.code === 'TIMEOUT');
  });

  it('una respuesta 204 devuelve undefined', async () => {
    const api = createApiClient({ baseUrl: 'x', fetchImpl: async () => ({ ok: true, status: 204, json: async () => { throw new Error('sin cuerpo'); } }) });
    assert.equal(await api.delete('/algo'), undefined);
  });
});
