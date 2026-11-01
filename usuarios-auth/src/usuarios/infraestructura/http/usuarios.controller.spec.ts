import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { RegistrarUsuarioUseCase } from '../../aplicacion/registrar-usuario.use-case';
import { AuthService } from '../../../auth/aplicacion/auth.service';
import { ConsultarDatosPublicosUseCase } from '../../aplicacion/consultar-datos-publicos.use-case';
import { JwtAuthGuard } from '../../../auth/infraestructura/http/jwt-auth.guard';

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
        {
          provide: ConsultarDatosPublicosUseCase,
          useValue: { ejecutar: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
