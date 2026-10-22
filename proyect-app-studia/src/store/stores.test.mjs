import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMockAuthGateway } from '../services/auth-gateway.ts';
import { createAuthService } from '../services/auth-service.ts';
import { createMemoryStorage, createStorageService } from '../services/storage-service.ts';
import { createTokenStorage } from '../services/token-storage.ts';
import { createAuthStore } from './create-auth-store.ts';
import { DEFAULT_PREFERENCES, createPreferencesStore, sanitizePreferences } from './create-preferences-store.ts';

const MIN = 60_000;
const DEMO = { email: 'alumno.demo@uct.cl', password: 'demo1234' };

function setupAuth() {
  let t = 50_000_000;
  const now = () => t;
  const tokenMem = createMemoryStorage();
  const storage = createStorageService(createMemoryStorage(), { now });
  const service = createAuthService({ gateway: createMockAuthGateway({ now }), tokenStorage: createTokenStorage(tokenMem), storage, now });
  const store = createAuthStore(service, { now });
  return { store, service, advance: (ms) => (t += ms) };
}

describe('estado global de la sesión', () => {
  it('parte hidratando y, sin sesión guardada, queda sin autenticar', async () => {
    const { store } = setupAuth();
    assert.equal(store.getState().status, 'hydrating');
    await store.getState().hydrate();
    assert.equal(store.getState().status, 'unauthenticated');
    assert.equal(store.getState().notice, null);
  });

  it('login correcto autentica y guarda el usuario', async () => {
    const { store } = setupAuth();
    assert.equal(await store.getState().login(DEMO), true);
    assert.equal(store.getState().status, 'authenticated');
    assert.equal(store.getState().user.email, 'alumno.demo@uct.cl');
    assert.equal(store.getState().error, null);
  });

  it('login fallido deja el mensaje de error y no autentica', async () => {
    const { store } = setupAuth();
    assert.equal(await store.getState().login({ ...DEMO, password: 'mala' }), false);
    assert.equal(store.getState().status, 'hydrating', 'no cambió de estado');
    assert.match(store.getState().error, /incorrectos/);
  });

  it('logout limpia el usuario', async () => {
    const { store } = setupAuth();
    await store.getState().login(DEMO);
    await store.getState().logout();
    assert.equal(store.getState().status, 'unauthenticated');
    assert.equal(store.getState().user, null);
  });

  it('al abrir la app recupera la sesión guardada (nueva instancia, mismo almacenamiento)', async () => {
    let t = 1;
    const now = () => t;
    const tokenMem = createMemoryStorage();
    const mem = createMemoryStorage();
    const build = () =>
      createAuthStore(
        createAuthService({ gateway: createMockAuthGateway({ now }), tokenStorage: createTokenStorage(tokenMem), storage: createStorageService(mem, { now }), now }),
        { now },
      );
    await build().getState().login(DEMO);
    const reopened = build();
    await reopened.getState().hydrate();
    assert.equal(reopened.getState().status, 'authenticated');
    assert.equal(reopened.getState().user.id, 'u-me');
  });

  it('si la sesión guardada expiró, avisa con un mensaje (NFR04)', async () => {
    let t = 1;
    const now = () => t;
    const tokenMem = createMemoryStorage();
    const mem = createMemoryStorage();
    const build = () =>
      createAuthStore(
        createAuthService({ gateway: createMockAuthGateway({ now }), tokenStorage: createTokenStorage(tokenMem), storage: createStorageService(mem, { now }), now }),
        { now },
      );
    await build().getState().login(DEMO);
    t += 31 * MIN;
    const reopened = build();
    await reopened.getState().hydrate();
    assert.equal(reopened.getState().status, 'unauthenticated');
    assert.match(reopened.getState().notice, /inactividad/);
  });

  it('checkInactivity cierra la sesión pasados 30 min y touch lo evita', async () => {
    const { store, advance } = setupAuth();
    await store.getState().login(DEMO);
    advance(20 * MIN);
    await store.getState().touch();
    advance(20 * MIN);
    await store.getState().checkInactivity();
    assert.equal(store.getState().status, 'authenticated', 'hubo actividad hace 20 min');
    advance(11 * MIN);
    await store.getState().checkInactivity();
    assert.equal(store.getState().status, 'unauthenticated');
    assert.match(store.getState().notice, /inactividad/);
  });

  it('touch no escribe más de una vez cada 30 s', async () => {
    const { store, advance } = setupAuth();
    await store.getState().login(DEMO);
    const first = store.getState().lastActivityAt;
    advance(10_000);
    await store.getState().touch();
    assert.equal(store.getState().lastActivityAt, first, 'dentro de la ventana de 30 s no cambia');
    advance(25_000);
    await store.getState().touch();
    assert.ok(store.getState().lastActivityAt > first);
  });
});

describe('preferencias guardadas en el dispositivo', () => {
  const make = () => {
    const mem = createMemoryStorage();
    return { mem, build: () => createPreferencesStore(createStorageService(mem, { prefix: 'p:' })) };
  };

  it('sin datos guardados usa los valores por defecto', async () => {
    const store = make().build();
    await store.getState().hydrate();
    const { theme, notificationsEnabled, tutorMode, hydrated } = store.getState();
    assert.deepEqual({ theme, notificationsEnabled, tutorMode }, DEFAULT_PREFERENCES);
    assert.equal(hydrated, true);
  });

  it('los cambios se guardan y sobreviven a reabrir la app', async () => {
    const { build } = make();
    const first = build();
    await first.getState().hydrate();
    first.getState().setTheme('dark');
    first.getState().setNotificationsEnabled(false);
    first.getState().setTutorMode(true);
    await new Promise((r) => setTimeout(r, 0));

    const second = build();
    await second.getState().hydrate();
    assert.equal(second.getState().theme, 'dark');
    assert.equal(second.getState().notificationsEnabled, false);
    assert.equal(second.getState().tutorMode, true);
  });

  it('valores corruptos o desconocidos se reemplazan por los por defecto', () => {
    assert.deepEqual(sanitizePreferences({ theme: 'rosado', notificationsEnabled: 'si', tutorMode: 1 }), DEFAULT_PREFERENCES);
    assert.deepEqual(sanitizePreferences(null), DEFAULT_PREFERENCES);
    assert.equal(sanitizePreferences({ theme: 'light' }).theme, 'light');
  });

  it('reset vuelve a los valores por defecto', async () => {
    const store = make().build();
    await store.getState().hydrate();
    store.getState().setTheme('dark');
    store.getState().reset();
    assert.equal(store.getState().theme, 'system');
  });
});
