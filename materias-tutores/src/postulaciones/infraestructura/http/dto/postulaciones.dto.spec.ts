import { validarRevision } from './postulaciones.dto.js';

describe('Revision HTTP de postulaciones', () => {
  it('valida nota y motivo sin aceptar campos extra', () => {
    expect(validarRevision({ notaAcreditada: 5.0 }, 'aprobar')).toEqual({
      notaAcreditada: 5,
    });
    expect(() =>
      validarRevision({ notaAcreditada: 5.05 }, 'aprobar'),
    ).toThrow();
    expect(() =>
      validarRevision({ notaAcreditada: 5, idUsuario: '2' }, 'aprobar'),
    ).toThrow();
    expect(
      validarRevision(
        { motivoRechazo: '  Certificado ilegible  ' },
        'rechazar',
      ),
    ).toEqual({ motivoRechazo: 'Certificado ilegible' });
  });
});
