import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMockAuthGateway } from './auth-gateway.ts';
import { createAuthService } from './auth-service.ts';
import { createMemoryStorage, createStorageService } from './storage-service.ts';
import { createTokenStorage } from './token-storage.ts';
import { decodeToken } from '../utils/token.ts';

const MIN = 60_000;
const DEMO = { email: 'alumno.demo@uct.cl', password: 'demo1234' };

function setup() {
  let t = 10_000_000;
  const now = () => t;
  const tokenMem = createMemoryStorage();
  const storage = createStorageService(createMemoryStorage(), { now });
  const tokenStorage = createTokenStorage(tokenMem);
  const gateway = createMockAuthGateway({ now });
  const service = createAuthService({ gateway, tokenStorage, storage, now });
  return { service, tokenStorage, storage, tokenMem, advance: (ms) => (t += ms) };
}

describe('iniciar sesión', () => {
  it('con credenciales válidas entrega usuario y token, y los guarda', async () => {
    const { service, tokenStorage } = setup();
    const result = await service.login(DEMO);
    assert.equal(result.ok, true);
    assert.equal(result.data.user.email, 'alumno.demo@uct.cl');
    assert.deepEqual(result.data.user.roles, ['tutee', 'tutor']);
    assert.equal(decodeToken(result.data.token).sub, 'u-me');
    assert.equal(await tokenStorage.get(), result.data.token);
    assert.equal((await service.getCurrentUser()).name, 'Alumno Demo');
  });

  it('normaliza el correo (mayúsculas y espacios)', async () => {
    const { service } = setup();
    assert.equal((await service.login({ ...DEMO, email: '  ALUMNO.Demo@UCT.cl ' })).ok, true);
  });

  it('rechaza correos que no son institucionales (BR11)', async () => {
    const { service } = setup();
    const result = await service.login({ email: 'ana@gmail.com', password: 'x' });
    assert.equal(result.ok, false);
    assert.equal(result.error, 'INVALID_EMAIL_DOMAIN');
  });

  it('contraseña incorrecta y correo inexistente dan el mismo error (no revela cuentas)', async () => {
    const { service } = setup();
    const wrongPass = await service.login({ ...DEMO, password: 'otra' });
    const unknown = await service.login({ email: 'nadie@uct.cl', password: 'demo1234' });
    assert.equal(wrongPass.error, 'INVALID_CREDENTIALS');
    assert.equal(unknown.error, 'INVALID_CREDENTIALS');
    assert.equal(wrongPass.message, unknown.message);
  });

  it('una cuenta suspendida no entra (BR09)', async () => {
    const { service, tokenStorage } = setup();
    const result = await service.login({ email: 'suspendida@alu.uct.cl', password: 'susp1234' });
    assert.equal(result.error, 'ACCOUNT_SUSPENDED');
    assert.equal(await tokenStorage.get(), null, 'no se guarda token');
  });

  it('una cuenta sin verificar no entra (RF01)', async () => {
    const { service } = setup();
    const result = await service.login({ email: 'sin.verificar@alu.uct.cl', password: 'inac1234' });
    assert.equal(result.error, 'ACCOUNT_INACTIVE');
  });
});

describe('cerrar sesión y recuperar sesión', () => {
  it('logout borra token y datos del usuario', async () => {
    const { service, tokenStorage } = setup();
    await service.login(DEMO);
    await service.logout();
    assert.equal(await tokenStorage.get(), null);
    assert.equal(await service.getCurrentUser(), null);
    assert.equal((await service.restoreSession()).error, 'NO_SESSION');
  });

  it('restoreSession recupera la sesión si hubo actividad reciente', async () => {
    const { service, advance } = setup();
    await service.login(DEMO);
    advance(29 * MIN);
    const result = await service.restoreSession();
    assert.equal(result.ok, true);
    assert.equal(result.data.user.id, 'u-me');
  });

  it('pasados 30 min sin actividad la sesión expira y se limpia (NFR04)', async () => {
    const { service, tokenStorage, advance } = setup();
    await service.login(DEMO);
    advance(30 * MIN + 1);
    const result = await service.restoreSession();
    assert.equal(result.ok, false);
    assert.equal(result.error, 'SESSION_EXPIRED');
    assert.equal(await tokenStorage.get(), null);
  });

  it('touch reinicia el contador de inactividad', async () => {
    const { service, advance } = setup();
    await service.login(DEMO);
    advance(20 * MIN);
    await service.touch();
    advance(20 * MIN);
    assert.equal((await service.restoreSession()).ok, true, 'van 40 min desde el login pero solo 20 desde la última actividad');
  });

  it('sin token guardado no hay sesión', async () => {
    const { service } = setup();
    assert.equal((await service.restoreSession()).error, 'NO_SESSION');
  });
});

describe('registro', () => {
  const input = { name: 'Ana Pérez', email: 'ana.perez@alu.uct.cl', password: 'clave1234' };

  it('crea la cuenta inactiva y no deja entrar hasta verificar el correo (RF01)', async () => {
    const { service } = setup();
    const created = await service.register(input);
    assert.equal(created.ok, true);
    assert.equal(created.data.status, 'inactiva');
    assert.deepEqual(created.data.roles, ['tutee']);

    assert.equal((await service.login({ email: input.email, password: input.password })).error, 'ACCOUNT_INACTIVE');
    assert.equal((await service.verifyEmail(input.email)).ok, true);
    assert.equal((await service.login({ email: input.email, password: input.password })).ok, true);
  });

  it('rechaza correos externos y correos repetidos', async () => {
    const { service } = setup();
    assert.equal((await service.register({ ...input, email: 'ana@gmail.com' })).error, 'INVALID_EMAIL_DOMAIN');
    await service.register(input);
    assert.equal((await service.register({ ...input, email: 'ANA.PEREZ@alu.uct.cl' })).error, 'EMAIL_TAKEN');
  });

  it('verificar un correo inexistente da NOT_FOUND', async () => {
    const { service } = setup();
    assert.equal((await service.verifyEmail('nadie@uct.cl')).error, 'NOT_FOUND');
  });
});
