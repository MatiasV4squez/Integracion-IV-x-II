import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, api, ErrorRegistro, validarRegistro, Container, Page
const fetchOriginal = globalThis.fetch
const signal = () => new AbortController().signal
const datosValidos = { nombre: ' Camila González ', correo: ' Camila@Alu.Uct.Cl ', contrasena: 'clave-segura-1' }

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ registroUsuarioHttp: api } = await vite.ssrLoadModule('/src/features/registro-usuario/services/registro-usuario-http.ts'))
  ;({ ErrorRegistro } = await vite.ssrLoadModule('/src/features/registro-usuario/aplicacion/registro-usuario.puerto.ts'))
  ;({ validarRegistro } = await vite.ssrLoadModule('/src/features/registro-usuario/utils/validar-registro.ts'))
  ;({ default: Container } = await vite.ssrLoadModule('/src/features/registro-usuario/containers/RegistroUsuarioContainer.tsx'))
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/registro-usuario/pages/RegistroUsuarioPage.tsx'))
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('valida nombre, correo, contraseña y confirmación antes de cualquier petición', () => {
  const completo = { nombre: 'Camila González', correo: 'camila@alu.uct.cl', contrasena: 'clave-segura-1', confirmacion: 'clave-segura-1' }
  assert.deepEqual(validarRegistro(completo), {})
  const vacio = validarRegistro({ nombre: '   ', correo: 'sin-arroba', contrasena: 'corta', confirmacion: 'otra-distinta' })
  assert.ok(vacio.nombre && vacio.correo && vacio.contrasena && vacio.confirmacion)
  assert.match(vacio.contrasena, /al menos 8/)
  assert.match(vacio.confirmacion, /no coinciden/)
  assert.ok(validarRegistro({ ...completo, nombre: 'a'.repeat(121) }).nombre)
  assert.ok(validarRegistro({ ...completo, contrasena: 'x'.repeat(129) }).contrasena)
  assert.deepEqual(validarRegistro({ ...completo, confirmacion: 'clave-segura-2' }).confirmacion, 'Las contraseñas no coinciden.')
})

test('datos inválidos no generan peticiones aunque se llame directamente al adaptador', async () => {
  globalThis.fetch = () => { assert.fail('No debe enviar datos inválidos') }
  await assert.rejects(api.registrar({ nombre: '  ', correo: 'camila@alu.uct.cl', contrasena: 'clave-segura-1' }, signal()), /nombre/i)
  await assert.rejects(api.registrar({ nombre: 'Camila', correo: 'camila@@alu.uct.cl', contrasena: 'clave-segura-1' }, signal()), /correo/i)
  await assert.rejects(api.registrar({ nombre: 'Camila', correo: 'camila@alu.uct.cl', contrasena: 'corta' }, signal()), /contraseña/i)
})

test('registra exclusivamente por el Gateway con el contrato público de Auth', async () => {
  const llamadas = []
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return Response.json({ mensaje: 'Cuenta creada' }, { status: 201 })
  }
  await api.registrar(datosValidos, signal())
  assert.equal(llamadas.length, 1)
  const { url, opciones } = llamadas[0]
  assert.equal(url, vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/usuarios-auth/auth/registro')
  assert.equal(opciones.method, 'POST')
  assert.equal(opciones.headers['Content-Type'], 'application/json')
  assert.equal(opciones.headers.Authorization, undefined)
  assert.equal(opciones.credentials, undefined)
  assert.ok(opciones.signal instanceof AbortSignal)
  assert.deepEqual(JSON.parse(opciones.body), {
    nombre: 'Camila González',
    correo_institucional: 'camila@alu.uct.cl',
    contrasena: 'clave-segura-1',
  })
})

test('diferencia datos rechazados, correo duplicado y fallos de comunicación', async () => {
  for (const [status, estado] of [[400, 'invalido'], [409, 'duplicado'], [401, 'error'], [502, 'error'], [503, 'error']]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return new Response('detalle interno', { status }) }
    await assert.rejects(api.registrar(datosValidos, signal()), (error) => {
      assert.ok(error instanceof ErrorRegistro)
      assert.equal(error.estado, estado)
      assert.doesNotMatch(error.message, /detalle interno/)
      return true
    })
    assert.equal(llamadas, 1, 'No reintenta automáticamente el registro')
  }
})

test('una respuesta distinta de 201 nunca se interpreta como éxito', async () => {
  for (const status of [200, 202, 302, 404]) {
    globalThis.fetch = async () => new Response('', { status })
    await assert.rejects(api.registrar(datosValidos, signal()), ErrorRegistro)
  }
})

test('cancela al salir y limita la espera sin reenviar la petición', async (t) => {
  const control = new AbortController()
  globalThis.fetch = (_url, opciones) => new Promise((_resolve, reject) => {
    opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true })
  })
  const peticion = api.registrar(datosValidos, control.signal)
  control.abort()
  await assert.rejects(peticion, { name: 'AbortError' })
  globalThis.fetch = () => { assert.fail('No debe enviar una petición cancelada') }
  await assert.rejects(api.registrar(datosValidos, control.signal), { name: 'AbortError' })
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    assert.equal(ms, 15000)
    return AbortSignal.abort(new DOMException('Timeout', 'TimeoutError'))
  })
  globalThis.fetch = async (_url, opciones) => opciones.signal.throwIfAborted()
  await assert.rejects(api.registrar(datosValidos, signal()), { name: 'TimeoutError' })
})

test('la ruta de registro presenta el formulario completo sin resultados previos', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/registro'] },
    createElement(Container, { api: { registrar: async () => {} } })))
  assert.match(html, /Crea tu cuenta/)
  for (const campo of ['nombre', 'correo', 'contrasena', 'confirmacion']) {
    assert.match(html, new RegExp(`name="${campo}"`))
  }
  assert.match(html, /Crear cuenta/)
  assert.doesNotMatch(html, /registro-resultado|Cuenta creada/)
})

test('muestra el resultado del registro y sus errores según el estado del envío', () => {
  const pagina = (envio) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(Page, { envio, registrar: () => {} })))
  const exito = pagina('exitoso')
  assert.match(exito, /¡Cuenta creada!/)
  assert.match(exito, /enlace de verificación/)
  assert.match(exito, /Ir a iniciar sesión/)
  assert.doesNotMatch(exito, /name="contrasena"/)
  for (const [envio, esperado] of [['invalido', /No pudimos crear tu cuenta/], ['duplicado', /El correo institucional ya está registrado/], ['error', /No pudimos completar el registro/]]) {
    const html = pagina(envio)
    assert.match(html, esperado)
    assert.match(html, /role="alert"/)
    assert.match(html, /name="contrasena"/)
  }
  const enviando = pagina('enviando')
  assert.match(enviando, /Creando cuenta…/)
  assert.match(enviando, /disabled/)
})
