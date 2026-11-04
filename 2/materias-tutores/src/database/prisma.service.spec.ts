import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('exige configurar la conexión', () => {
    expect(() => new PrismaService(new ConfigService())).toThrow();
  });

  it('conecta al iniciar y desconecta al cerrar el módulo', async () => {
    const service = new PrismaService(
      new ConfigService({
        DATABASE_URL: 'postgresql://test:test@localhost:5432/materias_test',
      }),
    );
    const connect = vi.spyOn(service, '$connect').mockResolvedValue();
    const disconnect = vi.spyOn(service, '$disconnect').mockResolvedValue();

    await service.onModuleInit();
    expect(connect).toHaveBeenCalledOnce();
    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('propaga el fallo de conexión para impedir un arranque incompleto', async () => {
    const service = new PrismaService(
      new ConfigService({
        DATABASE_URL: 'postgresql://test:test@localhost:5432/materias_test',
      }),
    );
    vi.spyOn(service, '$connect').mockRejectedValue(
      new Error('Conexión rechazada'),
    );
    await expect(service.onModuleInit()).rejects.toThrow('Conexión rechazada');
  });
});
