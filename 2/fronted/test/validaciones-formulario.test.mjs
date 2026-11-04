import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let vite, validarObligatorio, validarLongitudMaxima, normalizarCorreo, validarCorreo
const correoDeLongitud = (longitud) => 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(longitud - 193)

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ validarObligatorio, validarLongitudMaxima, normalizarCorreo, validarCorreo } =
    await vite.ssrLoadModule('/src/shared/utils/validaciones-formulario.ts'))
})

after(async () => { await vite?.close() })

test('los campos obligatorios rechazan espacios y permiten personalizar la etiqueta', () => {
  for (const valor of ['', '  ', '\t\n']) assert.ok(validarObligatorio(valor))
  assert.equal(validarObligatorio('  Sergio  '), undefined)
  assert.equal(validarObligatorio('', 'El nombre'), 'El nombre es obligatorio.')
})

test('el máximo permite el límite exacto y rechaza el carácter siguiente', () => {
  assert.equal(validarLongitudMaxima('abc', 3), undefined)
  assert.equal(validarLongitudMaxima('abcd', 3, 'El nombre'), 'El nombre debe tener como máximo 3 caracteres.')
  assert.equal(validarLongitudMaxima('', 3), undefined, 'La obligatoriedad se comprueba por separado')
})

test('normaliza el correo como Auth y admite distintos dominios sin inventar restricciones institucionales', () => {
  const valor = '  Sergio.Apellido+Tutor@Alu.Uct.Cl  '
  assert.equal(normalizarCorreo(valor), 'sergio.apellido+tutor@alu.uct.cl')
  for (const correo of [valor, 'estudiante@universidad.cl', 'josé@ejemplo.cl']) assert.equal(validarCorreo(correo), undefined)
})

test('rechaza correos vacíos o con errores básicos de formato', () => {
  for (const correo of ['', '  ', 'sin-arroba', '@universidad.cl', 'sergio@', 'ser gio@ejemplo.cl',
    'sergio@@ejemplo.cl', 'sergio@ejemplo..cl', 'sergio@localhost']) {
    assert.ok(validarCorreo(correo), correo)
  }
})

test('aplica el máximo efectivo de 254 caracteres después de normalizar', () => {
  assert.equal(validarCorreo(correoDeLongitud(254)), undefined)
  assert.equal(validarCorreo('  ' + correoDeLongitud(254).toUpperCase() + '  '), undefined)
  for (const longitud of [255, 256]) assert.match(validarCorreo(correoDeLongitud(longitud)), /254/)
})
