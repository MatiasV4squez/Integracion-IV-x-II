import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ROUTES, canAccess, canBeTutor, getActiveRole, getVisibleTabs } from './access.ts';

describe('acceso por rol', () => {
  it('solo quien tiene el rol Tutor puede ser tutor (RF03)', () => {
    assert.equal(canBeTutor(['tutee']), false);
    assert.equal(canBeTutor(['tutee', 'tutor']), true);
  });

  it('el modo Tutor requiere pedirlo y tener el rol', () => {
    assert.equal(getActiveRole(['tutee', 'tutor'], true), 'tutor');
    assert.equal(getActiveRole(['tutee', 'tutor'], false), 'tutee');
    assert.equal(getActiveRole(['tutee'], true), 'tutee', 'un Tutee no puede forzar el modo Tutor');
  });

  it('el Tutor no ve la pestaña Buscar', () => {
    assert.deepEqual(getVisibleTabs('tutee'), ['index', 'buscar', 'historial', 'perfil']);
    assert.deepEqual(getVisibleTabs('tutor'), ['index', 'historial', 'perfil']);
  });

  it('guardas de rutas: público, autenticado y tutor', () => {
    const anon = { isAuthenticated: false, roles: [] };
    const tutee = { isAuthenticated: true, roles: ['tutee'] };
    const tutor = { isAuthenticated: true, roles: ['tutee', 'tutor'] };
    assert.equal(canAccess('public', anon), true);
    assert.equal(canAccess('public', tutee), false, 'con sesión no se ve el login');
    assert.equal(canAccess('authenticated', anon), false);
    assert.equal(canAccess('authenticated', tutee), true);
    assert.equal(canAccess('tutor', tutee), false);
    assert.equal(canAccess('tutor', tutor), true);
    assert.equal(canAccess('tutor', anon), false);
  });

  it('las rutas tienen la forma esperada', () => {
    assert.equal(ROUTES.login, '/login');
    assert.equal(ROUTES.registro, '/registro');
  });
});
