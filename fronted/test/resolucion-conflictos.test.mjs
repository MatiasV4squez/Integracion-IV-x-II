import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { createServer } from 'vite'

let vite, api, detalleApi, filtros, Detalle
const fetchOriginal = globalThis.fetch
const administrador = {
  token: 'jwt-administrador-prueba', idUsuario: '9007199254740993',
  roles: ['ADMINISTRADOR'], expiraEn: Date.now() + 3600000,
}
const sesionBase = {
  id_sesion: '9007199254740997', id_tutee: '2', id_tutor: '3', id_materia: '5', id_bloque: '4',
  estado_sesion: 'EN_CONFLICTO', inicio: '2026-11-10T18:00:00.000Z', fin: '2026-11-10T19:00:00.000Z',
  fecha_creacion: '2026-11-09T10:00:00.000Z', fecha_actualizacion: '2026-11-10T20:00:00.000Z',
  resultado_provisional: false,
}
const detalle = {
  ...sesionBase,
  calificaciones: [],
  datos_encuentro: { modalidad: 'EN_LINEA', lugar: null, enlace: 'https://meet.example.test/tutoria' },
  declaraciones: [
    { id_declaracion: '6', id_sesion: sesionBase.id_sesion, id_usuario: '3', resultado_declarado: 'COMPLETADA', id_usuario_inasistente: null, fecha_declaracion: '2026-11-10T19:05:00.000Z' },
    { id_declaracion: '7', id_sesion: sesionBase.id_sesion, id_usuario: '2', resultado_declarado: 'NO_REALIZADA', id_usuario_inasistente: null, fecha_declaracion: '2026-11-10T19:10:00.000Z' },
  ],
  acciones_disponibles: { aceptar: false, rechazar: false, cancelar: false, declarar_cierre: false, calificar: false, resolver_conflicto: true },
}
const baseDetalle = {
  idUsuario: administrador.idUsuario, consulta: { estado: 'listo', datos: detalle }, materia: 'Programación III',
  nombres: new Map([['2', 'Camila'], ['3', 'Diego']]), volver: '/administracion/reportes', onRecargar() {},
}
const resolucion = { resolver() {}, resolviendo: false, resuelto: false, error: null }
const renderPagina = (extras = {}) => renderToStaticMarkup(createElement(MemoryRouter, null,
  createElement(Detalle, { ...baseDetalle, ...extras })))
const señal = () => new AbortController().signal
const entrada = { nuevo_estado: 'COMPLETADA', motivo_resolucion: 'Motivo de la resolución' }

before(async () => {
  vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'error' })
  api = await vite.ssrLoadModule('/src/features/sesiones/services/resolver-conflicto-api.ts')
  detalleApi = await vite.ssrLoadModule('/src/features/sesiones/pages/DetalleTutoriaPage.tsx')
  filtros = await vite.ssrLoadModule('/src/features/sesiones/utils/filtros-tutorias.ts')
  Detalle = detalleApi.default
})
afterEach(() => { globalThis.fetch = fetchOriginal })
after(async () => { await vite?.close() })

test('resuelve el conflicto por Gateway con el cuerpo exacto y confirma el estado final', async () => {
  for (const nuevoEstado of ['COMPLETADA', 'NO_REALIZADA', 'INASISTENCIA']) {
    let llamada
    globalThis.fetch = async (url, opciones) => {
      llamada = { url: String(url), opciones }
      return Response.json({ ...sesionBase, estado_sesion: nuevoEstado, campoInterno: 'privado' })
    }
    await api.resolverConflicto(sesionBase.id_sesion, administrador,
      { nuevo_estado: nuevoEstado, motivo_resolucion: '  Declaraciones contradictorias  ' }, señal())
    assert.equal(new URL(llamada.url).pathname, '/api/agendamiento-sesiones/sessions/' + sesionBase.id_sesion + '/resolve-conflict')
    assert.equal(llamada.opciones.method, 'PATCH')
    assert.equal(llamada.opciones.headers.Authorization, 'Bearer ' + administrador.token)
    assert.equal(llamada.opciones.headers.Accept, 'application/json')
    assert.equal(llamada.opciones.headers['Content-Type'], 'application/json')
    assert.equal(llamada.opciones.cache, 'no-store')
    assert.ok(llamada.opciones.signal instanceof AbortSignal)
    assert.deepEqual(JSON.parse(llamada.opciones.body), { nuevo_estado: nuevoEstado, motivo_resolucion: 'Declaraciones contradictorias' })
  }
})

test('envía las observaciones solo cuando contienen texto', async () => {
  let cuerpo
  globalThis.fetch = async (_url, opciones) => {
    cuerpo = JSON.parse(opciones.body)
    return Response.json({ ...sesionBase, estado_sesion: 'NO_REALIZADA' })
  }
  await api.resolverConflicto(sesionBase.id_sesion, administrador,
    { nuevo_estado: 'NO_REALIZADA', motivo_resolucion: 'Motivo', observaciones: '  Se revisaron los mensajes  ' }, señal())
  assert.deepEqual(cuerpo, { nuevo_estado: 'NO_REALIZADA', motivo_resolucion: 'Motivo', observaciones: 'Se revisaron los mensajes' })
  await api.resolverConflicto(sesionBase.id_sesion, administrador,
    { nuevo_estado: 'NO_REALIZADA', motivo_resolucion: 'Motivo', observaciones: '   ' }, señal())
  assert.deepEqual(cuerpo, { nuevo_estado: 'NO_REALIZADA', motivo_resolucion: 'Motivo' })
})

test('impide resolver sin sesión válida, sin rol administrador o con datos inválidos sin consultar la API', async () => {
  globalThis.fetch = () => assert.fail('No debe enviar datos inválidos')
  for (const sesion of [null, undefined, { ...administrador, token: '' }, { ...administrador, expiraEn: 1 },
    { ...administrador, expiraEn: NaN }, { ...administrador, idUsuario: '0' }]) {
    await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, sesion, entrada, señal()),
      (error) => error.comprobarEstado === true)
  }
  for (const roles of [[], ['ESTUDIANTE'], ['TUTOR'], null]) {
    await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, { ...administrador, roles }, entrada, señal()),
      (error) => error.comprobarEstado === false)
  }
  for (const id of ['0', 'abc', '1/../2', '9223372036854775808', null]) {
    await assert.rejects(api.resolverConflicto(id, administrador, entrada, señal()),
      (error) => error.comprobarEstado === false)
  }
  for (const datos of [
    { nuevo_estado: 'PENDIENTE', motivo_resolucion: 'Motivo' },
    { nuevo_estado: 'COMPLETADA', motivo_resolucion: '   ' },
    { nuevo_estado: 'COMPLETADA', motivo_resolucion: 'a'.repeat(501) },
    { nuevo_estado: 'COMPLETADA', motivo_resolucion: 'Motivo', observaciones: 'a'.repeat(501) },
    { nuevo_estado: 'COMPLETADA', motivo_resolucion: 'Motivo', observaciones: 5 },
    null,
    undefined,
  ]) {
    await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, datos, señal()),
      (error) => error.comprobarEstado === false)
  }
})

test('clasifica errores sin filtrar cuerpos y distingue cuándo hay que actualizar el detalle', async () => {
  for (const [estado, comprobar] of [[400, false], [403, false], [401, true],
    [404, true], [409, true], [500, true], [502, true], [503, true], [504, true]]) {
    let llamadas = 0
    globalThis.fetch = async () => { llamadas++; return new Response('detalle-interno-privado', { status: estado }) }
    await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, señal()), (error) => {
      assert.ok(error instanceof api.ErrorResolverConflicto)
      assert.equal(error.comprobarEstado, comprobar)
      assert.doesNotMatch(error.message, /detalle-interno-privado/)
      return true
    })
    assert.equal(llamadas, 1)
  }
})

test('no acepta como confirmación otra sesión, otro estado o una respuesta parcial', async () => {
  for (const datos of [null, [], {}, 'texto',
    { ...sesionBase, id_sesion: '99', estado_sesion: 'COMPLETADA' },
    { ...sesionBase, estado_sesion: 'EN_CONFLICTO' },
    { ...sesionBase, estado_sesion: 'NO_REALIZADA' },
    { ...sesionBase, inicio: '2026-11-10T19:00:00.000Z', fin: '2026-11-10T18:00:00.000Z', estado_sesion: 'COMPLETADA' },
  ]) {
    globalThis.fetch = async () => Response.json(datos)
    await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, señal()),
      (error) => error.comprobarEstado === true)
  }
  globalThis.fetch = async () => new Response('no es JSON')
  await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, señal()),
    (error) => error.comprobarEstado === true)
  globalThis.fetch = async () => new Response(null, { status: 204 })
  await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, señal()),
    (error) => error.comprobarEstado === true)
})

test('cancela, trata timeout y red como resultado incierto y no reintenta', async (t) => {
  globalThis.fetch = () => assert.fail('Una señal cancelada no debe enviar PATCH')
  const cancelado = new AbortController()
  cancelado.abort()
  await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, cancelado.signal), { name: 'AbortError' })

  const controlador = new AbortController()
  let llamadas = 0
  globalThis.fetch = (_url, opciones) => {
    llamadas++
    return new Promise((_resolve, reject) => opciones.signal.addEventListener('abort', () => reject(opciones.signal.reason), { once: true }))
  }
  const enCurso = api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, controlador.signal)
  controlador.abort()
  await assert.rejects(enCurso, { name: 'AbortError' })
  assert.equal(llamadas, 1)

  t.mock.method(AbortSignal, 'timeout', () => AbortSignal.abort(new DOMException('Timeout', 'TimeoutError')))
  globalThis.fetch = async (_url, opciones) => { llamadas++; opciones.signal.throwIfAborted() }
  await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, señal()),
    (error) => error.comprobarEstado === true)
  assert.equal(llamadas, 2)

  t.mock.restoreAll()
  globalThis.fetch = async () => { llamadas++; throw new TypeError('Failed to fetch') }
  await assert.rejects(api.resolverConflicto(sesionBase.id_sesion, administrador, entrada, señal()),
    (error) => error.comprobarEstado === true && /No pudimos confirmar la resolución/.test(error.message))
  assert.equal(llamadas, 3)
})

test('muestra la revisión administrativa y el formulario solo cuando la sesión lo permite', () => {
  const html = renderPagina({ resolucion })
  assert.match(html, /aria-label="Resolver conflicto"/)
  assert.match(html, /<option value="" selected="">Selecciona un estado<\/option>/)
  assert.match(html, /<option value="COMPLETADA">Completada<\/option>/)
  assert.match(html, /<option value="NO_REALIZADA">No realizada<\/option>/)
  assert.match(html, /<option value="INASISTENCIA">Inasistencia<\/option>/)
  assert.match(html, /Motivo de la resolución/)
  assert.match(html, /Observaciones \(opcional\)/)
  assert.match(html, /maxLength="500"/)
  assert.match(html, /disabled=""[^>]*>Resolver conflicto<\/button>/)
  assert.match(html, /Las declaraciones requieren revisión de administración\./)

  const sinAccion = renderPagina({ resolucion, consulta: { estado: 'listo', datos: { ...detalle, acciones_disponibles: { ...detalle.acciones_disponibles, resolver_conflicto: false } } } })
  assert.doesNotMatch(sinAccion, /aria-label="Resolver conflicto"/)
  const sinHook = renderPagina()
  assert.doesNotMatch(sinHook, /aria-label="Resolver conflicto"/)
})

test('bloquea el formulario mientras resuelve, tras un resultado incierto y muestra avisos', () => {
  const enCurso = renderPagina({ resolucion: { ...resolucion, resolviendo: true } })
  assert.match(enCurso, /Resolviendo conflicto…/)
  assert.match(enCurso, /disabled=""[^>]*>Resolviendo conflicto…/)
  assert.match(enCurso, /<button\b[^>]*disabled=""[^>]*>Actualizar<\/button>/)

  const bloqueada = renderPagina({
    resolucion: { ...resolucion, error: new api.ErrorResolverConflicto('Actualiza el detalle antes de volver a intentarlo.', true) },
  })
  assert.match(bloqueada, /role="alert"[^>]*>Actualiza el detalle antes de volver a intentarlo\./)
  assert.match(bloqueada, /<button\b[^>]*disabled=""[^>]*>Resolver conflicto<\/button>/)

  const rechazada = renderPagina({
    resolucion: { ...resolucion, error: new api.ErrorResolverConflicto('Revisa el estado final y el motivo indicados.', false) },
  })
  assert.match(rechazada, /role="alert"[^>]*>Revisa el estado final/)
  assert.match(rechazada, /aria-label="Resolver conflicto"/)

  const resuelto = renderPagina({ resolucion: { ...resolucion, resuelto: true } })
  assert.match(resuelto, /role="status"[^>]*>El conflicto se resolvió correctamente\./)
  assert.doesNotMatch(resuelto, /aria-label="Resolver conflicto"/)
})

test('el retorno administrativo conserva el origen y nombra el destino', () => {
  assert.equal(filtros.regresoPanel(new URLSearchParams('desde=%2Fadministracion%2Freportes'), ['ADMINISTRADOR']), '/administracion/reportes')
  assert.equal(filtros.regresoPanel(new URLSearchParams(), ['ADMINISTRADOR']), '/administracion/reportes')
  assert.equal(filtros.regresoPanel(new URLSearchParams('desde=%2F%2Fotro.sitio'), ['ADMINISTRADOR']), '/administracion/reportes')
  assert.equal(filtros.regresoPanel(new URLSearchParams('vista=activas'), ['ESTUDIANTE']), '/panel')
  const html = renderPagina({ etiquetaVolver: '← Volver a Reportes y moderación' })
  assert.match(html, /← Volver a Reportes y moderación/)
  assert.doesNotMatch(html, /← Volver a Mi panel/)
})
