import assert from 'node:assert/strict'
import { before, after, afterEach, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'
import { renderizarRuta } from './helpers/renderizar-ruta.mjs'

let vite
let interpretarSesion
let consultarSolicitudesRecibidas
let ErrorConsultaSesiones
let seleccionarSolicitudesRecibidas
let obtenerPlazoSolicitud
let formatearHorarioSesion
let SolicitudesRecibidasPage
let AppRoutes
const originalFetch = globalThis.fetch
const ahora = Date.parse('2026-10-21T12:00:00Z')
const tutorId = '9007199254740993'
const crearToken = (cambios = {}) => [
  { alg: 'HS256', typ: 'JWT' },
  { sub: tutorId, exp: Math.floor(Date.now() / 1000) + 3600, roles: ['TUTOR'], iss: 'stp-usuarios-auth', aud: 'stp-clients', ...cambios },
].map((parte) => Buffer.from(JSON.stringify(parte)).toString('base64url')).join('.') + '.firma-de-prueba'
const token = crearToken()
const sesion = { token, idUsuario: tutorId, roles: ['TUTOR'], expiraEn: Date.now() + 3600000 }
const solicitud = {
  id_sesion: '71', id_tutor: tutorId, id_tutee: '15', id_materia: '3', id_bloque: '26', estado_sesion: 'PENDIENTE',
  inicio: '2026-10-23T18:00:00.000Z', fin: '2026-10-23T19:00:00.000Z',
  fecha_creacion: '2026-10-21T10:00:00.000Z', fecha_actualizacion: '2026-10-21T10:00:00.000Z', resultado_provisional: false,
}

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  ;({ interpretarSesion } = await vite.ssrLoadModule('/src/shared/auth/sesion-usuario.ts'))
  ;({ consultarSolicitudesRecibidas, ErrorConsultaSesiones } = await vite.ssrLoadModule('/src/features/sesiones/services/sesiones-api.ts'))
  ;({ seleccionarSolicitudesRecibidas, obtenerPlazoSolicitud, formatearHorarioSesion } = await vite.ssrLoadModule('/src/features/sesiones/utils/solicitudes-recibidas.ts'))
  ;({ default: SolicitudesRecibidasPage } = await vite.ssrLoadModule('/src/features/sesiones/pages/SolicitudesRecibidasPage.tsx'))
  ;({ AppRoutes } = await vite.ssrLoadModule('/src/app/AppRoutes.tsx'))
})
afterEach(() => { globalThis.fetch = originalFetch })
after(async () => { await vite?.close() })

test('interpreta la identidad del JWT sin confiar en userRole ni convertir IDs a Number', () => {
  const usuario = interpretarSesion(token)
  assert.equal(usuario.idUsuario, tutorId)
  assert.deepEqual(usuario.roles, ['TUTOR'])
  assert.deepEqual(interpretarSesion(crearToken({ roles: [' tutor ', 'ESTUDIANTE'] })).roles, ['TUTOR', 'ESTUDIANTE'])
  for (const valor of [null, '', 'fake-jwt-token', 'a.b.c', crearToken({ sub: 15 }), crearToken({ sub: '0' }),
    crearToken({ sub: '9223372036854775808' }), crearToken({ roles: null }), crearToken({ exp: 1 }),
    crearToken({ iss: 'otro' }), crearToken({ aud: 'otro' })]) assert.equal(interpretarSesion(valor), null)
})

test('selecciona solo pendientes recibidas por el tutor, conserva vencidas hasta que el servidor expire y ordena por plazo', () => {
  const anterior = { ...solicitud, id_sesion: '70', fecha_creacion: '2026-10-20T10:00:00.000Z' }
  const sesiones = [solicitud, { ...solicitud, id_sesion: '72', estado_sesion: 'CONFIRMADA' },
    { ...solicitud, id_sesion: '73', id_tutor: '2', id_tutee: tutorId }, anterior]
  assert.deepEqual(seleccionarSolicitudesRecibidas(sesiones, tutorId).map((item) => item.id_sesion), ['70', '71'])
  assert.equal(sesiones[0].id_sesion, '71')
  assert.equal(obtenerPlazoSolicitud(anterior.fecha_creacion, ahora), 'Plazo cumplido · pendiente de actualización')
  assert.equal(obtenerPlazoSolicitud(solicitud.fecha_creacion, ahora), 'Expira en 22 h 00 min')
})

test('formatea instantes UTC usando America/Santiago y mantiene visible el año', () => {
  const horario = formatearHorarioSesion(solicitud.inicio, solicitud.fin)
  assert.match(horario, /2026/)
  assert.match(horario, /15:00–16:00/)
})

test('consulta el historial por Gateway con Bearer, sin inventar una ruta de solicitudes ni enviar otro usuario', async () => {
  globalThis.fetch = async (url, config) => {
    assert.equal(String(url), vite.config.env.VITE_API_BASE_URL.replace(/\/+$/, '') + '/agendamiento-sesiones/sessions/history')
    assert.equal(config.headers.Authorization, 'Bearer ' + token)
    assert.equal(config.headers.Accept, 'application/json')
    assert.equal(config.method, undefined)
    return Response.json([solicitud, { ...solicitud, id_sesion: '72', id_tutor: '2', id_tutee: tutorId },
      { ...solicitud, id_sesion: '73', estado_sesion: 'EXPIRADA' }])
  }
  assert.deepEqual(await consultarSolicitudesRecibidas(sesion), [solicitud])
})

test('el historial vacío es un resultado válido y las consultas no se cachean', async () => {
  let llamadas = 0
  globalThis.fetch = async () => { llamadas++; return Response.json([]) }
  assert.deepEqual(await consultarSolicitudesRecibidas(sesion), [])
  await consultarSolicitudesRecibidas(sesion)
  assert.equal(llamadas, 2)
})

test('bloquea sesiones ausentes, vencidas o sin rol antes de consultar', async () => {
  globalThis.fetch = () => { assert.fail('No debe consultar') }
  for (const entrada of [{ ...sesion, token: '' }, { ...sesion, expiraEn: 1 }, { ...sesion, idUsuario: 'abc' }]) {
    await assert.rejects(consultarSolicitudesRecibidas(entrada), (error) => error.tipo === 'sesion')
  }
  await assert.rejects(consultarSolicitudesRecibidas({ ...sesion, roles: ['ESTUDIANTE'] }), (error) => error.tipo === 'permiso')
})

test('maneja 401, 403 y fallos de los servicios sin convertirlos en una bandeja vacía', async () => {
  for (const [status, tipo] of [[401, 'sesion'], [403, 'permiso'], [500, 'consulta'], [502, 'consulta'], [503, 'consulta'], [504, 'consulta']]) {
    globalThis.fetch = async () => new Response('detalle-privado', { status })
    await assert.rejects(consultarSolicitudesRecibidas(sesion), (error) => {
      assert.ok(error instanceof ErrorConsultaSesiones)
      assert.equal(error.tipo, tipo)
      assert.doesNotMatch(error.message, /detalle-privado/)
      return true
    })
  }
})

test('rechaza respuestas inválidas, duplicados y fechas imposibles', async () => {
  for (const datos of [{ items: [] }, null, [solicitud, solicitud], [{ ...solicitud, id_sesion: 71 }],
    [{ ...solicitud, inicio: '2026-02-30T18:00:00.000Z' }], [{ ...solicitud, fin: solicitud.inicio }],
    [{ ...solicitud, estado_sesion: 'POR_CALIFICAR' }]]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(consultarSolicitudesRecibidas(sesion), /leer las solicitudes/)
  }
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(consultarSolicitudesRecibidas(sesion), /leer las solicitudes/)
})

test('cancela consultas y distingue timeout de un fallo de red', async (t) => {
  const controlador = new AbortController()
  globalThis.fetch = (_url, config) => new Promise((_resolve, reject) => {
    config.signal.addEventListener('abort', () => reject(config.signal.reason), { once: true })
  })
  const promesa = consultarSolicitudesRecibidas(sesion, controlador.signal)
  controlador.abort()
  await assert.rejects(promesa, { name: 'AbortError' })
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(consultarSolicitudesRecibidas(sesion), /conectar para consultar/)
  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, config) => { config.signal.throwIfAborted() }
  await assert.rejects(consultarSolicitudesRecibidas(sesion), /tardó demasiado/)
})

const renderPagina = (consulta, opciones = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(SolicitudesRecibidasPage, { consulta, ahora, onRecargar() {}, ...opciones })))

test('presenta carga, error con reintento, acceso y ausencia de solicitudes sin mezclar estados', () => {
  const carga = renderPagina({ estado: 'cargando' })
  assert.match(carga, /Cargando solicitudes/)
  assert.doesNotMatch(carga, /0 solicitudes por responder/)
  const error = renderPagina({ estado: 'error', tipo: 'consulta', mensaje: 'Servicio temporalmente no disponible' })
  assert.match(error, /role="alert"/)
  assert.match(error, />Reintentar<\/button>/)
  assert.doesNotMatch(error, /No tienes solicitudes pendientes/)
  assert.match(renderPagina({ estado: 'listo', solicitudes: [] }), /No tienes solicitudes pendientes/)
  assert.match(renderPagina({ estado: 'cargando' }, { acceso: 'sesion' }), /href="\/login"/)
  assert.match(renderPagina({ estado: 'cargando' }, { acceso: 'permiso' }), /Esta sección es para tutores/)
})

test('muestra datos reales disponibles, plazos y acciones futuras desacopladas', () => {
  const html = renderPagina({ estado: 'listo', solicitudes: [solicitud] }, {
    materias: [{ idMateria: '3', codigo: 'MAT1188', nombre: 'Cálculo intermedio' }],
  })
  assert.match(html, /1 solicitud por responder/)
  assert.match(html, /Estudiante #15/)
  assert.match(html, /Cálculo intermedio · MAT1188/)
  assert.match(html, /Expira en 22 h 00 min/)
  assert.match(html, />Actualizar<\/button>/)
  assert.doesNotMatch(html, /<header|<footer|Aceptar solicitud|Rechazar solicitud|Diego Muñoz|Martina Rojas/)
  assert.match(renderPagina({ estado: 'listo', solicitudes: [solicitud] }), /Materia #3/)
})

test('limita a diez filas la página y registra la ruta privada de solicitudes recibidas', async () => {
  const solicitudes = Array.from({ length: 11 }, (_, index) => ({ ...solicitud, id_sesion: String(index + 1) }))
  const html = renderPagina({ estado: 'listo', solicitudes })
  assert.equal((html.match(/<tr>/g) ?? []).length, 11)
  assert.match(html, /11 solicitudes por responder/)
  assert.match(html, /Página 1 de 2/)
  const ruta = (path) => renderizarRuta(createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppRoutes)))
  assert.match(await ruta('/solicitudes/recibidas'), /Inicia sesión para ver tus solicitudes/)
})
