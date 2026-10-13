import { interpretarIdentificador, validarTransicion } from './reglas-sesion';

describe('Reglas de sesión independientes de infraestructura', () => {
  it('conserva la precisión de identificadores mayores que el máximo seguro de Number', () => {
    expect(interpretarIdentificador('9007199254740993', 'id_sesion')).toBe(
      9007199254740993n,
    );
    expect(interpretarIdentificador('9223372036854775807', 'id_sesion')).toBe(
      9223372036854775807n,
    );
  });

  it.each(['0', '-1', '1.5', '01', '9223372036854775808'])(
    'rechaza el identificador inválido %s',
    (identificador) => {
      expect(() =>
        interpretarIdentificador(identificador, 'id_sesion'),
      ).toThrow();
    },
  );

  it('impide reabrir una sesión terminal o saltarse el cierre', () => {
    expect(() => validarTransicion('COMPLETADA', 'CONFIRMADA')).toThrow();
    expect(() => validarTransicion('CONFIRMADA', 'COMPLETADA')).toThrow();
    expect(() =>
      validarTransicion('CONFIRMADA', 'PENDIENTE_CIERRE'),
    ).not.toThrow();
  });
});
