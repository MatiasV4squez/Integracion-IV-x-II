import { PasswordService } from './password.service';
import { loginFixture } from '../../test/fixtures/login.fixture';

describe('Comprobación de contraseña para login', () => {
  const service = new PasswordService();

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
