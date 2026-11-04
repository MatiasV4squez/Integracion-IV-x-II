import { PasswordService } from './password.service';
import { loginFixture } from '../../../../test/fixtures/login.fixture';

describe('Hash y comprobación de contraseñas', () => {
  const service = new PasswordService();

  it('genera un hash compatible con el login y conserva los espacios', async () => {
    const hash = await service.generarHash(loginFixture.password);
    expect(hash).not.toBe(loginFixture.password);
    expect(await service.verificar(hash, loginFixture.password)).toBe(true);
    expect(await service.verificar(hash, loginFixture.password.trim())).toBe(
      false,
    );
  });

  it('acepta la contraseña correspondiente al hash existente', async () => {
    expect(
      await service.verificar(loginFixture.passwordHash, loginFixture.password),
    ).toBe(true);
  });

  it('rechaza contraseñas incorrectas sin recortar los espacios', async () => {
    expect(
      await service.verificar(
        loginFixture.passwordHash,
        loginFixture.password.trim(),
      ),
    ).toBe(false);
  });

  it('rechaza un hash almacenado inválido', async () => {
    expect(
      await service.verificar('hash-inválido', loginFixture.password),
    ).toBe(false);
  });
});
