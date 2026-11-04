import { validarCertificado as validar } from './certificado.js';

function validarCertificado(datos: ReturnType<typeof archivo>) {
  return validar(datos).tipo;
}

function archivo(nombre: string, tipo: string, contenido: Buffer) {
  return {
    nombre,
    tipoDeclarado: tipo,
    tamano: contenido.length,
    contenido,
  };
}

describe('Certificados y revisiones', () => {
  it('acepta PDF y PNG con firmas válidas', () => {
    expect(
      validarCertificado(
        archivo('notas.pdf', 'application/pdf', Buffer.from('%PDF-1.7\n')),
      ),
    ).toBe('application/pdf');
    expect(
      validarCertificado(
        archivo(
          'notas.png',
          'image/png',
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
        ),
      ),
    ).toBe('image/png');
  });

  it('rechaza archivos falsos, vacíos y superiores a 5 MB', () => {
    expect(() =>
      validarCertificado(
        archivo('notas.pdf', 'application/pdf', Buffer.from('ejecutable')),
      ),
    ).toThrow();
    expect(() =>
      validarCertificado(
        archivo('notas.jpg', 'image/jpeg', Buffer.from('foto')),
      ),
    ).toThrow();
    expect(() =>
      validarCertificado(
        archivo('notas.pdf', 'application/pdf', Buffer.alloc(0)),
      ),
    ).toThrow();
    expect(() =>
      validarCertificado(
        archivo('notas.pdf', 'application/pdf', Buffer.alloc(5_000_001)),
      ),
    ).toThrow();
  });

});
