import { BadRequestException } from '@nestjs/common';
import { validarPaginacion } from './validar-paginacion.js';

describe('validarPaginacion', () => {
  it('aplica valores predeterminados a parámetros ausentes', () => {
    expect(validarPaginacion(undefined, undefined)).toEqual({ page: 1, limit: 10 });
    expect(validarPaginacion('2', undefined)).toEqual({ page: 2, limit: 10 });
    expect(validarPaginacion(undefined, '20')).toEqual({ page: 1, limit: 20 });
  });
  it('convierte entradas válidas y permite el límite máximo', () => {
    expect(validarPaginacion('2', '100')).toEqual({ page: 2, limit: 100 });
  });
  it.each(['', ' ', '0', '-1', '1.5', '1e2', '0x10', 'Infinity', 'abc', '9007199254740992', ['2'], ['1', '2'], null, 2, true, {}])('rechaza entradas inválidas en ambos parámetros: %j', (valor) => {
    expect(() => validarPaginacion(valor, '10')).toThrow(BadRequestException);
    expect(() => validarPaginacion('1', valor)).toThrow(BadRequestException);
  });
  it('responde con un error HTTP 400', () => {
    try {
      validarPaginacion('abc', '10');
      expect.fail('Se esperaba un error de validación');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getStatus()).toBe(400);
    }
  });
  it('rechaza un límite superior a 100', () => {
    expect(() => validarPaginacion('1', '101')).toThrow(BadRequestException);
  });
  it('rechaza un desplazamiento inseguro aunque la página sea un entero seguro', () => {
    expect(() => validarPaginacion('9007199254740991', '10')).toThrow(BadRequestException);
  });
});
