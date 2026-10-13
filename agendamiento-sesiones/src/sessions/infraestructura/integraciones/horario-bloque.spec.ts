import { convertirHorarioBloque } from './horario-bloque';

describe('Horario canónico de bloques en America/Santiago', () => {
  it.each([
    ['2027-01-15', '2027-01-15T13:00:00.000Z'],
    ['2027-07-15', '2027-07-15T14:00:00.000Z'],
  ])(
    'convierte el horario local del día %s según su offset',
    (dia, inicioEsperado) => {
      const horario = convertirHorarioBloque(dia, '10:00', '11:00');
      expect(horario.inicio.toISOString()).toBe(inicioEsperado);
      expect(horario.fin.getTime() - horario.inicio.getTime()).toBe(
        60 * 60 * 1000,
      );
    },
  );

  it.each([
    ['2027-02-30', '10:00', '11:00'],
    ['2027-01-15', '24:00', '25:00'],
    ['2027-01-15', '11:00', '10:00'],
    ['2026-09-06', '00:30', '02:00'],
    ['2026-04-04', '23:30', '23:45'],
  ])(
    'rechaza horarios inválidos, inexistentes o ambiguos: %s %s',
    (dia, inicio, fin) => {
      expect(() => convertirHorarioBloque(dia, inicio, fin)).toThrow();
    },
  );
});
