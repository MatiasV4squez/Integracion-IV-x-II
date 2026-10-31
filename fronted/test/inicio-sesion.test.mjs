import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite, api, ErrorInicioSesion, validarInicioSesion, leerDestinoSolicitado, configuracion, Page, AppRoutes, Encabezado
const fetchOriginal = globalThis.fetch
const signal = () => new AbortController().signal
const credenciales = { correo: ' Camila@Alu.Uct.Cl ', contrasena: 'clave-segura-1' }
const respuestaLogin = {
  usuario: {
    id_usuario: '7', nombre: 'Camila González', correo_institucional: 'camila@alu.uct.cl',
    estado_cuenta: 'ACTIVO', correo_verificado: true, roles: ['Estudiante'],
  },
  access_token: 'cabecera.datos.firma',
  token_type: 'Bearer',
  expires_in: 1800,
  mensaje: 'Autenticación exitosa.',
}

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ inicioSesionHttp: api } = await vite.ssrLoadModule('/src/features/inicio-sesion/services/inicio-sesion-http.ts'))
  ;({ ErrorInicioSesion } = await vite.ssrLoadModule('/src/features/inicio-sesion/aplicacion/inicio-sesion.puerto.ts'))
  ;({ validarInicioSesion } = await vite.ssrLoadModule('/src/features/inicio-sesion/utils/validar-inicio-sesion.ts'))
  ;({ leerDestinoSolicitado } = await vite.ssrLoadModule('/src/shared/auth/acceso-rutas.ts'))
  ;({ default: Page } = await vite.ssrLoadModule('/src/features/inicio-sesion/pages/InicioSesionPage.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
  ;({ Encabezado } = await vite.ssrLoadModule('/src/shared/layout/Encabezado.tsx'))
  configuracion = await vite.ssrLoadModule('/src/shared/layout/configuracion-navegacion.ts')
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('valida correo y contraseña antes de cualquier petición', async () => {
  assert.deepEqual(validarInicioSesion({ correo: 'camila@alu.uct.cl', contrasena: 'x' }), {})
  const vacio = validarInicioSesion({ correo: 'sin-arroba', contrasena: '' })
  assert.ok(vacio.correo && vacio.contrasena)
  assert.ok(validarInicioSesion({ correo: 'camila@alu.uct.cl', contrasena: 'x'.repeat(129) }).contrasena)
  globalThis.fetch = () => { assert.fail('No debe enviar datos inválidos') }
  await assert.rejects(api.iniciarSesion({ correo: 'camila@@alu.uct.cl', contrasena: 'clave' }, signal()), /correo/i)
  await assert.rejects(api.iniciarSesion({ correo: 'camila@alu.uct.cl', contrasena: '' }, signal()), /contraseña/i)
})

test('inicia sesión por el Gateway con el contrato público de Auth y devuelve solo los datos necesarios', async () => {
  const llamadas = []
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return Response.json(respuestaLogin, { status: 200 })
  }
  const resultado = await api.iniciarSesion(credenciales, signal())
  assert.equal(llamadas.length, 1)
  const { url, opciones } = llamadas[0]
  assert.equal(url, vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/usuarios-auth/auth/login')
  assert.equal(opciones.method, 'POST')
  assert.equal(opciones.headers['Content-Type'], 'application/json')
  assert.equal(opciones.headers.Authorization, undefined)
  assert.equal(opciones.credentials, undefined)
  assert.ok(opciones.signal instanceof AbortSignal)
  assert.deepEqual(JSON.parse(opciones.body), { correo_institucional: 'camila@alu.uct.cl', password: 'clave-segura-1' })
  assert.deepEqual(resultado, { access_token: 'cabecera.datos.firma', usuario: { id_usuario: '7', nombre: 'Camila González' } })
})

test('diferencia datos rechazados, credenciales, cuentas no disponibles y fallos', async () => {
  const casos = [
    [400, { message: ['password should not be empty'] }, 'invalido'],
    [401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos.' }, 'credenciales'],
    [403, { code: 'AUTH_ACCOUNT_SUSPENDED' }, 'suspendida'],
    [403, { code: 'AUTH_ACCOUNT_INACTIVE' }, 'inactiva'],
    [403, 'sin json', 'inactiva'],
    [429, {}, 'error'],
    [502, 'detalle interno', 'error'],
  ]
  for (const [status, cuerpo, estado] of casos) {
    let llamadas = 0
    globalThis.fetch = async () => {
      llamadas++
      return typeof cuerpo === 'string' ? new Response(cuerpo, { status }) : Response.json(cuerpo, { status })
    }
    await assert.rejects(api.iniciarSesion(credenciales, signal()), (error) => {
      assert.ok(error instanceof ErrorInicioSesion)
      assert.equal(error.estado, estado, String(status))
      assert.doesNotMatch(error.message, /detalle interno/)
      return true
    })
    assert.equal(llamadas, 1, 'No reintenta automáticamente el login')
  }
})

test('una respuesta inesperada o malformada nunca se interpreta como sesión iniciada', async () => {
  const respuestas = [
    () => Response.json(respuestaLogin, { status: 201 }),
    () => new Response('<html>', { status: 200 }),
    () => Response.json({ ...respuestaLogin, access_token: 42 }, { status: 200 }),
    () => Response.json({ ...respuestaLogin, usuario: null }, { status: 200 }),
    () => Response.json({ ...respuestaLogin, usuario: { nombre: 'Camila' } }, { status: 200 }),
  ]
  for (const responder of respuestas) {
    globalThis.fetch = async () => responder()
    await assert.rejects(api.iniciarSesion(credenciales, signal()), ErrorInicioSesion)
  }
})

test('cancela al salir y limita la espera sin reenviar la petición', async (t) => {
  const control = new AbortController()
  globalThis.fetch = (_url, opciones) => new Promise((_resolve, reject) => {
    opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true })
  })
  const peticion = api.iniciarSesion(credenciales, control.signal)
  control.abort()
  await assert.rejects(peticion, { name: 'AbortError' })
  globalThis.fetch = () => { assert.fail('No debe enviar una petición cancelada') }
  await assert.rejects(api.iniciarSesion(credenciales, control.signal), { name: 'AbortError' })
  t.mock.method(AbortSignal, 'timeout', (ms) => {
    assert.equal(ms, 15000)
    return AbortSignal.abort(new DOMException('Timeout', 'TimeoutError'))
  })
  globalThis.fetch = async (_url, opciones) => opciones.signal.throwIfAborted()
  await assert.rejects(api.iniciarSesion(credenciales, signal()), { name: 'TimeoutError' })
})

test('cierra sesión revocando el token en Auth', async () => {
  const llamadas = []
  globalThis.fetch = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return new Response(null, { status: 204 })
  }
  await api.cerrarSesion('token-actual', signal())
  assert.equal(llamadas[0].url, vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/usuarios-auth/auth/logout')
  assert.equal(llamadas[0].opciones.method, 'POST')
  assert.equal(llamadas[0].opciones.headers.Authorization, 'Bearer token-actual')
  globalThis.fetch = async () => new Response(null, { status: 401 })
  await api.cerrarSesion('token-vencido', signal())
  globalThis.fetch = async () => new Response(null, { status: 503 })
  await assert.rejects(api.cerrarSesion('token-actual', signal()), ErrorInicioSesion)
})

test('después del login solo redirige a rutas internas y usa el inicio de cada rol', () => {
  assert.equal(leerDestinoSolicitado({ desde: '/solicitudes/nueva?materia=1' }), '/solicitudes/nueva?materia=1')
  for (const estado of [null, 'texto', {}, { desde: 4 }, { desde: 'https://otro.sitio' }, { desde: '//otro.sitio' },
    { desde: '/\\otro.sitio' }, { desde: '/login' }, { desde: '/login?x=1' }]) {
    assert.equal(leerDestinoSolicitado(estado), undefined, JSON.stringify(estado))
  }
  assert.equal(leerDestinoSolicitado({ desde: '/loginx' }), '/loginx')
  assert.equal(configuracion.obtenerInicioPorRol(['ADMIN']), '/administracion/postulaciones')
  assert.equal(configuracion.obtenerInicioPorRol(['ESTUDIANTE', 'TUTOR']), '/solicitudes/recibidas')
  assert.equal(configuracion.obtenerInicioPorRol(['ESTUDIANTE']), '/inicio')
  assert.equal(configuracion.obtenerInicioPorRol([]), '/')
})

test('la ruta de login presenta el formulario sin resultados previos', async () => {
  const html = await renderizarRuta(createElement(MemoryRouter, { initialEntries: ['/login'] }, createElement(AppRoutes)))
  assert.match(html, /Bienvenido de vuelta/)
  assert.match(html, /name="correo"[^>]*autoComplete="username"|autoComplete="username"[^>]*name="correo"/i)
  assert.match(html, /name="contrasena"/)
  assert.match(html, /type="password"/)
  assert.doesNotMatch(html, /inicio-sesion-resultado|fake-jwt-token/)
})

test('muestra el estado del envío y los errores del inicio de sesión', () => {
  const pagina = (envio) => renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(Page, { envio, iniciarSesion: () => {} })))
  for (const [envio, esperado] of [
    ['credenciales', /Correo o contraseña incorrectos/],
    ['suspendida', /Tu cuenta está suspendida/],
    ['inactiva', /Tu cuenta aún no está activa/],
    ['invalido', /No pudimos validar tus datos/],
    ['error', /No pudimos iniciar sesión/],
  ]) {
    const html = pagina(envio)
    assert.match(html, esperado)
    assert.match(html, /role="alert"/)
    assert.match(html, /name="contrasena"/)
  }
  const enviando = pagina('enviando')
  assert.match(enviando, /Iniciando sesión…/)
  assert.match(enviando, /disabled/)
  assert.doesNotMatch(pagina('inactivo'), /role="alert"/)
})

test('la cabecera identifica al usuario por su nombre y permite cerrar sesión', () => {
  const sesion = { idUsuario: '7', nombre: 'Camila González', roles: ['ESTUDIANTE'] }
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Encabezado, {
    enlaces: configuracion.obtenerNavegacion(sesion.roles),
    usuario: configuracion.obtenerUsuarioEncabezado(sesion),
    alCerrarSesion: () => {},
  })))
  assert.match(html, /Camila González/)
  assert.match(html, /Cerrar sesión/)
  assert.doesNotMatch(html, /Usuario 7|href="\/login"/)
  const anonimo = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Encabezado, {
    enlaces: configuracion.obtenerNavegacion(), alCerrarSesion: () => {},
  })))
  assert.doesNotMatch(anonimo, /Cerrar sesión/)
  assert.match(anonimo, /href="\/login"/)
})
