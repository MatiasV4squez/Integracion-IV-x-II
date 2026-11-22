import { ConsultarDetalleSesion } from './consultar-detalle-sesion';
import type { DetalleSesion } from '../../dominio/entidades/detalle-sesion';
import type { EstadoSesion } from '../../dominio/tipos/estado-sesion';

describe('Consulta del detalle mediante un puerto', () => {
  const ahora = new Date('2026-11-10T12:00:00Z');
  let sesion: DetalleSesion;
  let buscar: jest.Mock;
  let consulta: ConsultarDetalleSesion;

  beforeEach(() => {
    sesion = {
      id_sesion: 9007199254740993n, id_tutor: 2n, id_tutee: 3n,
      id_materia: 4n, id_bloque: 5n, estado_sesion: 'PENDIENTE',
      inicio: new Date('2026-11-10T13:00:00Z'), fin: new Date('2026-11-10T14:00:00Z'),
      fecha_creacion: ahora, fecha_actualizacion: ahora, resultado_provisional: false,
      modalidad: null, lugar: null, enlace: null, declaraciones: [], calificaciones: [],
      fecha_confirmacion: null,
    };
    buscar = jest.fn().mockResolvedValue(sesion);
    consulta = new ConsultarDetalleSesion({ buscarPorId: buscar }, { ahora: () => ahora });
  });

  const ejecutar = (caso: ConsultarDetalleSesion, usuario = '3', roles: string[] = []) =>
    caso.ejecutar('9007199254740993', usuario, roles);

  it.each(['2', '3'])('permite al participante %s sin depender del rol activo de la web', async (usuario) => {
    expect((await ejecutar(consulta, usuario)).sesion).toBe(sesion);
    expect(buscar).toHaveBeenCalledWith(9007199254740993n);
  });

  it.each(['ADMINISTRADOR', 'ADMIN', ' administrador '])('permite consultar a un administrador con rol %s', async (rol) => {
    const resultado = await ejecutar(consulta, '9', [rol]);
    expect(Object.values(resultado.acciones_disponibles)).not.toContain(true);
  });

  it.each([{ roles: [] }, { roles: ['TUTOR'] }, { roles: ['ESTUDIANTE'] }])('rechaza a un tercero con roles $roles', async ({ roles }) => {
    await expect(ejecutar(consulta, '9', roles)).rejects.toMatchObject({ motivo: 'PROHIBIDO' });
  });

  it('responde no encontrada sin inventar un detalle', async () => {
    buscar.mockResolvedValue(null);
    await expect(ejecutar(consulta)).rejects.toMatchObject({ motivo: 'NO_ENCONTRADA' });
  });

  it.each(['0', '-1', '01', '1.2', 'abc', '9223372036854775808'])('rechaza el ID %s antes de consultar', async (id) => {
    await expect(consulta.ejecutar(id, '3', [])).rejects.toMatchObject({ motivo: 'ENTRADA_INVALIDA' });
    expect(buscar).not.toHaveBeenCalled();
  });

  it.each([
    ['PENDIENTE', '2', ['aceptar', 'rechazar']],
    ['PENDIENTE', '3', ['cancelar']],
    ['CONFIRMADA', '2', ['cancelar']],
    ['CONFIRMADA', '3', ['cancelar']],
    ['PENDIENTE_CIERRE', '2', ['declarar_cierre']],
    ['PENDIENTE_CIERRE', '3', ['declarar_cierre']],
    ['COMPLETADA', '2', ['calificar']],
    ['COMPLETADA', '3', ['calificar']],
    ['EN_CONFLICTO', '3', []],
    ['CANCELADA', '3', []],
    ['RECHAZADA', '2', []],
    ['EXPIRADA', '3', []],
    ['NO_REALIZADA', '2', []],
    ['INASISTENCIA', '3', []],
  ] as Array<[EstadoSesion, string, string[]]>)('en %s habilita las acciones del participante %s', async (estado, usuario, permitidas) => {
    sesion.estado_sesion = estado;
    const { acciones_disponibles } = await ejecutar(consulta, usuario);
    expect(Object.entries(acciones_disponibles).filter(([, disponible]) => disponible).map(([accion]) => accion)).toEqual(permitidas);
  });

  it.each(['2026-11-10T12:00:00Z', '2026-11-10T11:59:59Z'])('impide cancelar una confirmada desde su inicio %s', async (inicio) => {
    sesion.estado_sesion = 'CONFIRMADA';
    sesion.inicio = new Date(inicio);
    expect((await ejecutar(consulta)).acciones_disponibles.cancelar).toBe(false);
  });

  it('conserva el retiro de pendientes por el estudiante según el contrato existente', async () => {
    sesion.inicio = new Date('2026-11-09T12:00:00Z');
    expect((await ejecutar(consulta)).acciones_disponibles.cancelar).toBe(true);
  });

  it('no permite repetir la declaración propia ni bloquea la de la contraparte', async () => {
    sesion.estado_sesion = 'PENDIENTE_CIERRE';
    sesion.declaraciones.push({
      id_declaracion: 1n, id_sesion: sesion.id_sesion, id_usuario: 3n,
      resultado_declarado: 'COMPLETADA', id_usuario_inasistente: null, fecha_declaracion: ahora,
    });
    expect((await ejecutar(consulta)).acciones_disponibles.declarar_cierre).toBe(false);
    expect((await ejecutar(consulta, '2')).acciones_disponibles.declarar_cierre).toBe(true);
  });

  it('no permite repetir la calificación propia ni bloquea la de la contraparte', async () => {
    sesion.estado_sesion = 'COMPLETADA';
    sesion.calificaciones.push({
      id_calificacion: 1n, id_sesion: sesion.id_sesion, id_evaluador: 3n,
      id_evaluado: 2n, puntuacion: 5, fecha_calificacion: ahora,
    });
    expect((await ejecutar(consulta)).acciones_disponibles.calificar).toBe(false);
    expect((await ejecutar(consulta, '2')).acciones_disponibles.calificar).toBe(true);
  });

  it('habilita resolver un conflicto solo al administrador sin darle acciones de participante', async () => {
    sesion.estado_sesion = 'EN_CONFLICTO';
    const { acciones_disponibles } = await ejecutar(consulta, '9', ['ADMINISTRADOR']);
    expect(Object.entries(acciones_disponibles).filter(([, disponible]) => disponible).map(([accion]) => accion)).toEqual(['resolver_conflicto']);
  });

  it('propaga fallos del almacenamiento sin devolver un resultado falso', async () => {
    const error = new Error('Sin conexión');
    buscar.mockRejectedValue(error);
    await expect(ejecutar(consulta)).rejects.toBe(error);
  });
});
