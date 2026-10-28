import { GestionarSesiones } from './gestionar-sesiones';
import type { Sesion } from '../../dominio/entidades/sesion';
import type { ContextoTransaccion, UnidadDeTrabajo } from '../puertos/unidad-de-trabajo.puerto';
import type { DisponibilidadTutores } from '../puertos/disponibilidad-tutores.puerto';

function crearContexto(): jest.Mocked<ContextoTransaccion> {
  return {
    sesiones: {
      contarPendientes: jest.fn().mockResolvedValue(0),
      existeCompromiso: jest.fn().mockResolvedValue(false),
      existeSesionActivaEnBloque: jest.fn().mockResolvedValue(false),
      crearPendiente: jest.fn(),
      buscarPorId: jest.fn(),
      consultarHistorial: jest.fn(),
      consultarSesionesActivas: jest.fn(),
      existeSolapamiento: jest.fn(),
      haComenzado: jest.fn(),
      cambiarEstado: jest.fn(),
      buscarPendientesVencidas: jest.fn(),
      expirarSiSiguePendiente: jest.fn(),
      cerrarConfirmadasTerminadas: jest.fn(),
      buscarCierresVencidos: jest.fn(),
      buscarConDeclaraciones: jest.fn(),
    },
    declaraciones: {
      registrarSiNoExiste: jest.fn(),
      consultarPorSesion: jest.fn(),
    },
    calificaciones: {
      registrarSiNoExiste: jest.fn(),
      buscarPorEvaluador: jest.fn(),
      resumirNotasComoTutor: jest.fn(),
    },
    resoluciones: { registrar: jest.fn() },
    entregas: {
      registrarPendiente: jest.fn(),
      buscar: jest.fn(),
      consultarPendientes: jest.fn(),
      registrarIntento: jest.fn(),
    },
    liberaciones: {
      registrarPendiente: jest.fn(),
      buscar: jest.fn(),
      consultarPendientes: jest.fn(),
      registrarIntento: jest.fn(),
    },
    avisosModeracion: {
      registrarPendiente: jest.fn(),
      buscar: jest.fn(),
      existeConflictoPendiente: jest.fn(),
      consultarPendientes: jest.fn(),
      registrarIntento: jest.fn(),
    },
  };
}

describe('Gestionar sesiones mediante puertos', () => {
  let contexto: ReturnType<typeof crearContexto>;
  let aplicacion: GestionarSesiones;
  let sesion: Sesion;
  let disponibilidad: jest.Mocked<DisponibilidadTutores>;
  let lecturas: ReturnType<typeof crearContexto>;
  let liberarPendiente: jest.Mock;
  let enTransaccion: boolean;

  beforeEach(() => {
    contexto = crearContexto();
    lecturas = crearContexto();
    disponibilidad = {
      consultarBloque: jest.fn(),
      reservar: jest.fn(),
      liberar: jest.fn(),
    };
    enTransaccion = false;
    liberarPendiente = jest.fn().mockImplementation(async () => {
      expect(enTransaccion).toBe(false);
      return true;
    });
    const unidad: UnidadDeTrabajo = {
      ejecutar: async (operacion) => {
        enTransaccion = true;
        try {
          return await operacion(contexto);
        } finally {
          enTransaccion = false;
        }
      },
    };
    aplicacion = new GestionarSesiones(
      unidad,
      lecturas.sesiones,
      lecturas.calificaciones,
      { enviarCalificacion: jest.fn() },
      { error: jest.fn() },
      disponibilidad,
      { procesar: liberarPendiente },
      { procesar: jest.fn() },
    );
    sesion = {
      id_sesion: 9007199254740993n,
      id_tutor: 2n,
      id_tutee: 3n,
      id_materia: 4n,
      id_bloque: 5n,
      estado_sesion: 'PENDIENTE',
      inicio: new Date('2099-01-01T10:00:00Z'),
      fin: new Date('2099-01-01T11:00:00Z'),
      fecha_creacion: new Date(),
      fecha_actualizacion: new Date(),
      resultado_provisional: false,
    };
    jest.mocked(contexto.sesiones.buscarPorId).mockResolvedValue(sesion);
    disponibilidad.consultarBloque.mockResolvedValue({
      id_tutor: sesion.id_tutor,
      id_bloque: sesion.id_bloque,
      inicio: sesion.inicio,
      fin: sesion.fin,
    });
    jest.mocked(contexto.sesiones.crearPendiente).mockResolvedValue(sesion);
  });

  const entrada = { id_tutor: '2', id_materia: '4', id_bloque: '5' };

  it('crea una solicitud con la identidad autenticada y el horario recibido del bloque', async () => {
    const creada = await aplicacion.crearSesion(entrada, '3');
    expect(creada).toEqual(sesion);
    expect(contexto.sesiones.crearPendiente).toHaveBeenCalledWith({
      id_tutor: 2n,
      id_tutee: 3n,
      id_materia: 4n,
      id_bloque: 5n,
      inicio: sesion.inicio,
      fin: sesion.fin,
    });
    expect(disponibilidad.reservar).toHaveBeenCalledWith(5n);
    expect(disponibilidad.liberar).not.toHaveBeenCalled();
  });

  it('rechaza la quinta pendiente sin consultar ni reservar en el otro micro', async () => {
    jest.mocked(lecturas.sesiones.contarPendientes).mockResolvedValue(4);
    await expect(aplicacion.crearSesion(entrada, '3')).rejects.toMatchObject({
      motivo: 'CONFLICTO',
    });
    expect(disponibilidad.consultarBloque).not.toHaveBeenCalled();
    expect(contexto.sesiones.crearPendiente).not.toHaveBeenCalled();
  });

  it('rechaza un compromiso local antes de reservar', async () => {
    jest.mocked(contexto.sesiones.existeCompromiso).mockResolvedValue(true);
    await expect(aplicacion.crearSesion(entrada, '3')).rejects.toMatchObject({
      motivo: 'CONFLICTO',
    });
    expect(disponibilidad.reservar).not.toHaveBeenCalled();
  });

  it('rechaza un bloque cuyo inicio ya fue alcanzado antes de reservar', async () => {
    jest.mocked(contexto.sesiones.haComenzado).mockResolvedValue(true);
    await expect(aplicacion.crearSesion(entrada, '3')).rejects.toMatchObject({
      motivo: 'CONFLICTO',
    });
    expect(disponibilidad.reservar).not.toHaveBeenCalled();
    expect(contexto.sesiones.crearPendiente).not.toHaveBeenCalled();
  });

  it('libera una reserva confirmada si falla el guardado local', async () => {
    const fallo = new Error('Fallo de persistencia');
    jest.mocked(contexto.sesiones.crearPendiente).mockRejectedValue(fallo);
    await expect(aplicacion.crearSesion(entrada, '3')).rejects.toBe(fallo);
    expect(disponibilidad.liberar).toHaveBeenCalledWith(5n);
  });

  it('informa un error controlado si también falla la compensación', async () => {
    jest
      .mocked(contexto.sesiones.crearPendiente)
      .mockRejectedValue(new Error('Fallo de persistencia'));
    disponibilidad.liberar.mockRejectedValue(new Error('Micro no disponible'));
    await expect(aplicacion.crearSesion(entrada, '3')).rejects.toMatchObject({
      motivo: 'DEPENDENCIA_NO_DISPONIBLE',
    });
  });

  it('no libera un bloque si la reserva no fue confirmada', async () => {
    disponibilidad.reservar.mockRejectedValue(
      new Error('Fallo de comunicación'),
    );
    await expect(aplicacion.crearSesion(entrada, '3')).rejects.toThrow(
      'Fallo de comunicación',
    );
    expect(disponibilidad.liberar).not.toHaveBeenCalled();
    expect(contexto.sesiones.crearPendiente).not.toHaveBeenCalled();
  });

  it('rechaza dentro del contexto transaccional conservando identificadores BIGINT', async () => {
    jest
      .mocked(contexto.sesiones.cambiarEstado)
      .mockResolvedValue({ ...sesion, estado_sesion: 'RECHAZADA' });
    const resultado = await aplicacion.rechazarSesion('9007199254740993', '2');
    expect(resultado.estado_sesion).toBe('RECHAZADA');
    expect(contexto.sesiones.buscarPorId).toHaveBeenCalledWith(
      9007199254740993n,
    );
    expect(contexto.sesiones.cambiarEstado).toHaveBeenCalledWith(
      sesion,
      'RECHAZADA',
      false,
    );
    expect(contexto.liberaciones.registrarPendiente).toHaveBeenCalledWith(
      sesion.id_sesion,
      sesion.id_bloque,
    );
    expect(liberarPendiente).toHaveBeenCalledWith(sesion.id_sesion);
  });

  it('impide que otro participante responda en nombre del tutor', async () => {
    await expect(
      aplicacion.rechazarSesion('9007199254740993', '3'),
    ).rejects.toMatchObject({ motivo: 'PROHIBIDO' });
    expect(contexto.sesiones.cambiarEstado).not.toHaveBeenCalled();
    expect(liberarPendiente).not.toHaveBeenCalled();
  });

  it('informa un conflicto si otra operación ganó el cambio de estado', async () => {
    jest.mocked(contexto.sesiones.cambiarEstado).mockResolvedValue(null);
    await expect(
      aplicacion.rechazarSesion('9007199254740993', '2'),
    ).rejects.toMatchObject({ motivo: 'CONFLICTO' });
    expect(contexto.liberaciones.registrarPendiente).not.toHaveBeenCalled();
    expect(liberarPendiente).not.toHaveBeenCalled();
  });

  it('impide aceptar cuando existe un compromiso solapado', async () => {
    jest.mocked(contexto.sesiones.existeSolapamiento).mockResolvedValue(true);
    await expect(
      aplicacion.aceptarSesion('9007199254740993', '2'),
    ).rejects.toMatchObject({ motivo: 'CONFLICTO' });
    expect(contexto.sesiones.cambiarEstado).not.toHaveBeenCalled();
  });

  it('respeta la comprobación de inicio obtenida del repositorio transaccional', async () => {
    sesion.estado_sesion = 'CONFIRMADA';
    jest.mocked(contexto.sesiones.haComenzado).mockResolvedValue(true);
    await expect(
      aplicacion.cancelarSesion('9007199254740993', '3'),
    ).rejects.toMatchObject({ motivo: 'CONFLICTO' });
    expect(contexto.sesiones.cambiarEstado).not.toHaveBeenCalled();
  });

  it('devuelve un error propio para una sesión inexistente', async () => {
    jest.mocked(contexto.sesiones.buscarPorId).mockResolvedValue(null);
    await expect(
      aplicacion.rechazarSesion('9007199254740993', '2'),
    ).rejects.toMatchObject({ motivo: 'NO_ENCONTRADA' });
  });
});
