import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSessionsStore } from './sessions-store.ts';

const SEED = { sessions: [], clock: '2026-09-28T12:00:00-03:00', reserved: {} };

function fakeUseCases(overrides = {}) {
  const ok = async () => ({ ok: true, data: undefined });
  return {
    sesiones: {
      listar: async () => [],
      responder: ok,
      cancelar: ok,
      declarar: ok,
      calificar: ok,
      reportar: ok,
      ...overrides.sesiones,
    },
    disponibilidad: {
      misBloques: async () => [],
      publicar: ok,
      actualizar: ok,
      quitar: ok,
      ...overrides.disponibilidad,
    },
  };
}

function build(options = {}) {
  const useCases = fakeUseCases(options.overrides);
  return createSessionsStore({
    api: !!options.api,
    seed: options.seed ?? SEED,
    sesiones: useCases.sesiones,
    disponibilidad: useCases.disponibilidad,
    isTutor: options.isTutor ?? (() => false),
  });
}

const BLOCK_INPUT = { subjectCode: 'MAT1010', startsAt: '2026-10-01T10:00:00-03:00', endsAt: '2026-10-01T11:00:00-03:00', capacity: 1 };

describe('sesiones (Zustand): modo demo', () => {
  it('parte con los datos de la seed y queda cargado', () => {
    const store = build();
    assert.deepEqual(store.getState().sessions, SEED.sessions);
    assert.equal(store.getState().now, SEED.clock);
    assert.equal(store.getState().loaded, true);
    assert.equal(store.getState().loadError, null);
  });

  it('setLastViewed guarda el id de la última sesión abierta', () => {
    const store = build();
    store.getState().setLastViewed('s1');
    assert.equal(store.getState().lastViewedId, 's1');
  });

  it('run aplica la operación si fue válida y deja el estado igual si falló', () => {
    const store = build();
    const ok = store.getState().run((s) => ({ ok: true, state: { ...s, clock: '2026-09-28T12:01:00-03:00' }, session: {} }));
    assert.equal(ok.ok, true);
    assert.equal(store.getState().now, '2026-09-28T12:01:00-03:00');

    const fail = store.getState().run(() => ({ ok: false, error: 'no se pudo' }));
    assert.equal(fail.ok, false);
    assert.equal(store.getState().now, '2026-09-28T12:01:00-03:00', 'el estado no cambia si la operación falló');
  });

  it('reload y handleAuthChange no hacen nada: los datos son fijos', async () => {
    let called = false;
    const store = build({ overrides: { sesiones: { listar: async () => ((called = true), []) } } });
    await store.getState().reload();
    store.getState().handleAuthChange(false);
    store.getState().handleAuthChange(true);
    assert.equal(called, false);
  });

  it('publishAvailability agrega un horario propio y valida la entrada', () => {
    const store = build();
    assert.equal(store.getState().publishAvailability({ ...BLOCK_INPUT, subjectCode: '' }).error, 'Elige una materia.');
    assert.match(store.getState().publishAvailability({ ...BLOCK_INPUT, endsAt: BLOCK_INPUT.startsAt }).error, /término/);
    assert.match(store.getState().publishAvailability({ ...BLOCK_INPUT, capacity: 0 }).error, /capacidad/);

    const res = store.getState().publishAvailability(BLOCK_INPUT);
    assert.equal(res.ok, true);
    assert.equal(store.getState().myAvailability.length, 1);
    assert.equal(store.getState().myAvailability[0].subjectCode, 'MAT1010');
  });

  it('updateAvailability y removeAvailability cambian el horario propio', async () => {
    const store = build();
    store.getState().publishAvailability(BLOCK_INPUT);
    const id = store.getState().myAvailability[0].id;

    const updated = await store.getState().updateAvailability(id, { ...BLOCK_INPUT, capacity: 2 });
    assert.equal(updated.ok, true);
    assert.equal(store.getState().myAvailability[0].capacity, 2);

    const removed = await store.getState().removeAvailability(id);
    assert.equal(removed.ok, true);
    assert.equal(store.getState().myAvailability.length, 0);
  });
});

describe('sesiones (Zustand): con backend', () => {
  it('reload pide las sesiones y, si el usuario es tutor, también sus horarios', async () => {
    const sesion = { id: 's1' };
    const bloque = { id: 'b1' };
    const store = build({
      api: true,
      isTutor: () => true,
      overrides: { sesiones: { listar: async () => [sesion] }, disponibilidad: { misBloques: async () => [bloque] } },
    });
    await store.getState().reload();
    assert.deepEqual(store.getState().sessions, [sesion]);
    assert.deepEqual(store.getState().myAvailability, [bloque]);
    assert.equal(store.getState().loaded, true);
    assert.equal(store.getState().loadError, null);
  });

  it('si la carga falla, guarda el mensaje de error y queda cargado', async () => {
    const store = build({ api: true, overrides: { sesiones: { listar: async () => { throw new Error('sin conexión'); } } } });
    await store.getState().reload();
    assert.equal(store.getState().loadError, 'sin conexión');
    assert.equal(store.getState().loaded, true);
  });

  it('handleAuthChange recarga al autenticarse y limpia al cerrar sesión', async () => {
    const sesion = { id: 's1' };
    const store = build({ api: true, overrides: { sesiones: { listar: async () => [sesion] } } });

    store.getState().handleAuthChange(true);
    await new Promise((r) => setTimeout(r, 0));
    assert.deepEqual(store.getState().sessions, [sesion]);

    store.getState().handleAuthChange(false);
    assert.deepEqual(store.getState().sessions, []);
    assert.equal(store.getState().loaded, false);
  });

  it('remote.respond llama al caso de uso y recarga si funcionó', async () => {
    let respondCalled = false;
    let reloadCalled = false;
    const store = build({
      api: true,
      overrides: {
        sesiones: {
          responder: async () => ((respondCalled = true), { ok: true, data: undefined }),
          listar: async () => (reloadCalled = true, []),
        },
      },
    });
    const res = await store.getState().remote.respond('s1', true);
    assert.equal(res.ok, true);
    assert.equal(respondCalled, true);
    assert.equal(reloadCalled, true);
  });

  it('remote.cancel no recarga si el caso de uso falló', async () => {
    let reloadCalled = false;
    const store = build({
      api: true,
      overrides: { sesiones: { cancelar: async () => ({ ok: false, error: 'no se pudo cancelar' }), listar: async () => (reloadCalled = true, []) } },
    });
    const res = await store.getState().remote.cancel('s1');
    assert.equal(res.ok, false);
    assert.equal(reloadCalled, false);
  });

  it('publishAvailability llama a disponibilidad.publicar y recarga', async () => {
    let publicarInput = null;
    let reloadCalled = false;
    const store = build({
      api: true,
      overrides: {
        disponibilidad: { publicar: async (input) => ((publicarInput = input), { ok: true, data: undefined }) },
        sesiones: { listar: async () => (reloadCalled = true, []) },
      },
    });
    const res = await store.getState().publishAvailability(BLOCK_INPUT);
    assert.equal(res.ok, true);
    assert.deepEqual(publicarInput, BLOCK_INPUT);
    assert.equal(reloadCalled, true);
  });
});
