import type { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaDisponibilidadRepository } from './prisma-disponibilidad.repository.js';

describe('PrismaDisponibilidadRepository', () => {
  const bloque = {
    idBloque: 9007199254740993n,
    idTutor: 10n,
    dia: new Date('2026-10-01T00:00:00Z'),
    horaInicio: new Date('1970-01-01T09:00:00Z'),
    horaFin: new Date('1970-01-01T10:00:00Z'),
    estadoBloque: 'DISPONIBLE',
  };
  const horario = { dia: '2026-10-01', horaInicio: '09:00', horaFin: '10:00' };
  const prisma = { bloqueHorario: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() } };
  const repo = new PrismaDisponibilidadRepository(prisma as unknown as PrismaService);

  beforeEach(() => vi.resetAllMocks());

  it('consulta solo los bloques no inactivos del mismo tutor y día', async () => {
    prisma.bloqueHorario.findMany.mockResolvedValue([bloque]);
    await expect(repo.listarActivosDelDia(10n, horario.dia)).resolves.toEqual([{ ...horario, idBloque: bloque.idBloque, idTutor: 10n, estadoBloque: 'DISPONIBLE' }]);
    expect(prisma.bloqueHorario.findMany).toHaveBeenCalledWith({ where: { idTutor: 10n, dia: bloque.dia, estadoBloque: { not: 'INACTIVO' } } });
  });
  it('convierte las fechas y horas al crear, dejando el estado por defecto', async () => {
    prisma.bloqueHorario.create.mockResolvedValue(bloque);
    await repo.crear(10n, horario);
    expect(prisma.bloqueHorario.create).toHaveBeenCalledWith({ data: { idTutor: 10n, dia: bloque.dia, horaInicio: bloque.horaInicio, horaFin: bloque.horaFin } });
  });
  it('lista propios por día/hora e incluye todos los estados', async () => {
    prisma.bloqueHorario.findMany.mockResolvedValue([]);
    await expect(repo.listarPropios(10n)).resolves.toEqual([]);
    expect(prisma.bloqueHorario.findMany).toHaveBeenCalledWith({ where: { idTutor: 10n }, orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }] });
  });
  it('filtra disponibilidad por estado, día y hora estrictamente posterior', async () => {
    prisma.bloqueHorario.findMany.mockResolvedValue([]);
    await repo.consultarDisponibles(10n, { dia: '2026-10-01', hora: '09:30' });
    expect(prisma.bloqueHorario.findMany).toHaveBeenCalledWith({
      where: { idTutor: 10n, estadoBloque: 'DISPONIBLE', OR: [{ dia: { gt: bloque.dia } }, { dia: bloque.dia, horaInicio: { gt: new Date('1970-01-01T09:30:00Z') } }] },
      orderBy: [{ dia: 'asc' }, { horaInicio: 'asc' }, { idBloque: 'asc' }],
    });
  });
  it('busca por propietario y conserva el resultado ausente', async () => {
    prisma.bloqueHorario.findUnique.mockResolvedValue(null);
    await expect(repo.buscarPropio(10n, 1n)).resolves.toBeNull();
    expect(prisma.bloqueHorario.findUnique).toHaveBeenCalledWith({ where: { idTutor: 10n, idBloque: 1n } });
  });
  it('actualiza condicionando propietario y estado disponible', async () => {
    prisma.bloqueHorario.update.mockResolvedValue(bloque);
    await repo.actualizarDisponible(10n, 1n, horario);
    expect(prisma.bloqueHorario.update).toHaveBeenCalledWith({
      where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' },
      data: { dia: bloque.dia, horaInicio: bloque.horaInicio, horaFin: bloque.horaFin },
    });
  });
  it('inactiva mediante update condicionado sin borrar', async () => {
    prisma.bloqueHorario.update.mockResolvedValue({ ...bloque, estadoBloque: 'INACTIVO' });
    await expect(repo.desactivarDisponible(10n, 1n)).resolves.toMatchObject({ estadoBloque: 'INACTIVO' });
    expect(prisma.bloqueHorario.update).toHaveBeenCalledWith({ where: { idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' }, data: { estadoBloque: 'INACTIVO' } });
  });
  it.each(['actualizar', 'desactivar'])('traduce P2025 al conflicto al %s', async (operacion) => {
    prisma.bloqueHorario.update.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Conflicto', { code: 'P2025', clientVersion: '7.10.0' }));
    const resultado = operacion === 'actualizar' ? repo.actualizarDisponible(10n, 1n, horario) : repo.desactivarDisponible(10n, 1n);
    await expect(resultado).rejects.toMatchObject({ codigo: 'CONFLICTO' });
  });
  it('no convierte errores ajenos a P2025 en conflictos de negocio', async () => {
    const error = new Error('Conexión fallida');
    prisma.bloqueHorario.update.mockRejectedValue(error);
    await expect(repo.desactivarDisponible(10n, 1n)).rejects.toBe(error);
  });
});
