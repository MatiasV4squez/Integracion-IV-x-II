import type { DisponibilidadService } from '../../disponibilidad/disponibilidad.service.js';
import { DisponibilidadTutoresAdapter } from './disponibilidad-tutores.adapter.js';

describe('DisponibilidadTutoresAdapter', () => {
  const servicio = { consultarDisponibilidadTutor: vi.fn() };
  const adaptador = new DisponibilidadTutoresAdapter(servicio as unknown as DisponibilidadService);
  beforeEach(() => vi.resetAllMocks());

  it('agrupa horarios por tutor, elimina detalles de persistencia y evita IDs repetidos', async () => {
    servicio.consultarDisponibilidadTutor.mockResolvedValueOnce([{ idBloque: '1', dia: '2026-10-10', horaInicio: '09:00', horaFin: '10:00', estadoBloque: 'DISPONIBLE' }]).mockResolvedValueOnce([]);

    const resultado = await adaptador.consultarPorTutores(['10', '15', '10']);
    expect(resultado).toEqual(
      new Map([
        ['10', [{ idBloque: '1', dia: '2026-10-10', horaInicio: '09:00', horaFin: '10:00' }]],
        ['15', []],
      ]),
    );
    expect(servicio.consultarDisponibilidadTutor).toHaveBeenCalledTimes(2);
    expect(servicio.consultarDisponibilidadTutor).toHaveBeenNthCalledWith(1, 10n);
    expect(servicio.consultarDisponibilidadTutor).toHaveBeenNthCalledWith(2, 15n);
  });

  it('no consulta el servicio para una lista vacia', async () => {
    await expect(adaptador.consultarPorTutores([])).resolves.toEqual(new Map());
    expect(servicio.consultarDisponibilidadTutor).not.toHaveBeenCalled();
  });

  it('conserva IDs BIGINT y propaga errores de disponibilidad', async () => {
    const error = new Error('Fallo de disponibilidad');
    servicio.consultarDisponibilidadTutor.mockRejectedValue(error);
    await expect(adaptador.consultarPorTutores(['9007199254740993'])).rejects.toBe(error);
    expect(servicio.consultarDisponibilidadTutor).toHaveBeenCalledWith(9007199254740993n);
  });
});
