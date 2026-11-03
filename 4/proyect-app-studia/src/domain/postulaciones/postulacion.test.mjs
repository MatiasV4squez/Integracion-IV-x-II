import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { esNotaValida, validarCertificado } from './postulacion.ts';

describe('reglas de postulación a tutor', () => {
  const pdf = { uri: 'x', name: 'notas.pdf', size: 1000, mimeType: 'application/pdf' };

  it('acepta un PDF o PNG de hasta 5 MB', () => {
    assert.equal(validarCertificado(pdf), null);
    assert.equal(validarCertificado({ ...pdf, name: 'notas.png', mimeType: 'image/png' }), null);
  });

  it('rechaza falta de archivo, tipo incorrecto, vacío o demasiado grande', () => {
    assert.match(validarCertificado(null), /Adjunta/);
    assert.match(validarCertificado({ ...pdf, name: 'notas.docx' }), /PDF o PNG/);
    assert.match(validarCertificado({ ...pdf, size: 0 }), /vacío/);
    assert.match(validarCertificado({ ...pdf, size: 6_000_000 }), /5 MB/);
  });

  it('la nota acreditada va de 5,0 a 7,0 con un decimal', () => {
    assert.equal(esNotaValida(5), true);
    assert.equal(esNotaValida(6.3), true);
    assert.equal(esNotaValida(4.9), false);
    assert.equal(esNotaValida(7.1), false);
    assert.equal(esNotaValida(5.85), false);
  });
});
