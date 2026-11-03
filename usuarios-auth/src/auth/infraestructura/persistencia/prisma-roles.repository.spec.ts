import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaRolesRepository } from './prisma-roles.repository';

describe('PrismaRolesRepository con reintentos', () => {
  // Tabla usuario_rol en memoria que respeta skipDuplicates como la base de datos.
  const asignaciones = new Set<string>();
  const tx = {
    usuario: { findUnique: jest.fn() },
    rol: { findUnique: jest.fn() },
    usuarioRol: {
      createMany: jest.fn(
        ({
          data,
          skipDuplicates,
        }: {
          data: { id_usuario: bigint; id_rol: number }[];
          skipDuplicates: boolean;
        }) => {
          for (const fila of data) {
            const clave = `${fila.id_usuario}:${fila.id_rol}`;
            if (asignaciones.has(clave) && !skipDuplicates)
              throw new Error('Registro duplicado');
            asignaciones.add(clave);
          }
          return Promise.resolve({ count: data.length });
        },
      ),
    },
  };
  const prisma = {
    $transaction: (operacion: (cliente: typeof tx) => Promise<unknown>) =>
      operacion(tx),
  } as unknown as PrismaService;
  const repositorio = new PrismaRolesRepository(prisma);

  beforeEach(() => {
    asignaciones.clear();
    tx.usuario.findUnique.mockResolvedValue({ id_usuario: 23n });
    tx.rol.findUnique.mockResolvedValue({ id_rol: 2 });
  });

  it('reintentar la asignación del rol TUTOR no crea registros duplicados', async () => {
    await expect(repositorio.asignarTutor(23n)).resolves.toBe('ASIGNADO');
    await expect(repositorio.asignarTutor(23n)).resolves.toBe('ASIGNADO');

    expect(asignaciones.size).toBe(1);
    expect(tx.usuarioRol.createMany).toHaveBeenCalledTimes(2);
    expect(tx.usuarioRol.createMany).toHaveBeenLastCalledWith({
      data: [{ id_usuario: 23n, id_rol: 2 }],
      skipDuplicates: true,
    });
  });

  it('no escribe nada si el usuario no existe', async () => {
    tx.usuario.findUnique.mockResolvedValue(null);
    await expect(repositorio.asignarTutor(23n)).resolves.toBe(
      'USUARIO_NO_ENCONTRADO',
    );
    expect(asignaciones.size).toBe(0);
  });
});
