import { calcularReputacion, validarCalificacion, validarIdentificador, ReputacionError } from './reputacion.js';

describe('Reglas de reputación BR07 y BR08', () => {
  it.each([
    { cantidad: 0, suma: 0, promedio: null, estado: 'ACTIVO' },
    { cantidad: 1, suma: 1, promedio: 1, estado: 'ACTIVO' },
    { cantidad: 2, suma: 2, promedio: 1, estado: 'ACTIVO' },
    { cantidad: 3, suma: 7, promedio: 7 / 3, estado: 'EN_REVISION' },
    { cantidad: 4, suma: 10, promedio: 2.5, estado: 'ACTIVO' },
    { cantidad: 3, suma: 8, promedio: 8 / 3, estado: 'ACTIVO' },
    { cantidad: 4, suma: 18, promedio: 4.5, estado: 'ACTIVO' },
  ])('calcula promedio y estado con $cantidad notas y suma $suma', ({ cantidad, suma, promedio, estado }) => {
    expect(calcularReputacion({ idTutor: 9007199254740993n, sumaCalificaciones: suma, cantidadCalificaciones: cantidad, estado: 'ACTIVO' })).toEqual({
      idTutor: '9007199254740993',
      cantidadCalificaciones: cantidad,
      promedio,
      estado,
    });
  });
  it('conserva la revisión sin una resolución administrativa', () => {
    expect(calcularReputacion({ idTutor: 10n, sumaCalificaciones: 20, cantidadCalificaciones: 5, estado: 'EN_REVISION' }).estado).toBe('EN_REVISION');
  });
  it.each([0, 6, -1, 1.5, NaN, Infinity])('rechaza nota inválida %s', (nota) => {
    expect(() => validarCalificacion(nota)).toThrow(ReputacionError);
  });
  it.each([1, 5])('acepta nota límite %s', (nota) => {
    expect(() => validarCalificacion(nota)).not.toThrow();
  });
  it.each([0n, -1n, 9223372036854775808n])('rechaza identificador inválido %s', (id) => {
    expect(() => validarIdentificador(id)).toThrow(ReputacionError);
  });
});
