import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCatalogService } from './catalog-service.ts';
import { createMemoryStorage, createStorageService } from './storage-service.ts';

function setup(ttlMs = 1000) {
  let t = 0;
  let calls = 0;
  const storage = createStorageService(createMemoryStorage(), { now: () => t });
  const service = createCatalogService({
    storage,
    ttlMs,
    fetchSubjects: async () => {
      calls += 1;
      return [{ code: 'MAT1010', name: 'Cálculo I' }];
    },
  });
  return { service, calls: () => calls, advance: (ms) => (t += ms) };
}

describe('catálogo de materias con caché (NFR12)', () => {
  it('la primera consulta va al origen y la segunda sale de la caché', async () => {
    const { service, calls } = setup();
    const first = await service.getSubjects();
    const second = await service.getSubjects();
    assert.equal(first.fromCache, false);
    assert.equal(second.fromCache, true);
    assert.deepEqual(second.data, first.data);
    assert.equal(calls(), 1);
  });

  it('al vencer la caché vuelve a consultar el origen', async () => {
    const { service, calls, advance } = setup(1000);
    await service.getSubjects();
    advance(1000);
    assert.equal((await service.getSubjects()).fromCache, false);
    assert.equal(calls(), 2);
  });

  it('refresh fuerza una nueva consulta', async () => {
    const { service, calls } = setup();
    await service.getSubjects();
    await service.refresh();
    assert.equal(calls(), 2);
  });
});
