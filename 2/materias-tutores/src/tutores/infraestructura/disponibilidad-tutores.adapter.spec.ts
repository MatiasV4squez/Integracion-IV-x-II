import type { ConsultarDisponibilidadTutorUseCase } from '../../disponibilidad/aplicacion/consultar-disponibilidad-tutor.use-case.js';
import { DisponibilidadTutoresAdapter } from './disponibilidad-tutores.adapter.js';

describe('DisponibilidadTutoresAdapter', () => {
  const servicio = { ejecutar: vi.fn() };
  const adaptador = new DisponibilidadTutoresAdapter(servicio as unknown as ConsultarDisponibilidadTutorUseCase);
  beforeEach(() => vi.resetAllMocks());

  it('agrupa horarios por tutor, elimina detalles de persistencia y evita IDs repetidos', async () => {
    servicio.ejecutar.mockResolvedValueOnce([{ idBloque: 1n, idTutor: 10n, dia: '2026-10-10', horaInicio: '09:00', horaFin: '10:00', estadoBloque: 'DISPONIBLE' }]).mockResolvedValueOnce([]);

    const resultado = await adaptador.consultarPorTutores(['10', '15', '10']);
    expect(resultado).toEqual(
      new Map([
        ['10', [{ idBloque: '1', dia: '2026-10-10', horaInicio: '09:00', horaFin: '10:00' }]],
        ['15', []],
      ]),
    );
    expect(servicio.ejecutar).toHaveBeenCalledTimes(2);
    expect(servicio.ejecutar).toHaveBeenNthCalledWith(1, 10n);
    expect(servicio.ejecutar).toHaveBeenNthCalledWith(2, 15n);
  });

  it('no consulta el servicio para una lista vacia', async () => {
    await expect(adaptador.consultarPorTutores([])).resolves.toEqual(new Map());
    expect(servicio.ejecutar).not.toHaveBeenCalled();
  });

  it('conserva IDs BIGINT y propaga errores de disponibilidad', async () => {
    const error = new Error('Fallo de disponibilidad');
    servicio.ejecutar.mockRejectedValue(error);
    await expect(adaptador.consultarPorTutores(['9007199254740993'])).rejects.toBe(error);
    expect(servicio.ejecutar).toHaveBeenCalledWith(9007199254740993n);
  });
});
