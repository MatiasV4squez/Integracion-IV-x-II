import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, api, ErrorVerificacion, Container, Page, leerContextoVerificacion
const fetchOriginal = globalThis.fetch
const token = 'a'.repeat(64)
const signal = () => new AbortController().signal

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ verificacionCuentaHttp: api } = await vite.ssrLoadModule('/src/features/verificacion-cuenta/services/verificacion-cuenta-http.ts'))
  ;({ ErrorVerificacion } = await vite.ssrLoadModule('/src/features/verificacion-cuenta/aplicacion/verificacion-cuenta.puerto.ts'))
  ;({ default: Container } = await vite.ssrLoadModule('/src/features/verificacion-cuenta/containers/VerificacionCuentaContainer.tsx'))
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/verificacion-cuenta/pages/VerificacionCuentaPage.tsx'))
  ;({ leerContextoVerificacion } = await vite.ssrLoadModule('/src/features/verificacion-cuenta/models/estado-verificacion.ts'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('un correo inválido no genera peticiones aunque se llame directamente al adaptador', async () => {
  globalThis.fetch = () => { assert.fail('No debe enviar un correo inválido') }
  for (const correo of ['', '  ', 'sin-arroba', 'sergio@', 'sergio@@universidad.cl', 'a'.repeat(256) + '@ejemplo.cl']) {
    await assert.rejects(api.reenviar(correo, signal()), /correo/i)
  }
})

test('confirma y reenvía exclusivamente por el Gateway con los contratos públicos de Auth', async () => {
  const llamadas = []
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return Response.json({ mensaje: 'Operación recibida' }, { status: llamadas.length === 1 ? 200 : 202 })
  }
  await api.confirmar(token, signal())
  await api.reenviar(' Sergio@Alu.Uct.Cl ', signal())
  for (const [i, accion] of ['verificar-correo', 'reenviar-verificacion'].entries()) {
    const { url, opciones } = llamadas[i]
    assert.equal(url, vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/usuarios-auth/auth/' + accion)
    assert.equal(opciones.method, 'POST')
    assert.equal(opciones.headers['Content-Type'], 'application/json')
    assert.equal(opciones.headers.Authorization, undefined)
    assert.equal(opciones.credentials, undefined)
    assert.ok(opciones.signal instanceof AbortSignal)
  }
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { token })
  assert.deepEqual(JSON.parse(llamadas[1].opciones.body), { correo_institucional: 'sergio@alu.uct.cl' })
})

test('diferencia token inválido, usado y vencido sin presentar un 409 como cuenta verificada', async () => {
  for (const [status, estado] of [[400, 'invalida'], [409, 'utilizada'], [410, 'vencida'], [502, 'error'], [503, 'error'], [504, 'error']]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return new Response('detalle interno', { status }) }
    await assert.rejects(api.confirmar(token, signal()), (error) => {
      assert.ok(error instanceof ErrorVerificacion)
      assert.equal(error.estado, estado)
      assert.doesNotMatch(error.message, /detalle interno/)
      return true
    })
    assert.equal(llamadas, 1, 'No reintenta automáticamente una operación de cuenta')
  }
})

test('una respuesta inesperada o malformada nunca se interpreta como éxito', async () => {
  for (const respuesta of [new Response('<html>login</html>'), Response.json(null), Response.json({}),
    Response.json({ mensaje: '' }), Response.json({ mensaje: 1 }), Response.json({ mensaje: 'ok' }, { status: 202 })]) {
    globalThis.fetch = async () => respuesta
    await assert.rejects(api.confirmar(token, signal()))
  }
  globalThis.fetch = async () => Response.json({ mensaje: 'ok' }, { status: 200 })
  await assert.rejects(api.reenviar('sergio@alu.uct.cl', signal()), ErrorVerificacion)
})

test('no convierte los fallos de reenvío en estados del token ni envía otra solicitud tras un fallo de red', async () => {
  for (const status of [400, 409, 410, 503]) {
    globalThis.fetch = async () => new Response('', { status })
    await assert.rejects(api.reenviar('sergio@alu.uct.cl', signal()), (error) => error.estado === 'error')
  }
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; throw new TypeError('Failed to fetch') }
  await assert.rejects(api.confirmar(token, signal()))
  assert.equal(llamadas, 1)
})

test('cancela al salir y limita la espera sin reenviar la petición', async (t) => {
  const control = new AbortController()
  globalThis.fetch = (_url, opciones) => new Promise((_resolve, reject) => {
    opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true })
  })
  const peticion = api.confirmar(token, control.signal)
  control.abort()
  await assert.rejects(peticion, { name: 'AbortError' })
  globalThis.fetch = () => { assert.fail('No debe enviar una petición cancelada') }
  await assert.rejects(api.confirmar(token, control.signal), { name: 'AbortError' })
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    assert.equal(ms, 15000)
    return AbortSignal.abort(new DOMException('Timeout', 'TimeoutError'))
  })
  globalThis.fetch = async (_url, opciones) => opciones.signal.throwIfAborted()
  await assert.rejects(api.reenviar('sergio@alu.uct.cl', signal()), { name: 'TimeoutError' })
})

test('el token real prevalece sobre una vista de éxito y los enlaces vacíos o duplicados no se confirman', () => {
  const render = (ruta) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [ruta] }, createElement(Container, { api })))
  const html = render('/verificar-cuenta?token=' + token + '&vista=verificada')
  assert.match(html, /Confirmar correo/)
  assert.doesNotMatch(html, /¡Tu correo está verificado!|Vista de demostración/)
  assert.doesNotMatch(html, new RegExp(token))
  for (const consulta of ['token=', 'token=uno&token=dos']) {
    const invalida = render('/verificar-cuenta?' + consulta)
    assert.match(invalida, /Enlace no válido/)
    assert.doesNotMatch(invalida, /Confirmar correo/)
  }
})

test('el registro llega a espera con el correo precargado y sin solicitudes automáticas', () => {
  globalThis.fetch = () => { assert.fail('Entrar en espera no debe solicitar ni confirmar enlaces') }
  for (const [verificacion, titulo] of [
    ['ENLACE_GENERADO', /Cuenta creada\. Verifica tu correo/],
    ['PENDIENTE_ENVIO', /Tu cuenta fue creada, pero falta enviar el enlace/],
  ]) {
    const entrada = { pathname: '/verificar-cuenta', state: { correo: ' CAMILA@ALU.UCT.CL ', verificacion } }
    // Volver a montar simula recuperar el contexto de navegación tras recargar.
    for (let intento = 0; intento < 2; intento++) {
      const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [entrada] }, createElement(Container, { api })))
      assert.match(html, titulo)
      assert.match(html, /value="camila@alu.uct.cl"/)
      assert.match(html, /Solicitar nuevo enlace/)
      assert.doesNotMatch(html, /Confirmar correo|Ya puedes iniciar sesión/)
    }
  }
})

test('el acceso desde login precarga el correo y el token prevalece sobre los avisos del registro', () => {
  const render = (search, state) => renderToStaticMarkup(createElement(MemoryRouter, {
    initialEntries: [{ pathname: '/verificar-cuenta', search, state }],
  }, createElement(Container, { api })))
  const desdeLogin = render('', { correo: 'camila@alu.uct.cl' })
  assert.match(desdeLogin, /value="camila@alu.uct.cl"/)
  assert.doesNotMatch(desdeLogin, /Cuenta creada|Confirmar correo/)
  const conToken = render('?token=' + token, { correo: 'camila@alu.uct.cl', verificacion: 'PENDIENTE_ENVIO' })
  assert.match(conToken, /Confirmar correo/)
  assert.doesNotMatch(conToken, /falta enviar el enlace|Cuenta creada/)
})

test('un estado de navegación no puede acreditar una cuenta verificada ni introducir un correo inválido', () => {
  for (const estado of [null, 'texto', 42, {}, { correo: 7 }, { correo: '<script>' },
    { verificacion: 'verificada' }, { verificacion: 'ACTIVO', correo_verificado: true }]) {
    assert.deepEqual(leerContextoVerificacion(estado), { correo: '', estado: 'pendiente' })
  }
})

test('la confirmación no promete acceso a cuentas suspendidas y el reenvío conserva un mensaje neutro', () => {
  const render = (props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Page, props)))
  const verificada = render({ estado: 'verificada', reenviar() {} })
  assert.match(verificada, /¡Tu correo está verificado!/)
  assert.match(verificada, /Si tu cuenta está suspendida/)
  assert.match(verificada, /href="\/login"/)
  assert.doesNotMatch(verificada, /Solicitar nuevo enlace|Confirmar correo/)
  const reenvio = render({ estado: 'pendiente', reenviar() {}, reenvio: 'enviado' })
  assert.match(reenvio, /Si la cuenta existe y requiere verificación/)
})
