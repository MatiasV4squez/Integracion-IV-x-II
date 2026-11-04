import { exigirBloqueDisponible, seSolapan, validarHorario, type BloqueHorario } from './bloque-horario.js';
import { horarioEnSantiago } from './horario-santiago.js';

const horario = { dia: '2026-10-01', horaInicio: '09:00', horaFin: '10:00' };

describe('Reglas de bloques de disponibilidad', () => {
  it.each(['2026-13-01', '2026-02-30', '2026-02-29', '01-10-2026', '2026-1-01', ''])('rechaza el día inválido %s', (dia) => {
    expect(() => validarHorario({ ...horario, dia })).toThrow();
  });
  it('acepta el 29 de febrero en un año bisiesto', () => {
    expect(() => validarHorario({ ...horario, dia: '2028-02-29' })).not.toThrow();
  });
  it.each(['9:00', '24:00', '10:60', '10.30', '', '10:30:00'])('rechaza el formato de hora %s', (hora) => {
    expect(() => validarHorario({ ...horario, horaInicio: hora })).toThrow('horaInicio debe usar el formato HH:mm');
    expect(() => validarHorario({ ...horario, horaFin: hora })).toThrow('horaFin debe usar el formato HH:mm');
  });
  it.each(['08:00', '09:00'])('rechaza una hora final anterior o igual: %s', (horaFin) => {
    expect(() => validarHorario({ ...horario, horaFin })).toThrow('La hora de inicio debe ser menor que la hora de fin');
  });
  it('admite los límites del día', () => {
    expect(() => validarHorario({ ...horario, horaInicio: '00:00', horaFin: '23:59' })).not.toThrow();
  });
  it.each([
    ['08:30', '09:30', true],
    ['09:30', '10:30', true],
    ['08:00', '11:00', true],
    ['09:15', '09:45', true],
    ['08:00', '09:00', false],
    ['10:00', '11:00', false],
  ])('detecta solapamiento de %s a %s: %s', (horaInicio, horaFin, esperado) => {
    expect(seSolapan(horario, { ...horario, horaInicio, horaFin })).toBe(esperado);
  });
  it('días distintos no se solapan', () => {
    expect(seSolapan(horario, { ...horario, dia: '2026-10-02' })).toBe(false);
  });
  it.each(['RESERVADO', 'INACTIVO'])('impide modificar un bloque %s', (estadoBloque) => {
    expect(() => exigirBloqueDisponible({ ...horario, idBloque: 1n, idTutor: 10n, estadoBloque })).toThrow('El bloque no está disponible');
  });
  it('identifica un bloque ausente con error de dominio', () => {
    try {
      exigirBloqueDisponible(null);
      throw new Error('Debió fallar');
    } catch (error) {
      expect(error).toMatchObject({ codigo: 'NO_ENCONTRADO' });
    }
  });
  it('permite modificar un bloque disponible', () => {
    const bloque: BloqueHorario = { ...horario, idBloque: 1n, idTutor: 10n, estadoBloque: 'DISPONIBLE' };
    expect(exigirBloqueDisponible(bloque)).toBe(bloque);
  });
});

describe('Horario en Santiago independiente del reloj del sistema', () => {
  it.each([
    ['2026-10-01T12:30:00Z', '2026-10-01', '09:30'],
    ['2026-06-01T12:30:00Z', '2026-06-01', '08:30'],
    ['2026-10-01T01:30:00Z', '2026-09-30', '22:30'],
  ])('convierte %s al día %s y hora %s', (instante, dia, hora) => {
    expect(horarioEnSantiago(new Date(instante))).toEqual({ dia, hora });
  });
});
