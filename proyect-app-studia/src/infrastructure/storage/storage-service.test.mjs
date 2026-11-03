import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMemoryStorage, createStorageService } from './storage-service.ts';

function setup(prefix = 'app:') {
  let t = 1000;
  const mem = createMemoryStorage();
  const storage = createStorageService(mem, { prefix, now: () => t });
  return { mem, storage, advance: (ms) => (t += ms) };
}

describe('almacenamiento local (JSON)', () => {
  it('guarda y lee objetos con prefijo', async () => {
    const { mem, storage } = setup();
    assert.equal(await storage.setJSON('user', { name: 'Ana', roles: ['tutee'] }), true);
    assert.deepEqual(await storage.getJSON('user'), { name: 'Ana', roles: ['tutee'] });
    assert.ok('app:user' in mem.dump(), 'la clave lleva el prefijo');
  });

  it('devuelve el valor por defecto si no existe', async () => {
    const { storage } = setup();
    assert.equal(await storage.getJSON('nada'), null);
    assert.deepEqual(await storage.getJSON('nada', { ok: true }), { ok: true });
  });

  it('un JSON corrupto no rompe: devuelve el valor por defecto', async () => {
    const { mem, storage } = setup();
    await mem.setItem('app:roto', '{no es json');
    assert.equal(await storage.getJSON('roto'), null);
    assert.equal(await storage.getJSON('roto', 7), 7);
  });

  it('remove borra el dato', async () => {
    const { storage } = setup();
    await storage.setJSON('a', 1);
    assert.equal(await storage.remove('a'), true);
    assert.equal(await storage.getJSON('a'), null);
  });

  it('si el almacenamiento falla, no lanza: devuelve false / valor por defecto', async () => {
    const broken = {
      getItem: async () => { throw new Error('disco lleno'); },
      setItem: async () => { throw new Error('disco lleno'); },
      removeItem: async () => { throw new Error('disco lleno'); },
    };
    const storage = createStorageService(broken);
    assert.equal(await storage.setJSON('a', 1), false);
    assert.equal(await storage.getJSON('a', 'respaldo'), 'respaldo');
    assert.equal(await storage.remove('a'), false);
  });
});

describe('caché con vencimiento (NFR12)', () => {
  it('devuelve el dato mientras no venza', async () => {
    const { storage, advance } = setup();
    await storage.cache.set('materias', ['Cálculo'], 1000);
    advance(999);
    assert.deepEqual(await storage.cache.get('materias'), ['Cálculo']);
  });

  it('al vencer devuelve null y limpia la entrada', async () => {
    const { mem, storage, advance } = setup();
    await storage.cache.set('materias', ['Cálculo'], 1000);
    advance(1000);
    assert.equal(await storage.cache.get('materias'), null);
    assert.equal('app:cache:materias' in mem.dump(), false);
  });

  it('invalidate borra antes de tiempo', async () => {
    const { storage } = setup();
    await storage.cache.set('k', 1, 10_000);
    await storage.cache.invalidate('k');
    assert.equal(await storage.cache.get('k'), null);
  });
});
