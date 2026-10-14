import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { RegistrarUsuarioUseCase } from './aplicacion/registrar-user.use-case';
import { AuthService } from '../auth/aplicacion/auth.service';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  const auth = { login: jest.fn() };
  const registrarUsuario = { ejecutar: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        { provide: RegistrarUsuarioUseCase, useValue: registrarUsuario },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('delega el login al mismo caso de uso que Auth', async () => {
    const respuesta = { access_token: 'token', token_type: 'Bearer' };
    auth.login.mockResolvedValueOnce(respuesta);
    expect(
      await controller.login({
        correo_institucional: 'estudiante@alu.uct.cl',
        password: 'contraseña',
      }),
    ).toBe(respuesta);
    expect(auth.login).toHaveBeenCalledWith(
      'estudiante@alu.uct.cl',
      'contraseña',
    );
  });
});
